# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copiar solo archivos esenciales para cache de dependencias
COPY package*.json ./
COPY angular.json ./
COPY tsconfig*.json ./

# Instalar dependencias optimizado
RUN npm ci --no-audit --prefer-offline --silent

# Copiar código fuente
COPY src/ ./src/

# Build de producción
RUN npm run build -- --configuration=production --progress=false

# Stage 1: Production server
FROM nginx:alpine AS production

# Copiar aplicación construida
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
