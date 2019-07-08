var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;
router.use(
    connection(mysql,dbCredentials,'pool')
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
        res.render('test/index',{page_title:"Prueba DataTable",username: req.session.userData.nombre});}
    else{res.redirect('bad_login');}
});

router.get('/table_test', function(req, res, next) {
    if(req.session.userData.nombre == 'test'){
        res.render('test/table_test', {view_tipo: 'false'});}
    else{res.redirect('bad_login');}
});


module.exports = router;
