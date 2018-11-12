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
	if(usr.nombre == 'bodega' || usr.nombre == 'plan'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(verificar(req.session.userData)){
    	res.render('bodega/indx', {page_title: "Bodega", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});

router.get('/crear_gdd', function(req, res, next){
    if(verificar(req.session.userData)){
        req.session.arraydespacho = [];
        req.getConnection(function(err, connection){
            connection.query("SELECT MAX(iddespacho) as id FROM despacho", function(err, num){
                if(err)
                    console.log("Error Selecting : %s", err);

                num = num[0].id+1;
                connection.query("SELECT * FROM cliente", function(err, cli){
                    if(err)
                        console.log("Error Selecting : %s", err);

                    connection.query("select fabricaciones.idorden_f as numof, cliente.idcliente,pedido.idpedido as idfabricaciones,pedido.numitem as numitem,pedido.cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                        +"odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                        +" left join odc on odc.idodc=pedido.idodc left join cliente on cliente.idcliente=odc.idcliente left join producido on producido.idmaterial=material.idmaterial left join fabricaciones on fabricaciones.idpedido = pedido.idpedido left join"
                        +" ordenfabricacion on fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                        +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) where pedido.despachados!=pedido.cantidad group by pedido.idpedido order by pedido.f_entrega asc",
                        function(err, rows){
                            if(err)
                                console.log("Error Selecting :%s", err);

        					res.render('bodega/g_despacho', {data: rows, num: num, blanco: 0, cli: cli});
                            //res.render('jefeprod/ordenes_produccion', {data: rows});

                        });
                });
            });
            
        });
    }
    else{res.redirect('bad_login');}

});
//Buscador de materiales para traslado en vista Crear GDD (pestaña insumos)
router.get('/buscar_insumos/:detalle', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("select * from material where (material.tipo='M' OR material.tipo='I' OR material.tipo='O' OR material.tipo='X') AND detalle like ? ORDER BY idmaterial",
                ["%"+req.params.detalle+"%"],
                function(err, insum){
                    if(err)
                        console.log("Error Selecting :%s", err);

                    res.render('bodega/tabla_insumos', {insum: insum});
            });         
        });
    }
    else{res.redirect('bad_login');}

});

router.get('/view_despachos', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('bodega/view_despachos');
    }
    else{res.redirect('bad_login');}

});

router.post('/buscar_despacho_list', function(req, res, next){
  if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var orden = input.orden;
        var tipo = input.tipo;
        console.log(clave);
        console.log(tipo);

        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM despacho WHERE despacho.iddespacho LIKE '%"+clave+"%' AND despacho.estado LIKE '%"+tipo+"%'",
                function(err, desp){
                    if(err) throw err;
                    res.render('bodega/table_despachos', {desp: desp, key: orden.replace(' ', '-')});
            });
        });
    }
  else{res.redirect('bad_login');}  
});

router.post('/table_despachos', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));

        var orden = input.orden.replace('-', ' ');
        var clave = input.clave;
        var tipo = input.tipo;
        var where = " WHERE (despacho.mat_token LIKE '%"+clave+"%' OR despacho.iddespacho LIKE '%"+clave+"%') AND despacho.estado LIKE '%"+tipo+"%'";
        console.log(clave+"-"+tipo+"-"+orden);
        console.log(where);
        var query = "SELECT despacho.*, coalesce(mat_token, 'Nulo') FROM despacho"+where+" ORDER BY "+orden;
        console.log(query);
        req.getConnection(function(err, connection){
            connection.query("SELECT * FROM despacho"+where+" ORDER BY "+orden,function(err, desp){
                if(err)
                    console.log("Error Selecting :%s", err);

                // console.log(desp);
                res.render('bodega/table_despachos', {desp: desp, key: orden.replace(' ', '-')});
            });         
        });
    }
    else{res.redirect('bad_login');}

});

router.post('/saveStateGDBD', function(req, res, next){
    if(verificar(req.session.userData)){
        var data = JSON.parse(JSON.stringify(req.body));
        var token = data['estado']+"@"+data['obs']+"@";
        if(data["idped[]"]){
            if(typeof data['idped[]'] == "string"){
                token += data['idped[]']+","+data['cants[]']+"@";
            }
            else{
                for(var e=0; e < data['idped[]'].length; e++){
                    token += data['idped[]'][e]+","+data['cants[]'][e]+"@";
                }
            }
        }
        token = token.substring(0, token.length-1);
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Connection : %s", err);

            //INSERT INTO `siderval`.`save` (`token`) VALUES ('DDQWD');
            connection.query("INSERT INTO save (llave,token) VALUES ?",[[['gd',token]]], function(err, inSave){
                if(err)
                    console.log("Error Insert : %s", err);
                res.send('ok');
            });
        });
    }
    else{res.redirect('bad_login');}

});

