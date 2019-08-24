const express = require('express');
const rutas = express.Router();

const cAutenticacion = require('../Controladores/ControladorAutenticacion');
const cCliente = require('../Controladores/ControladorCliente');

/* SESION */
rutas.post('/iniciarSesion', (req, res, next)=>{
    cAutenticacion.iniciarSesion(req, res, next);
});

rutas.get('/cerrarSesion', (req, res)=>{
    cAutenticacion.cerrarSesion(req, res);
});

rutas.get('/estoyAutenticado', (req, res)=>{
    cAutenticacion.estoyAutenticado(req, res);
});


/* CRUD CLIENTE */
rutas.post('/cliente', (req, res)=>{
    cCliente.nuevoCliente(req.body, res);
});

rutas.delete('/cliente/:correo', (req, res)=>{
    cCliente.eliminarCliente(req.params.correo, res);
});

rutas.put('/cliente/:correo', (req, res)=>{
    cCliente.actualizarCliente(req.params.correo, req.body, res);
});

rutas.get('/', (req, res)=>{
    res.send("hola");
});

/* CRUD ADMINISTRADOR */
rutas.post('/administrador', (req, res)=>{
   // cCliente.nuevoCliente(req.body, res);
});

rutas.delete('/administrador/:correo', (req, res)=>{
   // cCliente.eliminarCliente(req.params.correo, res);
});

rutas.put('/administrador/:correo', (req, res)=>{
   // cCliente.actualizarCliente(req.params.correo, req.body, res);
});

rutas.get('/', (req, res)=>{
    res.send("hola");
});

/* CRUD CONSUMO */

/* Metodo que usa el medidor inteligente para enviar el consumo registrado */
rutas.post('/consumno', (req, res)=>{
//se usan los dos controladores, el de consumoReal e Historial.
});

rutas.post("/registrarConsumo", (req, res)=>{
    
    console.log(req.body);
    /* Validar fecha y ID del consumo recibido */

    /* Registrar consumo en la colección ultimoConsumo */
    db.registrarUltimoConsumo('300', '2', '16/08/2019');

    /* ¿El cliente que le corresponde este consumo esta activo? */
    db.clientesActivos.forEach((cliente)=>{

        /* Si esta activo, le emitimos su consumo */
        if(cliente['idCliente'] === req.body['idCliente']){

            io.to(cliente['idSocket']).emit('consumoReal', req.body['consumo']);

        }

    });

    res.status(200).send("consumo enviado al servidor con exito!");
});

module.exports = rutas;