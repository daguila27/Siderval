var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;
router.use(
    connection(mysql,dbCredentials,'pool')

);
function getConditionArray(object_fill,array_fill, condiciones_where, input){
    var clave;
    var limit = "";
    if(input.ispage === 'true'){
        limit = " limit " + ( ( (parseInt(input.page)-1)*100) )+",100";
    }

    if(input.clave == '' || input.clave == null || input.clave == undefined){
        clave = [];
    }
    else{
        clave = input.clave.split(',');
    }
    if(clave.length>0){
        for(var e=0; e < clave.length; e++){
            if(clave[e].split('@')[2] == 'off') {
                object_fill[array_fill[parseInt(clave[e].split('@')[0])] + "-off"].push(array_fill[parseInt(clave[e].split('@')[0])] + " LIKE '%" + clave[e].split('@')[1] + "%'");
            }
            else{
                object_fill[array_fill[parseInt(clave[e].split('@')[0])]+ "-on"].push(array_fill[parseInt(clave[e].split('@')[0])] + " NOT LIKE '%" + clave[e].split('@')[1] + "%'");
            }
            //condiciones_where.push(array_fill[parseInt(clave[e].split('@')[0])]+" LIKE '%"+clave[e].split('@')[1]+"%'");
        }

    }
    for(var w=0; w < Object.keys(object_fill).length; w++){
        if(object_fill[Object.keys(object_fill)[w]].length > 0){
            //LAS CONDICIONES not like DEBEN CONCATENARSE CON and Y LAS like CON or
            if(Object.keys(object_fill)[w].split('-')[1] == 'off'){
                condiciones_where.push("("+object_fill[Object.keys(object_fill)[w]].join(' OR ')+")");
            }
            else{
                condiciones_where.push("("+object_fill[Object.keys(object_fill)[w]].join(' AND ')+")");
            }
        }
    }

    var where = " ";
    if(input.rango.length > 0){
        if(input.isRango === 'true'){
            console.log(input.columnaRango + " BETWEEN '"+input.rango.split('@')[0]+" 00:00:00' AND '"+input.rango.split('@')[1]+" 23:59:59' ");
            condiciones_where.push( input.columnaRango + " BETWEEN '"+input.rango.split('@')[0]+" 00:00:00' AND '"+input.rango.split('@')[1]+" 23:59:59' ");
        }
    }



    if(condiciones_where.length === 0){
        where = "";
    }
    else{
        where = " WHERE "+ condiciones_where.join(" AND ");
    }

    return [where, limit,condiciones_where.join('@')];
}
function verificar(usr){
	if(usr.nombre === 'matprimas' || usr.nombre === 'siderval' || usr.nombre === 'gestionpl'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(req.session.userData.nombre === 'matprimas'){
    	res.render('matprimas/indx_new', {page_title: "Materias Primas", username: req.session.userData.nombre, route: '/matprimas/view_mprimas'});
	}
	else{res.redirect('bad_login');}	
});


router.post('/indx', function(req, res, next) {
    var r = req.body.route.split('%').join('/');
    if(req.session.userData.nombre === 'matprimas'){
        res.render('matprimas/indx_new', {page_title: "Materias Primas", username: req.session.userData.nombre, route: r});
    }
    else{res.redirect('bad_login');}
});



// Enviar la vista para registrar un movimiento
router.get("/crear_movimiento",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT " +
                "material.idmaterial, material.codigo, material.detalle, material.stock, material.u_medida as u_compra, COALESCE(query_reserv.reservados, 0) AS reservados " +
                "FROM material " +
                "LEFT JOIN (select fabricaciones.idmaterial, SUM(reservacion_detalle.cantidad) AS reservados from reservacion_detalle LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones \n" +
                "WHERE reservacion_detalle.estado = 0 GROUP BY fabricaciones.idmaterial) AS query_reserv ON query_reserv.idmaterial = material.idmaterial " +
                "WHERE ((codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%' OR tipo = 'X' OR tipo = 'S' OR tipo = 'C') AND material.detalle != '') OR codigo in ('P02000063001','P02000063002','P01020704006' ,'P01043604003' ,'P01054104002' ,'P01043004004' ,'P01043004001' ,'P01054104007' ) GROUP BY material.detalle",function (err,materiales) {
                if(err) console.log(err);
                res.render("matprimas/create_retiro",{mat: materiales});
            });
        });
    } else res.redirect("/bad_login");
});
// Enviar la vista para registrar un movimiento (DEVOLUCIÓN)
router.get("/crear_movimiento_dev",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT " +
                "material.idmaterial, material.codigo, material.detalle, material.stock, material.u_medida as u_compra, COALESCE(query_reserv.reservados, 0) AS reservados " +
                "FROM material " +
                "LEFT JOIN (select fabricaciones.idmaterial, SUM(reservacion_detalle.cantidad) AS reservados from reservacion_detalle LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones \n" +
                "WHERE reservacion_detalle.estado = 0 GROUP BY fabricaciones.idmaterial) AS query_reserv ON query_reserv.idmaterial = material.idmaterial " +
                "WHERE ((codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%' OR tipo = 'X' OR tipo = 'S' OR tipo = 'C') AND material.detalle != '') OR codigo in ('P02000063001','P02000063002','P01020704006' ,'P01043604003' ,'P01054104002' ,'P01043004004' ,'P01043004001' ,'P01054104007' ) GROUP BY material.detalle",function (err,materiales) {
                if(err) console.log(err);

                console.log(materiales.length);
                res.render("matprimas/create_devolucion",{mat: materiales});
            });
        });
    } else res.redirect("/bad_login");
});
// Procesar creación de un movimiento
router.post("/save_movimiento",function(req,res,next){
	var lista = [];
	var inventario_char = "";
	switch (parseInt(req.body.tipo)){
        case 1: // Devolución
            inventario_char = "+";
            break;
        default: // Retiro
            inventario_char = "-";
            break;
    }
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            //req.body = {
			// 		lista_m: [idmaterial1,idmaterial2,...],
			// 		lista_v:[cant1,cant2,...],
            //      tipo: 0 | 1,
			// 		etapa: "...",
			// 		receptor: "..."
			// }
            connection.query("INSERT INTO movimiento SET ?",{etapa: req.body.etapa,receptor: req.body.receptor,tipo: req.body.tipo},function(err,row){
                if(err) console.log(err);
                //Revisar si se creó el movimiento
                if(row){
                	if(typeof req.body['lista_m[]'] === 'string'){ // si sólo se seleccionó un material para el movimiento
                		var data = {
                			cantidad: req.body['lista_v[]'],
							idmaterial: req.body['lista_m[]'],
							idmovimiento: row.insertId
						};
                        connection.query("INSERT INTO movimiento_detalle SET ?",[data],function(err,rows){// Crear el detalle del movimiento
                            if(err) console.log(err);
                            connection.query("UPDATE material SET stock = stock " + inventario_char + " ? WHERE idmaterial = ?",[req.body['lista_v[]'],req.body['lista_m[]']],function(err,rows){ //cambia el stock del único material seleccionado
                                if(err) console.log(err);
                                res.send({err:false,msg:"El movimiento se registró exitosamente"});

                            });
                        });
					} else { // sis se seleccionaron mas de uno
                		var query = "UPDATE material SET stock = CASE "; //partir creando el query para actualizar el stock
                        var query = []; //partir creando el query para actualizar el stock

                        for(var i = 0; i< req.body['lista_m[]'].length;i++){
                            lista.push([req.body['lista_v[]'][i],req.body['lista_m[]'][i],row.insertId]); // Agrupar el idmaterial con el reitro y la cantidad pedida
                            //query = query + "WHEN idmaterial = " + req.body['lista_m[]'][i] + " THEN stock " + inventario_char + " " + req.body['lista_v[]'][i] + " "; // añadir CASE a la query para ajustar stocks
                            query.push("WHEN idmaterial = " + req.body['lista_m[]'][i] + " THEN stock " + inventario_char + " " + req.body['lista_v[]'][i] + " "); // añadir CASE a la query para ajustar stocks
                        }
                        query = "UPDATE material SET stock = CASE " +query.join('') + "ELSE stock END WHERE idmaterial IN ("+req.body['lista_m[]'].join(',')+")"; //Terminar la query de actualización de stocks

                        console.log(query);
                        connection.query("INSERT INTO movimiento_detalle (`cantidad`,`idmaterial`,`idmovimiento`) VALUES ?",[lista],function(err,rows){ //insertar el detalle del movimiento
                            if(err)console.log(err);
                            connection.query(query,function(err,rows){// Actualizar el stock
                                if(err) console.log(err);
                                res.send({err:false,msg:"El movimiento se registró exitosamente"});
                            });
                        });
					};
                } else res.send({err: true,message: "No se pudo crear el movimiento"});
            });
        });
    } else res.redirect("/bad_login");
});

