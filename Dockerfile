FROM node:10.14.0-alpine@sha256:b3e157beaf4f780f6e6ed058a438989afb0e5174b812c089e731b9f75b4db416
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
