# Stage 1: Solo sirve los archivos compilados
FROM nginx:alpine AS production

# Copiamos los archivos ya compilados de Angular
# Asegurate de haber hecho `ng build --configuration production` localmente
COPY ./dist/front-gestor-turnos /usr/share/nginx/html

# Opcional: copiar configuración personalizada de Nginx
# COPY nginx.conf /etc/nginx/nginx.conf

# Exponemos el puerto
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
