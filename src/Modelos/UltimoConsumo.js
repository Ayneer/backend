const mongoose = require('mongoose');

const esquema_UltimoConsumo = new mongoose.Schema({
    consumo: { type: Number },
    id_medidor: { type: Number },
    fecha_consumo: { type: Date },
    totalConsumo: { type: Number }
});

module.exports = mongoose.model('ultimosConsumos', esquema_UltimoConsumo);