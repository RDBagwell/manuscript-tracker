# Stage 1 — compile the SPA
FROM node:20-alpine AS assets
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ .
RUN npm run build

# Stage 2 — nginx serves the static build and fronts php-fpm
FROM nginx:1.27-alpine
COPY docker/nginx-prod.conf /etc/nginx/nginx.conf
COPY --from=assets /app/dist /usr/share/nginx/html
EXPOSE 80
