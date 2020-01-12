const mongoose = require('mongoose');
// mongoose.set('useNewUrlParser', true);
// mongoose.set('useFindAndModify', false);
// mongoose.set('useCreateIndex', true);
// mongoose.connect('mongodb://localhost:27017/energia_db')
// .then(console.log('Conectando a la base de datos...'))
// .catch(err => console.log(err));

const MONGO_DATABASE = "Energia-app";
const MONGO_HOST = "energia-app-shard-00-00-schjs.mongodb.net,energia-app-shard-00-01-schjs.mongodb.net,energia-app-shard-00-02-schjs.mongodb.net";
const MONGO_PORT = "27017";
const MONGO_USER = "admin";
const MONGO_PASSWORD = "Vw622Tdds6yJyvu9";
const MONGO_REPLICASET = "Energia-app-shard-0";
const MONGO_SSL = "1";
const MONGO_AUTH_SOURCE = "admin";

let replicas = MONGO_HOST.split(',')
    .map(url => `${url}:${MONGO_PORT}`)
    .join(',');

const MONGO_URL = `mongodb://${replicas}/${MONGO_DATABASE}`;

mongoose.connect(MONGO_URL, {
    user: MONGO_USER,
    pass: MONGO_PASSWORD,
    replicaSet: MONGO_REPLICASET,          //required when multiple host are set (replicas)
    ssl: MONGO_SSL == '1' ? /* istanbul ignore next */ true : false,  //true for mongo atlas
    authSource: MONGO_AUTH_SOURCE,         //Auth DB
    reconnectTries: 30000,
    reconnectInterval: 1000,
    useNewUrlParser: true,
    useCreateIndex: true
})
.then(console.log('Conectando a la base de datos...'))
.catch(err => console.log(err));