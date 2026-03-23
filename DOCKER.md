# Docker Setup Guide for Micro-Security Gateway

## Overview

This guide explains how to run the Micro-Security Gateway Dashboard UI using Docker Compose.

**Important Architecture Note:**
- **Dashboard UI**: Runs in Docker (Next.js 15)
- **Gateway API**: Runs on host machine via `wrangler dev` (Cloudflare Workers runtime)

**Why this hybrid approach?**
Cloudflare Workers cannot run in Docker containers directly because they require:
- Cloudflare's edge runtime environment
- Specific Workers APIs (Request, Response, FetchEvent, etc.)
- D1 database bindings
- KV namespace bindings

For local development, `wrangler dev` simulates the Cloudflare Workers environment with full API compatibility.

---

## Prerequisites

### Required Software
- **Docker Desktop** (Mac/Windows) or **Docker Engine** (Linux)
  - Download: https://www.docker.com/products/docker-desktop/
- **Docker Compose** (included with Docker Desktop)
- **Node.js 18+** and **npm** (for Gateway API)
- **Git** (for cloning repository)

### Verify Installation
```bash
docker --version          # Should be 20.10+
docker-compose --version  # Should be 2.0+
node --version           # Should be 18+
npm --version
```

---

## Quick Start (5 minutes)

### 1. Clone Repository
```bash
git clone https://github.com/dongvannhan1000/micro-gateway.git
cd micro-gateway
```

### 2. Configure Environment
```bash
# Copy Docker environment template
cp apps/dashboard-ui/.env.docker apps/dashboard-ui/.env

# Edit with your Supabase credentials
nano apps/dashboard-ui/.env
```

**Required environment variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_GATEWAY_URL=http://host.docker.internal:8787
NEXT_PUBLIC_APP_NAME=Micro-Security Gateway
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Gateway API (Host Machine)
```bash
# Terminal 1: Run Gateway API on host
npm run dev:gateway
```

The Gateway API will start on `http://localhost:8787`

### 4. Start Dashboard UI (Docker)
```bash
# Terminal 2: Run Dashboard UI in Docker
docker-compose up dashboard
```

The Dashboard UI will start on `http://localhost:3000`

### 5. Access Your Gateway
- **Dashboard UI**: http://localhost:3000
- **Gateway API**: http://localhost:8787

---

## Docker Compose Configuration

### Services

#### Dashboard Service
```yaml
dashboard:
  build:
    context: .
    dockerfile: apps/dashboard-ui/Dockerfile
  ports:
    - "3000:3000"
  environment:
    - NODE_ENV=development
    - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
    - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    - NEXT_PUBLIC_GATEWAY_URL=http://host.docker.internal:8787
  volumes:
    - ./apps/dashboard-ui/src:/app/src:ro
    - ./apps/dashboard-ui/public:/app/public:ro
  healthcheck:
    test: ["CMD", "wget", "--spider", "http://localhost:3000"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Key Features
- **Hot-reload**: Source code mounted as read-only volumes
- **Health checks**: Automatic container health monitoring
- **Host networking**: Dashboard communicates with Gateway on host machine
- **Environment isolation**: Separate `.env` for Docker configuration

---

## Dockerfiles

### Development Dockerfile (`apps/dashboard-ui/Dockerfile`)
```dockerfile
FROM node:20-alpine

# Install utilities for health checks
RUN apk add --no-cache bash wget

WORKDIR /app

# Install all dependencies (including dev dependencies)
COPY package*.json ./
RUN npm ci

# Copy source code and config
COPY src ./src
COPY public ./public
COPY next.config.ts tsconfig.json postcss.config.mjs ./

EXPOSE 3000

# Start development server with hot-reload
CMD ["npm", "run", "dev"]
```

### Production Dockerfile (`apps/dashboard-ui/Dockerfile.prod`)
```dockerfile
# Multi-stage build for optimized production image
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
RUN apk add --no-cache bash wget

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
```

---

## Common Docker Commands

### Development Mode
```bash
# Start dashboard (with hot-reload)
docker-compose up dashboard

# Start in background
docker-compose up -d dashboard

# View logs
docker-compose logs -f dashboard

# Stop dashboard
docker-compose down
```

### Production Mode
```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Run production container
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Maintenance
```bash
# Rebuild after dependency changes
docker-compose build --no-cache dashboard

# Remove containers and volumes
docker-compose down -v

# Check container health
docker-compose ps

# Execute command in container
docker-compose exec dashboard sh
```

---

## Networking Architecture

### Host.docker.internal
The Dashboard UI uses `host.docker.internal` to communicate with the Gateway API running on the host machine.

