FROM mcr.microsoft.com/devcontainers/typescript-node:20

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends python3-pip python3-dev python3-venv build-essential \
    && apt-get -y install \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 \
        libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 libcairo2 \
        libfontconfig1 libxml2-dev libxslt-dev libharfbuzz0b \
        libwayland-client0 libwayland-cursor0 libwayland-egl1 \
        libx11-6 libx11-xcb1 libxcb1 libxcursor1 libxi6 \
        libxkbcommon-x11-0 libxrender1 libxtst6 \
    && rm -rf /var/lib/apt/lists/*

SHELL ["/bin/bash", "-c"]

WORKDIR /workspaces/instainsight

RUN apt-get update && apt-get install -y unzip wget curl \
    && wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.10/pocketbase_0.22.10_linux_amd64.zip \
    && unzip pocketbase_0.22.10_linux_amd64.zip -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/pocketbase \
    && rm pocketbase_0.22.10_linux_amd64.zip \
    && rm -rf /var/lib/apt/lists/*

ENV PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright
RUN mkdir -p /home/node/.cache/ms-playwright && chown -R node:node /home/node/.cache/ms-playwright

USER node

RUN python3 -m venv /home/node/venv
ENV PATH="/home/node/venv/bin:$PATH"

COPY --chown=node:node requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install chromium \
    && patchright install chromium \
    && scrapling install