const mongoose = require('mongoose');

const esquema_Sistema = new mongoose.Schema({
    costoUnitario: { type: Number, required: true},
    fechaInicialPeriodo: {type: String, required: false, default: null },
    fechaFinalPeriodo: {type: String, required: false, default: null },
    fechaProxFinalPeriodo: {type: String, required: false, default: null },
    fechaProxInicialPeriodo: {type: String, required: false, default: null }
});

module.exports = mongoose.model('sistemas', esquema_Sistema);