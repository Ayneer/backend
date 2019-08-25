const mongoose = require('mongoose');

const esquema_Historial = new mongoose.Schema({
    consumoMadrugada: { type: Number },
    consumoMañana: { type: Number },
    consumoTarde: { type: Number },
    consumoNoche: { type: Number },
    costoUnitarioKwh: { type: Number },
    fecha: { type: Date },
    id_medidor: { type: Number }
});

module.exports = mongoose.model('hostorial', esquema_Historial);