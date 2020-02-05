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

    return [where, limit];
}

function verificar(usr){
	return usr.nombre === 'gestionpl' || usr.nombre === 'bodega' || usr.nombre === 'plan' || usr.nombre === 'siderval' || usr.nombre === 'jefeplanta' || usr.nombre === 'test' || usr.nombre === 'matprimas';
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(req.session.userData.nombre === 'bodega'){
    	res.render('bodega/index_new', {page_title: "Bodega", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});


router.get('/crear_recepcion', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("SELECT " +
                "abastecimiento.idoda,abastecimiento.idabast,fabricaciones.idfabricaciones,produccion.idproduccion," +
                "abastecimiento.cantidad," +
                "abastecimiento.recibidos," +
                "material.detalle," +
                "pedido.idodc, coalesce(odc.numoc, 'OF/ODV') as numoc," +
                "fabricaciones.idorden_f " +
                "FROM abastecimiento " +
                "LEFT JOIN produccion ON abastecimiento.idproduccion = produccion.idproduccion " +
                "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                "LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial " +
                "LEFT JOIN producido ON producido.idmaterial = material.idmaterial " +
                "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido LEFT JOIN odc ON odc.idodc = pedido.idodc " +
                "WHERE (coalesce(pedido.externo, producido.ruta like '%,e%') || producido.ruta like '%,e%') AND abastecimiento.cantidad > abastecimiento.recibidos", function(err, abast){
                //EN EL CASO DE LOS MATERIALES CON ETAPA EXTERNALIZADA INTERMEDIA
                if(err){console.log("Error Selecting : %s", err);}
                /*REQUISITOS:
                    1. Tener enlazado algúna OCA.
                    2. Contener 'e' (Externo) en ruta de producción.
                */
                //console.log(abast);
                res.render('bodega/crear_recepcion', {data: abast});
            });
        });
    }
    else{res.redirect('bad_login');}
});



