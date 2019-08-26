const express = require('express');
const rutas = express.Router();

//Controladores
const cAutenticacion = require('../Controladores/ControladorAutenticacion');
const cAdministrador = require('../Controladores/ControladorAdministrador');
const cCliente = require('../Controladores/ControladorCliente');
const cUConsumo = require('../Controladores/ControladorUltimoConsumo');

const Administrador = require('../Modelos/Administrador');

/* SESION */
rutas.post('/iniciarSesion', (req, res, next) => {
    if (!cAutenticacion.estoyAutenticado(req)) {
        cAutenticacion.iniciarSesion(req, res, next, req.app.get('socketio'), req.app.get('clientesActivos'));
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "Ya estas autenticado." });
    }
});

rutas.get('/cerrarSesion', (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        cAutenticacion.cerrarSesion(req, res);
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.get('/estoyAutenticado', (req, res) => {
    if (!cAutenticacion.estoyAutenticado(req)) {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    } else {
        res.status(200).send({ error: false, estado: true, mensaje: "Sesion activa correctamente." });
    }
});


/* CRUD CLIENTE */
rutas.post('/cliente', async (req, res) => {

    if (cAutenticacion.estoyAutenticado(req)) {

        const esAdministrador = await Administrador.findOne({ correo: req.user.correo });

        if (esAdministrador) {//Si es un administrador, podrá realizar el registro
            cCliente.nuevoCliente(req.body, res);
        } else {//Se rechaza la petición
            res.status(401).send({ error: false, estado: false, mensaje: "No estas autorizado para realizar esta acción." });
        }

    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.delete('/cliente/:correo', (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        cCliente.eliminarCliente(req.params.correo, res, req.user.correo);
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }

});

rutas.put('/cliente/:correo', (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        cCliente.actualizarCliente(req.params.correo, req.body, res, req.user);
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.get('/clientes', (req, res) => {
    res.send("esto es debe listar a todos los clientes!");
});

rutas.get('/clientes/:correo', (req, res) => {
    res.send("esto es debe listar a un cliente!");
});

/* CRUD ADMINISTRADOR */
rutas.post('/administrador', (req, res) => {
    cAdministrador.nuevoAdministrador(req.body, res);
});

rutas.delete('/administrador/:correo', (req, res) => {
    cAdministrador.eliminarAdministrador(req.params.correo, res);
});

rutas.put('/administrador/:correo', (req, res) => {
    cAdministrador.actualizarAdministrador(req.params.correo, req.body, res);
});

/* CRUD CONSUMO */

/* Metodo que usa el medidor inteligente para enviar el consumo registrado */
rutas.post('/consumo', async (req, res) => {
    //se usan los dos controladores, el de consumoReal e Historial.
    //Buscar cliente con el id_medidor que llega.
    const cliente = await cCliente.buscarClienteMedidor(req.body['id_medidor']);
        
    if (cliente) {//si existe el cliente si registra el consumo.
        const correo = cliente.correo;//Para saber a quien enviar el consumo por socket
        cUConsumo.registratUltimoConsumo(req.body, correo, res, req);
    } else {
        //Si no existe el cliente, no se registra el consumo.
        res.status(401).send({ error: true, estado: false, mensaje: "No existe el cliente para este id de medidor." });
    }
});

//Petición realizada por el cliente para conocer su consumo real.
rutas.get('/consumo/:correo', async (req, res) => {
    //Se verifica que este autenticado el req
    //Si estas auitenticado, existe el correo cliente.
    if (cAutenticacion.estoyAutenticado(req)) {
        //Se valida que el correo que solicita conocer el consumo real es el mismo del logueado
        if (req.user.correo === req.params.correo) {
            //Metodo que busca el ultimo consumo de un medidor.
            const ultimoConsumo = await cUConsumo.ultimoConsumo(req.user.id_medidor);
            if (ultimoConsumo) {
                res.status(200).send({ error: false, estado: true, mensaje: ultimoConsumo });
            } else {
                res.status(200).send({ error: false, estado: false, mensaje: "Aun no existen datos de consumo. Verifica el funcionamineto del medidor." });
            }

            /*cUConsumo.enviarUltimoConsumo(req.params.correo, res, ultimoConsumo.consumo, req);*/
        }
    }

});


module.exports = rutas;