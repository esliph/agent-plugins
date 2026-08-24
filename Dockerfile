FROM node:24-alpine

RUN apk add --no-cache git bash

WORKDIR /app
RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node
ENV LIVING_DOCS_ROOT=/app
CMD ["sleep", "infinity"]
