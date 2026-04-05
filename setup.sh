#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  AIKO-OS Setup Script
#  Chạy script này trên Ubuntu 22.04 / 24.04 để cài đầy đủ
#  Dùng: chmod +x setup.sh && ./setup.sh
# ────────────────────────────────────────────────────────────────

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[AIKO]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

echo -e "${CYAN}"
echo " █████╗ ██╗██╗  ██╗ ██████╗        ██████╗ ███████╗"
echo "██╔══██╗██║██║ ██╔╝██╔═══██╗      ██╔═══██╗██╔════╝"
echo "███████║██║█████╔╝ ██║   ██║█████╗██║   ██║███████╗"
echo "██╔══██║██║██╔═██╗ ██║   ██║╚════╝██║   ██║╚════██║"
echo "██║  ██║██║██║  ██╗╚██████╔╝      ╚██████╔╝███████║"
echo "╚═╝  ╚═╝╚═╝╚═╝  ╚═╝ ╚═════╝        ╚═════╝ ╚══════╝"
echo -e "${NC}"
echo " AI Operating System — Setup Script v1.0"
echo " ─────────────────────────────────────────"
echo ""

# ── Check Ubuntu ──────────────────────────────────────────────────
if ! command -v apt &> /dev/null; then
  err "Script này chỉ chạy trên Ubuntu/Debian. Hãy dùng Ubuntu 22.04 hoặc 24.04."
fi

log "Cập nhật package list..."
sudo apt update -qq

# ── Install Node.js 20 ────────────────────────────────────────────
log "Kiểm tra Node.js..."
if ! command -v node &> /dev/null || [[ $(node --version | cut -d. -f1 | tr -d 'v') -lt 18 ]]; then
  log "Cài Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ok "Node.js $(node --version) đã cài"
else
  ok "Node.js $(node --version) đã có"
fi

# ── Install system deps ────────────────────────────────────────────
log "Cài dependencies hệ thống..."
sudo apt install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libasound2 libxss1 \
  python3 python3-pip git curl wget \
  build-essential 2>/dev/null || true
ok "System dependencies cài xong"

# ── Setup project ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log "Thư mục project: $SCRIPT_DIR"

cd "$SCRIPT_DIR"

log "Cài npm packages..."
npm install

ok "npm packages đã cài xong"

# ── Create desktop shortcut ───────────────────────────────────────
log "Tạo desktop shortcut..."
DESKTOP_FILE="$HOME/.local/share/applications/aiko-os.desktop"
mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=AIKO-OS
Comment=AI Operating System with Anime Robot Assistant
Exec=node ${SCRIPT_DIR}/node_modules/.bin/electron ${SCRIPT_DIR}
Icon=${SCRIPT_DIR}/renderer/assets/icon.png
Terminal=false
Categories=Utility;
StartupWMClass=aiko-os
EOF

chmod +x "$DESKTOP_FILE"
ok "Desktop shortcut tạo xong: $DESKTOP_FILE"

# ── Create run script ─────────────────────────────────────────────
cat > "$SCRIPT_DIR/run.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
ELECTRON_BIN="./node_modules/.bin/electron"
if [ ! -f "$ELECTRON_BIN" ]; then
  echo "Electron không tìm thấy, chạy npm install trước..."
  npm install
fi
# Disable GPU sandbox for better compatibility
exec "$ELECTRON_BIN" . --no-sandbox "$@"
EOF
chmod +x "$SCRIPT_DIR/run.sh"

# ── Autostart (optional) ──────────────────────────────────────────
read -p "$(echo -e ${YELLOW})Bật autostart khi đăng nhập? (y/N): $(echo -e ${NC})" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  AUTOSTART_DIR="$HOME/.config/autostart"
  mkdir -p "$AUTOSTART_DIR"
  cp "$DESKTOP_FILE" "$AUTOSTART_DIR/aiko-os.desktop"
  ok "Autostart đã bật"
fi

# ── Done ──────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  AIKO-OS cài đặt thành công! ✅${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo " Để chạy AIKO-OS:"
echo -e "   ${CYAN}./run.sh${NC}          ← Chạy trực tiếp"
echo -e "   ${CYAN}npm start${NC}         ← Qua npm"
echo -e "   ${CYAN}npm run build${NC}     ← Build thành .AppImage"
echo ""
echo " Bước tiếp theo:"
echo "   1. Chạy AIKO-OS: ./run.sh"
echo "   2. Vào Settings → Nhập Claude API key"
echo "   3. Bắt đầu chat với AIKO-7!"
echo ""