router.get("/view_mprimas",function(req,res,next){
    if(req.session.userData){
        res.render('matprimas/view_mprimas');
    } else res.redirect("/bad_login");
});

router.get("/view_registros",function(req,res,next){
    if(req.session.userData){
        res.render('matprimas/view_registros');
    } else res.redirect("/bad_login");
});

router.post('/table_registros', function(req,res,next){
    var input = JSON.parse(JSON.stringify(req.body));
    var array_fill = [
        "table_query.idregistro",
        "table_query.detalle",
        "table_query.responsable"
    ];
    var object_fill = {
        "table_query.idregistro-on": [],
        "table_query.detalle-on": [],
        "table_query.responsable-on": [],
        "table_query.idregistro-off": [],
        "table_query.detalle-off": [],
        "table_query.responsable-off": []
    };
    var condiciones_where = [];
    if(input.cond != ''){
        for(var e=0; e < input.cond.split('@').length; e++){
            condiciones_where.push(input.cond.split('@')[e]);
        }
    }
    var result = getConditionArray(object_fill,array_fill, condiciones_where, input);
    var where = result[0];
    var limit = result[1];
    req.getConnection(function(err, connection){
        if(err) throw err;
        connection.query(
            "SELECT * FROM (SELECT " +
            "movimiento.idmovimiento as idregistro,movimiento.etapa," +
            "movimiento.f_gen as fecha, movimiento.tipo, movimiento.receptor as responsable," +
            "material.detalle, " +
            "material.u_medida, " +
            "movimiento_detalle.cantidad " +
            "from movimiento_detalle " +
            "left join movimiento on movimiento.idmovimiento = movimiento_detalle.idmovimiento " +
            "left join material on material.idmaterial = movimiento_detalle.idmaterial ORDER BY movimiento.f_gen DESC) as table_query " +
            where +" "+limit ,
            function(err, mov){
                if(err)
                    console.log("Error Selecting : %s", err);

                connection.query("SELECT * FROM (select " +
                    "recepcion.numgd as idregistro, " +
                    "recepcion_detalle.cantidad, " +
                    "recepcion.fecha," +
                    "material.detalle, " +
                    "material.u_medida, " +
                    "cliente.sigla as responsable " +
                    "from recepcion_detalle " +
                    "left join recepcion on recepcion.idrecepcion = recepcion_detalle.idrecepcion " +
                    "left join abastecimiento on abastecimiento.idabast = recepcion_detalle.idabast " +
                    "left join material on material.idmaterial = abastecimiento.idmaterial " +
                    "left join oda on oda.idoda = abastecimiento.idoda " +
                    "left join cliente on cliente.idcliente = oda.idproveedor ORDER BY recepcion.fecha DESC) as table_query " +
                    where +" "+limit, function(err, recep){
                    if(err)
                        console.log("Error Selecting : %s", err);

                    var obj;
                    for(var e=0; e < recep.length; e++){
                        obj = {
                            "idregistro": recep[e].idregistro,
                            "fecha": recep[e].fecha,
                            "tipo": 2,
                            "responsable": recep[e].responsable,
                            "detalle": recep[e].detalle,
                            "u_medida": recep[e].u_medida,
                            "cantidad": recep[e].cantidad,
                            "etapa": 11
                        };
                        mov.push(obj);
                    }
                    console.log(mov[0]);
                    res.render('matprimas/table_registros', {data: mov});
                });
            });
    });
});




