# Development Dockerfile for Dashboard UI
# This runs Next.js in development mode with hot-reload

FROM node:20-alpine

# Install bash and wget for health checks
RUN apk add --no-cache bash wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for hot-reload)
RUN npm ci

# Copy Next.js and Tailwind config files
COPY next.config.ts next-env.d.ts tsconfig.json postcss.config.mjs ./

# Copy tailwind config if it exists
COPY tailwind.config.js* ./

# Copy source code
COPY src ./src
COPY public ./public

# Expose Next.js default port
EXPOSE 3000

# Start development server with hot-reload
# Note: --turbopack is used for faster development builds
CMD ["npm", "run", "dev"]
