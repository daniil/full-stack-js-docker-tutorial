FROM node:14-alpine as base

WORKDIR /src
COPY package*.json ./
EXPOSE 5050

FROM base as production
ENV NODE_ENV=production
RUN npm ci
COPY ./ ./
CMD ["node", "app"]

FROM base as dev
ENV NODE_ENV=development
RUN npm install -g nodemon && npm install
COPY ./ ./
CMD ["nodemon", "app"]