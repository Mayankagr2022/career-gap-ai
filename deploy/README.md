# Deploying CareerGap AI on one server

The whole app runs on a single Linux server with Docker Compose, deployed by GitHub Actions
([`.github/workflows/main.yml`](../.github/workflows/main.yml)) over SSH.

```
Internet --> Caddy (HTTPS, automatic certificates)
               |-- /api/*  --> API  (NestJS)  --> PostgreSQL (pgvector) + Redis   (containers, private network)
               `-- others  --> Web  (Next.js)                                     |
                                                        resume files --> S3-compatible bucket (external)
```

Caddy serves both apps on one host name, so the browser sees a single origin and login cookies work.
PostgreSQL and Redis are not reachable from outside the server.

For a managed, multi-server setup on AWS see [`infra/README.md`](../infra/README.md) (optional, started by hand from the
*Deploy to AWS* workflow).

## What you need

| Need | Notes |
|---|---|
| A Linux server | Ubuntu 22.04 or 24.04 with a public IPv4 address. Plan on **2 vCPU and 4 GB RAM** (2 GB works with swap) and 40 GB of disk. Images are built on GitHub, not here. |
| A domain name | An **A record** for the host (for example `app.example.com`) pointing at the server. |
| An S3-compatible bucket | For resume files: AWS S3, Cloudflare R2, Backblaze B2 and similar. Create a bucket and an access key limited to it. |
| GitHub repository access | To add secrets and variables and to create the `production` environment. |

## One-time server setup

1. **Firewall**: allow only SSH (22), HTTP (80) and HTTPS (443), in your provider's firewall or with `ufw`.
   Caddy needs 80 and 443 to obtain certificates.

2. **Install Docker** with the official instructions for your distribution
   (<https://docs.docker.com/engine/install/ubuntu/>), including the Compose plugin. Check with `docker compose version`.

3. **Create a deploy user** and the application folder:

   ```bash
   sudo adduser --disabled-password --gecos "" deploy
   sudo usermod -aG docker deploy          # note: members of the docker group are effectively root on this machine
   sudo mkdir -p /opt/careergap && sudo chown deploy:deploy /opt/careergap
   ```

4. **Create the configuration** (secrets stay on the server and are never sent to GitHub). From your machine:

   ```bash
   scp deploy/.env.example deploy@YOUR_SERVER:/opt/careergap/.env
   ssh deploy@YOUR_SERVER "chmod 600 /opt/careergap/.env && nano /opt/careergap/.env"
   ```

   Fill in `DOMAIN`, the bucket settings and any AI keys. Generate the random values on the server:

   ```bash
   openssl rand -hex 24   # POSTGRES_PASSWORD
   openssl rand -hex 48   # JWT_SECRET
   openssl rand -hex 48   # JWT_REFRESH_SECRET (a different value)
   ```

   Leave an AI key, OAuth or SMTP value empty to switch that feature off.

5. **Give GitHub Actions access.** On your machine create a key used only for deploying:

   ```bash
   ssh-keygen -t ed25519 -f careergap-deploy -C "github-actions-deploy" -N ""
   ssh-copy-id -i careergap-deploy.pub deploy@YOUR_SERVER      # or append it to ~deploy/.ssh/authorized_keys
   ssh-keyscan -t ed25519 YOUR_SERVER                           # the host key line for SSH_KNOWN_HOSTS
   ```

   Check that the fingerprint of that host key matches the server's (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server)
   before trusting it, then delete the local private key once it is stored in GitHub.

## GitHub settings

In the repository, *Settings*:

- **Environments > New environment**: `production`. Add *required reviewers* so a person approves every deploy.
- **Secrets and variables > Actions > Secrets**:

  | Secret | Value |
  |---|---|
  | `SSH_HOST` | The server's address (IP or host name) |
  | `SSH_USER` | `deploy` |
  | `SSH_PRIVATE_KEY` | The contents of `careergap-deploy` (the private key) |
  | `SSH_KNOWN_HOSTS` | The host key line from `ssh-keyscan` |

- **Secrets and variables > Actions > Variables**:

  | Variable | Value |
  |---|---|
  | `PUBLIC_URL` | `https://app.example.com` (baked into the web bundle at build time) |
  | `SSH_PORT` | Optional, default `22` |
  | `DEPLOY_PATH` | Optional, default `/opt/careergap` |

## Deploying

Push to `main` (or run the workflow by hand) and approve the `production` environment. The workflow:

1. type-checks, tests and builds the code;
2. builds the API and web images and pushes them to the GitHub Container Registry
   (`ghcr.io/<owner>/<repo>/api` and `/web`, tagged with the commit);
3. copies `docker-compose.yml`, `Caddyfile` and the scripts to the server (your `.env` is not touched);
4. runs `deploy.sh` there: pull images, start PostgreSQL and Redis, **run database migrations**, start the new version,
   wait for it to be healthy, and check the public health endpoint.

If the migrations fail, nothing running is changed. If the new version does not become healthy, `deploy.sh` switches back to the
previous version and the workflow fails. Migrations are not undone, so write them to be backward compatible (add before you remove).

The first deploy takes a little longer because Caddy requests the HTTPS certificate once the domain points at the server.
The containers restart during a deploy, so expect a few seconds of interruption.

## Everyday operations

Run these on the server in `/opt/careergap`:

```bash
docker compose --project-name careergap ps                  # what is running and healthy
docker compose --project-name careergap logs -f api         # follow the API logs (also: web, caddy, postgres, redis)
cat .deployed-tag                                           # the commit that is deployed
```

- **Roll back to an earlier version**: run the workflow for that commit, or on the server
  `IMAGE_PREFIX=ghcr.io/<owner>/<repo> IMAGE_TAG=<commit sha> ./deploy.sh` (log in to ghcr.io first with a token that can read packages).
- **Change configuration**: edit `.env`, then `docker compose --project-name careergap up -d` with the same `IMAGE_PREFIX` and `IMAGE_TAG`
  (see `.deployed-tag`), or just deploy again.
- **Disk space**: `docker system df`; logs are already capped at 3 x 10 MB per container.

### Backups

`backup.sh` writes a compressed dump of the database to `backups/` and deletes dumps older than 14 days. Schedule it with cron
(`crontab -e` as the deploy user):

```
30 2 * * * /opt/careergap/backup.sh >> /opt/careergap/backups/backup.log 2>&1
```

A backup on the same server does not survive losing the server, so copy `backups/` somewhere else too.
Restore with the command in the header of `backup.sh`. Resume files live in your bucket, which has its own durability.

## Limits to know about

- **One server is a single point of failure**, with a few seconds of downtime on every deploy and during server maintenance.
  If that matters, move to the AWS setup in `infra/`.
- **No automatic scaling.** If the server is too small, resize it.
- **No web application firewall, monitoring or alerts.** Add an uptime check on `https://<domain>/api/v1/health/ready`.
- Install security updates regularly (for example the `unattended-upgrades` package on Ubuntu).
- Anyone who can SSH as `deploy` can control Docker and therefore the whole machine; protect that key.
