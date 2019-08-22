const express =  require('express');
const bodyParse = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const rutas = require('./src/Rutas/rutas');
const passport = require('passport');
const session = require('express-session');

require('./src/baseDatos/conexion');
require('./src/Autenticacion/autenticacion');

app.use(bodyParse.urlencoded({extended:false}));
app.use(express.json());

app.set('puerto', process.env.PORT || 3500);

/* Se detecta la conexion de un socketCliente. */
io.on('connection', function(clienteSocket){
    console.log('nuevo cliente conectado');

    /* El socketCliente puede solicitar conocer su consumo real, acción que se hará 
    siempre al iniciar sesion el cliente. */
    clienteSocket.on('consumoRealServidor', (clienteID)=>{

        /* Se almacena el cliente en una lista de los activos */
        db.clientesActivos.push({idCliente : clienteID, idSocket : clienteSocket.id});

        /* Emitir su ultimo consumo registrado por el medidor */
        if(clienteID === "1"){
            clienteSocket.emit('consumoReal', 154);
        }
        if(clienteID === "2"){
            clienteSocket.emit('consumoReal', 635);
        }
    });
});

app.use(session({
    secret: 'secretoLlave@',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

/* Cargamos las rutas definidas. */
app.use('/', rutas);

http.listen(app.get('puerto'), ()=>{
    console.log('escuchando en http://localhost:', app.get('puerto'));
})
