const ConsumoReal = require('../Modelos/ConsumoReal');
const Historial = require('../Modelos/Historial');
const Alerta = require('../Modelos/Alerta');

const ControladorConsumo = {};

ControladorConsumo.eliminarClienteAlerta = async (correo) => {
    let estado = null;
    await Alerta.findOneAndDelete({ correoCliente: correo }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    });
    return estado;
}

ControladorConsumo.reestablecerAlertas = async (correo) => {
    let estado = null;
    await Alerta.findOneAndUpdate({ correoCliente: correo }, { alerta_1: false, alerta_2: false, alerta_3: false, alerta_4: false, alerta_5: false }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    });
    return estado;
}

ControladorConsumo.eliminarClienteConsumoReal = async (id_medidor) => {
    let estado = null;
    await ConsumoReal.findOneAndDelete({ id_medidor: id_medidor }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    });
    return estado;
}

ControladorConsumo.eliminarClienteHistorial = async (id_medidor) => {
    let estado = null;
    await Historial.deleteMany({ id_medidor: id_medidor }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    });
    return estado;
}

ControladorConsumo.actualizarIDMedidorCReal = async (id_medidor, nuevoId) => {
    let estado = null;
    ConsumoReal.updateMany({ id_medidor: id_medidor }, { id_medidor: nuevoId }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    })
    return estado;
}

ControladorConsumo.actualizarIDMedidorHistorial = async (id_medidor, nuevoId) => {
    let estado = null;
    Historial.updateMany({ id_medidor: id_medidor }, { id_medidor: nuevoId }, (error, doc) => {
        if (error) {
            estado = false;
        } else if (doc) {
            estado = true;
        }
    })
    return estado;
}


ControladorConsumo.buscarAlertaCorreo = (correo) => {
    return Alerta.findOne({ correoCliente: correo });
}

ControladorConsumo.crearAlerta = async (body, res) => {
    const alerta = await Alerta.findOne({ correoCliente: body.correoCliente });
    if (!alerta) {
        let nuevoLimite = new Alerta();
        nuevoLimite.correoCliente = body['correoCliente'];
        nuevoLimite.limite = body['limite'];
        nuevoLimite.tipoLimite = body['tipoLimite'];
        nuevoLimite.alerta_1 = false;
        nuevoLimite.alerta_2 = false;
        nuevoLimite.alerta_3 = false;
        nuevoLimite.alerta_4 = false;
        nuevoLimite.alerta_5 = false;

        nuevoLimite.save((err) => {
            if (err) {
                console.log('error al registrar: ', err);
                return res.status(500).send({ error: true, estado: false, mensaje: "Error al intentar crear Alerta" });
            } else {
                console.log('registrada la alerta!');
                return res.status(200).send({ error: false, estado: true, mensaje: "Registro exitoso!" });
            }
        });
    } else {
        return res.status(401).send({ error: false, estado: false, mensaje: "El cliente ya cuenta con una alerta definida!" });
    }


}


ControladorConsumo.actualizarLimite = (correo, body, res) => {

    let actualizacion = {};
    actualizacion.limite = body['limite'];
    actualizacion.tipoLimite = body['tipoLimite'];

    Alerta.findOneAndUpdate({ correoCliente: correo }, actualizacion, (error, alerta) => {
        if (error) {
            return res.status(500).send({ error: true, estado: false, mensaje: "Error #5 en el sistema, intente mas tarde." });
        } else {
            if (alerta) {
                return res.status(200).send({ error: false, estado: true, mensaje: "Alerta actualizada!" });
            } else {
                return res.status(400).send({ error: false, estado: false, mensaje: "No existe la alerta" });
            }
        }
    });
}

