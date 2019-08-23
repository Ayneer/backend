const express =  require('express');
const bodyParse = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const rutas = require('./src/Rutas/rutas');
const passport = require('passport');
const session = require('express-session');
const clientesActivos = [];

require('./src/baseDatos/conexion');
require('./src/Autenticacion/autenticacion');

app.set('puerto', process.env.PORT || 3500);

app.use(bodyParse.urlencoded({extended:false}));
app.use(express.json());

app.use(session({
    secret: 'secretoLlave@',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

/* Cargamos las rutas definidas. */
app.use('/', rutas);

/* Se habilita socket para que los clientes
que esten en una sesion activa lo usen. */

/* Se detecta la conexion de un socketCliente. */
io.on('connection', function (clienteSocket) {
    
    console.log('nuevo cliente conectado');

    /* El socketCliente puede solicitar conocer su consumo real. */
    clienteSocket.on('consumoRealServidor', () => {

        /* Se almacena el cliente en una lista de los activos */
        clientesActivos.push({ idCliente: _idCliente, idSocket: clienteSocket.id });
        console.log('clientes activos: ', clientesActivos);

        /* Emitir su ultimo consumo registrado por el medidor,
        mediante el controlador de ultimo consumo */
        if (_idCliente === "1") {
            clienteSocket.emit('consumoReal', 154);
        }
        if (_idCliente === "2") {
            clienteSocket.emit('consumoReal', 635);
        }

    });
    
});

http.listen(app.get('puerto'), ()=>{
    console.log('escuchando en http://localhost:', app.get('puerto'));
});

