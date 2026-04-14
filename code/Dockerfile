FROM node:25-alpine3.22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build --production

FROM nginx:1.29.8
COPY --from=build /app/dist/code/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
