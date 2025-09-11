# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copiar solo los archivos necesarios para instalar dependencias
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./
COPY src/ ./src/

# Instalar dependencias con cache optimizada
RUN npm ci --no-audit --prefer-offline

# Build de producción
RUN npm run build -- --configuration=production

# Stage 1: Production server
FROM nginx:alpine AS production

# Copiar aplicación construida
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
