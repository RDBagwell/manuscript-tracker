# Project Setup Guide

This guide walks you through setting up the Laravel backend and React frontend within the Docker environment.

## Directory Structure

```
manuscript-tracker/
├── backend/                         # Laravel API
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   │   ├── factories/
│   │   ├── migrations/
│   │   └── seeders/
│   ├── public/
│   ├── resources/
│   ├── routes/
│   │   ├── api.php                 # API routes
│   │   ├── web.php                 # Web routes (if needed)
│   │   └── console.php
│   ├── storage/
│   ├── tests/
│   ├── .env
│   ├── artisan
│   └── composer.json                # (Dockerfile lives in docker/laravel-dockerfile)
│
├── frontend/                        # React app
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/               # API client
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── .env                        # Use .env.local for overrides
│   └── .gitignore                  # (Dockerfile lives in docker/react-dockerfile)
│
├── docker/                          # Docker configurations
│   ├── docker-compose.yml           # Main orchestration file
│   ├── laravel-dockerfile           # PHP/Laravel image
│   ├── react-dockerfile             # Node/React image
│   ├── nginx.conf                   # Nginx reverse proxy
│   ├── docker-entrypoint.sh         # Laravel startup script
│   ├── init-db.sql                  # Database initialization
│   └── php/                         # PHP configurations
│       ├── php.ini
│       ├── opcache.ini
│       ├── opcache-prod.ini
│       └── xdebug.ini
│
├── Makefile                         # Convenience commands
├── docker-compose.yml               # Main compose file
├── .env.docker                      # Environment template
├── .env                             # Your local env (copy from .env.docker)
├── .dockerignore                    # Docker build optimization
├── .gitignore                       # Git ignore
├── DOCKER_SETUP.md                  # Full documentation
├── QUICK_START.md                   # Quick reference
└── PROJECT_SETUP.md                 # This file
```

## Step 1: Initialize Laravel Backend

### Option A: Fresh Laravel Installation

```bash
# Create backend directory
mkdir backend
cd backend

# Create a new Laravel project using Composer
# (You'll run this with Docker, not locally)
docker run --rm -v $(pwd):/app composer:latest create-project laravel/laravel .

cd ..
```

> Note: You do **not** copy the Dockerfile or entrypoint into `backend/`.
> `docker-compose.yml` builds from the project root using
> `docker/laravel-dockerfile` (target `development`), and that image already
> installs `docker/docker-entrypoint.sh` at `/usr/local/bin/`.

### Option B: Existing Laravel Project

If you have an existing Laravel project:
```bash
# Copy your existing Laravel project
cp -r /path/to/existing/laravel backend

# (No Dockerfile/entrypoint copy needed — the image is built from
#  docker/laravel-dockerfile and ships the entrypoint itself.)

# Update .env for Docker
cat > backend/.env << EOF
APP_NAME="Manuscript Tracker"
APP_ENV=local
APP_DEBUG=true
APP_KEY=base64:placeholder

DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=manuscript_tracker
DB_USERNAME=postgres
DB_PASSWORD=postgres_dev_password

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=redis
REDIS_PASSWORD=redis_dev_password
REDIS_PORT=6379

MAIL_DRIVER=log
EOF
```

## Step 2: Initialize React Frontend

### Option A: Create New React App

```bash
# Create frontend directory
mkdir frontend
cd frontend

# Create React app using Docker
docker run --rm -v $(pwd):/app -w /app node:20-alpine \
  npx create-react-app .

# Or use Vite (faster)
docker run --rm -v $(pwd):/app -w /app node:20-alpine \
  npm create vite@latest . -- --template react

cd ..
```

> Note: No Dockerfile copy needed — the frontend image is built from
> `docker/react-dockerfile` (target `development`) with the project root as
> build context.

### Option B: Existing React Project

```bash
# Copy your existing React project
cp -r /path/to/existing/react frontend

# (No Dockerfile copy needed — built from docker/react-dockerfile.)

# Create .env file
cat > frontend/.env << EOF
VITE_API_URL=http://localhost/api
NODE_ENV=development
EOF
```

## Step 3: Configure API Communication

### Laravel API Setup

