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



    if(condiciones_where.length==0){
        where = "";
    }
    else{
        where = " WHERE "+ condiciones_where.join(" AND ");
    }

    return [where, limit,condiciones_where.join('@')];
}
function verificar(usr){
	if(usr.nombre == 'matprimas' || usr.nombre == 'siderval'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(req.session.userData.nombre == 'matprimas'){
    	res.render('matprimas/indx_new', {page_title: "Materias Primas", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});
// Enviar la vista para registrar un movimiento
router.get("/crear_movimiento",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT idmaterial,codigo,detalle,stock,u_medida as u_compra FROM material WHERE ((codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%' OR tipo = 'X' OR tipo = 'S' OR tipo = 'C') AND material.detalle != '') OR codigo in ('P02000063001','P02000063002','P01020704006' ,'P01043604003' ,'P01054104002' ,'P01043004004' ,'P01043004001' ,'P01054104007' ) GROUP BY material.detalle",function (err,materiales) {
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
            connection.query("SELECT idmaterial,codigo,detalle,stock,u_medida as u_compra FROM material WHERE ((codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%' OR tipo = 'X' OR tipo = 'S' OR tipo = 'C') AND material.detalle != '') OR codigo in ('P02000063001','P02000063002','P01020704006' ,'P01043604003' ,'P01054104002' ,'P01043004004' ,'P01043004001' ,'P01054104007' ) GROUP BY material.detalle",function (err,materiales) {
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
                	if(typeof req.body['lista_m[]'] == 'string'){ // si sólo se seleccionó un material para el movimiento
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
                        for(var i = 0; i< req.body['lista_m[]'].length;i++){
                            lista.push([req.body['lista_v[]'][i],req.body['lista_m[]'][i],row.insertId]); // Agrupar el idmaterial con el reitro y la cantidad pedida
                            query = query + "WHEN idmaterial = " + req.body['lista_m[]'][i] + " THEN stock " + inventario_char + " " + req.body['lista_v[]'][i] + " "; // añadir CASE a la query para ajustar stocks
                        }
                        query += "end WHERE idmaterial IN ?"; //Terminar la query de actualización de stocks
                        connection.query("INSERT INTO movimiento_detalle (`cantidad`,`idmaterial`,`idmovimiento`) VALUES ?",[lista],function(err,rows){ //insertar el detalle del movimiento
                            if(err)console.log(err);
                            connection.query(query,[[req.body['lista_m[]']]],function(err,rows){// Actualizar el stock
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
                            "tipo": '2',
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
            +" from material left join recurso on recurso.idmaterial=material.idmaterial left join abastecimiento on abastecimiento.idmaterial = material.idmaterial left join oda on oda.idoda = abastecimiento.idoda left join cliente on cliente.idcliente=oda.idproveedor " +
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
               connection.query('SELECT abastecimiento.*, material.detalle, material.stock FROM abastecimiento '+
                   'LEFT JOIN material ON abastecimiento.idmaterial = material.idmaterial WHERE abastecimiento.cantidad > abastecimiento.recibidos AND !abastecimiento.fd',
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
            connection.query("select oda.numoda,abastecimiento.idabast,material.idmaterial,material.detalle,coalesce(material.u_medida,'und') AS umed,abastecimiento.cantidad,abastecimiento.recibidos"
                    + " from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on "
                    + "abastecimiento.idmaterial = material.idmaterial WHERE oda.idoda = ? and abastecimiento.recibidos < abastecimiento.cantidad group by abastecimiento.idabast",[req.body.numoda],function(err,rows){
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
        var ids = '';
        var idsm = '';

        var query = "UPDATE abastecimiento SET recibidos = CASE";
        var query2 = "UPDATE material SET stock = CASE";

        for(var e=1; e < Object.size(input); e++){
            recep_d.push([0, input['detalle['+(e-1)+'][]'][0], input['detalle['+(e-1)+'][]'][1] ]);
            ids +=  input['detalle['+(e-1)+'][]'][0]+",";
            idsm +=  input['detalle['+(e-1)+'][]'][2]+",";

            query += " WHEN idabast = "+input['detalle['+(e-1)+'][]'][0]+" THEN recibidos+"+parseInt(input['detalle['+(e-1)+'][]'][1]);
            query2 += " WHEN idmaterial = "+input['detalle['+(e-1)+'][]'][2]+" THEN stock+"+parseInt(input['detalle['+(e-1)+'][]'][1]);

        }
        query += " ELSE recibidos END WHERE idabast IN ("+ids.substring(0,ids.length-1)+")";
        query2 += " ELSE stock END WHERE idmaterial IN ("+idsm.substring(0,idsm.length-1)+")";

        console.log(query);
        console.log(query2);

        req.getConnection(function(err, connection){
            if(err){ console.log("Error Connection : %s", err);}

            connection.query("INSERT INTO recepcion (numgd, fecha) VALUES ?", [recep], function(err, inRecep){
                if(err){ console.log("Error Insert : %s", err);}

                //console.log(inRecep);
                for(var p=0; p < recep_d.length; p++){
                    recep_d[p][0] = inRecep.insertId;
                }
                console.log(recep_d);
                connection.query("INSERT INTO recepcion_detalle (idrecepcion, idabast, cantidad) VALUES ?", [recep_d], function(err, inRecepD){
                    if(err) {console.log("Error Insert : %s", err);}

                    console.log(inRecepD);
                    connection.query(query, function(err, upAbast){
                        if(err) {console.log("Error Insert : %s", err);}

                        console.log(upAbast);
                        connection.query(query2, function(err, upMat){
                            if(err) {console.log("Error Insert : %s", err);}

                            console.log(upMat);
                            res.redirect('/matprimas/busq_oda');
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
            connection.query("SELECT * FROM (select movimiento.*, movimiento.tipo as tipo_mov, coalesce(movimiento_detalle.cantidad,0) as cantidad, material.detalle,"
                +"movimiento.etapa as nombre_etapa"
                +" from movimiento_detalle"
                +" left join movimiento on movimiento.idmovimiento=movimiento_detalle.idmovimiento"
                +" left join material on material.idmaterial=movimiento_detalle.idmaterial"
                +" left join etapafaena on etapafaena.value = movimiento.etapa) as all_data "+where+" ORDER BY all_data.f_gen DESC"+ limit, function(err, mov){
                if(err) throw err;

                res.render('matprimas/table_movimientos', {data: mov});
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

        var condiciones_where = ["recepcion.visible"];
        if(input.cond != ''){
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

module.exports = router;
