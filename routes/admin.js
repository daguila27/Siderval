var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');


router.use(

	connection(mysql, {
		  host: '127.0.0.1',
		  user: 'admin',
		  password: 'tempo123',
		  port: 3306,
		  database: 'siderval',
  		insecureAuth : true
	}, 'pool')
);
function verificar(usr){
	if(usr.nombre == 'gerencia'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	
	if(verificar(req.session.userData)){
		res.render('admin/indx', {page_title: "Gerencia", username: req.session.userData.nombre});
	}
	else{
		res.redirect('/bad_login');
	}
});

















router.get('/render_admin', function(req, res, next) {
	req.getConnection(function(err, connection){
		connection.query("SELECT * FROM user", function(err, rows){
			if(err)
				console.log("Error Selecting : %s", err);
			
			res.render('admin/cuentas_fragment', {data: rows});
		})
	});
});




router.get('/render_tabla', function(req, res, next){
	res.render('admin/tabla_ficha');
});









router.get('/render_material', function(req, res, next){
	req.getConnection(function(err, connection){
		connection.query("SELECT idmaterial,detalle FROM material WHERE estado = 'geCho'", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
			}
			else{
				res.render("admin/render_material", {data: rows});
			}
		});
	});
});



router.get('/material_pendiente', function(req, res, next){
	req.getConnection(function(err, connection){
		connection.query("SELECT idmaterial,detalle FROM material WHERE estado = 'geCho'", function(err, rows){
			if(err){console.log("Error Selecting : %s", err);}
			res.render('admin/material_pendiente', {data: rows});
		});
	});
});



router.get('/updateMaterial/:idmaterial', function(req,res,next){
	var input = req.params;
	req.getConnection(function(err, connection){
		//UPDATE `siderval`.`material` SET `estado`='fin' WHERE `idmaterial`='2';
		connection.query("UPDATE material SET estado = 'dmCho' WHERE idmaterial='"+input.idmaterial+"'", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
				res.send('error');
			}
			else{
				res.redirect("/gerencia/render_material");
			}
		});
	});
});


router.get('/rejectMaterial/:idmaterial', function(req,res,next){
	var input = req.params;
	req.getConnection(function(err, connection){
		//UPDATE `siderval`.`material` SET `estado`='fin' WHERE `idmaterial`='2';
		connection.query("UPDATE material SET estado = 'plan' WHERE idmaterial='"+input.idmaterial+"'", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
				res.send('error');
			}
			else{
				res.redirect("/gerencia/render_material");
			}
		});
	});
});

module.exports = router;
