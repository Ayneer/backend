const Administrador = require('../Modelos/Administrador');
const Sistema = require('../Modelos/Sistema');
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
        nuevoAdministrador.contraseña = bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10));
        //Se almacena el nuevo administrador
        nuevoAdministrador.save((err) => {
            if (err) {
                console.log('error al registrar: ', err);
                return res.status(500).send({ error: true, estado: false, mensaje: "Debe completar todos los campos." });
            } else {
                console.log('registrado!');
                return res.status(200).send({ error: false, estado: true, mensaje: "Registro exitoso del administrador!" });
            }
        });
    } else {
        //Ya existe el administrador
        console.log(administrador);
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

ControladorAdministrador.definirCostoUnitario = async function (nuevoCosto, res) {
    const sistema = await Sistema.findOne({});                                    
    if(sistema){
        console.log(sistema);
        await Sistema.updateMany({}, { costoUnitario: nuevoCosto }, (error) => {
            if (error) {
                return res.status(500).send({ error: true, estado: false, mensaje: "Error al guardar el costo" });
            } else {
                console.log("actualizado")
                return res.status(200).send({ error: false, estado: true, mensaje: "Nuevo costo guardado" });
            }
        });
    }else{
        const nuevoSistema = new Sistema();
        nuevoSistema.costoUnitario = nuevoCosto;
        nuevoSistema.save((error)=>{
            if(error){
                return res.status(500).send({ error: true, estado: false, mensaje: "Error al guardar el costo" });
            }else{
                console.log("guardado")
                return res.status(200).send({ error: false, estado: true, mensaje: "Nuevo costo guardado" });
            }
        })
    }
    
}

ControladorAdministrador.obtenerDatosSistema = function(){
    return Sistema.findOne({});
}
module.exports = ControladorAdministrador;