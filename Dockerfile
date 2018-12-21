FROM node:10.14.2-alpine@sha256:4ad088670da3d48f0e3604a452e1aaeab565f46333f72cbf22272266c4446941
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
