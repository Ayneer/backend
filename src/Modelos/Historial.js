const mongoose = require('mongoose');

const esquema_Historial = new mongoose.Schema({
    consumoMadrugada: { type: Number },
    consumoMañana: { type: Number },
    consumoTarde: { type: Number },
    consumoNoche: { type: Number },
    costoUnitarioKwh: { type: Number, required: true },
    fecha: { type: String, required: true },
    id_medidor: { type: Number, required: true }
});

module.exports = mongoose.model('historiales', esquema_Historial);