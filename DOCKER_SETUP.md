# Manuscript Tracker - Docker Setup Guide

A production-ready, scalable Docker environment for the Manuscript Tracker application (React + Laravel + PostgreSQL + Redis).

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Nginx Reverse Proxy            │
│              (Port 80 - Single Entry Point)      │
└────┬──────────────────────────┬─────────────────┘
     │                          │
     ├─→ /api/*    ─→ Laravel  ├─→ Port 9000
     │              (FPM)       │
     │                          │
     └─→ /*        ─→ React    └─→ Port 3000
                     (Dev/Prod)
     
┌────────────────────────────────────────────────────┐
│  PostgreSQL (Port 5432)   Redis (Port 6379)       │
│  - Query data             - Sessions               │
│  - Persistent storage     - Cache                  │
│                           - Job queue              │
└────────────────────────────────────────────────────┘

Network: app-network (Docker bridge)
```

## Quick Start

### Prerequisites
- Docker Desktop (or Docker + Docker Compose)
- Git

### Setup (1 minute)

```bash
# 1. Clone the project
git clone <repo-url>
cd manuscript-tracker

# 2. Copy environment file
cp .env.docker .env

# 3. Build and start services
make dev-setup

# 4. Open in browser
open http://localhost
```

That's it! `make dev-setup` does:
- Build all Docker images
- Start all services
- Run database migrations
- Everything is ready to use

## Service Details

### PostgreSQL (postgres)
- **Image**: `postgres:16-alpine`
- **Port**: 5432
- **Volume**: `postgres_data` (persistent)
- **Health Check**: Enabled with 5s intervals
- **Connection**: `postgres://postgres:postgres_dev_password@postgres:5432/manuscript_tracker`

### Redis (redis)
- **Image**: `redis:7-alpine`
- **Port**: 6379
- **Volume**: `redis_data` (persistent with AOF)
- **Health Check**: Enabled
- **Password**: `redis_dev_password`
- **Uses**: Sessions, cache, queue

### Laravel API (laravel)
- **Base**: PHP 8.4-FPM on Alpine
- **Port**: 9000 (internal, proxied via Nginx)
- **Volumes**: 
  - Application code (live)
  - `vendor/` (mounted separately for performance)
  - `storage/logs/` (persistent)
- **Extensions**: PDO/PostgreSQL, Redis, OPcache, Xdebug
- **Startup**: Auto-runs migrations on container start
- **Health**: Depends on PostgreSQL and Redis being ready

### React (react)
- **Base**: Node 20 Alpine
- **Port**: 3000 (internal, proxied via Nginx)
- **Dev Mode**: Hot reload enabled
- **Build**: Multi-stage for production optimization
- **Environment**: `VITE_API_URL=http://localhost/api`

### Nginx (nginx)
- **Image**: `nginx:alpine`
- **Port**: 80 (exposed to host)
- **Config**: `/docker/nginx.conf`
- **Features**:
  - Reverse proxy (API → Laravel, /* → React)
  - Gzip compression
  - Security headers (HSTS, CSP, X-Frame-Options)
  - Health endpoint at `/health`
  - Static file caching headers

## Common Commands

### Development Workflow

```bash
# View all services
make ps

# View logs (all services)
make logs

# View Laravel logs only
make logs-laravel

# Open Laravel shell
make shell

# Run artisan command
make artisan CMD="make:model Agent -m"

# Run migrations
make migrate

# Seed database
make seed

# Reset database
make fresh
```

### Database Access

```bash
# PostgreSQL shell
make psql

# Redis CLI
make redis-cli

# Example Redis commands:
# > PING
# > KEYS *
# > GET <key>
```

### Testing & Quality

```bash
# Run PHPUnit tests
make test

# Lint code
make lint

# Format code
make format
```

### Stopping & Restarting

```bash
# Stop all services (data persists)
make down

# Restart all services
make restart

# Stop and remove everything (data deleted)
make clean
```

## Dockerfile Details

### Multi-Stage Builds (Optimization)

All Dockerfiles use multi-stage builds for efficiency:

1. **Builder Stage**: Compiles dependencies (composer, npm)
2. **Development Stage**: Includes dev tools, hot reload
3. **Production Stage**: Minimal size, optimized for performance

This keeps development images small while production is ultra-lean.

### Laravel Dockerfile (`docker/laravel-dockerfile`)
- **Stage 1 (builder)**: Installs Composer dependencies with `--no-dev`
- **Stage 2 (development)**: Includes Xdebug, all extensions, dev tools
- **Stage 3 (production)**: Minimal, only production dependencies

Build args:
- `PHP_VERSION`: Default 8.4

### React Dockerfile (`docker/react-dockerfile`)
- **Stage 1 (builder)**: Builds optimized production bundle
- **Stage 2 (development)**: Watches for changes, hot reload
- **Stage 3 (production)**: Serves pre-built bundle with `serve`

### Entrypoint Script (`docker/docker-entrypoint.sh`)
The Laravel container runs this on startup:
1. Waits for PostgreSQL to be ready
2. Waits for Redis to be ready
3. Generates `APP_KEY` if missing
4. **Runs database migrations** (auto-apply)
5. Seeds database (if `SEED_DATABASE=true`)
6. Caches config/routes (production only)
7. Starts PHP-FPM

This ensures the application is fully initialized before accepting requests.

## Environment Configuration

### `.env.docker` Variables

```bash
# App
APP_ENV=local                    # local, staging, production
APP_DEBUG=true                   # Enable Laravel debug mode

# Database (PostgreSQL)
DB_HOST=postgres                 # Container name (resolved by Docker DNS)
DB_NAME=manuscript_tracker       # Database name
DB_USER=postgres                 # Database user
DB_PASSWORD=postgres_dev_password # Database password

# Cache/Session (Redis)
REDIS_HOST=redis
REDIS_PASSWORD=redis_dev_password
CACHE_DRIVER=redis
SESSION_DRIVER=redis

# Frontend
VITE_API_URL=http://localhost/api  # CORS-safe internal URL
```

### Changing Passwords

Edit `.env.docker`:
```bash
DB_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_password
```

Then rebuild:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

## Scaling Strategies

### Horizontal Scaling (Multiple Workers)

#### PHP-FPM (Laravel)
Currently: 1 Laravel container

To scale to 3 replicas, modify `docker-compose.yml`:
```yaml
services:
  laravel-1:
    # ... existing config
  laravel-2:
    # Copy laravel config, change container_name
  laravel-3:
    # Copy laravel config, change container_name
```

Update Nginx upstream:
```nginx
upstream laravel_api {
    server laravel-1:9000;
    server laravel-2:9000;
    server laravel-3:9000;
    least_conn;  # Load balancing strategy
}
```

#### React (Frontend)
React should rarely need scaling; it's static. However, if needed:
```yaml
  react-1:
    # ... existing config
  react-2:
    # ... existing config
```

Update Nginx:
```nginx
upstream react_app {
    server react-1:3000;
    server react-2:3000;
    least_conn;
}
```

### Database Scaling

#### Read Replicas (PostgreSQL)
For read-heavy workloads, add a read-only replica:

1. Create replica container in `docker-compose.yml`
2. Configure as streaming replication
3. Route read queries to replica in Laravel config

#### Connection Pooling
Add PgBouncer to pool connections:
```yaml
pgbouncer:
  image: pgbouncer:latest
  environment:
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
  # Connect Laravel to pgbouncer instead of postgres
```

### Redis Scaling

#### Redis Clustering
For high-concurrency cache/sessions:
```yaml
redis-cluster:
  # Use redis-cluster image
  # Partition data across nodes
```

#### Redis Sentinel
For high availability:
```yaml
redis-master:
  # Primary
redis-slave:
  # Failover replica
redis-sentinel:
  # Monitors and handles failover
```

### Kubernetes (Production)

For true cloud scaling, containerize with Kubernetes:

```yaml
# Example: Kubernetes Deployment for Laravel
apiVersion: apps/v1
kind: Deployment
metadata:
  name: laravel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: laravel
  template:
    metadata:
      labels:
        app: laravel
    spec:
      containers:
      - name: laravel
        image: manuscript-tracker:laravel-prod
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: DB_HOST
          value: postgres-service
        readinessProbe:
          httpGet:
            path: /api/health
            port: 9000
          initialDelaySeconds: 10
          periodSeconds: 5
```

Tools: `kubectl`, `Helm`, or `Kustomize`

## Performance Optimization

### PHP Optimization
- **OPcache**: Enabled in production (disabled in dev for fast iteration)
  - `realpath_cache`: Caches file paths (faster autoloading)
  - `max_accelerated_files`: 20,000 (enough for large apps)

### Nginx Optimization
- **Gzip compression**: Reduces payload ~70%
- **Security headers**: CSP, X-Frame-Options, HSTS
- **Caching**: Browser cache headers for static assets

### Database Optimization
- **Connection pooling**: Reduce overhead
- **Indexes**: On frequently queried columns
- **Prepared statements**: Built into Laravel/PDO
- **Query caching**: Redis layer

### React Optimization
- **Code splitting**: Lazy load routes
- **Tree shaking**: Remove unused code
- **Minification**: Done in production build

### Resource Limits
Set container resource limits in `docker-compose.yml`:
```yaml
services:
  laravel:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Troubleshooting

### Services won't start
```bash
# Check logs
make logs

# Check specific service
make logs-laravel

# Restart
make restart
```

### Database migration fails
```bash
# Check PostgreSQL is ready
docker-compose exec postgres pg_isready

# Manually run migrations
make artisan CMD="migrate"

# See full error
docker-compose logs laravel
```

### Can't connect to Redis
```bash
# Check Redis is running
docker-compose exec redis redis-cli PING

# Check password
docker-compose exec redis redis-cli -a redis_dev_password PING
```

### Frontend can't reach API
- Verify Nginx is routing `/api/*` to Laravel
- Check `VITE_API_URL` in `.env.docker`
- Ensure Laravel is healthy: `docker-compose exec laravel php artisan --version`

### Port conflicts
If port 80 is taken:
```bash
# Change in docker-compose.yml
ports:
  - "8080:80"  # Access via http://localhost:8080
```

## Security Best Practices

### Development
- Change default passwords before production
- Don't commit `.env` files with real secrets
- Use `.env.local` (git-ignored) for local overrides

### Production
- Use strong passwords (PostgreSQL, Redis)
- Set `APP_DEBUG=false`
- Use HTTPS (Nginx SSL certificate)
- Restrict Redis to internal network only
- Enable PostgreSQL SSL connections
- Run containers as non-root user (already done)

### Example Production Setup
```yaml
# docker-compose.prod.yml
version: '3.9'
services:
  postgres:
    # ... same config
    ports: []  # Don't expose to host
    
  redis:
    # ... same config
    ports: []  # Internal only
    
  nginx:
    ports:
      - "443:443"  # HTTPS only
    volumes:
      - ./certs/:/etc/nginx/certs/:ro  # SSL certificates
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16-alpine
      redis:
        image: redis:7-alpine
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Build images
        run: docker-compose build
      
      - name: Run tests
        run: docker-compose run laravel vendor/bin/phpunit
      
      - name: Push to registry
        run: docker push myregistry/manuscript-tracker
```

## Maintenance

### Regular Tasks

```bash
# Weekly: Check for updates
docker-compose pull

# Monthly: Prune unused images/volumes
make prune

# As needed: Backup database
docker-compose exec postgres pg_dump -U postgres manuscript_tracker > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres manuscript_tracker < backup.sql
```

### Monitoring

```bash
# Resource usage
make stats

# Service status
make health

# View logs over time
make logs | grep ERROR
```

## Next Steps

1. **Build project structure**:
   ```bash
   mkdir -p backend frontend
   # Initialize Laravel in backend/
   # Initialize React in frontend/
   ```

2. **Configure database migrations**:
   ```bash
   make artisan CMD="make:migration create_agents_table"
   ```

3. **Start development**:
   ```bash
   make dev-setup
   # Open http://localhost
   ```

4. **Deploy** (when ready):
   - Push images to Docker registry
   - Deploy to cloud provider (AWS, DigitalOcean, etc.)
   - Use Kubernetes or Docker Swarm for orchestration

---

## Files Reference

- `docker-compose.yml` - Service orchestration
- `docker/laravel-dockerfile` - PHP/Laravel image
- `docker/react-dockerfile` - React image
- `docker/nginx.conf` - Reverse proxy config
- `docker/docker-entrypoint.sh` - Laravel startup script
- `Makefile` - Convenient commands
- `.env.docker` - Environment variables
- `.dockerignore` - Build context optimization

For questions or issues, check service logs: `make logs`
