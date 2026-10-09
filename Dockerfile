FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js config.example.js /usr/share/nginx/html/
RUN cp /usr/share/nginx/html/config.example.js /usr/share/nginx/html/config.js

EXPOSE 80
