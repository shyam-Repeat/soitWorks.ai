#!/bin/bash
set -e

# Only run full setup if venv doesn't exist (first time)
if [ ! -d "/home/node/venv" ]; then
    echo "==> Installing npm deps..."
    npm install

    echo "==> Creating venv..."
    python3 -m venv /home/node/venv

    echo "==> Upgrading pip + installing uv..."
    /home/node/venv/bin/pip install --upgrade pip uv

    echo "==> Installing Python requirements..."
    UV_CACHE_DIR=/tmp/uv-cache /home/node/venv/bin/uv pip install -r requirements.txt
fi

# Always reinstall browsers (lost on restart)
echo "==> Installing Playwright chromium..."
PLAYWRIGHT_BROWSERS_PATH=/workspaces/.playwright-browsers /home/node/venv/bin/playwright install chromium

echo "==> Installing Patchright chromium..."
PLAYWRIGHT_BROWSERS_PATH=/workspaces/.playwright-browsers /home/node/venv/bin/patchright install chromium
echo "==> Installing Scrapling..."
/home/node/venv/bin/scrapling install

echo "==> Done!"