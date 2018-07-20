FROM node:10-alpine@sha256:91aabb2c118b03a5d8fd22efd07530a64309dcd41a8a11b83237edd8de3d00c2
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]