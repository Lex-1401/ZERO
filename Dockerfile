FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  build-essential \
  python3 \
  cargo \
  rustc \
  && apt-get clean && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

ARG ZERO_DOCKER_APT_PACKAGES=""
RUN if [ -n "$ZERO_DOCKER_APT_PACKAGES" ]; then \
  apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $ZERO_DOCKER_APT_PACKAGES && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
  fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY rust-core/package.json ./rust-core/package.json
COPY patches ./patches
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build:rust
RUN pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV ZERO_PREFER_PNPM=1
RUN pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

# HIGH-DOCKER-001: Least privilege — executar como usuário 'node' (não root)
RUN chown -R node:node /app
USER node

CMD ["node", "dist/index.js"]