Create API routes in `backend/routes/api.php`:

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    // Agents resource
    Route::apiResource('agents', AgentController::class);
    
    // Queries resource
    Route::apiResource('queries', QueryController::class);
});

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});
```

### React API Client

Create `frontend/src/services/api.js`:

```javascript
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost/api';

export const api = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async put(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return response.json();
  },
};

export default api;
```

Use in React components:

```javascript
import api from './services/api';

function AgentList() {
  const [agents, setAgents] = React.useState([]);

  React.useEffect(() => {
    api.get('/agents').then(setAgents);
  }, []);

  return (
    <div>
      {agents.map(agent => (
        <div key={agent.id}>{agent.name}</div>
      ))}
    </div>
  );
}
```

## Step 4: Create Database Schema

### Generate Laravel Models and Migrations

```bash
# Create Agent model with migration and controller
make artisan CMD="make:model Agent -mcr"

# Create Query model
make artisan CMD="make:model Query -mcr"

# Create other needed models
make artisan CMD="make:model Publisher -m"
make artisan CMD="make:model Publisher -m"
```

Edit the migration files in `backend/database/migrations/`:

```php
// Example: Create agents table
Schema::create('agents', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('agency')->nullable();
    $table->string('genres')->nullable();
    $table->text('notes')->nullable();
    $table->timestamps();
});

// Example: Create queries table
Schema::create('queries', function (Blueprint $table) {
    $table->id();
    $table->foreignId('agent_id')->constrained()->onDelete('cascade');
    $table->string('manuscript_title');
    $table->enum('status', ['sent', 'followed_up', 'rejected', 'requested', 'accepted'])->default('sent');
    $table->date('query_date');
    $table->date('follow_up_date')->nullable();
    $table->date('response_date')->nullable();
    $table->text('response_notes')->nullable();
    $table->timestamps();
});
```

### Run Migrations

```bash
make migrate
```

This will:
1. Connect to PostgreSQL
2. Run all migrations
3. Create all tables

## Step 5: Create Controllers

### Example: Agent Controller

```bash
make artisan CMD="make:controller AgentController --api"
```

Edit `backend/app/Http/Controllers/AgentController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Agent;
use Illuminate\Http\Request;

class AgentController extends Controller
{
    public function index()
    {
        return Agent::paginate(15);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:agents',
            'agency' => 'nullable|string',
            'genres' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        return Agent::create($validated);
    }

    public function show(Agent $agent)
    {
        return $agent->load('queries');
    }

    public function update(Request $request, Agent $agent)
    {
        $validated = $request->validate([
            'name' => 'string',
            'email' => 'email|unique:agents,email,' . $agent->id,
            'agency' => 'nullable|string',
            'genres' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $agent->update($validated);
        return $agent;
    }

    public function destroy(Agent $agent)
    {
        $agent->delete();
        return response()->noContent();
    }
}
```

## Step 6: Start Development

```bash
# Build and start everything
make dev-setup

# Open browser
open http://localhost
```

## Step 7: Common Next Steps

### Add Authentication
```bash
make artisan CMD="install:api"
```

### Add Nova Admin Panel
```bash
composer require laravel/nova
make artisan CMD="nova:install"
```

### Add Testing
```bash
make artisan CMD="make:test --unit AgentTest"
make test
```

### Add Seeding
Create `backend/database/seeders/AgentSeeder.php`:
```php
public function run()
{
    Agent::factory(10)->create();
}
```

Run: `make seed`

## Troubleshooting

### Laravel container won't start
```bash
make logs-laravel
# Check for syntax errors or missing dependencies
```

### React won't compile
```bash
make logs-react
# Check for import errors or missing packages
make npm-install
```

### Database migration fails
```bash
# Check table doesn't already exist
make psql
# SELECT * FROM information_schema.tables WHERE table_schema = 'public';

# Reset if needed
make artisan CMD="migrate:reset"
make migrate
```

### Can't find API endpoint
- Verify route in `backend/routes/api.php`
- Check controller method exists
- Test with `curl http://localhost/api/health`

---

Ready to start? Run `make dev-setup` and visit http://localhost!

For detailed Docker information, see `DOCKER_SETUP.md`.
