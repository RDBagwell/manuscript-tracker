.PHONY: frontend-rebuild help build up down logs clean restart shell artisan test lint format seed

help:
	@echo "Manuscript Tracker - Docker Commands"
	@echo "====================================="
	@echo ""
	@echo "Setup & Infrastructure:"
	@echo "  make build              Build all Docker images"
	@echo "  make up                 Start all services"
	@echo "  make down               Stop all services"
	@echo "  make restart            Restart all services"
	@echo "  make clean              Stop and remove all containers/volumes"
	@echo ""
	@echo "Logs & Debugging:"
	@echo "  make logs               View all service logs (follow)"
	@echo "  make logs-laravel       View Laravel logs"
	@echo "  make logs-react         View React logs"
	@echo "  make logs-nginx         View Nginx logs"
	@echo ""
	@echo "Laravel Commands:"
	@echo "  make shell              Open Laravel shell (bash)"
	@echo "  make artisan CMD=...    Run Laravel artisan command"
	@echo "  make migrate            Run database migrations"
	@echo "  make seed               Seed the database"
	@echo "  make fresh              Reset and reseed database"
	@echo "  make tinker             Open Laravel Tinker REPL"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test               Run PHP tests"
	@echo "  make lint               Run linting tools"
	@echo "  make format             Format code"
	@echo ""
	@echo "Database:"
	@echo "  make psql               Connect to PostgreSQL shell"
	@echo "  make redis-cli          Connect to Redis CLI"
	@echo ""

# Infrastructure commands
build:
	docker-compose build

up:
	docker-compose up -d
	@echo ""
	@echo "Services are starting..."
	@echo "Nginx:  http://localhost"
	@echo "React:  http://localhost (via Nginx)"
	@echo "API:    http://localhost/api (via Nginx)"

down:
	docker-compose down

restart: down up

clean:
	docker-compose down -v
	@echo "All containers and volumes removed"

# Log commands
logs:
	docker-compose logs -f

logs-laravel:
	docker-compose logs -f laravel

logs-react:
	docker-compose logs -f react

logs-nginx:
	docker-compose logs -f nginx

# Laravel commands
shell:
	docker-compose exec laravel /bin/sh

artisan:
	docker-compose exec laravel php artisan $(CMD)

migrate:
	docker-compose exec laravel php artisan migrate

seed:
	docker-compose exec laravel php artisan db:seed

fresh:
	docker-compose exec laravel php artisan migrate:fresh --seed

tinker:
	docker-compose exec laravel php artisan tinker

# Testing & Quality
# Hermetic test env: compose injects app config as real process env (visible
# in $$_SERVER), which outranks phpunit.xml <env> overrides in Laravel's env
# reader. Re-injecting at exec time is the only layer that reliably wins —
# guarantees sqlite :memory: + the CSRF unit-test bypass, and makes it
# impossible for `make test` to ever touch the dev Postgres data again.
test:
	docker-compose exec \
		-e APP_ENV=testing \
		-e APP_KEY=base64:Hfz0IWxJPfsqqpIFNCCaeF+2nHaqFXGQxpJtkmT+izs= \
		-e DB_CONNECTION=sqlite \
		-e DB_DATABASE=:memory: \
		-e SESSION_DRIVER=array \
		-e CACHE_STORE=array \
		-e QUEUE_CONNECTION=sync \
		laravel php artisan test

lint:
	docker-compose exec laravel composer run lint

format:
	docker-compose exec laravel composer run format

# Database access
psql:
	docker-compose exec postgres psql -U postgres -d manuscript_tracker

redis-cli:
	docker-compose exec redis redis-cli -a redis_dev_password

# React commands
npm-install:
	docker-compose exec react npm install

# Rebuild the react image and mint a fresh node_modules volume from it.
# Needed whenever a patch touches frontend/package.json: down/up cycles
# discard anonymous volumes and reseed them from the image, so a stale
# image quietly resurrects old node_modules.
frontend-rebuild:
	docker-compose build react
	docker-compose up -d --force-recreate --renew-anon-volumes react

npm-build:
	docker-compose exec react npm run build

# Development workflow
dev-setup: build up migrate
	@echo ""
	@echo "Development environment is ready!"
	@echo "Open http://localhost in your browser"

# Docker inspect
ps:
	docker-compose ps

stats:
	docker stats

health:
	@echo "Checking service health..."
	@docker-compose ps

# Maintenance
prune:
	docker system prune -f
	@echo "Docker system pruned"

stop-all:
	docker stop $$(docker ps -q)

remove-all:
	docker rm $$(docker ps -aq)