router.post('/table_mprimas', function(req,res,next){
    var input = JSON.parse(JSON.stringify(req.body));
    var array_fill = [
        "table_query.descripcion",
        "table_query.u_medida",
        "table_query.sigla"
    ];
    var object_fill = {
        "table_query.descripcion-on": [],
        "table_query.u_medida-on": [],
        "table_query.sigla-on": [],
        "table_query.descripcion-off": [],
        "table_query.u_medida-off": [],
        "table_query.sigla-off": []
    };
    var condiciones_where = [];
    if(input.cond != ''){
        for(var e=0; e < input.cond.split('@').length; e++){
            condiciones_where.push(input.cond.split('@')[e]);
        }
    }
    var result = getConditionArray(object_fill,array_fill, condiciones_where, input);
    var where = result[0];
    var limit = result[1];
    req.getConnection(function(err, connection){
        if(err) throw err;
        connection.query("select * from (select material.show_abast, material.show_mp, material.codigo, material.idmaterial as idmatpri, detalle"
            +" as descripcion, stock,stock_i,stock_c, u_medida,precio as costoxu, coalesce(cliente.sigla, 'No Definido') as sigla"
            +" from material " +
            "left join recurso on recurso.idmaterial=material.idmaterial " +
            "left join abastecimiento on abastecimiento.idmaterial = material.idmaterial " +
            "left join oda on oda.idoda = abastecimiento.idoda " +
            "left join cliente on cliente.idcliente=oda.idproveedor " +
            "GROUP BY material.idmaterial) as table_query " +
            where +" "+limit ,
            function(err, mat){
                if(err)
                    console.log("Error Selecting : %s", err);

                res.render('matprimas/table_mprimas', {mat: mat});
            });
    });
});





/*
* CONTROLADOR QUE RENDERIZA LA VISTA PRINCIPAL DE Materias Primas --> Movimientos --> Ver Movimientos
* */



router.get("/busq_oda",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function (err,connection) {
           if (err) {console.log('We got a problem dude');}
           else {
               connection.query('SELECT abastecimiento.*, material.detalle, COALESCE(pedido.bmi, false) AS bmi, COALESCE(pedido.externo, false) AS externo, material.stock FROM abastecimiento '+
                   'LEFT JOIN material ON abastecimiento.idmaterial = material.idmaterial ' +
                   'LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = abastecimiento.idfabricacion ' +
                   'LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido ' +
                   'WHERE abastecimiento.cantidad > abastecimiento.recibidos AND !abastecimiento.fd',
                   function(err, abast) {
                   //console.log(abast);
                   res.render("matprimas/search_oda", {abast: abast});
               });
           }
        });

    } else {res.redirect("/bad_login");}
});

/*
* CONTROLADOR QUE ENVÍA VISTA PARA RECEPCIÓN DE OCA
* */
router.post("/search_oca",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("select oda.numoda,COALESCE(pedido.bmi, false) AS bmi,abastecimiento.idabast,material.idmaterial,material.detalle," +
                "coalesce(material.u_medida,'und') AS umed,abastecimiento.cantidad,abastecimiento.recibidos"
                    + " FROM abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on "
                    + "abastecimiento.idmaterial = material.idmaterial " +
                "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = abastecimiento.idfabricacion " +
                "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido " +
                "WHERE oda.idoda = ? and abastecimiento.recibidos < abastecimiento.cantidad GROUP BY abastecimiento.idabast",[req.body.numoda],function(err,rows){
                if(err) console.log(err);

                console.log(rows);
                if(rows.length){
                    res.render("matprimas/oda_recep",{data:rows},function(err,html){
                        if(err) console.log(err);
                        res.send({err: false,err_msg: "Exito",html:html});
                    });
                } else {
                    res.send({err: true,err_msg: "No se encontró ninguna OC con tal número"});
                }
            });

        });
    } else res.redirect("/bad_login");
});

Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)){
            size++;
        }
    }
    return size;
};

/*
* CONTROLADOR QUE REGISTRA LA RECEPCIÓN DESDE PROVEEDORES
* */
router.post("/save_recepcion",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        var recep = [[input.numgdd, new Date().toLocaleDateString()]];
        var recep_d = [];
        var ids = [];
        var idsm = [];
        var idsm_c = [];
        var recep_bmi = [];

        var query = "UPDATE abastecimiento SET recibidos = CASE";
        var query2 = "UPDATE material SET stock = CASE";
        for(var e=1; e < Object.size(input); e++){
            recep_d.push([0, input['detalle['+(e-1)+'][]'][0], input['detalle['+(e-1)+'][]'][1]]);
            ids.push(input['detalle['+(e-1)+'][]'][0]);
            //SE ACUMULAN LOS STOCK DE MATERIALES
            if(idsm.indexOf(input['detalle['+(e-1)+'][]'][2]) === -1){
                idsm.push(input['detalle['+(e-1)+'][]'][2]);
                idsm_c.push(parseInt(input['detalle['+(e-1)+'][]'][1]));
            }else{
                idsm_c[idsm.indexOf(input['detalle['+(e-1)+'][]'][2])] += idsm_c[idsm.indexOf(input['detalle['+(e-1)+'][]'][2])] + parseInt(input['detalle['+(e-1)+'][]'][1]);
            }
            query += " WHEN idabast = "+input['detalle['+(e-1)+'][]'][0]+" THEN recibidos+"+parseInt(input['detalle['+(e-1)+'][]'][1]);
            //query2 += " WHEN idmaterial = "+input['detalle['+(e-1)+'][]'][2]+" THEN stock+"+parseInt(input['detalle['+(e-1)+'][]'][1]);
            if(input['detalle['+(e-1)+'][]'][3] === '1'){
                recep_bmi.push(input['detalle['+(e-1)+'][]'][0]);
            }
        }


        for(var e=0; e < idsm.length; e++){
            query2 += " WHEN idmaterial = "+idsm[e]+" THEN stock+"+idsm_c[e];
        }

        query += " ELSE recibidos END WHERE idabast IN ("+ids.join(',')+")";
        query2 += " ELSE stock END WHERE idmaterial IN ("+idsm.join(',')+")";

        var notif_tokens = [];
        //var notif_tokens_bmi = [];
        //EN recep_bmi ESTAN TODOS LOS oca_items (abastecimiento) VINCULADOS CON UN pedido DE TIPO bmi
        recep_bmi.map(function(idabast){
            //bmiReserv : Notificaciones para Planificación informando la llegada de los productos con el fin de que cree la reservación
            //bmiOca: Notificación a Bodega Materias Primas informando la llegada de los productos con el fin de que prepare la reservación
            notif_tokens.push(["bmiReserv@"+idabast+"@"+ new Date().toLocaleString()]);
            //notif_tokens_bmi.push(["bmiOca@"+idabast+"@"+ new Date().toLocaleString()]);
        });

        req.getConnection(function(err, connection){
            if(err){ console.log("Error Connection : %s", err);}

            connection.query("INSERT INTO recepcion (numgd, fecha) VALUES ?", [recep], function(err, inRecep){
                if(err){ console.log("Error Insert : %s", err);}

                for(var p=0; p < recep_d.length; p++){
                    recep_d[p][0] = inRecep.insertId;
                }
                connection.query("INSERT INTO recepcion_detalle (idrecepcion, idabast, cantidad) VALUES ?", [recep_d], function(err, inRecepD){
                    if(err) {console.log("Error Insert : %s", err);}

                    connection.query(query, function(err, upAbast){
                        if(err) {console.log("Error Insert : %s", err);}

                        connection.query(query2, function(err, upMat){
                            if(err) {console.log("Error Insert : %s", err);}

                            if(notif_tokens.length > 0){
                                connection.query("INSERT INTO notificacion (descripcion) VALUES ?", [notif_tokens], function(err, inNotif){
                                    if(err) {console.log("Error Insert : %s", err);}

                                    var idnotif = [];
                                    for(var t=0; t < notif_tokens.length; t++){idnotif.push( t + inNotif.insertId );}
                                    res.send(JSON.stringify(idnotif));

                                });
                            }else{
                                res.send(JSON.stringify([]));

                            }
                        });
                    });
                });
            });
        });
    } else res.send({err:true,err_msg:"Ha ocurrido un error."});
});
/*
* Controlador que renderiza la vista Mat_primas --> Registrar Llegada de Productos.
* */
router.get("/view_movimientos",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM etapafaena", function(err, etp){
                if(err) throw err;
                res.render('matprimas/view_movimientos', {etp: etp});
            });
        });
    } else res.redirect("/bad_login");
});

