const UltimoConsumo = require('../Modelos/UltimoConsumo');

const ControladorUltimoConsumo = {};

ControladorUltimoConsumo.enviarUltimoConsumo = function (correo_cliente, res, ultimoConsumo, req) {
    /* ¿El cliente que le corresponde este consumo esta activo? */
    const clientesActivos = req.app.get('clientesActivos');

    if (clientesActivos.length === 0) {

        res.status(401).send({ error: false, estado: false, mensaje: "No se encuentra activo el cliente." });

    } else {

        var cont = 0;

        clientesActivos.forEach((cliente) => {
            /* Si esta activo, le emitimos su consumo */
            if (cliente['correo_cliente'] === correo_cliente) {

                cont = cont + 1;

                const io = req.app.get('socketio');

                io.to(cliente['idSocketCliente']).emit('consumoReal', ultimoConsumo);

                res.send({ mensaje: "Consumo enviado al cliente" });
            }

        });

        if (cont === 0) {
            res.status(401).send({ error: false, estado: false, mensaje: "No se encuentra activo el cliente." });
        }
    }


}

ControladorUltimoConsumo.buscarUltimoConsumo = function (idMedidor) {
    return UltimoConsumo.findOne({ id_medidor: idMedidor });
}

ControladorUltimoConsumo.registratUltimoConsumo = async function (body, correoCliente, res, req) {
    //Lo primero es saber si es primera vez que se guarda un consumo real.
    const consumoReal = await UltimoConsumo.findOne({ id_medidor: body['id_medidor'] });

    if (!consumoReal) {//Se valida la fecha y listo.
        const fechaActual = new Date();
        //Diferencia en horas.
        if ((fechaActual - body['fecha']) > 24 || (fechaActual - body['fecha']) < 0 || body['consumo'] < 0) {
            //No se debe retardar por mas de 5 segundos o inclusio milisegundos.
            //Si el retardo es mas de 5 mininutos implementar otra solución.
            return false;
        } else {
            const nuevoConsumoReal = new UltimoConsumo();
            nuevoConsumoReal.fecha = body['fecha'];
            nuevoConsumoReal.consumo = body['consumo'];
            nuevoConsumoReal.id_medidor = bodu['id_medidor'];
            nuevoConsumoReal.totalConsumo = body['consumo'];
            nuevoConsumoReal.save((error) => {
                if (error) {
                    return false;
                } else {
                    console.log('Guardado!');
                    //parete del historial y envio del consumo al cliente
                    return true;
                }
            });

        }
    } else {//Se validan los datos con los ya guardados.
        if (body['fecha'] === consumoReal.fecha || body['fecha'] < consumoReal.fecha || body['consumo'] < consumoReal.consumo) {
            return false;
        } else {
            const resta = body['fecha'].getMonth() - consumoReal.fecha.getMonth();
            const consumo = 0;
            if(resta === 0){
                consumo = body['consumo'] - consumoReal.consumo;
            }else{
                if(resta > 0){
                    consumo = consumoReal.totalConsumo - body['consumo'];
                }
            }
            const actualizacion = {
                fecha: body['fecha'],
                consumo: consumo,
                id_medidor: body['id_medidor'],
                totalConsumo: body['consumo']
            }
            await UltimoConsumo.findOneAndUpdate({ id_medidor: body['id_medidor'] }, actualizacion, function (error) {

                if (error) {

                    return false;

                } else {

                    console.log('Actualizado!');
                    //parete del historial y envio del consumo al cliente
                    return true;

                }
            });
        }

    }

}

ControladorUltimoConsumo.ultimoConsumo = function (id_medidor) {
    //Busqueda y retorno del ultimo consumo guardado del idMedidor pasado.
    return UltimoConsumo.findOne({ id_medidor: id_medidor });
}

module.exports = ControladorUltimoConsumo;