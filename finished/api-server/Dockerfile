FROM node:16-alpine as base

WORKDIR /src
COPY package*.json ./
ARG API_PORT
ENV PORT=${API_PORT}
EXPOSE ${API_PORT}

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