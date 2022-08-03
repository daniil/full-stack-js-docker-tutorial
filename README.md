# Full-Stack JS Docker Tutorial

## Tutorial Purpose

This tutorial will create a Docker Compose pipeline including React Front End, Express API Backend, NGINX Reverse Proxy Server for React and Express services, MySQL Database and admin interface for MySQL.

This is going to be a development environment with hot-reload of React and Express servers, with potential to be expanded to a production environment.

The repository contains the finished version of the tutorial as well as starter code if you want to follow it step-by-step yourself.

## What is Docker?

Docker is a great way to provide consistent development environments. It allows us to set up required services, app dependencies, and configuration by keeping all of our application setup information in code instead of relying on the know-how or potentially outdated documentation. It also allows us to set up things so that we can develop locally and start our dependencies with one Docker command.

Essentially, using Docker we can "containerize" our applications which will make it behave the same regardless of the platform on which it is run - simplifying development and deployment.

## Docker Installation

Easiest way to install Docker is to use Docker Desktop, which comes as an installer for [Mac](https://docs.docker.com/desktop/install/mac-install/) or [Windows](https://docs.docker.com/desktop/install/windows-install/).

## Dockerfile

Dockerfile is a blueprint on which the Docker image is built. When the built image is running, it is called a container.

Dockerfile usually contains the environment setup for one or several apps, ie: server software, copying app files, installing dependencies, running the app.

Here is the `Dockerfile` for our api-server:

```Dockerfile
# Using Docker Node Alpine LTS image (skinny version of node)
# Also specifying a base stage for multi-stage build
FROM node:16-alpine as base

# Sets the context for subsequent RUN commands
WORKDIR /src
# Copy package.json and package-lock.json files 
COPY package*.json ./
# Exposing the port on the container
EXPOSE 5050

# Extends from base stage
FROM base as production
# Setting the environment to production to speed up performance of the build
ENV NODE_ENV=production
# npm ci installs from package-lock.json for a deterministic build
RUN npm ci
# Copy app code to /src, our workdir
COPY ./ ./
# Run the server
CMD ["node", "app"]

# Development specific setup
FROM base as dev
ENV NODE_ENV=development
RUN npm install -g nodemon && npm install
COPY ./ ./
CMD ["nodemon", "app"]
```

## .dockerignore

Similar to `.gitignore` it is advisable to add a `.dockerignore` file when using Docker, which allows us to ignore files we don't want to land in our Docker image. It helps to keep the Docker image small and keep the build cache more efficient.

```dockerignore
.git
node_modules
```

## Running Our Application in Docker

At this point we can run our api-server application as a Docker container.

First we need to build our image:

```
docker build -t api-server .
```

> `-t` flag: Name of the container

And then we can run it as a container:

```
docker run --rm -p 5050:5050 --name blog-api api-server
```

> `--rm` flag: Clean up the container after it exits
> `-p` flag: Expose host:container ports

At this point you should be able to see the server if you make a request to http://localhost:5050 as well as see the container running in Docker Desktop.

You will also notice that currently the hot-reload of the server doesn't actually work, and any changes you make would require a re-build and re-run of the container. Next steps will fix that and make things more manageable.

## Docker Compose

By now we have most of the things we need to run our Express app with Docker. But even at this point the commands to run our application are getting long and hard to remember.

Docker comes pre-installed with a tool called Docker Compose which allows us to run multiple containers with more ease by using a couple of simpler CLI commands and leaving the parameters configuration to code.

We start by creating a `docker-compose.yml` file in the root folder with the following contents:

```yaml
# Current latest version of Docker Compose
version: '3.8'
# Specifying services we are using
services:
  api:
    # Build context: api-server directory and dev stage build parameter
    build:
      context: ./api-server
      target: dev
    # Copy and sync changes from the api-server directory with src on the Docker container, ie: hot reload. Also copy the node_modules to container.
    volumes:
      - ./api-server:/src
      - /src/node_modules
    # Starting the service
    command: npm run start:dev
    # Exposing ports
    ports:
      - "5050:5050"
    # Environment variables
    environment:
      NODE_ENV: development
```

To build our image we run an optimized build using [BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/). Run this command in the root folder of the project:

```
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

And then run our image:

```
docker-compose up
```

> If you get `EPERM: operation not permitted, open '/src/package.json'` error on macOS, make sure to go to *Security & Privacy* settings and under *Files and Folders* allow Docker access to a folder your application is in.

## Adding Client Application Container

For our React client application, we'll do the same steps, add a `Dockerfile` in the `blog-ui` folder:

```Dockerfile
FROM node:16-alpine

WORKDIR /src
COPY package*.json ./
EXPOSE 3000

COPY ./ ./
RUN npm i
CMD ["npm", "run", "start"]
```

And a `.dockerignore` file:

```dockerignore
.git
node_modules
```

Quick test before we connect it with our other services (make sure to run this inside of `/blog-ui` folder):

```
docker build -t blog-ui .
docker run -it --rm -p 3000:3000 --name blog-ui blog-ui
```

> `-it` flag: Run as interactive process, allocating a tty for container process

You should be able to see your client application running at `http://localhost:3000`.

## Reverse Proxy Service Container

We are now at a point where we can add React app to Docker Compose file as well and then start connecting to our Express server in React app. With both React and Express apps being Docker containers on the same Docker network, we can technically make a request from React to Express via `http://localhost:5050` since it is going to be a browser request.

One thing important to remember about Docker containers is that they run in isolation, which is a good thing, but can be challenging if we need to connect to other services.

For example we can make a request to our API at `http://localhost:5050` from our React container, because it's a browser request. However for something like DB we will need to use the Docker container name instead and in turn Docker will resolve the correct container IP based on the container name. On the other hand, since React applications run in the browser, we won't be able to use API container name like: `http://api:5050` as there is no DNS resolver for that URL. So it's just important to be aware of the context of how you are trying to connect between the containers.

Even though it can work as is, we will take it a step further by creating an NGINX server container that would act as a reverse proxy server and allow us to access both the ui and the api containers and create the necessary routing between the containers. It also makes front-end requests much cleaner as all we will have to write is `/api/...`. 

Here is what a `default.conf` file inside of `nginx` folder looks like:

```nginx
# ui app upstream
upstream ui {
  server ui:3000;
}

# api app upstream
upstream api {
  server api:5050;
}

server {
  listen 80;

  location / {
    # ui is the name of the ui service we will configure in docker-compose
    proxy_pass http://ui;
  }

  # for the ui to make the web sockets connection 
  location /sockjs-node {
      proxy_pass http://ui;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "Upgrade";
  }
  
  # this is what will allow us to use /api/... URLs in our React app
  location /api {
      # /api/anything will redirect to the parameter /$1, which is our endpoint, ie: /posts
      rewrite /api/(.*) /$1 break;
      # api is the name of the api service we will configure in docker-compose
      proxy_pass http://api;
  }
}
```

Here is what `nginx` `Dockerfile` looks like:

```Dockerfile
FROM nginx
COPY ./default.conf /etc/nginx/conf.d/default.conf
```

## Final Docker Compose Config

With Express API, React and NGINX containers done, we can update `docker-compose.yml` to a final version that pulls everything together, and also adds a MySQL DB:

```yaml
version: '3.8'

# Common variables used for MySQL connection
# Get the values from .env file, automatically loaded by Docker
x-common-variables: &common-variables
  MYSQL_DATABASE: $MYSQL_DATABASE
  MYSQL_USER: $MYSQL_USER
  MYSQL_PASSWORD: $MYSQL_PASSWORD

services:
  # MySQL Database Service
  db:
    image: mysql
    restart: always
    cap_add:
      - SYS_NICE
    volumes:
      # Data persistence volume that allows to persist the data between container restarts
      - mysql_data:/var/lib/mysql
      # Initial setup volume that allows us to do initial DB setup from ./api-server/db-setup.sql
      - ./api-server/db-setup.sql:/docker-entrypoint-initdb.d/setup.sql
    ports:
      # Expose 3306 from container as 9906 externally
      - "9906:3306"
    environment:
      # Include the common variables
      <<: *common-variables
      MYSQL_ROOT_PASSWORD: $MYSQL_ROOT_PASSWORD
      MYSQL_HOST: $MYSQL_HOST

  nginx:
    # Starts services in dependency order
    depends_on:
      - api
      - ui
    restart: always
    build:
      dockerfile: Dockerfile
      context: ./nginx
    ports:
      # Expose 80 from container as 8008 externally
      - "8008:80"

  api:
    build:
      context: ./api-server
      target: dev
    depends_on:
      - db
    volumes:
      - ./api-server:/src
      - /src/node_modules
    command: npm run start:dev
    ports:
      - $API_PORT:$API_PORT
    environment:
      <<: *common-variables
      PORT: $API_PORT
      NODE_ENV: development
  
  ui:
    stdin_open: true
    # Fix for hot reload for React apps inside of containers
    environment:
      - CHOKIDAR_USEPOLLING=true
    build:
      context: ./blog-ui
    volumes:
      - ./blog-ui:/src
      - /src/node_modules
    ports:
      - $CLIENT_PORT:$CLIENT_PORT
  
  # An admin interface for MySQL DB
  adminer:
    image: adminer:latest
    restart: unless-stopped
    ports:
      - 8080:8080
    depends_on:
      - db
    environment:
      ADMINER_DEFAULT_SERVER: db

# Data Persistence volumes
volumes:
  mysql_data:
```

We should also update both `api-server` and `blog-ui` Dockerfiles to include environment variables (ensuring that they are provided via `.env` file or as parameters to `docker-compose`).

For `api-server`, instead of `EXPOSE 5050` we can provide:

```Dockerfile
# Argument will be passed from docker-compose (or CLI command)
ARG API_PORT
ENV PORT=${API_PORT}
EXPOSE ${API_PORT}
```

For `blog-ui`, instead of `EXPOSE 3000` we can provide:

```Dockerfile
ARG CLIENT_PORT
ENV PORT=${CLIENT_PORT}
EXPOSE ${CLIENT_PORT}
```

Make sure that you create an `.env` file with the values from `.env.example` file.

With these changes we can start the whole environment back by re-building and starting it:

```
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
docker-compose up
```

You should see in Docker Desktop an application with 5 services running, but if there are any errors, feel free to click on those and you'll be able to see the logs.

Here are all the services that we can test:

- `http://localhost:3000` is the React client
- `http://localhost:5050` is the Express API
- `http://localhost:8008` is the client proxied from NGINX server
- `http://localhost:8080` is the Adminer MySQL admin interface
  - *Server*: "db" 
  - *Username*: "MYSQL_USER"
  - *Password*: "MYSQL_PASSWORD"

Any changes made inside of `/api-server` and `/blog-ui` folders will be automatically updated.

## Data Persistence

By default the files created inside a container will not persist when that container no longer exists and it can be difficult to get the data out of the container for another process.

To persist data for Docker containers we have two options: *volumes* and *bind mounts*.

The preferred way majority of the time is to create a volume which can be done using `docker volume create` command or during container creation. Volumes are stored on the host machine and can then be mounted into containers. Volumes can be **named** or **anonymous**.

There are many [good use cases](https://docs.docker.com/storage/#good-use-cases-for-volumes) for volumes but generally they are used for data persistence, Databases being one of the use cases.

We can see an example of using volumes in our `docker-compose` file, that allows us to persist the data in our MySQL DB (named `mysql_data`).

## Shutting Down

To remove the application you can either use Docker Desktop up or run this command:

```
docker compose down
```

## Next Steps

- Creating a production version of containers for all services

## Additional Resources

- [Build and Dockerize a Full-stack React app with Node.js, MySQL and Nginx](https://www.section.io/engineering-education/build-and-dockerize-a-full-stack-react-app-with-nodejs-and-nginx/)
- [Use Node.js with Docker and Docker Compose to improve DX](https://blog.logrocket.com/node-js-docker-improve-dx/)
- [Docker Compose: React, Node.js, MySQL example](https://www.bezkoder.com/docker-compose-react-nodejs-mysql/)
- [How To Setup Your Local Node.js Development Environment Using Docker](https://www.docker.com/blog/how-to-setup-your-local-node-js-development-environment-using-docker/)
