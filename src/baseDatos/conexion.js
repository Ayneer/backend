const mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb://localhost:27017/energia_db', {useNewParser: true})
.then(console.log('Conectando a la base de datos...'))
.catch(err => console.log("Error al intentar conectar con MongoDB."));