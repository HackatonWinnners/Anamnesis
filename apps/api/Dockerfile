FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN npm install -g pnpm@10.17.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

WORKDIR /app/apps/api
ENV PORT=8787
EXPOSE 8787

CMD ["pnpm", "exec", "tsx", "src/index.ts"]
