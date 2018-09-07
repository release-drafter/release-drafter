FROM node:10.9.0-alpine@sha256:a4212307484e6b662806a538ec6352182aaf8b4b748644aaa7f6e87bda159097
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
