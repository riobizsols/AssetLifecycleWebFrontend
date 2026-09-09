# Build stage: Vite embeds VITE_* at build time
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=https://bannari.rioassetmanagement.net/api
ARG VITE_FRONTEND_URL=https://bannari.rioassetmanagement.net
ARG VITE_API_PORT=
ARG VITE_RESERVED_SUBDOMAINS=web,www,api,pressanaorg,bannari

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_API_PORT=${VITE_API_PORT}
ENV VITE_RESERVED_SUBDOMAINS=${VITE_RESERVED_SUBDOMAINS}
ENV NODE_OPTIONS=--max-old-space-size=2048

RUN npm run build

# Serve static files
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
