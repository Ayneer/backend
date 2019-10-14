const Cliente = require('../Modelos/Cliente');
const bcrypt = require('bcrypt-nodejs');
const Alerta = require('../Modelos/Alerta');

const ControladorCliente = {};

ControladorCliente.nuevoCliente = async (req, res) => {

    const cliente = await Cliente.findOne({ correo: req['correo'] });
    const clienteMedidor = await Cliente.findOne({ id_medidor: req['id_medidor'] });
    if (!cliente && !clienteMedidor) {
        /* Si no existe el cliente, se podrá registrar */
        if (req['correo'] !== 'admin@energia.com') {
            const nuevoCliente = new Cliente();
            nuevoCliente.nombre = req['nombre'];
            nuevoCliente.apellidos = req['apellidos'];
            nuevoCliente.correo = req['correo'];
            nuevoCliente.cedula = req['cedula'];
            nuevoCliente.id_medidor = req['id_medidor'];
            nuevoCliente.activo = false;
            nuevoCliente.contraseña = bcrypt.hashSync(req['correo'], bcrypt.genSaltSync(10));
            //Se almacena el nuevo cliente
            nuevoCliente.save((err) => {
                if (err) {
                    console.log('error al registrar: ', err);
                    return res.status(500).send({ error: true, estado: false, mensaje: "Debe completar todos los campos requeridos!" });
                } else {
                    console.log('registrado!');
                    return res.status(200).send({ error: false, estado: true, mensaje: "Registro exitoso!" });
                }
            });


        } else {
            return res.status(401).send({ error: false, estado: false, mensaje: "El correo y/o medidor ya esta en uso." });
        }

    } else {
        //Ya existe el cliente
        return res.status(401).send({ error: false, estado: false, mensaje: "El correo y/o medidor ya esta en uso." });
    }
}

ControladorCliente.eliminarCliente = async (correo) => {

    let estado = null;
    await Cliente.findOneAndRemove({ correo: correo }, (error, cliente) => {
        if (error) {
            estado = false;
            //return res.status(500).send({ error: true, estado: false, mensaje: "Error #4 en el sistema, intente mas tarde." });
        } else {
            if (cliente) {
                estado = true;
                //return res.status(401).send({ error: false, estado: false, mensaje: "No existe un cliente con el correo: " + correoR + " !" });
            }
        }
    });

    return estado;

}

ControladorCliente.buscarClienteCorreo = function (correoABuscar) {
    return Cliente.findOne({ correo: correoABuscar });
}

ControladorCliente.buscarClienteMedidor = function (IdMedidor) {
    return Cliente.findOne({ id_medidor: IdMedidor });
}

ControladorCliente.buscarClientes = function () {
    return Cliente.find({});
}

const validarContraseña = (contraseñaValidar, contraseñaUsuario) => {
    return bcrypt.compareSync(contraseñaValidar, contraseñaUsuario);
}

ControladorCliente.actualizarIDMedidor = async (correo, id_medidorNuevo) => {
    //Actualizar limite en el modelo Cliente
    let estado = null;
    await Cliente.findOneAndUpdate({ correo: correo }, { id_medidor: id_medidorNuevo }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    });
    return estado;
}

ControladorCliente.actualizarCliente = async (correoR, req, res, usuario) => {
    //Depende del usuario que va a hacer la modificación

    /* Por parte del cliente el podrá modificar:
    Correo, telefono, limite, tipoLimite y contraseña.*/

    /* Por parte del administrador el podrá recuperar la contraseña = modA1.
    y/o modificar datos criticos (nombre, apellido, id_medidor y cedula) = modA2.
 
    Para realizar un reestablecimiento de contraseña, el administrador 
    debe enviar en el body, mod: modA1, contraseña: contraseña por defecto.

    Para actualizar los datos "criticos" el administrador debe 
    enviar en el body de la peticion: mod: modA2, los campos a 
    actualizar.
    */
    const actualizacion = {};

    const cliente = await Cliente.findOne({ correo: usuario.correo });

    if (cliente) {
        /* Si entra, es porque el usuario que intenta actualizar a este
        cliente es un mismo cliente. Ahora, un cliente se puede 
        actualizar a si mismo, pero no a otro. */
        if (correoR === usuario.correo) {
            /* Solo modificar contraseña */
            if (req['sesionP']) {
                //Cambio la contraseña
                actualizacion.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
                actualizacion.activo = true;
                cliente = {
                    ...cliente,
                    activo : true
                }
            } else {
                /* Todo ok, el cliente puede modificar */
                if (req['cambiarContrasena']) {
                    //validar contraseña principal
                    if (validarContraseña(req['contrasena'], usuario.contraseña)) {
                        //Cambio la contraseña
                        actualizacion.contraseña = bcrypt.hashSync(req['contrasenaNueva'], bcrypt.genSaltSync(10));
                    } else {
                        return res.status(401).send({ error: false, estado: false, mensaje: "Contraseña principal incorrecta!" });
                    }
                }

                const cli = await Cliente.findOne({ correo: req['correo'] });

                if (cli) {
                    if (cli.correo !== correoR) {//No estoy actualizando el correo
                        return res.status(401).send({ error: false, estado: false, mensaje: "El correo ya esta en uso!" });
                    } else {
                        actualizacion.telefono = req['telefono'];
                    }
                } else {//Esta actualizando el correo
                    //Actualizon el correo en la alerte/limite
                    Alerta.findOneAndUpdate({ correoCliente: usuario.correo }, { correoCliente: req['correo'] }, (error) => {
                        if (error) { console.log(error); }
                    });
                    actualizacion.correo = req['correo'];
                    actualizacion.telefono = req['telefono'];
                }
            }
        } else {
            /* Intentan hackear al servidor. */
            return res.status(401).send({ error: true, estado: false, mensaje: "Accion denegada!!" });
        }
    } else {
        //Si no es un cliente y esta correctamente autenticado, entonces debe ser un administrador.
        if (req['mod'] === "modA1") {
            //Recuperar contraseña 
            actualizacion.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
            actualizacion.activo = false;
        }
    }
    if (correoR != null) {
        await Cliente.findOneAndUpdate({ correo: correoR }, actualizacion, function (error, clienteEncontrado) {

            if (error) {
                return res.status(500).send({ error: true, estado: false, mensaje: "Error #5 en el sistema, intente mas tarde." });
            } else {
                if (!clienteEncontrado) {
                    return res.status(401).send({ error: false, estado: false, mensaje: "No existe un cliente con el correo: " + correoR + " !" });
                } else {
                    return res.status(200).send({ error: false, estado: true, mensaje: "Registro actualizado", cliente});
                }
            }
        });
    } else {
        return res.status(401).send({ error: true, estado: false, mensaje: "A quien voy a modificar? Debes darme un correo." });
    }

}

module.exports = ControladorCliente;