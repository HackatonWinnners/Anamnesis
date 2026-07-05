FROM node:22-slim

WORKDIR /app
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN npm install -g pnpm@10.17.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

ARG NEXT_PUBLIC_API_BASE_URL=
ARG NEXT_SERVER_API_BASE_URL=http://api:8787
ENV NODE_ENV=production \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_SERVER_API_BASE_URL=$NEXT_SERVER_API_BASE_URL

RUN pnpm --filter @anamnesis/web build

WORKDIR /app/apps/web
ENV PORT=3000 \
    HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["pnpm", "start"]
