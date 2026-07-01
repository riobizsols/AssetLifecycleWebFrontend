# Build stage: Vite embeds VITE_* at build time
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=
ARG VITE_FRONTEND_URL=
ARG VITE_API_PORT=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_API_PORT=${VITE_API_PORT}

RUN npm run build

# Serve static files
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
