FROM node:10.15.3-alpine@sha256:217ffdf869f094c8ba5bbd505ab51e13d6a7616ad999a5b740a3bb5f0490f2f3
WORKDIR /src
ADD     yarn.lock package.json /src/
RUN     yarn
ADD     . /src
CMD     ["npm", "start"]