router.post("/table_movimientos",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        //var orden = input.orden.replace('-', ' ');
        var etapas = [
            "jefe de produccion",
            "moldeo",
            "fusion",
            "quiebre",
            "terminación",
            "tratamiento termico",
            "maestranza",
            "control de calidad",
            "mantencion",
            "externo",
            "otros"
        ];
        var array_fill = [
            "all_data.idmovimiento",
            "all_data.detalle",
            "all_data.nombre_etapa",
            "all_data.tipo",
            "all_data.receptor"
        ];
        var object_fill = {
            "all_data.idmovimiento-on": [],
            "all_data.detalle-on": [],
            "all_data.nombre_etapa-on": [],
            "all_data.tipo-on": [],
            "all_data.receptor-on": [],
            "all_data.idmovimiento-off": [],
            "all_data.detalle-off": [],
            "all_data.nombre_etapa-off": [],
            "all_data.tipo-off": [],
            "all_data.receptor-off": []
        };
        var clave;
        console.log(clave);

        if(input.clave === '' || input.clave == null || input.clave == undefined){
            clave = [];
        }
        else{
            clave = input.clave.split(',');
        }
        console.log(clave);

        var where = "";
        var condiciones_where = [];
        var coalesce_in = [];
        var coalesce_tip = [];
        for(var a=0; a < clave.length; a++){
            if(clave[a].split('@')[0] == '2'){
                for(var b=0; b < etapas.length; b++){
                    if(etapas[b].includes(clave[a].split('@')[1].toLowerCase())){
                        if(coalesce_in.indexOf(b) == -1){
                            coalesce_in.push(b);
                        }
                    }
                }
            }
            else if(clave[a].split('@')[0] == '3'){
                if("devolucion".includes(clave[a].split('@')[1].toLowerCase())){
                    coalesce_tip.push(1);
                }
                else if("retiro".includes(clave[a].split('@')[1].toLowerCase())){
                    coalesce_tip.push(0);
                }
            }
        }
        coalesce_in = "("+coalesce_in.join(',')+")";
        coalesce_tip = "("+coalesce_tip.join(',')+")";
        var firts_etp = false;
        var firts_tip = false;
        if(clave.length>0){
            for(var e=0; e < clave.length; e++){
                if(clave[e].split('@')[0] != '2' && clave[e].split('@')[0] != '3') {
                    condiciones_where.push(array_fill[parseInt(clave[e].split('@')[0])] + " LIKE '%" + clave[e].split('@')[1] + "%'");
                }
                else if(!firts_etp && clave[e].split('@')[0] == '2' && coalesce_in != "()"){
                    condiciones_where.push(array_fill[parseInt(clave[e].split('@')[0])] + " in " + coalesce_in);
                    firts_etp = true;
                }
                else if(!firts_tip && clave[e].split('@')[0] == '3' && coalesce_tip != "()"){
                    condiciones_where.push(array_fill[parseInt(clave[e].split('@')[0])] + " in " + coalesce_tip);
                    firts_tip = true;
                }
            }
        }

        if(input.rango != ''){
            condiciones_where.push("all_data.f_gen BETWEEN '" +input.rango.split('@')[0]+" 00:00:00' AND '"+input.rango.split('@')[1]+" 23:59:59'")
        }
        if(condiciones_where.length>0){
            where = " WHERE ("+condiciones_where.join(' AND ')+")";
        }
        console.log(where);

        var result = getConditionArray(object_fill,array_fill, condiciones_where, input);

        console.log(result);
        var limit = result[1];
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM (select movimiento.*, movimiento.tipo as tipo_mov, coalesce(movimiento_detalle.cantidad,0) as cantidad, material.idmaterial, material.detalle,"
                +"movimiento.etapa as nombre_etapa"
                +" from movimiento_detalle"
                +" left join movimiento on movimiento.idmovimiento=movimiento_detalle.idmovimiento"
                +" left join material on material.idmaterial=movimiento_detalle.idmaterial"
                +" left join etapafaena on etapafaena.value = movimiento.etapa) as all_data "+where+" ORDER BY all_data.f_gen DESC"+ limit, function(err, mov){
                if(err) throw err;

                res.render('matprimas/table_movimientos', {data: mov, user: req.session.userData.nombre });
            });
        } );
    } else res.redirect("/bad_login");
});
/*
* Controlador que renderiza la vista Mat_primas --> Ver Recepciones.
* */
router.get("/view_recep",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM etapafaena", function(err, etp){
                if(err) throw err;
                res.render('matprimas/view_recepcion', {etp: etp});
            });
        });
    } else res.redirect("/bad_login");
});
router.post("/table_recepcion",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var array_fill = [
            "recepcion.numgd",
            "material.detalle",
            "recepcion.fecha"
        ];
        var object_fill = {
            "recepcion.numgd-on": [],
            "material.detalle-on": [],
            "recepcion.fecha-on": [],
            "recepcion.numgd-off": [],
            "material.detalle-off": [],
            "recepcion.fecha-off": []
        };

        var condiciones_where = [];
        if(input.cond !== ''){
            for(var e=0; e < input.cond.split('@').length; e++){
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        var result = getConditionArray(object_fill,array_fill, condiciones_where, input);
        var where = result[0];
        var limit = result[1];
        console.log(result);
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select recepcion.*, recepcion_detalle.*, material.*"
                +" from recepcion_detalle"
                +" left join recepcion on recepcion.idrecepcion = recepcion_detalle.idrecepcion"
                +" left join abastecimiento on abastecimiento.idabast = recepcion_detalle.idabast"
                +" left join material on material.idmaterial=abastecimiento.idmaterial"
                + where + " GROUP BY recepcion_detalle.idrecepcion_d ORDER BY recepcion.fecha DESC "+ limit, function(err, mov){
                if(err) throw err;
                res.render('matprimas/table_recepcion', {data: mov});
            });
        } );
    } else res.redirect("/bad_login");
});



