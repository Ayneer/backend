const mongoose = require('mongoose');

const esquema_Alerta = new mongoose.Schema({
    limite: { type: Number },
    tipoLimite: { type: Number },
    correoCliente: { type: String },
    alerta_1: { type: Boolean },
    alerta_2: { type: Boolean },
    alerta_3: { type: Boolean },
    alerta_4: { type: Boolean },
    alerta_5: { type: Boolean }
});

module.exports = mongoose.model('alertas', esquema_Alerta);