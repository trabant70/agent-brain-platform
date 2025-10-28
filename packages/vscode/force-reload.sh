#!/bin/bash
# Force complete extension reload

echo "=== Cleaning all build artifacts ==="
rm -rf dist/
rm -rf node_modules/.cache/
rm -f *.vsix

echo "=== Rebuilding from scratch ==="
npm run clean
cd ../..
npm run build

cd packages/vscode

echo "=== Creating fresh package ==="
npm run package

echo ""
echo "=== NEXT STEPS ==="
echo "1. Close VSCode completely"
echo "2. Delete VSCode's extension cache:"
echo "   Windows: %USERPROFILE%\.vscode\extensions\agent-brain-local.agent-brain-platform-*"
echo "   Linux: ~/.vscode/extensions/agent-brain-local.agent-brain-platform-*"
echo "3. Reinstall: code --install-extension agent-brain-platform-*.vsix --force"
echo "4. Reload VSCode window"
echo ""
echo "Latest VSIX: $(ls -t agent-brain-platform-*.vsix | head -1)"