router.get('/loadStateGDBD', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Selecting : %s",err);
            connection.query("select save.* from save inner join (SELECT max(idsave) as ids, max(ult_save) as last_save FROM save where llave = 'gd' group by save.llave) as ult on ult.ids = save.idsave", function(err,estado){
                if(err)
                    console.log("Error Selecting : %s", err);
                var token = estado[0].token;
                var datos;
                console.log(token.split('@'));
                if(token.split('@').length > 2){
                    console.log("Con productos");
                    token = token.split('@');
                    datos = { 
                        estado: token[0], 
                        obs: token[1], 
                        'idped[]': [],
                        'cants[]': []
                    };
                    for(var r=2; r < token.length; r++){
                        datos['idped[]'].push(token[r].split(',')[0]);
                        datos['cants[]'].push(token[r].split(',')[1]);
                    }
                    datos['dets[]'] = [];
                    datos['stock[]'] = [];
                    datos['sinenv[]'] = [];
                    var query_pedidos = '';
                    for(var u=0; u<datos['idped[]'].length; u++){
                        if(u == 0){
                            query_producto = "SELECT * FROM pedido left join material on pedido.idmaterial=material.idmaterial";
                            query_producto += " WHERE pedido.idpedido = "+datos['idped[]'][u];
                        }
                        else{
                            query_producto += " OR pedido.idpedido = "+datos['idped[]'][u];
                        }
                        
                        datos['dets[]'].push('');
                        datos['stock[]'].push('');
                        datos['sinenv[]'].push('');
                    }
                    connection.query(query_producto, function(err, productos){
                                if(err)
                                    console.log("Error Selecting : %s", err);
                                
                                if(productos){
                                    for(var y=0; y < productos.length; y++){
                                        for(var t=0; t < datos['dets[]'].length; t++){
                                            if(datos['idped[]'][t] == productos[y].idpedido){
                                                datos['dets[]'][t] = productos[y].detalle;
                                                datos['stock[]'][t] = productos[y].stock;
                                                datos['sinenv[]'][t] = productos[y].cantidad - productos[y].despachados;
                                            }
                                        }
                                    }
                                }
                                console.log(datos);
                                res.render('bodega/session_stream',{data:datos});
                                        //res.render('plan/formped_state',{data: datos, cli: cli});
                            });
                 
                }
                else{
                    console.log("Sin productos");
                    datos = { estado: token.split('@')[0], obs: token.split('@')[1] };

                    res.render('bodega/session_stream',{data:datos});
                    //res.render('bodega/formgd_state',{data: datos});
                        
                }
            }); 
        });
    }
    else{res.redirect('bad_login');}

});

router.post('/crear_gdd_fill', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var where = "WHERE internalquery.detalle LIKE '%"+input.detalle+"%' OR concat(repeat('0', abs(6 - length(internalquery.numordenfabricacion))),internalquery.numordenfabricacion ) LIKE '%"+input.detalle+"%' OR internalquery.anom LIKE '%"+input.detalle+"%' OR internalquery.f_entrega LIKE '%"+input.detalle+"%' OR internalquery.cantidad-internalquery.despachados LIKE '%"+input.detalle+"%' OR concat(repeat('0', abs(6 - length(internalquery.numof))),internalquery.numof ) LIKE '%"+input.detalle+"%'";
        if(input.detalle != ''){
            where += " OR internalquery.detalle = '"+input.detalle+"' OR concat(repeat('0', abs(6 - length(internalquery.numordenfabricacion))),internalquery.numordenfabricacion ) = '"+input.detalle+"' OR internalquery.anom = '"+input.detalle+"' OR internalquery.f_entrega = '"+input.detalle+"' OR internalquery.cantidad-internalquery.despachados = '"+input.detalle+"' OR concat(repeat('0', abs(6 - length(internalquery.numof))),internalquery.numof ) = '"+input.detalle+"'";
        }
        req.getConnection(function(err, connection){
            connection.query("SELECT MAX(iddespacho) as id FROM despacho", function(err, num){
                if(err)
                    console.log("Error Selecting : %s", err);
                num = num[0].id+1;
                connection.query("SELECT * FROM (select cliente.idcliente,fabricaciones.idorden_f as numof,pedido.idpedido as idfabricaciones,pedido.numitem as numitem,pedido.cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                    +"odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                    +" left join odc on odc.idodc=pedido.idodc left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                    +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) left join fabricaciones on fabricaciones.idpedido = pedido.idpedido left join cliente on cliente.idcliente=odc.idcliente where pedido.despachados!=pedido.cantidad group by pedido.idpedido order by "+input.fill+" "+input.orden+") as internalquery "+where,
                    function(err, rows){
                        if(err)
                            console.log("Error Selecting :%s", err);

                        console.log(rows);
                        res.render('bodega/g_despacho_table', {data: rows});
                        //res.render('jefeprod/ordenes_produccion', {data: rows});

                    });
            });
            
        });
    }
    else{res.redirect('bad_login');}

});

