# syntax=docker/dockerfile:1.4

ARG NODE_ENV=development

# ===== BUILD STAGE =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build

# ===== DEVELOPMENT STAGE =====
FROM node:20-alpine AS development

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci

COPY frontend/ .

EXPOSE 3000

CMD ["npm", "start"]

# ===== PRODUCTION STAGE =====
FROM node:20-alpine AS production

RUN npm install -g serve

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci --only=production

COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