router.post('/save_recepcion_externo', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var data = JSON.parse(input.data);
        var recep = [input.numgd, 0];
        var recep_d = [];
        for(var e=0; e < data.length; e++){recep_d.push([data[e][0], data[e][2]]);}
        var query = "";
        var ids = [];
        var idfab = [];
        for(var a=0; a < data.length; a++){
            idfab.push(data[a][1]);
            if(a===0){query = "UPDATE abastecimiento SET recibidos = CASE ";}
            query += " WHEN idabast = "+data[a][0]+" THEN recibidos + "+data[a][2];
            ids.push(data[a][0]);
            if(a===data.length-1){query += " ELSE recibidos END WHERE idabast IN ("+ids.join(',')+")";}
        }
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("INSERT INTO recepcion(numgd, visible) VALUES ?",[[recep]], function(err, inRec){
                if(err){console.log("Error Inserting: %s", err);}

                for(var r=0; r < recep_d.length; r++){
                    recep_d[r][2] = inRec.insertId;
                }
                console.log(recep_d);
                connection.query("INSERT INTO recepcion_detalle(idabast, cantidad, idrecepcion) VALUES ?", [recep_d], function(err, inRecDet){
                    if(err){console.log("Error Inserting: %s", err);}

                    //SE ACTUALIZAN LOS recibidos DE LA TABLA abastecimiento
                    connection.query(query, function(err, rows){
                        if(err){console.log("Error Updating: %s", err);}

                        //A CONTINUACION SE DEBE CREAR LA OP RESPECTIVA A LA PRODUCCIÓN QUE COMENZARÁ DESDE Externalizado, LUEGO SE REALIZA EL MOVIMIENTO A LA SIGUIENTE ETAPA
                        //SI LA OP YA ESTA CREADA SE DEBE REALIZAR EL MOVIMIENTO A LA ETAPA SIGUIENTE DE Externalizado
                        connection.query("select " +
                            "pedido.externo," +
                            "fabricaciones.*," +
                            "coalesce(producido.ruta,'e,7,8') as ruta " +
                            "from fabricaciones " +
                            "left join pedido on pedido.idpedido = fabricaciones.idpedido " +
                            "left join produccion on produccion.idfabricaciones = fabricaciones.idfabricaciones " +
                            "left join material on material.idmaterial = fabricaciones.idmaterial " +
                            "left join producido on producido.idmaterial = fabricaciones.idmaterial " +
                            "WHERE fabricaciones.idfabricaciones IN ("+idfab.join(',')+")", function(err, fabs){
                                if(err){console.log("Error Selecting: %s", err);}

                                console.log(fabs);
                                var idfabs = [];
                                //SE CREA UN ARRYA CON LOS idfabricaciones SEGUN ORDEN DE APARICION, DE ESTA MANERA SE PUEDE
                                //OBTENER LA POSICION DE CADA FABRICACION EN fabs
                                for(var w=0; w < fabs.length; w++){
                                    idfabs.push(fabs[w].idfabricaciones);
                                }
                                var prod = [];
                                var prod_h = [];
                                var idprods = [];
                                var query_f = "";
                                var aux;
                                var query_ext = "";
                                var query_cc = "";

                                for(var q=0; q < data.length; q++ ){
                                    if(q===0){
                                        query_ext = "UPDATE produccion SET produccion.e = CASE ";
                                        query_cc = "UPDATE produccion SET produccion.7 = CASE ";
                                    }
                                    idprods.push(data[q][3]);
                                    query_ext += "WHEN produccion.idproduccion = '"+data[q][3]+"' THEN produccion.e - "+data[q][2]+" ";
                                    query_cc += "WHEN produccion.idproduccion = '"+data[q][3]+"' THEN produccion.7 + "+data[q][2]+" ";
                                    //LA CANTIDAD TOTAL A PRODUCIR SE INICIA DESDE LA SEGUNDA ETAPA
                                    //idfabricaciones  cantidad_recibida etapa2
                                    aux = {
                                        idfabricaciones: data[q][1],
                                        cantidad: data[q][2]
                                    };

                                    aux[ fabs[idfabs.indexOf( parseInt(data[q][1]) )].ruta.split(',')[1] ] = data[q][2];
                                    //prod.push(aux);
                                    prod.push([data[q][1], data[q][2], data[q][2]]);
                                    //SE CREA EL MOVIMIENTO
                                    //enviado from to
                                    prod_h.push([data[q][2], 'e', '7', data[q][3]]);
                                    //prod_h.push([data[q][2], fabs[idfabs.indexOf( parseInt(data[q][1]) )].ruta.split(',')[0], fabs[idfabs.indexOf( parseInt(data[q][1]) )].ruta.split(',')[1]]);

                                    if(q===0){query_f = "UPDATE fabricaciones SET restantes = CASE ";}
                                    query_f += " WHEN idfabricaciones = "+data[q][1]+" THEN restantes - "+data[q][2];
                                    if(q===data.length-1){query_f += " ELSE restantes END WHERE idfabricaciones IN ("+idfabs.join(',')+")";}
                                }
                                query_ext += " ELSE produccion.e END WHERE idproduccion IN ("+idprods.join(',')+")";
                                query_cc += " ELSE produccion.7 END WHERE idproduccion IN ("+idprods.join(',')+")";
                                console.log(query_f);
                                //SE ASUME QUE LA SIGUIENTE ETAPA A EXTERNALIZADO EN Cc
                                connection.query(query_ext, function(err, queExt){
                                    if(err){console.log("Error Inserting : %s", err);}
                                    connection.query(query_cc, function(err, queCc){
                                        if(err){console.log("Error Inserting : %s", err);}
                                        connection.query(query_f, function(err, queF){
                                            if(err){console.log("Error Inserting : %s", err);}
                                            console.log("Actualizando restantes en fabricaciones");
                                            connection.query("INSERT INTO produccion_history(enviados, `from`, `to`, idproduccion) VALUES ?", [prod_h], function(err, inProdH){
                                                if(err){console.log("Error Inserting : %s", err);}

                                                res.redirect('/bodega/crear_recepcion');
                                            });
                                        });
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

router.get('/crear_gdd', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("SELECT MAX(idgd) as id FROM gd", function(err, num){
                if(err){console.log("Error Selecting : %s", err);}
                num = num[0].id+1;
                connection.query("SELECT * FROM cliente", function(err, cli) {
                    if (err) {console.log("Error Selecting : %s", err);}
                    //COALESCE(queryReservados.reservados, 0) AS reservados ENTREGA LA CANTIDAD QUE SE HA RESERVADO EN BMI
                    // Y ADEMAS YA SE HA RETIRADO (reservacion_detalle.estado = 1)
                    connection.query("SELECT COALESCE(queryReservados.reservados, 0) AS reservados , fabricaciones.idorden_f as numof, cliente.idcliente,cliente.sigla AS cliente,pedido.idpedido as idpedido,pedido.numitem as numitem,pedido.bmi, coalesce(pl.cantidad,0) as pl_cantidad, pedido.cantidad-coalesce(pl.cantidad,0) as cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                        +"odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                        +" left join (select pedido.idpedido, sum(palet_item.cantidad) as cantidad from pedido left join palet_item on palet_item.idpedido = pedido.idpedido left join palet on palet.idpalet = palet_item.idpalet where !palet.desp group by palet_item.idpedido) as pl on pl.idpedido = pedido.idpedido"
                        +" left join odc on odc.idodc=pedido.idodc" +
                        " left join cliente on cliente.idcliente=odc.idcliente" +
                        " left join producido on producido.idmaterial=material.idmaterial" +
                        " left join fabricaciones on fabricaciones.idpedido = pedido.idpedido LEFT JOIN (SELECT fabricaciones.idfabricaciones, SUM(reservacion_detalle.ret) AS reservados FROM reservacion_detalle " +
                        " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones WHERE reservacion_detalle.ret > 0 GROUP BY fabricaciones.idfabricaciones) AS queryReservados ON queryReservados.idfabricaciones = fabricaciones.idfabricaciones " +
                        " left join ordenfabricacion on fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                        +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) where pedido.despachados!=pedido.cantidad-coalesce(pl.cantidad,0) group by pedido.idpedido order by pedido.f_entrega asc",
                        function(err, rows){
                            if(err)
                                console.log("Error Selecting :%s", err);

                            connection.query("select " +
                                "palet_item.*, " +
                                "material.detalle, material.idmaterial,pedido.idpedido," +
                                "odc.numoc,pedido.numitem," +
                                "palet.idpackinglist," +
                                "q_palet.peso_palet, cliente.sigla," +
                                "material.peso,cliente.idcliente " +
                                "from palet_item " +
                                "left join palet on palet.idpalet = palet_item.idpalet " +
                                "left join pedido on pedido.idpedido = palet_item.idpedido " +
                                "left join odc on odc.idodc = pedido.idodc " +
                                "left join cliente on cliente.idcliente = odc.idcliente " +
                                "left join material on material.idmaterial = pedido.idmaterial " +
                                "left join (select palet.idpalet, sum(material.peso*palet_item.cantidad) as peso_palet from palet_item left join palet on palet.idpalet = palet_item.idpalet left join pedido on pedido.idpedido = palet_item.idpedido left join material on material.idmaterial = pedido.idmaterial group by palet.idpalet) as q_palet on q_palet.idpalet = palet.idpalet " +
                                "where palet.idpackinglist is not null and palet.desp is false", function(err, palet){
                                if(err)
                                    console.log("Error Selecting :%s", err);

                                res.render('bodega/g_despacho', {data: rows, palet: palet, num: num, blanco: 0, cli: cli, sel: [], redirect: false});
                            });
                        });
                });
            });
            
        });
    }
    else{res.redirect('bad_login');}
});


//CONTROLADOR IGUAL QUE '/crear_gdd' SOLO QUE RECIBE UN ARRAY CON idpedido
router.post('/crear_gdd_post', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.parse(JSON.stringify(req.body)).idped);
        console.log(input);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("SELECT MAX(idgd) as id FROM gd", function(err, num){
                if(err){console.log("Error Selecting : %s", err);}
                num = num[0].id+1;
                connection.query("SELECT * FROM cliente", function(err, cli) {
                    if (err) {console.log("Error Selecting : %s", err);}
                    //COALESCE(queryReservados.reservados, 0) AS reservados ENTREGA LA CANTIDAD QUE SE HA RESERVADO EN BMI
                    // Y ADEMAS YA SE HA RETIRADO (reservacion_detalle.estado = 1)
                    connection.query("SELECT COALESCE(queryReservados.reservados, 0) AS reservados , fabricaciones.idorden_f as numof, cliente.idcliente,cliente.sigla AS cliente,pedido.idpedido as idpedido,pedido.numitem as numitem,pedido.bmi, coalesce(pl.cantidad,0) as pl_cantidad, pedido.cantidad-coalesce(pl.cantidad,0) as cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                        +"odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                        +" left join (select pedido.idpedido, sum(palet_item.cantidad) as cantidad from pedido left join palet_item on palet_item.idpedido = pedido.idpedido left join palet on palet.idpalet = palet_item.idpalet where !palet.desp group by palet_item.idpedido) as pl on pl.idpedido = pedido.idpedido"
                        +" left join odc on odc.idodc=pedido.idodc" +
                        " left join cliente on cliente.idcliente=odc.idcliente" +
                        " left join producido on producido.idmaterial=material.idmaterial" +
                        " left join fabricaciones on fabricaciones.idpedido = pedido.idpedido LEFT JOIN (SELECT fabricaciones.idfabricaciones, SUM(reservacion_detalle.ret) AS reservados FROM reservacion_detalle " +
                        " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones WHERE reservacion_detalle.ret > 0 GROUP BY fabricaciones.idfabricaciones) AS queryReservados ON queryReservados.idfabricaciones = fabricaciones.idfabricaciones " +
                        " left join ordenfabricacion on fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                        +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) where pedido.despachados!=pedido.cantidad-coalesce(pl.cantidad,0) group by pedido.idpedido order by pedido.f_entrega asc",
                        function(err, rows){
                            if(err)
                                console.log("Error Selecting :%s", err);

                            connection.query("select " +
                                "palet_item.*, " +
                                "material.detalle, material.idmaterial,pedido.idpedido," +
                                "odc.numoc,pedido.numitem," +
                                "palet.idpackinglist," +
                                "q_palet.peso_palet, cliente.sigla," +
                                "material.peso,cliente.idcliente " +
                                "from palet_item " +
                                "left join palet on palet.idpalet = palet_item.idpalet " +
                                "left join pedido on pedido.idpedido = palet_item.idpedido " +
                                "left join odc on odc.idodc = pedido.idodc " +
                                "left join cliente on cliente.idcliente = odc.idcliente " +
                                "left join material on material.idmaterial = pedido.idmaterial " +
                                "left join (select palet.idpalet, sum(material.peso*palet_item.cantidad) as peso_palet from palet_item left join palet on palet.idpalet = palet_item.idpalet left join pedido on pedido.idpedido = palet_item.idpedido left join material on material.idmaterial = pedido.idmaterial group by palet.idpalet) as q_palet on q_palet.idpalet = palet.idpalet " +
                                "where palet.idpackinglist is not null and palet.desp is false", function(err, palet){
                                if(err)
                                    console.log("Error Selecting :%s", err);

                                res.render('bodega/g_despacho', {data: rows, palet: palet, num: num, blanco: 0, cli: cli, sel: input, redirect: true });
                            });
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
            connection.query("select * from material where (material.tipo='M' OR material.tipo='I' OR material.tipo='O' OR material.tipo='X' OR material.tipo='P' OR material.tipo='C') AND detalle like ? ORDER BY idmaterial",
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
        var tipo;
        if(req.session.userData.nombre == 'test'){
            tipo = 'false';
        }
        else{
            tipo = 'true';
        }
        res.render('bodega/view_despachos', {view_tipo: tipo, username:req.session.userData.nombre });
    }
    else{res.redirect('bad_login');}

});

router.post('/buscar_despacho_list', function(req, res, next){
  if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var orden = input.orden;
        var tipo = input.tipo;

        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM despacho WHERE despacho.iddespacho LIKE '%"+clave+"%' AND despacho.estado LIKE '%"+tipo+"%'",
                function(err, desp){
                    if(err) throw err;
                    res.render('bodega/table_despachos', {desp: desp, key: orden.replace(' ', '-'), user: req.session.userData});
            });
        });
    }
  else{res.redirect('bad_login');}  
});

router.post('/table_despachos', function(req, res, next){
    if(verificar(req.session.userData)){

        var input = JSON.parse(JSON.stringify(req.body));

        var array_fill = [
            "gd.idgd",
            "cliente.sigla",
            "material.detalle",
            "gd.obs",
        ];
        var object_fill = {
            "gd.idgd-off": [],
            "cliente.sigla-off": [],
            "material.detalle-off": [],
            "gd.obs-off": [],
            "gd.idgd-on": [],
            "cliente.sigla-on": [],
            "material.detalle-on": [],
            "gd.obs-on": []

        };
        var condiciones_where = [];

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
            connection.query("SELECT gd.*,COUNT(despachos.iddespacho) as n_items,COALESCE(cliente.razon,'Sin Cliente') AS cliente FROM gd"
                + " LEFT JOIN despachos ON despachos.idgd=gd.idgd"
                + " LEFT JOIN material ON material.idmaterial = despachos.idmaterial"
                + " LEFT JOIN cliente ON cliente.idcliente = gd.idcliente" + where+" GROUP BY gd.idgd order by gd.fecha desc "+limit,function(err, desp){
                if(err)
                    console.log("Error Selecting :%s", err);

                var tipo;
                if(req.session.userData.nombre == 'test'){
                    tipo = 'false';
                }
                else{
                    tipo = 'true';
                }
                res.render('bodega/table_despachos', {desp: desp, user: req.session.userData, view_tipo: tipo, largoData: desp.length});
            });
        });
    }
    else{res.redirect('bad_login');}

});

// Renderiza los items de despacho filtrados por tipo, token y iddespacho
router.post('/item_gd', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var tipo = input.tipo;
        var where = '';
        if(clave != '' && clave != null) {
            where = " WHERE (despacho.mat_token LIKE '%" + clave + "%' OR despacho.iddespacho LIKE '%"+clave+"%')";
        }
        if(tipo != '' && tipo != null) {
            if(clave != '' && clave != null) {
                where += " AND despacho.estado='"+tipo+"'";
            }
            else {
                where = " WHERE despacho.estado='"+tipo+"'";
            }
        }
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT despacho.*, coalesce(odc.idodc, 'OC indefinida') as idodc, coalesce(cliente.sigla, 'Cliente indefinido') as sigla FROM despacho "
                + "LEFT JOIN ordenfabricacion ON despacho.idorden_f=ordenfabricacion.idordenfabricacion "
                + "LEFT JOIN odc ON odc.idodc=ordenfabricacion.idodc "
                + "LEFT JOIN cliente ON cliente.idcliente=odc.idcliente" + where, function(err, desp){
                if(err) throw err;
                res.render('bodega/item_gd', {data: desp});
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

// Retorna lista de despachos segun filtro, NO SE USA, SE CAMBIO A DATATABLE
router.post('/crear_gdd_fill', function(req, res, next) {
    if (verificar(req.session.userData)) {
        var input = JSON.parse(JSON.stringify(req.body));
        var where = "WHERE internalquery.detalle LIKE '%" + input.detalle + "%' OR concat(repeat('0', abs(6 - length(internalquery.numordenfabricacion))),internalquery.numordenfabricacion ) LIKE '%" + input.detalle + "%' OR internalquery.anom LIKE '%" + input.detalle + "%' OR internalquery.f_entrega LIKE '%" + input.detalle + "%' OR internalquery.cantidad-internalquery.despachados LIKE '%" + input.detalle + "%' OR concat(repeat('0', abs(6 - length(internalquery.numof))),internalquery.numof ) LIKE '%" + input.detalle + "%'";
        if (input.detalle != '') {
            where += " OR internalquery.detalle = '" + input.detalle + "' OR concat(repeat('0', abs(6 - length(internalquery.numordenfabricacion))),internalquery.numordenfabricacion ) = '" + input.detalle + "' OR internalquery.anom = '" + input.detalle + "' OR internalquery.f_entrega = '" + input.detalle + "' OR internalquery.cantidad-internalquery.despachados = '" + input.detalle + "' OR concat(repeat('0', abs(6 - length(internalquery.numof))),internalquery.numof ) = '" + input.detalle + "'";
        }
        req.getConnection(function (err, connection) {
            connection.query("SELECT MAX(iddespacho) as id FROM despacho", function (err, num) {
                if (err)
                    console.log("Error Selecting : %s", err);
                num = num[0].id + 1;
                connection.query("SELECT * FROM (select cliente.idcliente,fabricaciones.idorden_f as numof,pedido.idpedido as idfabricaciones,pedido.numitem as numitem,pedido.cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                    + "odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                    + " left join odc on odc.idodc=pedido.idodc left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                    + " left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) left join fabricaciones on fabricaciones.idpedido = pedido.idpedido left join cliente on cliente.idcliente=odc.idcliente where pedido.despachados!=pedido.cantidad group by pedido.idpedido order by " + input.fill + " " + input.orden + ") as internalquery " + where,
                    function (err, rows) {
                        if (err)
                            console.log("Error Selecting :%s", err);

                        res.render('bodega/g_despacho_table', {data: rows});
                        //res.render('jefeprod/ordenes_produccion', {data: rows});
                    });
            });
        });
    }
    else {
        res.redirect('bad_login');
    }
});

router.post('/save_gdd', function (req, res, next) {
    var input = JSON.parse(JSON.stringify(req.body));
    req.getConnection(function (err,connection) {
        //Insertamos los valores de una GD
        let values;
        var query;
        if(input.idgd === '0'){
            //INSERT INTO `siderval`.`gd` (`estado`, `obs`, `idcliente`) VALUES ('venta', 'xxx', '555');
            query = "INSERT INTO gd (estado, fecha, last_mod, obs,idcliente) VALUES ('"+input.estado+"',now(), now(), '"+input.obs+" ', '"+input.idcliente+"')";
            values = [[input.estado, new Date(), new Date() , input.obs,input.idcliente]];
        }
        else{
            //UPDATE `siderval`.`gd` SET `estado` = 'blanco', `obs` = 'comentario', `idcliente` = '1111' WHERE (`idgd` = '19861');
            query = "UPDATE gd SET last_mod = now(), estado = '"+input.estado+"', obs = '"+input.obs+"', idcliente = '"+input.idcliente+"' WHERE (idgd = '"+input.idgd+"')";
            values = [[input.estado, new Date(), new Date() , input.obs,input.idcliente]];
        }
        console.log(query);
        connection.query(query, function (err, results) {
            if(err) {throw err;}
            if (input.estado !== "Blanco") {
                //ID ultima GD y lista vacia que contendra pedidos
                let idgd;
                if(input.idgd == '0'){idgd = results.insertId;}
                else{idgd = input.idgd;}
                let despachos = [];
                var case_p = [];
                var case_pl = [];
                var case_pgdd = "";
                var case_gdd = [];
                //matriz que contiene los id de palet
                var ids_palets = [];
                var ids_palet_item = [];
                var up_reserv = "";
                var up_reserv2 = "";
                //array que almacena los idpedido que tienen reservaciones vinculadas
                var act_reserv = [];
                for (let i = 0; i < Object.keys(input).length - 5 ; i++) {
                    if(input['list[' + i + '][]'][3].split('-')[0] != '0'){
                        if(ids_palets.indexOf(input['list[' + i + '][]'][3].split('-')[0]) === -1){
                            ids_palets.push( input['list[' + i + '][]'][3].split('-')[0]);
                            case_pl.push(input['list[' + i + '][]'][3].split('-')[0]);
                        }
                        ids_palet_item.push(input['list[' + i + '][]'][3].split('-')[1]);
                        case_p.push("WHEN palet_item.idpalet_item = "+input['list[' + i + '][]'][3].split('-')[1]+" THEN "+parseInt(input['list[' + i + '][]'][2]));
                    }
                    despachos.push([idgd, input['list[' + i + '][]'][0], input['list[' + i + '][]'][1], input['list[' + i + '][]'][2], input['list[' + i + '][]'][4] ]);
                    if (despachos[i][1] === "0") {
                        despachos[i][1] = null;
                    }
                    /*
                    * UPDATE reservacion_detalle
                    * LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones SET reservacion_detalle.desp = CASE
                        WHEN fabricaciones.idpedido = 1 THEN reservacion_detalle.desp + 2952
                        WHEN fabricaciones.idpedido = 1 THEN reservacion_detalle.desp + 2952
                        WHEN fabricaciones.idpedido = 1 THEN reservacion_detalle.desp + 2952
                        WHEN fabricaciones.idpedido = 1 THEN reservacion_detalle.desp + 2952
                        WHEN fabricaciones.idpedido = 1 THEN reservacion_detalle.desp + 2952
                        ELSE reservacion_detalle.desp
                        END
                        WHERE fabricaciones.idpedido  in (?);
                    * */
                    if(i === 0){
                        up_reserv += "UPDATE reservacion_detalle" +
                            " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones SET reservacion_detalle.desp = CASE ";

                        up_reserv2 += "UPDATE reservacion_detalle" +
                            " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones SET reservacion_detalle.ret = CASE ";
                    }
                    if(input['list[' + i + '][]'][4] === 'true'){
                        up_reserv += " WHEN fabricaciones.idpedido = "+input['list[' + i + '][]'][0]+" THEN reservacion_detalle.desp + "+parseInt(input['list[' + i + '][]'][2]) ;
                        up_reserv2 += " WHEN fabricaciones.idpedido = "+input['list[' + i + '][]'][0]+" THEN reservacion_detalle.ret - "+parseInt(input['list[' + i + '][]'][2]) ;
                        act_reserv.push(input['list[' + i + '][]'][0]);
                    }
                }
                up_reserv += " ELSE reservacion_detalle.desp" +
                    " END" +
                    " WHERE fabricaciones.idpedido  in ("+act_reserv.join(',')+")";


                up_reserv2 += " ELSE reservacion_detalle.ret " +
                    " END" +
                    " WHERE fabricaciones.idpedido IN ("+act_reserv.join(',')+")";
                //SE IDENTIFICA SI EXISTEN CONDICIONES PARA CREAR LA QUERY UPDATE CASE
                // Y ACTUALIZAR CANTIDADES EN PALET Y NÚMERO DE PACKING LIST
                var update_bool = false;
                if(case_p.length > 0){
                    case_p = "UPDATE palet_item SET palet_item.cantidad = CASE "+case_p.join(" ")+" ELSE palet_item.cantidad END WHERE palet_item.idpalet_item IN ("+ids_palet_item.join(',')+")";
                    update_bool = true;
                }
                var string_pl;
                if(case_pl.length > 0){
                    update_bool = true;
                    string_pl = case_pl.join(",");
                    case_pl = "UPDATE palet SET palet.desp = true where palet.idpalet in ("+string_pl+")" ;
                    case_pgdd = "UPDATE palet SET palet.idgd = '"+idgd+"' where palet.idpalet in ("+string_pl+")" ;
                    case_gdd = "UPDATE gd SET gd.idpackinglist = '"+input.pl+"' where gd.idgd in ("+idgd+")" ;
                }

                var despachos_bmi = [];
                for(var e=0; e < despachos.length; e++){
                    despachos_bmi.push(despachos[e][4]);
                    despachos[e] = [ despachos[e][0],despachos[e][1],despachos[e][2],despachos[e][3] ]
                }
                //Insertamos cada Despacho asociado a la GD
                connection.query("INSERT INTO despachos (idgd, idpedido, idmaterial, cantidad) VALUES ?", [despachos], function (err, rows) {
                    if (err) {throw err;}
                    //Variables necesarias para definir la operacion de la query
                    //op1: Despachados de Pedido ; op2: Actualizar Stock
                    let op1, op2;
                    console.log(input.estado);
                    if (input.estado === "Venta" || input.estado === "Traslado") {
                        //AUMENTAN LOS DESPACHADOS
                        op1 = "+";
                        //DISMINUYE EL STOCK
                        op2 = "-";
                    }else if (input.estado === "Devolucion") {
                        //DISMINUYEN LOS DESPACHADOS
                        op1 = "-";
                        //AUMENTA EL STOCK
                        op2 = "+";
                    }else{
                        //TODOS LOS DEMAS TIPOS DE GDD: Blanco, Servicio y Otro
                        //NO MODIFICAN NI Stock NI Pedido
                    }
                    //Creamos el Query para actualizar stock de materiales
                    let update_stock = 'UPDATE material SET material.stock = CASE ';
                    var array_material = [];
                    var array_stock = [];
                    var c_aux = 0;
                    for (var i = 0; i < despachos.length; i++) {
                        //SI SE DESPACHA DESDE RESERVACION NO REQUIERE MODIFICAR STOCK
                        if(despachos_bmi[i] === 'false' ){
                            if( array_material.indexOf(despachos[i][2]) === -1 ){
                                array_material.push(despachos[i][2]);
                                array_stock.push(parseInt(despachos[i][3]));
                            }
                            else{
                               array_stock[array_material.indexOf(despachos[i][2])] += parseInt(despachos[i][3]);
                            }
                            c_aux++;
                        }
                    }

                    for(var q=0; q < array_material.length; q++){
                        update_stock += 'WHEN material.idmaterial=' + array_material[q] + ' THEN material.stock' + op2 + array_stock[q] + ' ';
                    }
                    update_stock += 'ELSE material.stock END WHERE material.idmaterial IN (' + array_material.join(',')+')';

                    //Se actualiza el stock de material
                    connection.query(update_stock, function (err, rows) {
                        if (err && c_aux>0) {console.log("Error Updating : %s", err);}

                        if (input.estado !== "Traslado" && input.estado !== "Servicio") {
                            //el array de despachos se debe agrupar según PEDIDO para realizar la actualización de los despachados
                            var idpedido = [];
                            var cantidades = [];
                            for(var w=0 ; w < despachos.length; w++){
                                if(idpedido.indexOf(despachos[w][1]) == -1){
                                    idpedido.push(despachos[w][1]);
                                    cantidades.push(parseInt(despachos[w][3]));
                                }
                                else{
                                    cantidades[idpedido.indexOf(despachos[w][1])] += parseInt(despachos[w][3]);
                                }
                            }
                            let update_saldo = "";
                            //Creamos la Query para actualizar despachados de pedido
                            update_saldo = 'UPDATE pedido SET pedido.despachados = CASE ';
                            let stringIds = '(';
                            for (let i = 0; i < idpedido.length; i++) {
                                update_saldo += 'WHEN pedido.idpedido=' + idpedido[i] + ' THEN pedido.despachados' + op1 + cantidades[i] + ' ';
                                stringIds += idpedido[i];
                                if (i !== idpedido.length - 1) {
                                    stringIds += ','
                                }
                            }
                            stringIds += ')';
                            update_saldo += 'ELSE pedido.despachados END WHERE pedido.idpedido IN ' + stringIds;
                            //Actualizamos la cantidad de despachados del pedido
                            connection.query(update_saldo, function (err, rows) {
                                if (err) {console.log("Error Updating : %s", err);}
                                if(update_bool){
                                    connection.query(case_p, function (err, rows) {
                                        if (err) {console.log("Error Updating : %s", err);}
                                        connection.query(case_pl, function (err, rows) {
                                            if (err) {console.log("Error Updating : %s", err);}
                                            connection.query(case_pgdd, function (err, rows) {
                                                if (err) {console.log("Error Updating : %s", err);}
                                                connection.query(case_gdd, function (err, rows) {
                                                    if (err) {console.log("Error Updating : %s", err);}

                                                    if(act_reserv.length > 0){
                                                        //UPDATE reservacion_detalle left join fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones SET reservacion_detalle.estado = 2 WHERE fabricaciones.idpedido IN (11125)
                                                        connection.query(up_reserv,
                                                            function(err, actReserv){
                                                                if (err) {console.log("Error Selecting : %s", err);}

                                                                connection.query(up_reserv2,
                                                                    function(err, actReserv){
                                                                        if (err) {console.log("Error Selecting : %s", err);}


                                                                        //SI SE ENVIA INFORMACION DE DESPACHO
                                                                        //gdd de VENTA/DEVOLUCION/OTRO
                                                                        console.log("ENVIANDO INFO "+input.estado);
                                                                        req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                                                        res.redirect('/bodega/crear_gdd');
                                                                    });

                                                        });
                                                    }
                                                    else{
                                                        //SI SE ENVIA INFORMACION DE DESPACHO
                                                        //gdd de VENTA/DEVOLUCION/OTRO
                                                        console.log("ENVIANDO INFO "+input.estado);
                                                        req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                                        //enviar_gdd_soap(idgdd);
                                                        res.redirect('/bodega/crear_gdd');
                                                    }
                                                });
                                            });

                                        });

                                    });
                                }
                                else{
                                    if(act_reserv.length > 0){
                                        connection.query(up_reserv,
                                            function(err, actReserv){
                                                if (err) {console.log("Error Updating : %s", err);}

                                                connection.query(up_reserv2,
                                                    function(err, actReserv){
                                                        if (err) {console.log("Error Selecting : %s", err);}


                                                        //SI SE ENVIA INFORMACION DE DESPACHO
                                                        //gdd de VENTA/DEVOLUCION/OTRO
                                                        console.log("ENVIANDO INFO "+input.estado);
                                                        //enviar_gdd_soap(idgdd);
                                                        req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                                        res.redirect('/bodega/crear_gdd');
                                                    });

                                            });
                                    }
                                    else{
                                        //SI SE ENVIA INFORMACION DE DESPACHO
                                        //gdd de VENTA/DEVOLUCION/OTRO
                                        console.log("ENVIANDO INFO "+input.estado);
                                        //enviar_gdd_soap(idgdd);
                                        req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                        res.redirect('/bodega/crear_gdd');
                                    }
                                }

                            });
                        }
                        //Si la operacion es de Traslado o Servicio, no existen pedidos.
                        else {
                            if(update_bool && input.estado !== 'Servicio'){
                                connection.query(case_p, function (err, rows) {
                                    if (err) {throw err;}
                                    connection.query(case_pl, function (err, rows) {
                                        if (err) {throw err;}


                                        //NO SE ENVIA INFORMACION DE DESPACHO¿?
                                        //console.log("NO SE ENVIA INFORMACION DE DESPACHO"+input.estado);
                                        req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                        res.redirect('/bodega/crear_gdd');
                                    });
                                });
                            }
                            else{
                                //NO SE ENVIA INFORMACION DE DESPACHO¿?
                                //console.log("NO SE ENVIA INFORMACION DE DESPACHO" + input.estado);
                                req.app.locals.io.sockets.emit('requestByEmail', idgd);

                                res.redirect('/bodega/crear_gdd');
                            }
                        }
                    });
                });
            }
            else {

                //NO SE ENVIA INFORMACION DE DESPACHO
                //AQUI NO
                console.log("NO SE ENVIA INFORMACION DE DESPACHO" + input.estado);
                res.redirect('/bodega/crear_gdd');
            }
        });
    });
});



router.get('/send_data_addin', function (req, res, next){
    enviar_gdd_soap(22009, req, function(){
        res.sendStatus(200)
    });
});

function enviar_gdd_soap(idgd, req, callback){
    req.getConnection(function(err, connection){
        if(err){console.log("Error Conecting : %s", err);}

        connection.query("SELECT CONCAT(\n" +
            "'SIDERVAL',',', \n" +
            "despachos.idgd, ',', \n" +
            "'S',',',\n" +
            "'T',',',\n" +
            "DATE_FORMAT(gd.fecha, '%Y/%m/%d'),',', \n" +
            "'01',',', \n" +
            "gd.obs,',', \n" +
            "REPLACE(SUBSTRING_INDEX(cliente.rut, '-', 1), '.', ''),',', \n" +
            "cliente.sigla, ',',\n" +
            "cliente.rut, ',',\n" +
            "cliente.giro, ',',\n" +
            "cliente.direccion, ',',\n" +
            "cliente.ciudad, ',',\n" +
            "cliente.ciudad, ',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "material.codigo, ',',\n" +
            "material.detalle, ',',\n" +
            "material.detalle, ',',\n" +
            "material.u_medida, ',',\n" +
            "despachos.cantidad, ',',\n" +
            "material.precio,\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "'S',',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "',',\n" +
            "','\n" +
            ") AS token FROM despachos \n" +
            "LEFT JOIN gd ON gd.idgd = despachos.idgd \n" +
            "LEFT JOIN cliente ON cliente.idcliente = gd.idcliente \n" +
            "LEFT JOIN material ON material.idmaterial = despachos.idmaterial \n" +
            "WHERE despachos.idgd = ? group by despachos.iddespacho", idgd, function(err, desp){
            if(err){console.log("Error Selecting : %s", err);}

            const fs = require('fs');
            console.log(desp)
            var stream = fs.createWriteStream("./test.txt");
            stream.once('open', function(fd) {
                for(var e=0; e < desp.length; e++){
                    stream.write(desp[e].token+"\n");
                }
                stream.end();
                callback()
            });
        });
    });


}

//Renderizar la página de GDD específica de odoo.
router.get('/page_gdd/:idgd', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var idgd = req.params.idgd;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT gd.*,cliente.razon,cliente.sigla FROM gd" +
                    " LEFT JOIN cliente ON cliente.idcliente = gd.idcliente" +
                    " WHERE gd.idgd = ? GROUP BY gd.idgd",[idgd], function(err, gd){
                    if(err) console.log("Select Error: %s",err);
                    connection.query("SELECT despachos.*,pedido.numitem, odc.numoc, fabricaciones.idorden_f,material.detalle,material.u_medida FROM despachos" +
                        " LEFT JOIN material ON material.idmaterial = despachos.idmaterial" +
                        " LEFT JOIN pedido ON pedido.idpedido = despachos.idpedido" +
                        " LEFT JOIN odc ON odc.idodc = pedido.idodc" +
                        " LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido" +
                        " WHERE despachos.idgd = ?" +
                        " GROUP BY despachos.iddespacho",[idgd], function(err ,despachos){
                        if(err) console.log("Select Error: %s",err);
                        //res.redirect('/plan');
                        //console.log(abast);
                        //console.log(oda);
                        res.render('bodega/page_gd', {oda:gd[0], abast: despachos});
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}
});

//Controlador que guarda la activacion de una GDD en Blanco
router.post('/act_gdd', function(req, res, next){
    console.log("activando BLANCO");
    var input = JSON.parse(JSON.stringify(req.body));
    var query ="UPDATE pedido SET despachados = CASE ";
    var query2 ="UPDATE material SET stock = CASE ";
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
    //var input = JSON.parse(JSON.stringify(req.body));
    console.log(input);
    req.getConnection(function (err,connection) {
        //Insertamos los valores de una GD
        let values = [[input.estado, new Date(), new Date() , input.obs,input.idcliente]];
        console.log("values");
        console.log(values);
        connection.query("UPDATE gd SET `last_mod` = CURRENT_TIMESTAMP,`estado`=?,`obs`=?,`idcliente` = ?  WHERE idgd = ?",
            [input.estado, input.obs,input.idcliente, input.idgd], function (err, results) {
            if(err) {throw err;}
            if (input.estado !== "Blanco") {
                //ID ultima GD y lista vacia que contendra pedidos
                let idgd = input.idgd;
                let despachos = [];
                var case_p = [];
                var case_pl = [];
                var case_gdd = [];
                //matriz que contiene los id de palet
                var ids_palets = [];
                var ids_palet_item = [];
                for (let i = 0; i < Object.keys(input).length - 5 ; i++) {
                    if(input['list[' + i + '][]'][3].split('-')[0] != '0'){
                        if(ids_palets.indexOf(input['list[' + i + '][]'][3].split('-')[0]) == -1){
                            ids_palets.push( input['list[' + i + '][]'][3].split('-')[0]);
                            case_pl.push(input['list[' + i + '][]'][3].split('-')[0]);
                        }
                        ids_palet_item.push(input['list[' + i + '][]'][3].split('-')[1]);
                        case_p.push("WHEN palet_item.idpalet_item = "+input['list[' + i + '][]'][3].split('-')[1]+" THEN "+parseInt(input['list[' + i + '][]'][2]));
                    }
                    //despachoss([idgd, iddespacho, idmaterial, cantidad])
                    despachos.push([idgd, input['list[' + i + '][]'][0], input['list[' + i + '][]'][1], input['list[' + i + '][]'][2] ]);
                    if (despachos[i][1] === "0") {
                        despachos[i][1] = null;
                    }
                }


                //SE IDENTIFICA SI EXISTEN CONDICIONES PARA CREAR LA QUERY UPDATE CASE
                // Y ACTUALIZAR CANTIDADES EN PALET Y NÚMERO DE PACKING LIST
                var update_bool = false;
                if(case_p.length > 0){
                    case_p = "UPDATE palet_item SET palet_item.cantidad = CASE "+case_p.join(" ")+" ELSE palet_item.cantidad END WHERE palet_item.idpalet_item IN ("+ids_palet_item.join(',')+")";
                    update_bool = true;
                }

                if(case_pl.length > 0){
                    update_bool = true;
                    case_pl = "UPDATE palet SET palet.desp = true where palet.idpalet in ("+case_pl.join(",")+")" ;
                    case_gdd = "UPDATE gd SET gd.idpackinglist = '"+input.pl+"' where gd.idgd in ("+idgd+")" ;
                }

                console.log(despachos);
                //Insertamos cada Despacho asociado a la GD
                connection.query("INSERT INTO despachos (idgd, idpedido, idmaterial, cantidad) VALUES ?", [despachos], function (err, rows) {
                    if (err) {throw err;}
                    //Variables necesarias para definir la operacion de la query
                    let op1, op2;
                    if (input.estado === "Venta" || input.estado === "Traslado") {
                        op1 = "+";
                        op2 = "-";
                    } else if (input.estado === "Devolucion") {
                        op2 = "+";
                        op1 = "-";
                    }
                    //Creamos el Query para actualizar stock de materiales
                    let update_stock = 'UPDATE material SET material.stock = CASE ';
                    let idmaterial = '(';
                    for (var i = 0; i < despachos.length; i++) {
                        update_stock += 'WHEN material.idmaterial=' + despachos[i][2] + ' THEN material.stock' + op2 + despachos[i][3] + ' ';
                        idmaterial += despachos[i][2];
                        if (i !== despachos.length - 1) {
                            idmaterial += ',';
                        }
                    }
                    idmaterial += ')';
                    update_stock += 'ELSE material.stock END WHERE material.idmaterial IN ' + idmaterial;
                    //Actualizamos el stock de material
                    connection.query(update_stock, function (err, rows) {
                        if (err) {throw err;}

                        //Si la operacion es de Traslado, no existen pedidos.
                        if (input.estado !== "Traslado") {
                            let update_saldo = "";
                            //Creamos la Query para actualizar despachados de pedido
                            update_saldo = 'UPDATE pedido SET pedido.despachados = CASE ';
                            let stringIds = '(';
                            for (let i = 0; i < despachos.length; i++) {
                                update_saldo += 'WHEN pedido.idpedido=' + despachos[i][1] + ' THEN pedido.despachados' + op1 + despachos[i][3] + ' ';
                                stringIds += despachos[i][1];
                                if (i !== despachos.length - 1) {
                                    stringIds += ','
                                }
                            }
                            stringIds += ')';
                            update_saldo += 'ELSE pedido.despachados END WHERE pedido.idpedido IN ' + stringIds;
                            //Actualizamos la cantidad de despachados del pedido
                            connection.query(update_saldo, function (err, rows) {
                                if (err) {throw err;}

                                if(update_bool){
                                    connection.query(case_p, function (err, rows) {
                                        if (err) {throw err;}
                                        connection.query(case_pl, function (err, rows) {
                                            if (err) {throw err;}

                                            connection.query(case_gdd, function (err, rows) {
                                                if (err) {throw err;}

                                                req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                                res.redirect('/bodega/crear_gdd');
                                            });

                                        });

                                    });
                                }
                                else{
                                    req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                    res.redirect('/bodega/crear_gdd');
                                }

                            });
                        }
                        else {
                            if(update_bool){
                                connection.query(case_p, function (err, rows) {
                                    if (err) {throw err;}
                                    connection.query(case_pl, function (err, rows) {
                                        if (err) {throw err;}

                                        req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                        res.redirect('/bodega/crear_gdd');
                                    });

                                });
                            }
                            else{
                                req.app.locals.io.sockets.emit('requestByEmail', idgd);
                                res.redirect('/bodega/crear_gdd');
                            }
                        }
                    });
                });
            } else {
                req.app.locals.io.sockets.emit('requestByEmail', idgd);
                res.redirect('/bodega/crear_gdd');
            }
        });
    });
});

router.post('/anular_gdd', function(req, res, next){
    var input = JSON.parse(JSON.stringify(req.body));
    var idgd = input.idgd;
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM despachos WHERE idgd = ?", idgd, function(err, desp){
        if(err) console.log("Error Selecting : %s", err);
            if(desp.length == 0){
                connection.query("UPDATE gd SET estado = ? WHERE idgd = ?", ["Anulado", idgd],function(err, up){
                    if(err) console.log("Error Selecting : %s", err);
                    res.send('/Guia anulada');
                });
            }
            else{
                console.log("DESPACHOS");
                console.log(desp);
                var idpedido = [];
                var cant_ped = [];
                var idmaterial = [];
                var cant_mat = [];
                for(var w=0; w < desp.length; w++){
                    if(idpedido.indexOf(desp[w].idpedido) === -1){
                        idpedido.push(desp[w].idpedido);
                        cant_ped.push(parseInt(desp[w].cantidad) );
                    }else{
                        cant_ped[idpedido.indexOf(desp[w].idpedido)] += parseInt(desp[w].cantidad);
                    }
                    if(idmaterial.indexOf(desp[w].idmaterial) === -1){
                        idmaterial.push(desp[w].idmaterial);
                        cant_mat.push(parseInt(desp[w].cantidad) );
                    }else{
                        cant_mat[idmaterial.indexOf(desp[w].idmaterial)] += parseInt(desp[w].cantidad);
                    }
                }
                var ped_query = "UPDATE pedido SET pedido.despachados = CASE";
                var ped_where = "WHERE pedido.idpedido in (";
                for(var i=0; i < idpedido.length; i++){
                    ped_query += " WHEN pedido.idpedido=" + idpedido[i] + " THEN pedido.despachados-" + cant_ped[i];
                    ped_where += "" + idpedido[i];
                    if(i+1 != idpedido.length){
                        ped_where += ",";
                    }
                }
                ped_query += " END " + ped_where + ")";
                connection.query(ped_query, function(err, ped){
                    if(err) console.log("Error Selecting : %s", err);
                    var mat_query = "UPDATE material SET material.stock = CASE";
                    var mat_where = "WHERE material.idmaterial in (";
                    for(var i=0; i < idmaterial.length; i++){
                        mat_query += " WHEN material.idmaterial=" + idmaterial[i] + " THEN material.stock+" + cant_mat[i];
                        mat_where += "" + idmaterial[i];
                        if(i+1 != idmaterial.length){
                            mat_where += ",";
                        }
                    }
                    mat_query += " END " + mat_where + ")";
                    connection.query(mat_query, function(err, ped){
                        if(err) console.log("Error Selecting : %s", err);
                        connection.query("UPDATE gd SET estado = ? WHERE idgd = ?", ["Anulado",desp[0].idgd],function(err, up){
                            if(err) console.log("Error Selecting : %s", err);
                            res.send('/Guia anulada');
                        });
                    });
                });
            }
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
		connection.query("select " +
            "notificacion.*,material.detalle, pedido.idpedido, pedido.idodc, odc.numoc, material2.detalle AS detalle2 " +
            "from notificacion " +
            "LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial " +
            "LEFT JOIN pedido ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=pedido.idpedido " +
            "LEFT JOIN odc ON odc.idodc=pedido.idodc " +
            "LEFT JOIN (SELECT * FROM material) AS material2 ON material2.idmaterial=pedido.idmaterial " +
            "WHERE (SUBSTRING(notificacion.descripcion,1,3) = 'idm' OR SUBSTRING(notificacion.descripcion,1,5) = 'crgdd') AND notificacion.active = true", function(err, notif){
			if(err){console.log("Error Selecting : %s", err);}

			res.render('bodega/notificaciones', {notif: notif});
		});
	});
});

router.get('/confirm_notificacion/:idnotificacion/:cantidad', function(req,res,next){
		var idnotificacion = req.params.idnotificacion;
		var cantidad = req.params.cantidad;
		req.getConnection(function(err, connection){
			connection.query("SELECT * FROM notificacion WHERE idnotificacion = ?", [idnotificacion], function(err, mat){
				if(err){console.log("Error Selecting : %s", err);}

                connection.query("SELECT * FROM material WHERE idmaterial = ?", [mat[0].descripcion.split('@')[1]], function(err, mats){
                    if(err){console.log("Error Selecting : %s", err);}
                    var stock_a = mats[0].stock;
                    connection.query("UPDATE material SET stock = stock + ? WHERE idmaterial = ?", [parseInt(mat[0].descripcion.split('@')[2]), mat[0].descripcion.split('@')[1]], function(err, rows){
                        if(err){console.log("Error Selecting : %s", err);}
                        connection.query('UPDATE notificacion SET active = false WHERE idnotificacion = ?', [idnotificacion],function(err, notif){
                            if(err){console.log("Error Selecting : %s", err);}
                            console.log(notif);
                            connection.query("SELECT * FROM material WHERE idmaterial = ?", [mat[0].descripcion.split('@')[1]], function(err, mats2){
                                if(err){console.log("Error Selecting : %s", err);}
                                var stock_d = mats2[0].stock;
                                console.log("Stock Antes: "+stock_a+"\n Ingresados: "+parseInt(mat[0].descripcion.split('@')[2])+"\n Stock Despues: "+stock_d);
                                req.session.msgNotif = "Stock Antes: "+stock_a+" Ingresados: "+parseInt(mat[0].descripcion.split('@')[2])+" Stock Despues: "+stock_d;
                                console.log(req.session.userData);
                                if(req.session.userData.nombre === 'faena'){
                                    res.redirect('/faena/render_notificaciones/'+req.session.myValue);
                                }
                                else if(req.session.userData.nombre === 'bodega' || req.session.userData.nombre === 'gestionpl'){
                                    res.redirect('/'+req.session.userData.nombre+'/render_notificaciones');
                                }

                            });
                        });
                    });
                });
			});	
		});
});

router.post('/activar_gdd', function(req,res,next){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        req.getConnection(function(err, connection){
            connection.query("SELECT * FROM gd WHERE idgd = ?", [input.id], function(err, desp){
                if(err){console.log("Error Selecting : %s", err);}
                num = desp[0].idgd;
                connection.query("SELECT * FROM cliente", function(err, cli) {
                    if (err) {console.log("Error Selecting : %s", err);}
                    connection.query("SELECT COALESCE(queryReservados.reservados, 0) AS reservados , fabricaciones.idorden_f as numof, cliente.idcliente,cliente.sigla AS cliente,pedido.idpedido as idpedido,pedido.numitem as numitem,pedido.bmi, coalesce(pl.cantidad,0) as pl_cantidad, pedido.cantidad-coalesce(pl.cantidad,0) as cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                        +"odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                        +" left join (select pedido.idpedido, sum(palet_item.cantidad) as cantidad from pedido left join palet_item on palet_item.idpedido = pedido.idpedido left join palet on palet.idpalet = palet_item.idpalet where !palet.desp group by palet_item.idpedido) as pl on pl.idpedido = pedido.idpedido"
                        +" left join odc on odc.idodc=pedido.idodc" +
                        " left join cliente on cliente.idcliente=odc.idcliente" +
                        " left join producido on producido.idmaterial=material.idmaterial" +
                        " left join fabricaciones on fabricaciones.idpedido = pedido.idpedido LEFT JOIN (SELECT fabricaciones.idfabricaciones, SUM(reservacion_detalle.ret) AS reservados FROM reservacion_detalle " +
                        " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones WHERE reservacion_detalle.ret > 0 GROUP BY fabricaciones.idfabricaciones) AS queryReservados ON queryReservados.idfabricaciones = fabricaciones.idfabricaciones " +
                        " left join ordenfabricacion on fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                        +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) where pedido.despachados!=pedido.cantidad-coalesce(pl.cantidad,0) group by pedido.idpedido order by pedido.f_entrega asc",
                        function(err, rows){
                            if(err)
                                console.log("Error Selecting :%s", err);

                            connection.query("select " +
                                "palet_item.*, " +
                                "material.detalle, material.idmaterial,pedido.idpedido," +
                                "odc.numoc,pedido.numitem," +
                                "palet.idpackinglist," +
                                "q_palet.peso_palet, cliente.sigla," +
                                "material.peso,cliente.idcliente " +
                                "from palet_item " +
                                "left join palet on palet.idpalet = palet_item.idpalet " +
                                "left join pedido on pedido.idpedido = palet_item.idpedido " +
                                "left join odc on odc.idodc = pedido.idodc " +
                                "left join cliente on cliente.idcliente = odc.idcliente " +
                                "left join material on material.idmaterial = pedido.idmaterial " +
                                "left join (select palet.idpalet, sum(material.peso*palet_item.cantidad) as peso_palet from palet_item left join palet on palet.idpalet = palet_item.idpalet left join pedido on pedido.idpedido = palet_item.idpedido left join material on material.idmaterial = pedido.idmaterial group by palet.idpalet) as q_palet on q_palet.idpalet = palet.idpalet " +
                                "where palet.idpackinglist is not null and palet.desp is false", function(err, palet){
                                if(err)
                                    console.log("Error Selecting :%s", err);


                                res.render('bodega/g_despacho', {data: rows, palet: palet, num: num, blanco: 1, cli: cli, sel: [], redirect: false});
                            });
                        });
                });


            }); 
        });
});

router.get("/show_fin_inventario", function(req, res, next){
    if(verificar(req.session.userData)){

        req.getConnection(function(err, connection){
            if(err) throw err;

            connection.query("SELECT MAX(idinventario) AS idinv FROM inventario WHERE !fin", function(err, idinv){
                if(err) throw err;

                idinv = idinv[0].idinv;
                connection.query("select " +
                    "material.detalle, " +
                    "material.stock, " +
                    "inventario_detalle.cantidad - material.stock as diferencia, " +
                    "inventario_detalle.idinventario_detalle, " +
                    "inventario_detalle.cantidad " +
                    "from inventario_detalle " +
                    "left join material on material.idmaterial = inventario_detalle.idmaterial " +
                    "where idinventario = ? and inventario_detalle.cantidad - material.stock != 0", [idinv],function(err, mats){
                        if(err) throw err;


                        res.render("bodega/table_inventario_modal", {invent: mats});
                });
            });
        });
    }
    else res.redirect('/bad_login');
});
router.post("/save_inventario", function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        if(!input['idmaterial[]']){
            input['idmaterial[]'] = [];
            input['cantidades[]'] = [];
        }
        req.getConnection(function(err, connection){
            if(err) throw err;

            connection.query("SELECT inventario_detalle.idmaterial FROM inventario_detalle WHERE idinventario = ?",[input.idinventario], function(err, invent){
                if(err) throw err;
                /* *
                UPDATE `table` SET `uid` = CASE
                    WHEN id = 1 THEN 2952
                    WHEN id = 2 THEN 4925
                    WHEN id = 3 THEN 1592
                    ELSE `uid`
                    END
                WHERE id  in (1,2,3)* */
                var aux = [];
                for(var e = 0; e < invent.length; e++){
                    aux.push(invent[e].idmaterial);
                }
                invent = aux;
                var query = "UPDATE inventario_detalle SET cantidad = CASE";
                var cases = false;
                var insert = [];
                console.log(invent);
                if(typeof input['idmaterial[]'] == 'string' ){
                    input['idmaterial[]'] = [input['idmaterial[]']];
                    input['cantidades[]'] = [input['cantidades[]']];
                }

                for(var t=0; t < input['idmaterial[]'].length; t++){
                    //SI EL PRODUCTO YA SE ENCUENTRA EN BD DE INVENTARIO, SOLO BASTA CON ACTUALIZAR EL NUMERO
                    if(invent.indexOf( parseInt(input['idmaterial[]'][t])) != -1){
                        cases = true;
                        query += " WHEN idmaterial = "+input['idmaterial[]'][t]+" THEN "+input['cantidades[]'][t];
                    }
                    //SI EL PRODUCTO NO ESTA REGISTRADO EN EL INVENTARIO, SE DEBE INSERTAR EN LA BD
                    else{
                        //idmaterial, cantidad
                        insert.push([input.idinventario, input['idmaterial[]'][t], input['cantidades[]'][t]]);
                    }
                }
                query += " ELSE cantidad END WHERE idmaterial IN ("+invent.join(',')+")";
                console.log(insert);
                if(insert.length > 0){
                    connection.query("INSERT INTO inventario_detalle(idinventario, idmaterial, cantidad) VALUES ?",[insert], function(err, data){
                        if(err) throw err;
                        console.log(data);
                        if(cases){
                            connection.query(query, function(err, inCases){
                                if(err) throw err;
                                console.log(inCases);
                                res.send("¡Inventario Actualizado!");

                            });
                        }
                        else{
                            res.send("¡Inventario Actualizado!");
                        }

                    });
                }
                else{
                    if(cases){
                        connection.query(query, function(err, inCases){
                            if(err) throw err;
                            console.log(inCases);
                            res.send("¡Inventario Actualizado!");
                        });
                    }
                    else{
                        res.send("¡Inventario Actualizado!");
                    }
                }

            });
        });
    }
    else res.redirect('/bad_login');
});


router.get("/fin_inventario/:idinventario", function(req, res, next){
    if(verificar(req.session.userData)){
        var idinv = req.params.idinventario;
        console.log(idinv);
        req.getConnection(function(err, connection){
            if(err) throw err;

            connection.query("UPDATE inventario SET fin = true, fecha_fin = now() WHERE idinventario = ?",[idinv], function(err, invent){
                if(err) throw err;

                console.log(invent);

                connection.query("UPDATE " +
                    "inventario_detalle " +
                    "LEFT JOIN material ON material.idmaterial = inventario_detalle.idmaterial " +
                    "SET diferencia = inventario_detalle.cantidad - material.stock " +
                    "WHERE inventario_detalle.idinventario = ? AND inventario_detalle.idinventario_detalle>0", [idinv], function(err, detInv){
                        if(err) throw err;

                        console.log(detInv);
                        res.redirect('/bodega/view_bodega');
                });
            });
        });
    }
    else res.redirect('/bad_login');
});

router.get("/gen_pdfgdd/:iddespacho", function(req, res, next){
    if(verificar(req.session.userData)){
        var id = parseInt(req.params.iddespacho);
        var meses = new Array ("Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre");
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('gdd');
        sheet.mergeCells('B6:F7');
        sheet.mergeCells('H7:I7');
        sheet.mergeCells('B8:G9');
        sheet.mergeCells('H8:I8');
        sheet.mergeCells('B10:G11');
        sheet.mergeCells('H10:I10');
        sheet.mergeCells('A12:I15');
        sheet.getColumn('A').width = 2.43;
        sheet.getColumn('B').width = 14.71;
        sheet.getColumn('H').width = 11;
        sheet.getColumn('I').width = 10.86;
        sheet.getRow(5).height = 24;
        sheet.getCell('H40').alignment = {horizontal: 'right'};
        sheet.getCell('H41').alignment = {horizontal: 'right'};
        sheet.getCell('H44').alignment = {horizontal: 'right'};
        sheet.getCell('E35').alignment = {horizontal: 'right'};

        req.getConnection(function(err, connection) {
            if(err) console.log("Error connection : %s", err);
            connection.query("SELECT despachos.*,odc.numoc, gd.estado,gd.idpackinglist, gd.fecha, gd.last_mod, gd.obs, pedido.precio as precioPedido,fabricaciones.idorden_f,pedido.idodc,material.detalle, material.codigo, cliente.* FROM despachos"
                + " LEFT JOIN gd ON despachos.idgd=gd.idgd"
                + " LEFT JOIN cliente ON cliente.idcliente=gd.idcliente"
                + " LEFT JOIN material ON material.idmaterial=despachos.idmaterial"
                + " LEFT JOIN pedido ON pedido.idpedido = despachos.idpedido"
                + " LEFT JOIN odc ON odc.idodc = pedido.idodc"
                + " LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido"
                + " WHERE despachos.idgd ="+ id,function(err, rows) {
                    if (err) console.log("Error Select : %s ",err );
                    if(rows.length>0){
                        var nombre = 'csvs/gdd' + rows[0].idgd + '.xlsx';
                        sheet.getCell('B6').value = rows[0].razon;
                        sheet.getCell('H7').value = rows[0].fecha.getDate() + " de " + meses[rows[0].fecha.getMonth()] + " de " + rows[0].fecha.getFullYear();
                        sheet.getCell('B8').value = rows[0].direccion;
                        sheet.getCell('H8').value = rows[0].ciudad;
                        sheet.getCell('B10').value = rows[0].giro;
                        sheet.getCell('H10').value = rows[0].rut;
                        var count = 0;
                        var neto = 0;
                        for(var j=0; j<rows.length; j++){
                            sheet.mergeCells('C' + (17 + count).toString() + ':F' + (17 + count).toString());
                            sheet.getCell('B' + (17 + count).toString()).value = rows[j].codigo;
                            sheet.getCell('C' + (17 + count).toString()).value = rows[j].detalle;
                            sheet.getCell('G' + (17 + count).toString()).value = rows[j].cantidad;
                            sheet.getCell('H' + (17 + count).toString()).value = rows[j].precioPedido;
                            sheet.getCell('I' + (17 + count).toString()).value = rows[j].precioPedido*rows[j].cantidad;
                            neto += rows[j].precioPedido*rows[j].cantidad;
                            count++;
                        }
                        sheet.mergeCells('B32:H32');
                        sheet.mergeCells('B33:H33');
                        if(rows[0].estado === 'Traslado' || rows[0].estado === 'Servicio'){
                            sheet.getCell('B32').value = "NO CONSTITUYE VENTA";
                            sheet.getCell('B33').value = "En virtud del Art. 55 D.L. 825";
                        }
                        sheet.mergeCells('C35:D35');
                        sheet.mergeCells('F35:G35');
                        sheet.mergeCells('C36:D36')
                        sheet.getCell('B35').value = "OF:";
                        sheet.getCell('C35').value = rows[0].idorden_f;
                        sheet.getCell('E35').value = "OC: ";
                        sheet.getCell('F35').value = rows[0].numoc;
                        sheet.getCell('B36').value = "CHOFER";
                        sheet.getCell('B37').value = "PATENTE";
                        sheet.getCell('H37').value = "NETO";
                        sheet.getCell('H38').value = "IVA";
                        sheet.getCell('H41').value = "TOTAL";

                        sheet.getCell('E34').value = "PL:";
                        sheet.getCell('F34').value = rows[0].idpackinglist;

                        sheet.getCell('I37').value = neto;
                        sheet.getCell('I38').value = neto*0.19;
                        sheet.getCell('I41').value = neto*1.19;

                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
                                res.send('/csvs/gdd'+ rows[0].idgd + '.xlsx');

                            });
                    }
                });
            });
    }
    else res.redirect('/bad_login');
});

router.get("/gen_excelPL/:idpacking", function(req, res, next){
    if(verificar(req.session.userData)){
        var id = parseInt(req.params.iddespacho);
        console.log(id);
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
        sheet.getColumn('B').width = 24.14;
        sheet.getColumn('H').width = 40.43;
        sheet.getColumn('I').width = 11.57;
        console.log(sheet.getColumn('B'));
        req.getConnection(function(err, connection) {
            if(err) console.log("Error connection : %s", err);
            connection.query("SELECT despachos.*,odc.numoc, gd.estado, gd.fecha, gd.last_mod, gd.obs, pedido.precio as precioPedido,fabricaciones.idorden_f,pedido.idodc,material.detalle, material.codigo, cliente.* FROM despachos"
                + " LEFT JOIN gd ON despachos.idgd=gd.idgd"
                + " LEFT JOIN cliente ON cliente.idcliente=gd.idcliente"
                + " LEFT JOIN material ON material.idmaterial=despachos.idmaterial"
                + " LEFT JOIN pedido ON pedido.idpedido = despachos.idpedido"
                + " LEFT JOIN odc ON odc.idodc = pedido.idodc"
                + " LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido"
                + " WHERE despachos.idgd ="+ id,function(err, rows) {
                if (err) console.log("Error Select : %s ",err );
                if(rows.length>0){
                    var nombre = 'csvs/gdd' + rows[0].idgd + '.xlsx';
                    sheet.getCell('B9').value = rows[0].razon;
                    sheet.getCell('G9').value = rows[0].fecha.getDate() + " de " + meses[rows[0].fecha.getMonth()] + " de " + rows[0].fecha.getFullYear();
                    sheet.getCell('B11').value = rows[0].direccion;
                    sheet.getCell('H11').value = rows[0].ciudad;
                    sheet.getCell('B13').value = rows[0].giro;
                    sheet.getCell('H13').value = rows[0].rut;
                    var count = 0;
                    var neto = 0;
                    for(var j=0; j<rows.length; j++){
                        sheet.mergeCells('C' + (20 + count).toString() + ':F' + (20 + count).toString());
                        sheet.getCell('B' + (20 + count).toString()).value = rows[j].codigo;
                        sheet.getCell('C' + (20 + count).toString()).value = rows[j].detalle;
                        sheet.getCell('G' + (20 + count).toString()).value = rows[j].cantidad;
                        sheet.getCell('H' + (20 + count).toString()).value = rows[j].precioPedido;
                        sheet.getCell('I' + (20 + count).toString()).value = rows[j].precioPedido*rows[j].cantidad;
                        neto += rows[j].precioPedido*rows[j].cantidad;
                        count++;
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
                    sheet.getCell('C38').value = rows[0].idorden_f;
                    sheet.getCell('E38').value = "OC: ";
                    sheet.getCell('F38').value = rows[0].numoc;
                    sheet.getCell('B39').value = "CHOFER";
                    sheet.getCell('B40').value = "PATENTE";
                    sheet.getCell('H40').value = "NETO";
                    sheet.getCell('H41').value = "IVA";
                    sheet.getCell('H44').value = "TOTAL";

                    sheet.getCell('I40').value = neto;
                    sheet.getCell('I41').value = neto*0.19;
                    sheet.getCell('I44').value = neto*1.19;

                    workbook.xlsx.writeFile('public/' + nombre)
                        .then(function() {
                            res.send('/csvs/gdd'+ rows[0].idgd + '.xlsx');

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
    else {res.redirect('/bad_login');}
});

//Inserta el numero de factura y el conector en GDD
router.post('/page_gdd_update', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var input = JSON.parse(JSON.stringify(req.body));
            var numfac = JSON.parse(input.numfac);
            var conector = JSON.parse(input.conector);
            console.log(input);
            console.log(numfac);
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                // Para prevenir errores
                var query = "";
                var query2 = "";
                // Query de numfac
                if(numfac.length > 0) {
                    var query = "UPDATE despachos SET numfac = CASE ";
                    var where = "WHERE iddespacho IN (";
                    for(var t=0; t < numfac.length; t++){
                        query += "WHEN iddespacho = "+ numfac[t][0] + " THEN " + numfac[t][1] + " ";
                        if(t != 0){
                            where += ",";
                        }
                        where += numfac[t][0];
                    }
                    query += "ELSE numfac END ";
                    query += where + ")";
                }
                // Query de conector
                if(conector.length > 0){
                    var query2 = "UPDATE despachos SET conector = CASE ";
                    var where2 = "WHERE iddespacho IN (";
                    for(var t=0; t < conector.length; t++){
                        query2 += "WHEN iddespacho = "+ conector[t][0] + " THEN " + conector[t][1] + " ";
                        if(t != 0){
                            where2 += ",";
                        }
                        where2 += conector[t][0];
                    }
                    query2 += "ELSE conector END ";
                    query2 += where2 + ")";
                }
                var date = date = new Date();
                date = date.getUTCFullYear() + '-' +
                    ('00' + (date.getUTCMonth()+1)).slice(-2) + '-' +
                    ('00' + date.getUTCDate()).slice(-2) + ' ' + 
                    ('00' + date.getUTCHours()).slice(-2) + ':' + 
                    ('00' + date.getUTCMinutes()).slice(-2) + ':' + 
                    ('00' + date.getUTCSeconds()).slice(-2);
                console.log(date);
                connection.query(query, function(err, notif){
                    if(err){console.log("Error Update numfac: %s", err);}
                    console.log("UPDATE despachos SET f_fact = '" + date + "' " + where + ")");
                    connection.query("UPDATE despachos SET f_fact = '" + date + "' " + where + ")", function(err, f_fact){
                        if(err){console.log("Error Update f_fact : %s", err);}
                        connection.query(query2, function(err, notif2){
                            if(err){console.log("Error Update conector: %s", err);}
                            res.send("ok");
                        });
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}
});

/*
Ejemplo:
UPDATE mat_prima SET stock = CASE
    WHEN idmatpri = 5 THEN stock - 10
    WHEN idmatpri = 6 THEN stock - 20
    WHEN idmatpri = 7 THEN stock - 30
    ELSE stock
    END
WHERE idmatpri  in (5,6,7);*/

router.get("/view_factura", function(req, res, next){
   if(verificar(req.session.userData)){
        res.render('bodega/view_factura');
    }
    else {res.redirect('/bad_login');}
});

router.post("/table_factura", function(req, res, next){
   if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function(err, connection){
            if(err) console.log("Error connection : %s", err);
            connection.query("SELECT despachos.*, material.detalle, cliente.sigla FROM despachos"
                + " LEFT JOIN material ON material.idmaterial = despachos.idmaterial"
                + " LEFT JOIN gd ON gd.idgd=despachos.idgd"
                + " LEFT JOIN cliente ON cliente.idcliente=gd.idgd where despachos.numfac > 0 AND (despachos.numfac LIKE '%" + input.clave + "%' OR despachos.idgd LIKE '%" + input.clave + "%')", function(err, data){
                if(err)
                    console.log("Error Selecting : %s", err);
                res.render('bodega/table_factura', {data: data});
            });
        });
    }
    else {res.redirect('/bad_login');}
});



router.get('/view_pendientes', function(req, res, next){
    if(verificar(req.session.userData)){
        var tipo;
        if(req.session.userData.nombre == 'test'){
            tipo = 'false';
        }
        else{
            tipo = 'true';
        }
        res.render('bodega/view_pendientes', {view_tipo: tipo, username: req.session.userData.nombre});
    }
    else{res.redirect('bad_login');}
});


router.get('/view_bodega', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('bodega/view_bodega', {username: req.session.userData.nombre});
    }
    else{res.redirect('bad_login');}
});

router.post('/table_bodega', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var tipo;
        if(input.extraInfo == 'inv'){
            tipo = 'inv';
        }
        else{
            tipo = 'otro';
        }
        var array_fill = [
            "material.codigo",
            "material.detalle"
        ];
        var object_fill = {
            "material.codigo-off": [],
            "material.detalle-off": [],
            "material.codigo-on": [],
            "material.detalle-on": []
        };
        var condiciones_where = [];

        if(input.cond != '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        condiciones_where.push("(material.codigo like 'P%' or material.codigo like 'S%')");
        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);
        console.log(result);

        var where = result[0];
        var limit = result[1];

        req.getConnection(function(err, connection){
            connection.query("SELECT max(idinventario) as idinventario from inventario where !fin", function(err, idInv){
                if(err)
                    console.log("Error Selecting :%s", err);

                idInv = idInv[0].idinventario;
                //SI NO SE OBTIENE UN NUMERO DE INVENTARIO VIGENTE SE CREA
                if(idInv == null){
                    connection.query("INSERT INTO inventario () VALUES ()", function(err, newInv){
                        if(err)
                            console.log("Error Selecting :%s", err);
                        console.log(newInv);
                        idInv = newInv.insertId;
                        connection.query("select material.idmaterial, inv.inventariados, codigo,detalle, stock, stock_i , stock_c, coalesce(enPlanta.enplanta,0) as enplanta from material" +
                            " left join (select inventario_detalle.idinventario as idinv, idmaterial, cantidad as inventariados from inventario_detalle where inventario_detalle.idinventario = '"+idInv+"') as inv on inv.idmaterial = material.idmaterial " +
                            " left join (select material.idmaterial, sum(produccion.cantidad - produccion.standby - produccion.8) as enplanta from produccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones left join material on material.idmaterial = fabricaciones.idmaterial group by fabricaciones.idmaterial) as enPlanta on enPlanta.idmaterial = material.idmaterial "
                            + where+" "+limit,function(err, desp){
                            if(err)
                                console.log("Error Selecting :%s", err);
                            res.render('bodega/table_bodega', {data: desp, tipo: tipo, idinv : idInv,largoData: desp.length});
                        });
                    });
                }
                else{
                    connection.query("select material.idmaterial, inv.inventariados, codigo,detalle, stock, stock_i , stock_c, coalesce(enPlanta.enplanta,0) as enplanta from material" +
                        " left join (select inventario_detalle.idinventario as idinv, idmaterial, cantidad as inventariados from inventario_detalle where inventario_detalle.idinventario = '"+idInv+"') as inv on inv.idmaterial = material.idmaterial " +
                        " left join (select material.idmaterial, sum(produccion.cantidad - produccion.standby - produccion.8) as enplanta from produccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones left join material on material.idmaterial = fabricaciones.idmaterial group by fabricaciones.idmaterial) as enPlanta on enPlanta.idmaterial = material.idmaterial "
                        + where+" "+limit,function(err, desp){
                        if(err)
                            console.log("Error Selecting :%s", err);
                        res.render('bodega/table_bodega', {data: desp, tipo: tipo, idinv : idInv,largoData: desp.length});
                    });
                }
            });
        });
    }
    else{res.redirect('bad_login');}

});
router.get('/view_externo', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('bodega/view_externo', {username: req.session.userData.nombre});
    }
    else{res.redirect('bad_login');}
});


router.post('/table_externo', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var array_fill = [
            "odc.numoc",
            "abastecimiento.idoda",
            "fabricaciones.idorden_f",
            "recepcion.numgd",
            "material.detalle"
        ];
        var object_fill = {
            "odc.numoc-off": [],
            "abastecimiento.idoda-off": [],
            "fabricaciones.idorden_f-off": [],
            "recepcion.numgd-off": [],
            "material.detalle-off": [],
            "odc.numoc-on": [],
            "abastecimiento.idoda-on": [],
            "fabricaciones.idorden_f-on": [],
            "recepcion.numgd-on": [],
            "material.detalle-on": []
        };
        var condiciones_where = [];

        if(input.cond != '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);
        console.log(result);

        var where = result[0];
        var limit = result[1];

        req.getConnection(function(err, connection){
            connection.query("SELECT " +
                "abastecimiento.idmaterial, " +
                "COALESCE(odc.numoc,'OF/ODV') as numoc, " +
                "fabricaciones.idorden_f, " +
                "material.detalle, " +
                "abastecimiento.idoda, " +
                "recepcion.*, " +
                "recepcion_detalle.*, " +
                "produccion.`7` >= recepcion_detalle.cantidad as isanulable " +
                "FROM recepcion_detalle " +
                "left join recepcion on recepcion.idrecepcion = recepcion_detalle.idrecepcion " +
                "left join abastecimiento on abastecimiento.idabast = recepcion_detalle.idabast " +
                "left join material on material.idmaterial = abastecimiento.idmaterial " +
                "inner join produccion on produccion.idproduccion = abastecimiento.idproduccion " +
                "left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                "left join pedido on pedido.idpedido = fabricaciones.idpedido " +
                "left join odc on odc.idodc = pedido.idodc "+where,function(err, data){
                if(err){console.log("Error Selecting :%s", err);}

                res.render('bodega/table_externo', {data: data});
            });
        });
    }
    else{res.redirect('bad_login');}

});

router.get('/get_last_inventario', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("select inventario_detalle.idinventario,inventario_detalle.idmaterial,inventario_detalle.cantidad from inventario_detalle " +
                "inner join (select max(idinventario) as idinventario from inventario where !fin) " +
                "as inv on inv.idinventario = inventario_detalle.idinventario",function(err, inv){
                if(err)
                    console.log("Error Selecting :%s", err);
                res.send(inv);
            });
        });
    }
    else{res.redirect('bad_login');}

});


