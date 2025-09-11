# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

# Enable buildkit cache for npm
RUN --mount=type=cache,target=/root/.npm \
    npm config set cache /root/.npm

# Copy package files
COPY package*.json ./

# Install dependencies with cache
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --prefer-offline

# Copy source code
COPY . .

# Build with cache
RUN --mount=type=cache,target=/app/node_modules/.cache \
    npm run build -- --configuration=production

# Stage 1: Production server
FROM nginx:alpine AS production

COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
