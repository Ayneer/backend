const passport = require('passport');

const ControladorAutenticacion = {};

ControladorAutenticacion.iniciarSesion = function (req, res, next, clientesActivos) {
    //Si el correo del usuario cliente se encuentra en la lista de correos activos, quiere decir, que tiene la sesion iniciada.
    let cont = 0;
    clientesActivos.forEach((cli) => {

        if (cli['correo_cliente'] === req.body['correo']) {
            cont = cont + 1;
        }

    });
    if (cont === 0) {//No tiene la sesion iniciada el usuario cliente. Puede iniciar sesion
        passport.authenticate('local', function (error, respuesta, usuario) {
            if (!error) {

                console.log(respuesta);

                if (respuesta.estado) {

                    req.logIn(usuario, (error) => {
                        if (error) {
                            console.log(error);
                            return res.status(500).send({ error: true, estado: false, mensaje: "Error #1 en el sistema, intente mas tarde." });
                        } else {//Si no hubo error al loggear con passport
                            /* Se responde con exito al usuario*/
                            console.log("Nueva sesion iniciada");
                            return res.status(200).send({usuario: usuario, activo: respuesta.activo, Error: false, Estado: true, Mensaje: "Sesion iniciada correctamente. Si eres cliente, por favor enviar correo por socket." });
                        }
                    });
                } else {
                    return res.status(401).send({ error: false, estado: false, mensaje: "Correo o contraseña incorrecta, revise e intente de nuevo." });
                }
            } else {
                return res.status(500).send({ error: true, estado: false, mensaje: "Error #2 en el sistema, intente mas tarde." });
            }
        })(req, res, next);
    } else {
        res.status(401).send({ error: false, estado: false, mensaje: "No puedes tener dos sesiones abiertas!!" });
    }

}

ControladorAutenticacion.cerrarSesion = function (req, res) {
    console.log("antes"+req.user);
    req.logOut();
    console.log("antes"+req.user);
    return res.status(200).send({ error: false, estado: true, mensaje: "Sesion cerrada correctamente." });
}

ControladorAutenticacion.estoyAutenticado = function (req) {
    if (!req.isAuthenticated()) {
        return false;
    } else {
        return true;
    }
}


module.exports = ControladorAutenticacion;