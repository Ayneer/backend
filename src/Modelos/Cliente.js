const mongoose = require('mongoose');

const esquema_Cliente = new mongoose.Schema({
    nombre: { type: String },
    apellidos: { type: String },
    cedula: { type: Number },
    correo: { type: String },
    telefono: { type: Number },
    id_medidor: { type: Number },
    limite: {type: Number},
    contraseña: {type: String}
});

module.exports = mongoose.model('Clientes', esquema_Cliente);