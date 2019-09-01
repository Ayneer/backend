const mongoose = require('mongoose');

const esquema_Sistema = new mongoose.Schema({
    costoUnitario: { type: Number, required: true}
});

module.exports = mongoose.model('Sistemas', esquema_Sistema);