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
	if(usr.nombre == 'jefeprod' || usr.nombre == 'gerencia'){
		return true;
	}else{
		return false;
	}
}

/* GET users listing. */
router.get('/', function(req, res, next){
	if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Connection : %s", err);
            connection.query("SELECT * FROM etapafaena", function(err, etp){
                if(err)
                    console.log("Error Selecting : %s", err);
                
                res.render('jefeprod/indx_new', {page_title: "Jefe de Produccion", username: req.session.userData.nombre, etapas: etp});
            });
        });
    }
	else{res.redirect('bad_login');}	
});
router.post('/serchprods', function(req, res, next) {
    if(verificar(req.session.userData)){
        req.getConnection(function(err,connection){
            if(err)console.log(err);
            connection.query(/*"SELECT produccion.*,ordenfabricacion.numordenfabricacion,material.detalle FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                " WHERE material.detalle like ? AND ordenfabricacion.numordenfabricacion LIKE ? AND produccion.8 != produccion.cantidad GROUP BY produccion.idordenproduccion "*/
                "SELECT produccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,material.detalle,COALESCE(SUM(produccion_history.enviados),0) as trats FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                        " LEFT JOIN produccion_history ON (produccion_history.idproduccion = produccion.idproduccion AND produccion_history.from = '5') LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN material ON material.idmaterial = producido.idmaterial" +
                        "  WHERE produccion.8 != produccion.cantidad AND material.detalle like ? AND ordenfabricacion.idordenfabricacion LIKE ?  GROUP BY produccion.idproduccion"
                ,[req.body.detalle,req.body.numordenfabricacion],function(err,prods){
                
                if(err) console.log("Select Error: %s",err);
                console.log(prods);
                //res.render('jefeprod/prodsstrim',{datalen: prods},function (err,html){if(err)throw err; res.send(html);});
                res.render('jefeprod/prodsstrim2',{datalen: prods},function (err,html){if(err)throw err; res.send(html);});
                
            });
        });
    }
    else{res.redirect('bad_login');}
});


router.post('/serchprogress', function(req, res, next) {
    if(verificar(req.session.userData)){
        req.getConnection(function(err,connection){
            if(err)console.log(err);
            connection.query("select produccion.idordenproduccion,produccion_history.idproduccion,"
                +"producido.ruta, fabricaciones.idorden_f,material.detalle,produccion.cantidad,"
                +"group_concat(etapafaena.nombre_etapa) as etapas,group_concat(produccion_history.enviados)"
                +" as enviados, group_concat(produccion_history.`from`) as `from` from produccion_history "
                +"left join etapafaena on etapafaena.value = produccion_history.from left join produccion "
                +"on produccion.idproduccion=produccion_history.idproduccion left join fabricaciones on "
                +"fabricaciones.idfabricaciones=produccion.idfabricaciones left join material on"
                +" material.idmaterial=fabricaciones.idmaterial left join producido on producido.idmaterial"
                +" = material.idmaterial WHERE material.detalle like ? AND fabricaciones.idorden_f LIKE ? "
                +"group by produccion_history.idproduccion",[req.body.detalle,req.body.numordenfabricacion],function(err,progress){
                if(err){ 
                    console.log("Select Error: %s",err);
                }
                console.log(progress);
                //res.render('jefeprod/ope_list',{data: ofs ,datalen: prods, prog: progress},function (err,html){if(err)throw err;res.send(html);});
                //res.render('jefeprod/prodsstrim',{datalen: prods},function (err,html){if(err)throw err; res.send(html);});
                res.render('jefeprod/prodsstrim3',{prog: progress},function (err,html){if(err)throw err; res.send(html);});
                
                        
            });
        });
    }
    else{res.redirect('bad_login');}
});



