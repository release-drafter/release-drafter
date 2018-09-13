FROM node:10.10.0-alpine@sha256:565dfb5f10143efd5f4c9df75a63d765adcd14b150fc61e5c1d54d70cb006e86
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
