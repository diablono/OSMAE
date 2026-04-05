#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  AIKO-OS — Build AppImage + Hướng dẫn đóng ISO
# ────────────────────────────────────────────────────────────────

set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${CYAN}[BUILD]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}AIKO-OS Build Script${NC}"
echo "────────────────────"

# ── Step 1: Build AppImage ─────────────────────────────────────
log "Build Electron AppImage..."
npm run build:linux

APP_IMAGE=$(find dist -name "*.AppImage" | head -1)
if [ -n "$APP_IMAGE" ]; then
  ok "AppImage: $APP_IMAGE"
  chmod +x "$APP_IMAGE"
fi

# ── Step 2: Hướng dẫn Cubic ISO ───────────────────────────────
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Bước tiếp: Đóng gói thành ISO dùng Cubic${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo ""
echo " 1. CÀI CUBIC:"
echo "    sudo apt-add-repository ppa:cubic-wizard/release"
    sudo apt install cubic
echo ""
echo " 2. CHẠY CUBIC:"
echo "    cubic"
echo "    → Chọn thư mục output: ~/aiko-os-iso"
echo "    → Chọn Ubuntu 24.04 Minimal ISO làm base"
echo ""
echo " 3. TRONG CUBIC TERMINAL (chroot environment):"
echo "    # Cài Node.js + Ollama (AI Local)"
echo "    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
echo "    apt install -y nodejs libnss3 libatk1.0-0 libatk-bridge2.0-0"
echo "    apt install -y libcups2 libxcomposite1 libxdamage1 libgbm1 curl"
echo ""
echo "    # ── [CÀI ĐẶT AI LOCAL] ──────────────────────────"
echo "    curl -fsSL https://ollama.com/install.sh | sh"
echo "    # Khởi động Ollama tạm thời để tải sẵn Model (Pull Model vào ISO)"
echo "    ollama serve > /dev/null 2>&1 &"
echo "    sleep 5"
echo "    echo \"⬇️ Đang tải sẵn Model AI vào ISO (Tốn ~1.5GB)...\""
echo "    ollama pull gemma2:2b"
echo "    # ────────────────────────────────────────────────"
echo ""
echo "    # Copy AIKO-OS vào ISO"
echo "    mkdir -p /opt/aiko-os"
echo "    # (Dùng Cubic kéo thả file AppImage và run.sh vào /opt/aiko-os/)"
echo ""
echo "    # Tạo autostart cho desktop"
echo "    mkdir -p /etc/skel/.config/autostart"
echo "    cat > /etc/skel/.config/autostart/aiko-os.desktop << 'EOF'"
echo "    [Desktop Entry]"
echo "    Type=Application"
echo "    Name=AIKO-OS"
echo "    Exec=bash /opt/aiko-os/run.sh --no-sandbox"
echo "    EOF"
echo ""
echo "    # ── CUSTOM BOOT LOGO (Splash Screen) ────────────────────────"
echo "    # Chạy lệnh này trong Cubic Terminal để thay đổi splash screen"
echo "    mkdir -p /usr/share/plymouth/themes/spinner/"
echo "    cp /opt/aiko-os/images/IconMaeAI.png /usr/share/plymouth/themes/spinner/watermark.png"
echo "    cp /opt/aiko-os/images/IconMaeAI.png /usr/share/plymouth/themes/adb-logo.png"
echo "    # ─────────────────────────────────────────────────────────────"
echo ""
echo " 4. XUẤT ISO:"
echo "    → Trong Cubic, nhấn Next → Chọn compression"
echo "    → Đợi ~10-20 phút → File AIKO-OS.iso được tạo"
echo ""
echo " 5. FLASH VÀO USB:"
echo "    # Tìm device USB (cẩn thận! Sai là mất data)"
echo "    lsblk"
echo "    # Flash"
echo "    sudo dd if=AIKO-OS.iso of=/dev/sdX bs=4M status=progress"
echo "    # Hoặc dùng Balena Etcher (GUI)"
echo ""
echo -e "${GREEN}AppImage sẵn sàng tại: ${APP_IMAGE:-dist/}${NC}"
echo ""
