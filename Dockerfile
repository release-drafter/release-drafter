FROM node:10.14.2-alpine@sha256:46b2488c02dc82c801eaebc775019262e100af290dd06d61201a8dd53f78c022
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