router.post('/cerrar_op', function(req, res, next) {
    if(verificar(req.session.userData)){
        var idop = JSON.parse(JSON.stringify(req.body)).idop;
        req.getConnection(function(err,connection){
            if(err)console.log(err);
            connection.query("UPDATE ordenproduccion SET fin = true WHERE idordenproduccion = ?",[idop],function(err,prods){
                if(err) console.log("Select Error: %s",err);


                connection.query("SELECT ordenproduccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,"+
                    " min(produccion.cantidad = produccion.`8`+produccion.standby) as finalizado,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) > to_days(fabricaciones.f_entrega)-10 AND to_days(fabricaciones.f_entrega) > to_days(now())) as activo,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) < to_days(fabricaciones.f_entrega)-10) as incompleto,max(to_days(fabricaciones.f_entrega) < to_days(now()) AND produccion.cantidad > produccion.`8`+produccion.standby ) as atraso, GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),"
                    +"'@',fabricaciones.idorden_f,'@',produccion.cantidad) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@'"
                    +",produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8,'@',COALESCE(trats.tratados,0),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',fabricaciones.f_entrega) AS etapatoken FROM ordenproduccion " +
                    " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion" +
                    " LEFT JOIN (SELECT produccion.idproduccion, SUM(COALESCE(produccion_history.enviados,0)) as tratados FROM produccion LEFT JOIN produccion_history on produccion_history.idproduccion = produccion.idproduccion WHERE produccion_history.from = '5')" +
                    " trats ON trats.idproduccion = produccion.idproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                    " LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                    " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                    " WHERE ordenproduccion.fin = false AND produccion.el = false GROUP BY ordenproduccion.idordenproduccion", function(err, ops){
                        if(err) console.log("Select Error: %s",err);
                        var aux = [];
                        for(var i = 0;i< ops.length;i++){
                            if(typeof ops[i].oftoken != 'null'){
                                ops[i].oftoken = ops[i].oftoken.split(',');
                                ops[i].etapatoken = ops[i].etapatoken.split(',');
                            }
                        }
                        res.render('jefeprod/session_oplist',{data: ops},function (err,html){if(err)throw err; res.send(html);});
                });

                //res.render('jefeprod/session_oplist',{datalen: prods},function (err,html){if(err)throw err; res.send(html);});
                
            });
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/anular_op', function(req, res, next) {
    if(verificar(req.session.userData)){
        var idop = JSON.parse(JSON.stringify(req.body)).idop;
        req.getConnection(function(err,connection){
            if(err)console.log(err);

                connection.query("UPDATE ordenproduccion SET f_anulado = now() WHERE idordenproduccion = ?",[idop],function(err,upOP){
                    if(err) console.log("Select Error: %s",err);

                    connection.query("UPDATE ordenproduccion SET anulado = true WHERE idordenproduccion = ?",[idop],function(err,prods){
                        if(err) console.log("Select Error: %s",err);

                        //DELETE FROM produccion WHERE produccion.idordenproduccion = ? && produccion.cantidad = produccion.`1` + produccion.`standby`
                        connection.query("UPDATE produccion SET el = true WHERE produccion.idordenproduccion = ? && produccion.cantidad = produccion.`1` + produccion.`standby`", [idop], function(err, upProd){
                            if(err) console.log("Select Error: %s",err);
                            
                            console.log(upProd);
                            connection.query("SELECT * FROM produccion WHERE produccion.idordenproduccion = ? AND produccion.el = true", [idop], function(err, infoProd){
                                if(err) console.log("Select Error: %s",err);
                                
                                var ids = "";
                                var qprod = "UPDATE fabricaciones SET restantes = CASE ";
                                for(var i=0; i < infoProd.length; i++){
                                        qprod += "WHEN idfabricaciones = "+infoProd[i].idfabricaciones+" THEN restantes+"+infoProd[i].cantidad+" ";
                                        ids += infoProd[i].idfabricaciones+",";
                                }
                                ids = ids.substring(0, ids.length-1);
                                qprod += "ELSE restantes END WHERE idfabricaciones in ("+ids+")";
                                connection.query(qprod, function(err, upFabs){
                                    if(err) console.log("Error Updating : %s", err);
                                    console.log(upFabs);
                                    connection.query("SELECT ordenproduccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,"+
                                        " min(produccion.cantidad = produccion.`8`+produccion.standby) as finalizado,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) > to_days(fabricaciones.f_entrega)-10 AND to_days(fabricaciones.f_entrega) > to_days(now())) as activo,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) < to_days(fabricaciones.f_entrega)-10) as incompleto,max(to_days(fabricaciones.f_entrega) < to_days(now()) AND produccion.cantidad > produccion.`8`+produccion.standby ) as atraso, GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),"
                                        +"'@',fabricaciones.idorden_f,'@',produccion.cantidad) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@'"
                                        +",produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8,'@',COALESCE(trats.tratados,0),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',fabricaciones.f_entrega) AS etapatoken FROM ordenproduccion " +
                                        " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion" +
                                        " LEFT JOIN (SELECT produccion.idproduccion, SUM(COALESCE(produccion_history.enviados,0)) as tratados FROM produccion LEFT JOIN produccion_history on produccion_history.idproduccion = produccion.idproduccion WHERE produccion_history.from = '5')" +
                                        " trats ON trats.idproduccion = produccion.idproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                                        " LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                                        " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                                        " WHERE ordenproduccion.fin = false AND produccion.el = false GROUP BY ordenproduccion.idordenproduccion", function(err, ops){
                                            if(err) console.log("Select Error: %s",err);
                                            
                                            console.log(ops);
                                            var aux = [];
                                            for(var i = 0;i< ops.length;i++){
                                                if(typeof ops[i].oftoken != 'null'){
                                                    ops[i].oftoken = ops[i].oftoken.split(',');
                                                    ops[i].etapatoken = ops[i].etapatoken.split(',');
                                                }
                                            }
                                            //console.log(ofs);
                                            res.render('jefeprod/session_oplist',{data: ops},function (err,html){if(err)throw err; res.send(html);});
                                    });
                                });

                            });
                        });
                                            
                    });
                });

        });
    }
    else{res.redirect('bad_login');}
});

router.post('/render_anular_op', function(req, res, next) {
    if(verificar(req.session.userData)){
        var idop = JSON.parse(JSON.stringify(req.body)).idop;
        req.getConnection(function(err,connection){
            if(err)console.log(err);
            connection.query("SELECT ordenproduccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,"+
                " min(produccion.cantidad = produccion.`8`+produccion.standby) as finalizado,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) > to_days(fabricaciones.f_entrega)-10 AND to_days(fabricaciones.f_entrega) > to_days(now())) as activo,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) < to_days(fabricaciones.f_entrega)-10) as incompleto,max(to_days(fabricaciones.f_entrega) < to_days(now()) AND produccion.cantidad > produccion.`8`+produccion.standby ) as atraso, GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),"
                +"'@',fabricaciones.idorden_f,'@',produccion.cantidad) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@'"
                +",produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8,'@',COALESCE(trats.tratados,0),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',fabricaciones.f_entrega) AS etapatoken FROM ordenproduccion " +
                " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion" +
                " LEFT JOIN (SELECT produccion.idproduccion, SUM(COALESCE(produccion_history.enviados,0)) as tratados FROM produccion LEFT JOIN produccion_history on produccion_history.idproduccion = produccion.idproduccion WHERE produccion_history.from = '5')" +
                " trats ON trats.idproduccion = produccion.idproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                " LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                " WHERE produccion.el = true GROUP BY ordenproduccion.idordenproduccion", function(err, ops){
                    if(err) console.log("Select Error: %s",err);
                    
                    console.log(ops);
                    var aux = [];
                    for(var i = 0;i< ops.length;i++){
                        if(typeof ops[i].oftoken != 'null'){
                            ops[i].oftoken = ops[i].oftoken.split(',');
                            ops[i].etapatoken = ops[i].etapatoken.split(',');
                        }
                    }
                    //console.log(ofs);
                    res.render('jefeprod/session_oplist_anuladas',{data2: ops},function (err,html){if(err)throw err; res.send(html);});
            });                                 
        });
    }
    else{res.redirect('bad_login');}
});

router.get('/itemprod/:val', function(req, res, next) {
    if(verificar(req.session.userData)){
        var valor = req.params.val;
        req.getConnection(function(err,connection){
            if(err)console.log(err);
            if(valor == 'checked'){
                connection.query("SELECT sumatoria.idproduccion,sumatoria.idfabricaciones, sumatoria.idordenproduccion, sum(sumatoria.cantidad) as cantidad,sum(sumatoria.abastecidos) as abastecidos, sum(sumatoria.standby) as standby, sumatoria.f_gen, sumatoria.idordenfabricacion as numordenfabricacion,sumatoria.idmaterial,"
                    +"sumatoria.detalle, sum(sumatoria.trats) as trats, SUM(sumatoria.1) as '1',SUM(sumatoria.2) as '2',SUM(sumatoria.3) as '3',SUM(sumatoria.4) as '4',SUM(sumatoria.5) as '5',SUM(sumatoria.6) as '6',SUM(sumatoria.7) as '7',SUM(sumatoria.8) as '8' FROM (SELECT produccion.*,"+
                    "ordenfabricacion.idordenfabricacion,material.idmaterial,material.detalle,COALESCE(SUM(produccion_history.enviados),0) as trats FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                        " LEFT JOIN produccion_history ON (produccion_history.idproduccion = produccion.idproduccion AND produccion_history.from = '5') LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial" +
                        "  WHERE produccion.8 != produccion.cantidad GROUP BY produccion.idproduccion) AS sumatoria GROUP BY sumatoria.idmaterial"
                ,function(err,prods){
                
                    if(err) console.log("Select Error: %s",err);
                    
                    console.log("ITEMIZADOS");
                    //console.log(prods);
                    res.render('jefeprod/prodsstrim2',{datalen: prods, check: true},function (err,html){if(err)throw err; res.send(html);});
                    
                });
            }
            else{
                connection.query("SELECT produccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,material.detalle,COALESCE(SUM(produccion_history.enviados),0) as trats FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                        " LEFT JOIN produccion_history ON (produccion_history.idproduccion = produccion.idproduccion AND produccion_history.from = '5') LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN material ON material.idmaterial = producido.idmaterial" +
                        "  WHERE produccion.8 != produccion.cantidad GROUP BY produccion.idproduccion"
                ,function(err,prods){
                
                    if(err) console.log("Select Error: %s",err);
                    console.log("TODOS");
                    //console.log(prods);
                    res.render('jefeprod/prodsstrim2',{datalen: prods, check: false},function (err,html){if(err)throw err; res.send(html);});
                    
                });
            }
            
        });
    }
    else{res.redirect('bad_login');}
});


router.get('/crear_op', function(req, res, next){
	if(verificar(req.session.userData)){
		req.session.arrayProduccion = [];
		req.getConnection(function(err, connection){
			connection.query("select * from (select fabricaciones.*,ordenfabricacion.idordenfabricacion, ordenfabricacion.numordenfabricacion,aleacion.nom as anom,subaleacion.subnom , material.detalle from fabricaciones "
				+ "left join ordenfabricacion on (ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f)"
				+ " left join producido on (fabricaciones.idproducto=producido.idproducto)"
				+ " left join material on (material.idmaterial=producido.idmaterial)" +
				" left join subaleacion ON producido.idsubaleacion = subaleacion.idsubaleacion" +
				" left join aleacion ON aleacion.idaleacion = subaleacion.idsubaleacion left join pedido on pedido.idpedido=fabricaciones.idpedido WHERE fabricaciones.restantes > 0 AND coalesce(pedido.externo,false) = false AND fabricaciones.lock = false"
				+ " GROUP BY fabricaciones.idfabricaciones ORDER BY fabricaciones.f_entrega ASC) as internalquery",
				function(err, rows){
					if(err)
						console.log("Error Selecting :%s", err);
                    connection.query("select idordenproduccion from ordenproduccion order by idordenproduccion DESC limit 1",function(err,idord){
                        if(err)
                            console.log("Error Selecting :%s", err);
                        //console.log(rows);
                        res.render('jefeprod/lanzar_op', {data: rows,num:idord[0]},function(err,html){if(err)console.log(err); res.send(html)});
					});
					//res.render('jefeprod/ordenes_produccion', {data: rows});

				});
		});
	}
	else{res.redirect('bad_login');}	
	
});
router.post('/lanzar_op_fill', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var where = "WHERE internalquery.detalle LIKE '%"+input.detalle+"%' OR concat(repeat('0', abs(6 - length(internalquery.idordenfabricacion))),internalquery.idordenfabricacion ) LIKE '%"+input.detalle+"%' OR internalquery.subnom LIKE '%"+input.detalle+"%' OR internalquery.f_entrega LIKE '%"+input.detalle+"%' OR internalquery.cantidad LIKE '%"+input.detalle+"%'";
        if(input.detalle != ''){
            where += " OR internalquery.detalle = '"+input.detalle+"' OR concat(repeat('0', abs(6 - length(internalquery.idordenfabricacion)) ),internalquery.idordenfabricacion ) = '"+input.detalle+"' OR internalquery.subnom = '"+input.detalle+"' OR internalquery.f_entrega = '"+input.detalle+"' OR internalquery.cantidad = '"+input.detalle+"'";
        }
        req.getConnection(function(err, connection){
            connection.query("select * from (select fabricaciones.*,ordenfabricacion.idordenfabricacion, ordenfabricacion.numordenfabricacion,aleacion.nom as anom,coalesce(subaleacion.subnom,'Sin') as subnom , material.detalle from fabricaciones "
                + "left join ordenfabricacion on (ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f)"
                + " left join material on (material.idmaterial=fabricaciones.idmaterial)" 
                + " left join producido on (fabricaciones.idproducto=producido.idproducto)"+
                " left join subaleacion ON producido.idsubaleacion = subaleacion.idsubaleacion" +
                " left join aleacion ON aleacion.idaleacion = subaleacion.idsubaleacion left join pedido on pedido.idpedido = fabricaciones.idpedido WHERE fabricaciones.restantes > 0 and coalesce(pedido.externo, false) = false AND fabricaciones.lock = false"
                + " GROUP BY fabricaciones.idfabricaciones ORDER BY "+input.fill+" "+input.orden+") as internalquery "+where,
                function(err, rows){
                    if(err)
                        console.log("Error Selecting :%s", err);
                    connection.query("UPDATE fabricaciones SET restantes = 0 WHERE (restantes IS null || restantes < 0) AND idfabricaciones > 0", function(err, upNull){
                        if(err)
                            console.log("Error Selecting :%s", err);
                        //res.render('jefeprod/lanzar_op', {data: rows,num:idord[0]},function(err,html){if(err)console.log(err); res.send(html)});
                        //console.log(rows);
                        res.render('jefeprod/lanzar_op_table', {data: rows},function(err,html){if(err)console.log(err); res.send(html)});
                        //res.render('jefeprod/ordenes_produccion', {data: rows});
                    });

                });
        });
    }
    else{res.redirect('bad_login');}    
    
});


