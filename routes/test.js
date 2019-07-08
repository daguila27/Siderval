var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{
        host: 'localhost',
        user: 'user',
        password : '1234',
        port : 3306,
        database:'siderval',
        insecureAuth : true
    },'pool')
);
function verificar(usr){
    if(usr.nombre == 'plan' || usr.nombre == 'gerencia' || usr.nombre == 'abastecimiento' || usr.nombre == 'siderval'){
        return true;
    }else{
        return false;
    }
}

function parsear_crl(nro){
    x = nro.toString();
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var num =  parts.join(",");
    return num;
}


/* GET users listing. */
router.get('/', function(req, res, next) {
    if(req.session.userData.nombre == 'test'){
        res.render('test/index');
    }
    else{res.redirect('bad_login');}
});


/* GET users listing. */
router.get('/get_data', function(req, res, next) {
    if(req.session.userData.nombre === 'test'){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection : %s", err);}
            connection.query("select codigo, detalle, precio as unidad from material LIMIT 50", function(err, data){
                if(err){console.log("Error Selecting : %s", err);}
                res.render('test/example', {datos: data});
            });
        });
    }
    else{res.redirect('bad_login');}
});

/* GET users listing. */
router.get('/get_data_material/:detalle', function(req, res, next) {
    if(req.session.userData.nombre === 'test'){
        var d = req.params.detalle;
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection : %s", err);}
            connection.query("SELECT codigo, detalle, precio as unidad FROM material WHERE material.detalle LIKE '%"+d+"%' LIMIT 50", function(err, data){
                if(err){console.log("Error Selecting : %s", err);}
                res.render('test/example_table', {datos: data});
            });
        });
    }
    else{res.redirect('bad_login');}
});


module.exports = router;
