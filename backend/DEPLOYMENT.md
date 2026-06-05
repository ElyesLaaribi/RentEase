# Backend Deployment

This Laravel backend is prepared for Docker-based hosting. Use the `backend`
folder as the service root so the host builds `backend/Dockerfile`.

## Required Environment Variables

Set these in the hosting dashboard:

```env
APP_NAME=Laravel
APP_ENV=production
APP_KEY=base64:...
APP_DEBUG=false
APP_URL=https://your-backend-domain.example
FRONTEND_URL=https://your-vercel-frontend.vercel.app

CORS_ALLOWED_ORIGINS=https://your-vercel-frontend.vercel.app
CORS_SUPPORTS_CREDENTIALS=true
SANCTUM_STATEFUL_DOMAINS=your-vercel-frontend.vercel.app

LOG_CHANNEL=stderr
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

RUN_MIGRATIONS=true
```

Generate `APP_KEY` locally with:

```bash
php artisan key:generate --show
```

After the first successful migration, you can set `RUN_MIGRATIONS=false` if you
prefer running migrations manually.

## Uploaded Images

Listings use Laravel's local `public` storage disk. On container hosts, local
files can disappear after redeploys unless you attach persistent storage.

Use one of these before accepting real uploads:

- Attach a persistent volume/disk mounted at `/var/www/html/storage/app/public`.
- Or update the app to store listing images on S3-compatible storage.

## Railway

Create a backend service from this repository and set the service root directory
to `backend`. Railway will use the `Dockerfile` in that root directory.

Add a MySQL database service, then copy its connection values into the Laravel
`DB_*` variables above. Generate a public domain for the backend service, then
use that URL as `APP_URL`.

## Render

The repository includes a root-level `render.yaml` Blueprint that creates:

- A free Docker web service for `backend`
- A free Render Postgres database

Render's free Postgres database expires after 30 days, so this is suitable for
testing and demos, not permanent production data.

Create a new Blueprint from this repository, then fill in the prompted values:

```env
APP_KEY=base64:...
APP_URL=https://your-backend-name.onrender.com
FRONTEND_URL=https://your-vercel-frontend.vercel.app
CORS_ALLOWED_ORIGINS=https://your-vercel-frontend.vercel.app
SANCTUM_STATEFUL_DOMAINS=your-vercel-frontend.vercel.app
```

Or create a Docker web service manually with:

- Dockerfile path: `backend/Dockerfile`
- Docker context: `backend`

The container listens on the `PORT` environment variable, which Render provides
for web services.

If you create the database manually on Render, use Render Postgres and set:

```env
DB_CONNECTION=pgsql
DATABASE_URL=<Render internal database URL>
```

## Vercel Frontend

After the backend deploys, update the frontend Vercel environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.example
```

Redeploy the frontend after changing that value.
