//Import de componentes y tecnologias necesarias
const express = require('express');
const bodyParse = require('body-parser');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const rutas = require('./src/Rutas/rutas');
const passport = require('passport');
const session = require('express-session');

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
app.use(session({
    secret: 'secretoLlave@',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// SOLO EN MODO DEV, EN PRODUCCIÓN BORRAR ESTO!!
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

/* Cargamos las rutas definidas. */
app.use('/', rutas);

//Se habilita el socket
/* Se detecta la conexion de un socketCliente. */
io.on('connection', function (clienteSocket) {

    console.log('nuevo cliente conectado');

    /*Se suscribe el cliente al la lista de clientes activos */
    clienteSocket.on('mi_correo', async (mi_correo) => {
        
        if(await cCliente.buscarClienteCorreo(mi_correo)){

            app.get('clientesActivos').push({correo_cliente: mi_correo, idSocketCliente: clienteSocket.id });
            app.set('clientesActivos', app.get('clientesActivos'));
    
            console.log('clientes subscritos: ', app.get('clientesActivos'));
    
            clienteSocket.emit('recibido', "correo recibido");
        }else{
            clienteSocket.disconnect(true);
        }
        
    });

    clienteSocket.on('salir', (mi_correo)=>{
        for (var i =0; i < app.get('clientesActivos').length; i++){
            if (app.get('clientesActivos')[i].correo_cliente === mi_correo) {
                app.get('clientesActivos').splice(i,1);
                clienteSocket.disconnect(true);
            }
         }
        console.log(app.get('clientesActivos'));
    })

});

//Se activa el servidor
http.listen(app.get('puerto'), () => {
    console.log('escuchando en http://localhost:', app.get('puerto'));
});

