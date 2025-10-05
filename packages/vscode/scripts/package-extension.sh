#!/bin/bash
# Package extension for VSCode Marketplace
# Workaround for monorepo node_modules hoisting issue

set -e

echo "🔨 Building extension..."
npm run build

echo "📦 Preparing standalone package directory..."
TMP_DIR=$(mktemp -d)
echo "   Using temporary directory: $TMP_DIR"

echo "📋 Copying files..."
cp -r dist "$TMP_DIR/"
cp -r src "$TMP_DIR/"
cp -r images "$TMP_DIR/"
cp package.json "$TMP_DIR/"
cp tsconfig.json "$TMP_DIR/"
cp webpack.config.js "$TMP_DIR/"
cp .vscodeignore "$TMP_DIR/"
[ -f README.md ] && cp README.md "$TMP_DIR/" || true
[ -f LICENSE ] && cp LICENSE "$TMP_DIR/" || true
[ -f INSTALL.md ] && cp INSTALL.md "$TMP_DIR/" || true

echo "📥 Installing production dependencies..."
cd "$TMP_DIR"
npm install --production --no-package-lock

echo "📦 Packaging extension..."
npx @vscode/vsce package --allow-star-activation

echo "✅ Copying .vsix back to project..."
cp *.vsix "$OLDPWD/"

echo "🧹 Cleaning up..."
cd "$OLDPWD"
rm -rf "$TMP_DIR"

echo "✨ Done! Package created: $(ls -1 *.vsix | tail -1)"
ls -lh *.vsix | tail -1
