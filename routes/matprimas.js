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
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(verificar(req.session.userData)){
    	res.render('matprimas/indx_new', {page_title: "Materias Primas", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});


module.exports = router;
