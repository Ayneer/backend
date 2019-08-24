const Cliente = require('../Modelos/Cliente');
const bcrypt = require('bcrypt-nodejs');

const ControladorCliente = {};

ControladorCliente.nuevoCliente = async (req, res) => {

    const cliente = await Cliente.findOne({ correo: req['correo'] });

    if (!cliente) {
        /* Si no existe el cliente, se podrá registrar */
        const nuevoCliente = new Cliente();
        nuevoCliente.nombre = req['nombre'];
        nuevoCliente.apellido = req['apellido'];
        nuevoCliente.correo = req['correo'];
        nuevoCliente.telefono = req['telefono'];
        nuevoCliente.id_medidor = req['id_medidor'];
        nuevoCliente.limite = 0;
        nuevoCliente.contraseña = bcrypt.hashSync(req['telefono'], bcrypt.genSaltSync(10));
        //Se almacena el nuevo cliente
        nuevoCliente.save((err) => {
            if (err) {
                console.log('error al registrar: ', err);
                return res.status(500).send({ error: true, estado: false, mensaje: "Error #3 en el sistema, intente mas tarde." });
            } else {
                console.log('registrado!');
                return res.status(200).send({ error: false, estado: true, mensaje: "Registro exitoso!" });
            }
        });
    } else {
        //Ya existe el cliente
        return res.status(401).send({ error: false, estado: false, mensaje: "El correo ya esta en uso." });
    }
}

ControladorCliente.eliminarCliente = async (correoR, res) => {

    await Cliente.findOneAndRemove({correo: correoR}, (error, cliente)=>{
        if(error){
            return res.status(500).send({ error: true, estado: false, mensaje: "Error #4 en el sistema, intente mas tarde." });
        }else{
            if(!cliente){
                return res.status(401).send({ error: false, estado: false, mensaje: "No existe un cliente con el correo: " + correoR + " !" });
            }else{
                console.log('Eliminado!');
                return res.status(200).send({ error: false, estado: true, mensaje: "Registro eliminado!" });
            }
        }
    });
}

ControladorCliente.actualizarCliente = async (correoR, req, res) => {
    //Depende del usuario que va a modificar, si es Administrador
    const actualizar = { 
        nombre: req['nombre'], 
        apellido: req['apellido'],
        //correo : req['correo'],
        //telefono : req['telefono'],
        id_medidor : req['id_medidor'],
        //limite : req['limite'],
        /*contraseña : bcrypt.hashSync(req['contraseña'], bcrypt.genSaltSync(10))*/
    };

    await Cliente.findOneAndUpdate({ correo: correoR }, actualizar, function (error, cliente) {

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
}

module.exports = ControladorCliente;