const Cliente = require('../Modelos/Cliente');
const bcrypt = require('bcrypt-nodejs');

const ControladorCliente = {};

ControladorCliente.nuevoCliente = async (req, res)=>{

    const cliente = await Cliente.findOne({correo: req['correo']});

    if(!cliente){
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
        nuevoCliente.save((err)=>{
            if(err){
                console.log('error al registrar: ', err);
                return res.status(500).send({error: true, estado: false, mensaje: "Error #3 en el sistema, intente mas tarde."});
            }else{
                console.log('registrado!');
                return res.status(200).send({error: false, estado: true, mensaje: "Registro exitoso!"});
            }
        });
    }else{
        //Ya existe el cliente
        return res.status(401).send({error: false, estado: false, mensaje: "El correo ya esta en uso."});
    }
}

module.exports = ControladorCliente;