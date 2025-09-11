# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copiar package files
COPY package*.json ./
# Instalar Angular CLI globalmente
RUN npm install -g @angular/cli
# Instalar dependencias del proyecto
RUN npm install

# Copiar código fuente
COPY . .

# Build con Angular CLI
RUN ng build --configuration=production

# Stage 1: Production server
FROM nginx:alpine AS production

# Copiar aplicación construida - verifica la estructura exacta
COPY --from=build /app/dist/front-gestor-turnos/browser /usr/share/nginx/html

# Configuración de Nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