/*
* CONTROLADOR QUE RENDERIZA LA VISTA de inventarios rotativos
* */
router.get("/inventarios",function(req,res,next){
    if(req.session.userData){
        res.render("matprimas/inventario");
    } else {res.redirect("/bad_login");}
});

// Retorna tabla inventarios, recibe datos del filtro
router.post("/table_inventario",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT idmaterial, tipo, detalle, stock,(select max(semana) from inventario) as semana FROM material"
                + " WHERE (tipo='M' OR tipo='S' OR tipo='I') AND detalle LIKE '%" + input.filtro + "%'", function(err,rows){
                if(err) console.log(err);
                res.render("matprimas/table_inventario",{data: rows, semana: input.semana});
            });
        });
    } else res.redirect("/bad_login");
});


router.get("/anular_movimiento_modal/:idmov/:idmat",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT movimiento_detalle.*, movimiento.*, material.u_medida,material.detalle, material.stock FROM movimiento_detalle " +
                "LEFT JOIN movimiento ON movimiento.idmovimiento = movimiento_detalle.idmovimiento " +
                "LEFT JOIN material ON material.idmaterial = movimiento_detalle.idmaterial WHERE movimiento_detalle.idmovimiento IN ("+req.params.idmov+") and movimiento_detalle.idmaterial IN ("+req.params.idmat+")", function(err,rows){
                if(err) console.log(err);
                connection.query("SELECT max(idmovimiento) as last FROM movimiento", function(err, last){
                    if(err) console.log(err);

                    console.log(rows);
                    rows = rows[0];
                    last = last[0].last + 1;
                    res.render("matprimas/anular_movimiento_modal", {data: rows, last: last});
                });

            });
        });
    } else res.redirect("/bad_login");
});


router.post("/anular_movimiento",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var er = false;
        var operacion = "+";
        //DEVOLUCIÓN
        if(input.tipo = '1'){operacion = "+";}
        //RETIRO
        else{operacion = "-";}
        var movInsert = {
            etapa: input.etap,
            receptor: input.resp,
            tipo: input.tipo,
            esanulacion: true
        };
        var movdetInsert = {
            idmovimiento: input.idmo,
            idmaterial: input.idma,
            anulado: false,
            cantidad: input.cant
        };
        console.log(movdetInsert);
        console.log(movInsert);
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("INSERT INTO movimiento SET ?",[movInsert], function(err,newMov){
                if(err) {
                    console.log(err);
                    er = true;
                }
                else{
                    movdetInsert.idmovimiento = newMov.insertId;
                }
                connection.query("INSERT INTO movimiento_detalle SET ?",[movdetInsert], function(err,rows){
                    if(err) {
                        console.log(err);
                        er = true;
                    }
                    connection.query("UPDATE movimiento_detalle SET anulado = true WHERE idmovimiento = "+input.idmo+" AND idmaterial = "+input.idma, function(err,rows){
                        if(err) {
                            console.log(err);
                            er = true;
                        }
                        connection.query("UPDATE material SET stock = stock "+operacion+" "+input.cant+" WHERE idmaterial = "+input.idma, function(err,rows){
                            if(err) {
                                console.log(err);
                                er = true;
                            }
                            if(er){
                                res.send("error");
                            }else{
                                res.send("ok");
                            }
                        });
                    });
                });
            });
        });
    } else res.redirect("/bad_login");
});



router.get("/anular_recepcion_modal/:idrec",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT cliente.sigla, cliente.razon,recepcion.numgd, recepcion.fecha as fecha_recepcion , abastecimiento.idabast as item ,abastecimiento.idmaterial, abastecimiento.idoda, recepcion_detalle.*,material.detalle,material.stock,material.u_medida FROM recepcion_detalle " +
                "LEFT JOIN recepcion ON recepcion.idrecepcion = recepcion_detalle.idrecepcion " +
                "LEFT JOIN abastecimiento ON abastecimiento.idabast = recepcion_detalle.idabast " +
                "LEFT JOIN material ON material.idmaterial = abastecimiento.idmaterial " +
                "LEFT JOIN oda ON oda.idoda = abastecimiento.idoda " +
                "LEFT JOIN cliente ON cliente.idcliente = oda.idproveedor " +
                "WHERE recepcion_detalle.idrecepcion = "+req.params.idrec+" ORDER BY abastecimiento.idabast ASC", function(err,rows){
                if(err) console.log(err);

                var oda = {};
                var rec = {};
                if(rows.length>0){
                    oda['idoda'] = rows[0].idoda;
                    oda['cliente'] = rows[0].sigla;
                    rec['numgd'] = rows[0].numgd;
                    rec['fecha'] = rows[0].fecha_recepcion;
                    rec['idrecepcion'] = rows[0].idrecepcion;

                }
                res.render("matprimas/anular_recepcion_modal", {data: rows, oda: oda, rec: rec});
            });
        });
    } else res.redirect("/bad_login");
});


