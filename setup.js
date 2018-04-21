/*
  The mongo docker image will run this script the first time it runs (only once)

  To use docker secrets instead of embedding the config file in the image, copy the config.json
  file to the Docker node and run:

  # docker secret create mongo_config ./config.json
  # rm ./config.json
*/

function load() {
  print('DOCKER-MONGO-AUTH: Starting')
  const conn = new Mongo();
  const configLocations = [
    '/run/secrets/mongo_config', // docker secret
    '/tmp/mongo-auth/config.json'
  ];

  let config;

  // use the first config we find from configLocations
  for (let i = 0; i < configLocations.length; i += 1) {
    const file = configLocations[i];

    try {
      // set `config` to be the contents of `file`
      config = cat(file);
    } catch (error) {
      print(`DOCKER-MONGO-AUTH: Cannot find config file: ${file}`);
    }

    if (config) {
      print(`DOCKER-MONGO-AUTH: Found config file: ${file}`)
      break;
    }
  }

  if (config && typeof config === 'string') {
    config = config.trim();
  } else {
    print('DOCKER-MONGO-AUTH: Unable to find/read config file - exiting.');
    return;
  }

  try {
    config = JSON.parse(config);
  } catch (error) {
    print(`DOCKER-MONGO-AUTH: Error parsing config: ${error} - exiting.`);
    return;
  }

  print('DOCKER-MONGO-AUTH: Parsed config OK');

  // setup user/pass/roles for each db in config
  for (let i = 0; i < config.dbs.length; i += 1) {
    let db = conn.getDB(config.dbs[i].name);
    db.createUser(
      {
        user: config.dbs[i].user,
        pwd: config.dbs[i].pass,
        roles: config.dbs[i].roles,
      }
    )
  }

  // delete config file
  try {
    removeFile('/tmp/mongo-auth/config.json');
  } catch (error) {
    ;
  }

  print('DOCKER-MONGO-AUTH: Finished');
}

load();
