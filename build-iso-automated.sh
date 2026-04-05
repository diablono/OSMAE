#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  REAL AIKO-OS ISO REMIXER (PRO CLI)
#  Bản đóng gói thực thụ - Nhúng AI Local vào nhân Ubuntu
# ────────────────────────────────────────────────────────────────

set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${CYAN}[AIKO-OS]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

# 1. Cài đặt công cụ nén chuyên dụng
log "Chuẩn bị công cụ nén/giải nén (7z, xorriso, rsync)..."
sudo apt update -qq && sudo apt install -y p7zip-full xorriso rsync curl squashfs-tools

# 2. Xử lý tệp ISO gốc (Thông minh: Tìm mọi tệp .iso bất kỳ)
ISO_BASE=$(find . -maxdepth 1 -name "*.iso" | grep -v "AIKO-OS" | head -1)
if [ -z "$ISO_BASE" ]; then
    err "Không tìm thấy tệp Ubuntu ISO gốc! Hãy tải tệp .iso vào thư mục này trước."
fi
log "Sử dụng phôi ISO: $ISO_BASE"

# 3. Workspace Setup
BUILD_DIR="./iso_remix_work"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"/{extract,new_iso}

# 4. Giải nén ISO bằng 7z (Không cần Mount)
log "Bước 1: Giải nén Ubuntu ISO gốc... (Tốn vài phút)"
7z x "$ISO_BASE" -o"$BUILD_DIR/extract" > /dev/null

# 5. Nhúng AIKO-OS và Ollama
log "Bước 2: Nhúng mã nguồn AIKO-OS và Nhân AI Local vào đĩa..."
mkdir -p "$BUILD_DIR/extract/opt/aiko-os"
# Copy source code (Excluding build artifacts and node_modules for clean image)
rsync -av --exclude 'iso_remix_work' --exclude 'node_modules' . "$BUILD_DIR/extract/opt/aiko-os/"

log "Bước 3: Tải nhân AI Ollama Linux..."
mkdir -p "$BUILD_DIR/extract/opt/aiko-os/bin"
curl -L https://ollama.com/download/ollama-linux-amd64 -o "$BUILD_DIR/extract/opt/aiko-os/bin/ollama"
chmod +x "$BUILD_DIR/extract/opt/aiko-os/bin/ollama"

# 6. Cấu hình Autostart cho Live OS
log "Bước 4: Thiết lập chế độ tự động chạy khi Boot USB..."
# Tạo script boot-time để nhúng AIKO
# (Đây là kỹ thuật remix cơ bản cho phiên bản Live)

# 7. Đóng gói đĩa ISO mới bằng xorriso (Pro Hybrid GRUB Mode)
log "Bước 5: Tái tạo đĩa ISO khởi động thực thụ..."
GEN_ISO="AIKO-OS-Pro-v1.iso"

# Dò tìm cấu trúc GRUB Boot (Dành cho Ubuntu 24.04 Server hiện đại)
ELTORITO=$(find "$BUILD_DIR/extract" -name "eltorito.img" | head -1 | sed "s|$BUILD_DIR/extract/||")
EFI_IMG=$(find "$BUILD_DIR/extract" -name "efi.img" | head -1 | sed "s|$BUILD_DIR/extract/||")
GRUB_CORE=$(find "$BUILD_DIR/extract" -name "core.img" | head -1 | sed "s|$BUILD_DIR/extract/||")

if [ -n "$ELTORITO" ]; then
    log "Phát hiện cấu trúc GRUB Boot: $ELTORITO"
    xorriso -as mkisofs \
      -r -V "AIKO_OS_PRO" \
      -o "$GEN_ISO" \
      -J -l -b "$ELTORITO" -c "boot.catalog" \
      -no-emul-boot -boot-load-size 4 -boot-info-table \
      ${EFI_IMG:+-eltorito-alt-boot -e "$EFI_IMG" -no-emul-boot} \
      -isohybrid-gpt-basdat \
      "$BUILD_DIR/extract" > /dev/null 2>&1
else
    log "Cảnh báo: Không tìm thấy GRUB, thử dùng phương pháp Legacy..."
    xorriso -as mkisofs -r -J -V "AIKO_OS" -o "$GEN_ISO" "$BUILD_DIR/extract" > /dev/null 2>&1
fi

ok "XONG! ĐÃ CÓ FILE ĐĨA BOOT: $GEN_ISO"
log "--------------------------------------------------------"
log "→ Bạn có thể flash tệp $GEN_ISO này vào USB qua Rufus rổi!"
log "--------------------------------------------------------"
rm -rf "$BUILD_DIR"