router.post('/table_pendientes', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var arrayPL = input.extraInfo;
        var condiciones_where = [];
        var array_fill = [
            "odc.numoc",
            "material.detalle",
            "cliente.sigla"
        ];
        var object_fill = {
            "odc.numoc-off": [],
            "material.detalle-off": [],
            "cliente.sigla-off": [],
            "odc.numoc-on": [],
            "material.detalle-on": [],
            "cliente.sigla-on": []
        };
        if(input.cond != '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        console.log(condiciones_where);
        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);

        var where = result[0];
        var limit = result[1];
        req.getConnection(function(err, connection){
            connection.query("select odc.numoc, material.detalle, pedido.numitem, pedido.idpedido, coalesce(enpreparacion.preparando,0) as preparando,"
                + " (select COUNT(palet.idpalet) from palet"
                + " left join palet_item on palet.idpalet = palet_item.idpalet"
                + " where palet_item.idpedido = pedido.idpedido) as palets,"
                + " material.peso, material.peso*(pedido.cantidad - pedido.despachados) as pesoxdespachar, pedido.cantidad - pedido.despachados as xdespachar,"
                + " material.stock, pedido.f_entrega, cliente.sigla, cliente.razon,  coalesce(queryCC.enCC, 0) as enCC from pedido"
                + " left join odc on odc.idodc = pedido.idodc"
                + " left join (select idpedido, sum(cantidad) as preparando, palet.idpalet from palet_item left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null group by idpedido) as enpreparacion on enpreparacion.idpedido = pedido.idpedido"
                + " left join material on material.idmaterial = pedido.idmaterial"
                + " left join (select material.idmaterial, sum(produccion.`7`) as encc from produccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones left join material on material.idmaterial = fabricaciones.idmaterial group by material.idmaterial) as queryCC on queryCC.idmaterial = material.idmaterial"
                + " left join cliente on cliente.idcliente = odc.idcliente"
             + where+" "+limit,function(err, desp){
                if(err)
                    console.log("Error Selecting :%s", err);
                // console.log(desp);
                var tipo;
                if(req.session.userData.nombre == 'test'){
                    tipo = 'false';
                }
                else{
                    tipo = 'true';
                }
                /*if(!req.session.arrayPL){
                    req.session.arrayPL = new Array();
                }*/
                if(arrayPL == undefined){
                    arrayPL = '';
                }
                console.log(arrayPL);
                res.render('bodega/table_pendientes', {desp: desp, user: req.session.userData, view_tipo: tipo, arraypl: arrayPL, largoData: desp.length});
            });
        });
    }
    else{res.redirect('bad_login');}

});



