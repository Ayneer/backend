const ConsumoReal = require('../Modelos/ConsumoReal');
const Historial = require('../Modelos/Historial');

const ControladorConsumo = {};

ControladorConsumo.enviarConsumoReal = function (correo_cliente, res, ultimoConsumo, req) {
    /* ¿El cliente que le corresponde este consumo esta activo? */
    const clientesActivos = req.app.get('clientesActivos');

    if (clientesActivos.length === 0) {

        res.send({ error: false, estado: false, mensaje: "Historial, Consumo actualizado y/o guardado con exito! Pero, No se encuentra activo el cliente." });

    } else {

        var cont = 0;

        clientesActivos.forEach((cliente) => {
            /* Si esta activo, le emitimos su consumo */
            if (cliente['correo_cliente'] === correo_cliente) {

                cont = cont + 1;

                const io = req.app.get('socketio');

                io.to(cliente['idSocketCliente']).emit('consumoReal', ultimoConsumo);

                res.send({ mensaje: "Historial, Consumo actualizado y/o guardado con exito! y Consumo enviado al cliente" });
            }

        });

        if (cont === 0) {
            res.send({ error: false, estado: false, mensaje: "Historial, Consumo actualizado y/o guardado con exito! Pero, No se encuentra activo el cliente." });
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
    const fechaServidor = new Date();
    if (!consumoReal) {//Se valida la fecha y listo.

        const diferenciaFechas = fechaServidor - fechaMedidor;//Diferencia en milisegundos.
        /* 
        - Si la diferenciaFechas es menor a cero, quiere decir que la fecha
        entrante del medidor, es mayor a la actual. (Fecha erronea o lentitud en la red)
        - La comunicación debe ser en el mismo dia. 24h = 86400000 ms 
        1 min = 60000 ms. El retraso como mucho debe de ser de menos de un minuto
        */
        if (diferenciaFechas < 0 || diferenciaFechas >= 60000 || body['consumoTotal'] < 0) {
            //No se debe retardar por mas de 5 segundos o inclusio milisegundos.
            //Si el retardo es mas de 5 mininutos implementar otra solución.
            return res.send('Datos erroneos o tiempo de envio excedido.');
        } else {
            const nuevoConsumoReal = new ConsumoReal();
            nuevoConsumoReal.fecha_consumo = fechaMedidor.toLocaleString('en-us', { hour12: true });
            nuevoConsumoReal.consumoMes = body['consumoTotal'];
            nuevoConsumoReal.id_medidor = body['id_medidor'];
            nuevoConsumoReal.totalConsumo = 0;
            nuevoConsumoReal.save((error) => {
                if (error) {
                    return res.send('Error al guardar el consumo');
                } else {
                    this.registrarConsumoHistorial(nuevoConsumoReal, 100, res, correoCliente, req);
                }
            });

        }
    } else {//Se validan los datos con los ya guardados.
        const fechaConsumoGuardado = new Date(consumoReal.fecha_consumo);
        const diFechasConConsumo = fechaMedidor - fechaConsumoGuardado;//Diferencia en milisegundos.
        const diferenciaServidor = fechaServidor - fechaMedidor;

        if (diFechasConConsumo <= 0 || body['consumoTotal'] <= consumoReal.totalConsumo || body['consumoTotal'] <= (consumoReal.consumoMes + consumoReal.totalConsumo) || diferenciaServidor < 0) {

            return res.send('Error con fechas y/o consumo. Estan manipulando al medidor.');

        } else {

            const resta = fechaMedidor.getMonth() - fechaConsumoGuardado.getMonth();

            if (resta > 0) {//Inicio de nuevo mes
                /*  consumoReal.totalConsumo = Total de consumo de los meses anteriores. */
                if(consumoReal.totalConsumo===0){//A penas segundo mes de consumo
                    consumoReal.totalConsumo = consumoReal.consumoMes;
                }else{
                    consumoReal.totalConsumo = consumoReal.totalConsumo + consumoReal.consumoMes;
                }
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

            let cont = 0;

            await ConsumoReal.findOneAndUpdate({ id_medidor: consumoReal.id_medidor }, actualizacion, function (error) {

                if (error) {
                    cont = cont + 1;
                    return res.send('Error al intentar actualizar');
                } 
            });

            if (cont === 0) {
                //Refrescamos al consumoReal recien actualizado
                consumoRealActualizado = await ConsumoReal.findOne({ id_medidor: body['id_medidor'] });
                this.registrarConsumoHistorial(consumoRealActualizado, 100, res, correoCliente, req);
            }

        }

    }

}

ControladorConsumo.consumoReal = function (id_medidor) {
    //Busqueda y retorno del ultimo consumo guardado del idMedidor pasado.
    return ConsumoReal.findOne({ id_medidor: id_medidor });
}

ControladorConsumo.registrarConsumoHistorial = async function (ConsumoReal, costoUnitarioKwh, res, correoCliente, req) {
    //En esta instacia, ya se ha verificado el consumo, proveniente del medidor.
    //Ahora toca hacer las validaciones, para saber a que historial le corresponde.

    //Investigo la existencia de algun historial con el id_medidor del parametro
    //Que se supone, el ultimo registro guardado es la fecha mas reciente.
    const ultimoHistorial = await Historial.findOne({ id_medidor: ConsumoReal.id_medidor }).sort({ field: 'asc', _id: -1 }).limit(1);

    if (!ultimoHistorial) {//No hay registros de historial

        //Devuelve false o un documento de Historial
        let documetoHistorial = this.nuevoHistorial(ConsumoReal);
        if (documetoHistorial) {
            //Si entra, es porque no fue false, asi que tiene un documento
            let nuevoHistorial = new Historial();
            nuevoHistorial = documetoHistorial;
            nuevoHistorial.fecha = ConsumoReal.fecha_consumo;
            nuevoHistorial.id_medidor = ConsumoReal.id_medidor;
            nuevoHistorial.costoUnitarioKwh = costoUnitarioKwh;
            //Se guarda
            nuevoHistorial.save((error, historial) => {
                if (error) {
                    return res.send("Consumo Real guardado pero, No se pudo guardar el historial.");
                } else {
                    if (historial) {
                        this.enviarConsumoReal(correoCliente, res, ConsumoReal.consumoMes, req);
                    }
                }
            });
        } else {
            return res.send("error al crear nuevo historial");
        }


    } else {
        //Existe uno o mas historiales para el medidor
        //Se comparan las fechas para saber si hay que hacer una actualización o nuevo registro
        //Casteamos a Date para obtener la hora y asi saber en que jornada guardar.
        const fechaCR = new Date(ConsumoReal.fecha_consumo);
        let hora = fechaCR.getHours();
        //La hora al castearla la devuelve en formato de 24h
        //La trabajamos para dejarla en formato de 12h
        if (hora > 12) {
            hora = hora - 12;
        } else {
            if (hora === 0) {
                hora = 12;
            }
        }
        //un ejemplo de una fecha es la siguiente: "8/27/2019, 4:18:16 PM"
        //Dividimos las cadenas hasta obtener los fragmentos "8/27/2019"
        //Con el fin de poder comparar esas cadenas
        const arregloFechaCR = ConsumoReal.fecha_consumo.split(",");
        const arregloFechaH = ultimoHistorial.fecha.split(",");
        //arregloFechaCR[0] = "8/27/2019" para el ejemplo.
        if (arregloFechaCR[0] === arregloFechaH[0]) {//Existe ya un historial y las fechas son iguales
            //Sigo dividiendo la cadena del consumo real, proveniente del medidor
            //con el fin de obtener si es "AM" o "PM"
            const arregloHoraCR = arregloFechaCR[1].split(" ");
            let actualizacion = {};
            let contError = 0;
            //arregloHoraCR[2] = "PM" para el ejemplo
            if (arregloHoraCR[2] === "AM") {

                if (hora === 12 || (hora >= 1 && hora <= 5)) {//Madrugada
                    actualizacion.consumoMadrugada = ConsumoReal.consumoMes;
                } else {
                    if (hora >= 6 && hora <= 11) {//Mañana
                        actualizacion.consumoMañana = ConsumoReal.consumoMes;
                    } else {
                        contError++;
                        return res.send("error 5, No se encuentra la hora en el dia.");
                    }
                }

            } else {

                if (arregloHoraCR[2] === "PM") {
                    if (hora === 12 || (hora >= 1 && hora <= 5)) {//tarde
                        actualizacion.consumoTarde = ConsumoReal.consumoMes;
                    } else {
                        if (hora >= 6 && hora <= 11) {//Noche
                            actualizacion.consumoNoche = ConsumoReal.consumoMes;
                        } else {
                            contError++;
                            return res.send("error 6, No se encuentra la jornada de la hora.");
                        }
                    }

                } else {
                    contError++;
                    return res.send("error 7, No se sabe si es PM o AM.");
                }
            }

            if (contError === 0) {
                //se realiza la actualización
                await Historial.findOneAndUpdate({ _id: ultimoHistorial._id }, actualizacion, function (error) {
                    if (error) {
                        return res.send("Consumo Real guardado pero, No se pudo actualizar el historial.");
                    }
                });
                this.enviarConsumoReal(correoCliente, res, ConsumoReal.consumoMes, req);
            }

        } else {//Existe ya un historial pero las fechas son diferentes
            //Puedo haber variado el dia, año o mes.
            //por lo tanto es un nuevo registro

            //Devuelve false o un documento de Historial
            let documetoHistorial = this.nuevoHistorial(ConsumoReal);

            if (documetoHistorial) {
                //Si entra, es porque no fue false, asi que tiene un documento
                let nuevoHistorial = new Historial();
                nuevoHistorial = documetoHistorial;
                //Se termina de llenar el documento
                nuevoHistorial.fecha = ConsumoReal.fecha_consumo;
                nuevoHistorial.id_medidor = ConsumoReal.id_medidor;
                nuevoHistorial.costoUnitarioKwh = costoUnitarioKwh;
                //Se guarda
                nuevoHistorial.save((error, historial) => {
                    if (error) {
                        return res.send("Consumo Real guardado pero, No se pudo guardar el historial.");
                    } else {
                        if (historial) {
                            this.enviarConsumoReal(correoCliente, res, ConsumoReal.consumoMes, req);
                        }
                    }
                });
            } else {
                return res.send("error al crear nuevo historial");
            }
        }

    }
}

ControladorConsumo.nuevoHistorial = function (consumoReal) {
    //Madrugada: 12:00-5:59 | Mañana: 6:00-11:59 | Tarde: 12:00-5:59 | Noche: 6:00-11:59
    const nuevoHistorial = new Historial();
    //Casteamos a Date para obtener la hora y asi saber en que jornada guardar.
    const fechaConsumoReal = new Date(consumoReal.fecha_consumo);
    let hora = fechaConsumoReal.getHours();
    //La hora al castearla la devuelve en formato de 24h
    //La trabajamos para dejarla en formato de 12h
    if (hora > 12) {
        hora = hora - 12;
    } else {
        if (hora === 0) {
            hora = 12;
        }
    }
    //un ejemplo de una fecha es la siguiente: "8/27/2019, 4:18:16 PM"
    //Dividimos la cadena hasta obtener el fragmento "PM"
    const arregloFecha = consumoReal.fecha_consumo.split(",");
    const arregloHora = arregloFecha[1].split(" ");

    let contError = 0;

    //arregloHora[2] = "PM" para el ejemplo anterior.
    //Ahora verificamos y añadimos el consumo en el lugar donde debe de ir.
    if (arregloHora[2] === "AM") {

        if (hora === 12 || (hora >= 1 && hora <= 5)) {//Madrugada
            nuevoHistorial.consumoMadrugada = consumoReal.consumoMes;
        } else {
            if (hora >= 6 && hora <= 11) {//Mañana
                nuevoHistorial.consumoMañana = consumoReal.consumoMes;
            } else {
                contError++;
            }
        }

    } else {
        if (arregloHora[2] === "PM") {
            if (hora === 12 || (hora >= 1 && hora <= 5)) {//tarde
                nuevoHistorial.consumoTarde = consumoReal.consumoMes;
            } else {
                if (hora >= 6 && hora <= 11) {//Noche
                    nuevoHistorial.consumoNoche = consumoReal.consumoMes;
                } else {
                    contError++;
                }
            }
        } else {
            contError++;
        }
    }

    if (contError === 0) {
        return nuevoHistorial;
    } else {
        return false;
    }
}

module.exports = ControladorConsumo;