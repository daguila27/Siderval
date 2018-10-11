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
	if(usr.nombre == 'dm'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(verificar(req.session.userData)){
		
    res.render('dm/indx', {page_title: "Data manager", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});


router.post('/material_pendiente', function(req, res, next){
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
		connection.query("SELECT idmaterial,detalle FROM material WHERE estado = 'dmCho'", function(err, rows){
			if(err){console.log("Error Selecting : %s", err);}
			res.render('dm/material_pendiente', {data: rows});
		});
	});
	}
	else{res.redirect('bad_login');}	
});


router.get('/updateMaterial/:idmaterial', function(req,res,next){
	if(verificar(req.session.userData)){}
	else{res.redirect('bad_login');}	
	var input = req.params;
	req.getConnection(function(err, connection){
		//UPDATE `siderval`.`material` SET `estado`='fin' WHERE `idmaterial`='2';
		connection.query("UPDATE material SET estado = 'fin' WHERE idmaterial='"+input.idmaterial+"'", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
				res.send('error');
			}
			else{
				res.redirect("/dm/render_material");
			}
		});
	});
});


router.get('/rejectMaterial/:idmaterial', function(req,res,next){	
	if(verificar(req.session.userData)){

		var input = req.params;
	req.getConnection(function(err, connection){
		//UPDATE `siderval`.`material` SET `estado`='fin' WHERE `idmaterial`='2';
		connection.query("UPDATE material SET estado = 'plan' WHERE idmaterial='"+input.idmaterial+"'", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
				res.send('error');
			}
			else{
				res.redirect("/dm/render_material");
			}
		});
	});
	}
	else{res.redirect('bad_login');}	
	
});

router.get('/render_material', function(req, res, next){
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
		connection.query("SELECT idmaterial,detalle FROM material WHERE estado = 'dmCho'", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
			}
			else{
				res.render("dm/render_material", {data: rows});
			}
			});
		});

	}
	else{res.redirect('bad_login');}	
	
});
module.exports = router;
