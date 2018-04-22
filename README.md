# docker-mongo-auth

A Docker image for MongoDB to easily enable authentication, set the root user/password, and to optionally create one or more databases with unique usernames and passwords on first launch.

- Uses the built-in, [(poorly documented)](https://github.com/docker-library/mongo/blob/master/3.4/docker-entrypoint.sh#L185) auth init routines from the [official Mongo docker image](https://hub.docker.com/_/mongo/)
- Flexible for use with `docker run`, `compose`, and/or as part of a `swarm`.
- Specify root username+password with `ENV` variables or Docker secrets
- Specify DB configurations within a JSON file which can either be embedded in the image, added in a bind volume, or put into a Docker secret

By default, this image builds from `mongo:latest`  To use a different `mongo:tag`, you will need build your own image.

## Build

### Latest version of Mongo

      docker build --tag docker-mongo-auth:latest .

### Specify a tagged version of Mongo

      docker build --tag docker-mongo-auth:3.4.14 --build-arg TAG=3.4.14 .

## Usage examples

### With `docker run`

      docker run \
        -v "/local/folder/containing/configDotJson:/tmp/mongo-auth:ro" \
        -v mongo-config:/data/configdb \
        -v mongo-data:/data/db \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=P@$$w0rd123 \
        docker-mongo-auth:latest

### With Docker `compose` file using `ENV`

      version: "3.6"
      services:
        mongo:
          environment:
            - MONGO_INITDB_ROOT_USERNAME=admin
            - MONGO_INITDB_ROOT_PASSWORD=P@$$w0rd123
          command: mongod
          image: 'yourDockerHub/docker-mongo-auth:tag'
          ports:
            - target: 27017
              published: 27017
          volumes:
            - mongo-data:/data/db
            - mongo-config:/data/configdb
          networks:
            - backend
          deploy:
            restart_policy:
              condition: any
      networks:
        backend:
      volumes:
        mongo-data:
        mongo-config:

### With Docker `compose` file using [secrets](https://docs.docker.com/engine/swarm/secrets/)

      version: "3.6"
      services:
        mongo:
          environment:
            - MONGO_INITDB_ROOT_USERNAME_FILE=/run/secrets/mongo_admin_user
            - MONGO_INITDB_ROOT_PASSWORD_FILE=/run/secrets/mongo_admin_password
          command: mongod
          image: 'yourDockerHub/docker-mongo-auth:tag'
          ports:
            - target: 27017
              published: 27017
          volumes:
            - mongo-data:/data
            - mongo-config:/data/configdb
          networks:
            - backend
          deploy:
            restart_policy:
              condition: any
          secrets:
            - mongo_admin_password
            - mongo_admin_user
      networks:
        backend:
      volumes:
        mongo-data:
        mongo-config:
      secrets:
        mongo_admin_user:
          external: true
        mongo_admin_password:
          external: true

## Configure database users

On first launch, the official Mongo image's entrypoint script will run `setup.js` which looks for a Docker secret called `mongo_config`, or a `config.json` file if the secret doesn't exist.

To configure database users, create a `config.json` file with your configuration.

You can either:

- Leave your customized config file in the image you build
- Put it in an external directory which you bind mount into the container as `/tmp/mongo-auth` (see `docker run` example above)
- Create the `mongo_config` secret containing the JSON like this:

      # docker secret create mongo_config /path/to/your/config.json

### Config Properties

- `dbs` : array of db config objects
- `name` : db name
- `user` : db user
- `pass`: db user's password
- `roles`: array of Mongo user roles

### Example - will create dev, test and prod DBs with unique usernames/passwords

    {
      "dbs": [
        {
          "name": "dev-db",
          "user": "devDbUser",
          "pass": "devP@ssw0rd!",
          "roles": ["readWrite"]
        },
        {
          "name": "test-db",
          "user": "testDbUser",
          "pass": "testP@SSword123",
          "roles": ["readWrite"]
        },
        {
          "name": "prod-db",
          "user": "prodDbUser",
          "pass": "prodPa$Sw0rd_!",
          "roles": ["readWrite"]
        }
      ]
    }

## **Important Notes**

1. By default, `setup.js` attempts to delete the `config.json` file once it has initialized the databases to avoid leaving plain-text secrets on a production node.

    If you are working in development and have your config file in a bind volume, **be sure to configure the volume as read-only to avoid having your local copy deleted** (see `docker run` example above).

1. The mongo image will only run the init script one time, only if [there's no evidence](https://github.com/docker-library/mongo/blob/master/3.4/docker-entrypoint.sh#L212) that mongo has already been initialized.  So, if you're working in development, you may need to occasionally `docker volume rm` to be able to re-init your DBs. The usage examples provided here explicitly name the mongo volumes to make them easier to find for this purpose.
