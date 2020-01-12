const mongoose = require('mongoose');

const esquema_ConsumoReal = new mongoose.Schema({
    consumoMes: { type: Number, required: true },
    id_medidor: { type: Number, required: true },
    fecha_consumo: { type: String, required: true },
    totalConsumo: { type: Number, required: true },
    fechaFinalCorte: { type: String, required: true },
    fechaInicialCorte: { type: String, required: true }
});

module.exports = mongoose.model('consumosReales', esquema_ConsumoReal);