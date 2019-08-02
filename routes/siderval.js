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

/* GET users listing. */
router.get('/', function(req, res, next) {
	if(req.session.isUserLogged == true){
		res.render('siderval/indx_new', {page_title: "Siderval", username: req.session.userData.nombre});
	}
	else{
		res.redirect('/bad_login');
	}
});

module.exports = router;