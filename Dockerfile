FROM node:10-alpine@sha256:962dc023d8598778df81a1a52719bd4ed7f341661742330bfdc72ca8241e58d6
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]