router.post("/anular_recepcion",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        /*
        * { 'idabast[]': [ '7827', '7828' ],
              'idmat[]': [ '111713', '111663' ],
              'cant[]': [ '200', '400' ] }
        *
        *
        * UPDATE `table` SET `uid` = CASE
                WHEN id = 1 THEN 2952
                WHEN id = 2 THEN 4925
                WHEN id = 3 THEN 1592
                ELSE `uid`
                END
            WHERE id  in (1,2,3)
        * */
        var queryabs = "";
        var querymat = "";
        var abast = {};
        var mats = {};

        if(typeof input['idabast[]'] === 'string'){
            input['idabast[]'] = [input['idabast[]']];
            input['idmat[]'] = [input['idmat[]']];
            input['cant[]'] = [input['cant[]']];
        }
        //SE AGRUPA POR FABRICACION Y POR MATERIAL
        for(var t=0; t < input['idabast[]'].length; t++){
            if(Object.keys(abast).indexOf(input['idabast[]'][t]) === -1){
                abast[input['idabast[]'][t]] = parseInt(input['cant[]'][t]);
            }
            else{
                abast[input['idabast[]'][t]] += parseInt(input['cant[]'][t]);
            }

            if(Object.keys(mats).indexOf(input['idmat[]'][t]) === -1){
                mats[input['idmat[]'][t]] = parseInt(input['cant[]'][t]);
            }
            else{
                mats[input['idmat[]'][t]] += parseInt(input['cant[]'][t]);
            }
            //queryfab += " WHEN fabricaciones.idabast = ? THEN fabricaciones.recibidos = fabricaciones.recibidos - "+input['cant[]'][t];
        }
        console.log(abast);
        console.log(mats);
        for(var f=0; f < Object.keys(abast).length; f++){
            if(f === 0){queryabs += "UPDATE abastecimiento SET abastecimiento.recibidos = CASE ";}
            queryabs += " WHEN abastecimiento.idabast = "+Object.keys(abast)[f]+" THEN abastecimiento.recibidos - "+Object.values(abast)[f];
        }
        for(var m=0; m < Object.keys(mats).length; m++){
            if(m === 0){querymat += "UPDATE material SET material.stock = CASE ";}
            querymat += " WHEN material.idmaterial = "+Object.keys(mats)[m]+" THEN material.stock - "+Object.values(mats)[m];
        }
        queryabs += " ELSE abastecimiento.recibidos END WHERE abastecimiento.idabast IN ("+Object.keys(abast).join(',')+")";
        querymat += " ELSE material.stock END WHERE material.idmaterial IN ("+Object.keys(mats).join(',')+")";
        console.log(queryabs);
        console.log(querymat);
        var er = false;
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("UPDATE recepcion SET anulado = true WHERE idrecepcion = "+input.idrecepcion, function(err,upRec){
                if(err) {
                    console.log(err);
                    er = true;
                }
                connection.query(queryabs, function(err, upAbast){
                    if(err) {
                        console.log(err);
                        er = true;
                    }
                    connection.query(querymat, function(err, upMat){
                        if(err) {
                            console.log(err);
                            er = true;
                        }
                        if(er){
                            res.send('error');
                        }else{
                            res.send('ok');
                        }
                    });
                });
            });
        });
    } else res.redirect("/bad_login");
});



router.get("/view_reservaciones",function(req,res,next){
    if(req.session.userData){
        res.render('matprimas/view_reservaciones', {sel: [],redirect: false});
    } else res.redirect("/bad_login");
});

router.post("/table_reservaciones",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        var array_fill = [
            "reservacion.idreservacion",
            "material.detalle"
        ];
        var object_fill = {
            "reservacion.idreservacion-off": [],
            "material.detalle-off": [],
            "reservacion.idreservacion-on": [],
            "material.detalle-on": []
        };
        var condiciones_where = [];
        console.log(input.cond);
        if(input.cond != '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);
        var where = result[0];
        var limit = result[1];
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("SELECT COALESCE(queryOCA.recibidos,0) AS recibidos_oca, reservacion_detalle.*, reservacion.fecha AS fecha_reserv, odc.numoc, fabricaciones.idorden_f, material.detalle, material.idmaterial, pedido.cantidad AS cantidad_ped FROM reservacion_detalle \n" +
                "LEFT JOIN reservacion ON reservacion.idreservacion = reservacion_detalle.idreservacion \n" +
                "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones \n" +
                "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                "LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                "LEFT JOIN (SELECT fabricaciones.idfabricaciones, sum(abastecimiento.recibidos) AS recibidos FROM abastecimiento INNER JOIN fabricaciones ON fabricaciones.idfabricaciones = abastecimiento.idfabricacion GROUP BY fabricaciones.idfabricaciones) AS queryOCA ON queryOCA.idfabricaciones = fabricaciones.idfabricaciones \n" +
                "LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial "+ where +" "+ limit, function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}

                res.render('matprimas/table_reservaciones', {data: rows});
            });
        });
    } else res.redirect("/bad_login");
});