router.post('/add_despacho', function(req, res, next){
    console.log(req.body);
    req.session.arraydespacho.push(req.body);
    console.log(req.session.arraydespacho);
    res.render('bodega/session_stream',{data:req.session.arraydespacho});
});

router.post('/drop_despacho', function(req,res,next){
    var idfab = JSON.parse(JSON.stringify(req.body)).idfab;
    console.log(idfab);
    console.log(req.session.arraydespacho);
    if(req.session.arraydespacho.length == 1){
        req.session.arraydespacho = [];
        console.log(req.session.arraydespacho);
        res.render('bodega/session_stream',{data:req.session.arraydespacho});
    }
    else{
        for(var e=0; e < req.session.arraydespacho.length; e++){
            if(idfab == req.session.arraydespacho[e].id ){
                req.session.arraydespacho = req.session.arraydespacho.splice(e,1);
                break;
            }
        }
        console.log(req.session.arraydespacho);
        res.render('bodega/session_stream',{data:req.session.arraydespacho});
    }
    
});

router.post('/save_gdd', function(req, res, next){
    var arrayDBP = [];
    var query = '';
    var token = "";
    var token2 = "";
    var tokenid = "";
    var tokenidf = "";
    var input = JSON.parse(JSON.stringify(req.body));
    var boolinsumo = input.insu;
    var ope;
    var ope2;
    switch(input.estado){
        case "Devolucion":
            ope = '+';
            ope2 = '-';
            break;
        case "Traslado":
        case "Venta":
        case "Otro":
        case "Blanco":
        default:
            ope = '-';
            ope2 = '+';
    }
    //console.log(typeof req.body['list[]']);
    if(typeof req.body['list[]'] == "string"){
        req.body['list[]'] = [req.body['list[]']];
	}

    req.getConnection(function(err, connection){
		if(err)
			console.log("Error Selecting : %s", err);
        for(var i=0; i<req.session.arraydespacho.length; i++ ){
			query += "UPDATE pedido SET despachados=despachados"+ope2+req.body['list[]'][i]+
				" WHERE idpedido="+req.session.arraydespacho[i].id+"@";
            query += "UPDATE material SET stock=stock"+ope+req.body['list[]'][i]+
                " WHERE idmaterial="+req.session.arraydespacho[i].idmat+"@";
            token += req.session.arraydespacho[i].detalle + "@@";
            token2 += req.body['list[]'][i] + ",";
            tokenid += req.session.arraydespacho[i].idmat + "@";
            tokenidf += req.session.arraydespacho[i].id + "@";
		}
		query = query.substring(0, query.length-1) + '';
        token = token.substring(0, token.length-2) + '';
        token2 = token2.substring(0, token2.length-1) + '';
        tokenid = tokenid.substring(0, tokenid.length-1)+'';
        tokenidf = tokenidf.substring(0, tokenidf.length-1)+'';
        var idof;
        console.log(query);
        if(req.session.arraydespacho.length==0){idof=0;}
        else{idof=req.session.arraydespacho[0].idof;}
        arrayDBP.push([new Date().toLocaleString(),idof,token,token2,tokenid,tokenidf, input.estado,input.obs]);
		query = query.split('@');
		connection.query("INSERT INTO despacho (`fecha`, `idorden_f`,`mat_token`,`cant_token`, `id_token`, `idf_token`,`estado`,`obs`) VALUES ?", [arrayDBP], function(err, producciones){
			if(err){
				console.log("Error Selecting : %s", err);
				res.send("Error");
			}
			else{
                if(input.estado != "Blanco"){
                    console.log("No es blanco!");
    				for(var j=0; j < query.length; j++){
    					connection.query(query[j], function(err, rows){
    						if(err){
    							console.log("Error Selecting : %s", err);
    						}
    					});

    				}
                }
                else{
                    console.log("es blanco!");
                }
				req.session.arraydespacho = [];
                if(boolinsumo == '0'){
                    /*SETEANDO ESTADO FINAL DE OC*/
                    connection.query("SELECT * FROM (select odc.idodc,sum(pedido.cantidad) = sum(pedido.despachados) as completo, max(pedido.f_entrega) as ult_fecha from odc left join pedido on pedido.idodc= odc.idodc "
                            +"left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente group by odc.idodc) as group_odc left join (select "
                            +"max(despacho.fecha) as ult_desp,despacho.idorden_f from despacho group by despacho.idorden_f) as despachos on (despachos.idorden_f=group_odc.idodc) where group_odc.idodc = ?",[idof],
                            function (err,odc){
                                if(err) console.log("Select Error: %s",err);
                                if(odc[0].completo){
                                    console.log(odc);
                                    /*SI SE HA COMPLETADO LA ODC SE MARCA COMO ATRASO O A TIEMPO*/
                                    if(odc[0].ult_desp > odc[0].ult_fecha){
                                        /*SE MARCA ATRASADO*/
                                        connection.query("UPDATE odc SET estado = 'atraso' WHERE idodc = ?", [idof], function(err, upOdc){
                                            if(err)
                                                console.log("Error Selecting : %s", err);

                                            console.log(upOdc);
                                            res.redirect('/bodega/show_despachos');

                                        });
                                    }
                                    else{
                                        /*SE MARCA ok*/
                                        connection.query("UPDATE odc SET estado = 'ok' WHERE idodc = ?", [idof], function(err, upOdc){
                                            if(err)
                                                console.log("Error Selecting : %s", err);

                                            console.log(upOdc);
                                            res.redirect('/bodega/show_despachos');
                                        });
                                    }
                                }
                                else{
                                    console.log("ODC NO COMPLETADA!!");
                                    res.redirect('/bodega/show_despachos');
                                } 
                    });
                }
                else{
                    res.redirect('/bodega/show_despachos');
                }

			}
		});
	});
});

