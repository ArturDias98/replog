FROM node:25-alpine3.22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p src/environments && \
    printf 'const w = typeof window !== "undefined" ? (window as any) : {};\n\nexport const environment = {\n    get googleClientId(): string { return w.__env?.googleClientId ?? ""; },\n    get apiBaseUrl(): string { return w.__env?.apiBaseUrl ?? ""; },\n};\n' \
    > src/environments/environment.ts
RUN npm run build --production

FROM nginx:1.29.8
COPY --from=build /app/dist/code/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