//Metodo encargado de notificar al usuario sobre su consumo y limite en tiempo real.
ControladorConsumo.enviarConsumoReal = (cliente, res, ultimoConsumo, req, costoU, limite) => {
    console.log("-----------------------ControladorConsumo.enviarConsumoReal----------------------");
    //Se verifica si el cliente que fue encontrado por medio del id_medidor que envoó el software del medidor inteligente esta activo o no.
    //Para ello se obtiene una lista de clientes activos que corre de forma local en tiempo de ejecución
    /* ¿El cliente que le corresponde este consumo esta activo? */
    console.log("Verificando la lista de clientes activos...");
    const clientesActivos = req.app.get('clientesActivos');

    if (clientesActivos.length === 0) {//Si la lista de clientes activos esta vacia, pues se le responde al software del medidor que todo esta OK excepto la notificación del usuario.
        console.log("Lista de clientes activo vacia.");
        res.send({ error: false, estado: false, mensaje: "El consumo fue guardado y/o actualizado con exito en el sistema. Pero el cliente no esta activo, por lo tanto no fue notificado." });

    } else {//La lista tiene clientes activos, ahora se busca alguno que coincida con el correo del cliente encontrado por el id_medidor.
        console.log("Lista de clientes activos NO esta vacia: ");
        console.log(req.app.get('clientesActivos'));

        //Contadores que ayudan a validar de algun error o si ya fue enviado algun mensaje al software del medidor inteligente.
        var cont = 0;
        var contadorAlertaEnviada = 0;
        console.log("Recorriendo la lista de clientes activos...")
        clientesActivos.forEach((cli) => {//Recirremos el array de clientes activos
            /* Si esta activo, le emitimos su consumo */

            if (cli['correo_cliente'] === cliente.correo) {//El cliente esta activo, por lo tanto se procede a emitir por socket su consumoReal
                console.log("Encontre al cliente.");
                cont = cont + 1;

                const io = req.app.get('socketio');
                //Se emite el consumo y costo del kw en tiempo real por socket.
                console.log("Emitiendo consumo y costo del kw por socket...");
                io.to(cli['idSocketCliente']).emit('consumoReal', { ultimoConsumo, costoU });

                //Ahora se verifica si el cliente definio algun tipo de limite de consumo
                console.log("Verificando que el cliente tenga definido algun limite de consumo...");
                if (limite) {
                    console.log("El cliente ha definido un limite: ");
                    console.log(limite)
                    //Cuerpo de la notificación que se le enviará al cliente si solo si esta excediendo su limite en algunos % especificos.
                    let notificacion = {
                        limte: 0,
                        consumo: 0,
                        costo: 0
                    }
                    notificacion.mensaje = "Alerta: Has superado el 50% de tu limite";
                    io.to(cli['idSocketCliente']).emit('limiteKwh', notificacion);
                    console.log("Verificando que el cliente este excediendo el 50, 80 y 100% del limite propuesto...")
                    //Se alerta en caso de sobrepasar/igualar el 50, 80 y 100 % del limite.
                    if (limite.limite > 0) {

                        console.log("Limite en -> " + limite.limite);

                        notificacion.limite = limite.limite;
                        notificacion.consumo = ultimoConsumo;
                        notificacion.costo = ultimoConsumo * costoU;

                        let actualizacion;

                        console.log("Alerta 1 -> " + limite.alerta_1);
                        if (!limite.alerta_1) {//Alerta sobre el 50%
                            console.log("verificando que el limite este superando el 50% -> UC " + ultimoConsumo);
                            console.log("verificando que el limite este superando el 50% -> TL " + limite.tipoLimite);
                            notificacion.mensaje = "Alerta: Has superado el 50% de tu limite";
                            if (limite.tipoLimite === 0) {//Limite por kwh
                                console.log("verificando que el limite este superando el 50% -> OP " + ultimoConsumo + " >= " + (0.5 * (limite.limite)) + " && " + ultimoConsumo + " < " + (0.6 * (limite.limite)));
                                if (ultimoConsumo >= (0.5 * (limite.limite)) && ultimoConsumo < (0.6 * (limite.limite))) {
                                    console.log("lo supero el 50%")
                                    io.to(cli['idSocketCliente']).emit('limiteKwh', notificacion);
                                    //Marcar como alerta enviada
                                    contadorAlertaEnviada++;
                                    actualizacion = { alerta_1: true }
                                }
                            } else {//Limite por costo
                                if ((ultimoConsumo * costoU) >= (0.5 * (limite.limite))) {
                                    io.to(cli['idSocketCliente']).emit('limiteCosto', notificacion);
                                    //Marcar como alerta enviada
                                    contadorAlertaEnviada++;
                                    actualizacion = { alerta_1: true }
                                }
                            }
                        } else {
                            console.log("Alerta 2 -> " + limite.alerta_2);
                            if (!limite.alerta_2) {//Alerta sobre el 60%
                                console.log("verificando que el limite este superando el 60% -> UC " + ultimoConsumo);
                                console.log("verificando que el limite este superando el 60% -> TL " + limite.tipoLimite);
                                notificacion.mensaje = "Alerta: Has superado el 60% de tu limite";
                                if (limite.tipoLimite === 0) {//Limite por kwh
                                    console.log("verificando que el limite este superando el 60% -> OP " + ultimoConsumo + " >= " + (0.6 * (limite.limite)) + " && " + ultimoConsumo + " < " + (0.7 * (limite.limite)));
                                    if (ultimoConsumo >= (0.6 * (limite.limite)) && ultimoConsumo < (0.7 * (limite.limite))) {
                                        console.log("lo supero el 60%")
                                        io.to(cli['idSocketCliente']).emit('limiteKwh', notificacion);
                                        //Marcar como alerta enviada
                                        contadorAlertaEnviada++;
                                        actualizacion = { alerta_2: true }
                                    }
                                } else {//Limite por costo
                                    if ((ultimoConsumo * costoU) >= (0.6 * (limite.limite))) {
                                        io.to(cli['idSocketCliente']).emit('limiteCosto', notificacion);
                                        //Marcar como alerta enviada
                                        contadorAlertaEnviada++;
                                        actualizacion = { alerta_2: true }
                                    }
                                }
                            } else {
                                console.log("Alerta 3 -> " + limite.alerta_3);
                                if (!limite.alerta_3) {//Alerta sobre el 70%
                                    notificacion.mensaje = "Alerta: Has superado el 70% de tu limite";
                                    console.log("verificando que el limite este superando el 70% -> UC " + ultimoConsumo);
                                    console.log("verificando que el limite este superando el 70% -> TL " + limite.tipoLimite);
                                    if (limite.tipoLimite === 0) {//Limite por kwh

                                        console.log("verificando que el limite este superando el 70% -> OP " + ultimoConsumo + " >= " + (0.7 * (limite.limite)) + " && " + ultimoConsumo + " < " + (0.8 * (limite.limite)));
                                        if (ultimoConsumo >= (0.7 * (limite.limite)) && ultimoConsumo < (0.8 * (limite.limite))) {
                                            console.log("lo supero el 70%")
                                            io.to(cli['idSocketCliente']).emit('limiteKwh', notificacion);
                                            //Marcar como alerta enviada
                                            contadorAlertaEnviada++;
                                            actualizacion = { alerta_3: true }
                                        }
                                    } else {//Limite por costo
                                        if ((ultimoConsumo * costoU) >= (0.7 * (limite.limite))) {
                                            io.to(cli['idSocketCliente']).emit('limiteCosto', notificacion);
                                            //Marcar como alerta enviada
                                            contadorAlertaEnviada++;
                                            actualizacion = { alerta_3: true }
                                        }
                                    }
                                } else {
                                    console.log("Alerta 4 -> " + limite.alerta_4);
                                    if (!limite.alerta_4) {//Alerta sobre el 80%
                                        notificacion.mensaje = "Alerta: Has superado el 80% de tu limite";
                                        console.log("verificando que el limite este superando el 80% -> UC " + ultimoConsumo);
                                        console.log("verificando que el limite este superando el 80% -> TL " + limite.tipoLimite);
                                        if (limite.tipoLimite === 0) {//Limite por kwh
                                            console.log("verificando que el limite este superando el 80% -> OP " + ultimoConsumo + " >= " + (0.8 * (limite.limite)) + " && " + ultimoConsumo + " < " + (0.9 * (limite.limite)));
                                            if (ultimoConsumo >= (0.8 * (limite.limite)) && ultimoConsumo < (0.9 * (limite.limite))) {
                                                console.log("lo supero el 80%")
                                                io.to(cli['idSocketCliente']).emit('limiteKwh', notificacion);
                                                //Marcar como alerta enviada
                                                contadorAlertaEnviada++;
                                                actualizacion = { alerta_4: true }
                                            }
                                        } else {//Limite por costo
                                            if ((ultimoConsumo * costoU) >= (0.8 * (limite.limite))) {
                                                io.to(cli['idSocketCliente']).emit('limiteCosto', notificacion);
                                                //Marcar como alerta enviada
                                                contadorAlertaEnviada++;
                                                actualizacion = { alerta_4: true }
                                            }
                                        }
                                    } else {
                                        console.log("Alerta 5 -> " + limite.alerta_5);
                                        if (!limite.alerta_5) {//Alerta sobre el > 90%
                                            notificacion.mensaje = "Alerta: Has superado mas del 90% de tu limite";
                                            console.log("verificando que el limite este superando el 90% -> UC " + ultimoConsumo);
                                            console.log("verificando que el limite este superando el 90% -> TL " + limite.tipoLimite);
                                            if (limite.tipoLimite === 0) {//Limite por kwh
                                                console.log("verificando que el limite este superando el 89% -> OP " + ultimoConsumo + " >= " + (0.9 * (limite.limite)));
                                                if (ultimoConsumo >= (0.9 * (limite.limite))) {
                                                    console.log("lo supero el 90%")
                                                    io.to(cli['idSocketCliente']).emit('limiteKwh', notificacion);
                                                    //Marcar como alerta enviada
                                                    contadorAlertaEnviada++;
                                                    actualizacion = { alerta_5: true }
                                                }
                                            } else {//Limite por costo
                                                if ((ultimoConsumo * costoU) >= (0.9 * (limite.limite))) {
                                                    io.to(cli['idSocketCliente']).emit('limiteCosto', notificacion);
                                                    //Marcar como alerta enviada
                                                    contadorAlertaEnviada++;
                                                    actualizacion = { alerta_5: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (contadorAlertaEnviada > 0) {//Se le envió una alerta por socket ahora se debe actualizar el documento Alerta para indicar que alerta fue enviada y no saturar al cliente con mas alerta de lo mismo.
                            console.log("Se ha enviado una aleta al cliente. Ahora se intentará actualizar el documento Alerta del cliente...");
                            Alerta.findOneAndUpdate({ correoCliente: cliente.correo }, actualizacion, (error) => {
                                if (error) {//Error al intentar actualizar al documento Alerta
                                    res.send({ mensaje: "El consumo fue guardado y/o actualizado con exito en el sistema. Al igual que fue notificado el cliente con exito. Pero ocurrió un error al intentar actualizar el docuemento Alerta del cliente." });
                                    console.log("Error al intentar actualizar el documento Alerta => " + error);
                                } else {//Proceso total con exito.
                                    res.send({ mensaje: "El consumo fue guardado y/o actualizado con exito en el sistema. Al igual que fue notificado el cliente con exito." })
                                }
                            });
                        }
                    }
                }
                if (contadorAlertaEnviada === 0) {//No tiene un limite de consumo el cliente
                    res.send({ mensaje: "El consumo fue guardado y/o actualizado con exito en el sistema. El cliente no cuenta con un limite de consumo definido o no esta superando el 50 80 100%." });
                }
            }

        });

        if (cont === 0) {//La lista de clientes activos no esta vacia pero de igual forma no esta el cliente activo.
            res.send({ error: false, estado: false, mensaje: "El consumo fue guardado y/o actualizado con exito en el sistema. Pero el cliente no esta activo, por lo tanto no fue notificado." });
        }
    }

    console.log("-----------------------FIN ControladorConsumo.enviarConsumoReal----------------------");
}

ControladorConsumo.buscarConsumoReal = function (idMedidor) {
    return ConsumoReal.findOne({ id_medidor: idMedidor });
}

//Metodo encargado de validar la veracidad del consumo que envia el medidor, guardar un consumo llamado consumoReal y de solicitar el registro en el historial.
ControladorConsumo.registrarConsumoReal = async function (body, res, req, costoU, cliente, limite) {
    console.log("-----------------------ControladorConsumo.registrarConsumoReal----------------------");
    //Lo primero es conocer si es primera vez que se guarda un consumo real para el id de medidor.
    //Esto con el fin de validar si es un guardado o actualización. Solo es un documento de consumoReal por usuario.
    console.log("Verificando la existencia de algun consumo real con id_medidor => " + body['id_medidor']);
    const consumoReal = await ConsumoReal.findOne({ id_medidor: body['id_medidor'] });
    //Se convierte la fecha que envia el software del medidor inteligente a formato Date, para que sea facil su tratado en Js.
    console.log("Convirtiendo la fecha que envia el software del medidor inteligente...");
    const fechaMedidor = new Date(body['fecha']);
    console.log("Esta es la fecha que envia el software del medidor inteligente => " + fechaMedidor);
    //Se obtiene la fecha actual del servidor en formato de 12 horas.
    console.log("Obteniendo la fecha actual del servidor...");
    const fechaActual = new Date().toLocaleString('en-us', { hour12: true });
    const fechaServidor = new Date(fechaActual);
    console.log("Esta es la fecha del servidor => " + fechaServidor);
    //Se realiza una comparación entre las fechas para calcular el tiempo transcurrido desde el envio hasta la recepción del consumo proveniente del software del medidor inteligente.
    //const diferenciaFechas = fechaServidor - fechaMedidor;//Diferencia en milisegundos.
    const diferenciaFechas = 0;//Se obtuvieron errores al realizar la diferencia, puesto que las fechas actuales en los ordenadores (el del software del medidor y del servidor) podrian ser diferentes por segundos y eso devuelve una diferencia en negativo.

    if (!consumoReal) {//Si no existe un consumo real almacenado entonces se realiza el guardado del mismo si pasa las validaciones
        console.log("No existe un consumo real.");
        /* 
        - Si la diferenciaFechas es menor a cero, quiere decir que la fecha
        entrante del medidor, es mayor a la actual. (Fecha erronea o lentitud en la red)
        - La comunicación debe ser en el mismo dia. 24h = 86400000 ms 
        1 min = 60000 ms. El retraso como mucho debe de ser de menos de un minuto
        */
        //Se valida que consumo que se pretende guardar no sea negativo
        console.log("Validando que el consumo que envia el medidor inteligente sea mayor a cero...");
        if (diferenciaFechas < 0 || diferenciaFechas > 60000 || body['consumoTotal'] < 0) {
            //No se debe retardar por mas de 5 segundos o inclusio milisegundos.
            //Si el retardo es mas de 5 mininutos implementar otra solución.
            console.log("El consumo que envia el medidor no es valido.");
            return res.send('ConsumoTotal es menor a cero o tiempo de envio excedido.');
        } else {//Si el consumo real es valido se procede a crea un documento del modelo ConsumoReal y se almacena en la base de datos.
            console.log("Creando objeto de consumo real...");
            const nuevoConsumoReal = new ConsumoReal();
            //Se convierte la fecha del medidor a datos mas entendibles para el usuario del sistema.
            nuevoConsumoReal.fecha_consumo = fechaMedidor.toLocaleString('en-us', { hour12: true });
            nuevoConsumoReal.consumoMes = body['consumoTotal'];
            nuevoConsumoReal.id_medidor = body['id_medidor'];
            nuevoConsumoReal.totalConsumo = 0;
            //Se intenta guardar el objeto creado
            console.log("Intentado guardar el consumoReal...");
            await nuevoConsumoReal.save((error) => {
                if (error) {//Si ocurre algun error se le notifica al medidor.
                    console.log("Error al intentar almacenar el objeto consumoReal. Este es: ");
                    console.log(nuevoConsumoReal);
                    return res.send('Error al guardar el consumo');
                } else {//Se almacenó sin ningun problema el objeto consumoReal. Se solicita que se haga su registro en el historial.
                    console.log("ConsumoReal almacenado sin errores, ahora se solicita que se registre el historial de este consumo. Este es el consumoReal: ");
                    console.log(nuevoConsumoReal);
                    this.registrarConsumoHistorial(nuevoConsumoReal, costoU, res, req, cliente, limite);
                }
            });

        }
    } else {//Si existe un consumoReal se procede a realizar una validación con el encontrado y si todo esta OK se actualiza.
        console.log("Existe un consumoReal es este: ");
        console.log(consumoReal);
        //Se convierte la fecha a Date para su mejor trato en Js
        const fechaConsumoGuardado = new Date(consumoReal.fecha_consumo);
        //Se realiza una resta entre la fecha que envia el medidor inteligente con la del objeto hallado.
        const diFechasConConsumo = fechaMedidor - fechaConsumoGuardado;//Diferencia en milisegundos.
        console.log("Diferencia entre la fecha que envia el medidor con la del consumoReal encontrado => " + diFechasConConsumo);
        //El ultimo total de consumo enviado por el medidor es = (consumoReal.consumoMes + consumoReal.totalConsumo). consumoReal es el encontrado.
        const ultimoConsumoTotal = consumoReal.consumoMes + consumoReal.totalConsumo;
        //Se valida que el consumoTotal proveniente del medidor inteligente sea mayor al que conoce el sistema y que la fecha que envia el medidor sea mayor a la guardada.
        console.log("Validando datos del consumo y fechas provenientes del medidor inteligente...");
        if (diFechasConConsumo <= 0 || body['consumoTotal'] <= consumoReal.totalConsumo || body['consumoTotal'] <= ultimoConsumoTotal || diferenciaFechas < 0) {
            console.log("Error con fechas y/o consumo ... ")
            return res.send('Error con fechas y/o consumo. La fecha del medidor inteligentes es menor al consumoReal guardado en el sistema y/o el consumoTotal del medidor es menor o igual al que dispone el sistema.');
        } else {//Todo esta OK ahora se verifica si el mes de la fecha que trae el medidor inteligente es diferente al que tiene el consumoReal. Esto con el fin de alamcenar el consumo del mes pasado (ConsumoReal) y resstablecer las alertas.
            console.log("Validación exitosa, ahora se verifica si es un nuevo mes o es el mismo...");
            //Para saber si estoy o no en el mismo mes.
            const resta = (fechaMedidor.getMonth() + 1) - (fechaConsumoGuardado.getMonth() + 1);

            console.log("resta de meses (Mes de medidor - Mes de ConsumoReal): ", (fechaMedidor.getMonth() + 1), " - ", (fechaConsumoGuardado.getMonth() + 1));

            if (resta > 0) {//Inicio de un nuevo mes

                console.log("Estamos en un nuevo mes, se reestableceran las alertas y se almacena el consumo del mes menor.");
                //Estamos en un nuevo mes, se reestableceran las alertas y se almacena el consumo del mes menor.
                //reestablece las alertas
                await this.reestablecerAlertas(cliente.correo);

                if (consumoReal.totalConsumo === 0) {//A penas es el segundo mes de consumo y el consumoTotal entonces será el mismo del mes.
                    consumoReal.totalConsumo = consumoReal.consumoMes;
                } else {//El total de consumo será igual al consumo del mes anterior mas el consumo se los meses anteriores a el.
                    consumoReal.totalConsumo = ultimoConsumoTotal;
                }
            }
            /* consumoReal.consumoMes = Total de consumo del mes actual */
            /* body['consumoTotal'] = Total del consumo de todos los meses anteriores al del mes en curso */
            consumoReal.consumoMes = body['consumoTotal'] - consumoReal.totalConsumo;
            consumoReal.fecha_consumo = body['fecha'];
            console.log("Todo OK se procede a crear el objeto de actualización...")
            const actualizacion = {
                fecha_consumo: consumoReal.fecha_consumo,
                consumoMes: consumoReal.consumoMes,
                totalConsumo: consumoReal.totalConsumo
            }
            console.log("Objeto de la actualización:");
            console.log(actualizacion);
            let cont = 0;
            //Intentamos actualizar el consumoReal encontrado
            await ConsumoReal.findOneAndUpdate({ id_medidor: consumoReal.id_medidor }, actualizacion, function (error) {

                if (error) {
                    cont++;
                    console.log("Error al actualizar el consumoReal => " + error);
                    return res.send('Error al intentar actualizar el consumoReal. No se guardo ni en historial ni fue enviado al cliente.');
                } else {//Se actualizó con exito el consumoReal ahora se registra en el historial
                    console.log("Se actualizó con exito el consumoReal, ahora se debe almacenar en el historial");
                }
            });

            if (cont === 0) {
                //Registramos el consumoReal en el historial.
                console.log("Se llama al metodo registrarConsumoHistorial");
                this.registrarConsumoHistorial(consumoReal, costoU, res, req, cliente, limite);
            }

        }

    }
    console.log("-------------------FIN registrarConsumoReal--------------------------");
}

ControladorConsumo.consumoReal = function (id_medidor) {
    //Busqueda y retorno del ultimo consumo guardado del idMedidor pasado.
    return ConsumoReal.findOne({ id_medidor: id_medidor });
}

//Metodo encargado de validar un consumoReal que envia el metodo registrarConsumoReal con el fin de almacenar o actualizar un documento Historial y de solicitar el envio de datos al cliente por socket.
ControladorConsumo.registrarConsumoHistorial = async function (ConsumoReal, costoUnitarioKwh, res, req, cliente, limite) {
    console.log("-----------------------ControladorConsumo.registrarConsumoHistorial----------------------");
    //En esta instacia, ya se ha verificado el consumo, proveniente del medidor en el metodo que raliza el registro del consumoReal.
    //Ahora toca hacer las validaciones, para saber a que historial le corresponde.

    //Investigo la existencia de algun ultimo historial con el id_medidor del parametro
    //Que se supone, el ultimo registro guardado en la base de datos contiene la fecha mas reciente.
    console.log("Se busca algun ultimno historial almacena con el id_medidor => " + ConsumoReal.id_medidor);
    const ultimoHistorial = await Historial.findOne({ id_medidor: ConsumoReal.id_medidor }).sort({ field: 'asc', _id: -1 }).limit(1);

    if (!ultimoHistorial) {//No hay registros de algun historial
        console.log("No existe registros de historiales. Se creará uno nuevo y se intentará almacenar en la base de datos");
        //Creamos un documento de Historial y se intenta guardar en la base de datos
        //nuevoHistorial() Devuelve false o un documento de Historial con el valor
        //lleno de la jornada del dia a la cual pertenece el consumoReal.
        console.log("Se identificará algunos datos del historial como la jornada AM o PM si es Tarde, mañana, Noche, Madrugada...");
        let documetoHistorial = this.nuevoHistorial(ConsumoReal, false, costoUnitarioKwh);
        if (documetoHistorial) {//Si logró ubicar la jornada (AM PM Tarde, Noche, Madrugada...) del dia que pertece al consumoReal que almacenará entonces se guarda.
            console.log("Se logro identificar lo siguiente: ");
            console.log(documetoHistorial);
            //Si entra, es porque cargo un documento. Se reutiliza la información y se intenta guardar
            let nuevoHistorial = new Historial();
            nuevoHistorial = documetoHistorial;
            console.log("Se intenta almacenar el documento Historial en la base de datos...");
            //Se intenta almacenar el objeto Historial en la base de datos
            nuevoHistorial.save((error, historial) => {
                if (error) {
                    console.log("Error al intentar almacenar el documento historial en la base de datos. => " + error);
                    return res.send("Consumo Real guardado pero, No se pudo guardar el historial.", error);
                } else {
                    if (historial) {//Historial almacenado con exito, se intentará enviar al usuario final por socket.
                        console.log("Historial almacenado con exito!");
                        this.enviarConsumoReal(cliente, res, ConsumoReal.consumoMes, req, costoUnitarioKwh, limite);
                    } else {//No se pudo guardar el documento.
                        console.log("No se logró guardar el documento Historial");
                        return res.send("No se pudo guardar el nuevo historial.");
                    }
                }
            });
        } else {//Si no logra ubicar la jornada (AM PM Tarde, Noche, Madrugada...)
            console.log("No se logró identificar datos basicos del historial.");
            return res.send("error al crear nuevo historial");
        }


    } else {//Existe un historial para el medidor
        console.log("Existen registros de historiales.");
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
        console.log("Se obtienen las fechas del consumoReal enviado y del historial encontrado.");
        console.log(arregloFechaCR[0]);
        console.log(arregloFechaH[0]);
        console.log("Se comparan las fechas para identificar si hay que actualizar o crear un nuevo historial")
        if (arregloFechaCR[0] === arregloFechaH[0]) {//El historial tiene las mismas fechas, es decir que es el mismo dia por lo tanto se va a actualizar. (Se crea un historial por dia consumido).
            console.log("Estamos en las misma fecha... se actualizará el historial.");
            //Sigo dividiendo la cadena del consumo real, proveniente del medidor
            //con el fin de obtener si es "AM" o "PM"
            console.log("Se verifica la jornada de la fecha del consumoReal")
            const arregloHoraCR = arregloFechaCR[1].split(" ");
            let actualizacion = {};
            let contError = 0;
            const consumoRealDia = ConsumoReal.consumoMes - ultimoHistorial.consumoDiasAnteriores;
            console.log("Esta es la jornada => " + arregloHoraCR[2]);
            //arregloHoraCR[2] = "PM" para el ejemplo
            if (arregloHoraCR[2] === "AM") {//Se busca la jornada para calcular el consumo del dia. (Si ya existe un consumo en la jornada anterior se le debe restar... ej: si estas en la tarde se le debe restarlo consumido en la mañana y madrugada, si solo si, se cosumió en esas jornadas.)

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
                        } else {//La fecha del consumoReal no se identifico con alguna jornada.
                            console.log("La fecha del consumoReal no se identifico con alguna jornada")
                            contError++;
                            return res.send("error 6, No se encuentra la jornada de la hora.");
                        }
                    }

                } else {//No se pudo identificar si la hora de la fecha esta en AM o PM
                    console.log("No se pudo identificar si la hora de la fecha esta en AM o PM")
                    contError++;
                    return res.send("error 7, No se sabe si es PM o AM.");
                }
            }

            if (contError === 0) {//No ocurruó algun percance y se logró identificar la jornada con su consumo real.
                let cont = 0;
                console.log("Este es lo que se actualizará del historial:");
                console.log(actualizacion);
                //se intenta realizar la actualización del historial
                await Historial.findOneAndUpdate({ _id: ultimoHistorial._id }, actualizacion, function (error) {
                    if (error) {//Error al intentar actualizar el historial
                        cont++;
                        console.log("Error al intentar actualizar el historial => " + error);
                        return res.send("Consumo Real guardado pero, No se pudo actualizar el historial.");
                    }
                });
                if (cont === 0) {//Todo OK se debe ahora enviar el consumoReal al cliente por socket
                    console.log("Historial actualizado con exito! Ahora se envia el consumoReal al cliente.");
                    this.enviarConsumoReal(cliente, res, ConsumoReal.consumoMes, req, costoUnitarioKwh, limite);
                }
            }

        } else {//Existe ya un historial pero es un nuevo dia
            console.log("Es un nuevo dia, las fechas no son iguales");
            //Puedo haber variado el dia, año o mes.
            //por lo tanto es un nuevo registro

            //Devuelve false o un documento de Historial
            console.log("Intento identificar la jornada AM o PM tarde, noche...");
            let documetoHistorial = this.nuevoHistorial(ConsumoReal, ultimoHistorial, costoUnitarioKwh);

            if (documetoHistorial) {//No hubo error al identificar la jornada
                console.log("Esto es lo que se logro identificar: ");
                console.log(documetoHistorial);
                //Se reutiliza el documento y se intenta guardar en la base de datos.
                let nuevoHistorial = new Historial();
                nuevoHistorial = documetoHistorial;
                //Se intenta guardar
                console.log("Se intenta guardar el docuemnto historial creado.");
                nuevoHistorial.save((error, historial) => {
                    if (error) {
                        console.log("Error al intentar guardar el objeto historial => " + error);
                        return res.send("Consumo Real guardado pero, No se pudo guardar el historial.");
                    } else {
                        if (historial) {//Todo OK se debe enviar el consumoReal al cliente por socket
                            console.log("Historial guardado con exito! Ahora se envia el consumoReal al cliente.");
                            this.enviarConsumoReal(cliente, res, ConsumoReal.consumoMes, req, costoUnitarioKwh);
                        }
                    }
                });
            } else {//No se logró identicar la jornada del consumoReal
                console.log("No se logró identicar la jornada del consumoReal")
                return res.send("error al crear nuevo historial");
            }
        }

    }
    console.log("-------------------FIN ControladorConsumo.registrarConsumoHistorial--------------------------");
}

ControladorConsumo.nuevoHistorial = function (consumoReal, historialAyer, costoUnitarioKwh) {
    console.log("-------------------ControladorConsumo.nuevoHistorial--------------------------");
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

    if (historialAyer) {//Si existe es porque se le envio un historial de lo contrario estan creadon un historial nuevo
        let mesCR = fechaConsumoReal.getMonth() + 1;
        let mesHayer = new Date(historialAyer.fecha).getMonth() + 1;
        console.log("mes del historial: ", mesHayer);
        if (mesCR === mesHayer) {//Estamos en el mismo mes, obtengo los dis consumidos del mes y se los sumo al total consumo dia. Asi obtengo lo que se consumió hasta el dia anterior a la fecha.
            nuevoHistorial.consumoDiasAnteriores = historialAyer.consumoDiasAnteriores + historialAyer.totalConsumoDia;
        } else {//es el inicio de un nuevo mes, no debe existir consumo de dias anteriores. (Se reinicia)
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