router.post('/act_gdd', function(req, res, next){
    var arrayDBP = [];
    var query = '';
    var token = "";
    var token2 = "";
    var tokenid = "";
    var tokenidf = "";
    var input = JSON.parse(JSON.stringify(req.body));
    var ope;
    var ope2;
    switch(input.estado){
        case "Devolucion":
            ope = '+';
            ope2 = '-';
            break;
        case "Traslado":
        case "Venta":
        case "Otro":
        case "Blanco":
        default:
            ope = '-';
            ope2 = '+';
    }
    //console.log(typeof req.body['list[]']);
    if(typeof req.body['list[]'] == "string"){
        req.body['list[]'] = [req.body['list[]']];
    }

    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s", err);
        for(var i=0; i<req.session.arraydespacho.length; i++ ){
            query += "UPDATE pedido SET despachados=despachados"+ope2+req.body['list[]'][i]+
                " WHERE idpedido="+req.session.arraydespacho[i].id+"@";
            query += "UPDATE material SET stock=stock"+ope+req.body['list[]'][i]+
                " WHERE idmaterial="+req.session.arraydespacho[i].idmat+"@";
            token += req.session.arraydespacho[i].detalle + "@@";
            token2 += req.body['list[]'][i] + ",";
            tokenid += req.session.arraydespacho[i].idmat + "@";
            tokenidf += req.session.arraydespacho[i].id + "@";
        }
        query = query.substring(0, query.length-1) + '';
        token = token.substring(0, token.length-2) + '';
        token2 = token2.substring(0, token2.length-1) + '';
        tokenid = tokenid.substring(0, tokenid.length-1)+'';
        tokenidf = tokenidf.substring(0, tokenidf.length-1)+'';
        var idof;
        if(req.session.arraydespacho.length==0){idof=0;}
        else{idof=req.session.arraydespacho[0].idof;}
        //arrayDBP.push([idof,token,token2,tokenid,tokenidf, input.estado,input.obs]);

        query = query.split('@');
        connection.query("UPDATE despacho SET  `last_mod` = CURRENT_TIMESTAMP, `idorden_f`=?, `mat_token`=?,`cant_token`=?, `id_token`=?, `idf_token`=?,`estado`=?,`obs`=?  WHERE iddespacho = ?",
            [idof, token, token2, tokenid, tokenidf, input.estado, input.obs, input.idgdd], function(err, producciones){
            if(err){
                console.log("Error Selecting : %s", err);
                res.send("Error");
            }
            else{
                if(input.estado != "Blanco"){
                    console.log("No es blanco!");
                    for(var j=0; j < query.length; j++){
                        connection.query(query[j], function(err, rows){
                            if(err){
                                console.log("Error Selecting : %s", err);
                            }
                        });

                    }
                }
                else{
                    console.log("es blanco!");
                }
                req.session.arraydespacho = [];
                res.redirect('/bodega/show_despachos');
            }
        });
    });
});

