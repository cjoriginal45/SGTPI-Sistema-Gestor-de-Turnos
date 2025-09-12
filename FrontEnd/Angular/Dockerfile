# --------
# Stage 0: Build Angular app (SPA) con pnpm
# --------
FROM node:20-alpine AS build

# Instalar herramientas necesarias para dependencias nativas
RUN apk add --no-cache python3 make g++

# Instalar pnpm globalmente
RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos esenciales primero para aprovechar cache
COPY package.json pnpm-lock.yaml angular.json tsconfig*.json ./

# Instalar dependencias usando pnpm (mucho más rápido que npm)
RUN pnpm install --frozen-lockfile --prefer-offline --reporter=silent

# Copiar el resto del proyecto
COPY . .

# Compilar Angular en modo producción (SPA, sin SSR)
RUN pnpm build -- --configuration production --progress=false

# --------
# Stage 1: Servir con Nginx
# --------
FROM nginx:stable-alpine AS production

# Borrar config por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar la app compilada al servidor nginx
COPY --from=build /app/dist/front-gestor-turnos /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
