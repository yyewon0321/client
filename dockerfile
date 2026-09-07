FROM node:18-alpine AS build
WORKDIR /app
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# FROM nginx:alpine
# RUN rm -f /etc/nginx/conf.d/default.conf
# COPY --from=build /app/build /usr/share/nginx/html
# COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]