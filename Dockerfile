# --- Build Stage ---
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

ARG VITE_SERVICE_BASE_URL=/api
ENV VITE_SERVICE_BASE_URL=${VITE_SERVICE_BASE_URL}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# --- Production Stage ---
FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 80