router.get('/view_palets', function(req, res, next){
    if(verificar(req.session.userData)){
        var tipo;
        if(req.session.userData.nombre == 'test'){
            tipo = 'false';
        }
        else{
            tipo = 'true';
        }
        res.render('bodega/view_palets', {view_tipo: tipo});
    }
    else{res.redirect('bad_login');}
});


router.post('/table_palets', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));

        console.log(input);
        //clave ES EL TEXTO QUE SE ENCUENTRA EN LA BARRA BUSCAR . Por ejemplo : "Inserto"
        //SE CONCATENAN LAS CONDICIONES QUE SE COLOCARAN EN LA QUERY, ACA LA clave DEBE BUSCAR TANTO PARA
        // material.detalle , gd.idgd, gd.estado (DE LA NUEVA BD)
        //
        var array_fill = [
            "palet.idpalet",
            "material.detalle",
            "cliente.sigla"
        ];
        var object_fill = {
            "palet.idpalet-off": [],
            "material.detalle-off": [],
            "cliente.sigla-off": [],
            "palet.idpalet-on": [],
            "material.detalle-on": [],
            "cliente.sigla-on": []
        };
        var condiciones_where = [];
        if(input.cond != '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }

        console.log(condiciones_where);
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);

        console.log(result);

        var where = result[0];
        var limit = result[1];

        //where = " WHERE gd.idgd LIKE '%" + clave + "%' AND gd.estado LIKE '%" + tipo + "%' GROUP BY gd.idgd ORDER BY gd.fecha DESC";
        //var query = "SELECT despacho.*, coalesce(mat_token, 'Nulo') FROM despacho"+where+" ORDER BY "+orden;
        req.getConnection(function(err, connection){
            connection.query("select " +
                "palet.idpalet, cliente.idcliente, cliente.sigla, " +
                "palet.creacion, IFNULL(palet.idpackinglist, 0) as idpackinglist, " +
                "sum(coalesce(material.peso, 0.0)*palet_item.cantidad)+20 as peso_palet, " +
                "min(pedido.f_entrega) as entrega," +
                "group_concat(coalesce(material.peso, 0.0)) as pesos, " +
                "group_concat(material.detalle) as detalles, " +
                "group_concat(coalesce(palet_item.cantidad, 0)) as cantidades " +
                "from palet_item " +
                "left join palet on palet.idpalet = palet_item.idpalet " +
                "left join pedido on pedido.idpedido = palet_item.idpedido " +
                "left join odc on pedido.idodc = odc.idodc " +
                "left join cliente on odc.idcliente = cliente.idcliente " +
                "left join material on material.idmaterial = pedido.idmaterial " +
                where + " group by palet.idpalet "+limit ,function(err, desp){
                if(err)
                    console.log("Error Selecting :%s", err);
                // console.log(desp);
                var tipo;
                if(req.session.userData.nombre == 'test'){
                    tipo = 'false';
                }
                else{
                    tipo = 'true';
                }
                if(!req.session.arrayPL){
                    req.session.arrayPL = new Array();
                }
                console.log(req.session.arrayPL.join('-'));
                res.render('bodega/table_palets', {desp: desp, user: req.session.userData, view_tipo: tipo, arraypl: req.session.arrayPL.join('-'), largoData: desp.length});
            });
        });
    }
    else{res.redirect('bad_login');}

});