router.post('/anular_gdd', function(req, res, next){
    var input = JSON.parse(JSON.stringify(req.body));
    var iddespacho = input.id;
    var value = parseInt(input.val);
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s", err);
        connection.query("SELECT * FROM despacho WHERE iddespacho = ?", [iddespacho], function(err, desp){
            if(err)
                console.log("Error Selecting : %s", err);
            var upf = desp[0].idf_token.split('@');
            var upc = desp[0].cant_token.split(',');
            var upm = desp[0].id_token.split('@');
            var upfquery = '';
            var upmquery = '';
            var oper; 
            if(value == 1){oper = '-';}
            else{oper = '+';}
            for(var i=0; i < upf.length; i++){
                upfquery += "UPDATE pedido SET despachados = despachados "+oper+" "+upc[i]+" WHERE idpedido = "+upf[i]+"@";
                upmquery += "UPDATE material SET stock = stock + "+upc[i]+" WHERE idmaterial = "+upm[i]+"@";
            }
            upfquery = upfquery.substring(0, upfquery.length-1)+'';
            upmquery = upmquery.substring(0, upmquery.length-1)+'';
            upfquery = upfquery.split('@');
            upmquery = upmquery.split('@');
            console.log(upfquery);
            console.log(upmquery);
            connection.query("UPDATE despacho SET estado = ? WHERE iddespacho = ?", ["Anulado",iddespacho],function(err, up){
                if(err)
                    console.log("Error Selecting : %s", err);
                for(var j=0; j < upfquery.length;  j++){
                    connection.query(upfquery[j], function(err, upf){
                        if(err)
                            console.log("Error Selecting : %s", err);
                    });
                }
                for(var k=0; k < upmquery.length;  k++){
                    connection.query(upmquery[k], function(err, upm){
                        if(err)
                            console.log("Error Selecting : %s", err);
                    });
                }
                res.send('/Guia anulada');
            });
        });

    });
});

router.get('/insert/:idmaterialbodega/:cantidad', function(req, res, next){
	if(verificar(req.session.userData)){
		var input = req.params;
		req.getConnection(function(err, connection){
			connection.query("INSERT INTO bodega SET ?",[input], function(err, rows){
					if(err){console.log("Error Selecting : %s", err);}
					res.render('bodega/indx', {page_title: "Data manager", username: req.session.userData.nombre});
			});
		});
    }
	else{res.redirect('bad_login');}
});

router.get('/show_despachos', function(req, res ,next){
    req.getConnection(function(err, connection){
        connection.query("SELECT despacho.*,odc.numoc as numordenfabricacion FROM despacho LEFT JOIN odc ON despacho.idorden_f = odc.idodc GROUP BY despacho.iddespacho ORDER BY despacho.fecha DESC", function(err, mat){
            if(err){console.log("Error Selecting : %s", err);}
            res.render('bodega/despachos', {data: mat, tipo: 'Todas'});
        });
    });
});

router.post('/render_gdd', function(req, res ,next){
    var input = JSON.parse(JSON.stringify(req.body));
    req.getConnection(function(err, connection){
        connection.query("SELECT despacho.*,odc.numoc as numordenfabricacion FROM despacho LEFT JOIN odc ON despacho.idorden_f = odc.idodc WHERE despacho.estado= ? GROUP BY despacho.iddespacho ORDER BY despacho.fecha DESC", [input.tipo],function(err, mat){
            if(err){console.log("Error Selecting : %s", err);}
            res.render('bodega/despachos', {data: mat, tipo: input.tipo});
        });
    });
});

