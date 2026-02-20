#!/bin/bash
set -e

# First convert to a true PNG if it's not
sips -s format png "/Users/lex/Downloads/Arquivos/ZERO/macOS Icon.png" --out official-icon.png

SOURCE_IMAGE="official-icon.png"
ICONSET_DIR="ZERO.iconset"
mkdir -p "$ICONSET_DIR"

# Generate all sizes for .icns
sips -z 16 16     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16.png"
sips -z 32 32     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_16x16@2x.png"
sips -z 32 32     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32.png"
sips -z 64 64     "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_32x32@2x.png"
sips -z 128 128   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128.png"
sips -z 256 256   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_128x128@2x.png"
sips -z 256 256   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256.png"
sips -z 512 512   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_256x256@2x.png"
sips -z 512 512   "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512.png"
sips -z 1024 1024 "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o ZERO.icns
cp ZERO.icns /Users/lex/Downloads/Arquivos/ZERO/apps/macos/Sources/ZERO/Resources/ZERO.icns
# Also copy the true PNG for other uses
cp official-icon.png /Users/lex/Downloads/Arquivos/ZERO/apps/macos/Sources/ZERO/Resources/AppIcon_Official.png

rm -rf "$ICONSET_DIR" ZERO.icns official-icon.png
echo "Ícone ZERO.icns regenerado com sucesso!"
