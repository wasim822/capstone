# Capstone Full Stack Application

A full-stack capstone project with:

- Frontend: Next.js 16 + React 19 + MUI
- Backend: Node.js + TypeScript + Express + TypeORM
- Database: MariaDB
- Containerization: Docker + Docker Compose

## Repository Structure

```
.
|-- capstone_backend/
|-- capstone_frontend/
|-- mysql/
|   `-- init/
`-- docker-compose.yml
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (recommended for full stack run)

## Quick Start (Docker, Recommended)

From the project root:

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- MariaDB: localhost:3307 (inside Docker network uses port 3306)

Stop services:

```bash
docker compose down
```

Stop and remove volumes (fresh DB state):

```bash
docker compose down -v
```

## Environment Variables

### Backend (`capstone_backend/.env.docker`)

Used by Docker Compose backend service:

- `NODE_ENV`
- `PORT`
- `DB_TYPE`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SYNCHRONIZE`
- `CORS_ORIGINS`

### Frontend (`capstone_frontend/.env.docker`)

- `NEXT_PUBLIC_API_BASE_URL`
- `GITHUB_TOKEN`
- `NEXT_PUBLIC_SMART_ORDERING_MOCK`
- `INTERNAL_API_BASE_URL`

## Local Development (Without Docker)

### 1. Start Database

Run MariaDB locally or with Docker.

If using Docker DB only:

```bash
docker compose up db -d
```

### 2. Run Backend

```bash
cd capstone_backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### 3. Run Frontend

In a new terminal:

```bash
cd capstone_frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## Build Commands

### Backend

```bash
cd capstone_backend
npm run build
npm start
```

### Frontend

```bash
cd capstone_frontend
npm run build
npm start
```

## Common Issues

- Port already in use:
  - Change host ports in `docker-compose.yml` or stop the process using the port.
- Frontend cannot reach backend:
  - Verify `NEXT_PUBLIC_API_BASE_URL` and that backend is running on port 4000.
- Database connection fails:
  - Check backend DB env values and ensure `db` service is healthy in Docker Compose.

## Git Notes

This repository tracks the full source tree from one root Git repository.

Recommended ignores (already configured in backend):

- `.env*` files
- `logs/` and `*.log`
- `node_modules/`
- build output directories (`dist/`, `.next/`)

## License

 MIT