router.get('/csv_desp', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["N Gdd","N OC","Nombre","Cantidad","Fecha de Despacho"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT despacho.*,ordenfabricacion.numordenfabricacion FROM despacho LEFT JOIN ordenfabricacion ON despacho.idorden_f = ordenfabricacion.idordenfabricacion GROUP BY despacho.iddespacho ORDER BY despacho.fecha DESC",
                function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    var tokenizer2,tokenizer,aux;
                    var f_gen = new Date().toLocaleString();
                    f_gen = f_gen.replace(/\s/g,'');
                    f_gen = f_gen.replace(/\:/g,'');
                    f_gen = f_gen.replace(/\//g,'');
                    f_gen = f_gen.replace(/\,/g,'');
                    if(rows.length){
                        // 'C:/Users/Go Jump/Desktop/'
                        writer.pipe(fs.createWriteStream('public/csvs/z_despachos_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            tokenizer2 = rows[i].mat_token.split('@@');
                            tokenizer = rows[i].cant_token.split(',');
                            for(var j = 0;j<tokenizer.length;j++){
                                writer.write([rows[i].iddespacho,rows[i].numordenfabricacion,tokenizer2[j],tokenizer[j],new Date(rows[i].fecha).toLocaleDateString()]);
                            }
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_despachos_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});

router.get('/csv_stock', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["Nombre","En Faena","Stock"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT * FROM (SELECT material.idmaterial, material.stock, material.detalle,SUM(Coalesce(produccion.1,0) + Coalesce(produccion.2,0) + Coalesce(produccion.3,0) + Coalesce(produccion.4,0) + Coalesce(produccion.5,0) + Coalesce(produccion.6,0) + Coalesce(produccion.7,0) ) as infaena"
                +" from material left join fabricaciones on material.idmaterial = fabricaciones.idmaterial"
                +" LEFT JOIN produccion ON produccion.idfabricaciones = fabricaciones.idfabricaciones"
                +" GROUP BY material.idmaterial) as tablaStock WHERE tablaStock.infaena > 0 OR tablaStock.stock > 0",
                function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    var tokenizer2,tokenizer,aux;
                    var f_gen = new Date().toLocaleString();
                    f_gen = f_gen.replace(/\s/g,'');
                    f_gen = f_gen.replace(/\:/g,'');
                    f_gen = f_gen.replace(/\//g,'');
                    f_gen = f_gen.replace(/\,/g,'');
                    if(rows.length){
                        // 'C:/Users/Go Jump/Desktop/'
                        writer.pipe(fs.createWriteStream('public/csvs/z_stock_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            writer.write([rows[i].detalle,rows[i].infaena,rows[i].stock]);
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_stock_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});

router.get('/show_stock', function(req, res ,next){
	req.getConnection(function(err, connection){
		connection.query("SELECT * FROM (SELECT material.idmaterial, material.stock,material.tipo, material.codigo,material.detalle,SUM(Coalesce(produccion.1,0) + Coalesce(produccion.2,0) + Coalesce(produccion.3,0) + Coalesce(produccion.4,0) + Coalesce(produccion.5,0) + Coalesce(produccion.6,0) + Coalesce(produccion.7,0) ) as infaena"
			+" from material left join fabricaciones on material.idmaterial = fabricaciones.idmaterial"
			+" LEFT JOIN produccion ON produccion.idfabricaciones = fabricaciones.idfabricaciones"
			+" GROUP BY material.idmaterial) as tablaStock WHERE (tablaStock.infaena > 0 OR tablaStock.stock > 0) AND (tablaStock.tipo='P' OR tablaStock.tipo = 'S')", function(err, mat){
			if(err){console.log("Error Selecting : %s", err);}
			//console.log(mat);
			res.render('bodega/show_stock', {mat: mat});
		});
	});
});

router.get('/add_notificacion/:idproduccion/:cantidad', function(req,res,next){
	if(verificar(req.session.userData)){
		var input = req.params;
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
			    dataInsert.descripcion = "idm@"+idmaterial+"@"+input.cantidad+"@"+date;
			    connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
			    	if(err){console.log("Error Selecting : %s", err);}
			    	res.redirect('/bodega/render_notificaciones');
			    });

			});
		});
	}
	else{res.redirect('bad_login');}
});

router.get('/render_notificaciones', function(req, res, next){
	req.getConnection(function(err,connection){
		connection.query("select notificacion.*,material.detalle from notificacion LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial WHERE SUBSTRING(notificacion.descripcion,1,3) = 'idm' AND notificacion.active = true", function(err, notif){
			if(err){console.log("Error Selecting : %s", err);}
			res.render('bodega/notificaciones', {notif: notif})
		});
	});
});

router.get('/confirm_notificacion/:idnotificacion/:cantidad', function(req,res,next){
		var idnotificacion = req.params.idnotificacion;
		var cantidad = req.params.cantidad;
		req.getConnection(function(err, connection){
			connection.query("SELECT * FROM notificacion WHERE idnotificacion = ?", [idnotificacion], function(err, mat){
				if(err){console.log("Error Selecting : %s", err);}
				connection.query("UPDATE material SET stock = stock + ? WHERE idmaterial = ?", [cantidad, mat[0].descripcion.split('@')[1]], function(err, rows){
					if(err){console.log("Error Selecting : %s", err);}
					connection.query('UPDATE notificacion SET active = false WHERE idnotificacion = ?', [idnotificacion],function(err, notif){
						if(err){console.log("Error Selecting : %s", err);}
						console.log(notif);
						if(req.session.userData.nombre == 'faena'){
							res.redirect('/faena/render_notificaciones/'+req.session.myValue);
						}
						else if(req.session.userData.nombre == 'bodega'){
					    	res.redirect('/bodega/render_notificaciones');
						}
					});
				});
			});	
		});
});

router.post('/activar_gdd', function(req,res,next){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        req.getConnection(function(err, connection){
            connection.query("SELECT * FROM despacho WHERE iddespacho = ?", [input.id], function(err, desp){
                if(err){console.log("Error Selecting : %s", err);}
                desp = desp[0];
                // console.log(desp);
                if(desp.mat_token != ''){
                    desp.mat_token = desp.mat_token.split('@@');
                    desp.id_token = desp.id_token.split('@');
                    desp.idf_token = desp.idf_token.split('@');
                    desp.cant_token = desp.cant_token.split(',');
                    // console.log(desp);
                    connection.query("SELECT odc.* FROM pedido LEFT JOIN odc ON odc.idodc=pedido.idodc WHERE pedido.idpedido = ?", [desp.idf_token[0]],
                        function(err, odc){
                            if(err){console.log("Error Selecting : %s", err);}
                            connection.query("select pedido.idpedido as idfabricaciones,pedido.cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                                +"odc.numoc as numordenfabricacion, aleacion.nom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                                +" left join odc on odc.idodc=pedido.idodc left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion"
                                +" left join aleacion on aleacion.idaleacion=subaleacion.idaleacion where pedido.despachados!=pedido.cantidad AND pedido.idodc="+odc[0].idodc+" group by pedido.idpedido order by pedido.f_entrega asc",
                                function(err, rows){
                                    if(err)
                                        console.log("Error Selecting :%s", err);

                                    req.session.arraydespacho = [];
                                    res.render('bodega/g_despacho', {data: rows, num: desp.iddespacho, blanco: 1});
                                    //res.render('jefeprod/ordenes_produccion', {data: rows});

                            });

                            
                        });

                }
                else{
                    connection.query("select pedido.idpedido as idfabricaciones,pedido.cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                                +"odc.numoc as numordenfabricacion, aleacion.nom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                                +" left join odc on odc.idodc=pedido.idodc left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion"
                                +" left join aleacion on aleacion.idaleacion=subaleacion.idaleacion where pedido.despachados!=pedido.cantidad group by pedido.idpedido order by pedido.f_entrega asc",
                                function(err, rows){
                                    if(err)
                                        console.log("Error Selecting :%s", err);

                                    req.session.arraydespacho = [];
                                    res.render('bodega/g_despacho', {data: rows, num: desp.iddespacho, blanco: 1});
                                    //res.render('jefeprod/ordenes_produccion', {data: rows});

                            });
                }   
                
            }); 
        });
});

router.get("/gen_pdfgdd/:iddespacho", function(req, res, next){
    if(verificar(req.session.userData)){
        var id = parseInt(req.params.iddespacho);
        var meses = new Array ("Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre");
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('gdd');
        sheet.mergeCells('B9:F10');
        sheet.mergeCells('G9:I9');
        sheet.mergeCells('B11:G12');
        sheet.mergeCells('H11:I11');
        sheet.mergeCells('B13:G14');
        sheet.mergeCells('H13:I13');
        sheet.mergeCells('A15:I18');
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);
            connection.query("SELECT despacho.*, odc.numoc as numordenfabricacion, odc.numoc,cliente.* FROM despacho LEFT JOIN odc ON odc.idodc = despacho.idorden_f left join cliente on cliente.idcliente = odc.idcliente WHERE iddespacho = ?",
                [id],function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    if(rows.length>0){
                        var nombre = 'csvs/gdd' + rows[0].iddespacho + '.xlsx';
                        var cond = '';
                        for(var u=0; u < rows[0].id_token.split('@').length; u++){
                            cond += " idmaterial = "+rows[0].id_token.split('@')[u]+" OR";
                            
                        }
                        cond = "SELECT idmaterial,codigo FROM material WHERE"+cond;
                        cond = cond.substring(0, cond.length-2);
                        connection.query(cond, function(err, prod){
                            if(err){console.log("Error Selecting : %s", err);}
                            sheet.getCell('B9').value = rows[0].sigla+"-"+rows[0].razon;
                            sheet.getCell('G9').value = rows[0].fecha.getDate() + " de " + meses[rows[0].fecha.getMonth()] + " de " + rows[0].fecha.getFullYear();
                            sheet.getCell('B11').value = rows[0].direccion;
                            sheet.getCell('H11').value = rows[0].ciudad;
                            sheet.getCell('B13').value = rows[0].giro;
                            sheet.getCell('H13').value = rows[0].rut;

                            rows[0].mat_token = rows[0].mat_token.split('@@');
                            rows[0].cant_token = rows[0].cant_token.split(',');
                            var count = 0;
                            var auxrow;
                            for(var j=0; j<rows[0].mat_token.length; j++){
                                for(var c=0; c<prod.length; c++){
                                    if(prod[c].idmaterial == rows[0].id_token.split('@')[j]){
                                        auxrow = 20 + count;
                                        sheet.mergeCells('C' + auxrow.toString() + ':F' + auxrow.toString());
                                        sheet.getCell('B' + auxrow.toString()).value = prod[c].codigo;
                                        sheet.getCell('C' + auxrow.toString()).value = rows[0].mat_token[j].replace(",",".");
                                        sheet.getCell('G' + auxrow.toString()).value = rows[0].cant_token[j];
                                        count++;
                                    }
                                }
                            }
                            sheet.mergeCells('B36:H36');
                            sheet.mergeCells('B37:H37');
                            if(rows[0].estado == 'Traslado'){
                                sheet.getCell('B36').value = "NO CONSTITUYE VENTA SOLO TRASLADO";
                                sheet.getCell('B37').value = "En virtud del Art. 55 D.L. 825";
                            }
                            sheet.mergeCells('C38:D38');
                            sheet.mergeCells('F38:G38');
                            sheet.mergeCells('C39:D39')
                            sheet.getCell('B38').value = "OF:";
                            sheet.getCell('C38').value = rows[0].numordenfabricacion;
                            sheet.getCell('E38').value = 'OC: ';
                            sheet.getCell('B38').value = rows[0].numoc;
                            sheet.getCell('B39').value = "CHOFER";
                            sheet.getCell('B40').value = "PATENTE";
                            sheet.getCell('H40').value = "NETO";
                            sheet.getCell('H41').value = "IVA";
                            sheet.getCell('H44').value = "TOTAL";

                            workbook.xlsx.writeFile('public/' + nombre)
                                .then(function() {
                                    res.send('/csvs/gdd'+ rows[0].iddespacho + '.xlsx');

                                });

                        });

                
                    }

                });
            });
    }
    else res.redirect('/bad_login');
});

router.get("/search_gdd/:numgdd", function(req, res, next){
   if(verificar(req.session.userData)){
        var id = parseInt(req.params.numgdd);
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error connection : %s", err);
            connection.query("SELECT * FROM despacho WHERE iddespacho LIKE '%"+id+"%'", function(err, desp){
                if(err)
                    console.log("Error Selecting : %s", err);

                res.render('bodega/despachos', {data: desp, tipo: 'Todas'});
            });
        });
        
    }
    else res.redirect('/bad_login'); 
});
module.exports = router;
