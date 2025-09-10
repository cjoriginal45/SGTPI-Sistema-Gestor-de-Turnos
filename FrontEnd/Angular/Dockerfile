# Stage 0: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --configuration production

# Stage 1: Servir con Nginx
FROM nginx:alpine AS production

COPY --from=build /app/dist/front-gestor-turnos /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
