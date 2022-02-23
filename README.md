# Full-Stack JS Docker Tutorial

Docker is a great way to provide consistent development environments. It allows us to set up required services, app dependencies, and configuration by keeping all of our application setup information in code instead of relying on the know-how or potentially outdated documentation. It also allows us to set up things so that we can develop locally and start our dependencies with one Docker command.

Essentially, using Docker we can "containerize" our applications which will make it behave the same regardless of the platform on which it is run - simplifying development and deployment.

## Docker Installation

Easiest way to install Docker is to use Docker Desktop, which comes as an installer for [Mac](https://download.docker.com/mac/stable/Docker.dmg) or [Windows](https://download.docker.com/win/stable/Docker%20Desktop%20Installer.exe).

## Dockerfile

Dockerfile is a blueprint on which the Docker image is built. When the built image is running, it is called a container.

Here is the Dockerfile for our api-server:

```Dockerfile
# Using Docker Node Alpine LTS image (skinny version of node)
# Also specifying a base stage for multi-stage build
FROM node:14-alpine as base

# Sets the context for subsequent RUN commands
WORKDIR /src
# Copy package.json and package-lock.json files 
COPY package*.json /src
# Exposing the port on the container
EXPOSE 5050

# Extends from base stage
FROM base as production
# Setting the environment to production to speed up performance of the build
ENV NODE_ENV=production
# npm ci installs from package-lock.json for a deterministic build
RUN npm ci
# Copy app code to /src, our workdir
COPY . /src
# Run the server
CMD ["node", "app"]

# Development specific setup
FROM base as dev
ENV NODE_ENV=development
RUN npm install -g nodemon && npm install
COPY . /src
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

And then we can run it as a container:

```
docker run --rm -p 5050:5050 --name blog-api api-server
```

At this point you should be able to see the server if you make a request to http://localhost:5050 as well as see the container running in Docker Desktop.

## Docker Compose

By now we have most of the things we need to run our Express app with Docker. But even at this point the commands to run our application are getting long and hard to remember.

Docker comes pre-installed with a tool called Docker Compose which allows us to run multiple containers much easier by using a couple of simple CLI commands and leaving the parameters configuration to code.

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
    # Copy and sync changes from the api-server directory with src on the Docker container, ie: hot reload 
    volumes:
      - ./api-server:/src
    # Starting the service
    command: npm run start:dev
    # Exposing ports
    ports:
      - "5050:5050"
    # Environment variables
    environment:
      NODE_ENV: development
      DEBUG: api-server:*
```

To build our image we run an optimized build using [BuildKit](https://docs.docker.com/develop/develop-images/build_enhancements/):

```
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

And then run our image:

```
docker-compose up
```

## Data Persistence

By default the files created inside a container will not persiste when that container no longer exists and it can be difficult to get the data out of the container for another process.

To persist data for Docker containers we have two options: *volumes* and *bind mounts*.

The preferred way majority of the time is to create a volume which can be done using `docker volume create` command or during container creation. Volumes are stored on the host machine and can then be mounted into containers. Volumes can be **named** or **anonymous**.

There are many [good use cases](https://docs.docker.com/storage/#good-use-cases-for-volumes) for volumes but generally they are used for data persistence, Databases being one of the use cases.