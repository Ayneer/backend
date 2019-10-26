const express = require('express');
const rutas = express.Router();

//Controladores
const cAutenticacion = require('../Controladores/ControladorAutenticacion');
const cAdministrador = require('../Controladores/ControladorAdministrador');
const cCliente = require('../Controladores/ControladorCliente');
const cConsumo = require('../Controladores/ControladorConsumo');

/* SESION */
rutas.post('/iniciarSesion', async (req, res, next) => {
    console.log(req.body);
    if (!cAutenticacion.estoyAutenticado(req)) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        cAutenticacion.iniciarSesion(req, res, next, req.app.get('clientesActivos'));
    } else {
        console.log(req.sessionID);
        res.status(401).send({ error: false, estado: true, mensaje: "Ya estas autenticado." });
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
        console.log("No Estoy autenticado.");
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    } else {
        console.log("Estoy autenticado.");
        var admin = false;
        if (req.user.correo === "admin@energia.com") {
            var admin = true;
        }
        res.status(200).send({ error: false, estado: true, mensaje: "Sesion activa correctamente.", usuario: req.user, admin });
    }
});


/* CRUD CLIENTE */
rutas.post('/cliente', async (req, res) => {

    if (cAutenticacion.estoyAutenticado(req)) {

        const esAdministrador = await cAdministrador.buscarAdministradorCorreo(req.user.correo);

        if (esAdministrador) {//Si es un administrador, podrá realizar el registro
            cCliente.nuevoCliente(req.body, res);
        } else {//Se rechaza la petición
            res.status(401).send({ error: false, estado: false, mensaje: "No estas autorizado para realizar esta acción." });
        }

    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.delete('/cliente/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        const esAdministrador = await cAdministrador.buscarAdministradorCorreo(req.user.correo);
        const cliente = await cCliente.buscarClienteCorreo(req.params.correo);
        if (esAdministrador && cliente) {
            const operacionCliente = await cCliente.eliminarCliente(req.params.correo);
            if (operacionCliente) {
                const operacionAlerta = await cConsumo.eliminarClienteAlerta(req.params.correo);
                if (operacionAlerta === true || operacionAlerta === null) {
                    const operacionConsumoReal = await cConsumo.eliminarClienteConsumoReal(cliente.id_medidor);
                    if (operacionConsumoReal === true || operacionConsumoReal === null) {
                        const operacionHistorial = await cConsumo.eliminarClienteHistorial(cliente.id_medidor);
                        if (operacionHistorial === true || operacionHistorial === null) {
                            for (var i = 0; i < req.app.get('clientesActivos').length; i++) {
                                if (req.app.get('clientesActivos')[i].correo_cliente === req.params.correo) {
                                    req.app.get('clientesActivos').splice(i, 1);
                                    break;
                                }
                            }
                            return res.status(200).send({ error: false, estado: true, mensaje: "Cliente eliminado con exito!" });
                        } else {
                            return res.status(500).send({ error: true, estado: false, mensaje: "Error en el sistema al intentar eliminar al cliente, por favor intente mas tarde." });
                        }
                    } else {
                        return res.status(500).send({ error: true, estado: false, mensaje: "Error en el sistema al intentar eliminar al cliente, por favor intente mas tarde." });
                    }
                } else {
                    return res.status(500).send({ error: true, estado: false, mensaje: "Error en el sistema al intentar eliminar al cliente, por favor intente mas tarde." });
                }
            } else {
                return res.status(500).send({ error: true, estado: false, mensaje: "Error en el sistema al intentar eliminar al cliente, por favor intente mas tarde." });
            }
        } else {
            return res.status(401).send({ error: true, estado: false, mensaje: "No se pudo completar la operación, no existe el cliente o no eres adminisytador." });
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }

});

rutas.put('/cliente/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        //mod = modificacion | modA2 = modificacion del administrador numero 2 (Actualizacion del ID del medidor)
        if (req.body['mod'] && req.body['mod'] === "modA2") {
            //Se verifica si ya existe algun usuario que este usando el Id de medidor que se desea aplicar en la actualizacion.
            const cliente = await cCliente.buscarClienteMedidor(req.body['id_medidor']);
            if (cliente) {
                //Si existe el cliente entoces no se podra realizar la actualizacion
                return res.status(401).send({ error: true, estado: false, mensaje: "El id de medidor, ya esta en uso!" });
            } else {
                const clienteActualizar = await cCliente.buscarClienteCorreo(req.params.correo);
                //Actualizar Id medidor en el modelo Alerta, ConsumoReal, Historial y Cliente
                //Cliente
                const actIDMedidorCliente = await cCliente.actualizarIDMedidor(req.params.correo, req.body['id_medidor']);
                if (actIDMedidorCliente) {
                    //ConsumoReal
                    const estadoCReal = await cConsumo.actualizarIDMedidorCReal(clienteActualizar.id_medidor, req.body['id_medidor']);
                    if (estadoCReal === true || estadoCReal === null) {
                        const estadoHistorial = await cConsumo.actualizarIDMedidorHistorial(clienteActualizar.id_medidor, req.body['id_medidor']);
                        if (estadoHistorial === true || estadoHistorial === null) {
                            return res.status(200).send({ error: false, estado: true, mensaje: "ID de medidor actualizado con exito!" });
                        } else {
                            return res.status(401).send({ error: true, estado: false, mensaje: "Error al actualizar en ConsumoReal e Historial" });
                        }
                    } else {
                        return res.status(401).send({ error: true, estado: false, mensaje: "Error al actualizar en ConsumoReal e Historial" });
                    }
                } else {
                    return res.status(401).send({ error: true, estado: false, mensaje: "Error al actualizar en cliente" });
                }
            }

        } else {
            cCliente.actualizarCliente(req.params.correo, req.body, res, req.user);
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.get('/clientes', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        const administrador = await cAdministrador.buscarAdministradorCorreo(req.user.correo);
        if (administrador) {//Si es un administrador, entonces puede ver a todos los clientes.
            const clientes = await cCliente.buscarClientes();
            if (clientes) {
                res.status(200).send({ error: false, estado: true, mensaje: "Lista de clientes.", clientes: clientes });
            } else {
                res.status(404).send({ error: false, estado: false, mensaje: "Lista de clientes vacia." });
            }
        } else {
            res.status(403).send({ error: false, estado: false, mensaje: "Accion denegada." });
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.get('/clientes/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        //Se valida que el correo que solicita conocer el historial es el mismo del logueado
        const admin = await cAdministrador.buscarAdministradorCorreo(req.user.correo);
        const cliente = await cCliente.buscarClienteCorreo(req.user.correo);
        if (admin || cliente) {
            //Se verifica que exista el cliente
            const cliente = await cCliente.buscarClienteCorreo(req.params.correo);
            if (cliente) {
                res.status(200).send({ error: false, estado: true, mensaje: "Cliente encontrado.", cliente: cliente });
            } else {
                res.status(404).send({ error: false, estado: false, mensaje: 'No existe el cliente con el correo ' + req.params.correo });
            }
        } else {
            res.status(403).send({ error: false, estado: false, mensaje: "Accion denegada." });
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});


/* CRUD ADMINISTRADOR  Y SISTEMA*/
rutas.post('/administrador', (req, res) => {
    cAdministrador.nuevoAdministrador(req.body, res);
});

rutas.delete('/administrador/:correo', (req, res) => {
    cAdministrador.eliminarAdministrador(req.params.correo, res);
});

rutas.put('/administrador/:correo', (req, res) => {
    cAdministrador.actualizarAdministrador(req.params.correo, req.body, res);
});

rutas.post('/administrador/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req) && await cAdministrador.buscarAdministradorCorreo(req.user.correo)) {//si esta auntenticado un administrador
        let contador = 0;
        for (var i = 0; i < req.app.get('clientesActivos').length; i++) {
            if (req.app.get('clientesActivos')[i].correo_cliente === req.params.correo) {
                req.app.get('clientesActivos').splice(i, 1);
                contador++;
                break;
            }
        }
        if(contador === 0){
            res.status(402).send({ error: false, estado: false, mensaje: "El usuario no tiene la sesion activa" });
        }else{
            res.status(402).send({ error: false, estado: true, mensaje: "Sesion cerrada con exito." });
        }
    }else{
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

// CRUD DEL SISTEMA
rutas.put('/sistema', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        const administrador = await cAdministrador.buscarAdministradorCorreo(req.user.correo);
        if (administrador) {//Si es un administrador, entonces puede actualizar el costo unitario.
            cAdministrador.definirCostoUnitario(req.body['costoUnitario'], res);
        } else {
            res.status(403).send({ error: false, estado: false, mensaje: "Accion denegada." });
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }

});

rutas.get('/sistema', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req) && await cAdministrador.buscarAdministradorCorreo(req.user.correo)) {//si esta auntenticado un administrador
        const sistema = await cAdministrador.obtenerDatosSistema();
        res.status(400).send({ error: false, estado: true, mensaje: "Configuracion del sistema obtenida con exito", sistema: sistema });
    }else{
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

/* CRUD ALERTA */
rutas.post('/alerta', (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        cConsumo.crearAlerta(req.body, res);
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.get('/alerta/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        const alerta = await cConsumo.buscarAlertaCorreo(req.params.correo);
        if (alerta) {
            return res.status(200).send({ error: false, estado: true, mensaje: "Se encontro una alerta", alerta: alerta });
        } else {
            res.status(400).send({ error: false, estado: false, mensaje: "No tiene alerta" });
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});

rutas.put('/alerta/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        cConsumo.actualizarLimite(req.params.correo, req.body, res);
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});


/* CRUD CONSUMO */

/* Metodo que usa el medidor inteligente para enviar el consumo registrado */
rutas.post('/consumo', async (req, res) => {
    console.log("-----------------------Ruta /consumo----------------------");
    //Se verifica la existencia del cliente por medio del id_medidor que envia el medidor inteligente.
    console.log("verificando la existencia del cliente con id_medidor => "+req.body['id_medidor']);
    const cliente = await cCliente.buscarClienteMedidor(req.body['id_medidor']);

    if (cliente) {//si existe el cliente, se procede a consultar el costo unitario del kw actual y si dispone de algun limite de consumo.
        console.log("Si existe el cliente.");
        //Se consulta el costo unitario del kw
        console.log("Consultando el costo unitario del kw...");
        const sistema = await cAdministrador.obtenerDatosSistema();
        let costoU = 0;
        if (sistema) {//Sí no existen datos de configuración del sistema entonces se tomará el costo unitario del kw en cero.
            costoU = sistema.costoUnitario;
        }
        console.log("Este es el costo unitario del kw => "+costoU);
        //Se verifica si el usuario dispone de alguna configuración sobre el limite, esto con el fin de validar su estado para emitir o no una alerta.
        console.log("Verificando existencia de algun limite...");
        const limite = await cConsumo.buscarAlertaCorreo(cliente.correo);
        console.log("Este es el limite establecido => "+limite);
        //Se procede a validar el registro del consumo que llega desde el medidor con la ayuda del controlador de consumo.
        console.log("Enviando los datos con el controlador de consumo...");
        cConsumo.registrarConsumoReal(req.body, res, req, costoU, cliente, limite);
    } else {//Si no existe el cliente, no se registra el consumo y se responde al medidor.
        console.log("No existe el cliente con id_medidor => "+req.body['id_medidor'])
        res.send({ error: true, estado: false, mensaje: "No existe el cliente para este id de medidor." });
    }
    console.log("-------------------FIN Ruta /consumo--------------------------");
});

//Petición realizada por el cliente para conocer su consumo real.
rutas.get('/consumo/:correo', async (req, res) => {
    console.log("se solicita el consumo real");
    //Se verifica que este autenticado el req
    //Si estas auitenticado, existe el correo cliente.
    if (cAutenticacion.estoyAutenticado(req)) {
        console.log("quien solicita el consumo real esta autenticado");
        console.log(req.params.correo);
        //Se valida que el correo que solicita conocer el consumo real es el mismo del logueado
        if (req.user.correo === req.params.correo) {
            console.log("es su mismo correo");
            //Metodo que busca el ultimo consumo de un medidor.
            const ConsumoReal = await cConsumo.consumoReal(req.user.id_medidor);
            if (ConsumoReal) {
                console.log("tiene un consumo real");
                const sistema = await cAdministrador.obtenerDatosSistema();
                let costoU = 0;
                if (sistema) {
                    costoU = sistema.costoUnitario;
                }
                res.status(200).send({ error: false, estado: true, mensaje: "Hay consumo!", consumoMes: ConsumoReal, costoU });
            } else {
                console.log("NO tiene un consumo real");
                res.status(200).send({ error: false, estado: false, mensaje: "Aun no existen datos de consumo. Verifica el funcionamineto del medidor." });
            }
        } else {
            res.status(200).send({ error: false, estado: false, mensaje: "No se puede verificar al usuario!" });
        }
    } else {
        console.log("NO es su mismo correo");
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }

});

/* CRUD HISTORIAL */

//Petición realizada por un cliente para conocer su historial
rutas.get('/historial/:correo', async (req, res) => {
    if (cAutenticacion.estoyAutenticado(req)) {
        //Se valida que el correo que solicita conocer el historial es el mismo del logueado
        if (req.user.correo === req.params.correo) {
            //Se verifica que sea un cliente
            const cliente = await cCliente.buscarClienteCorreo(req.user.correo);
            if (cliente) {
                const historial = await cConsumo.buscarHistorial(cliente.id_medidor);
                if (historial) {
                    res.status(200).send({ error: false, estado: true, mensaje: "Historial(es) del cliente encontrado.", historial: historial });
                } else {
                    res.status(404).send({ error: false, estado: false, mensaje: "No existe aun historial." });
                }
            } else {
                res.status(403).send({ error: false, estado: false, mensaje: "Accion denegada." });
            }
        } else {
            res.status(403).send({ error: false, estado: false, mensaje: "Accion denegada." });
        }
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No estas autenticado, debes iniciar sesion." });
    }
});


module.exports = rutas;