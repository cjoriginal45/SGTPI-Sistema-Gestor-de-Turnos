# --------
# Stage 0: Build Angular app (SPA) con pnpm
# --------
FROM node:20-alpine AS build

# Instalar herramientas necesarias para dependencias nativas
RUN apk add --no-cache python3 make g++

# Instalar pnpm globalmente
RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos esenciales para aprovechar cache de Docker
COPY package.json angular.json tsconfig*.json ./
RUN pnpm install --prefer-offline --reporter=silent

# Copiar el resto del proyecto
COPY . .

# Compilar Angular en modo producción (SPA, sin SSR)
RUN pnpm build

# --------
# Stage 1: Servir con Nginx
# --------
FROM nginx:stable-alpine AS production

# Instalar envsubst
RUN apk add --no-cache gettext

# Crear carpeta de templates (por si no existe)
RUN mkdir -p /etc/nginx/templates

# Borrar configuración por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar la app compilada al servidor Nginx
COPY --from=build /app/dist/front-gestor-turnos /usr/share/nginx/html

# Copiar plantilla de configuración de Nginx
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

# Reemplazar $PORT con la variable de Railway y arrancar Nginx
CMD envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
