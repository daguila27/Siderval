/*
	vistas para jefeporod
	->por producto;
	->por op;(donde esta cada op en produccion)
	->por etapa;(que se esta haciendo en cada etapa)
	planificacion es el que de prioridad a las op
*/


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
	if(usr.nombre == 'faena' || usr.nombre == 'jefeprod' || usr.nombre == 'gerencia'){
		return true;
	}else{
		return false;
	}
}


/* GET users listing. */
router.get('/', function(req, res, next) {
	if(verificar(req.session.userData)){
		/*req.getConnection(function(err, connection){
			connection.query("SELECT * FROM EtapaFaena", function(err, rows){
				if(err){console.log("Error Selecting : %s", err);}
				res.render('faena/indx', {page_title: "Faena", username: req.session.userData.nombre, thisetapa: req.params.thisetapa, uf: rows});
			});
		});*/
		var nombre;
		if(req.session.userData.nombre == 'faena'){
			nombre = 'planta';
		}
		else{
			nombre = req.session.userData.nombre;
		}
		res.render('faena/indx', {page_title: "Planta", username: nombre, proceso: req.session.myValue,etapaactual: req.session.myValue});
	}
	else{res.redirect('bad_login');}
});



router.get('/procesos', function(req, res, next){
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
		connection.query("SELECT * FROM EtapaFaena WHERE value < 8 ORDER BY value", function(err, rows){
			if(err){
				console.log("Error Selecting : %s", err);
			}
			req.session.arrayProduccion = [];
			res.render('faena/select_procesos', {data: rows},function(err,html){if(err){console.log(err)}res.send(html)});
			
		});
	});
	}
	else{res.redirect('bad_login');}
	
});

router.get('/add_notificacion/:idproduccion/:cantidad/:key', function(req,res,next){
		var input = req.params;
		var userf = input.key.substring(2,3);
		req.getConnection(function(err, connection){
			connection.query("SELECT fabricaciones.idmaterial FROM produccion LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones WHERE produccion.idproduccion = ?", [input.idproduccion], function(err, produccion){
				if(err){console.log("Error Selecting : %s", err);}
			    var idmaterial = produccion[0].idmaterial;
			    var dataInsert = {};
			    var d = new Date();
			    date = [d.getMonth()+1,
			               d.getDate(),
			               d.getFullYear()].join('/')+' '+
			              [d.getHours(),
			               d.getMinutes(),
			               d.getSeconds()].join(':');
			    dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date;
			    connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
			    	if(err){console.log("Error Selecting : %s", err);}

			    	res.send('success');
			    });

			});
		});
});

router.post("/next_step",function(req,res,next){
	if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        /*
        * input.cantprod: token separado por comas que representa el saldo disponible en cada producción (según la etapa)
        *
        * */
        /*
                * UPDATE `table` SET `uid` = CASE
                        WHEN id = 1 THEN 2952
                        WHEN id = 2 THEN 4925
                        WHEN id = 3 THEN 1592
                        ELSE `uid`
                        END
                    WHERE id  in (1,2,3)
                *  */
        input.idprod = input.idprod.split('-');
        input.cantprod = input.cantprod.split('-');
        var query = "UPDATE produccion SET produccion.`"+input.etapa_act+"` = CASE ";
        var query2 = "UPDATE produccion SET produccion.`"+input.newetapa+"` = CASE ";

        var ids = "";
        var cant_aux = parseInt(input.sendnum);
        var history = [];
        for(var w=0; w < input.idprod.length; w++){
            cant_aux -= parseInt(input.cantprod[w]);
        	if(cant_aux > 0){
        		/* SI cant_aux ES MAYOR A CERO SIGNIFICA QUE SE UTILIZO TODO EL SALDO DE LA PRODUCCION */
                query += " WHEN idproduccion ="+input.idprod[w]+" THEN 0";
                query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+input.cantprod[w];
				//history.push({idproduccion: input.idprod[w],enviados: input.cantprod[w],from: input.etapa_act,to:input.newetapa});
                history.push([input.idprod[w], input.cantprod[w], input.etapa_act, input.newetapa]);
                ids += input.idprod[w]+",";
            }
			else{
                /* EN CASO CONTRARIO QUEDA SALDO EN LA ETAPA */
				query += " WHEN idproduccion ="+input.idprod[w]+" THEN "+Math.abs(cant_aux);
                query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+(cant_aux+parseInt(input.cantprod[w]));
                //history.push({idproduccion: input.idprod[w],enviados: cant_aux+parseInt(input.cantprod[w]),from: input.etapa_act,to:input.newetapa});
                history.push([input.idprod[w], cant_aux+parseInt(input.cantprod[w]), input.etapa_act, input.newetapa]);
                ids += input.idprod[w]+",";
				break;
            }
        }
        var notif =  {cant: input.sendnum, idproduccion: input.idprod};
		query += " ELSE produccion.`"+input.etapa_act+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")"
        query2 += " ELSE produccion.`"+input.newetapa+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")"

        //SE EMITE UNA NOTIFICACION AL USUARIO FAENA
        //req.app.locals.io.emit('refreshfaena'+input.newetapa, notif);
		req.getConnection(function(err,connection){
			if(err) throw err;
			//connection.query("UPDATE produccion SET `" + input.etapa_act + "` = `" + input.etapa_act  + "` - ?,`" + input.newetapa + "` = `" + input.newetapa + "` + ? WHERE idproduccion = ?",[parseInt(input.sendnum),parseInt(input.sendnum),input.idprod],function(err,prod){
            connection.query(query ,function(err,upProd1){
                if(err) throw err;
                console.log(upProd1);

                connection.query(query2 ,function(err,upProd2){
					if(err) throw err;

					console.log(upProd2);
					connection.query("INSERT INTO produccion_history (`idproduccion`, `enviados`, `from`, `to`) VALUES ?",[history],function(err,insert_h){
						if(err) throw err;
						res.send("si");
						/*res.on('finish', function(){
							req.app.locals.io.emit('refreshfaena'+input.newetapa, notif);
							if(input.newetapa == '8'){
								res.redirect('/faena/add_notificacion/'+input.idprod+'/'+cantidad+'/idm');
								req.app.locals.io.emit('notif', notif);
							}
						});
						res.redirect('/faena/add_notificacion/'+input.idprod+'/'+cantidad+'/fa'+input.newetapa);*/

					});
				});
	        });

    })
	} else res.send("no");
});

