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
	if(usr.nombre == 'bodega' || usr.nombre == 'plan' || usr.nombre == 'siderval'|| usr.nombre == 'jefeplanta'|| usr.nombre == 'test'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(req.session.userData.nombre == 'bodega'){
    	res.render('bodega/index_new', {page_title: "Bodega", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});

router.get('/crear_gdd', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT MAX(idgd) as id FROM gd", function(err, num){
                if(err){console.log("Error Selecting : %s", err);}
                num = num[0].id+1;
                connection.query("SELECT * FROM cliente", function(err, cli) {
                    if (err) {console.log("Error Selecting : %s", err);}
                    connection.query("select fabricaciones.idorden_f as numof, cliente.idcliente,cliente.sigla AS cliente,pedido.idpedido as idpedido,pedido.numitem as numitem, coalesce(pl.cantidad,0) as pl_cantidad, pedido.cantidad-coalesce(pl.cantidad,0) as cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                        +"odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                        +" left join (select pedido.idpedido, palet_item.cantidad from pedido left join palet_item on palet_item.idpedido = pedido.idpedido left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null and palet.idpalet) as pl on pl.idpedido = pedido.idpedido"
                        +" left join odc on odc.idodc=pedido.idodc left join cliente on cliente.idcliente=odc.idcliente left join producido on producido.idmaterial=material.idmaterial left join fabricaciones on fabricaciones.idpedido = pedido.idpedido left join"
                        +" ordenfabricacion on fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                        +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) where pedido.despachados!=pedido.cantidad-coalesce(pl.cantidad,0) group by pedido.idpedido order by pedido.f_entrega asc",
                        function(err, rows){
                            if(err)
                                console.log("Error Selecting :%s", err);

                            connection.query("select " +
                                "palet_item.*, " +
                                "material.detalle, material.idmaterial,pedido.idpedido," +
                                "odc.numoc," +
                                "q_palet.peso_palet, cliente.sigla," +
                                "material.peso " +
                                "from palet_item " +
                                "left join palet on palet.idpalet = palet_item.idpalet " +
                                "left join pedido on pedido.idpedido = palet_item.idpedido " +
                                "left join odc on odc.idodc = pedido.idodc " +
                                "left join cliente on cliente.idcliente = odc.idcliente " +
                                "left join material on material.idmaterial = pedido.idmaterial " +
                                "left join (select palet.idpalet, sum(material.peso*palet_item.cantidad) as peso_palet from palet_item left join palet on palet.idpalet = palet_item.idpalet left join pedido on pedido.idpedido = palet_item.idpedido left join material on material.idmaterial = pedido.idmaterial group by palet.idpalet) as q_palet on q_palet.idpalet = palet.idpalet " +
                                "where palet.idpackinglist is null", function(err, palet){
                                if(err)
                                    console.log("Error Selecting :%s", err);

                                res.render('bodega/g_despacho', {data: rows, palet: palet, num: num, blanco: 0, cli: cli});
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
        res.render('bodega/view_despachos', {view_tipo: tipo});
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
        var orden = input.orden.replace('-', ' ');
        var clave = input.clave;
        var tipo = input.tipo;
        console.log(input);
        //clave ES EL TEXTO QUE SE ENCUENTRA EN LA BARRA BUSCAR . Por ejemplo : "Inserto"
        //SE CONCATENAN LAS CONDICIONES QUE SE COLOCARAN EN LA QUERY, ACA LA clave DEBE BUSCAR TANTO PARA
        // material.detalle , gd.idgd, gd.estado (DE LA NUEVA BD)
        //
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
        var clave;
        var where;
        var condiciones_where = ["gd.estado LIKE '%" + tipo + "%'"];
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

        if(condiciones_where.length==0){
            where = "";
        }
        else{
            where = " WHERE "+ condiciones_where.join(" AND ")+" GROUP BY gd.idgd ORDER BY gd.fecha DESC";
        }
        console.log(where);

        req.getConnection(function(err, connection){
            connection.query("SELECT gd.*,COUNT(despachos.iddespacho) as n_items,COALESCE(cliente.razon,'Sin Cliente') AS cliente FROM gd"
                + " LEFT JOIN despachos ON despachos.idgd=gd.idgd"
                + " LEFT JOIN material ON material.idmaterial = despachos.idmaterial"
                + " LEFT JOIN cliente ON cliente.idcliente = gd.idcliente" + where,function(err, desp){
                if(err)
                    console.log("Error Selecting :%s", err);
                // console.log(desp);
                //console.log(desp);
                var tipo;
                if(req.session.userData.nombre == 'test'){
                    tipo = 'false';
                }
                else{
                    tipo = 'true';
                }
                res.render('bodega/table_despachos', {desp: desp, key: orden.replace(' ', '-'), user: req.session.userData, view_tipo: tipo});
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
    console.log(input);
    req.getConnection(function (err,connection) {
        //Insertamos los valores de una GD
        let values = [[input.estado, new Date(), new Date() , input.obs,input.idcliente]];
        connection.query("INSERT INTO gd (estado, fecha, last_mod, obs,idcliente) VALUES ?", [values], function (err, results) {
            if(err) {throw err;}
            if (input.estado !== "Blanco") {
                //ID ultima GD y lista vacia que contendra pedidos
                let idgd = results.insertId;
                let despachos = [];
                var case_p = [];
                var case_pl = [];
                //matriz que contiene los id de palet
                var ids_palets = [];
                var ids_palet_item = [];
                for (let i = 0; i < Object.keys(input).length - 4 ; i++) {
                    if(input['list[' + i + '][]'][3].split('-')[0] != '0'){
                        if(ids_palets.indexOf(input['list[' + i + '][]'][3].split('-')[0]) == -1){
                            ids_palets.push( input['list[' + i + '][]'][3].split('-')[0]);
                            case_pl.push("WHEN palet.idpalet = "+input['list[' + i + '][]'][3].split('-')[0]+" THEN '"+input.pl+"'");
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
                    case_pl = "UPDATE palet SET palet.idpackinglist = CASE "+case_pl.join(" ")+" ELSE palet.idpackinglist END WHERE palet.idpalet IN ("+ids_palets.join(",")+")" ;
                }

                //Insertamos cada Despacho asociado a la GD
                connection.query("INSERT INTO despachos (idgd, idpedido, idmaterial, cantidad) VALUES ?", [despachos], function (err, rows) {
                    if (err) {throw err;}
                    //Variables necesarias para definir la operacion de la query
                    let op1, op2;
                    if (input.estado === "Venta" || input.estado === "Traslado") {
                        op1 = "+";
                        op2 = "-";
                    } else if (input.estado === "Devolucion") {
                        op1 = ""
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
                                            res.redirect('/bodega/crear_gdd');
                                        });

                                    });
                                }
                                else{
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
                                        res.redirect('/bodega/crear_gdd');
                                    });

                                });
                            }
                            else{
                                res.redirect('/bodega/crear_gdd');
                            }
                        }
                    });
                });
            } else {
                res.redirect('/bodega/crear_gdd');
            }
        });
    });
});

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
                    connection.query("SELECT despachos.*,odc.numoc, fabricaciones.idorden_f,material.detalle,material.u_medida FROM despachos" +
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
    //console.log(typeof req.body['list[]']);
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s", err);
        var d_list = [];
        console.log(Object.keys(input).length - 4);
        console.log(input);
        for(let i = 0; i < Object.keys(input).length - 4; i++){
            console.log("idfab: " + input['list[' + i + '][]'][0]);
            query2 += "WHEN material.idmaterial = "+ input['list[' + i + '][]'][1]
                + " THEN material.stock " + ope+ " " + input['list[' + i + '][]'][2]+ " ";

            if(input.estado == 'Venta'){
                query += "WHEN idpedido = " + input['list[' + i + '][]'][0]
                    + " THEN despachados " + ope2+ " " + input['list[' + i + '][]'][2]+ " ";
                d_list.push([input.idgdd, input['list[' + i + '][]'][0], input['list[' + i + '][]'][1], input['list[' + i + '][]'][2]]);
            } else {
                d_list.push([input.idgdd,null, input['list[' + i + '][]'][1], input['list[' + i + '][]'][2]]);
            }
        }
        query += 'ELSE despachados END where idpedido > 0';
        query2 += 'ELSE stock END where idmaterial > 0';
        connection.query("UPDATE gd SET `last_mod` = CURRENT_TIMESTAMP,`estado`=?,`obs`=?,`idcliente` = ?  WHERE idgd = ?",
            [input.estado, input.obs,input.idcliente, input.idgdd], function(err, producciones){
            if(err){
                console.log("Error Selecting : %s", err);
                res.send("Error");
            } else {
                if(input.estado != "Blanco" && Object.keys(input).length - 4){
                    console.log("No es blanco!");
                    connection.query("INSERT INTO despachos (idgd, idpedido, idmaterial, cantidad) VALUES ?",[d_list],function(err,rows){
                        if(err){
                            console.log("Error Selecting : %s", err);
                        }
                        connection.query(query2, function(err, rows){
                            if(err){
                                console.log("Error Selecting : %s", err);
                            }
                            if(input.estado == 'Venta'){
                                connection.query(query, function(err, rows){
                                    if(err){
                                        console.log("Error Selecting : %s", err);
                                    }
                                    res.redirect('/bodega/crear_gdd');
                                });
                            } else {
                                res.redirect('/bodega/crear_gdd');

                            }
                        });
                    });
                } else{
                    console.log("es blanco!");
                    res.redirect('/bodega/crear_gdd');
                }
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
                var ped_query = "UPDATE pedido SET pedido.despachados = CASE";
                var ped_where = "WHERE pedido.idpedido in (";
                for(var i=0; i < desp.length; i++){
                    ped_query += " WHEN pedido.idpedido=" + desp[i].idpedido + " THEN pedido.despachados-" + desp[i].cantidad;
                    ped_where += "" + desp[i].idpedido;
                    if(i+1 != desp.length){
                        ped_where += ",";
                    }
                }
                ped_query += " END " + ped_where + ")";
                connection.query(ped_query, function(err, ped){
                    if(err) console.log("Error Selecting : %s", err);
                    var mat_query = "UPDATE material SET material.stock = CASE";
                    var mat_where = "WHERE material.idmaterial in (";
                    for(var i=0; i < desp.length; i++){
                        mat_query += " WHEN material.idmaterial=" + desp[i].idmaterial + " THEN material.stock+" + desp[i].cantidad;
                        mat_where += "" + desp[i].idmaterial;
                        if(i+1 != desp.length){
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
            connection.query("SELECT * FROM gd WHERE idgd = ?", [input.id], function(err, desp){
                if(err){console.log("Error Selecting : %s", err);}
                desp = desp[0];
                connection.query("SELECT * FROM cliente", function(err, cli){
                    if(err){console.log("Error Selecting : %s", err);}
                    // console.log(desp);
                    connection.query("select fabricaciones.idorden_f as numof, cliente.idcliente,pedido.idpedido as idpedido,pedido.numitem as numitem,pedido.cantidad,pedido.f_entrega,pedido.despachados,odc.idodc as idordenfabricacion,"
                                +" odc.numoc as numordenfabricacion, subaleacion.subnom as anom, material.idmaterial,material.detalle,material.stock from pedido left join material on pedido.idmaterial=material.idmaterial"
                                +" left join odc on odc.idodc=pedido.idodc left join cliente on cliente.idcliente=odc.idcliente left join producido on producido.idmaterial=material.idmaterial left join fabricaciones on fabricaciones.idpedido = pedido.idpedido left join"
                                +" ordenfabricacion on fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join subaleacion on subaleacion.idsubaleacion=substring(material.codigo, 6,2)"
                                +" left join aleacion on aleacion.idaleacion=substring(material.codigo, 8,2) where pedido.despachados!=pedido.cantidad group by pedido.idpedido order by pedido.f_entrega asc",
                                function(err, rows){
                                    if(err)
                                        console.log("Error Selecting :%s", err);
                                    //console.log(rows);
                                    res.render('bodega/g_despacho', {data: rows, num: desp.idgd, blanco: 1, cli: cli});
                    });
                });

            }); 
        });
});



router.get("/gen_pdfgdd/:iddespacho", function(req, res, next){
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
        sheet.getColumn('B').width = 15.43;
        sheet.getColumn('H').width = 11.71;
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
        res.render('bodega/view_pendientes', {view_tipo: tipo});
    }
    else{res.redirect('bad_login');}
});



router.post('/table_pendientes', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var orden = input.orden.replace('-', ' ');
        var clave = input.clave;
        var tipo = input.tipo;
        console.log(input);
        //clave ES EL TEXTO QUE SE ENCUENTRA EN LA BARRA BUSCAR . Por ejemplo : "Inserto"
        //SE CONCATENAN LAS CONDICIONES QUE SE COLOCARAN EN LA QUERY, ACA LA clave DEBE BUSCAR TANTO PARA
        // material.detalle , gd.idgd, gd.estado (DE LA NUEVA BD)
        //
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
        var clave;
        var where;
        var condiciones_where = ["pedido.cantidad > pedido.despachados"];
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

        if(condiciones_where.length==0){
            where = "";
        }
        else{
            where = " WHERE "+ condiciones_where.join(" AND ");
        }
        console.log(where);
        //where = " WHERE gd.idgd LIKE '%" + clave + "%' AND gd.estado LIKE '%" + tipo + "%' GROUP BY gd.idgd ORDER BY gd.fecha DESC";
        //var query = "SELECT despacho.*, coalesce(mat_token, 'Nulo') FROM despacho"+where+" ORDER BY "+orden;
        req.getConnection(function(err, connection){
            connection.query("select "
             + " odc.numoc,"
             + " material.detalle,"
             + " pedido.numitem,"
             + " pedido.idpedido,"
             + " coalesce(enpreparacion.preparando,0) as preparando,"
             + " material.peso,"
             + " material.peso*(pedido.cantidad - pedido.despachados) as pesoxdespachar,"
             + " pedido.cantidad - pedido.despachados as xdespachar,"
             + " material.stock,"
             + " pedido.f_entrega,"
             + " cliente.sigla,"
             + " cliente.razon,"
             + " coalesce(queryCC.enCC, 0) as enCC"
             + " from pedido"
             + " left join odc on odc.idodc = pedido.idodc"
             + " left join (select idpedido, sum(cantidad) as preparando, palet.idpalet from palet_item left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null group by idpedido) as enpreparacion on enpreparacion.idpedido = pedido.idpedido"
             + " left join material on material.idmaterial = pedido.idmaterial"
             + " left join (select material.idmaterial, sum(produccion.`7`) as encc from produccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones left join material on material.idmaterial = fabricaciones.idmaterial group by material.idmaterial) as queryCC on queryCC.idmaterial = material.idmaterial"
             + " left join cliente on cliente.idcliente = odc.idcliente"
             + where,function(err, desp){
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
                res.render('bodega/table_pendientes', {desp: desp, user: req.session.userData, view_tipo: tipo, arraypl: input.arrayPL});
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
        var orden = input.orden.replace('-', ' ');
        var clave = input.clave;
        var tipo = input.tipo;
        console.log(input);
        //clave ES EL TEXTO QUE SE ENCUENTRA EN LA BARRA BUSCAR . Por ejemplo : "Inserto"
        //SE CONCATENAN LAS CONDICIONES QUE SE COLOCARAN EN LA QUERY, ACA LA clave DEBE BUSCAR TANTO PARA
        // material.detalle , gd.idgd, gd.estado (DE LA NUEVA BD)
        //
        var array_fill = [
            "palet.idpalet",
            "material.detalle"
        ];
        var object_fill = {
            "palet.idpalet-off": [],
            "material.detalle-off": [],
            "palet.idpalet-on": [],
            "material.detalle-on": []
        };
        var clave;
        var where;
        var condiciones_where = [];
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

        if(condiciones_where.length==0){
            where = "";
        }
        else{
            where = " WHERE "+ condiciones_where.join(" AND ");
        }
        console.log(where);
        //where = " WHERE gd.idgd LIKE '%" + clave + "%' AND gd.estado LIKE '%" + tipo + "%' GROUP BY gd.idgd ORDER BY gd.fecha DESC";
        //var query = "SELECT despacho.*, coalesce(mat_token, 'Nulo') FROM despacho"+where+" ORDER BY "+orden;
        req.getConnection(function(err, connection){
            connection.query("select " +
                "palet.idpalet, " +
                "palet.creacion, " +
                "sum(coalesce(material.peso, 0.0)*palet_item.cantidad) as peso_palet, " +
                "min(pedido.f_entrega) as entrega," +
                "group_concat(coalesce(material.peso, 0.0)) as pesos, " +
                "group_concat(material.detalle) as detalles, " +
                "group_concat(coalesce(palet_item.cantidad, 0)) as cantidades " +
                "from palet_item " +
                "left join palet on palet.idpalet = palet_item.idpalet " +
                "left join pedido on pedido.idpedido = palet_item.idpedido " +
                "left join material on material.idmaterial = pedido.idmaterial " +
                where + " group by palet.idpalet",function(err, desp){
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
                res.render('bodega/table_palets', {desp: desp, user: req.session.userData, view_tipo: tipo, arraypl: req.session.arrayPL.join('-')});
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
            where = "where pedido.idpedido in ("+select.join(',')+")";
        }
        console.log(where);
        req.getConnection(function(err, connection){
            if(err){throw err;}
            connection.query("select " +
                "pedido.idpedido,pedido.cantidad-pedido.despachados-enpreparacion.preparando as xdespachar,pedido.f_entrega," +
                "cliente.sigla,cliente.razon," +
                "odc.numoc,pedido.numitem," +
                "material.detalle," +
                "material.peso,material.stock," +
                "material.peso*(pedido.cantidad - pedido.despachados) as pesoxdespachar " +
                "from pedido " +
                "left join (select idpedido, sum(cantidad) as preparando, palet.idpalet from palet_item left join palet on palet.idpalet = palet_item.idpalet where palet.idpackinglist is null group by idpedido) as enpreparacion on enpreparacion.idpedido = pedido.idpedido " +
                "left join material on material.idmaterial = pedido.idmaterial " +
                "left join odc on odc.idodc=pedido.idodc " +
                "left join cliente on cliente.idcliente = odc.idcliente " +
                where, function(err, xdesp){
                if(err){throw err;}
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
                    "sum(material.peso*palet_item.cantidad) as peso_palet, " +
                    "min( pedido.f_entrega ) as f_entrega " +
                    "from palet_item " +
                    "left join palet on palet.idpalet = palet_item.idpalet " +
                    "left join pedido on pedido.idpedido = palet_item.idpedido " +
                    "left join material on material.idmaterial = pedido.idmaterial " +
                    where+" group by palet_item.idpalet", function(err, xdesp){
                    if(err){throw err;}
                    res.render('bodega/pre_packinglist_table', {xdesp: xdesp});
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



router.post('/create_packinglist', function(req, res, next){
        if(verificar(req.session.userData)){
            var input = JSON.parse(JSON.stringify(req.body));
            input.idpalet = input.idpalet.split('-');
            var data = [];
            req.getConnection(function(err, connection){
                if(err){throw err;}
                connection.query("INSERT INTO packinglist (creacion) VALUES (now())", function(err, inPL){
                    if(err){throw err;}

                    console.log(inPL);

                    connection.query("UPDATE palet SET idpackinglist = ? WHERE idpalet in ("+input.idpalet.join(',')+")", [inPL.insertId], function(inItemPL){
                        if(err){throw err;}
                        res.send('ok');
                    });
                });
            });
        }
        else{res.redirect('bad_login');}
    });




module.exports = router;