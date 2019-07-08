var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;
router.use(
    connection(mysql,dbCredentials,'pool')
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