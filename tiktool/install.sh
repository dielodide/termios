#!/usr/bin/env bash
# =============================================================
#  TikTool — Script d'installation VPS
#  Installe backend + frontend dans /opt/tiktool
#  et démarre tout avec PM2 (persiste au reboot)
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
SOURCE_DIR="/opt/tooltiktokdd"         # Source (ce repo cloné)
INSTALL_DIR="/opt/tiktool"             # Destination
BACKEND_PORT=3342
FRONTEND_PORT=5173
NODE_MIN_VERSION=18

echo -e ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       TikTool — Install VPS          ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Vérif root ────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && die "Lance ce script en root (sudo ./install.sh)"

# ── Vérif source ──────────────────────────────────────────────
[[ ! -d "$SOURCE_DIR" ]] && die "Dossier source introuvable: $SOURCE_DIR"
[[ ! -d "$SOURCE_DIR/backend" ]] && die "Pas de dossier backend dans $SOURCE_DIR"
[[ ! -d "$SOURCE_DIR/frontend" ]] && die "Pas de dossier frontend dans $SOURCE_DIR"

# ── Node.js ───────────────────────────────────────────────────
info "Vérification de Node.js..."
if ! command -v node &>/dev/null; then
  warn "Node.js non trouvé, installation via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  if [[ $NODE_VER -lt $NODE_MIN_VERSION ]]; then
    warn "Node.js $NODE_VER trop vieux, upgrade vers Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  else
    log "Node.js $(node -v) OK"
  fi
fi

# ── PM2 ───────────────────────────────────────────────────────
info "Vérification de PM2..."
if ! command -v pm2 &>/dev/null; then
  info "Installation de PM2..."
  npm install -g pm2
  log "PM2 installé"
else
  log "PM2 $(pm2 -v) déjà présent"
fi

# ── Dossier d'install ─────────────────────────────────────────
info "Préparation de $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR/backend"
mkdir -p "$INSTALL_DIR/frontend"

# ── Copie des fichiers ────────────────────────────────────────
info "Copie backend → $INSTALL_DIR/backend..."
rsync -a --delete "$SOURCE_DIR/backend/" "$INSTALL_DIR/backend/"
log "Backend copié"

info "Copie frontend → $INSTALL_DIR/frontend..."
rsync -a --delete "$SOURCE_DIR/frontend/" "$INSTALL_DIR/frontend/"
log "Frontend copié"

# ── .env backend ─────────────────────────────────────────────
if [[ ! -f "$INSTALL_DIR/backend/.env" ]]; then
  info "Création du .env backend (depuis .env.example)..."
  if [[ -f "$INSTALL_DIR/backend/.env.example" ]]; then
    cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
    log ".env créé depuis .env.example"
  else
    cat > "$INSTALL_DIR/backend/.env" <<EOF
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

# ── Install deps backend ──────────────────────────────────────
info "npm install backend..."
cd "$INSTALL_DIR/backend"
npm ci --prefer-offline 2>&1 | tail -5
log "Dépendances backend installées"

# ── Build backend (TypeScript) ────────────────────────────────
info "Build TypeScript backend..."
npm run build
log "Backend compilé → dist/"

# ── Install deps frontend ─────────────────────────────────────
info "npm install frontend..."
cd "$INSTALL_DIR/frontend"
npm ci --prefer-offline 2>&1 | tail -5
log "Dépendances frontend installées"

# ── Build frontend (Vite) ─────────────────────────────────────
info "Build Vite frontend..."
npm run build
log "Frontend compilé → dist/"

# ── Stop PM2 si déjà lancé ────────────────────────────────────
info "Nettoyage PM2 (anciennes instances)..."
pm2 delete tiktool-backend  2>/dev/null || true
pm2 delete tiktool-frontend 2>/dev/null || true

# ── Démarrage PM2 backend ─────────────────────────────────────
info "Démarrage backend PM2 (port $BACKEND_PORT)..."
cd "$INSTALL_DIR/backend"
pm2 start dist/index.js \
  --name tiktool-backend \
  --env production \
  --max-restarts 10 \
  --restart-delay 3000 \
  -- --env-file .env 2>/dev/null || \
pm2 start dist/index.js \
  --name tiktool-backend \
  --max-restarts 10 \
  --restart-delay 3000
log "Backend démarré"

# ── Démarrage PM2 frontend (serve statique) ───────────────────
info "Démarrage frontend PM2 (port $FRONTEND_PORT)..."
# Utilise 'serve' pour servir le build Vite statique
if ! command -v serve &>/dev/null; then
  npm install -g serve
fi
cd "$INSTALL_DIR/frontend"
pm2 start "serve" \
  --name tiktool-frontend \
  --max-restarts 10 \
  --restart-delay 3000 \
  -- -s dist -l $FRONTEND_PORT
log "Frontend démarré"

# ── PM2 save + startup ────────────────────────────────────────
info "Configuration PM2 pour redémarrage automatique au boot..."
pm2 save
STARTUP_CMD=$(pm2 startup systemd -u root --hp /root 2>&1 | grep 'sudo' | tail -1 || true)
if [[ -n "$STARTUP_CMD" ]]; then
  eval "$STARTUP_CMD" 2>/dev/null || true
  log "PM2 startup configuré"
else
  pm2 startup systemd -u root --hp /root 2>/dev/null || true
  log "PM2 startup appliqué"
fi

# ── Firewall (ufw) ────────────────────────────────────────────
if command -v ufw &>/dev/null; then
  info "Ouverture des ports firewall..."
  ufw allow $BACKEND_PORT/tcp  2>/dev/null || true
  ufw allow $FRONTEND_PORT/tcp 2>/dev/null || true
  log "Ports $BACKEND_PORT et $FRONTEND_PORT ouverts"
fi

# ── Résumé ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║         Installation terminée ✔          ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Backend  ${NC}→ http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT}"
echo -e "  ${BOLD}Frontend ${NC}→ http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT}"
echo -e "  ${BOLD}Health   ${NC}→ http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT}/health"
echo ""
echo -e "  ${CYAN}pm2 status${NC}           — voir les process"
echo -e "  ${CYAN}pm2 logs tiktool-backend${NC}  — logs backend"
echo -e "  ${CYAN}pm2 logs tiktool-frontend${NC} — logs frontend"
echo -e "  ${CYAN}pm2 restart all${NC}       — redémarrer tout"
echo ""
