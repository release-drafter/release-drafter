FROM node:10.10.0-alpine@sha256:1e7d71edcd8088bd81a828a6ea6d8be6dbf92039bbd9e2ecf2eb76abd295f832
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
