const Cliente = require('../Modelos/Cliente');
const bcrypt = require('bcrypt-nodejs');

const ControladorCliente = {};

ControladorCliente.nuevoCliente = async (req, res) => {

    const cliente = await Cliente.findOne({ correo: req['correo'] });
    const clienteMedidor = await Cliente.findOne({ id_medidor: req['id_medidor'] });
    if (!cliente && !clienteMedidor) {
        /* Si no existe el cliente, se podrá registrar */
        const nuevoCliente = new Cliente();
        nuevoCliente.nombre = req['nombre'];
        nuevoCliente.apellidos = req['apellidos'];
        nuevoCliente.correo = req['correo'];
        nuevoCliente.cedula = req['cedula'];
        //nuevoCliente.telefono = req['telefono'];
        nuevoCliente.id_medidor = req['id_medidor'];
        nuevoCliente.activo = false;
        //nuevoCliente.limite = 0;
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
        //Ya existe el cliente
        return res.status(401).send({ error: false, estado: false, mensaje: "El correo y/o medidor ya esta en uso." });
    }
}

ControladorCliente.eliminarCliente = async (correoR, res, correoUsuario) => {

    if (await Cliente.findOne({ correo: correoUsuario })) {
        return res.status(401).send({ error: true, estado: false, mensaje: "Accion denegada!!" });
    } else {
        await Cliente.findOneAndRemove({ correo: correoR }, (error, cliente) => {
            if (error) {
                return res.status(500).send({ error: true, estado: false, mensaje: "Error #4 en el sistema, intente mas tarde." });
            } else {
                if (!cliente) {
                    return res.status(401).send({ error: false, estado: false, mensaje: "No existe un cliente con el correo: " + correoR + " !" });
                } else {
                    console.log('Eliminado!');
                    return res.status(200).send({ error: false, estado: true, mensaje: "Registro eliminado!" });
                }
            }
        });
    }


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

    if (await Cliente.findOne({ correo: usuario.correo })) {
        /* Si entra, es porque el usuario que intenta actualizar a este
        cliente es un mismo cliente. Ahora, un cliente se puede 
        actualizar a si mismo, pero no a otro. */
        if (correoR === usuario.correo) {
            /* Solo modificar contraseña */
            if (req['sesionP']) {
                //Cambio la contraseña
                actualizacion.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
                actualizacion.activo = true;
            } else {
                /* Todo ok, el cliente puede modificar */
                if (!req['contraseña'] === null) {
                    //Cambio la contraseña
                    actualizacion.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
                }
                const cli = await Cliente.findOne({ correo: req['correo'] });
                if (cli) {
                    if (cli.correo === correoR) {//No estoy actualizando el correo
                        actualizacion.correo = req['correo'];
                        actualizacion.telefono = req['telefono'];
                        actualizacion.limite = req['limite'];
                        actualizacion.tipoLimite = req['tipoLimite'];
                    } else {
                        return res.status(401).send({ error: true, estado: false, mensaje: "El correo, ya esta en uso!" });
                    }
                } else {
                    actualizacion.correo = req['correo'];
                    actualizacion.telefono = req['telefono'];
                    actualizacion.limite = req['limite'];
                    actualizacion.tipoLimite = req['tipoLimite'];
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
        } else {
            if (req['mod'] === "modA2") {
                //Actualizar datos criticos
                const cli = await Cliente.findOne({ id_medidor: req['id_medidor'] });
                if (cli) {
                    if (cli.correo === correoR) {//El id_medidor no se esta actualizando.
                        actualizacion.nombre = req['nombre'];
                        actualizacion.apellidos = req['apellido'];
                        actualizacion.cedula = req['cedula'];
                        actualizacion.id_medidor = req['id_medidor'];
                    } else {
                        return res.status(401).send({ error: true, estado: false, mensaje: "El id de medidor, ya esta siendo utilizado por otro cliente!" });
                    }
                } else {//No esta ocupado el id de medidor, se puede hacer la actualización
                    actualizacion.nombre = req['nombre'];
                    actualizacion.apellidos = req['apellido'];
                    actualizacion.cedula = req['cedula'];
                    actualizacion.id_medidor = req['id_medidor'];
                }

            } else {
                return res.status(401).send({ error: true, estado: false, mensaje: "Accion desconocida!" });
            }
        }
    }
    if (correoR != null) {
        await Cliente.findOneAndUpdate({ correo: correoR }, actualizacion, function (error, cliente) {

            if (error) {
                return res.status(500).send({ error: true, estado: false, mensaje: "Error #5 en el sistema, intente mas tarde." });
            } else {
                if (!cliente) {
                    return res.status(401).send({ error: false, estado: false, mensaje: "No existe un cliente con el correo: " + correoR + " !" });
                } else {
                    console.log('Actualizado!');
                    return res.status(200).send({ error: false, estado: true, mensaje: "Registro actualizado!" });
                }
            }
        });
    } else {
        return res.status(401).send({ error: true, estado: false, mensaje: "A quien voy a modificar? Debes darme un correo." });
    }

}

module.exports = ControladorCliente;