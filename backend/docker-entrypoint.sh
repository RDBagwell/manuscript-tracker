#!/bin/sh
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Laravel Startup ==${NC}"

# Wait for database to be ready
echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
max_attempts=30
attempt=1
until pg_isready -h "$DB_HOST" -U "$DB_USERNAME" -d "$DB_DATABASE" > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts: PostgreSQL not ready yet..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Failed to connect to PostgreSQL after $max_attempts attempts${NC}"
    exit 1
fi

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Wait for Redis to be ready
echo -e "${YELLOW}Waiting for Redis...${NC}"
max_attempts=30
attempt=1
until redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD --raw incr ping > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts: Redis not ready yet..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}Failed to connect to Redis after $max_attempts attempts${NC}"
    exit 1
fi

echo -e "${GREEN}Redis is ready!${NC}"

# Generate APP_KEY if not set
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "base64:placeholder_key_change_in_production" ]; then
    echo -e "${YELLOW}Generating APP_KEY...${NC}"
    php artisan key:generate --force
    echo -e "${GREEN}APP_KEY generated${NC}"
fi

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
php artisan migrate --force
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Migrations completed${NC}"
else
    echo -e "${RED}Migration failed, but continuing...${NC}"
fi

# Seed database if needed (optional, comment out if not needed initially)
# if [ "$SEED_DATABASE" = "true" ]; then
#     echo -e "${YELLOW}Seeding database...${NC}"
#     php artisan db:seed
#     echo -e "${GREEN}Database seeded${NC}"
# fi

# Cache config and routes for performance
if [ "$APP_ENV" != "local" ]; then
    echo -e "${YELLOW}Caching config and routes...${NC}"
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    echo -e "${GREEN}Cache completed${NC}"
fi

# Clear any stale cache
echo -e "${YELLOW}Clearing cache...${NC}"
php artisan cache:clear
php artisan config:clear

echo -e "${GREEN}=== Laravel Ready ===${NC}"

# Execute the main command
exec "$@"
