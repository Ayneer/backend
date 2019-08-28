const ConsumoReal = require('../Modelos/ConsumoReal');
const Historial = require('../Modelos/Historial');

const ControladorConsumo = {};

ControladorConsumo.enviarConsumoReal = function (correo_cliente, res, ultimoConsumo, req) {
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

ControladorConsumo.buscarConsumoReal = function (idMedidor) {
    return ConsumoReal.findOne({ id_medidor: idMedidor });
}

ControladorConsumo.registrarConsumoReal = async function (body, correoCliente, res, req) {
    //Lo primero es saber si es primera vez que se guarda un consumo real.
    const consumoReal = await ConsumoReal.findOne({ id_medidor: body['id_medidor'] });
    const fechaMedidor = new Date(body['fecha']);
    
    if (!consumoReal) {//Se valida la fecha y listo.
        const fechaServidor = new Date();
        const diferenciaFechas = fechaServidor - fechaMedidor;//Diferencia en milisegundos.
        /* 
        - Si la diferenciaFechas es menor a cero, quiere decir que la fecha
        entrante del medidor, es mayor a la actual. (Fecha erronea o lentitud en la red)
        - La comunicación debe ser en el mismo dia. 24h = 86400000 ms 
        1 min = 60000 ms. El retraso como mucho debe de ser de menos de un minuto
        */
        if ( diferenciaFechas < 0 || diferenciaFechas >= 60000 || body['consumoTotal'] < 0) {
            //No se debe retardar por mas de 5 segundos o inclusio milisegundos.
            //Si el retardo es mas de 5 mininutos implementar otra solución.
            res.send('Datos erroneos o tiempo de envio excedido.');
        } else {
            const nuevoConsumoReal = new ConsumoReal();
            nuevoConsumoReal.fecha_consumo = fechaMedidor;
            nuevoConsumoReal.consumoMes = body['consumoTotal'];
            nuevoConsumoReal.id_medidor = body['id_medidor'];
            //nuevoConsumoReal.totalConsumo = body['consumoTotal'];
            nuevoConsumoReal.totalConsumo = 0;
            nuevoConsumoReal.save((error) => {
                if (error) {
                    res.send('Error al guardar el consumo');
                } else {
                    res.send('Guardado con exito');
                    //parete del historial y envio del consumo al cliente
                }
            });

        }
    } else {//Se validan los datos con los ya guardados.

        const diFechasConConsumo = fechaMedidor - consumoReal.fecha_consumo;//Diferencia en milisegundos.
        
        if (diFechasConConsumo <= 0 || body['consumoTotal'] <= consumoReal.totalConsumo || body['consumoTotal'] <= (consumoReal.consumoMes + consumoReal.totalConsumo)) {

            res.send('Error con fechas y/o consumo. Estan manipulando al medidor.');
       
        } else {

            const resta = fechaMedidor.getMonth() - consumoReal.fecha_consumo.getMonth();
            
            if(resta>0){//Inicio de nuevo mes
                /*  consumoReal.totalConsumo = Total de consumo de los meses anteriores. */
                consumoReal.totalConsumo = body['consumoTotal'] - 1;
            }
            /* consumoReal.consumoMes = Total de consumo del mes actual */
            /* body['consumoTotal'] = Total del consumo de todos los meses */
            consumoReal.consumoMes = body['consumoTotal'] - consumoReal.totalConsumo;
            
            const actualizacion = {
                fecha_consumo: body['fecha'],
                consumoMes: consumoReal.consumoMes,
                id_medidor: body['id_medidor'],
                totalConsumo: consumoReal.totalConsumo
            }

            await ConsumoReal.findOneAndUpdate({ id_medidor: body['id_medidor'] }, actualizacion, function (error) {

                if (error) {

                    res.send('Error al intentar actualizar');

                } else {

                    res.send('Consumo actualizado');
                    //parete del historial y envio del consumo al cliente

                }
            });
        }

    }

}

ControladorConsumo.consumoReal = function (id_medidor) {
    //Busqueda y retorno del ultimo consumo guardado del idMedidor pasado.
    return ConsumoReal.findOne({ id_medidor: id_medidor });
}

ControladorConsumo.registrarConsumoHistorial = function (ConsumoReal){
    //En esta instacia, ya se ha verificado el consumo, proveniente del medidor.
    //Ahora toca hacer las validaciones, para saber a que historial le corresponde.

    //Investigo la existencia de algun historial con la fecha del parametro
   // const fecha = ConsumoReal.fecha.getDay();
    const historial = Historial.findOne({fecha: ConsumoReal.fecha});
    if(!historial){//Si no existe para la fecha, se crea.
        const nuevoHistorial = new Historial();
        nuevoHistorial.fecha = ConsumoReal.fecha;
    }
}

module.exports = ControladorConsumo;