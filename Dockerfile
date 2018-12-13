FROM node:10.14.2-alpine@sha256:eaa9b6df8aec77419a73d3ec7ec7d43ae9401ecc0358c908d18c831de7d03567
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
