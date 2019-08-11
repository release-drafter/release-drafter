FROM node:10.16.2-alpine@sha256:0d5abfc8ef9d0984010a05e234324e517620af096b8aeb2fabc841157ef2e676
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /app
COPY . .
RUN yarn --frozen-lockfile
ENTRYPOINT [ "/app/node_modules/.bin/probot", "receive", "/app/index.js" ]