router.get('/add_session_peds/:idpedido', function(req, res, next){
    if(verificar(req.session.userData)){
        var idpedido = req.params.idpedido;
        if(req.session.arrayPL){
            console.log("array SI existe");
            if(req.session.arrayPL.indexOf(idpedido) == -1){
                req.session.arrayPL.push(idpedido);
            }
        }
        else{
            console.log("array NO existe");
            req.session.arrayPL = new Array();
            req.session.arrayPL.push(idpedido);
        }

        res.send('ok');
    }
    else{res.redirect('bad_login');}
});
router.get('/rm_session_peds/:idpedido', function(req, res, next){
    if(verificar(req.session.userData)){
        req.session.arrayPL.splice( req.session.arrayPL.indexOf(req.params.idpedido), 1 );
        res.send('ok');
    }
    else{res.redirect('bad_login');}
});
router.get('/check_session_peds/:value', function(req, res, next){
    if(verificar(req.session.userData)){
        req.session.arrayPL = req.params.value.split('-');
        res.send('ok');
    }
    else{res.redirect('bad_login');}
});


//RENDERIZA TABLA DE PRE-CREACIÓN DE PALET (DESDE views/bodega/view_pendientes.ejs)
router.get('/get_session_peds/:select', function(req, res, next){
    if(verificar(req.session.userData)){
        var where = "";
        console.log(req.params);
        var select = req.params.select.split('-');
        if(select.length>0){
            where = " where pedido.idpedido in ("+select.join(',')+")";
        }
        console.log(where);
        req.getConnection(function(err, connection){
            if(err){throw err;}

            connection.query("select pedido.idpedido, coalesce(enpreparacion.preparando,0) as preparando, pedido.cantidad - pedido.despachados as xdespachar,pedido.f_entrega, cliente.sigla,cliente.razon,"
                + " odc.numoc,pedido.numitem, material.detalle, material.peso,material.stock, material.peso*(pedido.cantidad - pedido.despachados) as pesoxdespachar"
                + " from pedido"
                + " left join (select idpedido, sum(cantidad) as preparando, palet.idpalet from palet_item"
                + " left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null group by idpedido) as enpreparacion on enpreparacion.idpedido = pedido.idpedido"
                + " left join material on material.idmaterial = pedido.idmaterial"
                + " left join odc on odc.idodc=pedido.idodc"
                + " left join cliente on cliente.idcliente = odc.idcliente" +
                where, function(err, xdesp){
                if(err){throw err;}
                console.log(xdesp);
                res.render('bodega/pre_palet_table', {xdesp: xdesp});
            });
        });
    }
    else{res.redirect('bad_login');}
});



