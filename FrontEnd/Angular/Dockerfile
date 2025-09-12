# --------
# Stage 0: Build Angular app
# --------
FROM node:20-alpine AS build

# Instalar dependencias necesarias para compilar (node-gyp, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar solo archivos esenciales primero (para usar cache de Docker)
COPY package*.json angular.json tsconfig*.json ./

# Instalar dependencias usando cache de npm
RUN npm ci --no-audit --prefer-offline --silent

# Copiar código fuente
COPY src ./src

# Compilar en modo producción
RUN npm run build -- --configuration production --progress=false

# --------
# Stage 1: Servir con Nginx
# --------
FROM nginx:alpine AS production

# Copiar la build de Angular
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

# Eliminar archivos default de nginx y agregar tu configuración básica
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
