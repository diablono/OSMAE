#!/usr/bin/env bash
# AIKO-OS Runtime Helper (Dùng cho Live USB / ISO)

# 1. Khởi chạy Ollama Server trong nền
echo "🚀 Đang khởi động AI Backend (Ollama)..."
ollama serve > /dev/null 2>&1 &

# 2. Đợi Ollama sẵn sàng (Wait for port 11434)
MAX_WAIT=30
WAITED=0
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
    WAITED=$((WAITED+1))
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "⚠️ Cảnh báo: Ollama khởi động quá lâu, có thể AI Local sẽ không sẵn sàng ngay."
        break
    fi
done

# 3. Khởi chạy AIKO-OS App (Hoặc thực thi qua npx nếu chưa đóng gói)
echo "✨ Khởi chạy AIKO-OS UI..."
# Chạy AppImage nếu có (thay đổi tên file cho đúng với phiên bản build)
APP_IMAGE=$(find /opt/aiko-os/ -name "*.AppImage" | head -1)

if [ -f "$APP_IMAGE" ]; then
    chmod +x "$APP_IMAGE"
    "$APP_IMAGE" --no-sandbox "$@"
else
    # Fallback nếu chạy trong môi trường dev
    cd /opt/aiko-os/ && npm start -- --no-sandbox "$@"
fi
