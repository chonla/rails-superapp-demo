# syntax=docker/dockerfile:1

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV PORT=3002
EXPOSE 3002

CMD ["npm", "start"]
