const UltimoConsumo = require('../Modelos/UltimoConsumo');

const ControladorUltimoConsumo = {};

ControladorUltimoConsumo.registratUltimoConsumo = function(consumo, id_medidor, fecha_consumo){
    
    const ultimoConsumo = new UltimoConsumo({consumo, id_medidor, fecha_consumo});
    ultimoConsumo.save();
}

module.exports = ControladorUltimoConsumo;