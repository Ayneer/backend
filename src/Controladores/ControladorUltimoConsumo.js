const UltimoConsumo = require('../Modelos/UltimoConsumo');

const ControladorUltimoConsumo = {};

ControladorUltimoConsumo.enviarUltimoConsumo = function (_id_cliente) {
    /* ¿El cliente que le corresponde este consumo esta activo? */
    const clientesActivos = req.app.get('clientesActivos');

    clientesActivos.forEach((cliente) => {

        /* Si esta activo, le emitimos su consumo */
        if (cliente['idCliente'] === _id_cliente) {

            const io = req.app.get('socketio');

            io.to(cliente['idSocket']).emit('consumoReal', consumoReal);

        }

    });
}

ControladorUltimoConsumo.registratUltimoConsumo = function (req, _id_cliente, res) {
    //Se recibe un consumo real, No total.

    //La fecha del consumo de llegada, no debe ser mayor a la actual
    //La fecha del consumo de llegada, no debe ser menor a la actual
    //La fecha como tal debe ser igual a la actual
    //Pero la hora puede ser solo menor a la actual
    //Eso por el tiempo de conexion a internet y mientras se envia.

    //Se busca si existe un consumo anterior
    if (true) {
        //Si existe un consumo anterior, se compara las fechas
        //Porque se supone que se va a mostrar el consumo actual del mes
        //Si estan en el mismo mes, se suman. Si el mes que indica
        //el consumo encontrado es menor al llegado, se actualiza el 
        //valor del encontrado por el llegado.

        //El resultado se le envia al cliente
        this.enviarUltimoConsumo(_id_cliente);
        
    } else {//No existe un consumo anterior, es decir, es el primer.
        const ultimoConsumo = new UltimoConsumo({ consumo, id_medidor, fecha_consumo });
        ultimoConsumo.save();
    }

}

module.exports = ControladorUltimoConsumo;