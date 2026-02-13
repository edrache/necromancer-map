#!/usr/bin/env bash
set -euo pipefail

# Deploy static game files to VPS over SSH/rsync.
# Usage:
#   ./deploy.sh --dry-run
#   ./deploy.sh --go
#   ./deploy.sh --go --delete
#
# Safe defaults:
# - non-root deploy user
# - host key checking enabled
# - remote deletion disabled unless --delete is passed
REMOTE_USER="${REMOTE_USER:-deploy}"
REMOTE_HOST="${REMOTE_HOST:-aneta131.mikrus.xyz}"
REMOTE_PORT="${REMOTE_PORT:-10131}"
REMOTE_DIR="${REMOTE_DIR:-/cytrus/katalog1/necromancer}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_mikrus_game}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MODE="dry-run"
DELETE_REMOTE="0"

for arg in "$@"; do
  case "$arg" in
    --go)
      MODE="go"
      ;;
    --dry-run)
      MODE="dry-run"
      ;;
    --delete)
      DELETE_REMOTE="1"
      ;;
    "")
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Use: ./deploy.sh --dry-run | --go [--delete]"
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd ssh
require_cmd rsync

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY"
  echo "Set custom key path with: SSH_KEY=/path/to/key ./deploy.sh --go"
  exit 1
fi

if [[ -z "$REMOTE_HOST" || -z "$REMOTE_DIR" ]]; then
  echo "REMOTE_HOST and REMOTE_DIR must be set."
  exit 1
fi

SSH_OPTS=(
  -p "$REMOTE_PORT"
  -i "$SSH_KEY"
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
)

echo "Ensuring remote directory exists: $REMOTE_DIR"
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

RSYNC_ARGS=(
  -az
  --human-readable
  --itemize-changes
  --exclude ".git/"
  --exclude ".github/"
  --exclude "node_modules/"
  --exclude "output/"
  --exclude ".env"
  --exclude ".env.*"
  --exclude "*.pem"
  --exclude "*.key"
  --exclude "id_*"
  --exclude "deploy.sh"
)

if [[ "$MODE" == "dry-run" ]]; then
  RSYNC_ARGS+=(--dry-run)
  echo "Running dry-run. No files will be changed on server."
else
  echo "Running live deploy."
fi

if [[ "$DELETE_REMOTE" == "1" ]]; then
  RSYNC_ARGS+=(--delete)
  echo "Remote delete enabled (--delete)."
else
  echo "Remote delete disabled (pass --delete to enable)."
fi

rsync "${RSYNC_ARGS[@]}" \
  -e "ssh -p $REMOTE_PORT -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$HOME/.ssh/known_hosts" \
  "$SCRIPT_DIR/" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

if [[ "$MODE" == "dry-run" ]]; then
  echo "Dry-run finished. If output looks correct, run: ./deploy.sh --go"
else
  echo "Deploy finished."
fi
