const passport = require('passport');

const ControladorAutenticacion = {};

ControladorAutenticacion.iniciarSesion = function(req, res, next){
    passport.authenticate('local', function(error, respuesta, usuario){
        if(!error){
            if(respuesta.estado){
                
                req.logIn(usuario, (error)=>{
                    if(error){ 
                        res.status(500).send({error: true, estado: false, mensaje: "Error #1 en el sistema, intente mas tarde."});
                        return next(error);
                    }else{//Si no hubo erro al loggear con passport
                        /* Se responde con exito al usuario*/
                        res.status(200).send({Error: false, Estado: true, Mensaje: "Sesion iniciada correctamentee.", EsAdmin: respuesta.esAdmi});
                    }
                });
            }else{
                res.status(401).send({error: false, estado: false, mensaje: "Correo o contraseña incorrecta, revise e intente de nuevo."});
            }
        }else{
            res.status(500).send({error: true, estado: false, mensaje: "Error #2 en el sistema, intente mas tarde."});
        }
    })(req, res, next);
}

ControladorAutenticacion.cerrarSesion = function(req, res){
    req.logOut();
    res.status(200).send({error: false, estado: true, mensaje: "Sesion cerrada correctamente."});
}

ControladorAutenticacion.estoyAutenticado = function(req){
    if(!req.isAuthenticated()){
        return false;
    }else{
        return true;
    }
}


module.exports = ControladorAutenticacion;