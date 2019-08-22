const mongoose = require('mongoose');

const esquema_UltimoConsumo = new mongoose.Schema({
    consumo: { type: String },
    id_medidor: { type: String },
    fecha_consumo: { type: String }
});

module.exports = mongoose.model('ultimosConsumos', esquema_UltimoConsumo);