router.get('/ordenes_fabricacion', function(req, res, next){
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
		connection.query("select ordenproduccion.*, producido.ruta,material.detalle  from ordenproduccion "
			+"left join fabricaciones on (ordenproduccion.idordenproduccion=fabricaciones.idorden_f) "
			+"left join producido on (fabricaciones.idproducto = producido.idproducto) "
			+"left join material ON (material.idmaterial=producido.idmaterial) GROUP BY ordenproduccion.idordenproduccion", function(err, rows){
			if(err)
				console.log("Error Selecting : %s", err);
			res.render('jefeprod/ordenes_fabricacion', {data: rows});
			});
		});
	}
	else{res.redirect('bad_login');}		
});

router.get('/list_ops', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err){ 
                    console.log("Connection Error: %s",err);
                }    
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err){ 
                        console.log("Select Error: %s",err);
                    }
                connection.query("SELECT ordenproduccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,"+
                    " min(produccion.cantidad = produccion.`8`+produccion.standby) as finalizado,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) >"
                    +" to_days(fabricaciones.f_entrega)-10 AND to_days(fabricaciones.f_entrega) > to_days(now())) as activo,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) < to_days(fabricaciones.f_entrega)-10) as incompleto,max(to_days(fabricaciones.f_entrega) < to_days(now()) AND produccion.cantidad > produccion.`8`+produccion.standby ) as atraso, GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),"
                    +"'@',fabricaciones.idorden_f,'@',produccion.cantidad) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@'"
                    +",produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8,'@',COALESCE(trats.tratados,0),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',fabricaciones.f_entrega, '@', opQuery.tok) AS etapatoken FROM ordenproduccion " +
                    " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion" +
                    " LEFT JOIN (SELECT produccion.idproduccion, SUM(COALESCE(produccion_history.enviados,0)) as tratados FROM produccion LEFT JOIN produccion_history on produccion_history.idproduccion = produccion.idproduccion WHERE produccion_history.from = '5')" +
                    " trats ON trats.idproduccion = produccion.idproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                    " LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                    " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN (select ordenfabricacion.idordenfabricacion, coalesce(group_concat(DISTINCT produccion.idordenproduccion separator ' - '), 'Sin OP')"
                    +" as tok from ordenfabricacion left join fabricaciones on fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion left join produccion on produccion.idfabricaciones=fabricaciones.idfabricaciones group by ordenfabricacion.idordenfabricacion) as opQuery on opQuery.idordenfabricacion=fabricaciones.idorden_f INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                    " WHERE ordenproduccion.fin = false AND produccion.el = false GROUP BY ordenproduccion.idordenproduccion",function (err,ofs){
                    if(err){
                        console.log("Select Error: %s",err);
                    }
                    var aux = [];
                    console.log("ofs");
                    console.log(ofs);
                    for(var i = 0;i< ofs.length;i++){
                    	if(typeof ofs[i].oftoken != 'null'){
                			ofs[i].oftoken = ofs[i].oftoken.split(',');
                        	ofs[i].etapatoken = ofs[i].etapatoken.split(',');
                        }
                    }
                    connection.query("SELECT ordenproduccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,"+
                        " min(produccion.cantidad = produccion.`8`+produccion.standby) as finalizado,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) > to_days(fabricaciones.f_entrega)-10 AND to_days(fabricaciones.f_entrega) > to_days(now())) as activo,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) < to_days(fabricaciones.f_entrega)-10) as incompleto,max(to_days(fabricaciones.f_entrega) < to_days(now()) AND produccion.cantidad > produccion.`8`+produccion.standby ) as atraso, GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),"
                        +"'@',fabricaciones.idorden_f,'@',produccion.cantidad) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@'"
                        +",produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8,'@',COALESCE(trats.tratados,0),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',fabricaciones.f_entrega, '@', opQuery.tok) AS etapatoken FROM ordenproduccion " +
                        " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion" +
                        " LEFT JOIN (SELECT produccion.idproduccion, SUM(COALESCE(produccion_history.enviados,0)) as tratados FROM produccion LEFT JOIN produccion_history"
                        +" on produccion_history.idproduccion = produccion.idproduccion WHERE produccion_history.from = '5')" +
                        " trats ON trats.idproduccion = produccion.idproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                        " LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                        " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN (select ordenfabricacion.idordenfabricacion,"
                        +" coalesce(group_concat(DISTINCT produccion.idordenproduccion separator ' - '), 'Sin OP') as tok from ordenfabricacion left join"
                        +" fabricaciones on fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion left join produccion on produccion.idfabricaciones=fabricaciones.idfabricaciones group by ordenfabricacion.idordenfabricacion) as opQuery on opQuery.idordenfabricacion=fabricaciones.idorden_f INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                        " WHERE produccion.el = true GROUP BY ordenproduccion.idordenproduccion",function (err,anul){
                        if(err){
                            console.log("Select Error: %s",err);
                        }
                        var aux2 = [];
                        for(var i = 0;i< anul.length;i++){
                            if(typeof anul[i].oftoken != 'null'){
                                anul[i].oftoken = anul[i].oftoken.split(',');
                                anul[i].etapatoken = anul[i].etapatoken.split(',');
                            }
                        }
                        console.log("ANULADOS");
                        console.log(anul);
                        connection.query("SELECT produccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,material.detalle,opQuery.tok,COALESCE(SUM(produccion_history.enviados),0)"
                            +" as trats FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion"
                            +" LEFT JOIN (select ordenfabricacion.idordenfabricacion, coalesce(group_concat(DISTINCT produccion.idordenproduccion separator ' - '), 'Sin OP') as tok from ordenfabricacion left join fabricaciones on"
                            +" fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion left join produccion on produccion.idfabricaciones=fabricaciones.idfabricaciones group by ordenfabricacion.idordenfabricacion) as opQuery on opQuery.idordenfabricacion=ordenfabricacion.idordenfabricacion" +
                            " LEFT JOIN produccion_history ON (produccion_history.idproduccion = produccion.idproduccion AND produccion_history.from = '5') LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial" +
                            "  WHERE produccion.8 != produccion.cantidad AND produccion.el = false  GROUP BY produccion.idproduccion",function(err,prods){
                            if(err){ 
                                console.log("Select Error: %s",err);
                            }
                            //console.log(prods);

                            connection.query("select produccion.idordenproduccion,produccion_history.idproduccion,producido.ruta, fabricaciones.idorden_f,material.detalle,produccion.cantidad,group_concat(etapafaena.nombre_etapa)"
                                +" as etapas,group_concat(produccion_history.enviados) as enviados, group_concat(produccion_history.`from`) as `from` from produccion_history left join etapafaena on etapafaena.value = produccion_history.from"
                                +" left join produccion on produccion.idproduccion=produccion_history.idproduccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join material on"
                                +" material.idmaterial=fabricaciones.idmaterial left join producido on producido.idmaterial = material.idmaterial WHERE produccion.el=false group by produccion_history.idproduccion",function(err,progress){
                                if(err){ 
                                    console.log("Select Error: %s",err);
                                }
                                //console.log(progress);
                                res.render('jefeprod/ope_list',{data: ofs , data2: anul,datalen: prods, prog: progress},function (err,html){if(err)throw err;res.send(html);});
                            });
                        });
                    });
                });
            });
        });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});



