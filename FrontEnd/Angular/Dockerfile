# --------
# Stage 0: Build Angular app (SPA)
# --------
FROM node:20-alpine AS build

# Instalar herramientas necesarias para dependencias nativas
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar archivos esenciales primero para aprovechar la cache
COPY package*.json angular.json tsconfig*.json ./

# Instalar dependencias
RUN npm ci --no-audit --prefer-offline --silent

# Copiar el resto del proyecto
COPY . .

# Compilar en modo produccion (solo SPA, sin SSR/prerender)
RUN npm run build -- --configuration production --progress=false

# --------
# Stage 1: Servir con Nginx
# --------
FROM nginx:stable-alpine AS production

# Borrar la config por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Copiar la app compilada al servidor nginx
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
