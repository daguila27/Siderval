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
// Enviar la vista para registrar un retiro
router.get("/crear_retiro",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT idmaterial,codigo,detalle,stock FROM material WHERE codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%'",function (err,materiales) {
                if(err) console.log(err);
                res.render("matprimas/create_retiro",{mat: materiales});
            });
        });
    } else res.redirect("/bad_login");
});
// Procesar creación de un retiro
router.post("/save_retiro",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            //req.body = { lista_m: [idmaterial1,idmaterial2],retiro_obj: { "cosas para crear el retiro" } }
            connection.query("INSERT INTO retiro SET ?",function(err,row){
                if(err) console.log(err);
                if(row.length){

                } else res.send({err: false,message: "No se pudo crear el retiro"});
            });
        });
    } else res.redirect("/bad_login");
});

module.exports = router;
