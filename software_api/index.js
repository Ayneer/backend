//Import de componentes y tecnologias necesarias
const express = require('express');
const bodyParse = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const rutas = require('./src/Rutas/rutas');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo')(session);

//Controlador
const cCliente = require('./src/Controladores/ControladorCliente');

//Clientes activos para recibir su consumo
const clientesActivos = [];

//Archivos para la conexion y la autenticacion
require('./src/baseDatos/conexion');
require('./src/Autenticacion/autenticacion');

//Configuracion de variables
app.set('puerto', process.env.PORT || 3500);
app.set('socketio', io);
app.set('clientesActivos', clientesActivos);

//Configuracion de middleware
app.use(bodyParse.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    'allowedHeaders': ['sessionId', 'Content-Type'],
    'exposedHeaders': ['sessionId'],
    'credentials': true,
    'origin': ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.1.69:3000', 'http://192.168.1.61:3000', 'http://192.168.1.69:3001', 'http://semard.com.co:3000', 'http://167.86.117.236/3000']
}));
//app.use(cookieParser('secretoLlave'));
app.use(session({
    secret: 'secretoLlave',
    resave: false,
    saveUninitialized: false,

    cookie: {
        httpOnly: false,
        maxAge: 1000 * 60 * 60 * 24 * 365
    },
    store: new MongoStore({ mongooseConnection: mongoose.connection })

}));
app.use(passport.initialize());
app.use(passport.session());

/* Cargamos las rutas definidas. */
app.use('/', rutas);

//Se habilita el socket
/* Se detecta la conexion de un socketCliente. */
io.on('connection', function (clienteSocket) {

    console.log('nuevo cliente conectado', clienteSocket.id);

    /*Se suscribe el cliente al la lista de clientes activos */
    clienteSocket.on('mi_correo', async (mi_correo) => {
        console.log("Llego correo para iniciar sesion");
        if (await cCliente.buscarClienteCorreo(mi_correo)) {

            let cont = 0;

            app.get('clientesActivos').forEach((cli) => {

                if (cli['correo_cliente'] === mi_correo) {
                    cont = cont + 1;
                }

            });

            if (cont === 0) {//No esta el correo en la lista de clientes activos
                app.get('clientesActivos').push({ correo_cliente: mi_correo, idSocketCliente: clienteSocket.id });
                app.set('clientesActivos', app.get('clientesActivos'));

                console.log('clientes subscritos: ', app.get('clientesActivos'));
                //console.log(clienteSocket);
                clienteSocket.emit('recibido', true);
            }

        } else {
            console.log("Pa fuera");
            clienteSocket.disconnect(true);
        }

    });

    clienteSocket.on('salir', (mi_correo) => {
        for (var i = 0; i < app.get('clientesActivos').length; i++) {
            if (app.get('clientesActivos')[i].correo_cliente === mi_correo) {
                app.get('clientesActivos').splice(i, 1);
                clienteSocket.emit('recibido', true);
                clienteSocket.disconnect(true);
                break;
            }
        }
        console.log("clientes activos: ");
        console.log(app.get('clientesActivos'));
    });

});

//Se activa el servidor
http.listen(app.get('puerto'), () => {
    console.log('escuchando en http://localhost:', app.get('puerto'));
});