**How it works:**
- Docker container → `host.docker.internal:8787` → Host machine → Gateway API
- This allows the containerized Dashboard to reach services running on the host

**Platform support:**
- **Docker Desktop (Mac/Windows)**: Built-in support
- **Linux**: Requires `--add-host=host.docker.internal:host-gateway` (already in docker-compose.yml)

---

## Troubleshooting

### Dashboard cannot reach Gateway API

**Symptom:** Dashboard shows "Cannot connect to Gateway API"

**Solution:**
1. Verify Gateway is running on host: `curl http://localhost:8787`
2. Check `host.docker.internal` resolves from container:
   ```bash
   docker-compose exec dashboard nslookup host.docker.internal
   ```
3. Ensure port 8787 is not blocked by firewall
4. Check Gateway logs for errors

### Hot-reload not working

**Symptom:** Code changes don't reflect in Dashboard

**Solution:**
1. Verify volumes are mounted: `docker-compose exec dashboard ls -la /app/src`
2. Check file permissions: `ls -la apps/dashboard-ui/src/`
3. Restart container: `docker-compose restart dashboard`
4. On Windows, ensure WSL 2 is enabled in Docker Desktop

### Container won't start

**Symptom:** `docker-compose up` fails immediately

**Solution:**
1. Check port 3000 is available: `lsof -i :3000` (Mac/Linux) or `netstat -ano | findstr :3000` (Windows)
2. Build with no cache: `docker-compose build --no-cache`
3. Check build logs: `docker-compose build dashboard 2>&1 | tail -50`
4. Verify Node.js version compatibility (must be 18+)

### Health check failing

**Symptom:** Container shows "unhealthy" status

**Solution:**
1. Check Next.js started successfully: `docker-compose logs dashboard`
2. Manually test health endpoint: `docker-compose exec dashboard wget -O- http://localhost:3000`
3. Increase health check start_period in docker-compose.yml
4. Verify all dependencies installed: `docker-compose exec dashboard npm list`

### Build fails with "Module not found"

**Symptom:** Error during `docker-compose build`

**Solution:**
1. Clear Docker cache: `docker system prune -a`
2. Rebuild with no cache: `docker-compose build --no-cache`
3. Check package.json exists in correct location
4. Verify Node.js version in Dockerfile (should be 20-alpine)

---

## Production Deployment

### Docker Compose Production
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard-ui/Dockerfile.prod
    container_name: ms-gateway-dashboard-prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_GATEWAY_URL=${NEXT_PUBLIC_GATEWAY_URL}
      - NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - ms-gateway-network

networks:
  ms-gateway-network:
    driver: bridge
```

### Deploy to Production
```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start production container
docker-compose -f docker-compose.prod.yml up -d

# Verify health
docker-compose -f docker-compose.prod.yml ps
```

---

## Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use Docker secrets for sensitive data in production
- Rotate `NEXT_PUBLIC_SUPABASE_ANON_KEY` regularly

### Container Security
- Run as non-root user (production Dockerfile)
- Use read-only root filesystem: `read_only: true`
- Set resource limits: `deploy.resources.limits`
- Scan images for vulnerabilities: `docker scan`

### Network Security
- Use dedicated Docker network
- Restrict container communication with firewall rules
- Enable TLS/SSL for production (use reverse proxy like nginx)

---

## Performance Optimization

### Build Optimization
```yaml
# Use BuildKit for faster builds
syntax: docker/dockerfile:1.4

# Cache dependencies
RUN --mount=type=cache,target=/root/.npm npm ci
```

### Runtime Optimization
```yaml
# Resource limits
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

### Image Size Reduction
- Use `alpine` base images
- Multi-stage builds for production
- Remove development dependencies in production
- Clean up package manager cache

---

## Alternative: Full Docker Setup (Advanced)

If you need both Gateway and Dashboard in Docker (not recommended due to Cloudflare Workers limitations), you would need to:

1. **Replace Cloudflare Workers** with a Node.js/Hono.js server
2. **Replace D1 database** with PostgreSQL or MySQL
3. **Replace KV cache** with Redis
4. **Rewrite middleware** for standard Node.js runtime

This approach loses the benefits of Cloudflare's edge computing and requires significant refactoring.

**Recommendation:** Use the hybrid approach (Dashboard in Docker, Gateway via wrangler dev) for local development.

---

## Further Reading

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Deployment with Docker](https://nextjs.org/docs/deployment#docker-image)
- [Cloudflare Workers Local Development](https://developers.cloudflare.com/workers/wrangler/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/dongvannhan1000/micro-gateway/issues
- **Email**: nhandong0205@gmail.com

---

**Last Updated:** 2026-03-22