router.get('/modal_palet_table/:idpalet', function(req, res, next){
    if(verificar(req.session.userData)){
        var where = "";
        console.log(req.params);
        var select = req.params.select.split('-');
        if(select.length>0){
            where = "where pedido.idpedido in ("+select.join(',')+")";
        }
        console.log(where);
        req.getConnection(function(err, connection){
            if(err){throw err;}
            connection.query("select material.detalle, palet_item.*, odc.numoc,pedido.numitem, palet.creacion from palet_item left join pedido on pedido.idpedido = palet_item.idpedido left join palet on palet.idpalet = palet_item.idpalet left join material on material.idmaterial = pedido.idmaterial left join odc on odc.idodc = pedido.idodc " +
                where, function(err, xdesp){
                if(err){throw err;}
                console.log(xdesp);
                res.render('bodega/pre_palet_table', {xdesp: xdesp});
            });
        });
    }
    else{res.redirect('bad_login');}
});


router.get('/get_session_palets/:select', function(req, res, next){
        if(verificar(req.session.userData)){
            var where = "";
            console.log(req.params);
            var select = req.params.select.split('-');
            if(select.length>0){
                where = "where palet.idpalet in ("+select.join(',')+")";
            }
            console.log(where);
            req.getConnection(function(err, connection){
                if(err){throw err;}
                connection.query("select " +
                    "palet.*, " +
                    "sum(material.peso*palet_item.cantidad)+20 as peso_palet, " +
                    "min( pedido.f_entrega ) as f_entrega " +
                    "from palet_item " +
                    "left join palet on palet.idpalet = palet_item.idpalet " +
                    "left join pedido on pedido.idpedido = palet_item.idpedido " +
                    "left join material on material.idmaterial = pedido.idmaterial " +
                    where+" group by palet_item.idpalet", function(err, xdesp){
                    if(err){throw err;}

                    var idpl = new Date();
                    var mes;
                    var dia;
                    if((idpl.getMonth()+1).toString().length == 1){
                        mes = "0"+(idpl.getMonth()+1).toString();
                    }
                    else{
                        mes = (idpl.getMonth()+1).toString();
                    }

                    if((idpl.getDate()).toString().length == 1){
                        dia = "0"+idpl.getDate().toString();
                    }
                    else{
                        dia = idpl.getDate().toString();
                    }
                    idpl = dia+mes+""+idpl.getFullYear().toString().substring(2,4);

                    console.log(idpl);
                    connection.query("select count(*) as pl_today from palet where idpackinglist like '"+idpl+"%'", function(err, idplist){
                        if(err){throw err;}
                        idpl = idpl+(idplist[0].pl_today+1).toString();
                        console.log(idpl);
                        res.render('bodega/pre_packinglist_table', {xdesp: xdesp, idpl: idpl});

                    });
                });
            });
        }
        else{res.redirect('bad_login');}
    });


