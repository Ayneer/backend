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
    'origin': ['http://localhost:3000', 'http://192.168.1.61:3000', 'http://semard.com.co:3000', 'http://167.86.117.236/3000', 'http://167.86.117.236', 'https://energia-app.firebaseapp.com', 'https://energia-app.web.app']
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

    clienteSocket.on('disconnect', function () {
        console.log("disconnect: ", clienteSocket.id);
        let eliminado = false;
        for (var i = 0; i < app.get('clientesActivos').length; i++) {
            for (let index = 0; index < app.get('clientesActivos')[i].arraySocket.length; index++) {
                const element = app.get('clientesActivos')[i].arraySocket[index];
                if (element === clienteSocket.id) {
                    app.get('clientesActivos')[i].arraySocket.splice(index, 1);
                    app.set('clientesActivos', app.get('clientesActivos'));
                    eliminado = true;
                    break;
                }
            }
            if (eliminado === true) {
                console.log("ELIMINADO: ", clienteSocket.id);
                console.log('clientes subscritos: ', app.get('clientesActivos'));
                break;
            }
        }
    });

    clienteSocket.on('actualizarSocket', async (mi_correo) => {
        if (await cCliente.buscarClienteCorreo(mi_correo)) {
            for (var i = 0; i < app.get('clientesActivos').length; i++) {
                if (app.get('clientesActivos')[i].correo_cliente === mi_correo) {
                    app.get('clientesActivos')[i].arraySocket.push(clienteSocket.id);
                    app.set('clientesActivos', app.get('clientesActivos'));
                    clienteSocket.emit('recibido', true);
                    console.log("AÑADIDO: ", clienteSocket.id);
                    console.log('clientes subscritos: ', app.get('clientesActivos'));
                    break;
                }
            }
        }
    });

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
                let arraySocket = [];
                arraySocket.push(clienteSocket.id);
                app.get('clientesActivos').push({ correo_cliente: mi_correo, numeroSesion: 1, arraySocket });
                app.set('clientesActivos', app.get('clientesActivos'));

                //console.log(clienteSocket);
                clienteSocket.emit('recibido', true);
            } else if (cont > 0) {
                for (var i = 0; i < app.get('clientesActivos').length; i++) {
                    if (app.get('clientesActivos')[i].correo_cliente === mi_correo) {
                        app.get('clientesActivos')[i].numeroSesion = cont + 1;
                        app.get('clientesActivos')[i].arraySocket.push(clienteSocket.id);
                        app.set('clientesActivos', app.get('clientesActivos'));
                        clienteSocket.emit('recibido', true);
                        break;
                    }
                }
            }
            console.log('clientes subscritos: ', app.get('clientesActivos'));
        } else {
            console.log("Pa fuera");
            clienteSocket.disconnect(true);
        }

    });

    clienteSocket.on('salir', (mi_correo) => {

        if (app.get('clientesActivos').length === 0) {
            clienteSocket.emit('recibido', true);
            clienteSocket.disconnect(true);
        }

        for (var i = 0; i < app.get('clientesActivos').length; i++) {
            if (app.get('clientesActivos')[i].correo_cliente === mi_correo) {
                if (app.get('clientesActivos')[i].numeroSesion === 1) {
                    app.get('clientesActivos').splice(i, 1);
                    clienteSocket.emit('recibido', true);
                    clienteSocket.disconnect(true);
                } else if (app.get('clientesActivos')[i].numeroSesion > 1) {
                    app.get('clientesActivos')[i].numeroSesion = app.get('clientesActivos')[i].numeroSesion - 1;
                    clienteSocket.emit('recibido', true);
                    clienteSocket.disconnect(true);
                }

                app.set('clientesActivos', app.get('clientesActivos'));
                break;
            }
        }
        // for (var i = 0; i < app.get('clientesActivos').length; i++) {
        //     if (app.get('clientesActivos')[i].correo_cliente === mi_correo) {
        //         app.get('clientesActivos').splice(i, 1);
        //         clienteSocket.emit('recibido', true);
        //         clienteSocket.disconnect(true);
        //         break;
        //     }
        // }
        console.log('clientes subscritos: ', app.get('clientesActivos'));
    });

});

//Se activa el servidor
http.listen(app.get('puerto'), () => {
    console.log('escuchando en http://localhost:', app.get('puerto'));
});