router.get('/list_prod', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err){ 
                    console.log("Connection Error: %s",err);
                }    
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err){ 
                        console.log("Select Error: %s",err);
                    }
                    connection.query("SELECT produccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,material.detalle,COALESCE(SUM(produccion_history.enviados),0) as trats FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                        " LEFT JOIN produccion_history ON (produccion_history.idproduccion = produccion.idproduccion AND produccion_history.from = '5') LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto LEFT JOIN material ON material.idmaterial = producido.idmaterial" +
                        "  WHERE produccion.8 != produccion.cantidad  GROUP BY produccion.idproduccion",function(err,prods){
                        if(err){ 
                            console.log("Select Error: %s",err);
                        }
                        res.render('jefeprod/prod_list',{datalen: prods},function (err,html){if(err)throw err;res.send(html);});

                    });
                });
            });
        }   
    }
    else{res.redirect('bad_login');}
});

router.post('/search_op', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var busq = JSON.parse(JSON.stringify(req.body)).busq;
            //console.log(busq);
            req.getConnection(function(err,connection){
                if(err){ 
                    console.log("Connection Error: %s",err);
                }    
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err){ 
                        console.log("Select Error: %s",err);
                    }
                connection.query("SELECT * FROM (SELECT ordenproduccion.*,ordenfabricacion.idordenfabricacion as numordenfabricacion,"+
                    " min(produccion.cantidad = produccion.`8`+produccion.standby) as finalizado,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) > to_days(fabricaciones.f_entrega)-10 AND to_days(fabricaciones.f_entrega) > to_days(now())) as activo,max(produccion.cantidad > produccion.`8`+produccion.standby AND to_days(now()) < to_days(fabricaciones.f_entrega)-10) as incompleto,max(to_days(fabricaciones.f_entrega) < to_days(now()) AND produccion.cantidad > produccion.`8`+produccion.standby ) as atraso, GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),"
                    +"'@',fabricaciones.idorden_f,'@',produccion.cantidad) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@'"
                    +",produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8,'@',COALESCE(trats.tratados,0),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',fabricaciones.f_entrega) AS etapatoken FROM ordenproduccion " +
                    " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion" +
                    " LEFT JOIN (SELECT produccion.idproduccion, SUM(COALESCE(produccion_history.enviados,0)) as tratados FROM produccion LEFT JOIN produccion_history on produccion_history.idproduccion = produccion.idproduccion WHERE produccion_history.from = '5')" +
                    " trats ON trats.idproduccion = produccion.idproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                    " LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion" +
                    " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                    " WHERE ordenproduccion.fin = false GROUP BY ordenproduccion.idordenproduccion) AS query_interno WHERE query_interno.idordenproduccion LIKE '%"+busq+"%' OR "+/*query_interno.numordenfabricacion LIKE '%"+busq+"%' OR*/"query_interno.oftoken LIKE '%"+busq+"%'",function (err,ops){
                        if(err){
                            console.log("Select Error: %s",err);
                        }
                        console.log(ops);
                        for(var i = 0;i< ops.length;i++){
                            if(typeof ops[i].oftoken != 'null'){
                                ops[i].oftoken = ops[i].oftoken.split(',');
                                ops[i].etapatoken = ops[i].etapatoken.split(',');
                            }
                        }
                        res.render('jefeprod/ope_list_items',{data: ops});

                });
            });
        });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.post('/add_produccion', function(req, res, next){
	var input = JSON.parse(JSON.stringify(req.body));
	req.session.arrayProduccion.push([input.idfabricaciones,input.detalle,input.restantes,input.ruta]);
	res.render('jefeprod/session_stream',{data:req.session.arrayProduccion});
});