router.get('/render_proceso/:proceso', function(req, res, next){
	if(verificar(req.session.userData)){
		var input = req.params;
		input.proceso = input.proceso.toString();
		req.session.myValue = input.proceso;
		req.getConnection(function(err, connection){
			//select * from ordenproduccion left join material on (ordenproduccion.idproducido=material.idmaterial) left join producto ON (ordenproduccion.idproducido=producto.idmaterial)
			connection.query("SELECT * FROM EtapaFaena WHERE value = ?",input.proceso, function(err, etapa){
				if(err){console.log("Error Selecting : %s", err);}
				/*connection.query("SELECT querytable.*,EtapaFaena.nombre_etapa as sigetapa FROM "+
					"(select produccion.*,coalesce(producido.ruta,'1,2,3,4,5,6,7,8') as ruta,material.detalle, Siguiente(coalesce(producido.ruta, '1,2,3,4,5,6,7,8'), '"+input.proceso+"') as nextStep from produccion"+
					" left join fabricaciones ON (produccion.idfabricaciones=fabricaciones.idfabricaciones)" +
					" left join material on (fabricaciones.idmaterial=material.idmaterial)" +
					" left join producido on (fabricaciones.idmaterial=producido.idmaterial)"+
					" WHERE produccion."+input.proceso+" > 0 AND produccion.el=false GROUP BY produccion.idproduccion ORDER BY fabricaciones.f_entrega ASC)"+
					" as querytable left join EtapaFaena ON (querytable.nextStep = EtapaFaena.`value`)",*/
					connection.query("SELECT querytable.*,EtapaFaena.nombre_etapa as sigetapa FROM "
						+"(select group_concat(produccion.idproduccion separator '-') as idproduccion,group_concat(produccion.idordenproduccion separator '-') as idordenproduccion,sum(produccion.cantidad) as cantidad ,"
						+"group_concat(produccion.1 separator '-') as prod_1,group_concat(produccion.2 separator '-') as prod_2,group_concat(produccion.3 separator '-') as prod_3,group_concat(produccion.4 separator '-') as prod_4,"
						+"group_concat(produccion.5 separator '-') as prod_5,group_concat(produccion.6 separator '-') as prod_6,group_concat(produccion.7 separator '-') as prod_7,group_concat(produccion.8 separator '-') as prod_8,"
						+"sum(produccion.`1`) as `1`,sum(produccion.`2`) as `2`,sum(produccion.`3`) as `3`,sum(produccion.`4`) as `4`,sum(produccion.`5`) as `5`,sum(produccion.`6`) as `6`,sum(produccion.`7`) as `7`,sum(produccion.`8`) as `8`,"
						+"coalesce(producido.ruta, '1,2,3,4,5,6,7,8') as ruta,material.detalle,material.idmaterial, Siguiente(coalesce(producido.ruta, '1,2,3,4,5,6,7,8'), '"+input.proceso+"') as nextStep from produccion"
						+" left join fabricaciones ON (produccion.idfabricaciones=fabricaciones.idfabricaciones) left join material on (fabricaciones.idmaterial=material.idmaterial) left join producido on (material.idmaterial=producido.idmaterial)"
						+"WHERE produccion."+input.proceso+" > 0 group by material.idmaterial ORDER BY produccion.idproduccion DESC )"
						+"as querytable left join EtapaFaena ON (querytable.nextStep = EtapaFaena.`value`) group by querytable.idmaterial",
				function(err, rows){
					if(err){
						console.log("Error Selecting : %s", err);
					}
                    var nextstep;
					for(var i = 0;i<rows.length;i++){
                        rows[i].ruta = rows[i].ruta.split(",");
                        rows[i].cant_prod = rows[i]["prod_"+input.proceso];
                        nextstep = rows[i].ruta.indexOf(input.proceso) + 1;
                        if(nextstep == rows[i].ruta.length){
							rows[i].nextstep = "bodega";
						} else rows[i].nextstep = rows[i].ruta[nextstep];
					}
					res.render('faena/render_cola', {data: rows,etapaactual:input.proceso, nombreetapa: etapa[0].nombre_etapa});
				});
			});
			
		});
	}
	else{res.redirect('bad_login');}
	
});

