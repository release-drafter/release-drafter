FROM node:10.10.0-alpine@sha256:047cc73153862a7f9cf38f4a5897264d66ba975c68f2ec7d9b5f7a63ac7ff749
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