router.post('/del_produccion', function(req, res, next){
    var idf = JSON.parse(JSON.stringify(req.body)).idf;
    for(var t=0; t < req.session.arrayProduccion.length; t++){
       if(req.session.arrayProduccion[t][0] == idf){
        req.session.arrayProduccion.splice(t,1);
       } 
    }
    //req.session.arrayProduccion.push([input.idfabricaciones,input.detalle,input.restantes,input.ruta]);
    res.render('jefeprod/session_stream',{data:req.session.arrayProduccion});
});

router.post('/view_produccion', function(req, res, next){
    console.log(req.session.arrayProduccion);
    res.send(req.session.arrayProduccion);
});


router.post('/restore_fab', function(req, res, next){
    var idf = JSON.parse(JSON.stringify(req.body)).idf;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s", err);
        connection.query("SELECT ordenfabricacion.idordenfabricacion,fabricaciones.f_entrega, subaleacion.subnom, fabricaciones.idfabricaciones, material.detalle, fabricaciones.restantes,"
            +" producido.ruta FROM fabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join material on material.idmaterial ="
            +" fabricaciones.idmaterial left join producido on producido.idmaterial = material.idmaterial left join subaleacion on subaleacion.idsubaleacion = producido.idsubaleacion"
            +" WHERE idfabricaciones = ?",[idf], function(err, fab){
            if(err)
                console.log("Error Selecting : %s", err);

            console.log(fab);

            /*
            <td data-toggle="tooltip" data-placement="bottom" title="N° OF"><%=data[i].idordenfabricacion%></td>
            <td data-toggle="tooltip" data-placement="bottom" title="Producto"><%=letraMayus(data[i].detalle)%></td>
            <td data-toggle="tooltip" data-placement="bottom" title="Aleación" style="text-align: center"><%=data[i].subnom%></td>
            <td data-toggle="tooltip" data-placement="bottom" title="Necesitados" style="text-align: center"><%=data[i].restantes%></td>
            <td data-toggle="tooltip" data-placement="bottom" title="Fecha de Entrega" style="text-align: center"><%= new Date(data[i].f_entrega).toLocaleDateString()%></td>
            <td><a data-aleacion="<%= data[i].anom%>" data-restantes="<%= data[i].restantes%>" data-detalle="<%=data[i].detalle%>" data-id="<%= data[i].idfabricaciones%>" class="sendtoQueue btn btn-success"><i class="glyphicon glyphicon-plus"></i></a></td>
            */
            var html = '<td data-toggle="tooltip" data-placement="bottom" title="N° OF">'+fab[0].idordenfabricacion+'</td>\n';
            html += '<td data-toggle="tooltip" data-placement="bottom" title="Producto">'+fab[0].detalle.substring(0,1).toUpperCase()+fab[0].detalle.substring(1, fab[0].detalle.length).toLowerCase()+'</td>\n';
            html += '<td data-toggle="tooltip" data-placement="bottom" title="Aleación" style="text-align: center">'+fab[0].subnom+'</td>\n';
            html += '<td data-toggle="tooltip" data-placement="bottom" title="Necesitados" style="text-align: center">'+fab[0].restantes+'</td>\n';
            html += '<td data-toggle="tooltip" data-placement="bottom" title="Fecha de Entrega" style="text-align: center">'+new Date(fab[0].f_entrega).toLocaleDateString()+'</td>\n';
            html += '<td><a data-aleacion="'+fab[0].subnom+'" data-restantes="'+fab[0].restantes+'" data-detalle="'+fab[0].detalle+'" data-id="'+fab[0].idfabricaciones+'" class="btn btn-success" onclick="sendtoQueue(this)"><i class="glyphicon glyphicon-plus"></i></a></td>\n';
            console.log(html);
            res.send(html);
        });
    });
});


router.post('/save_op', function(req, res, next){
	var arrayDBP = [];
    var query = '';
    var input = JSON.parse(JSON.stringify(req.body));
    console.log(input);
	req.getConnection(function(err, connection){
		connection.query("INSERT INTO ordenproduccion (f_gen) VALUES (NOW())", function(err, oproduccion){
			if(err){
				console.log("Error Selecting : %s", err);
				res.send('Error');
			}
			else{
                var idope = oproduccion.insertId;
				for(var i=0; i<req.session.arrayProduccion.length; i++ ){
                    query += "UPDATE fabricaciones SET restantes=restantes-"+input.list[i]+
                        " WHERE idfabricaciones="+req.session.arrayProduccion[i][0]+"@";
                        if(input.dates[i] == null){
        					arrayDBP.push([parseInt(input.list[i]),req.session.arrayProduccion[i][0],oproduccion.insertId,parseInt(input.list[i]), new Date().toLocaleString() ]);
                        }
                        else{
                            arrayDBP.push([parseInt(input.list[i]),req.session.arrayProduccion[i][0],oproduccion.insertId,parseInt(input.list[i]), input.dates[i] ]);
                        }
                }
                query = query.substring(0, query.length-1) + '';
                query = query.split('@');
                //INSERT INTO `siderval`.`produccion` (`idfabricaciones`, `idordenproduccion`, `cantidad`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `standby`) VALUES ('12825', '14503', '1', '1', '0', '0', '0', '0', '0', '0', '0', '0');
                var insertquery = "INSERT INTO produccion (`cantidad`, `idfabricaciones`,`idordenproduccion`,`1`) VALUES ";
                for(var m=0; m<arrayDBP.length; m++){
                    insertquery += "("+arrayDBP[m][0]+","+arrayDBP[m][1]+","+arrayDBP[m][2]+","+arrayDBP[m][3]+"),";
                } 
                insertquery = insertquery.substring(0,insertquery.length-1);
                console.log(arrayDBP);
				connection.query("INSERT INTO produccion (`cantidad`, `idfabricaciones`,`idordenproduccion`,`1`, `f_program`) VALUES ?", [arrayDBP], function(err, producciones){
					if(err){
						console.log("Error Selecting : %s", err);
						res.send("Error");
					}
					else{
                        for(var j=0; j < query.length; j++){
                            connection.query(query[j], function(err, rows){
                                if(err){
                                    console.log("Error Selecting : %s", err);
                                }
                            });

                        }
						req.session.arrayProduccion = [];
	                    //io.emit('refreshfaena1');
	                    req.app.locals.io.emit('refreshfaena1');
                        req.app.locals.io.emit('notif-sol-abast');
                        console.log(idope);
                        res.send(idope+'');
                        //res.render('jefeprod/session_stream',{data:[]});
					}
				});

			}

		});
	});
});