router.post('/create_palet', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        input.idpedido = input.idpedido.split('-');
        input.cantidad = input.cantidad.split('-');
        var data = [];
        req.getConnection(function(err, connection){
            if(err){throw err;}
            connection.query("INSERT INTO palet (creacion) VALUES (now())", function(err, inPL){
                if(err){throw err;}

                console.log(inPL);

                for(var i=0; i < input.idpedido.length; i++){
                    data.push([inPL.insertId ,input.idpedido[i], input.cantidad[i]]);
                }
                connection.query("INSERT INTO palet_item (idpalet, idpedido, cantidad) VALUES ?", [data], function(inItemPL){
                    if(err){throw err;}
                    req.session.arrayPL = [];
                    res.send('ok');
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/view_item_palet', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function(err, connection){
            if(err){throw err;}
            if(input.numpalet == -1){ //Utilice la misma ruta para 2 vistas distintas, las reconozco por numpalet
                var idpalet = input.idpalet;
                connection.query("select palet_item.idpalet_item, odc.numoc, palet_item.idpalet, pedido.*, coalesce(enpreparacion.preparando,0) as preparando,"
                    + " ((pedido.cantidad - pedido.despachados) - palet_item.cantidad) as cantidadxpalet, ((pedido.cantidad - pedido.despachados) - coalesce(enpreparacion.preparando,0)) as pendientes, material.peso*(pedido.cantidad - pedido.despachados) as pesoxdespachar,"
                    + " (material.stock - queryPalet.paletizado) as stock_real, cliente.sigla, material.detalle"
                    + " from palet_item"
                    + " left join pedido on pedido.idpedido = palet_item.idpedido"
                    + " left join odc on odc.idodc = pedido.idodc"
                    + " left join cliente on cliente.idcliente = odc.idcliente"
                    + " left join (select idpedido, sum(cantidad) as preparando, palet.idpalet from palet_item"
                    + " left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null group by idpedido) as enpreparacion on enpreparacion.idpedido = pedido.idpedido"
                    + " left join palet on palet.idpalet = palet_item.idpalet"
                    + " left join material on material.idmaterial = pedido.idmaterial"
                    + " left join (select pedido.idmaterial,sum(palet_item.cantidad) as paletizado from palet_item"
                    + " left join palet on palet.idpalet = palet_item.idpalet"
                    + " left join pedido on pedido.idpedido = palet_item.idpedido"
                    + " where !palet.desp group by pedido.idmaterial) as queryPalet on queryPalet.idmaterial = material.idmaterial"
                    + " where !palet.desp and palet.idpalet=" + idpalet, function(err, palet){
                    if(err){throw err;}
                    console.log(palet);
                    res.render('bodega/view_item_palet', {data: palet});
                });
            } else{
                connection.query("select palet.idpalet from palet"
                    + " left join palet_item on palet.idpalet = palet_item.idpalet"
                    + " where palet_item.idpedido = " + input.idpedido, function(err, idpalets){
                    if(err){throw err;}
                    var idpalet = idpalets[parseInt(input.numpalet)].idpalet;
                    connection.query("select palet_item.idpalet_item, odc.numoc, palet_item.idpalet, pedido.*, coalesce(enpreparacion.preparando,0) as preparando,"
                        + " ((pedido.cantidad - pedido.despachados) - palet_item.cantidad) as cantidadxpalet, ((pedido.cantidad - pedido.despachados) - coalesce(enpreparacion.preparando,0)) as pendientes, material.peso*(pedido.cantidad - pedido.despachados) as pesoxdespachar,"
                        + " (material.stock - queryPalet.paletizado) as stock_real, cliente.sigla, material.detalle"
                        + " from palet_item"
                        + " left join pedido on pedido.idpedido = palet_item.idpedido"
                        + " left join odc on odc.idodc = pedido.idodc"
                        + " left join cliente on cliente.idcliente = odc.idcliente"
                        + " left join (select idpedido, sum(cantidad) as preparando, palet.idpalet from palet_item"
                        + " left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null group by idpedido) as enpreparacion on enpreparacion.idpedido = pedido.idpedido"
                        + " left join palet on palet.idpalet = palet_item.idpalet"
                        + " left join material on material.idmaterial = pedido.idmaterial"
                        + " left join (select pedido.idmaterial,sum(palet_item.cantidad) as paletizado from palet_item"
                        + " left join palet on palet.idpalet = palet_item.idpalet"
                        + " left join pedido on pedido.idpedido = palet_item.idpedido"
                        + " where !palet.desp group by pedido.idmaterial) as queryPalet on queryPalet.idmaterial = material.idmaterial"
                        + " where !palet.desp and palet.idpalet=" + idpalet, function(err, palet){
                        if(err){throw err;}
                        console.log(palet);
                        res.render('bodega/view_item_palet', {data: palet});
                    });
                });
            }
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/create_packinglist', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        input.idpalet = input.idpalet.split('-');
        var data = [];
        req.getConnection(function(err, connection){
            if(err){throw err;}
            connection.query("select * from palet where palet.idpackinglist = " + input.idpackinglist, function(err, palet){
                if(err){throw err;}
                if(palet.length == 0){
                    connection.query("UPDATE palet SET idpackinglist = " + input.idpackinglist + " WHERE idpalet in ("+input.idpalet.join(',')+")", function(err, inItemPL){
                        if(err){throw err;}
                        res.send('ok');
                    });
                } else{
                    res.send("error");
                }
            });
            
        });
    }
    else{res.redirect('bad_login');}
});



router.get("/anular_recepcion_externo_modal/:idrecep",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
                connection.query("SELECT " +
                    "abastecimiento.idmaterial,abastecimiento.idproduccion, " +
                    "COALESCE(odc.numoc,'OF/ODV') as numoc, " +
                    "fabricaciones.idorden_f, " +
                    "material.detalle, " +
                    "abastecimiento.idoda, " +
                    "recepcion.*, " +
                    "recepcion_detalle.*, " +
                    "produccion.`7` >= recepcion_detalle.cantidad as isanulable, cliente.sigla, cliente.razon " +
                    "FROM recepcion_detalle " +
                    "left join recepcion on recepcion.idrecepcion = recepcion_detalle.idrecepcion " +
                    "left join abastecimiento on abastecimiento.idabast = recepcion_detalle.idabast " +
                    "left join material on material.idmaterial = abastecimiento.idmaterial " +
                    "inner join produccion on produccion.idproduccion = abastecimiento.idproduccion " +
                    "left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                    "left join pedido on pedido.idpedido = fabricaciones.idpedido " +
                    "left join odc on odc.idodc = pedido.idodc " +
                    "left join oda on oda.idoda = abastecimiento.idoda " +
                    "left join cliente on cliente.idcliente = oda.idproveedor " +
                    "WHERE recepcion_detalle.idrecepcion IN ("+req.params.idrecep+")", function(err, dets){
                    if(err) console.log(err);

                    var recep = {
                        idoda: dets[0].idoda,
                        cliente: dets[0].sigla +" "+ dets[0].razon,
                        idrecepcion: dets[0].idrecepcion,
                        numgd: dets[0].numgd,
                        fecha: dets[0].fecha
                    };
                    res.render("bodega/anular_externo_modal", {data: dets, recep: recep});
                });
        });
    } else res.redirect("/bad_login");
});