router.post('/startProduccion', function(req, res, next){
	if(verificar(req.session.userData)){
		var idordenproduccion = JSON.parse(JSON.stringify(req.body)).id_ordenproduccion;
		req.getConnection(function(err, connection){
			connection.query("UPDATE ordenproduccion SET estadoproduccion = 'produciendo' WHERE idordenproduccion="+idordenproduccion, function(err, rows){
				if(err){console.log("Error Selecting : %s");
					res.send("Ha ocurrido un error.");
				}
				else{
				res.send('Correcto');
				}
			});
		});
		/*var input = JSON.parse(JSON.stringify(req.body));
		var idproduccion = input.idproduccion;
		var cantidad = input.cantidad;
		var etapa = input.etapa;
		var idproducido = input.idproducido;
		console.log(idproduccion +"<=>"+cantidad);
		req.getConnection(function(err, connection){
			connection.query("SELECT cantidad FROM ordenproduccion WHERE idordenproduccion = "+idproduccion, function(err, rows){
				if(err){console.log("Error Selecting : %s", err);}
				var column = rows[0];
				console.log(rows);
				if(cantidad < column.cantidad){
					connection.query("INSERT INTO ordenproduccion (idproducido, cantidad, etapa, estadoproduccion)"
						+" VALUES ("+idproducido+", "+cantidad+", '"+etapa+"', 'produciendo')", function(err, rows){
							if(err){console.log("Error Selecting : %s", err);}
							connection.query("UPDATE ordenproduccion SET cantidad = cantidad-"+cantidad+" WHERE idordenproduccion="+idproduccion,function(err, rows){
								if(err){console.log("Error Selecting : %s", err);}
								res.send('ok');	
							});				
						});
				}
				else if(cantidad == column.cantidad){
						connection.query("UPDATE ordenproduccion SET estadoproduccion = 'produciendo' WHERE idordenproduccion="+idproduccion, function(err, rows){
							if(err){console.log("Error Selecting : %s", err);}
							res.send('ok');	
						});
				}
				else{
					res.send("Ingresa una cantidad menor o igual a la disponible.");
				}
			});
		});*/
	}
	else{res.redirect('bad_login');}
		
});

router.get('/render_notificaciones/:uservalue', function(req, res, next){
	var uv = req.params.uservalue;
	var key = "fa"+uv;
	req.getConnection(function(err,connection){
		connection.query("SELECT notificacion.*,material.detalle from notificacion "
			+ "LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial "
			+ "WHERE SUBSTRING(notificacion.descripcion,1,3) = ? AND notificacion.active = true", key, function(err, notif){
			if(err){console.log("Error Selecting : %s", err);}
			res.render('faena/notificaciones', {notif: notif})
		});
	});
});

router.get('/confirm_notificacion/:idnotificacion', function(req,res,next){
		var idnotificacion = req.params.idnotificacion;
		req.getConnection(function(err, connection){
					connection.query('UPDATE notificacion SET active = false WHERE idnotificacion = ?', [idnotificacion],function(err, notif){
						if(err){console.log("Error Selecting : %s", err);}

						if(req.session.userData.nombre == 'faena' || req.session.userData.nombre == 'jefeprod'){
							res.redirect('/faena/render_notificaciones/'+req.session.myValue);
						}
						else if(req.session.userData.nombre == 'bodega'){
					    	res.redirect('/bodega/render_notificaciones');
						}
					});	
		});
});

router.post('/report_error', function(req, res, next){
	if(verificar(req.session.userData)){
		var input = JSON.parse(JSON.stringify(req.body));
		console.log(input);
		req.getConnection(function(err, connection){
			//UPDATE `siderval`.`produccion` SET `5`='4', `standby`='1' WHERE `idproduccion`='14';
			connection.query("UPDATE produccion SET produccion."+input.thisetapa+"= produccion."+input.thisetapa+" - "+input.standby+" , standby= standby +"+input.standby+" WHERE idproduccion = ?",
			 [input.idproduccion], function(err, rows){
			 	if(err){console.log("Error Selecting : %s", err);}
			 	res.redirect('/faena/confirm_notificacion/'+input.idnotificacion);
			 });
		});
	}
	else{res.redirect('bad_login');}
});


module.exports = router;
