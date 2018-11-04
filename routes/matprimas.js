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
	var lista = [];
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            //req.body = { lista_m: [idmaterial1,idmaterial2],retiro_obj: { "cosas para crear el retiro" } }
            connection.query("INSERT INTO retiro SET ?",{etapa: req.body.etapa,receptor: req.body.receptor},function(err,row){
                if(err) console.log(err);
                //Revisar si se creó el retiro
                if(row){
                	if(typeof req.body['lista_m[]'] == 'string'){ // si sólo se seleccionó un material para el retiro
                		var data = {
                			cantidad: req.body['lista_v[]'],
							idmaterial: req.body['lista_m[]'],
							idretiro: row.insertId
						};
                        connection.query("INSERT INTO retiro_detalle SET ?",[data],function(err,rows){// Crear el detalle del retiro
                            if(err)console.log(err);
                            connection.query("UPDATE material SET stock = stock - ? WHERE idmaterial = ?",[req.body['lista_v[]'],req.body['lista_m[]']],function(err,rows){ //cambia el stock del único material seleccionado
                                if(err)console.log(err);
                                res.send({err:false,msg:"El retiro se registró exitosamente"});
                            });
                        });
					} else { // sis se seleccionaron mas de uno
                		var query = "UPDATE material SET stock = CASE "; //partir creando el query para actualizar el stock
                        for(var i = 0; i< req.body['lista_m[]'].length;i++){
                            lista.push([req.body['lista_v[]'][i],req.body['lista_m[]'][i],row.insertId]); // Agrupar el idmaterial con el reitro y la cantidad pedida
                            query = query + "WHEN idmaterial = " + req.body['lista_m[]'][i] + " THEN stock - " + req.body['lista_v[]'][i] + " "; // añadir CASE a la query para ajustar stocks
                        }
                        query += "end WHERE idmaterial IN ?"; //Terminar la query de actualización de stocks
                        connection.query("INSERT INTO retiro_detalle (`cantidad`,`idmaterial`,`idretiro`) VALUES ?",[lista],function(err,rows){ //insertar el detalle del retiro
                            if(err)console.log(err);
                            connection.query(query,[[req.body['lista_m[]']]],function(err,rows){// Actualizar el stock
                                if(err)console.log(err);
                                res.send({err:false,msg:"El Retiro se registró exitosamente"});
                            });
                        });
					}
                } else res.send({err: true,message: "No se pudo crear el retiro"});
            });
        });
    } else res.redirect("/bad_login");
});

module.exports = router;
