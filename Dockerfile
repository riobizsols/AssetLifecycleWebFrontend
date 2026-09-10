# syntax=docker/dockerfile:1.7
# Build stage: Vite embeds VITE_* at build time.
# BuildKit cache mounts keep npm + Vite caches between deploys (needs DOCKER_BUILDKIT=1).
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

ARG VITE_API_BASE_URL=https://bannari.rioassetmanagement.net/api
ARG VITE_FRONTEND_URL=https://bannari.rioassetmanagement.net
ARG VITE_API_PORT=
ARG VITE_RESERVED_SUBDOMAINS=web,www,api,pressanaorg,bannari

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_API_PORT=${VITE_API_PORT}
ENV VITE_RESERVED_SUBDOMAINS=${VITE_RESERVED_SUBDOMAINS}
# Keep heap modest on small VPS so the build does not thrash into swap.
ENV NODE_OPTIONS=--max-old-space-size=1536

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/node_modules/.vite \
    --mount=type=cache,target=/app/node_modules/.cache \
    npm run build

# Serve static files
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
