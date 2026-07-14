# syntax=docker/dockerfile:1.4

ARG PHP_VERSION=8.2

# ===== BUILD STAGE =====
FROM php:${PHP_VERSION}-fpm-alpine AS builder

# Install system dependencies
RUN apk add --no-cache \
    build-base \
    libpq-dev \
    zip \
    unzip \
    git \
    curl \
    ca-certificates

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    opcache \
    bcmath \
    ctype \
    mbstring \
    tokenizer

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Copy Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy only composer files for better layer caching
COPY backend/composer.json backend/composer.lock ./

# Install dependencies with optimizations
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts \
    --no-progress

# ===== DEVELOPMENT STAGE =====
FROM php:${PHP_VERSION}-fpm-alpine AS development

RUN apk add --no-cache \
    libpq-dev \
    git \
    curl \
    ca-certificates \
    postgresql-client \
    redis

RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    opcache \
    bcmath \
    ctype \
    mbstring \
    tokenizer

RUN pecl install redis xdebug && \
    docker-php-ext-enable redis xdebug

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# PHP config for development
COPY docker/php/php.ini $PHP_INI_DIR/php.ini
COPY docker/php/opcache.ini $PHP_INI_DIR/conf.d/10-opcache.ini
COPY docker/php/xdebug.ini $PHP_INI_DIR/conf.d/20-xdebug.ini

WORKDIR /app

COPY backend/ .

# Copy pre-built vendor from builder stage
COPY --from=builder /app/vendor ./vendor

# Create necessary directories
RUN mkdir -p storage/logs storage/framework/{sessions,views,cache} bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

# Copy entrypoint script
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php-fpm"]

# ===== PRODUCTION STAGE =====
FROM php:${PHP_VERSION}-fpm-alpine AS production

RUN apk add --no-cache \
    libpq \
    ca-certificates \
    postgresql-client \
    redis

RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    opcache \
    bcmath \
    ctype \
    mbstring \
    tokenizer

RUN pecl install redis && docker-php-ext-enable redis

# Optimized PHP config for production
COPY docker/php/php.ini $PHP_INI_DIR/php.ini
COPY docker/php/opcache-prod.ini $PHP_INI_DIR/conf.d/10-opcache.ini

WORKDIR /app

COPY backend/ .
COPY --from=builder /app/vendor ./vendor

# Remove dev files
RUN rm -rf .git .github .gitignore tests phpunit.xml

RUN mkdir -p storage/logs storage/framework/{sessions,views,cache} bootstrap/cache && \
    chown -R www-data:www-data storage bootstrap/cache

COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["php-fpm"]
