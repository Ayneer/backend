const Administrador = require('../Modelos/Administrador');
const bcrypt = require('bcrypt-nodejs');

const ControladorAdministrador = {};

ControladorAdministrador.nuevoAdministrador = async (req, res) => {

    const administrador = await Administrador.findOne({ correo: req['correo'] });

    if (!administrador) {
        /* Si no existe el correo, se podrá registrar */
        const nuevoAdministrador = new Administrador();
        nuevoAdministrador.nombre = req['nombre'];
        nuevoAdministrador.apellidos = req['apellidos'];
        nuevoAdministrador.correo = req['correo'];
        nuevoAdministrador.telefono = req['telefono'];
        nuevoAdministrador.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
        //Se almacena el nuevo administrador
        nuevoAdministrador.save((err) => {
            if (err) {
                console.log('error al registrar: ', err);
                return res.status(500).send({ error: true, estado: false, mensaje: "Error #6 en el sistema, intente mas tarde." });
            } else {
                console.log('registrado!');
                return res.status(200).send({ error: false, estado: true, mensaje: "Registro exitoso del administrador!" });
            }
        });
    } else {
        //Ya existe el administrador
        return res.status(401).send({ error: false, estado: false, mensaje: "El correo ya esta en uso." });
    }
}

ControladorAdministrador.eliminarAdministrador = async (correoR, res) => {
    await Administrador.findOneAndRemove({ correo: correoR }, (error, administrador) => {
        if (error) {
            return res.status(500).send({ error: true, estado: false, mensaje: "Error #8 en el sistema, intente mas tarde." });
        } else {
            if (!administrador) {
                return res.status(401).send({ error: false, estado: false, mensaje: "No existe un administrador con el correo: " + correoR + " !" });
            } else {
                console.log('Eliminado!');
                return res.status(200).send({ error: false, estado: true, mensaje: "Registro de administrador eliminado!" });
            }
        }
    });
}

ControladorAdministrador.actualizarAdministrador = async (correoR, req, res) => {

    const actualizacion = {};

    if (!req['contraseña'] === null) {
        //Cambio la contraseña
        actualizacion.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
    }

    actualizacion.nombre = req['nombre'];
    actualizacion.apellidos = req['apellidos'];
    actualizacion.correo = req['correo'];
    actualizacion.telefono = req['telefono'];

    if (correoR != null) {

        await Administrador.findOneAndUpdate({ correo: correoR }, actualizacion, function (error, administrador) {

            if (error) {

                return res.status(500).send({ error: true, estado: false, mensaje: "Error #7 en el sistema, intente mas tarde." });

            } else {

                if (!administrador) {

                    return res.status(401).send({ error: false, estado: false, mensaje: "No existe un administrador con el correo: " + correoR + " !" });

                } else {

                    return res.status(200).send({ error: false, estado: true, mensaje: "Registro de Administrador actualizado!" });

                }

            }
        });

    } else {
        return res.status(401).send({ error: true, estado: false, mensaje: "A quien voy a modificar?" });
    }

}


ControladorAdministrador.buscarAdministradorCorreo = function (correoABuscar) {
    return Administrador.findOne({ correo: correoABuscar });
}

module.exports = ControladorAdministrador;