//SI estado ES 0 SIGNIFICA QUE SE ESTA POR PREPARAR LA RESERVACION
//SI estado ES 1 SIGNIFICA QUE SE ESTA POR RETIRAR LA RESERVACION
//ADEMAS INDICA A DONDE REDIRECCIONARÁ LUEGO DE CONFIRMAR LA TRANSACCIÓN
router.get("/crear_movimiento_vista/:idreservaciones_det/:estado",function(req,res,next){
    if(req.session.userData){
        var cant = "0 AS cant_reserv,";
        var url = '/matprimas/preparar_reserva';
        var titulo = 'Preparando Reservación';
        var msg = '¡Reservación Preparada con Exito!';
        console.log(typeof req.params.estado);
        if(req.params.estado === '0'){
            cant = "COALESCE(reservacion_detalle.sin_prep, 0) AS cant_reserv,";
            url = '/matprimas/preparar_reserva';
            titulo = 'Preparando Reservación';
            msg = '¡Reservación Preparada con Exito!';
        }
        else if(req.params.estado === '1'){
            cant = "COALESCE(reservacion_detalle.sin_prep, 0) AS cant_reserv,";
            url = '/matprimas/crear_movimiento_reserva';
            titulo = 'Retirando Reservación';
            msg = '¡Reservación Retirada con Exito!';
        }

        console.log(req.params.idreservaciones_det);
        req.getConnection(function (err, connection) {
            if(err){console.log("Error Connecting : %s", err);}

            connection.query("SELECT MAX(idmovimiento)+1 AS new_id FROM movimiento", function(err, mov){
                if(err){console.log("Error Selecting : %s", err);}

                connection.query("SELECT odc.*, cliente.*, fabricaciones.idorden_f AS idof  FROM reservacion_detalle \n" +
                    "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones \n" +
                    "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                    "LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                    "LEFT JOIN cliente ON cliente.idcliente = odc.idcliente \n" +
                    "WHERE reservacion_detalle.idreservacion_d IN ("+req.params.idreservaciones_det.split('-').join(',')+")", function(err, odc){

                    if(err){console.log("Error Selecting : %s", err);}
                    //LA PRIMERA PETICION ENTREGA LOS DATOS DE LA OC (COMO CLIENTE,NUMERO,ETC).
                    //SE TOMA SOLO EL PRIMER REGISTRO PUES EL MOVMIENTO SOLO PUEDE CORRESPONDER A UNA OC
                    if(odc){odc = odc[0];}
                    connection.query("SELECT " +
                        "reservacion_detalle.*, "+cant+"  reservacion.fecha AS fecha_reserv,material.stock, " +
                        "odc.numoc, fabricaciones.idorden_f, material.detalle, material.idmaterial, " +
                        "pedido.cantidad AS cantidad_ped, pedido.idpedido " +
                        "FROM reservacion_detalle \n" +
                        "LEFT JOIN reservacion ON reservacion.idreservacion = reservacion_detalle.idreservacion \n" +
                        "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones \n" +
                        "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                        "LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                        "LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial " +
                        "WHERE reservacion_detalle.idreservacion_d IN ("+req.params.idreservaciones_det.split('-').join(',')+")",
                        function(err, rows){
                            if(err){console.log("Error Selecting : %s", err);}

                            res.render('matprimas/crear_movimiento_vista', {titulo: titulo,data: rows, odc: odc, mov: mov[0].new_id, url: url, msg: msg});
                    });
                });
            });
        });
    } else res.redirect("/bad_login");
});


router.post("/crear_movimiento_reserva",function(req,res,next){
    if(req.session.userData){
        //[[idmaterial, idreservacion_d, cantidad, idpedido],...]
        var input = JSON.parse(JSON.parse(JSON.stringify(req.body)).data);
        var mov = [];
        var idmat = [];
        var idped = [];
        var idreserv = [];
        var upStock = "";
        var upReserv = "";
        var upReserv2 = "";
        var msg = 'ok';
        /*
        * UPDATE `table` SET `uid` = CASE
            WHEN id = 1 THEN 2952
            WHEN id = 2 THEN 4925
            WHEN id = 3 THEN 1592
            ELSE `uid`
            END
        WHERE id  in (1,2,3)
        * */
        for(var e=0; e < input.length; e++){
            if(e === 0){
                upReserv += "UPDATE reservacion_detalle SET ret = CASE ";
                upReserv2 += "UPDATE reservacion_detalle SET sin_prep = CASE ";
            }
            mov.push([input[e][0], parseInt(input[e][2]) ]);
            idreserv.push(input[e][1]);
            if(idmat.indexOf(input[e][0]) === -1){
                idmat.push([input[e][0], parseInt(input[e][2])]);
            }else{
                idmat[idmat.indexOf(input[e][0])][1] = idmat[idmat.indexOf(input[e][0])][1] + parseInt(input[e][2]);
            }

            if(idped.indexOf(input[e][3]) === -1){
                idped.push(input[e][3]);
            }


            upReserv += " WHEN idreservacion_d = "+input[e][1]+" THEN ret + "+input[e][2];
            upReserv2 += " WHEN idreservacion_d = "+input[e][1]+" THEN sin_prep - "+input[e][2];

            if(e === input.length - 1){
                upReserv += " ELSE ret END WHERE idreservacion_d IN ("+idreserv.join(',')+")";
                upReserv2 += " ELSE sin_prep END WHERE idreservacion_d IN ("+idreserv.join(',')+")";
            }
        }
        console.log(upReserv);
        console.log(upReserv2);
        for(var m=0; m < idmat.length; m++){
            upStock += " WHEN material.idmaterial = "+idmat[m][0]+" THEN material.stock - "+idmat[m][1];
            //ARMANDO ARREGLO SOLO CON idmaterial
            idmat[m] = idmat[m][0];
        }
        upStock = "UPDATE material SET material.stock = CASE "+upStock+" ELSE material.stock END WHERE material.idmaterial IN ("+idmat.join(',')+")";
        req.getConnection(function (err, connection) {
            if(err){
                console.log("Error Connecting : %s", err);
                msg = "error";
            }

            //INSERT INTO `siderval`.`movimiento` (`etapa`, `receptor`, `tipo`, `esanulacion`) VALUES ('11', 'Retiro por Reservación', '1', '0');
            connection.query("INSERT INTO movimiento (etapa, receptor, tipo, esanulacion) VALUES ('11', 'Retiro por Reservación', '0', '0')",
                function(err, inMov){
                if(err){console.log("Error Inserting : %s", err);
                    msg = "error";
                }

                for(var e=0; e < mov.length; e++){
                    mov[e].push(inMov.insertId);
                }
                connection.query("INSERT INTO movimiento_detalle (idmaterial, cantidad, idmovimiento) VALUES ?", [mov], function(err, inMovDet){
                    if(err){console.log("Error Inserting : %s", err);
                        msg = "error";
                    }

                    connection.query(upStock, function(err, upSt){
                        if(err){console.log("Error Updating : %s", err);
                            msg = "error";
                        }
                        //SE ENLAZA LA RESERVACIÓN CON UN NUMERO DE MOVIMIENTO, ES POSIBLE IDENTIFICAR EL MOVIMIENTO ESPECIFICO MEDIANTE idmaterial
                        //SE ACTUALIZA LA CANTIDAD DESDE prep A ret
                        connection.query(upReserv,
                            function(err, upReservQ){
                            if(err){console.log("Error Updating : %s", err);
                                msg = "error";
                            }
                            connection.query(upReserv2,
                                function(err, upReservQ2) {
                                    if (err) {
                                        console.log("Error Updating : %s", err);
                                        msg = "error";
                                    }
                                    //CREAR NOTIFICACION A BODEGA PARA DESPACHAR PRODUCTOS
                                    //token : crgdd@idped@fecha
                                    var tokens = [];
                                    idped.map(function (item) {
                                        tokens.push(["crgdd@" + item + "@" + new Date().toLocaleString()]);
                                    });
                                    connection.query("INSERT INTO notificacion (descripcion) VALUES ?", [tokens], function (err, inNotif) {
                                        if (err) {
                                            console.log("Error Inserting : %s", err);
                                            msg = "error";
                                        }
                                        console.log(inNotif);
                                        var idn_array = [];
                                        for (var e = 0; e < tokens.length; e++) {
                                            idn_array.push(e + inNotif.insertId);
                                        }
                                        //ARREGLO CON LOS ID DE NOTIFICACION RECIEN INGRESADOS
                                        console.log(JSON.stringify(idn_array));
                                        //SE CONCATENA EL MENSAJE DE RESPUESTE JUNTO CON EL JSON DE idn_array
                                        res.send(msg + "@" + JSON.stringify(idn_array));
                                    });
                            });
                        });
                    });
                });

            });
        });
    } else{ res.redirect("/bad_login"); }
});


