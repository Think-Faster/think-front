FROM node:22-alpine AS build

WORKDIR /app

COPY app/package*.json ./

RUN npm ci

COPY app/ .

RUN npm run build


FROM nginx:1.29-alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]