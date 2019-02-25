var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{
        host: '192.168.1.25',
        user: 'admin',
        password : 'tempo123',
        port : 3306,
        database:'siderval',
        insecureAuth : true

    },'pool')
);
function verificar(usr){
    if(usr.nombre === 'jefeprod' || usr.nombre === 'gerencia' || usr.nombre === 'siderval' || usr.nombre === 'jefeplanta'){
        return true;
    }else{
        return false;
    }
}

/* GET users listing. */
router.get('/', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('jefeplanta/indx_new', {page_title: "Jefe de Planta", username: req.session.userData.nombre});
    }
    else{res.redirect('bad_login');}
});
/* GET users listing. */
router.get('/stats', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Connection : %s", err);
            var fecha = new Date().getFullYear() + "-" + (new Date().getUTCMonth() + 1) + "-";
            connection.query("SELECT DATE_FORMAT(gd.fecha,'%Y-%m-%d %H:%i:%s') AS fecha,gd.idgd AS numgd,cliente.sigla," +
                "SUM(coalesce(despachos.cantidad,0)*COALESCE(material.peso,0)) AS peso,gd.estado FROM gd" +
                " LEFT JOIN despachos ON despachos.idgd = gd.idgd" +
                " LEFT JOIN cliente ON cliente.idcliente = gd.idcliente" +
                " LEFT JOIN material ON material.idmaterial = despachos.idmaterial " +
                "WHERE gd.fecha BETWEEN ? AND ? GROUP BY gd.idgd",[fecha+"01",fecha + "31"], function(err, etp){
                if(err)
                    console.log("Error Selecting : %s", err);

                res.render('jefeplanta/stats', {data: etp});
            });
        });
    }
    else{res.redirect('bad_login');}
});
module.exports = router;
