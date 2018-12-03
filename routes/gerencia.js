var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{

        host: '127.0.0.1',
        user: 'admin',
        password : 'tempo123',
        port : 3306,
        database:'siderval',
        insecureAuth : true

    },'pool')

);

function verificar(usr){
    if(usr.nombre == 'matprimas'){
        return true;
    }else{
        return false;
    }
}

//
router.get("/")

module.exports = router;
