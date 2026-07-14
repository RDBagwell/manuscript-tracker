# Quick Start Guide

## First Time Setup (2 minutes)

```bash
# 1. Copy environment file
cp .env.docker .env

# 2. One command setup
make dev-setup

# 3. Open browser
open http://localhost
```

Done! Everything is running.

## Daily Commands

### Stop/Start Services
```bash
make up        # Start everything
make down      # Stop everything
make restart   # Restart all services
```

### View Logs
```bash
make logs              # All services
make logs-laravel      # Just Laravel
make logs-react        # Just React
make logs-nginx        # Just Nginx
```

### Database Operations
```bash
make migrate           # Run migrations
make seed              # Seed database
make fresh             # Reset + reseed everything

# Direct database access
make psql              # PostgreSQL shell
make redis-cli         # Redis CLI
```

### Laravel Commands
```bash
# Open Laravel shell
make shell

# Or run commands directly
make artisan CMD="make:model Agent -m"
make artisan CMD="queue:work"
```

### Testing
```bash
make test              # Run PHPUnit tests
make lint              # Lint code
make format            # Format code
```

## Project Structure

```
.
├── docker/
│   ├── docker-compose.yml      # Service orchestration
│   ├── laravel-dockerfile      # PHP/Laravel image
│   ├── react-dockerfile        # React image
│   ├── nginx.conf              # Reverse proxy config
│   ├── docker-entrypoint.sh    # Laravel startup script
│   └── php/                    # PHP configs (OPcache, Xdebug)
├── backend/                    # Laravel API
│   ├── app/
│   ├── database/migrations/
│   ├── routes/api.php
│   └── storage/logs/
├── frontend/                   # React app
│   ├── src/
│   ├── public/
│   └── package.json
├── Makefile                    # Convenience commands
├── DOCKER_SETUP.md             # Full documentation
└── .env.docker                 # Environment config
```

## Accessing Services

| Service   | URL                          | How                    |
|-----------|------------------------------|------------------------|
| Frontend  | http://localhost             | Nginx (port 80)        |
| API       | http://localhost/api         | Nginx → Laravel        |
| Laravel   | Port 9000 (internal only)    | Via Nginx reverse proxy|
| React Dev | Port 3000 (internal only)    | Via Nginx reverse proxy|
| Database  | `make psql`                  | PostgreSQL shell       |
| Cache     | `make redis-cli`             | Redis CLI              |

## Debugging

### Container won't start
```bash
# Check logs
make logs-laravel

# Restart container
make restart
```

### Database migration errors
```bash
# Check database connection
make psql

# Manually run migrations
make artisan CMD="migrate --verbose"
```

### Can't connect to API from frontend
- Nginx may not be running: `docker-compose ps`
- Check Laravel health: `make artisan CMD="--version"`
- Verify API route: Check `backend/routes/api.php`

### Port already in use
Edit `.env.docker`:
```bash
NGINX_PORT=8080    # Use 8080 instead of 80
```

## Environment Variables

Edit `.env.docker` to change:
- Database name/password
- Redis password
- API URL for frontend
- Port mappings

Then: `docker-compose down && docker-compose up`

## Production Notes

Before deploying:
1. Change all default passwords
2. Set `APP_DEBUG=false`
3. Set `APP_ENV=production`
4. Use HTTPS (add SSL cert to Nginx)
5. Don't expose Redis/PostgreSQL to internet

## Help & Documentation

- Full guide: `DOCKER_SETUP.md`
- All commands: `make help`
- Service logs: `make logs`
- Docker compose reference: `docker-compose help`

---

**For detailed information on scaling, monitoring, and advanced configuration, see `DOCKER_SETUP.md`**
