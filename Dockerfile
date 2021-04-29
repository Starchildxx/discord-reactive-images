# Stage 1: Build static site
FROM node:15-alpine
WORKDIR /app

# Install dependencies for node-gyp compiling
RUN apk add --no-cache vips-dev make g++

# Copy package files and install deps
COPY package.json yarn.lock ./
RUN yarn install --silent

# Copy the source files and generate the static project files
COPY . .
RUN yarn build

CMD yarn start
