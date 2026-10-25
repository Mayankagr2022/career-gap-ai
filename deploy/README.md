# Deploying CareerGap AI on one server

The API runs on a single Linux server with Docker Compose, deployed by GitHub Actions
([`.github/workflows/main.yml`](../.github/workflows/main.yml)) over SSH. The website is built by the same workflow and hosted on
GitHub Pages (see the last section).

```
Browser --> GitHub Pages (static website)
   |
   '--> Caddy (HTTPS, automatic certificates) --> API (NestJS) --> PostgreSQL (pgvector) + Redis   (containers, private network)
                                                        |
                                                        '--> resume files --> S3-compatible bucket
```

The website and the API are on different addresses, so sign-in uses tokens (see the last section).
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

## Option: one EC2 server in your own AWS account (no domain needed)

[`aws/server.yaml`](aws/server.yaml) is a CloudFormation template for the server: Ubuntu 24.04 on a `t3.small` (about $17 a month), a fixed (Elastic) IP,
a firewall for ports 22, 80 and 443, an encrypted private S3 bucket for resumes, and a role that lets the server use that bucket without access keys.

```bash
ssh-keygen -t ed25519 -f careergap-deploy -N "" -C github-actions-deploy
aws cloudformation deploy --stack-name careergap-server --template-file deploy/aws/server.yaml   --capabilities CAPABILITY_IAM --parameter-overrides "DeployPublicKey=$(cat careergap-deploy.pub)"
aws cloudformation describe-stacks --stack-name careergap-server --query "Stacks[0].Outputs"   # PublicIp, bucket name
```

Then log in once as `ubuntu` with that key and run `setup-server.sh` (see *One-time server setup*), and create the server's `.env`.
Without a domain, use the free host name derived from the IP: for 1.2.3.4 it is `1-2-3-4.sslip.io`. Put it in `DOMAIN`, and Caddy gets a real HTTPS
certificate for it. Leave `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` empty so the server's role is used, and set `AWS_S3_BUCKET` to the bucket in the outputs.
The GitHub secrets and variables below then use that IP and `https://1-2-3-4.sslip.io` as `API_URL`.

## Free option: Oracle Cloud "Always Free" server

Oracle's Always Free tier includes a virtual machine large enough for this app, at no cost. It needs an account with a card for identity
verification (Always Free resources are not charged). Capacity can be limited in a region; if creation says "out of capacity", try again later.

1. **Create the account** at <https://www.oracle.com/cloud/free/>. Choose your home region carefully: it cannot be changed later.
2. **Create the server**: *Compute > Instances > Create instance*.
   - Image: **Canonical Ubuntu 24.04** (or 22.04).
   - Shape: **VM.Standard.A1.Flex** (Ampere, ARM) with **2 OCPUs and 12 GB** of memory (Always Free allows up to 4 and 24). The small
     AMD "E2.1.Micro" shape has 1 GB and is too small for this stack.
   - Networking: keep the defaults and make sure a **public IPv4 address** is assigned.
   - SSH keys: choose *Generate a key pair for me* and **download the private key**. You use it to log in the first time (as user `ubuntu`).
3. **Keep the address.** *Networking > IP management > Reserved public IPs*: reserve one and attach it to the server, so the address survives a restart.
4. **Open the web ports.** *Networking > Virtual cloud networks > your VCN > Security lists > Default > Add ingress rules*: source `0.0.0.0/0`,
   protocol TCP, destination ports `80` and `443` (two rules). Without this, HTTPS certificates cannot be issued.
5. **Log in and prepare the server.** From your computer:

   ```bash
   ssh -i path/to/oracle-private-key ubuntu@YOUR_SERVER_IP
   curl -fsSLO https://raw.githubusercontent.com/Mayankagr2022/career-gap-ai/main/deploy/setup-server.sh
   less setup-server.sh                       # read it first; press q to leave
   sudo bash setup-server.sh "<the deploy PUBLIC key>"
   ```

   The script installs Docker, creates the `deploy` user with that key, creates `/opt/careergap`, adds swap and turns on automatic security
   updates. It is safe to run again. The deploy public key is the one that matches the `SSH_PRIVATE_KEY` secret in GitHub.
6. **Get a free host name.** Sign in at <https://www.duckdns.org> (with GitHub), create a name such as `careergap`, and set its IP to your server's address.
   Your site will be `https://careergap.duckdns.org`; Caddy gets the certificate by itself.
7. **Create a bucket for resume files.** Oracle Object Storage (Always Free: 20 GB) has an S3-compatible endpoint; Cloudflare R2 and Backblaze B2 also have free tiers.
   Use the endpoint, region, bucket and access keys in `.env` (see the comments in `.env.example`).
8. **Create `/opt/careergap/.env`** as described below, then continue with *GitHub settings*.

Everything from "One-time server setup" onwards still applies; the steps above replace the parts about choosing and preparing a server.

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
  | `DEPLOY_ENABLED` | `true`, set last: until it is set, pushes to `main` are only checked and the deploy job is skipped |
  | `API_URL` | `https://api.example.com`: the API's public address (no trailing slash). It is baked into the website at build time, and setting it also switches on the GitHub Pages publish |
  | `SSH_PORT` | Optional, default `22` |
  | `DEPLOY_PATH` | Optional, default `/opt/careergap` |

## Deploying

With `DEPLOY_ENABLED=true` set, push to `main` (or run the workflow by hand) and approve the `production` environment. The workflow:

1. type-checks, tests and builds the code;
2. builds the API image and pushes it to the GitHub Container Registry
   (`ghcr.io/<owner>/<repo>/api`, tagged with the commit);
3. copies `docker-compose.yml`, `Caddyfile` and the scripts to the server (your `.env` is not touched);
4. runs `deploy.sh` there: pull the image, start PostgreSQL and Redis, **run database migrations**, start the new version,
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

## The website on GitHub Pages

The website is not served from this server. The `pages` job in `main.yml` builds it as static files and publishes it to GitHub Pages
(`https://<owner>.github.io/<repo>/`) on every push to `main`, once the variable `API_URL` is set. To switch it on:

1. *Settings > Pages > Build and deployment > Source*: **GitHub Actions**.
2. Set the variable `API_URL` (above) to the API's address.
3. On the server, set `FRONTEND_URL` in `.env` to the Pages address (`https://<owner>.github.io/<repo>`, no trailing slash). The API only accepts browser calls from that address.

The site and the API are on different addresses, so the browser cannot use the API's cookies. The server runs with `AUTH_TOKEN_MODE=true` (set in
`docker-compose.yml`): sign-in returns tokens, which the website keeps in the browser's local storage and sends as a `Bearer` header. Social login
(Google, LinkedIn) hands the tokens back in the address fragment, which is never sent to a server. Set their callback URLs to `https://<DOMAIN>/api/v1/auth/<provider>/callback`.
