FROM node:22-bookworm

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
  build-essential \
  python3 \
  && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.cargo/bin:${PATH}"

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
RUN pnpm build:rust && \
  echo 'export function triggerPanic(secret: string): void' > rust-core/index.d.ts && \
  echo 'export function resetPanic(): void' >> rust-core/index.d.ts && \
  echo 'export function isPanicMode(): boolean' >> rust-core/index.d.ts && \
  echo 'export class VadEngine { constructor(threshold: number, silenceTimeoutMs: number); processChunk(chunk: Buffer | number[]): string; }' >> rust-core/index.d.ts && \
  echo 'export interface ModelMetric { model: string; count: number; }' >> rust-core/index.d.ts && \
  echo 'export interface MetricsSummary { totalTokens: number; modelBreakdown: Array<ModelMetric>; avgLatencyMs: number; }' >> rust-core/index.d.ts && \
  echo 'export class MetricsEngine { constructor(); recordTokens(model: string, count: number): void; recordLatency(ms: number): void; summarize(): MetricsSummary; }' >> rust-core/index.d.ts && \
  echo 'export class RatchetDedupe { constructor(ttlMs: number, maxSize: number); check(key: string, timestampMs?: number | undefined | null): boolean; clear(): void; size(): number; }' >> rust-core/index.d.ts && \
  echo 'export class SecurityEngine { constructor(); detectInjection(text: string): string | null; redactPii(text: string): string; calculateEntropy(text: string): number; }' >> rust-core/index.d.ts
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
