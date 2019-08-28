const mongoose = require('mongoose');
const Usuario = require('./Usuario');

const esquema_Administrador = new mongoose.Schema({});

esquema_Administrador.add(Usuario);

module.exports = mongoose.model('Administradores', esquema_Administrador);