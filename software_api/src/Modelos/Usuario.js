const mongoose = require('mongoose');

const esquema_Usuario = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellidos: { type: String, required: true },
    correo: { type: String, required: true },
    contraseña: {type: String, required: true}
}, { storeSubdocValidationError: false });

module.exports = esquema_Usuario;