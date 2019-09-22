const mongoose = require('mongoose');
const Usuario = require('./Usuario');

const esquema_Cliente = new mongoose.Schema({
    cedula: { type: Number, required: true},
    telefono: { type: Number },
    id_medidor: { type: Number, required: true},
    limite: {type: Number},//Borrar
    tipoLimite: {type: Number},//Borrar
    activo: {type: Boolean}
});

esquema_Cliente.add(Usuario);

module.exports = mongoose.model('Clientes', esquema_Cliente);