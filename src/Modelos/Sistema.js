const mongoose = require('mongoose');

const esquema_Sistema = new mongoose.Schema({
    costoUnitario: { type: Number, required: true},
    fechaInicialPeriodo: {type: String, required: true },
    fechaFinalPeriodo: {type: String, required: true },
    fechaProxFinalPeriodo: {type: String, required: true },
    fechaProxInicialPeriodo: {type: String, required: true }
});

module.exports = mongoose.model('sistemas', esquema_Sistema);