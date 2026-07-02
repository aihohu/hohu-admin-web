# --- Build Stage ---
FROM node:24.16.0-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.5.3 --activate

WORKDIR /app

ARG VITE_SERVICE_BASE_URL=/api
ENV VITE_SERVICE_BASE_URL=${VITE_SERVICE_BASE_URL}

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/ ./packages/

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install

COPY . .

RUN pnpm build

# --- Production Stage ---
FROM nginx:1.31.2-alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /etc/nginx/conf.d

USER nginx

EXPOSE 80
