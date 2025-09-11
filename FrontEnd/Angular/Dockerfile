# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./

# Cache para npm - con ID único
RUN --mount=type=cache,target=/root/.npm,id=npm_cache \
    npm ci --no-audit --prefer-offline

# Copiar código fuente
COPY src/ ./src/

# Cache para build de Angular - con ID único
RUN --mount=type=cache,target=/app/node_modules/.cache,id=angular_build_cache \
    npm run build -- --configuration=production

# Stage 1: Production server
FROM nginx:alpine AS production

# Copiar aplicación construida
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
