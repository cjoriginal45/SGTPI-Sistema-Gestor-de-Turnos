# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build --configuration=production

# Stage 1: Production server
FROM nginx:alpine AS production

# Copy built application
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

# Copy custom nginx config (opcional pero recomendado)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check (opcional pero recomendado)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