router.get('/ordenes_produccion', function(req, res, next){
	req.getConnection(function(err, connection){
		connection.query('SELECT * FROM produccion LEFT JOIN ordenproduccion ON produccion.idordenproduccion=ordenproduccion.idordenproduccion', function(err, ops){
			if(err){console.log("Error Selecting : %s", err);}
			res.render('jefeprod/op_list', {data: ops});
		});
	});
});

router.get('/csv_op', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["N OP","Codigo","Nombre","Solicitados","En Faena","Finalizados","Fecha de creacion","Cliente"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT ordenproduccion.*,GROUP_CONCAT(REPLACE(material.detalle,',','.'),'@',fabricaciones.idorden_f,'@',produccion.cantidad,'@',material.codigo,'@',COALESCE(cliente.razon, 'Sin cliente')) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@',produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8) AS etapatoken FROM ordenproduccion " +
                " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion = fabricaciones.idorden_f left join odc on odc.idodc = ordenfabricacion.idodc left join cliente on cliente.idcliente = odc.idcliente" +
                " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                " GROUP BY ordenproduccion.idordenproduccion",
                function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    console.log(rows);
                    var tokenizer2,tokenizer,aux;
                    var f_gen = new Date().toLocaleString();
                    f_gen = f_gen.replace(/\s/g,'');
                    f_gen = f_gen.replace(/\:/g,'');
                    f_gen = f_gen.replace(/\//g,'');
                    f_gen = f_gen.replace(/\,/g,'');
                    if(rows.length){
                        // 'C:/Users/Go Jump/Desktop/'
                        writer.pipe(fs.createWriteStream('public/csvs/z_ops_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            tokenizer2 = rows[i].etapatoken.split(',');
                            tokenizer = rows[i].oftoken.split(',');
                            for(var j = 0;j<tokenizer.length;j++){
                                tokenizer[j] = tokenizer[j].split("@");
                                tokenizer2[j] = tokenizer2[j].split("@");
                                aux = parseInt(tokenizer[j][2]) - parseInt(tokenizer2[j][7]);
                                writer.write([rows[i].idordenproduccion,tokenizer[j][3],tokenizer[j][0],tokenizer[j][2],aux,tokenizer2[j][7],new Date(rows[i].f_gen).toLocaleDateString(),tokenizer[j][4]]);
                            }
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_ops_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});




router.get('/xlsx_op', function(req,res){
    if(verificar(req.session.userData)){
        //var csvWriter = require('csv-write-stream');
        //var writer = csvWriter({ headers: ["N OP","Codigo","Nombre","Solicitados","En Faena","Finalizados","Fecha de creacion","Cliente"]});
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('resummaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');
        //var writer = csvWriter({ headers: ["N OP","Nombre","Codigo","Solicitados","Moldeo","Fusion","Quiebre","Terminacion","T Termico","Maestranza","C de Calidad","Finalizados","Fecha de creacion","Cliente"]});
        sheet.columns = [
            { header: 'N°OP', key: 'nop', width: 15 },
            { header: 'N°OF', key: 'nof', width: 15 },
            { header: 'Codigo', key: 'code', width: 15 },
            { header: 'Detalle', key: 'details', width: 15 },
            { header: 'Solicitados', key: 'sol', width: 15 },
            { header: 'En Planta', key: 'plan', width: 15 },
            { header: 'Finalizados', key: 'fin', width: 15 },
            { header: 'Fecha de Creación', key: 'creacion', width: 15 },
            { header: 'Cliente', key: 'client', width: 15 }
        ];
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);
            connection.query("SELECT ordenfabricacion.idordenfabricacion,ordenproduccion.*,GROUP_CONCAT(REPLACE(material.detalle,',','.'),'@',fabricaciones.idorden_f,'@',produccion.cantidad,'@',material.codigo,'@',COALESCE(cliente.sigla, 'Sin cliente')) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@',produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8) AS etapatoken FROM ordenproduccion " +
                " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion = fabricaciones.idorden_f left join odc on odc.idodc = ordenfabricacion.idodc left join cliente on cliente.idcliente = odc.idcliente" +
                " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                " GROUP BY ordenproduccion.idordenproduccion",
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    console.log(rows);
                    if(rows.length>0){
                        var nombre = 'csvs/z_ops_hasta_' + ident + '.xlsx';
                        sheet.getCell('A1').value = 'N°OP';
                        sheet.getCell('B1').value = 'N°OF';
                        sheet.getCell('C1').value = 'Código';
                        sheet.getCell('D1').value = 'Detalle';
                        sheet.getCell('E1').value = 'Solicitados';
                        sheet.getCell('F1').value = 'En Planta';
                        sheet.getCell('G1').value = 'Finalizados';
                        sheet.getCell('H1').value = 'Fecha de Creación';
                        sheet.getCell('I1').value = 'Cliente';
                        var procesos;
                        var mat;
                        var auxrow = 2;
                        for(var j=0; j<rows.length; j++){
                            mat = rows[j].oftoken.split(',');
                            procesos = rows[j].etapatoken.split(',');
                            for(var w=0; w < mat.length; w++){

                        /*sheet.getCell('A1').value = 'N°OP';
                        sheet.getCell('B1').value = 'Detalle';
                        sheet.getCell('C1').value = 'Código';
                        sheet.getCell('D1').value = 'Solicitados';
                        sheet.getCell('E1').value = 'Moldeo';
                        sheet.getCell('F1').value = 'Fusión';
                        sheet.getCell('G1').value = 'Quiebre';
                        sheet.getCell('H1').value = 'Terminación';
                        sheet.getCell('I1').value = 'Tratamiento Térmico';
                        sheet.getCell('J1').value = 'Maestranza';
                        sheet.getCell('K1').value = 'Control de Calidad';
                        sheet.getCell('L1').value = 'Finalizados';
                        sheet.getCell('M1').value = 'Fecha de Creación';
                        sheet.getCell('N1').value = 'Cliente';*/



                                sheet.getCell('A' + auxrow.toString()).value = rows[j].idordenproduccion;
                                sheet.getCell('B' + auxrow.toString()).value = rows[j].idordenfabricacion;
                                sheet.getCell('C' + auxrow.toString()).value = mat[w].split('@')[3];
                                sheet.getCell('D' + auxrow.toString()).value = mat[w].split('@')[0];
                                sheet.getCell('E' + auxrow.toString()).value = mat[w].split('@')[2];
                                sheet.getCell('F' + auxrow.toString()).value = procesos[w].split('@')[0];
                                sheet.getCell('G' + auxrow.toString()).value = procesos[w].split('@')[7]
                                sheet.getCell('H' + auxrow.toString()).value = new Date(rows[j].f_gen).toLocaleString();
                                sheet.getCell('I' + auxrow.toString()).value = mat[w].split('@')[4];
                                auxrow++;
                            }
                            
                        }
                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
                                res.send('/csvs/z_ops_hasta_'+ ident + '.xlsx');

                            });
                    }

                });
        });
    }
    else res.redirect('/bad_login');
});



