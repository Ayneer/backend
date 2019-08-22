const UltimoConsumo = require('./modelos/modelos').UltimoConsumo;

class BaseDatos {

    clientesActivos = [];

    registrarUltimoConsumo(consumo, id_medidor, fecha_consumo){
        const ultimoConsumo = new UltimoConsumo({consumo, id_medidor, fecha_consumo});
        ultimoConsumo.save();
    }

}

module.exports = BaseDatos;