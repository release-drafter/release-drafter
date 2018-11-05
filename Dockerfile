FROM node:10.13.0-alpine@sha256:5ba2248f02abf173f0fb2bd6f84fca7f3616496c50c9333cdd362314ec2970d9
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