router.post("/preparar_reserva",function(req,res,next){
    if(req.session.userData){
        //[[idmaterial, idreservacion_d, cantidad, idpedido],...]
        var input = JSON.parse(JSON.parse(JSON.stringify(req.body)).data);
        //NO PUEDE HABER IN idreservacion_d REPETIDO.
        console.log("PREPARANDO RESERVA ...");
        console.log(input);
        var updateReserv = "";
        var updateReserv2 = "";
        /*
        * UPDATE `table` SET `uid` = CASE
            WHEN id = 1 THEN 2952
            WHEN id = 2 THEN 4925
            WHEN id = 3 THEN 1592
            ELSE `uid`
            END
        WHERE id  in (1,2,3)
        * */
        var id_rd = [];
        console.log(input.length );
        for(var e=0; e < input.length; e++){
            console.log(e);
            if(e === 0){
                updateReserv+="UPDATE reservacion_detalle SET ret = CASE ";
                updateReserv2+="UPDATE reservacion_detalle SET sin_prep = CASE ";
            }
            updateReserv += " WHEN idreservacion_d = "+input[e][1]+" THEN ret + "+input[e][2];
            updateReserv2 += " WHEN idreservacion_d = "+input[e][1]+" THEN sin_prep - "+input[e][2];
            id_rd.push(input[e][1]);
            if(e === input.length - 1){
                updateReserv += " ELSE ret END WHERE idreservacion_d IN ("+id_rd.join(',')+")";
                updateReserv2 += " ELSE sin_prep END WHERE idreservacion_d IN ("+id_rd.join(',')+")";
            }
        }
        console.log(updateReserv);
        console.log(updateReserv2);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query(updateReserv, function(err, upReserv){
                if(err){console.log("Error Updating : %s", err);}

                console.log(upReserv);
                connection.query(updateReserv2, function(err, upReserv2){
                    if(err){console.log("Error Updating : %s", err);}

                    console.log(upReserv2);
                    res.send("ok@0");

                });

            });
        });

    } else{ res.redirect("/bad_login"); }
});



router.get('/notif_bmi', function(req, res, next){
    req.getConnection(function(err,connection){
        if(err){
            console.log("Error Connection : %s", err);
        }
        connection.query("SELECT notificacion.*, reservacion_detalle.*,odc.numoc,odc.idodc,material.detalle, pedido.numitem,pedido.idpedido FROM notificacion " +
            "LEFT JOIN reservacion_detalle ON reservacion_detalle.idreservacion_d = substring_index(substring_index(descripcion, '@', 2),'@',-1) " +
            "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones " +
            "LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial " +
            "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido " +
            "LEFT JOIN odc ON odc.idodc = pedido.idodc " +
            "WHERE (descripcion LIKE 'bmiOca@%' AND active = true)",
            function(err, notif){
                if(err){
                    console.log("Error Selecting : %s", err);
                }

                res.render('matprimas/notificaciones', {notif: notif});

            });
    });
});



router.get('/get_reserv_info/:idreserv/:idreservd/:idnotif', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        connection.query("SELECT reservacion_detalle.idreservacion_d, material.detalle, odc.numoc, reservacion_detalle.sin_prep FROM reservacion_detalle \n" +
            "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones \n" +
            "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
            "LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
            "LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
            "WHERE idreservacion IN (?) AND reservacion_detalle.sin_prep>0", [req.params.idreserv], function (err, reserv) {

            if (err) console.log("Error Selecting : %s", err);

            var numoc;
            if(reserv.length > 0){
                numoc = reserv[0].numoc;
            }else{
                numoc = "Desconocido";
            }

            res.render('matprimas/modal_notif_reserv', {data: reserv, numoc: numoc, idnotif: req.params.idnotif});
        });
    });
});




router.post('/view_reservaciones_post', function(req, res){
    if(verificar(req.session.userData)) {
        var input = JSON.parse(JSON.parse(JSON.stringify(req.body)).idreservd);
        console.log("/view_reservaciones_post");
        console.log(input);
        res.render('matprimas/view_reservaciones', {sel: input, redirect: true});
    }
    else{res.redirect('bad_login');}
});


router.get('/drop_notif/:idnotif', function(req, res, next){
    req.getConnection(function(err,connection){
        if(err){
            console.log("Error Connection : %s", err);
        }
        connection.query("UPDATE notificacion SET active = false WHERE idnotificacion = ?",[req.params.idnotif],
            function(err, notif){
                if(err){
                    console.log("Error Selecting : %s", err);
                }
                res.redirect('/matprimas/notif_bmi');
            });
    });
});

module.exports = router;
