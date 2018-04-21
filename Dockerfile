ARG TAG=latest
FROM mongo:$TAG

ENV MONGO_AUTH_CONFIG="./config/config.json"

## To set root user/password and enable auth:
##  -Set user/pass values, OR
##  -Set the _FILE vars to read the values from docker secrets, etc
##  -You can set the vars here, in the Docker run command, or in a Docker compose file
##
## To also create DB user(s), modify the config.json file - see comments in setup.js

## specify root user/pass values
# ENV MONGO_INITDB_ROOT_USERNAME=admin
# ENV MONGO_INITDB_ROOT_PASSWORD=P@$$w0rd123

## OR

## specify files containing the user/pass values
# ENV MONGO_INITDB_ROOT_USERNAME_FILE=/run/secrets/mongo_admin_user
# ENV MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_admin_password

RUN mkdir -p /tmp/mongo-auth
WORKDIR /tmp/mongo-auth
ADD ${MONGO_AUTH_CONFIG} config.json

WORKDIR /docker-entrypoint-initdb.d
ADD setup.js setup.js
