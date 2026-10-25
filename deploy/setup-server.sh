#!/usr/bin/env bash
# One-time preparation of a fresh Ubuntu server (22.04 or 24.04, x86 or ARM) for CareerGap AI.
#
#   sudo bash setup-server.sh "<public key of the GitHub Actions deploy key>"
#
# What it does (safe to run again):
#   - installs Docker Engine and the Compose plugin from Docker's official apt repository;
#   - creates a "deploy" user that may use Docker and log in only with the deploy key;
#   - creates /opt/careergap, where the workflow copies the compose file and where .env lives;
#   - adds a 2 GB swap file if the server has no swap (small servers run out of memory during builds and migrations);
#   - opens ports 80 and 443 if the ufw firewall is active;
#   - turns on automatic security updates.
#
# It does not change SSH settings and does not create .env: that file holds secrets and is yours to fill in.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/careergap}"
SWAP_SIZE="${SWAP_SIZE:-2G}"

log() { printf '\n==> %s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }

[ "$(id -u)" -eq 0 ] || { echo "Run this as root: sudo bash $0 \"<public key>\"" >&2; exit 1; }

PUBLIC_KEY="${1:-}"
if [[ ! "$PUBLIC_KEY" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+)\ [A-Za-z0-9+/=]+ ]]; then
  echo "Pass the deploy PUBLIC key (a line starting with ssh-ed25519 ...) as the first argument." >&2
  exit 1
fi

# shellcheck disable=SC1091
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "This script is written for Ubuntu (found: ${PRETTY_NAME:-unknown})." >&2
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive

# ------------------------------------------------------------------ Docker
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker and the Compose plugin are already installed"
else
  log "Installing Docker Engine from Docker's apt repository"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker compose version

# ------------------------------------------------------------------ deploy user
if id "$DEPLOY_USER" >/dev/null 2>&1; then
  log "User $DEPLOY_USER already exists"
else
  log "Creating user $DEPLOY_USER"
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
getent group docker >/dev/null || groupadd docker
usermod -aG docker "$DEPLOY_USER" # members of the docker group are effectively root on this machine: guard the deploy key

SSH_DIR="/home/$DEPLOY_USER/.ssh"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$SSH_DIR"
touch "$SSH_DIR/authorized_keys"
if ! grep -qxF "$PUBLIC_KEY" "$SSH_DIR/authorized_keys"; then
  echo "$PUBLIC_KEY" >> "$SSH_DIR/authorized_keys"
  log "Deploy key added for $DEPLOY_USER"
fi
chown "$DEPLOY_USER:$DEPLOY_USER" "$SSH_DIR/authorized_keys"
chmod 600 "$SSH_DIR/authorized_keys"

# ------------------------------------------------------------------ application folder
install -d -m 750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
log "Application folder: $APP_DIR"

# ------------------------------------------------------------------ swap
if [ "$(swapon --show --noheadings 2>/dev/null | wc -l)" -eq 0 ]; then
  log "Adding a $SWAP_SIZE swap file"
  if { fallocate -l "$SWAP_SIZE" /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile; } 2>/dev/null; then
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    warn "could not enable swap here (a container or a restricted host?); continuing without it"
    rm -f /swapfile
  fi
else
  log "Swap already present"
fi

# ------------------------------------------------------------------ firewall
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  log "ufw is active: allowing SSH, HTTP and HTTPS"
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
else
  log "ufw is not active; if your provider has its own firewall (for example an Oracle Cloud security list) open ports 80 and 443 there"
fi

# ------------------------------------------------------------------ automatic security updates
log "Enabling automatic security updates"
apt-get install -y unattended-upgrades
echo 'unattended-upgrades unattended-upgrades/enable_auto_updates boolean true' | debconf-set-selections
dpkg-reconfigure -f noninteractive unattended-upgrades

# ------------------------------------------------------------------ summary
HOST_KEY="/etc/ssh/ssh_host_ed25519_key.pub"
echo
echo "======================================================================"
echo "Server ready."
echo "  Docker:        $(docker --version)"
echo "  Deploy user:   $DEPLOY_USER (key login only)"
echo "  App folder:    $APP_DIR"
if [ -f "$HOST_KEY" ]; then
  echo "  SSH host key fingerprint (compare it with what GitHub is given):"
  echo "    $(ssh-keygen -lf "$HOST_KEY")"
fi
echo
echo "Next: create $APP_DIR/.env (copy deploy/.env.example, fill it in, chmod 600), then"
echo "set the GitHub secrets and run the deploy workflow. See deploy/README.md."
echo "======================================================================"
