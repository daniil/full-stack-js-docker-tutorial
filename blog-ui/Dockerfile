FROM node:14-alpine

WORKDIR /src
COPY package*.json ./
ARG CLIENT_PORT
ENV PORT=${CLIENT_PORT}
EXPOSE ${CLIENT_PORT}

COPY ./ ./
RUN npm i
CMD ["npm", "run", "start"]