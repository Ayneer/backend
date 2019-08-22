const mongoose = require('mongoose');

const esquema_Administrador = new mongoose.Schema({
    nombre: { type: String },
    apellido: { type: String },
    correo: { type: String },
    telefono: { type: Number },
    contraseña: {type: String}
});

module.exports = mongoose.model('Administradores', esquema_Administrador);