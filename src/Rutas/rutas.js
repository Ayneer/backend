const express = require('express');
const rutas = express.Router();

const cAutenticacion = require('../Controladores/ControladorAutenticacion');
const cAdministrador = require('../Controladores/ControladorAdministrador');
const Administrador = require('../Modelos/Administrador');
const cCliente = require('../Controladores/ControladorCliente');

/* SESION */
rutas.post('/iniciarSesion', (req, res, next) => {
    if (!cAutenticacion.estoyAutenticado(req)) {
        cAutenticacion.iniciarSesion(req, res, next);
    }else{
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
    }else{
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
rutas.post('/consumno', (req, res) => {
    //se usan los dos controladores, el de consumoReal e Historial.
});

rutas.post("/registrarConsumo", (req, res) => {

    console.log(req.body);
    /* Validar fecha y ID del consumo recibido */

    /* Registrar consumo en la colección ultimoConsumo */
    db.registrarUltimoConsumo('300', '2', '16/08/2019');

    /* ¿El cliente que le corresponde este consumo esta activo? */
    db.clientesActivos.forEach((cliente) => {

        /* Si esta activo, le emitimos su consumo */
        if (cliente['idCliente'] === req.body['idCliente']) {

            io.to(cliente['idSocket']).emit('consumoReal', req.body['consumo']);

        }

    });

    res.status(200).send("consumo enviado al servidor con exito!");
});

module.exports = rutas;