router.get('/csv_opdetalle', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["N OP","Nombre","Codigo","Solicitados","Moldeo","Fusion","Quiebre","Terminacion","T Termico","Maestranza","C de Calidad","Finalizados","Fecha de creacion","Cliente"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT ordenproduccion.*,GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),'@',fabricaciones.idorden_f,'@',produccion.cantidad,'@',material.codigo,'@',COALESCE(cliente.razon,'Sin Cliente')) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@',produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8) AS etapatoken FROM ordenproduccion " +
                " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion = fabricaciones.idorden_f left join odc on odc.idodc = ordenfabricacion.idodc left join cliente on cliente.idcliente = odc.idcliente" +
                " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                " GROUP BY ordenproduccion.idordenproduccion",
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
                        writer.pipe(fs.createWriteStream('public/csvs/z_opsdetalle_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            tokenizer2 = rows[i].etapatoken.split(',');
                            tokenizer = rows[i].oftoken.split(',');
                            for(var j = 0;j<tokenizer.length;j++){
                                console.log(tokenizer);
                                tokenizer[j] = tokenizer[j].split("@");
                                tokenizer2[j] = tokenizer2[j].split("@");
                                aux = parseInt(tokenizer[j][2]) - parseInt(tokenizer2[j][7]);
                                writer.write([rows[i].idordenproduccion,tokenizer[j][0],tokenizer[j][3],tokenizer[j][2],tokenizer2[j][0],tokenizer2[j][1],tokenizer2[j][2],tokenizer2[j][3],tokenizer2[j][4],tokenizer2[j][5],tokenizer2[j][6],tokenizer2[j][7],new Date(rows[i].f_gen).toLocaleDateString(), tokenizer[j][4]]);
                            }
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_opsdetalle_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});




router.get('/xlsx_opdetalle', function(req,res){
    if(verificar(req.session.userData)){
        var fs = require('fs');
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('ofmaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');
        //var writer = csvWriter({ headers: ["N OP","Nombre","Codigo","Solicitados","Moldeo","Fusion","Quiebre","Terminacion","T Termico","Maestranza","C de Calidad","Finalizados","Fecha de creacion","Cliente"]});
        sheet.columns = [
            { header: 'N°OP', key: 'nop', width: 15 },
            { header: 'N°OF', key: 'nof', width: 15 },
            { header: 'Detalle', key: 'details', width: 15 },
            { header: 'Codigo', key: 'code', width: 15 },
            { header: 'Solicitados', key: 'sol', width: 15 },
            { header: 'Moldeo', key: 'mol', width: 15 },
            { header: 'Fusión', key: 'fus', width: 15 },
            { header: 'Quiebre', key: 'quieb', width: 15 },
            { header: 'Terminación', key: 'term', width: 15 },
            { header: 'Tratamiento Térmico', key: 'trater', width: 15 },
            { header: 'Maestranza', key: 'maestr', width: 15 },
            { header: 'Control de Calidad', key: 'cc', width: 15 },
            { header: 'Finalizados', key: 'fin', width: 20 },
            { header: 'Fecha de creación', key: 'creacion', width: 10},
            { header: 'Cliente', key: 'planta', width: 15}
        ];
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);
            connection.query("SELECT ordenfabricacion.idordenfabricacion, ordenproduccion.*,GROUP_CONCAT(REPLACE(material.detalle, ',', '.'),'@',fabricaciones.idorden_f,'@',produccion.cantidad,'@',material.codigo,'@',COALESCE(cliente.sigla,'Sin Cliente')) as oftoken,GROUP_CONCAT(produccion.1,'@',produccion.2,'@',produccion.3,'@',produccion.4,'@',produccion.5,'@',produccion.6,'@',produccion.7,'@',produccion.8) AS etapatoken FROM ordenproduccion " +
                " LEFT JOIN produccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion = fabricaciones.idorden_f left join odc on odc.idodc = ordenfabricacion.idodc left join cliente on cliente.idcliente = odc.idcliente" +
                " LEFT JOIN producido ON fabricaciones.idproducto = producido.idproducto INNER JOIN material ON material.idmaterial = producido.idmaterial" +
                " GROUP BY ordenproduccion.idordenproduccion",
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    console.log(rows);
                    if(rows.length>0){
                        var nombre = 'csvs/master_op_' + ident + '.xlsx';
                        sheet.getCell('A1').value = 'N°OP';
                        sheet.getCell('B1').value = 'N°OF';
                        sheet.getCell('C1').value = 'Detalle';
                        sheet.getCell('D1').value = 'Código';
                        sheet.getCell('E1').value = 'Solicitados';
                        sheet.getCell('F1').value = 'Moldeo';
                        sheet.getCell('G1').value = 'Fusión';
                        sheet.getCell('H1').value = 'Quiebre';
                        sheet.getCell('I1').value = 'Terminación';
                        sheet.getCell('J1').value = 'Tratamiento Térmico';
                        sheet.getCell('K1').value = 'Maestranza';
                        sheet.getCell('L1').value = 'Control de Calidad';
                        sheet.getCell('M1').value = 'Finalizados';
                        sheet.getCell('N1').value = 'Fecha de Creación';
                        sheet.getCell('O1').value = 'Cliente';
                        var procesos;
                        var mat;
                        var auxrow = 2;
                        for(var j=0; j<rows.length; j++){
                            mat = rows[j].oftoken.split(',');
                            procesos = rows[j].etapatoken.split(',');
                            for(var w=0; w < mat.length; w++){
                                sheet.getCell('A' + auxrow.toString()).value = rows[j].idordenproduccion;
                                sheet.getCell('B' + auxrow.toString()).value = rows[j].idordenfabricacion;
                                sheet.getCell('C' + auxrow.toString()).value = mat[w].split('@')[0];
                                sheet.getCell('D' + auxrow.toString()).value = mat[w].split('@')[3];
                                sheet.getCell('E' + auxrow.toString()).value = mat[w].split('@')[2];
                                sheet.getCell('F' + auxrow.toString()).value = procesos[w].split('@')[0];
                                sheet.getCell('G' + auxrow.toString()).value = procesos[w].split('@')[1];
                                sheet.getCell('H' + auxrow.toString()).value = procesos[w].split('@')[2]
                                sheet.getCell('I' + auxrow.toString()).value = procesos[w].split('@')[3]
                                sheet.getCell('J' + auxrow.toString()).value = procesos[w].split('@')[4]
                                sheet.getCell('K' + auxrow.toString()).value = procesos[w].split('@')[5]
                                sheet.getCell('L' + auxrow.toString()).value = procesos[w].split('@')[6]
                                sheet.getCell('M' + auxrow.toString()).value = procesos[w].split('@')[7]
                                sheet.getCell('N' + auxrow.toString()).value = new Date(rows[j].f_gen).toLocaleString();
                                sheet.getCell('O' + auxrow.toString()).value = mat[w].split('@')[4];
                                auxrow++;
                            }
                            
                        }
                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
                                res.send('/csvs/master_op_'+ ident + '.xlsx');

                            });
                    }

                });
        });
    }
    else res.redirect('/bad_login');
});



