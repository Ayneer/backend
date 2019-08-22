const express = require('express');
const rutas = express.Router();
const passport = require('passport');
const cCliente = require('../Controladores/ControladorCliente');

rutas.post('/iniciarSesion', (req, res, next)=>{
    passport.authenticate('local', (error, estado, usuario)=>{
        if(!error){
            if(estado){
                req.logIn(usuario, (error)=>{
                    if(error){
                        res.status(500).send({error: true, estado: false, mensaje: "Error #1 en el sistema, intente mas tarde."});
                    }else{
                        res.status(200).send({error: false, estado: true, mensaje: "Sesion iniciada correctamente."});
                    }
                })
            }else{
                res.status(401).send({error: false, estado: false, mensaje: "Correo o contraseña incorrecta, revise e intente de nuevo."});
            }
        }else{
            res.status(500).send({error: true, estado: false, mensaje: "Error #2 en el sistema, intente mas tarde."});
        }
    })(req, res, next);
});

rutas.get('/cerrarSesion', (req, res, next)=>{

});

rutas.get('/estoyAutenticado', (req, res, next)=>{

});

rutas.post('/registrarCliente', async (req, res)=>{
    cCliente.nuevoCliente(req.body, res);
});

rutas.get('/', (req, res)=>{
    res.send("hola");
})

/* Metodo que usa el medidor inteligente para enviar el consumo registrado */
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