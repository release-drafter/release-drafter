FROM node:10-alpine@sha256:c30b9a5bb5faba796d4df5c74310702e25bcca227786310dae9b5a08498b5e4a
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]