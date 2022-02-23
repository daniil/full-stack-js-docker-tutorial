FROM node:14-alpine

WORKDIR /src
COPY package*.json ./
EXPOSE 3000

COPY ./ ./
RUN npm i
CMD ["npm", "run", "start"]