router.post('/ficha_abastecimiento', function(req,res){
    var idop = JSON.parse(JSON.stringify(req.body)).idop;
    //var idop = req.params.idop;
    req.getConnection(function(err, connection){
        connection.query("select  material.detalle, material.codigo,produccion.cantidad, group_concat(billof.codigo separator '@') as code_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master, material.detalle,material.codigo,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
                        function(err, mats){
                            if(err)
                                console.log("Error Selecting : %s", err);
                            connection.query("select * from ordenproduccion where idordenproduccion=?", [idop], function(err, op){
                                if(err)
                                    console.log("Error Selecting : %s", err);
                                var phantom = require('phantom');   
                                phantom.create().then(function(ph) {
                                    ph.createPage().then(function(page) {
                                        page.open("http://localhost:4300/jefeprod/lista_abastecimiento_get/"+idop).then(function(status) {
                                            page.render('routes/boms/bom'+idop+'.pdf').then(function() {
                                                console.log('Page Rendered');
                                                ph.exit();
                                                var fs = require('fs');
                                                var filePath = '\\boms\\bom'+idop+'.pdf';
                                                console.log(__dirname + filePath);
                                                fs.readFile(__dirname + filePath , function (err,data){
                                                    res.contentType("application/pdf");
                                                    res.redirect('/jefeprod/show_pdf_bom/'+idop);
                                                    //res.send(data);
                                                });
                                                //res.send('/Users/dagui/Desktop/siderval/pdfs/odc'+oda[0].numoda+'-'+oda[0].idoda+'.pdf');
                                                //res.redirect("/plan/view_ordenpdf_get/"+oda[0].idoda);
                                            });
                                        });
                                    });
                                });
                                //res.render('jefeprod/ficha_abast',{bom: mats, op: op});
                            });
                        });
    });
});
router.get('/lista_abastecimiento_get/:idop', function(req,res){
    var idop = req.params.idop;
    //var idop = req.params.idop;
    req.getConnection(function(err, connection){
        connection.query("select  material.detalle, material.codigo,produccion.cantidad, group_concat(billof.codigo separator '@') as code_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
            "select bom.idmaterial_master, material.detalle,material.codigo,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave where material.notbom=true order by bom.idmaterial_master)"+
            "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("select * from ordenproduccion where idordenproduccion=?", [idop], function(err, op){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    
                    res.render('jefeprod/ficha_abast',{bom: mats, op: op});
                });
        });
    });
});
router.get('/show_pdf_bom/:idop', function(req,res){
    var idop = req.params.idop;
    var fs = require('fs');
    var filePath = '\\boms\\bom'+idop+'.pdf';
    console.log(__dirname + filePath);
    fs.readFile(__dirname + filePath , function (err,data){
        res.contentType("application/pdf");
        res.send(data);
    });
});
router.get('/render_notificaciones', function(req, res, next){
    req.getConnection(function(err,connection){
        connection.query("select notificacion.*,material.detalle,etapafaena.nombre_etapa from notificacion LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial LEFT JOIN etapafaena ON SUBSTRING_INDEX(notificacion.descripcion,'@',-1)=etapafaena.value WHERE SUBSTRING(notificacion.descripcion,1,3) = 'jfp' AND notificacion.active = true", function(err, notif){
            if(err){console.log("Error Selecting : %s", err);}


            console.log(notif);
            res.render('jefeprod/notificaciones', {notif: notif})
        });
    });
});


router.post('/predict_newop', function(req, res, next){
    var input = JSON.parse(JSON.stringify(req.body));
    console.log(input);
    req.getConnection(function(err,connection){
        connection.query("select produccion.idordenproduccion,ordenfabricacion.numordenfabricacion,"
                +"material.detalle,produccion.cantidad from produccion left join fabricaciones on "
                +"fabricaciones.idfabricaciones=produccion.idfabricaciones left join material on"
                +" material.idmaterial=fabricaciones.idmaterial left join ordenfabricacion on"
                +" ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f WHERE idproduccion = ?",[input.idp], function(err, produccion){
                if(err){console.log("Error Selecting : %s", err);}

                console.log(produccion);

                res.send({newop: produccion});
        });
    });
});



router.post('/new_prod_prima', function(req, res, next){
    var input = JSON.parse(JSON.stringify(req.body));
    console.log(input);
    req.getConnection(function(err,connection){
        connection.query("SELECT * FROM produccion WHERE idproduccion = ?",[input.idprod], function(err, prod){
                if(err){console.log("Error Selecting : %s", err);}

                console.log(prod);
                console.log(prod[0]['idordenproduccion']);
                
                prod[0]['1'] = 0;
                prod[0]['2'] = 0;
                prod[0]['3'] = 0;
                prod[0]['4'] = 0;
                prod[0]['5'] = 0;
                prod[0]['6'] = 0;
                prod[0]['7'] = 0;
                prod[0]['8'] = 0;
                prod[0][input.etapa] = parseInt(input.cant);
                prod[0].standby = 0;
                prod[0].abastecidos = 0;
                prod[0].cantidad = parseInt(input.cant);
                delete prod[0].idproduccion;
                delete prod[0].f_gen;
                console.log(prod);
                connection.query("INSERT INTO produccion SET ?", prod, function(err,rows){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    connection.query("UPDATE notificacion SET active = false WHERE idnotificacion = ?", [input.idnot], function(err,rows){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        


                        res.redirect('/jefeprod/render_notificaciones');

                    });
                });

                //res.send({newop: produccion});
        });
    });
});



router.post('/modif_op', function(req, res, next){
    var input = JSON.parse(JSON.stringify(req.body));
    console.log(input);
    req.getConnection(function(err,connection){
        connection.query("UPDATE produccion SET produccion.`"+input.newe+"` = produccion.`"+input.newe+"` + "+ input.cant+", standby = standby - "+input.cant+" WHERE produccion.idproduccion = ?",[input.idprod], function(err, prod){
                if(err){console.log("Error Selecting : %s", err);}

                console.log(prod);
                connection.query("UPDATE notificacion SET active = 0 WHERE notificacion.idnotificacion = ?",[input.idnot], function(err, upn){
                    if(err){console.log("Error Selecting : %s", err);}
                    console.log(upn);
                    res.redirect('/jefeprod/render_notificaciones');


                    //res.send({newop: produccion});
                });
        });
    });
});

module.exports = router;