router.post("/anular_recepcion_externo",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
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
        var querymat2 = "";
        var abast = {};
        var prods = {};

        if(typeof input['idabast[]'] === 'string'){
            input['idabast[]'] = [input['idabast[]']];
            input['idprod[]'] = [input['idprod[]']];
            input['cant[]'] = [input['cant[]']];
        }
        //SE AGRUPA POR ABASTECIMIENTO Y POR MATERIAL
        for(var t=0; t < input['idabast[]'].length; t++){
            if(Object.keys(prods).indexOf(input['idprod[]'][t]) === -1){
                prods[input['idprod[]'][t]] = parseInt(input['cant[]'][t]);
            }
            else{
                prods[input['idprod[]'][t]] += parseInt(input['cant[]'][t]);
            }
            if(Object.keys(abast).indexOf(input['idabast[]'][t]) === -1){
                abast[input['idabast[]'][t]] = parseInt(input['cant[]'][t]);
            }
            else{
                abast[input['idabast[]'][t]] += parseInt(input['cant[]'][t]);
            }
            //queryfab += " WHEN fabricaciones.idabast = ? THEN fabricaciones.recibidos = fabricaciones.recibidos - "+input['cant[]'][t];
        }
        var prod_h = [];
        for(var f=0; f < Object.keys(abast).length; f++){
            if(f === 0){queryabs += "UPDATE abastecimiento SET abastecimiento.recibidos = CASE ";}
            queryabs += " WHEN abastecimiento.idabast = "+Object.keys(abast)[f]+" THEN abastecimiento.recibidos - "+Object.values(abast)[f];
        }
        for(var m=0; m < Object.keys(prods).length; m++){
            if(m === 0){
                querymat += "UPDATE produccion SET produccion.`7` = CASE ";
                querymat2 += "UPDATE produccion SET produccion.`e` = CASE ";
            }
            querymat += " WHEN produccion.idproduccion = "+Object.keys(prods)[m]+" THEN produccion.`7` - "+Object.values(prods)[m];
            querymat2 += " WHEN produccion.idproduccion = "+Object.keys(prods)[m]+" THEN produccion.`e` + "+Object.values(prods)[m];
            prod_h.push({
                idproduccion: Object.keys(prods)[m],
                from: '7',
                to: 'e',
                enviados: Object.values(prods)[m]
            });
        }
        queryabs += " ELSE abastecimiento.recibidos END WHERE abastecimiento.idabast IN ("+Object.keys(abast).join(',')+")";
        querymat += " ELSE produccion.`7` END WHERE produccion.idproduccion IN ("+Object.keys(prods).join(',')+")";
        querymat2 += " ELSE produccion.`e` END WHERE produccion.idproduccion IN ("+Object.keys(prods).join(',')+")";
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
                        connection.query(querymat2, function(err, upMat){
                            if(err) {
                                console.log(err);
                                er = true;
                            }
                            connection.query("INSERT INTO produccion_history SET ?", [[prod_h]], function(err, upMat){
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
            });
        });
    } else res.redirect("/bad_login");
});


router.get('/get_pedido_gdd/:idodc/:idped/:idnotif', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        connection.query("SELECT * FROM pedido " +
            "LEFT JOIN material ON material.idmaterial = pedido.idmaterial " +
            "LEFT JOIN odc ON pedido.idodc = odc.idodc " +
            "LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido " +
            "LEFT JOIN (SELECT " +
            "reservacion_detalle.idfabricaciones, " +
            "SUM(COALESCE(reservacion_detalle.ret,0) ) AS reservados FROM reservacion_detalle " +
            "WHERE reservacion_detalle.ret > 0 GROUP BY reservacion_detalle.idfabricaciones) AS reservaciones ON reservaciones.idfabricaciones = fabricaciones.idfabricaciones " +
            "WHERE pedido.idodc = ? AND pedido.bmi AND COALESCE(reservaciones.reservados,0) > 0 ", [req.params.idodc], function (err, rows){
            if (err) console.log("Error Selecting : %s", err);
            var numoc = 'Desconocido';
            if(rows.length > 0){
                numoc = rows[0].numoc;
            }

            res.render('bodega/modal_notif_gdd', {data: rows, numoc: numoc, idnotif: req.params.idnotif});
        });
    });
});



router.get('/render_alert_notificacion/:idnotif', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        connection.query("select " +
            "notificacion.*,material.detalle, pedido.idpedido, pedido.idodc, odc.numoc, material2.detalle AS detalle2 " +
            "from notificacion " +
            "LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial " +
            "LEFT JOIN pedido ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=pedido.idpedido " +
            "LEFT JOIN odc ON odc.idodc=pedido.idodc " +
            "LEFT JOIN (SELECT * FROM material) AS material2 ON material2.idmaterial=pedido.idmaterial " +
            "WHERE (SUBSTRING(notificacion.descripcion,1,3) = 'idm' OR SUBSTRING(notificacion.descripcion,1,5) = 'crgdd') AND notificacion.idnotificacion = ?", [req.params.idnotif], function(err, notif){
            if(err){console.log("Error Selecting : %s", err);}


            res.render('bodega/alert_notif_bodega', {notif: notif});

        });
    });
});


module.exports = router;