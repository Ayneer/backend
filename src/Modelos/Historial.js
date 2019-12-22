const mongoose = require('mongoose');

const esquema_Historial = new mongoose.Schema({
    consumoMadrugada: { type: Number },
    consumoMañana: { type: Number },
    consumoTarde: { type: Number },
    consumoNoche: { type: Number },
    totalConsumoDia: { type: Number, required: true },
    consumoDiasAnteriores: { type: Number, required: true },//total de consumo de dias anteriores al del historial (dia) en el mes en curso.
    costoUnitarioKwh: { type: Number, required: true },
    fecha: { type: String, required: true },
    id_medidor: { type: Number, required: true }
});

module.exports = mongoose.model('historiales', esquema_Historial);