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
        res.render('test/indx',{page_title:"Planificación",username: req.session.userData.nombre});}
    else{res.redirect('bad_login');}
});


module.exports = router;
