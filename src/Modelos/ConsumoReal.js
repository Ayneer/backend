const mongoose = require('mongoose');

const esquema_ConsumoReal = new mongoose.Schema({
    consumoMes: { type: Number },
    id_medidor: { type: Number },
    fecha_consumo: { type: Date },
    totalConsumo: { type: Number }
});

module.exports = mongoose.model('consumosReales', esquema_ConsumoReal);