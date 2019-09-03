const ConsumoReal = require('../Modelos/ConsumoReal');
const Historial = require('../Modelos/Historial');

const ControladorConsumo = {};

ControladorConsumo.enviarConsumoReal = function (cliente, res, ultimoConsumo, req, costoU) {
    /* ¿El cliente que le corresponde este consumo esta activo? */
    const clientesActivos = req.app.get('clientesActivos');

    if (clientesActivos.length === 0) {

        res.send({ error: false, estado: false, mensaje: "Historial, Consumo actualizado y/o guardado con exito! Pero, No se encuentra activo el cliente." });

    } else {

        var cont = 0;

        clientesActivos.forEach((cli) => {
            /* Si esta activo, le emitimos su consumo */
            if (cli['correo_cliente'] === cliente.correo) {

                cont = cont + 1;

                const io = req.app.get('socketio');

                io.to(cli['idSocketCliente']).emit('consumoReal', ultimoConsumo);

                //Ahora se verifica si el cliente definio algun tipo de limite
                if (cliente.limite) {
                    
                    //Ahora se verifica si el consumoReal esta excediento el limite del cliente.
                    //Se alerta en caso de sobrepasar/igualar el 50, 80 y 100 % del limite.
                    if (cliente.tipoLimite === 0) {//Limite por kwh
                        if (ultimoConsumo >= (0.5 * (cliente.limite))) {
                            io.to(cli['idSocketCliente']).emit('limiteKwh', ultimoConsumo.consumoMes);
                        }
                    } else {//Limite por costo
                        if ( ( ultimoConsumo * costoU ) >= (0.5 * (cliente.limite))) {
                            io.to(cli['idSocketCliente']).emit('limiteCosto', ultimoConsumo.consumoMes);
                        }
                    }
                }

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

ControladorConsumo.registrarConsumoReal = async function (body, res, req, costoU, cliente) {
    //Lo primero es saber si es primera vez que se guarda un consumo real para el id de medidor.
    const consumoReal = await ConsumoReal.findOne({ id_medidor: body['id_medidor'] });

    const fechaMedidor = new Date(body['fecha']);

    const fechaActual = new Date().toLocaleString('en-us', { hour12: true });
    const fechaServidor = new Date(fechaActual);

    const diferenciaFechas = fechaServidor - fechaMedidor;//Diferencia en milisegundos.
    console.log("fechaServidor", fechaServidor);
    console.log("fechaMedidor", fechaMedidor);
    console.log("fechaServidor L", fechaServidor.toLocaleString('en-us', { hour12: true }));
    console.log("fechaMedidor L", fechaMedidor.toLocaleString('en-us', { hour12: true }));
    if (!consumoReal) {//Se valida la fecha y listo.

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
                    this.registrarConsumoHistorial(nuevoConsumoReal, costoU, res, req, cliente);
                }
            });

        }
    } else {//Se validan los datos con los ya guardados.

        const fechaConsumoGuardado = new Date(consumoReal.fecha_consumo);
        const diFechasConConsumo = fechaMedidor - fechaConsumoGuardado;//Diferencia en milisegundos.

        //El ultimo total de consumo enviado por el medidor es = (consumoReal.consumoMes + consumoReal.totalConsumo). consumoReal es el encontrado.
        const ultimoConsumoTotal = consumoReal.consumoMes + consumoReal.totalConsumo;

        if (diFechasConConsumo <= 0 || body['consumoTotal'] <= consumoReal.totalConsumo || body['consumoTotal'] <= ultimoConsumoTotal || diferenciaFechas < 0) {

            return res.send('Error con fechas y/o consumo. Estan manipulando al medidor.');

        } else {
            //Para saber si estoy o no en el mismo mes.
            const resta = (fechaMedidor.getMonth() + 1) - (fechaConsumoGuardado.getMonth() + 1);

            console.log("resta: ", (fechaMedidor.getMonth() + 1), " - ", (fechaConsumoGuardado.getMonth() + 1));

            if (resta > 0) {//Inicio de nuevo mes

                console.log("nuevo mes!");

                /*  consumoReal.totalConsumo = Total de consumo de los meses anteriores. */
                if (consumoReal.totalConsumo === 0) {//A penas segundo mes de consumo
                    consumoReal.totalConsumo = consumoReal.consumoMes;
                } else {
                    consumoReal.totalConsumo = ultimoConsumoTotal;
                }
            }
            /* consumoReal.consumoMes = Total de consumo del mes actual */
            /* body['consumoTotal'] = Total del consumo de todos los meses */
            consumoReal.consumoMes = body['consumoTotal'] - consumoReal.totalConsumo;
            consumoReal.fecha_consumo = body['fecha'];

            const actualizacion = {
                fecha_consumo: consumoReal.fecha_consumo,
                consumoMes: consumoReal.consumoMes,
                totalConsumo: consumoReal.totalConsumo
            }

            let cont = 0;

            await ConsumoReal.findOneAndUpdate({ id_medidor: consumoReal.id_medidor }, actualizacion, function (error) {

                if (error) {
                    cont = cont + 1;
                    return res.send('Error al intentar actualizar. No se guardo ni en historial ni fue enviado al cliente.');
                }
            });

            if (cont === 0) {
                //Registramos el consumoReal en el historial.
                this.registrarConsumoHistorial(consumoReal, costoU, res, req, cliente);
            }

        }

    }

}

ControladorConsumo.consumoReal = function (id_medidor) {
    //Busqueda y retorno del ultimo consumo guardado del idMedidor pasado.
    return ConsumoReal.findOne({ id_medidor: id_medidor });
}

ControladorConsumo.registrarConsumoHistorial = async function (ConsumoReal, costoUnitarioKwh, res, req, cliente) {
    //En esta instacia, ya se ha verificado el consumo, proveniente del medidor.
    //Ahora toca hacer las validaciones, para saber a que historial le corresponde.

    //Investigo la existencia de algun historial con el id_medidor del parametro
    //Que se supone, el ultimo registro guardado es la fecha mas reciente.
    const ultimoHistorial = await Historial.findOne({ id_medidor: ConsumoReal.id_medidor }).sort({ field: 'asc', _id: -1 }).limit(1);

    if (!ultimoHistorial) {//No hay registros de historial

        //nuevoHistorial() Devuelve false o un documento de Historial con el valor
        //lleno de la jornada del dia a la cual pertenece el consumoReal.

        let documetoHistorial = this.nuevoHistorial(ConsumoReal, false, costoUnitarioKwh);
        if (documetoHistorial) {
            //Si entra, es porque no fue false, asi que tiene un documento
            let nuevoHistorial = new Historial();
            nuevoHistorial = documetoHistorial;
            //Se guarda
            console.log(nuevoHistorial);
            nuevoHistorial.save((error, historial) => {
                if (error) {
                    return res.send("Consumo Real guardado pero, No se pudo guardar el historial.", error);
                } else {
                    if (historial) {
                        this.enviarConsumoReal(cliente, res, ConsumoReal.consumoMes, req, costoUnitarioKwh);
                    }
                }
            });
        } else {
            return res.send("error al crear nuevo historial");
        }


    } else {//Existe un historial para el medidor
        //Se comparan las fechas para saber si hay que hacer una actualización o nuevo registro de historial
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
        if (arregloFechaCR[0] === arregloFechaH[0]) {//Existe ya un historial y se va actualizar

            //Sigo dividiendo la cadena del consumo real, proveniente del medidor
            //con el fin de obtener si es "AM" o "PM"

            const arregloHoraCR = arregloFechaCR[1].split(" ");
            let actualizacion = {};
            let contError = 0;
            const consumoRealDia = ConsumoReal.consumoMes - ultimoHistorial.consumoDiasAnteriores;

            //arregloHoraCR[2] = "PM" para el ejemplo
            if (arregloHoraCR[2] === "AM") {



                if (hora === 12 || (hora >= 1 && hora <= 5)) {//Madrugada OK

                    actualizacion.consumoMadrugada = consumoRealDia;
                    actualizacion.totalConsumoDia = actualizacion.consumoMadrugada;

                } else {
                    if (hora >= 6 && hora <= 11) {//Mañana OK
                        //Se resta lo consumido en la madrugada
                        if (ultimoHistorial.consumoMadrugada) {// Quiere decir que este historial se creo en la madrugada.
                            actualizacion.consumoMañana = consumoRealDia - ultimoHistorial.consumoMadrugada;
                            actualizacion.totalConsumoDia = ultimoHistorial.consumoMadrugada + actualizacion.consumoMañana;
                        } else {// Quiere decir que este historial se creo en la mañana.
                            actualizacion.consumoMañana = consumoRealDia;
                            actualizacion.totalConsumoDia = actualizacion.consumoMañana;
                        }

                    } else {
                        contError++;
                        return res.send("error 5, No se encuentra la hora en el dia.");
                    }
                }

            } else {

                if (arregloHoraCR[2] === "PM") {
                    if (hora === 12 || (hora >= 1 && hora <= 5)) {//tarde OK
                        //Se resta lo consumido en la mañana
                        if (ultimoHistorial.consumoMañana && ultimoHistorial.consumoMadrugada) {
                            actualizacion.consumoTarde = consumoRealDia - ultimoHistorial.consumoMañana - ultimoHistorial.consumoMadrugada;
                            actualizacion.totalConsumoDia = ultimoHistorial.consumoMañana + ultimoHistorial.consumoMadrugada + actualizacion.consumoTarde;
                        } else {
                            if (ultimoHistorial.consumoMañana) {//Es decir, no existe un consumoMadrugada
                                actualizacion.consumoTarde = consumoRealDia - ultimoHistorial.consumoMañana;
                                actualizacion.totalConsumoDia = ultimoHistorial.consumoMañana + actualizacion.consumoTarde;
                            } else {
                                if (ultimoHistorial.consumoMadrugada) {//Es decir, no existe un consumoMañana
                                    actualizacion.consumoTarde = consumoRealDia - ultimoHistorial.consumoMadrugada;
                                    actualizacion.totalConsumoDia = ultimoHistorial.consumoMadrugada + actualizacion.consumoTarde;
                                } else {//Es decir, no existe consumoMañana ni consumoMadrugada
                                    actualizacion.consumoTarde = consumoRealDia;
                                    actualizacion.totalConsumoDia = actualizacion.consumoTarde;
                                }
                            }
                        }
                    } else {
                        if (hora >= 6 && hora <= 11) {//Noche OK
                            //Se resta lo consumido en la tarde
                            if (ultimoHistorial.consumoTarde && ultimoHistorial.consumoMañana && ultimoHistorial.consumoMadrugada) {
                                actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoTarde - ultimoHistorial.consumoMañana - ultimoHistorial.consumoMadrugada;
                                actualizacion.totalConsumoDia = ultimoHistorial.consumoTarde + ultimoHistorial.consumoMañana + ultimoHistorial.consumoMadrugada + actualizacion.consumoNoche;
                            } else {
                                if (ultimoHistorial.consumoMañana && ultimoHistorial.consumoMadrugada) {
                                    actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoMañana - ultimoHistorial.consumoMadrugada;
                                    actualizacion.totalConsumoDia = ultimoHistorial.consumoMañana + ultimoHistorial.consumoMadrugada + actualizacion.consumoNoche;
                                } else {
                                    if (ultimoHistorial.consumoTarde && ultimoHistorial.consumoMañana) {
                                        actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoTarde - ultimoHistorial.consumoMañana;
                                        actualizacion.totalConsumoDia = ultimoHistorial.consumoTarde + ultimoHistorial.consumoMañana + actualizacion.consumoNoche;
                                    } else {
                                        if (ultimoHistorial.consumoTarde && ultimoHistorial.consumoMadrugada) {
                                            actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoTarde - ultimoHistorial.consumoMadrugada;
                                            actualizacion.totalConsumoDia = ultimoHistorial.consumoTarde + ultimoHistorial.consumoMadrugada + actualizacion.consumoNoche;
                                        } else {
                                            if (ultimoHistorial.consumoTarde) {
                                                actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoTarde;
                                                actualizacion.totalConsumoDia = ultimoHistorial.consumoTarde + actualizacion.consumoNoche;
                                            } else {
                                                if (ultimoHistorial.consumoMañana) {
                                                    actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoMañana;
                                                    actualizacion.totalConsumoDia = ultimoHistorial.consumoMañana + actualizacion.consumoNoche;
                                                } else {
                                                    if (ultimoHistorial.consumoMadrugada) {
                                                        actualizacion.consumoNoche = consumoRealDia - ultimoHistorial.consumoMadrugada;
                                                        actualizacion.totalConsumoDia = ultimoHistorial.consumoMadrugada + actualizacion.consumoNoche;
                                                    } else {
                                                        actualizacion.consumoNoche = consumoRealDia;
                                                        actualizacion.totalConsumoDia = actualizacion.consumoNoche;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
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
                this.enviarConsumoReal(cliente, res, ConsumoReal.consumoMes, req, costoUnitarioKwh);
            }

        } else {//Existe ya un historial pero es un nuevo dia
            //Puedo haber variado el dia, año o mes.
            //por lo tanto es un nuevo registro

            //Devuelve false o un documento de Historial
            let documetoHistorial = this.nuevoHistorial(ConsumoReal, ultimoHistorial, costoUnitarioKwh);

            if (documetoHistorial) {
                //Si entra, es porque no fue false, asi que tiene un documento
                let nuevoHistorial = new Historial();
                nuevoHistorial = documetoHistorial;
                //Se guarda
                nuevoHistorial.save((error, historial) => {
                    if (error) {
                        console.log(error);
                        return res.send("Consumo Real guardado pero, No se pudo guardar el historial.");
                    } else {
                        if (historial) {
                            this.enviarConsumoReal(cliente, res, ConsumoReal.consumoMes, req, costoUnitarioKwh);
                        }
                    }
                });
            } else {
                return res.send("error al crear nuevo historial");
            }
        }

    }
}

ControladorConsumo.nuevoHistorial = function (consumoReal, historialAyer, costoUnitarioKwh) {
    //Madrugada: 12:00 AM - 5:59 AM | Mañana: 6:00 AM - 11:59 AM | Tarde: 12:00 PM - 5:59 PM | Noche: 6:00 PM - 11:59 PM

    const nuevoHistorial = new Historial();

    //Se llenan los campos que son por obligación
    nuevoHistorial.fecha = consumoReal.fecha_consumo;
    nuevoHistorial.id_medidor = consumoReal.id_medidor;
    nuevoHistorial.costoUnitarioKwh = costoUnitarioKwh;

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
    let consumoRealDia = 0;

    if (historialAyer) {
        let mesCR = fechaConsumoReal.getMonth() + 1;
        let mesHayer = new Date(historialAyer.fecha).getMonth() + 1;
        console.log("mes del historial: ", mesHayer);
        if (mesCR === mesHayer) {
            nuevoHistorial.consumoDiasAnteriores = historialAyer.consumoDiasAnteriores + historialAyer.totalConsumoDia;
        } else {
            nuevoHistorial.consumoDiasAnteriores = 0;
        }
        consumoRealDia = consumoReal.consumoMes - nuevoHistorial.consumoDiasAnteriores;

    }


    //arregloHora[2] = "PM" para el ejemplo anterior.
    //Ahora verificamos y añadimos el consumo en el lugar donde debe de ir.
    if (arregloHora[2] === "AM") {

        if (hora === 12 || (hora >= 1 && hora <= 5)) {//Madrugada OK
            if (historialAyer) {
                nuevoHistorial.consumoMadrugada = consumoRealDia;
                nuevoHistorial.totalConsumoDia = nuevoHistorial.consumoMadrugada;
            } else {
                nuevoHistorial.consumoMadrugada = consumoReal.consumoMes;
                nuevoHistorial.totalConsumoDia = consumoReal.consumoMes;
                nuevoHistorial.consumoDiasAnteriores = 0;
            }

        } else {
            if (hora >= 6 && hora <= 11) {//Mañana OK
                if (historialAyer) {
                    nuevoHistorial.consumoMañana = consumoRealDia;
                    nuevoHistorial.totalConsumoDia = nuevoHistorial.consumoMañana;
                } else {
                    nuevoHistorial.consumoMañana = consumoReal.consumoMes;
                    nuevoHistorial.totalConsumoDia = consumoReal.consumoMes;
                    nuevoHistorial.consumoDiasAnteriores = 0;
                }

            } else {
                contError++;
            }
        }

    } else {
        if (arregloHora[2] === "PM") {
            if (hora === 12 || (hora >= 1 && hora <= 5)) {//tarde OK
                if (historialAyer) {
                    nuevoHistorial.consumoTarde = consumoRealDia;
                    nuevoHistorial.totalConsumoDia = nuevoHistorial.consumoTarde;
                } else {
                    nuevoHistorial.consumoTarde = consumoReal.consumoMes;
                    nuevoHistorial.totalConsumoDia = consumoReal.consumoMes;
                    nuevoHistorial.consumoDiasAnteriores = 0;
                }

            } else {
                if (hora >= 6 && hora <= 11) {//Noche OK
                    if (historialAyer) {
                        nuevoHistorial.consumoNoche = consumoRealDia;
                        nuevoHistorial.totalConsumoDia = nuevoHistorial.consumoNoche;
                    } else {
                        nuevoHistorial.consumoNoche = consumoReal.consumoMes;
                        nuevoHistorial.totalConsumoDia = consumoReal.consumoMes;
                        nuevoHistorial.consumoDiasAnteriores = 0;
                    }

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

ControladorConsumo.buscarHistorial = function (id_medidor) {
    return Historial.find({ id_medidor: id_medidor });
}

module.exports = ControladorConsumo;