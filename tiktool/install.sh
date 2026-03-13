#!/usr/bin/env bash
# =============================================================
#  TikTool — Script d'installation VPS
#  Build + démarrage PM2 directement depuis le dossier courant
# =============================================================
set -euo pipefail

# ── Couleurs ──────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $*"; }
info() { echo -e "${CYAN}[→]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[✘] ERREUR: $*${NC}"; exit 1; }

# ── Config ────────────────────────────────────────────────────
# Tout se passe dans le dossier du script
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"
BACKEND_PORT=3342
FRONTEND_PORT=5173
NODE_MIN_VERSION=18

echo -e ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       TikTool — Install VPS          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""
info "Répertoire  : $BASE_DIR"
info "Backend     : $BACKEND_DIR"
info "Frontend    : $FRONTEND_DIR"
echo ""

# ── Vérif root ────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && die "Lance ce script en root : sudo ./install.sh"
[[ ! -d "$BACKEND_DIR" ]]  && die "Dossier backend introuvable : $BACKEND_DIR"
[[ ! -d "$FRONTEND_DIR" ]] && die "Dossier frontend introuvable : $FRONTEND_DIR"

# ── Node.js ───────────────────────────────────────────────────
info "Vérification de Node.js..."
if ! command -v node &>/dev/null; then
  warn "Node.js non trouvé, installation via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  if [[ $NODE_VER -lt $NODE_MIN_VERSION ]]; then
    warn "Node.js v$NODE_VER trop vieux, upgrade vers v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    log "Node.js $(node -v) OK"
  fi
fi

# ── PM2 ───────────────────────────────────────────────────────
info "Vérification de PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  log "PM2 installé"
else
  log "PM2 $(pm2 -v) déjà présent"
fi

# ── serve (frontend statique) ─────────────────────────────────
if ! command -v serve &>/dev/null; then
  info "Installation de 'serve'..."
  npm install -g serve
  log "serve installé"
fi

# ── .env backend ──────────────────────────────────────────────
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  info "Création du .env backend..."
  if [[ -f "$BACKEND_DIR/.env.example" ]]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    log ".env créé depuis .env.example"
  else
    cat > "$BACKEND_DIR/.env" <<EOF
PORT=$BACKEND_PORT
CORS_ORIGIN=http://localhost:$FRONTEND_PORT
LOG_LEVEL=info
RATE_LIMIT_MAX=30
REDIS_URL=
HTTP_PROXY=
TIKTOK_USER_AGENT=
EOF
    log ".env créé avec valeurs par défaut"
  fi
else
  warn ".env existant conservé (pas écrasé)"
fi

# ── Install + build backend ───────────────────────────────────
info "npm install backend..."
cd "$BACKEND_DIR"
npm install --loglevel=error 2>&1 | tail -3
log "Dépendances backend installées"

info "Build TypeScript backend..."
npm run build
log "Backend compilé → dist/"

# ── Install + build frontend ──────────────────────────────────
info "npm install frontend..."
cd "$FRONTEND_DIR"
npm install --loglevel=error 2>&1 | tail -3
log "Dépendances frontend installées"

info "Build Vite frontend..."
npm run build
log "Frontend compilé → dist/"

# ── Stop PM2 instances existantes ─────────────────────────────
info "Nettoyage PM2 (anciennes instances)..."
pm2 delete tiktool-backend  2>/dev/null || true
pm2 delete tiktool-frontend 2>/dev/null || true

# ── Démarrage PM2 backend ─────────────────────────────────────
info "Démarrage backend PM2 (port $BACKEND_PORT)..."
cd "$BACKEND_DIR"
set -o allexport; source .env; set +o allexport
pm2 start dist/index.js \
  --name tiktool-backend \
  --max-restarts 10 \
  --restart-delay 3000
log "Backend démarré"

# ── Démarrage PM2 frontend ────────────────────────────────────
info "Démarrage frontend PM2 (port $FRONTEND_PORT)..."
cd "$FRONTEND_DIR"
pm2 start serve \
  --name tiktool-frontend \
  --max-restarts 10 \
  --restart-delay 3000 \
  -- -s dist -l $FRONTEND_PORT
log "Frontend démarré"

# ── PM2 save + startup systemd ────────────────────────────────
info "Configuration PM2 boot automatique..."
pm2 save
pm2 startup systemd -u root --hp /root 2>&1 | grep -E '^sudo' | while read -r line; do
  eval "$line" 2>/dev/null || true
done
log "PM2 startup configuré (systemd)"

# ── Firewall (ufw) ────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  info "Ouverture des ports firewall..."
  ufw allow $BACKEND_PORT/tcp  2>/dev/null || true
  ufw allow $FRONTEND_PORT/tcp 2>/dev/null || true
  log "Ports $BACKEND_PORT et $FRONTEND_PORT ouverts"
fi

# ── Résumé final ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         Installation terminée ✔          ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
VPS_IP=$(hostname -I | awk '{print $1}')
echo -e "  ${BOLD}Backend  ${NC}→ http://${VPS_IP}:${BACKEND_PORT}"
echo -e "  ${BOLD}Frontend ${NC}→ http://${VPS_IP}:${FRONTEND_PORT}"
echo -e "  ${BOLD}Health   ${NC}→ http://${VPS_IP}:${BACKEND_PORT}/health"
echo ""
echo -e "  ${CYAN}pm2 status${NC}                 — voir les process"
echo -e "  ${CYAN}pm2 logs tiktool-backend${NC}   — logs backend"
echo -e "  ${CYAN}pm2 logs tiktool-frontend${NC}  — logs frontend"
echo -e "  ${CYAN}pm2 restart all${NC}            — redémarrer tout"
echo ""
