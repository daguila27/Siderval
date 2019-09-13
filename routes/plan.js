var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;
router.use(
    connection(mysql,dbCredentials,'pool')
);
function verificar(usr){
  if(usr.nombre == 'plan' || usr.nombre == 'gerencia' || usr.nombre == 'abastecimiento' || usr.nombre == 'siderval' || usr.nombre == 'jefeplanta' || usr.nombre == 'bodega'){
    return true;
  }else{
    return false;
  }
}

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

function parsear_crl(nro){
    x = nro.toString();
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    var num =  parts.join(",");
    return num;
}


/* GET users listing. */
router.get('/', function(req, res) {
    if(req.session.userData.nombre === 'plan'){
        res.render('plan/indx_new',{page_title:"Planificación",username: req.session.userData.nombre,  route: '/plan/lanzar_of/pedido'});}
    else{res.redirect('bad_login');}
});


router.post('/indx', function(req, res, next) {
    var r = req.body.route.split('%').join('/');
    if(req.session.userData.nombre === 'plan'){
        res.render('plan/indx_new', {page_title: "Planificación", username: req.session.userData.nombre, route: r});
    }
    else{res.redirect('bad_login');}
});


/*
Desc:
    Ruta que renderiza plan/informes_fragment
Variables influyentes:
    req.body = {}
Usages:
    -  none
 */
router.get('/render_informes', function(req, res){
  if(verificar(req.session.userData)){
    res.render('plan/informes_fragment');}
  else{res.redirect('bad_login');}  
});
/*
Desc:
    Consigue la info específica de un material en un periodo de tiempo y con respecto a cada tipo
Variables influyentes:
    req.params = {
        tipo: sol || atr || ace_cc | rec_gd || sal_gd || dev || ret,
        idmaterial: valor de idmat,
        token: fechaIni @ fechaFin
    }
    req.body = {}
Usages:
    plan/table_ids.ejs ajax tras botón de ver info
 */
router.get('/get_info_ids/:tipo/:idmaterial/:token', function(req, res){
    if(verificar(req.session.userData)){
        var query;
        var view;
        var tipo = req.params.tipo;
        var fecha = req.params.token.split('@');
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection: %s", err);}
            switch (req.params.tipo) {
                case "sol":
                    query = "select " +
                        " odc.numoc, " +
                        " cliente.sigla, " +
                        " material.detalle, " +
                        " pedido.* " +
                        " from pedido " +
                        " left join material on material.idmaterial = pedido.idmaterial " +
                        " left join odc on odc.idodc = pedido.idodc " +
                        " left join cliente on cliente.idcliente = odc.idcliente " +
                        " where pedido.idmaterial in (" + req.params.idmaterial + ") AND (pedido.f_entrega BETWEEN '"+fecha[0]+"' and '"+fecha[1]+"')";
                    view = "ids_atr";
                    break;
                case "atr":
                    query = "select " +
                        " odc.numoc, " +
                        " cliente.sigla, " +
                        " material.detalle, " +
                        " pedido.* " +
                        " from pedido " +
                        " left join material on material.idmaterial = pedido.idmaterial " +
                        " left join odc on odc.idodc = pedido.idodc " +
                        " left join cliente on cliente.idcliente = odc.idcliente " +
                        " where pedido.idmaterial in (" + req.params.idmaterial + ") and pedido.f_entrega < '"+fecha[0]+"' and pedido.cantidad > pedido.despachados";
                    view = "ids_atr";
                    break;
                case "ace_cc":
                    query = "select " +
                        " material.detalle, " +
                        " produccion.idordenproduccion, " +
                        " fabricaciones.idorden_f, " +
                        " produccion_history.*, " +
                        " desde.nombre_etapa, " +
                        " hasta.nombre_etapa " +
                        " from produccion_history " +
                        " left join produccion on produccion.idproduccion = produccion_history.idproduccion " +
                        " left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                        " left join material on material.idmaterial = fabricaciones.idmaterial" +
                        " left join (select * from etapafaena) as desde on desde.value = produccion_history.from " +
                        " left join (select * from etapafaena) as hasta on hasta.value = produccion_history.to" +
                        " where (produccion_history.fecha BETWEEN '"+fecha[0]+"' and '"+fecha[1]+"') and produccion_history.from=7 and produccion_history.to=8 and fabricaciones.idmaterial in (" + req.params.idmaterial + ")";
                    view = "ids_ace_cc";
                    break;
                case "rec_gd":
                    query = "select " +
                        " recepcion.fecha, " +
                        " oda.idoda, " +
                        " material.detalle, " +
                        " recepcion_detalle.*," +
                        " cliente.sigla " +
                        " from recepcion_detalle " +
                        " left join abastecimiento on abastecimiento.idabast = recepcion_detalle.idabast " +
                        " left join oda on oda.idoda = abastecimiento.idoda " +
                        " left join material on material.idmaterial = abastecimiento.idmaterial " +
                        " left join recepcion on recepcion.idrecepcion = recepcion_detalle.idrecepcion " +
                        " left join cliente on cliente.idcliente = oda.idproveedor" +
                        " where (recepcion.fecha BETWEEN '"+fecha[0]+"' and '"+fecha[1]+"') and abastecimiento.idmaterial in (" + req.params.idmaterial + ")";
                    view = "ids_rec_gd";
                    break;
                case "sal_gd":
                    query = "select " +
                        " odc.numoc, " +
                        " material.detalle, " +
                        " despachos.*, " +
                        " gd.fecha," +
                        " cliente.sigla " +
                        " from despachos " +
                        " left join gd on gd.idgd = despachos.idgd " +
                        " left join material on material.idmaterial = despachos.idmaterial " +
                        " left join pedido on pedido.idpedido = despachos.idpedido " +
                        " left join odc on odc.idodc = pedido.idodc " +
                        " left join cliente on cliente.idcliente = odc.idcliente" +
                        " where (gd.fecha BETWEEN '"+fecha[0]+"' and '"+fecha[1]+"') and despachos.idmaterial in (" + req.params.idmaterial + ")";
                    view = "ids_sal_gd";
                    break;
                case "dev":
                    query = "select " +
                        " material.detalle, " +
                        " movimiento_detalle.cantidad, " +
                        " movimiento.* " +
                        " from movimiento_detalle " +
                        " left join material on material.idmaterial = movimiento_detalle.idmaterial " +
                        " left join movimiento on movimiento.idmovimiento = movimiento_detalle.idmovimiento" +
                        " where movimiento.tipo = 1 and (movimiento.f_gen BETWEEN '"+fecha[0]+"' and '"+fecha[1]+"') and movimiento_detalle.idmaterial in (" + req.params.idmaterial + ")";
                    view = "ids_dev";
                    break;
                case "ret":
                    query = "select " +
                        " material.detalle, " +
                        " movimiento_detalle.cantidad, " +
                        " movimiento.* " +
                        " from movimiento_detalle " +
                        " left join material on material.idmaterial = movimiento_detalle.idmaterial " +
                        " left join movimiento on movimiento.idmovimiento = movimiento_detalle.idmovimiento" +
                        " where movimiento.tipo = 0 and (movimiento.f_gen BETWEEN '"+fecha[0]+"' and '"+fecha[1]+"') and movimiento_detalle.idmaterial in (" + req.params.idmaterial + ")";
                    view = "ids_dev";
                    break;
            }
            connection.query(query, function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                console.log(rows);
                res.render('plan/'+view, {data: rows, tipo: tipo});
            });
        });
    }
    else{res.redirect('bad_login');}
});
/*
Desc:
    Ruta cargar vista con todos los pedidos pendientes de despacho
Variables influyentes:
    req.body = {}
Usages:
    jefeplanta/layout/header.ejs boton en panel de control
    plan/layouts/header.ejs boton en panel de control
    siderval/layouts/header.ejs boton en panel de control
    siderval/layouts/footer.ejs ajax de document.ready
 */
router.get('/view_pedidos', function(req, res){
    if(verificar(req.session.userData)) {
        req.getConnection(function(err,connection){
            if(err) console.log("Connection Error: %s",err);
            connection.query("SELECT * FROM pedido LEFT JOIN odc ON odc.idodc=pedido.idodc LEFT JOIN cliente" +
        " ON cliente.idcliente = odc.idcliente LEFT JOIN material ON material.idmaterial=pedido.idmaterial" +
        " WHERE pedido.cantidad > pedido.despachados", function (err,odc){
            if(err) console.log("Select Error: %s",err);
            res.render('plan/view_pedidos',{largo: odc.length});
        });
});
    }
  else{res.redirect('bad_login');}  
});
/*
Desc:
    Renderizar vista de ver fabricaciones
Variables influyentes:
    req.body = {}
Usages:
    plan/layouts/header.ejs boton en panel de control
    siderval/layouts/header.ejs boton en panel de control
    jefeplanta/layout/header.ejs boton en panel de control
 */
router.get('/view_fabricaciones', function(req, res, next){
  if(verificar(req.session.userData)){
    res.render('plan/view_fabricaciones');}
  else{res.redirect('bad_login');}  
});
/*
Desc:
    Funcion que busca los pedidos y los filtra segun paramentros pasados por url(orden,page).
    Renderiza una tabla con los pedidos en orden solicitado.
Variables influyentes:
    req.body = {
        ispage: ,
        page: ,
        clave: ,
        isRango: ,
        rango: ,
        columnaRango: ,
        cond:
    }
Usages:
    plan/view_pedidos.ejs usado para crear y manipular objeto Buscador.
 */
router.post('/table_pedidos', function(req, res, next){
  if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var array_fill = [
            "odc.numoc",
            "ordenfabricacion.idordenfabricacion",
            "material.detalle",
            "coalesce(cliente.sigla,'Sin Cliente')",
            "estado.estado"
        ];
        var object_fill = {
            "odc.numoc-off": [],
            "ordenfabricacion.idordenfabricacion-off": [],
            "material.detalle-off": [],
            "coalesce(cliente.sigla,'Sin Cliente')-off": [],
            "estado.estado-off": [],
            "odc.numoc-on": [],
            "ordenfabricacion.idordenfabricacion-on": [],
            "material.detalle-on": [],
            "coalesce(cliente.sigla,'Sin Cliente')-on": [],
            "estado.estado-on": []
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
            if(err) throw err;
            connection.query("SELECT * FROM (SELECT pedido.idpedido,COALESCE(GROUP_CONCAT(ordenfabricacion.idordenfabricacion),'-') AS oefes, pedido.numitem, pedido.despachados, pedido.f_entrega, pedido.cantidad, pedido.idproveedor, pedido.externo,SUM(fabricaciones.restantes) AS x_fabricar,COALESCE(prods.sol_op,0) AS sol_op,COALESCE(prods.rech_op,0) AS rech_op,COALESCE(prods.bpt_op,0) AS bpt_op, coalesce(odc.idodc, 'Orden de compra indefinida') as idodc, odc.numoc, odc.moneda, odc.creacion,COALESCE(cliente.sigla, 'Sin Cliente') AS sigla, material.* FROM pedido"
                + " LEFT JOIN odc ON odc.idodc=pedido.idodc"
                + " LEFT JOIN fabricaciones ON fabricaciones.idpedido= pedido.idpedido"
                + " LEFT JOIN (SELECT idfabricaciones,SUM(cantidad) AS sol_op,SUM(standby) AS rech_op,SUM(`8`) AS bpt_op "
                + "FROM produccion GROUP BY idfabricaciones) AS prods ON prods.idfabricaciones = fabricaciones.idfabricaciones"
                + " LEFT JOIN ordenfabricacion ON pedido.idodc = ordenfabricacion.idodc"
                + " LEFT JOIN cliente ON cliente.idcliente = odc.idcliente"
                + " LEFT JOIN material ON material.idmaterial=pedido.idmaterial"
                + " LEFT JOIN (SELECT pedido.idpedido, EstadoPedido(DATEDIFF(pedido.f_entrega, now()), pedido.cantidad <= pedido.despachados) AS estado FROM pedido) AS estado ON estado.idpedido=pedido.idpedido"
                + where + " GROUP BY pedido.idpedido ORDER BY pedido.idpedido DESC) as peds " + limit,
                function(err, odc){
                    if(err) throw err;


                    res.render('plan/table_pedidos', {data: odc});

            });
        });
    }
  else{res.redirect('bad_login');}  
});
/*
Desc:
    Carga la vista plan/table_fabricaciones con resultado de la búsqueda
Variables influyentes:
    req.body = {
        clave: String,
        orden: "ColumnName-(ASC|DESC)",
        showPend: bool
    }
Usages:
    plan/view_fabricaciones.ejs Ajax de búsqueda cuando el formate es en lista
 */
router.post('/buscar_fabricaciones_list', function(req, res, next){
  if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var orden = input.orden;
        var showPend = input.showPend;
        var where = " ";
        if(showPend == 'true'){
            where = " fabricaciones.restantes>0 and "; 
        }
        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select fabricaciones.*, ordenfabricacion.*, pedido.externo,material.detalle, odc.numoc"
                +" from fabricaciones" +
                " left join ordenfabricacion on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                " left join odc on odc.idodc=ordenfabricacion.idodc" +
                " left join pedido on pedido.idpedido=fabricaciones.idpedido" +
                " left join material on material.idmaterial=fabricaciones.idmaterial" +
                " WHERE" + where +" (material.detalle like '%"+clave+"%' or ordenfabricacion.idordenfabricacion like '%"+clave+"%' or fabricaciones.cantidad"
                +" like '%"+clave+"%' OR odc.numoc like '%"+clave+"%')",
                function(err, odc){
                    if(err) throw err;

                    res.render('plan/table_fabricaciones', {data: odc, key: orden.replace(' ', '-'), user: req.session.userData});
                
            });
        });
    }
  else{res.redirect('bad_login');}  
});
/*
Desc:

Variables influyentes:
    req.body = {}
Usages:
 */
//TODO
router.post('/buscar_fabricaciones_item', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var showPend = input.showPend;
        var where = '';
        if(showPend == 'true'){
            where = " fabricaciones.restantes>0 and "; 
        }
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM ordenfabricacion "
                + "LEFT JOIN odc ON odc.idodc=ordenfabricacion.idodc "
                + "LEFT JOIN fabricaciones ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion "
                + "WHERE" + where +" (ordenfabricacion.idordenfabricacion like '%"+clave+"%' or fabricaciones.cantidad like '%"+clave+"%' OR odc.numoc like '%"+clave+"%')",
                function(err, ofs){
                    if(err) throw err;
                    res.render('plan/item_ofs', {data: ofs});
            });
        });
    }
    else{res.redirect('bad_login');}
}); //ERROR EN ESTE CONTROLADOR, ESTA INCOMPLETO, FILTRO NO FUNCIONA
/*
Desc:

Variables influyentes:
    req.params = {
        orden: "ColumnName-(ASC|DESC)",
        showPend: bool
    }
    req.body = {
        clave: String
    }
Usages:
    plan/view_fabricaciones.ejs Ajax(s) para actualizar según búsqueda
 */
router.post('/table_fabricaciones', function(req, res, next){
  if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var array_fill = [
            "ordenfabricacion.idordenfabricacion",
            "odc.numoc",
            "material.detalle",
            "pedido.f_entrega",
            "cliente.sigla"
        ];
      var object_fill = {
          "ordenfabricacion.idordenfabricacion-off": [],
          "odc.numoc-off": [],
          "material.detalle-off": [],
          "pedido.f_entrega-off": [],
          "cliente.sigla-off": [],
          "ordenfabricacion.idordenfabricacion-on": [],
          "odc.numoc-on": [],
          "material.detalle-on": [],
          "pedido.f_entrega-on": [],
          "cliente.sigla-on": []
      };
      var condiciones_where = [];

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
      console.log(result);
      req.getConnection(function(err, connection){
            if(err) throw err;

            var consulta = "select fabricaciones.*, coalesce(finalizados.finalizados, 0) as finalizados," +
                "COALESCE(cliente.sigla,'SIDERVAL S.A') AS cliente,COALESCE(cliente.razon,'SIDERVAL S.A') AS razon,ordenfabricacion.*,pedido.despachados," +
                "coalesce(pedido.externo,false) as externo, coalesce(material.peso, 0) as peso, material.detalle," +
                " coalesce(odc.numoc, 'Sin OC') as numoc,COALESCE(pedido.despachados) AS despachados,COALESCE(pedido.cantidad) AS solicitados," +
                "COALESCE(enprod.enprod,0) AS enprod,COALESCE(enprod.enrech,0) AS enrech"
                +" from fabricaciones "
                +"left join ordenfabricacion on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f "
                +"left join odc on odc.idodc=ordenfabricacion.idodc "
                +"left join pedido on pedido.idpedido=fabricaciones.idpedido "
                +"left join cliente on cliente.idcliente = odc.idcliente "
                +"left join (select fabricaciones.idfabricaciones, sum(coalesce(produccion_history.enviados,0)) as finalizados from produccion_history left join produccion on produccion.idproduccion = produccion_history.idproduccion left join fabricaciones on produccion.idfabricaciones = fabricaciones.idfabricaciones where produccion_history.to = 8 group by fabricaciones.idfabricaciones) as finalizados on finalizados.idfabricaciones = fabricaciones.idfabricaciones "
                +"left join (select fabricaciones.idfabricaciones,SUM(produccion.cantidad) as enprod,SUM(produccion.standby) as enrech from produccion left join fabricaciones on produccion.idfabricaciones = fabricaciones.idfabricaciones group by fabricaciones.idfabricaciones) as enprod on enprod.idfabricaciones = fabricaciones.idfabricaciones "
                +"left join material on material.idmaterial=fabricaciones.idmaterial"+where +" GROUP BY fabricaciones.idfabricaciones "+limit;
            connection.query(consulta,
                function(err, of){
                    if(err) throw err;

                    res.render('plan/table_fabricaciones', {data: of, key: "", user: req.session.userData});
                
            });
        });
    }
  else{res.redirect('bad_login');}  
});
/*
Desc:
    Ruta usada por el objeto buscador para conseguir los datos según item de la odc (según pedidos)
Variables influyentes:
    req.body = {
        ispage: ,
        page: ,
        clave: ,
        isRango: ,
        rango: ,
        columnaRango: ,
        cond:
    }
Usages:
    plan/view_pedidos.ejs para cambiar el url del objeto Buscador.
 */
router.post('/item_odcs', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var input = JSON.parse(JSON.stringify(req.body));
            var array_fill = [
                "odc.numoc",
                "fabricaciones.idorden_f",
                "material.detalle",
                "coalesce(cliente.sigla,'Sin Cliente')",
                "estado.estado"
            ];

            var object_fill = {
                "odc.numoc-off": [],
                "fabricaciones.idorden_f-off": [],
                "material.detalle-off": [],
                "coalesce(cliente.sigla,'Sin Cliente')-off": [],
                "estado.estado-off": [],
                "odc.numoc-on": [],
                "fabricaciones.idorden_f-on": [],
                "material.detalle-on": [],
                "coalesce(cliente.sigla,'Sin Cliente')-on": [],
                "estado.estado-on": []
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
                if(err) throw err;
                connection.query("select " +
                    "odc.*, fabricaciones.idorden_f ," +
                    "coalesce(cliente.razon, 'No Definido') as cliente, " +
                    "EstadoPedido(DATEDIFF(pedido.f_entrega, now()), pedido.cantidad <= pedido.despachados) AS estado " +
                    "from odc " +
                    "left join cliente on cliente.idcliente=odc.idcliente " +
                    "left join pedido on pedido.idodc = odc.idodc " +
                    "left join material on material.idmaterial = pedido.idmaterial " +
                    "left join fabricaciones on fabricaciones.idpedido = pedido.idpedido " +
                    where + " group by pedido.idodc", function(err, odc){
                    if(err) throw err;
                    res.render('plan/item_odcs', {data: odc});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('/bad_login');}
});
/*
Desc:
    Cargar el detalle de las OF especificada
Variables influyentes:
    req.params = {
        idof: idordenfabricacion
    }
    req.body = {}
Usages:
    plan/item_ofs funcion submit_form()
    plan/table_pedidos funcion submit_of()
    plan/table_pedidos funcion submit_form()
    jefeplanta/table_planta funcion submit_of()
    jefeplanta/table_despachositem funcion submit_of() ??
    jefeplanta/table_fusion funcion submit_of() ??

 */
router.get('/page_of/:idof', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var idof = req.params.idof;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT ordenfabricacion.*, cliente.* FROM ordenfabricacion LEFT JOIN odc ON odc.idodc = ordenfabricacion.idodc LEFT JOIN cliente ON cliente.idcliente=odc.idcliente WHERE ordenfabricacion.idordenfabricacion = ?",[idof], function(err, of){
                    if(err) console.log("Select Error: %s",err);
                    connection.query("SELECT fabricaciones.*, material.*, (to_days(fabricaciones.f_entrega)-to_days(now())) as dias "
                        +"FROM fabricaciones LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial "
                        +"WHERE fabricaciones.idorden_f = ? ORDER BY (fabricaciones.numitem*1)",[idof], function(err ,fabs) {
                        if(err) console.log("Select Error: %s",err);

                        var odv = true;
                        for(var t=0; t < fabs.length; t++){
                            if(fabs[t].idpedido){
                                odv = false;
                            }
                        }
                        if(odv){console.log("SI es ODV");}
                        else{console.log("NO es ODV");}
                        res.render('plan/page_of', {of:of[0], fabs: fabs, odv: odv});
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

}); //VER USAGES
/*
Desc:
    Cargar el detalle de las OC especificada
Variables influyentes:
    req.params = {
        idodc: id orden de compra
    }
    req.body = {}
Usages:
    plan/item_odcs funcion submit_form()
    plan/table_pedidos funcion submit_oc()
    bodega/item_gd.ejs funcion submit_form()

 */
router.get('/page_oc/:idodc', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var idodc = req.params.idodc;
            console.log("idodc: "+idodc);
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT coalesce(queryRev.idmodificaciones_concat, 'false') AS idmodificaciones_concat, odc.* FROM odc LEFT JOIN cliente ON cliente.idcliente=odc.idcliente " +
                    " LEFT JOIN (SELECT group_concat(DISTINCT idmodificacion) as idmodificaciones_concat, pedido.idodc FROM modificacion_oc left join pedido on pedido.idpedido = modificacion_oc.idpedido group by pedido.idodc) AS queryRev ON queryRev.idodc = odc.idodc " +
                    " WHERE odc.idodc = ?",[idodc], function(err, odc){
                    if(err) console.log("Select Error: %s",err);

                    console.log(odc);
                    var modificaciones;
                    connection.query("SELECT fabricaciones.restantes as restantes_fabricaciones, pedido.*,pedido.precio as precioOC, material.*, (to_days(pedido.f_entrega)-to_days(now())) as dias FROM pedido "
                        +"LEFT JOIN material ON material.idmaterial=pedido.idmaterial LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido WHERE pedido.idodc = ? ORDER BY (pedido.numitem*1)",[idodc], function(err ,ped){
                        if(err) console.log("Select Error: %s",err);

                        if( odc[0].idmodificaciones_concat === 'false'){
                            res.render('plan/page_oc', {odc: odc[0], ped: ped, username: req.session.userData.nombre, rev: []});
                        }else{
                            modificaciones = odc[0].idmodificaciones_concat;
                            connection.query("SELECT * FROM modificacion_oc WHERE idmodificacion IN ("+modificaciones+")", function(err, mod){
                                if(err) console.log("Select Error: %s",err);

                                console.log(mod);
                                var obj = {};
                                for( var w=0; w < mod.length; w++ ){
                                    if( Object.keys(obj).indexOf(mod[w].idpedido.toString()+"-"+mod[w].idmodificacion.toString()) === -1  ){
                                        obj[mod[w].idpedido.toString()+"-"+mod[w].idmodificacion.toString()] = [[mod[w].ajuste, mod[w].param.toString()]];
                                    }else{
                                        obj[mod[w].idpedido.toString()+"-"+mod[w].idmodificacion.toString()].push([mod[w].ajuste, mod[w].param.toString()]);
                                    }
                                }
                                obj = JSON.stringify(obj);
                                res.render('plan/page_oc', {odc: odc[0], ped: ped, username: req.session.userData.nombre, rev: obj});
                            });
                        }
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta que muestra todos los clientes/proveedores y cuantas OC tiene cada uno
Variables influyentes:
    req.body = {}
Usages:
    siderval/layouts/header.ejs boton panel de control
    plan/layouts/header.ejs boton panel de control
    plan.js (/add_user) redireccionamiento post creacion
    plan.js (/edit_user) redireccionamiento post edicion
 */
router.get('/all_clientes', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("select cliente.*,coalesce(queryodc.odcs,0) as odcs from cliente left join "
                    +"(select odc.idcliente, count(odc.idcliente) as odcs from odc group by odc.idcliente)"
                    +" as queryodc on queryodc.idcliente=cliente.idcliente",
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                            res.render('plan/client_list',{largo: client.length, user: req.session.userData,  username: req.session.userData.username});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta para buscar info de clientes según SIGLA, RAZON, GIRO o RUT
Variables influyentes:
    req.params = {
        key: String a buscar
    }
    req.body = {}
Usages:
    plan/client_list.ejs en Ajax par realizar busqueda
 */
router.get('/search_client/:key', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var key = req.params.key;
            var where = " WHERE cliente.sigla LIKE '%"+key+"%' OR cliente.razon LIKE '%"+key+"%' OR cliente.giro LIKE '%"+key+"%' OR cliente.rut LIKE '%"+key+"%'";
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("select cliente.*,coalesce(queryodc.odcs,0) as odcs from cliente left join "
                    +"(select odc.idcliente, count(odc.idcliente) as odcs from odc where odc.estado IS NULL group by odc.idcliente)"
                    +" as queryodc on queryodc.idcliente=cliente.idcliente"+where,
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            //console.log(client);
                            res.render('plan/cliente_page',{data: client, user: req.session.userData});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta equivalente para ver clientes pero que responde a paginación de 15 resultados
Variables influyentes:
    req.params = {
        page: número de página a buscar
    }
    req.body = {}
Usages:
    plan/client_list.ejs en Ajax para ir a la primera página o en listener de paginación

 */
router.get('/pag_clientes/:pagina', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var pagina = (req.params.pagina-1) ;
            pagina = pagina*15;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("select cliente.*,coalesce(queryodc.odcs,0) as odcs from cliente left join "
                    +"(select odc.idcliente, count(odc.idcliente) as odcs from odc where odc.estado IS NULL group by odc.idcliente)"
                    +" as queryodc on queryodc.idcliente=cliente.idcliente order by cliente.sigla ASC limit "+pagina+",15",
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                            res.render('plan/cliente_page',{data: client, user: req.session.userData});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta que consigue todas las OC(pedidos) ligadas a un idcliente
Variables influyentes:
    req.params = {
        idcliente: duh
    }
    req.body = {}
Usages:
    plan/client_page.ejs en listener de botón para ver odcs
    abast/proveedor_page.ejs en listener de botón para ver odcs
 */
router.get('/odc_client/:idcliente', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var idcl = req.params.idcliente ;
            req.getConnection(function(err,connection){
                if(err)
                        console.log("Error Connection : %s", err);
                connection.query("SELECT * FROM cliente WHERE idcliente = ?", [idcl],function(err, cl){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    connection.query("SELECT * FROM (SELECT * FROM (select odc.*,group_concat(replace(material.detalle,',','.'),'@',pedido.cantidad,'@'"
                        +",pedido.despachados,'@',pedido.f_entrega,'@',to_days(pedido.f_entrega) - to_days(now()), '@',coalesce(desp_ped.desp_num, 0) ,'@',coalesce(desp_ped.ult_desp, 'NODATE') ) as token,sum(pedido.cantidad) as sum_cant, sum(pedido.despachados) as sum_desp, "
                        +"max(pedido.cantidad>pedido.despachados AND to_days(pedido.f_entrega) < to_days(now())+1 ) as atraso, cliente.sigla, cliente.razon from odc left join pedido on pedido.idodc= odc.idodc left join (select pedido.idpedido,count(despacho.iddespacho) as desp_num,max(despacho.fecha) as ult_desp from pedido left join despacho on Pedin_despacho(despacho.idf_token,pedido.idpedido) group by pedido.idpedido)"
                        +"as desp_ped on desp_ped.idpedido=pedido.idpedido left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente group by odc.idodc) as group_odc left join (select despacho.idorden_f"
                        +",(despacho.iddespacho),max(despacho.fecha) as ult_desp from despacho group by despacho.idorden_f) as despachos on (despachos.idorden_f=group_odc.idodc)) AS inquery WHERE inquery.idcliente = ?",[idcl], function(err, odcs){
                        if(err)
                            console.log("Error Selecting : %s", err);

                        res.render('plan/ped_list',{data: odcs, selector: 'todos', nomore: true});
                        //res.render('plan/odc_client', {largo: odcs.length, idc: idcl, detail: cl[0]});
                        
                    });
                });    
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta para describir la paginacion de ver odcs de cliente específico.
Variables influyentes:
    req.params = {
        page: número d pagina,
        idcliente: duh
    }
    req.body = {}
Usages:
    plan/odc_client.ejs en listenere de paginador
 */
router.get('/odc_client_page/:page/:idcliente', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var idcl = req.params.idcliente ;
            var pag = req.params.page - 1;
            pag = pag*15;
            req.getConnection(function(err,connection){
                if(err)
                        console.log("Error Connection : %s", err);
                connection.query("select *, group_concat(pedido.f_entrega separator '@')"
                    +" as date_tok,group_concat(material.u_medida) as un_tok, group_concat"
                    +"(pedido.cantidad) as cant_tok, group_concat(pedido.despachados) as desp_tok,"
                    +" group_concat(material.detalle separator '@') as mat_tok from pedido left join"
                    +" odc on odc.idodc=pedido.idodc left join cliente on cliente.idcliente=odc.idcliente"
                    +" left join material on material.idmaterial = pedido.idmaterial where odc.idcliente = "
                    +"? group by odc.idodc limit "+pag+",15",[idcl], function(err, odcs){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    console.log(odcs);
                    res.render('plan/odc_client_page', {data: odcs, idcliente: idcl});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta para crear un cliente nuevo
Variables influyentes:
    req.body = {
            rut: string,
            sigla: string,
            razon: string,
            direccion: string,
            ciudad: string,
            giro: string,
            telefono: string,
            contacto: string
        }
Usages:
    plan/layouts/footer.ejs en listener de formSubmit del modal respectivo
    siderval/layouts/footer.ejs en listener de formSubmit del modal respectivo
 */
router.post('/add_client', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var input = JSON.parse(JSON.stringify(req.body));
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("INSERT INTO cliente SET ?", input,
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            //console.log(client);
                            res.redirect('/plan/all_clientes');
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta encargada de editar la info de un cliente existente.
Variables influyentes:
    req.body = {
            rut: string,
            sigla: string,
            razon: string,
            direccion: string,
            ciudad: string,
            giro: string,
            telefono: string,
            contacto: string
        }
Usages:
    plan/layouts/footer.ejs en listener de formSubmit del modal respectivo
    siderval/layouts/footer.ejs en listener de formSubmit del modal respectivo
 */
router.post('/edit_client', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var input = JSON.parse(JSON.stringify(req.body));
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("UPDATE cliente SET ? WHERE rut = ?", [input, input.rut],
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            //console.log(client);
                            res.redirect('/plan/all_clientes');
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta para conseguir la info actual del un cliente específico
Variables influyentes:
    req.params = {
        idcliente: duh
    }
    req.body = {}
Usages:
    plan/client_page.ejs en listener de botón para modal editar cliente
    abast/proveedor_page.ejs en listener de botón para modal editar cliente

 */
router.get('/info_client/:idcliente', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var id = req.params.idcliente;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT * FROM cliente WHERE idcliente =  ?", [id],
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                            res.send(client[0]);
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta que retorna el html para poner en el formulario de crear OF con la info de un material en específico
Variables influyentes:
    req.body = {
        idm: idmaterial,
        idp: idproducido
    }
Usages:
    plan/lanzar_of.ejs Botón agregar producido a of por lanzar
 */
router.post('/addsession_prefabr', function(req,res,next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT material.detalle,caracteristica.cnom FROM material LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica WHERE material.idmaterial = ?",
                [req.body.idm],function(err, details){
                    if(err){console.log("Error Selecting : %s", err);}
                    res.send("<tr><td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'><input type='hidden' name='idp' value='" + req.body.idp +"'></td>"
                        +"<td style='padding: 3px'><input type='date' name='fechas' class='form-control' min='"+ new Date().toLocaleDateString() +"' required></td>" 
                        +"<td style='padding: 3px'><input class='form-control' type='number' name='cants' min='1' required></td>"
                        +"<td class='parsear_nro' style='text-align: center; padding: 5px'><input class='form-control' style='margin-left: 40%; width: 20px; height: 20px;' type='checkbox' name='lock'></td>"
                        +"<td><a onclick='drop(this)' class='btn btn-danger btn-xs'><i class='fa fa-remove'></i></a></td></tr>");
                });
        });
    } else res.redirect("/bad_login");

});
/*
Desc:
    Cargar vista para Crear una OF o una OC(pedido)
Variables influyentes:
    req.params = {
        tipo: pedido || of
    }
    req.body = {}
Usages:
    plan/formped_state.ejs ajax con tipo=pedido para la hacer refresh después de la creación de la OC
    plan/lanzar_pedido.ejs ajax con tipo=pedido para la hacer refresh después de la creación de la OC
    plan/layouts/footer.ejs ajax con tipo=pedido para inicializar el usuario plan (primera vista activa después de un refresh/login)
    plan/layouts/header.ejs ajax con tipo=pedido ligado a botón del panel de control
    plan/layouts/header.ejs ajax con tipo=of ligado a botón del panel de control

 */
router.get('/lanzar_of/:tipo', function(req,res,next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err,connection){
            if(err) throw err;
            connection.query("SELECT * FROM caracteristica",function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                connection.query("SELECT * FROM cliente",function(err,cli)
                {
                    if(err)
                        console.log("Error Selecting : %s ",err );
                    res.render("plan/lanzar_" + req.params.tipo.toString(),{caracts: rows, cli: cli});
                });
            });    
        })
    } else res.redirect("/bad_login");

});
/*
Desc:
    Ruta para creación de ordenes de compra
Variables influyentes:
    req.body = {
        idm: [],
        idp: [],
        fechas: [],
        cants: [],
        cliente: idcliente,
        moneda: usd || eur || gbp || clp,
        factor_item: numero para asignas numitem,
        prov: [],
        precio: [],
        lock: [],
        disp: [],
        nroordenfabricacion: string
    }
Usages:
    plan/formped_state.ejs ajax para la creación de la OC
    plan/lanzar_pedido.ejs ajax para la creación de la OC
 */

router.post('/crear_odc', function(req, res, next){
    if(verificar(req.session.userData)){
        var dats = {
          numordenfabricacion: req.body.nroordenfabricacion,
          estado: "incompleto"
        };
        var cliente = JSON.parse(JSON.stringify(req.body)).cliente;
        var moneda = JSON.parse(JSON.stringify(req.body)).moneda;
        var factor_item = JSON.parse(JSON.stringify(req.body)).factor_item;
        var list = [];
        var listp = [];
        var abast = [];
        if(typeof req.body['idm[]'] !== 'undefined'){
            req.getConnection(function(err,connection){
                var bolfab = true;
                var bolabast = true;
                connection.query("SELECT * FROM " +
                    "(SELECT pedido.idmaterial, coalesce(enp_query.enproduccion, 0) as enproduccion, coalesce(material.stock + coalesce(enp_query.enproduccion, 0) - coalesce(sum(pedido.cantidad - pedido.despachados),0),0) as disponible, " +
                    "material.stock, sum(pedido.cantidad - pedido.despachados) as xdespachar " +
                    "from pedido left join material on material.idmaterial = pedido.idmaterial " +
                    " LEFT JOIN (select " +
                    "  fabricaciones.idmaterial," +
                    "  sum(produccion.1 + produccion.2 + produccion.3 + " +
                    "  produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e) as enproduccion" +
                    "   from produccion " +
                    "  left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                    "  where produccion.1 + produccion.2 + produccion.3 + produccion.4 " +
                    "  + produccion.5 + produccion.6 + produccion.7 + produccion.e > 0 group by fabricaciones.idmaterial) as enp_query ON enp_query.idmaterial = material.idmaterial "+
                    " group by pedido.idmaterial) as ped_xdesp "+
                    " where ped_xdesp.disponible > 0", function(err, stocks){
                    if(err) throw err;

                    connection.query("INSERT INTO odc SET ?",[{numoc: req.body.nroordenfabricacion, idcliente: cliente, moneda: moneda}],function(err,odc){
                        if(err)throw err;
                        if(typeof req.body['idm[]'] === 'string'){
                            //si el pedido el tipo de fabricacion es INTERNA, NO se crea ABASTECIMIENTO
                            if(req.body['prov[]'] === 'producido'){
                                bolabast = false;
                                listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], false, 0, (1)*factor_item, false]);
                            }
                            //si el producto tiene STOCK SUFICIENTE , DE TODAS FORMAS se crea FABRICACIÓN
                            else if(parseInt(req.body['disp[]']) - parseInt(req.body['cants[]']) >= 0){
                                bolfab = false;
                                //TIPO DE FABRICACION externa
                                if(req.body['prov[]'] === 'producto'){
                                    listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], true, 0, (1)*factor_item, false]);

                                }
                                //TIPO DE FABRICACION bmi
                                else{
                                    listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], false, 0, (1)*factor_item, true]);

                                }
                            }
                            else{
                                bolfab = false;
                                bolabast = true;
                                //TIPO DE FABRICACION externa
                                if(req.body['prov[]'] === 'producto'){
                                    listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], true, 0, (1)*factor_item, false]);
                                }
                                //TIPO DE FABRICACION bmi
                                else{
                                    listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], false, 0, (1)*factor_item, true]);
                                }
                            }
                        } else {
                            for(var i = 0;i<req.body['idm[]'].length;i++){
                                //si el pedido no tiene idcliente significa que NO es externo, NO se crea ABASTECIMIENTO
                                if(req.body['prov[]'][i] === 'producido'){
                                    bolabast = false;
                                    listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], false, 0, (i+1)*factor_item, false]);
                                }
                                //si el producto tiene STOCK SUFICIENTE , NO se crea FABRICACIÓN
                                else if(parseInt(req.body['disp[]'][i]) - parseInt(req.body['cants[]'][i]) >= 0){
                                    bolfab = false;
                                    //TIPO DE FABRICACION externo
                                    if(req.body['prov[]'][i] === 'producto'){
                                        listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], true, 0, (i+1)*factor_item, false]);
                                    }
                                    //TIPO DE FABRICACION bmi
                                    else{
                                        listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], false, 0, (i+1)*factor_item, true]);
                                    }
                                }
                                else{
                                    bolabast = true;
                                    bolfab = true;

                                    //TIPO DE FABRICACION externo
                                    if(req.body['prov[]'][i] === 'producto'){
                                        listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], true, 0,(i+1)*factor_item, false]);

                                    }
                                    //TIPO DE FABRICACION bmi
                                    else{
                                        listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], false, 0,(i+1)*factor_item, true]);

                                    }
                                }
                            }
                        }
                        dats.idodc = odc.insertId;
                        connection.query("INSERT INTO pedido " +
                                        "(`idodc`,`despachados`," +
                                        "`f_entrega`," +
                                        "`idmaterial`," +
                                        "`cantidad`,`precio`, `externo`, `idproveedor`,`numitem`,`bmi`) " +
                                        "VALUES ?",[listp],function(err,Peds){
                                        if(err)throw err;
                                        bolfab = true;
                                        if(bolfab){
                                            connection.query("INSERT INTO ordenfabricacion SET ?",dats,function(err,rows){
                                                if(err)
                                                    console.log("Error Selecting : %s ",err );

                                                var idof = rows.insertId;
                                                var idm = [];
                                                var disp = [];
                                                var disp_aux;

                                                if(typeof req.body['idm[]'] == 'string'){
                                                    idm.push(req.body['idm[]']);
                                                    disp.push(parseInt(req.body['disp[]']));
                                                }
                                                else{
                                                    for(var p=0; p < req.body['idm[]'].length; p++ ){
                                                        if(idm.indexOf(req.body['idm[]'][p]) === -1 ){
                                                            idm.push(req.body['idm[]'][p]);
                                                            disp.push(parseInt(req.body['disp[]'][p]));
                                                        }
                                                    }
                                                }

                                                if(typeof req.body['idm[]'] == 'string'){
                                                    if(idm.indexOf(req.body['idm[]']) === -1){disp_aux = 0;}
                                                    else{
                                                        if(disp[idm.indexOf(req.body['idm[]'])] < 0){
                                                            disp_aux = 0;
                                                        }else{
                                                            disp_aux = disp[idm.indexOf(req.body['idm[]'])];
                                                        }
                                                    }
                                                    //PEDIDO ES DE FABRICACIÓN INTERNA
                                                    if(req.body['prov[]'] === 'producido'){
                                                        if( disp_aux - parseInt(req.body['cants[]']) < 0){
                                                            //list.push([rows.insertId,parseInt(req.body['cants[]']) - disp_aux,req.body['fechas[]'],req.body['idm[]'],req.body['idp[]'],parseInt(req.body['cants[]']) - disp_aux, req.body['lock[]'], Peds.insertId, (1)*factor_item]);
                                                            list.push([rows.insertId,parseInt(req.body['cants[]']),req.body['fechas[]'],req.body['idm[]'],req.body['idp[]'],parseInt(req.body['cants[]']) - disp_aux, req.body['lock[]'], Peds.insertId, (1)*factor_item]);
                                                        }
                                                        else{
                                                            list.push([rows.insertId,parseInt(req.body['cants[]']),req.body['fechas[]'],req.body['idm[]'],req.body['idp[]'],0, req.body['lock[]'], Peds.insertId, (1)*factor_item]);
                                                        }
                                                    }
                                                    else{
                                                        list.push([rows.insertId, parseInt(req.body['cants[]']),req.body['fechas[]'],req.body['idm[]'],req.body['idp[]'],parseInt(req.body['cants[]'])  - disp_aux, true, Peds.insertId, (1)*factor_item]);
                                                    }
                                                    disp[idm.indexOf(req.body['idm[]'])] = disp[idm.indexOf(req.body['idm[]'])] - parseInt(req.body['cants[]']);
                                                } else {
                                                    for(var i = 0;i<req.body['idm[]'].length;i++){
                                                        if(idm.indexOf(req.body['idm[]'][i]) === -1){disp_aux = 0;}
                                                        else{
                                                            if(disp[idm.indexOf(req.body['idm[]'][i])] < 0){
                                                                disp_aux = 0;
                                                            }else{
                                                                disp_aux = disp[idm.indexOf(req.body['idm[]'][i])];
                                                            }
                                                        }
                                                        //PEDIDO ES DE FABRICACIÓN INTERNA
                                                        if(req.body['prov[]'][i] === 'producido'){
                                                            if(disp_aux - parseInt(req.body['cants[]'][i]) < 0){
                                                                //list.push([rows.insertId,parseInt(req.body['cants[]'][i]) - disp[idm.indexOf(req.body['idm[]'][i])],req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i], parseInt(req.body['cants[]'][i]) - parseInt(req.body['disp[]'][i]) , req.body['lock[]'][i], Peds.insertId, (i+1)*factor_item]);
                                                                list.push([rows.insertId,parseInt(req.body['cants[]'][i]), req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i], parseInt(req.body['cants[]'][i]) - disp_aux , req.body['lock[]'][i], Peds.insertId, (i+1)*factor_item]);
                                                            }else{
                                                                list.push([rows.insertId, parseInt(req.body['cants[]'][i]),req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i], 0 , req.body['lock[]'][i], Peds.insertId, (i+1)*factor_item]);
                                                            }
                                                        }
                                                        //SI EL PEDIDO ES EXTERNO, SE CREA LA FABRICACION DESHABILITADA. LUEGO SE HABILITARÁ CUANDO ABASTECIMIENTO RECEPCIONE EL PRODUCTO
                                                        else{
                                                            if(disp_aux - parseInt(req.body['cants[]'][i]) < 0){
                                                                list.push([rows.insertId,parseInt(req.body['cants[]'][i]), req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i], parseInt(req.body['cants[]'][i]) - disp_aux , true, Peds.insertId, (i+1)*factor_item]);
                                                            }else{
                                                                list.push([rows.insertId,parseInt(req.body['cants[]'][i]), req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i], 0 , true, Peds.insertId, (i+1)*factor_item]);

                                                            }
                                                        }
                                                        disp[idm.indexOf(req.body['idm[]'][i])] = disp[idm.indexOf(req.body['idm[]'][i])] - parseInt(req.body['cants[]'][i]);
                                                        Peds.insertId++;
                                                    }
                                                }
                                                connection.query("INSERT INTO fabricaciones (`idorden_f`,`cantidad`,`f_entrega`,`idmaterial`,`idproducto`,`restantes`, `lock`, `idpedido`, `numitem`) VALUES ?",[list],function(err,fabrs){
                                                    if(err)throw err;

                                                    //req.session.estadoAlm = { cliente: '6331', nroordenfabricacion: '' };

                                                    connection.query("INSERT INTO save (llave,token) VALUES ?",[[['odc', '6331@']]],function(err,inSave){
                                                        if(err) console.log(err);

                                                        res.send(idof+'');
                                                    });
                                                });
                                            });
                                        }
                                        else{
                                           connection.query("INSERT INTO save (llave,token) VALUES ?",[[['odc', '6331@']]],function(err,inSave){
                                               if(err) console.log(err);
                                               res.send('none');
                                           });
                                        }
                                        });
                                });
                            //console.log(query.sql);
                    });
                });
        } else {
            res.send("error");
        }
    } else res.redirect("/bad_login");
});
/*
Desc:
    Ruta que cambia el estado "lock" de una fabricacion. (Si es posible o no que le aparezca al JdP para convertir en OP.
Variables influyentes:
    req.body = {
        idfab: idfabricacion
    }
Usages:
    plan/of_list.ejs listener del botón
    plan/table_fabricaciones.ejs
 */
router.post('/habilitar_fabricacion', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var idfab = input.idfab;
        req.getConnection(function(err, connection){
            connection.query("UPDATE fabricaciones SET `lock` = NOT `lock` WHERE idfabricaciones = ?", [idfab], function(err, upfab){
                if(err)
                    console.log("Error Updating : %s", err);
                res.send('ok');
            });
        });
    } else res.redirect("/bad_login");
});
/*
Desc:
    Ruta que crea una OF sin una oc anexa
Variables influyentes:
    req.body = {
        idm: [],
        idp: [],
        fechas: [],
        cants: [],
        lock: [],
        factor_item: number,
        nroordenfabricaciones: string
    }
Usages:
    plan/formfab_state.ejs ajax de submit del formulario de creación
 */
router.post('/crear_of', function(req, res, next){
    if(verificar(req.session.userData)){
        var dats = {
          numordenfabricacion: req.body.nroordenfabricacion,
          estado: "incompleto"
        };
        var factor_item = JSON.parse(JSON.stringify(req.body)).factor_item;
        if(typeof req.body['idm[]'] != 'undefined'){
            req.getConnection(function(err,connection){
                if(err) throw err;
                var list = [];
                connection.query("INSERT INTO ordenfabricacion SET ?",dats,function(err,rows){
                    if(err)
                        console.log("Error Selecting : %s ",err );

                    if(typeof req.body['idm[]'] == 'string'){
                                list.push([rows.insertId,req.body['cants[]'],req.body['fechas[]'],req.body['idm[]'],req.body['idp[]'],req.body['cants[]'], req.body['lock[]'], (1)*factor_item]);
                            
                    } else {
                        for(var i = 0;i<req.body['idm[]'].length;i++){
                                list.push([rows.insertId,req.body['cants[]'][i],req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i],req.body['cants[]'][i], req.body['lock[]'][i], (i+1)*factor_item ]);
                            
                        }
                    }
                    connection.query("INSERT INTO fabricaciones (`idorden_f`,`cantidad`,`f_entrega`,`idmaterial`,`idproducto`,`restantes`, `lock`,`numitem`) VALUES ?",[list],function(err,fabrs){

                        if(err) console.log(err);
                        connection.query("INSERT INTO save (llave,token) VALUES ?",[[['of', '1']]],function(err,inSave){
                            if(err) console.log(err);
                            res.send(rows.insertId.toString());
                            //res.redirect('/plan/lanzar_of/of');
                        });

                        });
                    });
                
            });
                        //console.log(query.sql);
        } else {
            res.send("error");
        }
    } else res.redirect("/bad_login");
});
/*
Desc:
    Ruta que consigue y renderiza la info de productos producido para agregarlos a una OF en creación
Variables influyentes:
    req.body = {
        det: String,
        caract: idcaracterstica
    }
Usages:
    plan/lanzar_of.ejs en funcion para refrescar la tabla según parametros entregados
 */
router.post('/producidos_stream', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        list_input = input.det.split(" ");
        input.det = '';
        for (var i = 0; i < list_input.length; i++){
            input.det += "material.detalle LIKE '%" + list_input[i] +"%'";
            if (i !== list_input.length - 1){
                input.det += ' AND ';
            }
        }
        var wher = "WHERE (material.tipo = 'P' OR material.tipo= 'S') " + "AND " + input.det;
        if(input.caract != "0"){
            wher += " AND material.caracteristica = ?";
            dats.push(parseInt(input.caract));
        }
        req.getConnection(function(err,connection){
            connection.query("SELECT material.*,caracteristica.cnom,producido.pdf,aleacion.nom,producido.idproducto as idprod,subaleacion.subnom FROM material INNER JOIN producido ON material.idmaterial = producido.idmaterial" +
                " LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producido.idsubaleacion LEFT JOIN aleacion ON "+"CAST(substring(material.codigo,4,2) AS UNSIGNED) = aleacion.idaleacion" +
                " LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica " + wher + " GROUP BY producido.idproducto",function(err,rows)
            {
                if(err) console.log("Error Selecting : %s ",err );
                
                res.render('plan/prefabrs_stream',{data:rows});
            });
            //console.log(query.sql);
        });
    } else res.redirect("/bad_login");
});
/*
Desc:
    Ruta que consigue los productos según OC paginados
Variables influyentes:
    req.params = {
        pag: número de pagina a cargar
    }
    req.body = {}
Usages:
    plan/layouts/header.ejs  botón en el panel de control
    plan/show_prod.ejs en 3 listeners que manejan la paginación
 */
router.get('/show_prod/:pag', function(req, res, next){
  if(verificar(req.session.userData)){
    var pag = (req.params.pag-1)*5;
    req.getConnection(function(err, connection){
        connection.query("SELECT COUNT(material.idmaterial) as idmaterial FROM (SELECT ordenfabricacion.numordenfabricacion, cliente.sigla ,fabricaciones.idorden_f, fabricaciones.idfabricaciones,fabricaciones.cantidad," +
            " fabricaciones.restantes,fabricaciones.idmaterial,fabricaciones.f_entrega,pedido.despachados,COALESCE(SUM(produccion.8),0) as pt FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " LEFT JOIN ordenfabricacion ON ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join odc on odc.numoc = ordenfabricacion.numordenfabricacion" +
            " left join pedido ON (pedido.idodc = odc.idodc AND pedido.idodc = ordenfabricacion.idodc) left join cliente on cliente.idcliente=odc.idcliente GROUP BY fabricaciones.idfabricaciones) alias LEFT JOIN material ON alias.idmaterial=material.idmaterial GROUP BY material.idmaterial",
            function(err, count){
                if(err){console.log("Error Selecting : %s", err);}
                connection.query("SELECT material.idmaterial,material.detalle, GROUP_CONCAT(alias.numoc,'@', alias.cantidad, '@', alias.restantes, '@', alias.f_entrega, '@', alias.pt,'@',alias.despachados,'@', alias.sigla)" +
                    "  as content FROM (SELECT odc.numoc,ordenfabricacion.numordenfabricacion, cliente.sigla ,fabricaciones.idorden_f, fabricaciones.idfabricaciones,fabricaciones.cantidad," +
                    " fabricaciones.restantes,fabricaciones.idmaterial,fabricaciones.f_entrega,pedido.despachados,COALESCE(SUM(produccion.8),0) as pt FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                    " LEFT JOIN ordenfabricacion ON ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join odc on odc.numoc = ordenfabricacion.numordenfabricacion" +
                    " left join pedido ON (pedido.idodc = odc.idodc AND pedido.idodc = ordenfabricacion.idodc) left join cliente on odc.idcliente = cliente.idcliente GROUP BY fabricaciones.idfabricaciones) alias LEFT JOIN material ON alias.idmaterial=material.idmaterial GROUP BY material.idmaterial ORDER BY material.detalle LIMIT "+pag+",5",
                 function(err, productos){
                    if(err){console.log("Error Selecting : %s", err);}
                    var p;
                    if(count.length%5 == 0){
                        p = parseInt(count.length/5);
                    }
                    else{
                        p = parseInt(count.length/5)+1;
                    }
                    res.render('plan/show_prod', {productos: productos, paginas: p, thispag: req.params.pag});
                });
            });


    });
  }
  else{res.redirect('bad_login');}

});
/*
Desc:
    Ruta que carga la vista con todos los materiales
Variables influyentes:
    req.body = {}
Usages:
    plan/layouts/header.ejs botón en el panel de control
    siderval/layouts/header.ejs botón en el panel de control
 */
router.get('/all_prod', function(req, res, next){
  if(verificar(req.session.userData)){
    req.getConnection(function(err, connection){
                if(err){console.log("Error Connection : %s", err);}
                connection.query("SELECT material.*,COALESCE(cliente.sigla, 'No definido') as sigla FROM material left join producto on producto.idmaterial=material.idmaterial left join cliente on cliente.idcliente=producto.cod_proveedor WHERE material.tipo='P' ORDER BY material.detalle",
                 function(err, materiales){
                    if(err){console.log("Error Selecting : %s", err);}
                    res.render('plan/all_prod', {mat: materiales});
                });
            });
  }
  else{res.redirect('bad_login');}  
    
});
/*
Desc:
    Ruta que envía html con la info actual de un idmaterial específico para aadirlo al formulario de creacion de pedido
Variables influyentes:
    req.body = {
        idm: idmaterial,
        idp: idproducto (producio || producto || insumo)
    }
Usages:
    plan/lanzar_pedido.ejs en ajax para añadir
 */
router.post('/addsession_prepeds', function(req,res,next){
    var query,clase,fila;
    var fabricacion;
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT material.detalle, coalesce(enp_query.enproduccion, 0) as enproduccion, coalesce(disp.disponible, 0) as stock,caracteristica.cnom FROM material LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica LEFT JOIN (SELECT * FROM (SELECT pedido.idmaterial,material.stock - sum(pedido.cantidad - pedido.despachados) as disponible, material.stock, sum(pedido.cantidad - pedido.despachados) as xdespachar from pedido left join material on material.idmaterial = pedido.idmaterial group by pedido.idmaterial) as ped_xdesp"/* where ped_xdesp.disponible > 0*/+") as disp on disp.idmaterial = material.idmaterial " +
                " LEFT JOIN (select " +
                "  fabricaciones.idmaterial," +
                "  sum(produccion.1 + produccion.2 + produccion.3 + " +
                "  produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e) as enproduccion" +
                "   from produccion " +
                "  left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                "  where produccion.1 + produccion.2 + produccion.3 + produccion.4 " +
                "  + produccion.5 + produccion.6 + produccion.7 + produccion.e > 0 group by fabricaciones.idmaterial) as enp_query ON enp_query.idmaterial = material.idmaterial " +
                " WHERE material.idmaterial = ?",
                [req.body.idm],function(err, details){
                    if(err){console.log("Error Selecting : %s", err);}
                    if(req.body.tipo === 'producido'){fabricacion='Interna'}
                    else if(req.body.tipo === 'otro'){fabricacion='Bodega M.I.'}
                    else{fabricacion='Externa'}
                    var stock_d = details[0].stock + details[0].enproduccion;
                    if(stock_d < 0){stock_d = 0;}
                    fila = "<td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'><input type='hidden' name='idp' value='" + req.body.idp +"'><input type='hidden' name='disp' value='" + stock_d +"'></td><td><strong>" + fabricacion + "</strong></td>";
                    var inputprov = false;
                    switch(req.body.tipo){
                        case "producido":
                            query = "SELECT "+/*GROUP_CONCAT('Aleacion: ',aleacion.nom) as aux1,*/"GROUP_CONCAT(' ',subaleacion.subnom) as aux2 FROM producido LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producido.idsubaleacion LEFT JOIN aleacion ON aleacion.idaleacion = subaleacion.idaleacion" +
                                " WHERE producido.idproducto = ? GROUP BY producido.idproducto";
                            clase = "success";
                            break;
                        case "producto":
                            inputprov = true;
                            query = "SELECT GROUP_CONCAT(' ',COALESCE(subaleacion.subnom, 'sin') ) as aux1"+/*,GROUP_CONCAT('Proveedor: ',cliente.sigla) as aux2*/" FROM producto LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producto.idaleacion LEFT JOIN cliente ON producto.cod_proveedor=cliente.idcliente" +
                                " WHERE producto.idproducto = ? GROUP BY producto.idproducto";
                            clase = "warning";
                            break;
                        case "otro":
                            inputprov = true;
                            query = "SELECT otro.helper as aux1,GROUP_CONCAT('Precio: ',material.precio) as aux2 FROM otro LEFT JOIN material ON material.idmaterial = otro.idmaterial WHERE otro.idproducto = ? GROUP BY otro.idproducto";
                            clase = "info";
                            break;
                        default:
                            query = "SELECT otro.helper as aux1,GROUP_CONCAT('Precio: ',material.precio) as aux2 FROM otro LEFT JOIN material ON material.idmaterial = otro.idmaterial WHERE otro.idproducto = ? GROUP BY otro.idproducto";
                            clase = "danger";
                            break;
                    }
                    fila = "<tr class='" + clase + "'>" + fila;
                    connection.query(query,[parseInt(req.body.idp)],function(err,auxs){
                        if(err)throw err;



                        if(inputprov){fila = fila + "<td>" + auxs[0].aux1 +"<input type='text' value='"+req.body.tipo+"' name='prov' style='display:none;'></td>";}
                        else{ fila = fila + "<td><input type='text' value='"+req.body.tipo+"' name='prov' style='display:none;'>" + auxs[0].aux2 +"</td>";}
                        fila = fila + "<td style='padding: 3px'><input type='date' name='fechas' class='form-control' min='"+ new Date().toLocaleDateString() +"' required></td>" 
                        +"<td style='padding: 3px'><input class='form-control' type='number' name='cants' min='1' required></td>"
                        +"<td style='text-align: center'>"+ parsear_crl(stock_d) +"</td>"
                        +"<td style='padding: 3px'><input type='number' class='form-control' placeholder='Precio' name='precio'></td>"
                        +"<td style='text-align: center; padding: 5px'><input class='form-control' style='margin-left: 30%; width: 20px; height: 20px;' type='checkbox' name='lock'></td>"
                        +"<td><a onclick='drop(this)' class='btn btn-danger btn-xs'><i class='fa fa-remove'></i></a></td></tr>";
                        res.send(fila);

                    });

                });
        });
    } else res.redirect("/bad_login");

});
/*
Desc:
    Ruta que busca materiales según detalle o caractéristica para ser agregado a un pedido
Variables influyentes:
    req.body = {
        det: string,
        caracteristica: idcaracteristica
    }
Usages:
    plan/lanzar_pedido.ejs
 */
router.post('/buscar_mat', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var list_input = input.det.split(' ');
        input.det = '';
        for (var i = 0; i < list_input.length; i++){
            input.det += "material.detalle LIKE '%" + list_input[i] +"%'";
            if (i !== list_input.length - 1){
                input.det += ' AND ';
            }
        }
        var wher = "WHERE ("+/*material.tipo != 'I' AND */"material.tipo != 'C' AND material.tipo != 'X' AND material.tipo!='S'"+/* AND material.tipo!='M'*/")" +
                " AND " + input.det;
        var dats = [input.det];
        if(input.caract !== "0"){
            wher += " AND material.caracteristica = ?";
            dats.push(parseInt(input.caract));
        }
        req.getConnection(function(err,connection){
            connection.query("SELECT " +
                "coalesce(producido.ruta, '') as ruta,material.*, coalesce(disp.xdespachar,0) as xdespachar, " +
                "coalesce(disp.disponible,0) as disponible, coalesce(enp_query.enproduccion,0) as enproduccion," +
                "caracteristica.cnom,producido.idproducto as idproducido,producto.idproducto,otro.idproducto AS idotro," +
                "GROUP_CONCAT(aleacion.nom,'@@',subaleacion.subnom) as alea_token, (material.codigo LIKE 'M%' || material.codigo LIKE 'I%' || material.codigo LIKE 'O%') AS bmi " +
                "FROM material " +
                "LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica LEFT JOIN producido ON producido.idmaterial = material.idmaterial" +
                " LEFT JOIN producto ON producto.idmaterial = material.idmaterial LEFT JOIN otro ON otro.idmaterial = material.idmaterial LEFT JOIN subaleacion ON producido.idsubaleacion = subaleacion.idsubaleacion" +
                " LEFT JOIN aleacion ON aleacion.idaleacion = subaleacion.idaleacion" +
                " LEFT JOIN (" +
                "SELECT * FROM (SELECT pedido.idmaterial,sum(pedido.cantidad - pedido.despachados) as xdespachar, material.stock - sum(pedido.cantidad - pedido.despachados) as disponible, material.stock from pedido left join material on material.idmaterial = pedido.idmaterial group by pedido.idmaterial) as ped_xdesp"+/* where ped_xdesp.disponible > 0*/") " +
                "as disp on disp.idmaterial = material.idmaterial" +
                " LEFT JOIN (select " +
                "fabricaciones.idmaterial," +
                "sum(produccion.1 + produccion.2 + produccion.3 + " +
                "produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e) as enproduccion" +
                " from produccion " +
                "left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                "where produccion.1 + produccion.2 + produccion.3 + produccion.4 " +
                "+ produccion.5 + produccion.6 + produccion.7 + produccion.e > 0 group by fabricaciones.idmaterial) as enp_query on enp_query.idmaterial = material.idmaterial " + wher + " GROUP BY material.idmaterial",function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );

                res.render('plan/prepeds_stream',{data:rows},function(err,html){if(err)console.log(err);res.send(html)});

            });
        });
    } else res.redirect("/bad_login");

});
/*
Desc:
    Ruta que carga la info de materiales en producción segun detalle
Variables influyentes:
    req.body = {
        detalle: String
    }
Usages:
    plan/show_prod.ejs ajax de submit para búsqueda
 */
router.post('/buscar_prod', function(req, res, next){
  if(verificar(req.session.userData)){
    var input = JSON.parse(JSON.stringify(req.body));
    var where = "WHERE material.detalle LIKE '%"+ input.detalle +"%' OR alias.numordenfabricacion LIKE '%"+input.detalle+"%'";
    req.getConnection(function(err, connection){
            connection.query("SELECT producido.ruta,material.idmaterial,material.detalle, GROUP_CONCAT(alias.numordenfabricacion,'@', alias.cantidad, '@', alias.restantes, '@', alias.f_entrega, '@', alias.pt,'@',alias.despachados)" +
                "  as content FROM (SELECT ordenfabricacion.numordenfabricacion ,fabricaciones.idorden_f, fabricaciones.idfabricaciones,fabricaciones.cantidad," +
                " fabricaciones.restantes,fabricaciones.idmaterial,fabricaciones.f_entrega,pedido.despachados,COALESCE(SUM(produccion.8),0) as pt FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                " LEFT JOIN ordenfabricacion ON ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join odc on odc.numoc = ordenfabricacion.numordenfabricacion left join pedido ON (pedido.idodc = odc.idodc AND pedido.f_entrega = fabricaciones.f_entrega AND fabricaciones.idmaterial = pedido.idmaterial) GROUP BY fabricaciones.idfabricaciones) alias " +
                " LEFT JOIN material ON alias.idmaterial=material.idmaterial" +
                " LEFT JOIN producido ON producido.idmaterial=material.idmaterial "+where+" GROUP BY material.idmaterial",
                function(err, productos){
                    if(err){console.log("Error Selecting : %s", err);}
                    res.render('plan/show_prod', {productos: productos, paginas: 1, thispag: 0});
                });
    });
  }
  else{res.redirect('bad_login');}  
    
});
/*
Desc:
    Ruta que busca si hay o no una OF con un numordenfabricacion
Variables influyentes:
    req.params = {
        num: String //numordenfabricacion
    }
    req.body = {}
Usages:
    plan/lanzar_of.ejs en ajax para un input.on('keyup')
 */
router.get('/found_num_of/:num', function(req, res, next){
  if(verificar(req.session.userData)){
    var num = req.params.num;
    console.log(num);
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM ordenfabricacion WHERE numordenfabricacion= ?", [num], function(err, ofs){
            if(err){console.log("Error Selecting : %s", err);}
            if(ofs.length>0){
                res.send('colapse');
            }
            else{
                res.send('ok');
            }
        });
    });
  }
  else{res.redirect('bad_login');}  
    
});
/*
Desc:
    Ruta que verifica si existe una OC con un número específico y un cliente específico
Variables influyentes:
    req.params = {
        num: String, //numordenfabricacion
        idcli: idcliente
    }
    req.body = {}
Usages:
    plan/lanzar_pedido.ejs en ajax para realizar verificación
    plan/formped_state.ejs en ajax para realizar verificación
 */
router.get('/found_num/:num/:idcli', function(req, res, next){
  if(verificar(req.session.userData)){
    var num = req.params.num;
    var idcli = req.params.idcli;
    console.log(num);
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM odc WHERE numoc= ? AND idcliente=?", [num, idcli], function(err, ofs){
            if(err){console.log("Error Selecting : %s", err);}
            if(ofs.length>0){
                res.send('colapse');
            }
            else{
                res.send('ok');
            }
        });
    });
  }
  else{res.redirect('bad_login');}  
    
});
/*
Desc:
    Ruta que consigue la info de una OF (si esque existe)
Variables influyentes:
    req.body = {
        num:
        items:
        ocvinc:
        fecha:
    }
Usages:
    plan/of_list.ejs en ajax tras submit de formulario
 */
router.post('/buscar_of', function(req, res, next){
    var data = [];
    var query = '';
    var exque = '';
    var aux;
    var filtro = req.body.ocvinc;
    var limit = req.body.items;
    req.getConnection(function(err, connection){
        if(req.body.num != ''){
            //query+= ' sup_query.numordenfabricacion LIKE ? OR sup_query.idordenfabricacion LIKE ? OR sup_query.token LIKE "%'+req.body.num+'%"';
            query+= ' sup_query.numordenfabricacion LIKE ? OR sup_query.token LIKE "%'+req.body.num+'%"';
            data.push(req.body.num + "%");
            data.push(req.body.num + "%");
            exque = 'sup_query.token LIKE "%'+req.body.num+'%"';
        }
        if(req.body.fecha != ''){
            if(req.body.num != '') query += "AND";
            query += ' sup_query.creacion < ? AND sup_query.creacion > ?';
            aux = new Date(req.body.fecha).getTime() + 1000*60*60*24;
            data.push(new Date(aux));
            data.push(new Date(req.body.fecha));
        }
        if(data.length>0){
            connection.query("SELECT * FROM (select ordenfabricacion.*,coalesce(odc.numoc, 'Sin OC') as numoc,max(fabricaciones.cantidad>COALESCE(pedido.despachados,0) AND to_days(fabricaciones.f_entrega) < to_days(now())) as atraso,sum(coalesce(pedido.despachados, 0)) as sum_desp, sum(fabricaciones.cantidad) as sum_cant," +
                    " GROUP_CONCAT(REPLACE(material.detalle,',', '.'),'@',fabricaciones.cantidad,'@'," +
                    " fabricaciones.f_entrega,'@',coalesce(fabricaciones.restantes, fabricaciones.cantidad),'@',fabs.cantidad,'@',coalesce(pedido.despachados, 'Sin OC vinculada'),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@', coalesce(pedido.externo,0),'@', fabricaciones.lock,'@', fabricaciones.idfabricaciones) as token from ordenfabricacion" +
                    " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                    " left join material on fabricaciones.idmaterial=material.idmaterial" +
                    " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join pedido on pedido.idpedido=fabricaciones.idpedido left join ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion" +
                    "  GROUP BY fabricaciones.idfabricaciones ORDER BY pedido.idpedido DESC) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones left join odc ON odc.idodc = ordenfabricacion.idodc left join pedido ON (pedido.idpedido=fabricaciones.idpedido)" +
                    " GROUP BY ordenfabricacion.idordenfabricacion) AS sup_query where ("+query+") AND sup_query.numoc"+req.body.ocvinc+" LIMIT "+limit,
                        data, function(err, ofFound){
                            if(err){console.log("Error Selecting : %s", err);}

                            if(ofFound.length > 0){
                                res.render('plan/of_list',{data: ofFound, filtro: filtro, nomore: limit > ofFound.length});
                            }
                            else{
                                res.render('plan/of_list',{data: [], filtro: filtro, nomore: limit > ofFound.length});
                            }
                        });}
        else{
            connection.query("SELECT * FROM (select ordenfabricacion.*,coalesce(odc.numoc, 'Sin OC') as numoc,max(fabricaciones.cantidad>COALESCE(pedido.despachados,0) AND to_days(fabricaciones.f_entrega) < to_days(now())) as atraso,sum(coalesce(pedido.despachados, 0)) as sum_desp, sum(fabricaciones.cantidad) as sum_cant," +
                    " GROUP_CONCAT(REPLACE(material.detalle,',', '.'),'@',fabricaciones.cantidad,'@'," +
                    " fabricaciones.f_entrega,'@',coalesce(fabricaciones.restantes, fabricaciones.cantidad),'@',fabs.cantidad,'@',coalesce(pedido.despachados, 'Sin OC vinculada'),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',coalesce(pedido.externo, 0),'@', fabricaciones.lock,'@', fabricaciones.idfabricaciones) as token from ordenfabricacion" +
                    " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                    " left join material on fabricaciones.idmaterial=material.idmaterial" +
                    " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion" +
                    "  GROUP BY fabricaciones.idfabricaciones) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones left join odc ON odc.idodc = ordenfabricacion.idodc left join pedido ON (pedido.idpedido=fabricaciones.idpedido)" +
                    " GROUP BY ordenfabricacion.idordenfabricacion) AS sup_query where sup_query.numoc"+req.body.ocvinc+" LIMIT "+limit,
                        data, function(err, ofFound){
                            if(err){console.log("Error Selecting : %s", err);}
                            
                            if(ofFound.length > 0){
                                res.render('plan/of_list',{data: ofFound, filtro: filtro, nomore: limit > ofFound.length});
                            }
                            else{
                                res.send('null');
                            }
                        });
        }
    });
});
/*
Desc:
    Ruta que devuelve una prediccion de posibles clientes segun un texto
Variables influyentes:
    req.params = {{
        text: string
    }
    req.body = {}
Usages:
    plan/lanzar_pedido.ejs ajax para conseguir predicciones
    abast/formoda_state.ejs ajax para conseguir predicciones
    abast/lanzar_oc.ejs ajax para conseguir predicciones

 */
router.get('/get_client_pred/:text', function(req,res,next){
    var text = req.params.text;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
        connection.query("SELECT idcliente,sigla,coalesce(formapago.tokenoda, '') as tokenoda,cliente.pago FROM cliente left join (select max(oda.creacion) as creacion, tokenoda, oda.idproveedor from oda group by idproveedor) as formapago on formapago.idproveedor = cliente.idcliente WHERE cliente.sigla LIKE '%"+text+"%' LIMIT 7",
            function(err, datos){
                if(err)
                    console.log("Error Selecting : %s", err);
                res.render('plan/predict_stream', {info : datos});

            });
        });
});
/*
Desc:
    Set de rutas para mostrar/generar/descargar pdf de una ODA
Variables influyentes:
    req.body = {}
Usages:
 */
router.post('/view_ordenpdf', function(req,res,next){
    var idoda = JSON.parse(JSON.stringify(req.body)).idoda;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query('select material.detalle, material.precio, abastecimiento.cantidad from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on material.idmaterial=abastecimiento.idmaterial where oda.idoda=?', [idoda],
         function(err, mats){
            if(err)
                console.log("Error Selecting : %s", err);
            connection.query("SELECT * FROM oda LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor WHERE oda.idoda = ?", [idoda], function(err, oda){
                if(err)
                    console.log("Error Selecting : %s", err);

                var phantom = require('phantom');   
                phantom.create().then(function(ph) {
                    ph.createPage().then(function(page) {
                        page.property('viewportSize',{width:612,height:792});
                        page.open("http://"+res.req.headers.host+"/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
                            page.render('public/pdf/odc'+oda[0].numoda+'.pdf').then(function() {
                                console.log('Page Rendered');
                                ph.exit();
                                var fs = require('fs');
                                var filePath = '\\pdf\\odc'+oda[0].numoda+'.pdf';
                                console.log(__dirname.replace('routes','public') + filePath);
                                fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                    res.contentType("application/pdf");
                                    console.log(data);
                                    res.redirect('/plan/show_pdf/'+oda[0].numoda);
                                    //res.send(data);
                                });
                                //res.send('/Users/dagui/Desktop/siderval/pdfs/odc'+oda[0].numoda+'-'+oda[0].idoda+'.pdf');
                                //res.redirect("/plan/view_ordenpdf_get/"+oda[0].idoda);
                            });
                        });
                    });
                });
            });
         });
    });    

});

router.post('/view_ordenpdf_first', function(req,res,next){
    var idoda = JSON.parse(JSON.stringify(req.body)).idoda;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query('select material.detalle, material.precio, abastecimiento.cantidad from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on material.idmaterial=abastecimiento.idmaterial where oda.idoda=?', [idoda],
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("SELECT * FROM oda LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor WHERE oda.idoda = ?", [idoda], function(err, oda){
                    if(err)
                        console.log("Error Selecting : %s", err);

                    var phantom = require('phantom');
                    phantom.create().then(function(ph) {
                        ph.createPage().then(function(page) {
                            page.property('viewportSize',{width:612,height:792});
                            page.open("http://"+res.req.headers.host+"/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
                                page.render('public/pdf/odc'+oda[0].numoda+'.pdf').then(function() {
                                    console.log('Page Rendered');
                                    ph.exit();
                                    var fs = require('fs');
                                    var filePath = '\\pdf\\odc'+oda[0].numoda+'.pdf';
                                    fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                        res.contentType("application/pdf");
                                        console.log(data);
                                        res.redirect('/plan/show_pdf_first/'+oda[0].numoda);
                                        //res.send(data);
                                    });
                                    //res.send('/Users/dagui/Desktop/siderval/pdfs/odc'+oda[0].numoda+'-'+oda[0].idoda+'.pdf');
                                    //res.redirect("/plan/view_ordenpdf_get/"+oda[0].idoda);
                                });
                            });
                        });
                    });
                });
            });
    });

});
router.get('/show_pdf_first/:numoda', function(req,res,next){
    var fs = require('fs');
    var filePath = '\\pdf\\odc'+req.params.numoda+'.pdf';
    console.log(__dirname.replace('routes','public') + filePath);

    fs.readFile(__dirname.replace('routes','public') + filePath, (err, data) => {
        if(err) {
            console.log('error: ', err);
            console.log("ARCHIVO INEXISTENTE");
        }
        console.log(data);

        fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
            res.contentType("application/pdf");
            console.log(data);
            res.send(data);
        });
    });

});
router.get('/show_pdf/:numoda', function(req,res,next){
    var fs = require('fs');
    var filePath = '\\pdf\\odc'+req.params.numoda+'.pdf';
    fs.readFile(__dirname.replace('routes','public') + filePath, (err, data) => {
        if(err) {
            console.log('error: ', err);
            console.log("ARCHIVO INEXISTENTE");
            res.redirect('/plan/view_ordenpdf_after/'+req.params.numoda);
        } else {
            var r = __dirname.replace('routes','public') + filePath;
            console.log("ARCHIVO SI EXISTE");
            if(req.session.booleanPDFgen) {
                fs.readFile(r, function (err, data) {
                    res.contentType("application/pdf");
                    req.session.booleanPDFgen = false;
                    res.send(data);
                });
            }else{
                fs.unlink(r, function (err, data) {
                    if (err) {console.log("Ha Ocurrido un error : %s", err);}
                    req.session.booleanPDFgen = true;
                    res.redirect('/plan/show_pdf/' + req.params.numoda);
                });
            }

        }
    });

});
//A ESTA RUTA SE LLAMA CUANDO SE QUIERE CREAR EL ARCHIVO PDF DE LA ODA TIEMPO DESPUES DE REGISTRARLA
router.get('/view_ordenpdf_after/:idoda', function(req,res,next){
    var idoda = req.params.idoda;

    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query('select material.detalle, material.precio, abastecimiento.cantidad from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on material.idmaterial=abastecimiento.idmaterial where oda.idoda=?', [idoda],
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("SELECT * FROM oda LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor WHERE oda.idoda = ?", [idoda], function(err, oda){
                    if(err)
                        console.log("Error Selecting : %s", err);

                    var phantom = require('phantom');
                    phantom.create().then(function(ph) {
                        ph.createPage().then(function(page) {
                            page.property('viewportSize',{width:612,height:792});
                            console.log("obteniendo pdf");
                            console.log( res.req.headers.host);

                            page.open("http://"+res.req.headers.host+"/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
                                page.render('public/pdf/odc'+oda[0].idoda+'.pdf').then(function() {
                                    console.log('Page Rendered');
                                    ph.exit();
                                    var fs = require('fs');
                                    var filePath = '\\pdf\\odc'+oda[0].numoda+'.pdf';
                                    fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                        res.contentType("application/pdf");
                                        res.redirect('/plan/show_pdf/'+oda[0].numoda);
                                    });
                                });
                            });
                        });
                    });


                });
            });
    });

});
//ESTA RUTA SE USA CUANDO SE QUIERE DESCARGAR EL PDF
router.get('/view_ordenpdf_after_d/:idoda', function(req,res,next){
    var idoda = req.params.idoda;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
        connection.query('select material.detalle, material.precio, abastecimiento.cantidad from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on material.idmaterial=abastecimiento.idmaterial where oda.idoda=?', [idoda],
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("SELECT * FROM oda LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor WHERE oda.idoda = ?", [idoda], function(err, oda){
                    if(err)
                        console.log("Error Selecting : %s", err);

                    var phantom = require('phantom');
                    phantom.create().then(function(ph) {
                        ph.createPage().then(function(page) {
                            page.property('viewportSize',{width:612,height:792});
                            page.open("http://"+res.req.headers.host+"/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
                                page.render('public/pdf/odc'+oda[0].numoda+'.pdf').then(function() {
                                    console.log('Page Rendered');
                                    var fs = require('fs');
                                    var filePath = '\\pdf\\odc'+oda[0].numoda+'.pdf';
                                    console.log(__dirname.replace('routes','public') + filePath);
                                    fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                        res.contentType("application/pdf");
                                        ph.exit();
                                        res.redirect('/plan/download_pdf/'+oda[0].numoda);

                                    });
                                });
                            });
                        });
                    });
                });
            });
    });
});
router.get('/download_pdf/:numoda', function(req,res,next){
    var fs = require('fs');
    var filePath = '\\pdf\\odc'+req.params.numoda+'.pdf';
    console.log(__dirname.replace('routes','public') + filePath);
    fs.readFile(__dirname.replace('routes','public') + filePath, (err, data) => {
        if(err) {
            console.log('error: ', err);
            console.log("ARCHIVO INEXISTENTE");
            res.redirect('/plan/view_ordenpdf_after_d/'+req.params.numoda);

        } else {
            console.log(data);
            console.log("ARCHIVO SI EXISTE");
            fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                res.contentType("application/pdf");
                console.log(data);
                res.send('/pdfs/odc'+req.params.numoda+'.pdf');
            });
        }
    });

});
//RENDERIZA LO QUE VA A APARECER EN EL PDF
router.get('/view_ordenpdf_get/:idoda', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query("select coalesce(combustible.idmaterial, 0) as idcombustible,coalesce(producto.det_producto,material.detalle) as detalle,sub_ccontable.idccontable as subcuenta, abastecimiento.costo as precio, abastecimiento.cantidad,abastecimiento.exento from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on material.idmaterial=abastecimiento.idmaterial left join producto on (producto.idmaterial = material.idmaterial) left join sub_ccontable on abastecimiento.cc = sub_ccontable.idsub left join (SELECT idmaterial FROM material where codigo in('I030000990004')) as combustible on combustible.idmaterial = material.idmaterial where oda.idoda=?", [req.params.idoda],
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("SELECT * FROM oda LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor WHERE oda.idoda = ?", [req.params.idoda], function(err, oda){
                    if(err)
                        console.log("Error Selecting : %s", err);

                    res.render('plan/template_oda', {oda: oda,mats: mats,tipo: 'oda'});
                });
            });
    });
});
/*
Desc:
    Set de rutas para mostrar/generar/descargar pdf del Packing list
Variables influyentes:
    req.body = {}
Usages:
 */
router.post('/view_PLpdf', function(req,res,next){
    var idoda = JSON.parse(JSON.stringify(req.body)).idoda;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
         connection.query("SELECT * FROM palet_item " +
             "left join palet on palet.idpalet = palet_item.idpalet " +
             "left join pedido on pedido.idpedido = palet_item.idpedido " +
             "left join material on material.idmaterial = pedido.idmaterial " +
             "where palet.idpackinglist = ?", [idoda], function(err, oda){
             if(err)
                 console.log("Error Selecting : %s", err);

             var phantom = require('phantom');
             phantom.create().then(function(ph) {
                 ph.createPage().then(function(page) {
                     page.property('viewportSize',{width:612,height:792});
                     page.open("http://"+res.req.headers.host+"/plan/view_PLpdf_get/"+oda[0].idpackinglist).then(function(status) {
                         page.render('public/pdf/pl'+oda[0].idpackinglist+'.pdf').then(function() {
                             console.log('Page Rendered');
                             ph.exit();
                             var fs = require('fs');
                             var filePath = '\\pdf\\pl'+oda[0].idpackinglist+'.pdf';
                             console.log(__dirname.replace('routes','public') + filePath);
                             fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                 res.contentType("application/pdf");
                                 console.log(data);
                                 res.redirect('/plan/show_pdf_PL/'+oda[0].idpackinglist);
                             });
                         });
                     });
                 });
             });


         });
    });

});
router.get('/show_pdf_PL/:numpl', function(req,res,next){
    var fs = require('fs');
    var filePath = '\\pdf\\pl'+req.params.numpl+'.pdf';
    console.log(__dirname.replace('routes','public') + filePath);

    fs.readFile(__dirname.replace('routes','public') + filePath, (err, data) => {
        if(err) {
            console.log('error: ', err);
            console.log("ARCHIVO INEXISTENTE");
            res.redirect('/plan/view_PLpdf_after/'+req.params.numpl);

        } else {
            console.log(data);
            console.log("ARCHIVO SI EXISTE");
            fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                res.contentType("application/pdf");
                res.send(data);
            });
        }
    });

});
router.get('/view_PLpdf_after/:numpl', function(req,res,next){
    var idoda = req.params.numpl;


    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
        connection.query("SELECT * FROM palet_item " +
            "left join palet on palet.idpalet = palet_item.idpalet " +
            "left join pedido on pedido.idpedido = palet_item.idpedido " +
            "left join material on material.idmaterial = pedido.idmaterial " +
            "where palet.idpackinglist = ?", [idoda], function(err, oda){
            if(err)
                console.log("Error Selecting : %s", err);

            var phantom = require('phantom');
            phantom.create().then(function(ph) {
                ph.createPage().then(function(page) {
                    page.property('viewportSize',{width:612,height:792});
                    page.open("http://"+res.req.headers.host+"/plan/view_PLpdf_get/"+oda[0].idpackinglist).then(function(status) {
                        page.render('public/pdf/pl'+oda[0].idpackinglist+'.pdf').then(function() {
                            console.log('Page Rendered');
                            ph.exit();
                            var fs = require('fs');
                            var filePath = '\\pdf\\pl'+oda[0].idpackinglist+'.pdf';
                            console.log(__dirname.replace('routes','public') + filePath);
                            fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                res.contentType("application/pdf");
                                console.log(data);
                                res.redirect('/plan/show_pdf_PL/'+oda[0].idpackinglist);
                            });
                        });
                    });
                });
            });
        });
    });

});
router.get('/view_PLpdf_get/:numpl', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
        connection.query("SELECT group_concat(material.detalle separator '@') as detalle, odc.numoc, fabricaciones.idorden_f, cliente.sigla, group_concat(palet_item.cantidad) as cantidad, palet.idpalet,palet.creacion, palet.idpackinglist FROM palet_item " +
                         "left join palet on palet.idpalet = palet_item.idpalet "  +
                         "left join pedido on pedido.idpedido = palet_item.idpedido " +
                         "left join fabricaciones on fabricaciones.idpedido = pedido.idpedido " +
                         "left join odc on odc.idodc = pedido.idodc " +
                         "left join cliente on cliente.idcliente = odc.idcliente " +
                         "left join material on material.idmaterial = pedido.idmaterial " +
                         "where palet.idpackinglist = ? group by palet_item.idpalet", [req.params.numpl],
            function(err, pl){
                if(err)
                    console.log("Error Selecting : %s", err);
                res.render('bodega/template_pl', {pl: pl});
            });
    });
});

/*
Desc:
    Set de rutas para mostrar y enviar el path del pdf de una OF
Variables influyentes:
    req.body = {}
Usages:
 */
//RENDERIZA LO QUE VA A APARECER EN EL PDF de la OF
router.get('/view_ofpdf_get/:idof', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query('SELECT material.detalle,material.codigo, fabricaciones.cantidad,DATE_FORMAT(fabricaciones.f_entrega,"%d-%m-%Y") AS f_entrega,COALESCE(pedido.externo,0) AS exento FROM fabricaciones' +
            ' LEFT JOIN material on material.idmaterial = fabricaciones.idmaterial' +
            ' LEFT JOIN pedido on pedido.idpedido = fabricaciones.idpedido' +
            ' WHERE fabricaciones.idorden_f = ?', [req.params.idof],
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("SELECT ordenfabricacion.*,cliente.*, odc.numoc FROM ordenfabricacion" +
                    " LEFT JOIN odc ON ordenfabricacion.idodc = odc.idodc" +
                    " LEFT JOIN cliente ON cliente.idcliente = odc.idcliente WHERE ordenfabricacion.idordenfabricacion = ?", [req.params.idof], function(err, oda){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    console.log(mats);
                    res.render('plan/template_of2', {oda: oda,mats: mats,tipo: 'of'});
                });
            });
    });
});
//Genera el PDF de una OF y retorna el PATH de guardado
router.get('/view_ofpdf/:idof', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err) console.log("Error Connection : %s", err);
        // Se consigue el número de la factura
        connection.query("SELECT numordenfabricacion AS numfac FROM ordenfabricacion WHERE idordenfabricacion = ?", [req.params.idof], function(err, oda){
            if(err) console.log("Error Selecting : %s", err);
            var phantom = require('phantom');
            // Ubicacion donde se guardará el pdf
            var path = '/pdf/OF_N' + oda[0].numfac + '-' + new Date().getTime() + '.pdf';
            // Inicializa phantom y lo pone en 'ph'
            phantom.create().then(function(ph) {
                // Se Crea la 'promesa' o el ~canvas~ por decirlo de otra manera
                ph.createPage().then(function(page) {
                    //Setea las propiedades de la pagina donde se pegara el html
                    page.property('viewportSize',{width:612,height:792});
                    //Cargar html a pegar desde un request http
                    page.open("http://"+res.req.headers.host+"/plan/view_ofpdf_get/"+req.params.idof).then(function(status) {
                        // Guardar pdf en el 'path' especificado
                        page.render('public' + path).then(function() {
                            ph.exit();
                            //Enviar
                            res.send(path);
                        });
                    });
                });
            });
        });
    });
});
/*
Desc:
    Ruta para guardar el estado (plantilla) de una OC (pedido)
Variables influyentes:
    req.body = {
        idm: [],
        idp: [],
        fechas: [],
        cants: [],
        cliente: idcliente,
        moneda: usd || eur || gbp || clp,
        prov: [],
        precio: [],
        lock: [],
        nroordenfabricacion: String
    }
Usages:
    plan/lanzar_pedido.ejs ajax en funcion saveState()
 */
router.post('/saveStateOCBD', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
    var token = data['cliente']+"@"+data['nroordenfabricacion']+"@";
    if(data["idm[]"]){
        if(typeof data['idm[]'] == "string"){
            token += data['idm[]']+","+data['idp[]']+","+data['cants[]']+","+data['fechas[]']+","+data['prov[]']+","+data['precio[]']+"@";
        }
        else{
            for(var e=0; e < data['idm[]'].length; e++){
                token += data['idm[]'][e]+","+data['idp[]'][e]+","+data['cants[]'][e]+","+data['fechas[]'][e]+","+data['prov[]'][e]+","+data['precio[]'][e]+"@";
            }
        }
    }
    token = token.substring(0, token.length-1);
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        //INSERT INTO `siderval`.`save` (`token`) VALUES ('DDQWD');
        connection.query("INSERT INTO save (llave,token) VALUES ?",[[['odc',token]]], function(err, inSave){
            if(err)
                console.log("Error Insert : %s", err);
            res.send('ok');
        });
    });

});
/*
Desc:
    Ruta para guardar el estado (plantilla) de una OC (pedido)
Variables influyentes:
    req.body = {
        idm: [],
        idp: [],
        fechas: [],
        cants: [],
        lock: [],
        nroordenfabricacion: ''
        }
Usages:
    plan/lanzar_of.ejs ajax en funcion saveState()
 */
router.post('/saveStateOFBD', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
    var token = data['nroordenfabricacion']+"@";
    if(data["idm[]"]){
        if(typeof data['idm[]'] == "string"){
            token += data['idm[]']+","+data['idp[]']+","+data['cants[]']+","+data['fechas[]']+"@";
        }
        else{
            for(var e=0; e < data['idm[]'].length; e++){
                token += data['idm[]'][e]+","+data['idp[]'][e]+","+data['cants[]'][e]+","+data['fechas[]'][e]+"@";
            }
        }
    }
    token = token.substring(0, token.length-1);
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        //INSERT INTO `siderval`.`save` (`token`) VALUES ('DDQWD');
        connection.query("INSERT INTO save (llave,token) VALUES ?",[[['of',token]]], function(err, inSave){
            if(err)
                console.log("Error Insert : %s", err);
            res.send('ok');
        });
    });
});
/*
Desc:
    Ruta que carga el estado de una OC preguardada
Variables influyentes:
    req.body = {}
Usages:
    plan/lanzar_pedido.ejs ajax en funcion loadState()
 */
router.get('/loadStateOCBD', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s",err);
        connection.query("select save.* from save inner join (SELECT max(idsave) as ids, max(ult_save) as last_save FROM save where llave = 'odc' group by save.llave) as ult on ult.ids = save.idsave", function(err,estado){
            if(err)
                console.log("Error Selecting : %s", err);
            var token = estado[0].token;
            var datos;
            console.log(token.split('@'));
            if(token.split('@').length > 2){
                console.log("Con productos");
                token = token.split('@');
                datos = { 
                    cliente: token[0], 
                    nroordenfabricacion: token[1], 
                    'idm[]': [],
                    'idp[]': [],
                    'cants[]': [],
                    'fechas[]': [],
                    'prov[]': [],
                    'precio[]': []
                };
                for(var r=2; r < token.length; r++){
                    datos['idm[]'].push(token[r].split(',')[0]);
                    datos['idp[]'].push(token[r].split(',')[1]);
                    datos['cants[]'].push(token[r].split(',')[2]);
                    datos['fechas[]'].push(token[r].split(',')[3]);
                    datos['prov[]'].push(token[r].split(',')[4]);
                    datos['precio[]'].push(token[r].split(',')[5]);
                }
                datos['dets[]'] = [];
                datos['alea[]'] = [];
                datos['stock[]'] = [];
                var c_int = 0;
                var c_ext = 0;
                var c_otr = 0;

                var query_producido = '';
                var query_producto = '';
                var query_otro = '';
                for(var u=0; u<datos['idm[]'].length; u++){
                    if(datos['prov[]'][u] === 'producido'){//PRODUCIDO
                        if(c_int === 0){
                            query_producido = "SELECT material.*, coalesce(disp.disponible,0) as disp, producido.*, subaleacion.* FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion " +
                                "LEFT JOIN (SELECT * FROM (SELECT pedido.idmaterial,material.stock - sum(pedido.cantidad - pedido.despachados) as disponible, material.stock, sum(pedido.cantidad - pedido.despachados) as xdespachar from pedido left join material on material.idmaterial = pedido.idmaterial group by pedido.idmaterial) as ped_xdesp where ped_xdesp.disponible > 0) as disp on disp.idmaterial = material.idmaterial ";
                            query_producido += " WHERE material.idmaterial = "+datos['idm[]'][u];
                        }
                        else{    
                            query_producido += " OR material.idmaterial = "+datos['idm[]'][u];
                        }
                        c_int++;

                    }
                    else if(datos['prov[]'][u] === 'producto'){//PRODUCTO
                        if(c_ext === 0){
                            query_producto = "SELECT material.*, coalesce(disp.disponible,0) as disp, producto.*, subaleacion.* FROM material left join producto on producto.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producto.idaleacion " +
                                " LEFT JOIN (SELECT * FROM (SELECT pedido.idmaterial,material.stock - sum(pedido.cantidad - pedido.despachados) as disponible, material.stock, sum(pedido.cantidad - pedido.despachados) as xdespachar from pedido left join material on material.idmaterial = pedido.idmaterial group by pedido.idmaterial) as ped_xdesp where ped_xdesp.disponible > 0) as disp on disp.idmaterial = material.idmaterial ";
                            query_producto += " WHERE material.idmaterial = "+datos['idm[]'][u];
                        }
                        else{    
                            query_producto += " OR material.idmaterial = "+datos['idm[]'][u];
                        }
                        c_ext++;

                    }
                    else{//OTRO
                        if(c_otr === 0){
                            query_otro = "SELECT material.*, coalesce(disp.disponible,0) as disp, otro.* FROM material left join otro on otro.idmaterial=material.idmaterial " +
                                " LEFT JOIN (SELECT * FROM (SELECT pedido.idmaterial,material.stock - sum(pedido.cantidad - pedido.despachados) as disponible, material.stock, sum(pedido.cantidad - pedido.despachados) as xdespachar from pedido left join material on material.idmaterial = pedido.idmaterial group by pedido.idmaterial) as ped_xdesp where ped_xdesp.disponible > 0) as disp on disp.idmaterial = material.idmaterial ";
                            query_otro += " WHERE material.idmaterial = "+datos['idm[]'][u];
                        }
                        else{
                            query_otro += " OR material.idmaterial = "+datos['idm[]'][u];
                        }
                        c_otr++;
                    }
                    datos['dets[]'].push('');
                    datos['alea[]'].push('');
                    datos['stock[]'].push('');
                }
                connection.query(query_producto, function(err, productos){
                    if(err)
                        console.log("Error Selecting : %s", err);
                            
                    if(productos){
                                for(var y=0; y < productos.length; y++){
                                    for(var t=0; t < datos['dets[]'].length; t++){
                                        if(datos['idm[]'][t] == productos[y].idmaterial && productos[y].idproducto == datos['idp[]'][t]){
                                            datos['dets[]'][t] = productos[y].detalle;
                                            if(productos[y].subnom == null){
                                                datos['alea[]'][t] = 'sin';
                                            }
                                            else{
                                                datos['alea[]'][t] = productos[y].subnom;
                                            }
                                            datos['stock[]'][t] = productos[y].disp;
                                        }
                                    }
                                }
                            }

                    connection.query(query_producido, function(err, producidos){
                        if(err)
                            console.log("Error Selecting : %s", err);

                        if(producidos){
                            for(var y=0; y < producidos.length; y++){
                                    if(datos['idm[]'] == producidos[y].idmaterial && producidos[y].idproducto == datos['idp[]']){
                                            datos['dets[]'] = producidos[y].detalle;
                                            if(producidos[y].subnom == null){
                                                datos['alea[]'] = 'sin';
                                            }
                                            else{
                                                datos['alea[]'] = producidos[y].subnom;
                                            }
                                            datos['stock[]'] = producidos[y].disp;
                                        }

                                    for(var t=0; t < datos['dets[]'].length; t++){
                                        if(datos['idm[]'][t] == producidos[y].idmaterial && producidos[y].idproducto == datos['idp[]'][t]){
                                            datos['dets[]'][t] = producidos[y].detalle;
                                            if(producidos[y].subnom == null){
                                                datos['alea[]'][t] = 'sin';
                                            }
                                            else{
                                                datos['alea[]'][t] = producidos[y].subnom;
                                            }
                                            datos['stock[]'][t] = producidos[y].disp;
                                        }
                                    }
                            }
                        }

                        connection.query(query_otro, function(err, otros){
                            if(err)
                                console.log("Error Selecting : %s", err);

                            if(otros){
                                for(var y=0; y < otros.length; y++){
                                    if(datos['idm[]'] == otros[y].idmaterial && otros[y].idproducto == datos['idp[]']){
                                        datos['dets[]'] = otros[y].detalle;
                                        if(otros[y].subnom === null || otros[y].subnom === undefined ){
                                            datos['alea[]'] = 'sin';
                                        }
                                        else{
                                            datos['alea[]'] = otros[y].subnom;
                                        }
                                        datos['stock[]'] = otros[y].disp;
                                    }

                                    for(var t=0; t < datos['dets[]'].length; t++){
                                        if(datos['idm[]'][t] == otros[y].idmaterial && otros[y].idproducto == datos['idp[]'][t]){
                                            datos['dets[]'][t] = otros[y].detalle;
                                            if(otros[y].subnom == null || otros[y].subnom === undefined ){
                                                datos['alea[]'][t] = 'sin';
                                            }
                                            else{
                                                datos['alea[]'][t] = otros[y].subnom;
                                            }
                                            datos['stock[]'][t] = otros[y].disp;
                                        }
                                    }
                                }
                            }


                            connection.query("SELECT idcliente,razon,sigla FROM cliente", function(err, cli){
                                if(err)
                                    console.log("Error Selecting : %s", err);


                                res.render('plan/formped_state',{data: datos, cli: cli});

                            });
                        });
                    });
                });
             
            }
            else{
                console.log("Sin productos");
                datos = { cliente: token.split('@')[0], nroordenfabricacion: token.split('@')[1] };
                connection.query("SELECT idcliente,razon,sigla FROM cliente", function(err, cli){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    

                    res.render('plan/formped_state',{data: datos, cli: cli});
                    
                });    
            }
        }); 
    });
});
/*
Desc:
    Ruta que carga el estado de una OF preguardada
Variables influyentes:
    req.body = {}
Usages:
    plan/lanzar_of.ejs en funcion loadState()
 */
router.get('/loadStateOFBD', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s",err);
        connection.query("select save.* from save inner join (SELECT max(idsave) as ids, max(ult_save) as last_save FROM save where llave = 'of' group by save.llave) as ult on ult.ids = save.idsave", function(err,estado){
            if(err)
                console.log("Error Selecting : %s", err);
            var token = estado[0].token;
            var datos;
            if(token.split('@').length > 1){
                console.log("Con productos");
                token = token.split('@');
                datos = {  
                    nroordenfabricacion: token[0], 
                    'idm[]': [],
                    'idp[]': [],
                    'cants[]': [],
                    'fechas[]': []
                };
                for(var r=1; r < token.length; r++){
                    datos['idm[]'].push(token[r].split(',')[0]);
                    datos['idp[]'].push(token[r].split(',')[1]);
                    datos['cants[]'].push(token[r].split(',')[2]);
                    datos['fechas[]'].push(token[r].split(',')[3]);
                }
                datos['dets[]'] = [];
                var c_int = 0;

                var query_producido = '';
                var query_producto = '';
                
                for(var u=0; u<datos['idm[]'].length; u++){
                    if(c_int == 0){
                        query_producido = "SELECT * FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion";
                        query_producido += " WHERE material.idmaterial = "+datos['idm[]'][u];
                    }
                    else{    
                        query_producido += " OR material.idmaterial = "+datos['idm[]'][u];
                    }
                    c_int++;
                    datos['dets[]'].push('');
                }
                connection.query(query_producido, function(err, producidos){
                    if(err)
                        console.log("Error Selecting : %s", err);


                    for(var t=0; t < datos['idm[]'].length; t++){
                        for(var r=0; r < producidos.length; r++){
                            if(datos['idm[]'][t] == producidos[r].idmaterial){
                                datos['dets[]'][t] = producidos[r].detalle;
                            }
                        }
                    }
                    res.render('plan/formfab_state',{data: datos});
                        
                });
             
            }
            else{
                console.log("Sin productos");
                datos = { 'idm[]': [], 'idp[]': [], 'fechas[]': [], 'cants[]': [], 'nroordenfabricacion': '1'};
                res.render('plan/formfab_state',{data: datos});
                  
            }
        }); 
    });
});

router.get('/csv_stock', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["Codigo","Detalle","Stock"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT codigo,detalle,stock FROM material",
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
                        writer.pipe(fs.createWriteStream('public/csvs/z_materiales_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            writer.write([rows[i].codigo,rows[i].detalle,rows[i].stock]);
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_materiales_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});

router.get('/csv_of', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["N OC","Nombre","Solicitados","Sin Producir","Faena","Finalizados","Despachados","Fecha de entrega"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT * FROM (select ordenfabricacion.*," +
                " GROUP_CONCAT(REPLACE(material.detalle,',','.'),'@',fabricaciones.cantidad,'@'," +
                " fabricaciones.f_entrega,'@',fabricaciones.restantes,'@',fabs.cantidad,'@',fabricaciones.despachados) as token from ordenfabricacion" +
                " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                " left join material on fabricaciones.idmaterial=material.idmaterial" +
                " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones GROUP BY fabricaciones.idfabricaciones) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones" +
                " GROUP BY ordenfabricacion.idordenfabricacion) AS query WHERE query.token != ''",
                function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    var tokenizer,aux;
                    var f_gen = new Date().toLocaleString();
                    f_gen = f_gen.replace(/\s/g,'');
                    f_gen = f_gen.replace(/\:/g,'');
                    f_gen = f_gen.replace(/\//g,'');
                    f_gen = f_gen.replace(/\,/g,'');
                    if(rows.length){
                        // 'C:/Users/Go Jump/Desktop/'
                        writer.pipe(fs.createWriteStream('public/csvs/z_ofs_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            if(rows[i].token!= null){
                                tokenizer = rows[i].token.split(',');
                            }
                            for(var j = 0;j<tokenizer.length;j++){
                                if(tokenizer[j] != null){
                                    tokenizer[j] = tokenizer[j].split("@");
                                }
                                aux = parseInt(tokenizer[j][1]) - parseInt(tokenizer[j][3]) - parseInt(tokenizer[j][4]);
                                //if(aux < 0){aux=0;}
                                writer.write([rows[i].numordenfabricacion,tokenizer[j][0],tokenizer[j][1],tokenizer[j][3],aux,tokenizer[j][4],tokenizer[j][5],new Date(tokenizer[j][2]).toLocaleDateString()]);
                            }
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_ofs_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});

router.get('/csv_prod', function(req,res){
    if(verificar(req.session.userData)){
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["Nombre","N°OF","Solicitados","Sin producir","En Faena","Prod terminado","Despachados","Fecha de entrega"]});
        var fs = require('fs');
        req.getConnection(function (err, connection) {

            connection.query("SELECT material.idmaterial,material.detalle, GROUP_CONCAT(alias.numordenfabricacion,'@', alias.cantidad, '@', alias.restantes, '@', alias.f_entrega, '@', alias.pt,'@',alias.despachados)" +
                "  as content FROM (SELECT ordenfabricacion.numordenfabricacion ,fabricaciones.idorden_f, fabricaciones.idfabricaciones,fabricaciones.cantidad," +
                " fabricaciones.restantes,fabricaciones.idmaterial,fabricaciones.f_entrega,fabricaciones.despachados,COALESCE(SUM(produccion.8),0) as pt FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                " LEFT JOIN ordenfabricacion ON ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f GROUP BY fabricaciones.idfabricaciones) alias LEFT JOIN material ON alias.idmaterial=material.idmaterial GROUP BY material.idmaterial",
                function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    var tokenizer,aux, sinp;
                    var f_gen = new Date().toLocaleString();
                    f_gen = f_gen.replace(/\s/g,'');
                    f_gen = f_gen.replace(/\:/g,'');
                    f_gen = f_gen.replace(/\//g,'');
                    f_gen = f_gen.replace(/\,/g,'');
                    if(rows.length){
                        writer.pipe(fs.createWriteStream('public/csvs/z_estadoprods_hasta_' + f_gen + '.csv'));
                        for (var i = 0; i <rows.length; i++) {
                            tokenizer = rows[i].content.split(',');
                            for(var j = 0;j<tokenizer.length;j++){
                                tokenizer[j] = tokenizer[j].split("@");
                                console.log(tokenizer);
                                //cantidad - pt
                                aux = parseInt(tokenizer[j][1]) - parseInt(tokenizer[j][2]) - parseInt(tokenizer[j][4]);

                                writer.write([rows[i].detalle,tokenizer[j][0],tokenizer[j][1],tokenizer[j][2],aux,tokenizer[j][4],tokenizer[j][5],new Date(tokenizer[j][3]).toLocaleDateString()]);
                            }
                        }
                        writer.end();
                    }
                    res.send('/csvs/z_estadoprods_hasta_' + f_gen + '.csv');
                });

            // console.log(query.sql); get raw query

        });
    }
    else res.redirect('/bad_login');
});

router.get("/xlsx_stock", function(req, res, next){
    if(verificar(req.session.userData)){
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('stockmaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');

        // ["Codigo","Detalle","Stock"]
        sheet.columns = [
            { header: 'Código', key: 'id', width: 15 },
            { header: 'Detalle', key: 'name', width: 80 },
            { header: 'Stock', key: 'stock', width: 10},
            { header: 'Stock Inicial', key: 'inicial', width: 15},
            { header: 'Stock Crítico', key: 'critico', width: 15}
        ];
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);
            connection.query("SELECT * FROM material WHERE tipo = 'P'",function(err, rows)
            {

                if (err)
                    console.log("Error Select : %s ",err );
                if(rows.length>0){
                    var nombre = 'csvs/master_stock_prod_' + ident + '.xlsx';
                    sheet.getCell('A1').value = 'Código';
                    sheet.getCell('B1').value = 'Detalle';
                    sheet.getCell('C1').value = 'Stock';
                    sheet.getCell('D1').value = 'Stock Inicial';
                    sheet.getCell('E1').value = 'Stock Crítico';
                    for(var j=0; j<rows.length; j++){
                        auxrow = 2 + j;
                        sheet.getCell('A' + auxrow.toString()).value = rows[j].codigo;
                        sheet.getCell('B' + auxrow.toString()).value = rows[j].detalle;
                        sheet.getCell('C' + auxrow.toString()).value = rows[j].stock;
                        sheet.getCell('D' + auxrow.toString()).value = rows[j].stock_i;
                        sheet.getCell('E' + auxrow.toString()).value = rows[j].stock_c;
                    }
                    workbook.xlsx.writeFile('public/' + nombre)
                        .then(function() {
                            res.send('/csvs/master_stock_prod_'+ ident + '.xlsx');

                        });
                }

            });
        });
    }
    else res.redirect('/bad_login');
});

router.get('/xlsx_of', function(req,res){
    if(verificar(req.session.userData)){
        console.log("¡Profesor Jirafales!, ¿no gusta pasar a tomar una tasita de cafe?");
        var fs = require('fs');
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('ofmaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');
        sheet.columns = [
            { header: 'Código', key: 'code', width: 15 },
            { header: 'OF', key: 'of', width: 15 },
            { header: 'Estado', key: 'state', width: 15 },
            { header: 'OC', key: 'oc', width: 15 },
            { header: 'Item', key: 'item', width: 15 },
            { header: 'Solicitados', key: 'sol', width: 15 },
            { header: 'Despachados', key: 'desp', width: 15 },
            { header: 'Detalle', key: 'details', width: 80 },
            { header: 'Aleacion', key: 'alea', width: 15 },
            { header: 'Peso Unitario', key: 'pesuni', width: 15 },
            { header: 'Peso por Despachar', key: 'pesdesp', width: 15 },
            { header: 'Peso Total', key: 'pestot', width: 15 },
            { header: 'Guías de despacho', key: 'gd', width: 20 },
            { header: 'Días de atraso', key: 'atraso', width: 10},
            { header: 'Sin Producir', key: 'sinproducir', width: 15},
            { header: 'Planta', key: 'planta', width: 15},
            { header: 'Finalizados', key: 'finalizados', width: 15},
            { header: 'Fecha de Entrega', key: 'fecha', width: 15}
        ];

        sheet.getRow(1).font = {
            name: 'Calibri',
            family: 4,
            size: 11,
            underline: false,
            bold: true
        };
        sheet.getRow(2).font = {
            name: 'Calibri',
            family: 4,
            size: 11,
            underline: false,
            bold: true
        };
        sheet.getCell('A1').value = "Referencia";
        sheet.getCell('A1').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'D8E4BC'}
        };
        sheet.getCell('A2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'D8E4BC'}
        };
        sheet.getRow(1).border = {
            right: {style:'thin', color: {argb:'00000000'}},
            left: {style:'thin', color: {argb:'00000000'}},
            top: {style:'thin', color: {argb:'00000000'}},
            bottom: {style:'thin', color: {argb:'00000000'}}
        };
        sheet.getRow(2).border = {
            right: {style:'thin', color: {argb:'00000000'}},
            left: {style:'thin', color: {argb:'00000000'}},
            top: {style:'thin', color: {argb:'00000000'}},
            bottom: {style:'thin', color: {argb:'00000000'}}
        };
        sheet.getCell('A2').value = "Código";
        sheet.mergeCells('B1:I1');
        sheet.getCell('B1').value = "Área de Ventas";
        sheet.getCell('B1').alignment = {horizontal: 'center'};
        sheet.getCell('B1').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('B2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('C2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('D2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('E2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('F2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('G2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('H2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };
        sheet.getCell('I2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FABF8F'}
        };

        sheet.mergeCells('J1:P1');
        sheet.getCell('J1').value = "Área de Procesos";
        sheet.getCell('J1').alignment = {horizontal: 'center'};
        sheet.getCell('J1').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('J2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('K2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('L2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('M2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('N2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('O2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };
        sheet.getCell('P2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'FFFF00'}
        };


        sheet.mergeCells('Q1:V1');
        sheet.getCell('Q1').value = "Gestión y Control de Compañía";
        sheet.getCell('Q1').alignment = {horizontal: 'center'};
        sheet.getCell('Q1').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        sheet.getCell('Q2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        sheet.getCell('R2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        sheet.getCell('S2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        sheet.getCell('T2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        sheet.getCell('U2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        sheet.getCell('V2').fill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{argb:'CCC0DA'}
        };
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);

            console.log("¿No será mucha molestia?");
            connection.query("select material.stock,material.u_medida,material.codigo,COALESCE(cliente.razon,'SIDERVAL S.A') AS cliente,fabricaciones.idorden_f,fabricaciones.restantes,coalesce(prod_query.pt,0) as pt,coalesce(odc.numoc, 'SIDERVAL') as numoc,"
                +"material.detalle,subaleacion.subnom as aleacion, coalesce(pedido.despachados,"
                +"concat(fabricaciones.cantidad-fabricaciones.restantes, ' sin producción')) as despachados,coalesce(pedido.despachados,fabricaciones.cantidad-fabricaciones.restantes) as desp2,"
                +"coalesce(pedido.cantidad, fabricaciones.cantidad) as solicitados, coalesce(material.peso,0) as peso_u,"
                +"coalesce(material.peso*pedido.cantidad,0) as peso_t, coalesce(material.peso*(pedido.cantidad - pedido.despachados),0)"
                +"as peso_d, coalesce(pedido.f_entrega, fabricaciones.f_entrega) as f_entrega,coalesce(group_concat(despachos.idgd),"
                +"'Sin GD') as gd from fabricaciones left join material on material.idmaterial=fabricaciones.idmaterial left join pedido on"
                +" pedido.idpedido=fabricaciones.idpedido left join producido on producido.idmaterial=material.idmaterial left join subaleacion"
                +" on subaleacion.idsubaleacion=producido.idsubaleacion left join odc on odc.idodc=pedido.idodc LEFT JOIN cliente ON cliente.idcliente = odc.idcliente left join despachos on despachos.idpedido=pedido.idpedido"
                +" left join (select produccion.idfabricaciones ,sum(produccion.`8`) as pt  from produccion group by produccion.idfabricaciones) as prod_query on prod_query.idfabricaciones=fabricaciones.idfabricaciones group by pedido.idpedido order by fabricaciones.idfabricaciones",
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    console.log("Por supuesto que no pase usted");
                    //console.log(rows);
                    if(rows.length>0){
                        var nombre = 'csvs/master_of_' + ident + '.xlsx';
                        sheet.getCell('B2').value = 'Estado';
                        sheet.getCell('C2').value = 'OF';
                        sheet.getCell('D2').value = 'OC';
                        sheet.getCell('E2').value = 'Cliente';
                        sheet.getCell('F2').value = 'Item';
                        sheet.getCell('G2').value = 'Detalle';
                        sheet.getCell('H2').value = 'Solicitados';
                        sheet.getCell('I2').value = 'Unidad';
                        sheet.getCell('J2').value = 'Aleación';
                        sheet.getCell('K2').value = 'Peso Unitario';
                        sheet.getCell('L2').value = 'Peso Total';
                        sheet.getCell('M2').value = 'Fundidos';
                        sheet.getCell('N2').value = 'En Producción';
                        sheet.getCell('O2').value = 'A Programar';
                        sheet.getCell('P2').value = 'Bodega Stock';
                        sheet.getCell('Q2').value = 'Despachados';
                        sheet.getCell('R2').value = 'Por Despachar';
                        sheet.getCell('S2').value = 'Peso por Despachar';
                        sheet.getCell('T2').value = 'Guía Despachos Asociadas';
                        sheet.getCell('U2').value = 'Fecha de Entrega';
                        sheet.getCell('V2').value = 'Fecha de Entrega por Guía (último producto por guía)';


                        var numitem = 0;
                        var fechaInicio;
                        var fechaFin;
                        var diff = 0;
                        for(var j=0; j<rows.length; j++){
                            numitem++;
                            auxrow = 3 + j;
                            sheet.getCell('A' + auxrow.toString()).value = rows[j].codigo;
                            fechaEntrega = (new Date(rows[j].f_entrega).getTime())/(1000*60*60*24);
                            Hoy    = (new Date().getTime())/(1000*60*60*24);
                            diff = parseInt(Hoy - fechaEntrega);
                            if(rows[j].solicitados == rows[j].despachados){
                                diff = 0;
                                sheet.getCell('B' + auxrow.toString()).value = "Finalizado";
                            }
                            else if(diff > 0){
                                sheet.getCell('B' + auxrow.toString()).value = "Atrasado";
                            }
                            else{
                                sheet.getCell('B' + auxrow.toString()).value = "Por Entregar";
                            }
                            sheet.getCell('C' + auxrow.toString()).value = rows[j].idorden_f;
                            sheet.getCell('D' + auxrow.toString()).value = rows[j].numoc;
                            sheet.getCell('E' + auxrow.toString()).value = rows[j].cliente;
                            sheet.getCell('F' + auxrow.toString()).value = numitem;
                            sheet.getCell('G' + auxrow.toString()).value = rows[j].detalle;
                            sheet.getCell('H' + auxrow.toString()).value = rows[j].solicitados;
                            sheet.getCell('I' + auxrow.toString()).value = rows[j].u_medida;
                            sheet.getCell('J' + auxrow.toString()).value = rows[j].aleacion;
                            sheet.getCell('K' + auxrow.toString()).value = rows[j].peso_u;
                            sheet.getCell('L' + auxrow.toString()).value = rows[j].peso_t;
                            sheet.getCell('M' + auxrow.toString()).value = "Fundidos";
                            sheet.getCell('N' + auxrow.toString()).value = "En produccion";
                            sheet.getCell('O' + auxrow.toString()).value = "A programar";
                            sheet.getCell('P' + auxrow.toString()).value = rows[j].stock;
                            sheet.getCell('Q' + auxrow.toString()).value = rows[j].despachados;
                            sheet.getCell('R' + auxrow.toString()).value = rows[j].solicitados-rows[j].desp2;
                            sheet.getCell('S' + auxrow.toString()).value = (rows[j].solicitados-rows[j].desp2)*rows[j].peso_u;
                            sheet.getCell('T' + auxrow.toString()).value = "GDD";
                            sheet.getCell('U' + auxrow.toString()).value = new Date(rows[j].f_entrega);
                            sheet.getCell('V' + auxrow.toString()).value = " ";

                            if(rows[j+1]){
                                if(rows[j+1].idorden_f != rows[j].idorden_f ){
                                    numitem = 0;
                                }
                            }
                        }

                        console.log("Despues de usted");
                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
                                console.log("Aaww");
                                res.send('/csvs/master_of_'+ ident + '.xlsx');

                            });
                    }

                });
        });
    }
    else res.redirect('/bad_login');
});


router.get('/xlsx_desp', function(req,res){
    if(verificar(req.session.userData)){
        var fs = require('fs');
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('despmaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');
        //var writer = csvWriter({ headers: ["N Gdd","N OC","Nombre","Cantidad","Fecha de Despacho"]});

        sheet.columns = [
            { header: 'N° GD', key: 'gdd', width: 15 },
            { header: 'N° OC', key: 'oc', width: 15 },
            { header: 'Nombre', key: 'name', width: 15 },
            { header: 'Cantidad', key: 'cantidad', width: 15 },
            { header: 'Fecha de Despacho', key: 'fechadesp', width: 15 }
        ];
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);
            connection.query("select " +
                "gd.idgd, coalesce(fabricaciones.idorden_f,'Sin OF') as idorden_f, " +
                "coalesce(odc.numoc, 'Sin OC') as numoc, material.detalle, despachos.cantidad, " +
                "gd.fecha, gd.estado, coalesce(cliente.sigla,'No Definido') as sigla " +
                "from despachos " +
                "left join gd on gd.idgd = despachos.idgd " +
                "left join material on material.idmaterial = despachos.idmaterial " +
                "left join pedido on pedido.idpedido = despachos.idpedido " +
                "left join odc on odc.idodc = pedido.idodc " +
                "left join fabricaciones on fabricaciones.idpedido = pedido.idpedido " +
                "left join cliente on gd.idcliente = cliente.idcliente",
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    var tokenizer2,tokenizer,aux=2;
                    var f_gen = new Date().toLocaleString();
                    f_gen = f_gen.replace(/\s/g,'');
                    f_gen = f_gen.replace(/\:/g,'');
                    f_gen = f_gen.replace(/\//g,'');
                    f_gen = f_gen.replace(/\,/g,'');
                    if(rows.length>0){
                        var nombre = 'csvs/z_despachos_hasta_' + f_gen + '.xlsx';
                        sheet.getCell('A1').value = 'N° GD';
                        sheet.getCell('B1').value = 'N° OC';
                        sheet.getCell('C1').value = 'N° OF';
                        sheet.getCell('D1').value = 'Nombre';
                        sheet.getCell('E1').value = 'Cantidad';
                        sheet.getCell('F1').value = 'Fecha de Despacho';
                        sheet.getCell('G1').value = 'Estado';
                        sheet.getCell('H1').value = 'Cliente';
                        for (var i = 0; i < rows.length; i++) {
                            sheet.getCell('A' + (i+2).toString()).value = rows[i].idgd;
                            sheet.getCell('B' + (i+2).toString()).value = rows[i].numoc;
                            sheet.getCell('C' + (i+2).toString()).value = rows[i].idorden_f;
                            sheet.getCell('D' + (i+2).toString()).value = rows[i].detalle;
                            sheet.getCell('E' + (i+2).toString()).value = rows[i].cantidad;
                            sheet.getCell('F' + (i+2).toString()).value = new Date(rows[i].fecha);
                            sheet.getCell('G' + (i+2).toString()).value = rows[i].estado;
                            sheet.getCell('H' + (i+2).toString()).value = rows[i].sigla;
                        }
                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
                                res.send('/csvs/z_despachos_hasta_' + f_gen + '.xlsx');

                            });
                    }

                });
        });
    }
    else res.redirect('/bad_login');
});


router.post('/editar_oc_save', function(req,res){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        if(typeof input['idpedido[]'] === 'string'){
            input['idmaterial[]'] = [input['idmaterial[]']];
            input['idpedido[]'] = [input['idpedido[]']];
            input['cantidad_a[]'] = [input['cantidad_a[]']];
            input['cantidad[]'] = [input['cantidad[]']];
            input['precio[]'] = [input['precio[]']];
            input['precio_a[]'] = [input['precio_a[]']];
        }
        var idodc = input['idodc[]'];
        console.log(input);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection : %s", err);}
            //STOCK DISPONIBLE = STOCK BODEGA + STOCK PRODUCCION  - POR DESPACHAR
            //SE OBTIENE EL STOCK DISPONIBLE PARA SABER QUE CANTIDAD SE NECESITA FABRICAR (CARGAR A fabricaciones)
            connection.query("select " +
                "material.idmaterial, " +
                "material.stock + coalesce(queryProd.enproduccion,0) - coalesce(queryPed.xdespachar,0) as disponible" +
                " from material " +
                "left join (select pedido.idmaterial, sum(pedido.cantidad - pedido.despachados) AS xdespachar " +
                "from pedido where pedido.cantidad > pedido.despachados group by pedido.idmaterial) as queryPed ON " +
                "queryPed.idmaterial = material.idmaterial " +
                "left join (select fabricaciones.idmaterial, sum(produccion.1 + produccion.2 + produccion.3 + produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e) as enproduccion from produccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones where produccion.1 + produccion.2 + produccion.3 + produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e > 0 group by fabricaciones.idmaterial) as queryProd ON queryProd.idmaterial = material.idmaterial " +
                "WHERE material.idmaterial in ("+input['idmaterial[]'].join(',')+")", function(err, disp){
                if(err){console.log("Error Selecting : %s", err);}

                var queryFabCant;
                var queryFabRest;
                var queryPedCant;
                var queryPedCost;
                var rev = [];
                for(var w=0; w < input['idpedido[]'].length; w++){
                    if(w===0){
                        queryPedCant = "UPDATE pedido SET cantidad = CASE";
                        queryFabCant = "UPDATE fabricaciones SET cantidad = CASE";
                        queryPedCost = "UPDATE pedido SET precio = CASE";
                        queryFabRest = "UPDATE fabricaciones SET restantes = CASE";
                    }
                    queryPedCant += " WHEN idpedido = "+input['idpedido[]'][w]+" THEN "+input['cantidad[]'][w];
                    queryFabCant += " WHEN idpedido = "+input['idpedido[]'][w]+" THEN "+input['cantidad[]'][w];
                    queryPedCost += " WHEN idpedido = "+input['idpedido[]'][w]+" THEN "+input['precio[]'][w];

                    if(parseFloat(input['precio[]'][w]) !== parseFloat(input['precio_a[]'][w])){
                        rev.push([input['idpedido[]'][w], parseFloat(input['precio[]'][w]) - parseFloat(input['precio_a[]'][w]), 'cost']);
                    }
                    if(parseInt(input['cantidad[]'][w]) !== parseInt(input['cantidad_a[]'][w]) ){
                        rev.push([input['idpedido[]'][w], parseInt(input['cantidad[]'][w]) - parseInt(input['cantidad_a[]'][w]), 'cant']);
                    }

                    if(parseInt(input['cantidad[]'][w]) < parseInt(input['cantidad_a[]'][w]) ){
                        queryFabRest += " WHEN idpedido = "+input['idpedido[]'][w]+" THEN restantes - "+( parseInt(input['cantidad_a[]'][w]) - parseInt(input['cantidad[]'][w]) );
                    }
                    else{
                        for(var q=0; q < disp.length; q++){
                            if(disp[q].idmaterial == input['idmaterial[]'][w]){
                                if(parseInt(disp[q].disponible) >= (parseInt(input['cantidad[]'][w]) - parseInt(input['cantidad_a[]'][w])) || disp[q].disponible < 0 ){
                                    queryFabRest += " WHEN idpedido = "+input['idpedido[]'][w]+" THEN restantes + 0";
                                }else{
                                    queryFabRest += " WHEN idpedido = "+input['idpedido[]'][w]+" THEN restantes + "+(parseInt(input['cantidad[]'][w]) - parseInt(input['cantidad_a[]'][w])-parseInt(disp[q].disponible));
                                }
                            }
                        }
                    }
                    if(w===input['idpedido[]'].length-1){
                        queryPedCant += " ELSE cantidad END WHERE idpedido IN ("+input['idpedido[]'].join(',')+")";
                        queryFabCant += " ELSE cantidad END WHERE idpedido IN ("+input['idpedido[]'].join(',')+")";
                        queryPedCost += " ELSE precio END WHERE idpedido IN ("+input['idpedido[]'].join(',')+")";
                        queryFabRest += " ELSE restantes END WHERE idpedido IN ("+input['idpedido[]'].join(',')+")";
                    }
                }
                //SE ACTUALIZAN LOS PEDIDO - cantidad
                connection.query(queryPedCant, function(err, data){
                    if(err){console.log("Error Selecting : %s", err);}
                    //SE ACTUALIZAN LOS PEDIDO - costo
                    connection.query(queryPedCost, function(err, data){
                        if(err){console.log("Error Selecting : %s", err);}
                        //SE ACTUALIZAN LAS FABRICACIONES - cantidad
                        connection.query(queryFabCant, function(err, data){
                            if(err){console.log("Error Selecting : %s", err);}
                            //SE ACTUALIZAN LAS FABRICACIONES - restantes
                            connection.query(queryFabRest, function(err, data){
                                if(err){console.log("Error Selecting : %s", err);}
                                connection.query("SELECT coalesce(MAX(idmodificacion),0) AS id FROM modificacion_oc", function(err, lastMod){
                                    if(err){console.log("Error Selecting : %s", err);}
                                    var l = parseInt(lastMod[0].id) + 1;
                                    for(var w=0; w < rev.length; w++ ){
                                        rev[w][3] = l;
                                    }
                                    connection.query("INSERT INTO modificacion_oc(idpedido, ajuste, param, idmodificacion) VALUES ?",[rev],function(err, newModi){
                                        if(err){console.log("Error Selecting : %s", err);}

                                        console.log("IDODC : "+idodc);
                                        res.redirect('/plan/page_oc/'+idodc);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
    else res.redirect('/bad_login');
});




router.post('/editar_of_save', function(req,res){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        if(typeof input['idfabricaciones[]'] === 'string'){
            input['cantidad[]'] = [input['cantidad[]']];
            input['cantidad_a[]'] = [input['cantidad_a[]']];
            input['idfabricaciones[]'] = [input['idfabricaciones[]']];
        }
        var idof = input['idof[]'];
        console.log(input);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection : %s", err);}
            //STOCK DISPONIBLE = STOCK BODEGA + STOCK PRODUCCION  - POR DESPACHAR
            //SE OBTIENE EL STOCK DISPONIBLE PARA SABER QUE CANTIDAD SE NECESITA FABRICAR (CARGAR A fabricaciones)
            connection.query("select " +
                "material.idmaterial, " +
                "material.stock + coalesce(queryProd.enproduccion,0) - coalesce(queryPed.xdespachar,0) as disponible" +
                " from material " +
                "left join (select pedido.idmaterial, sum(pedido.cantidad - pedido.despachados) AS xdespachar " +
                "from pedido where pedido.cantidad > pedido.despachados group by pedido.idmaterial) as queryPed ON " +
                "queryPed.idmaterial = material.idmaterial " +
                "left join (select fabricaciones.idmaterial, sum(produccion.1 + produccion.2 + produccion.3 + produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e) as enproduccion from produccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones where produccion.1 + produccion.2 + produccion.3 + produccion.4 + produccion.5 + produccion.6 + produccion.7 + produccion.e > 0 group by fabricaciones.idmaterial) as queryProd ON queryProd.idmaterial = material.idmaterial ",
                function(err, disp){
                if(err){console.log("Error Selecting : %s", err);}

                var queryFabCant;
                var queryFabRest;
                var rev = [];
                for(var w=0; w < input['idfabricaciones[]'].length; w++){
                    if(w===0){
                        queryFabCant = "UPDATE fabricaciones SET cantidad = CASE";
                        queryFabRest = "UPDATE fabricaciones SET restantes = CASE";
                    }
                    queryFabCant += " WHEN idfabricaciones = "+input['idfabricaciones[]'][w]+" THEN "+input['cantidad[]'][w];
                    queryFabRest += " WHEN idfabricaciones = "+input['idfabricaciones[]'][w]+" THEN restantes - "+( parseInt(input['cantidad_a[]'][w]) - parseInt(input['cantidad[]'][w]) );


                    if(w===input['idfabricaciones[]'].length-1){
                        queryFabCant += " ELSE cantidad END WHERE idfabricaciones IN ("+input['idfabricaciones[]'].join(',')+")";
                        queryFabRest += " ELSE restantes END WHERE idfabricaciones IN ("+input['idfabricaciones[]'].join(',')+")";
                    }
                }
                //SE ACTUALIZAN LAS FABRICACIONES - cantidad
                connection.query(queryFabCant, function(err, data){
                    if(err){console.log("Error Selecting : %s", err);}
                    //SE ACTUALIZAN LAS FABRICACIONES - restantes
                    connection.query(queryFabRest, function(err, data){
                        if(err){console.log("Error Selecting : %s", err);}

                        console.log("IDOF : "+idof);
                        res.redirect('/plan/page_of/'+idof);
                    });
                });
            });
        });
    }
    else res.redirect('/bad_login');
});


/*
Desc:
    Ruta que renderiza plan/informes_fragment
Variables influyentes:
    req.body = {}
Usages:
    -  none
 */
router.get('/crear_reservacion', function(req, res){
    if(verificar(req.session.userData)) {
        req.getConnection(function (err, connection) {
            if (err) {
                console.log("Error Connecting : %s", err);
            }
            connection.query("SELECT " +
                "pedido.idpedido, " +
                "cliente.sigla, " +
                "pedido.idodc,odc.numoc,material.stock," +
                "fabricaciones.idfabricaciones, coalesce(queryDisp.nodisponible, 0) as nodisponible, " +
                "fabricaciones.idorden_f AS idof, " +
                "COALESCE(abastecimiento.recibidos,0) as xabastecer, " +
                "pedido.cantidad , " +
                "material.detalle, COALESCE(queryReservados.reservados,0) AS reservados," +
                "COALESCE(queryAbastecidos.abastecidos, 0) AS abastecidos, abastecimiento.idoda IS NOT NULL AS exOda, COALESCE(abastecimiento.idoda, 'Sin ODA' ) AS idoda " +
                "FROM pedido " +
                "LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido " +
                "LEFT JOIN abastecimiento ON abastecimiento.idfabricacion = fabricaciones.idfabricaciones " +
                "LEFT JOIN material ON material.idmaterial = pedido.idmaterial " +
                "LEFT JOIN odc ON odc.idodc = pedido.idodc " +
                "LEFT JOIN cliente ON cliente.idcliente = odc.idcliente " +
                "LEFT JOIN (select fabricaciones.idmaterial, coalesce(coalesce(reservacion_detalle.sin_prep,0) + coalesce(reservacion_detalle.prep,0), 0) AS nodisponible from reservacion_detalle left join fabricaciones on fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones) AS queryDisp ON queryDisp.idmaterial = fabricaciones.idmaterial " +
                "LEFT JOIN (" +
                "SELECT abastecimiento.idfabricacion, sum(abastecimiento.cantidad) AS abastecidos FROM " +
                "abastecimiento " +
                "WHERE abastecimiento.idfabricacion IS NOT null GROUP BY abastecimiento.idfabricacion" +
                ") AS queryAbastecidos ON queryAbastecidos.idfabricacion = fabricaciones.idfabricaciones " +
                "LEFT JOIN (SELECT " +
                "reservacion_detalle.idfabricaciones, " +
                "SUM(COALESCE(reservacion_detalle.cantidad,0) ) AS reservados FROM reservacion_detalle " +
                "GROUP BY reservacion_detalle.idfabricaciones) AS queryReservados ON queryReservados.idfabricaciones = fabricaciones.idfabricaciones " +
                "WHERE pedido.bmi = true AND COALESCE(queryReservados.reservados,0) < pedido.cantidad", //PARA SABER QUE CANTIDAD YA SE HA RESERVADO SE DEBE COMPARAR CON LOS REGISTRO DE reservados EN BD
                function (err, ped) {
                if (err) {
                    console.log("Error Selecting : %s", err);
                }

                //console.log(abast);

                res.render('plan/crear_reservacion', {data: ped, sel: [], redirect: false});
            });
        });
    }
    else{res.redirect('bad_login');}
});


/*
Desc:
    Ruta que renderiza plan/informes_fragment
Variables influyentes:
    req.body = {}
Usages:
    -  none
 */
router.post('/save_reservacion', function(req, res){
    if(verificar(req.session.userData)) {
        var data = JSON.parse(JSON.parse(JSON.stringify(req.body)).data);
        console.log('/SAVE_RESERVACION');
        console.log(data);
        var idreserv = JSON.parse(JSON.stringify(req.body)).idreserv;
        var idRev;
        req.getConnection(function (err, connection) {
            if (err) {console.log("Error Connecting : %s", err);}
            connection.query("INSERT INTO reservacion () VALUES ()",
                function (err, rows) {
                    if (err) {console.log("Error Inserting : %s", err);}

                    if(rows){
                        for(var t=0; t < data.length; t++){
                            data[t].push(rows.insertId);
                            data[t].push(data[t][1]);
                        }
                    }
                    console.log(data);
                    connection.query("INSERT INTO reservacion_detalle (idfabricaciones, cantidad, idreservacion, sin_prep) VALUES ?", [data], function(err, inReserv){
                        if(err){console.log("Error Inserting : %s", err);}
                        var notif_tokens_bmi = [];
                        for(var u=0; u < data.length; u++){
                            notif_tokens_bmi.push(["bmiOca@"+( u + parseInt(inReserv.insertId) )+"@"+ new Date().toLocaleString()]);
                        }
                        //SE REGISTRA NOTIFICACIÓN A Bodega Materias Primas PARA QUE PREPARE LA RESERVACIÓN.
                        connection.query("INSERT INTO notificacion (descripcion) VALUES ?", [notif_tokens_bmi], function(err, inNotif){
                            if(err){console.log("Error Inserting : %s", err);}

                            console.log("NOTIFICACIONES A BMI");
                            console.log(inNotif);
                            console.log(notif_tokens_bmi);
                            res.redirect('/plan/crear_reservacion');

                        });
                    });
                });
        });
    }
    else{res.redirect('bad_login');}
});



router.get('/notif_plan', function(req, res, next){
    req.getConnection(function(err,connection){
        if(err){
            console.log("Error Connection : %s", err);
        }
        connection.query("SELECT notificacion.*,odc.numoc,odc.idodc,material.detalle, pedido.numitem,pedido.idpedido FROM notificacion " +
            "LEFT JOIN abastecimiento ON abastecimiento.idabast = substring_index(substring_index(descripcion, '@', 2),'@',-1) " +
            "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = abastecimiento.idfabricacion " +
            "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido " +
            "LEFT JOIN odc ON odc.idodc = pedido.idodc " +
            "LEFT JOIN material ON material.idmaterial = abastecimiento.idmaterial " +
            "WHERE (descripcion LIKE 'bmiReserv@%' AND active = true)",
            function(err, notif){
                if(err){
                    console.log("Error Selecting : %s", err);
                }
                console.log(notif);

                res.render('plan/notificaciones', {notif: notif});

        });
    });
});


router.get('/get_reserv_info/:idodc/:idped', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        connection.query("select " +
            "material.detalle, pedido.cantidad, material.stock, pedido.idpedido, coalesce(odc.numoc, 'Desconocido') as numoc " +
            "from pedido " +
            "LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido " +
            "LEFT JOIN odc on odc.idodc = pedido.idodc " +
            "LEFT JOIN material on material.idmaterial = pedido.idmaterial " +
            "LEFT JOIN (SELECT " +
            "reservacion_detalle.idfabricaciones, " +
            "SUM(COALESCE(reservacion_detalle.cantidad,0) ) AS reservados FROM reservacion_detalle " +
            "GROUP BY reservacion_detalle.idfabricaciones) AS queryReservados ON queryReservados.idfabricaciones = fabricaciones.idfabricaciones " +
            "WHERE odc.idodc = ? AND pedido.bmi = true AND COALESCE(queryReservados.reservados,0) < pedido.cantidad", [req.params.idodc], function (err, reserv) {

            if (err) console.log("Error Selecting : %s", err);

            var numoc;
            if(reserv.length > 0){
                numoc = reserv[0].numoc;
            }else{
                numoc = "Desconocido";
            }
            res.render('plan/modal_notif_reserv', {data: reserv, numoc: numoc});
        });
    });
});



router.post('/crear_reservacion_post', function(req, res){
    if(verificar(req.session.userData)) {
        var input = JSON.parse(JSON.parse(JSON.stringify(req.body)).idped);
        console.log(input);
        req.getConnection(function (err, connection) {
            if (err) {
                console.log("Error Connecting : %s", err);
            }
        connection.query("SELECT " +
            "pedido.idpedido, " +
            "cliente.sigla, " +
            "pedido.idodc,odc.numoc,material.stock," +
            "fabricaciones.idfabricaciones, coalesce(queryDisp.nodisponible, 0) as nodisponible, " +
            "fabricaciones.idorden_f AS idof, " +
            "COALESCE(abastecimiento.recibidos,0) as xabastecer, " +
            "pedido.cantidad , " +
            "material.detalle, COALESCE(queryReservados.reservados,0) AS reservados," +
            "COALESCE(queryAbastecidos.abastecidos, 0) AS abastecidos, abastecimiento.idoda IS NOT NULL AS exOda, COALESCE(abastecimiento.idoda, 'Sin ODA' ) AS idoda " +
            "FROM pedido " +
            "LEFT JOIN fabricaciones ON fabricaciones.idpedido = pedido.idpedido " +
            "LEFT JOIN abastecimiento ON abastecimiento.idfabricacion = fabricaciones.idfabricaciones " +
            "LEFT JOIN material ON material.idmaterial = pedido.idmaterial " +
            "LEFT JOIN odc ON odc.idodc = pedido.idodc " +
            "LEFT JOIN cliente ON cliente.idcliente = odc.idcliente " +
            "LEFT JOIN (select fabricaciones.idmaterial, coalesce(coalesce(reservacion_detalle.sin_prep,0) + coalesce(reservacion_detalle.prep,0), 0) AS nodisponible from reservacion_detalle left join fabricaciones on fabricaciones.idfabricaciones = reservacion_detalle.idfabricaciones) AS queryDisp ON queryDisp.idmaterial = fabricaciones.idmaterial " +
            "LEFT JOIN (" +
            "SELECT abastecimiento.idfabricacion, sum(abastecimiento.cantidad) AS abastecidos FROM " +
            "abastecimiento " +
            "WHERE abastecimiento.idfabricacion IS NOT null GROUP BY abastecimiento.idfabricacion" +
            ") AS queryAbastecidos ON queryAbastecidos.idfabricacion = fabricaciones.idfabricaciones " +
            "LEFT JOIN (SELECT " +
            "reservacion_detalle.idfabricaciones, " +
            "SUM(COALESCE(reservacion_detalle.cantidad,0) ) AS reservados FROM reservacion_detalle " +
            "GROUP BY reservacion_detalle.idfabricaciones) AS queryReservados ON queryReservados.idfabricaciones = fabricaciones.idfabricaciones " +
            "WHERE pedido.bmi = true AND COALESCE(queryReservados.reservados,0) < pedido.cantidad", //PARA SABER QUE CANTIDAD YA SE HA RESERVADO SE DEBE COMPARAR CON LOS REGISTRO DE reservados EN BD
            function (err, ped) {
                if (err) {
                    console.log("Error Selecting : %s", err);
                }

                res.render('plan/crear_reservacion', {data: ped, sel: input, redirect: true});
            });
        });
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
                res.redirect('/plan/notif_plan');
            });
    });
});


router.get('/render_alert_notificacion/:idnotif', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);

        connection.query("SELECT notificacion.*,odc.numoc,odc.idodc,material.detalle, pedido.numitem,pedido.idpedido FROM notificacion " +
            "LEFT JOIN abastecimiento ON abastecimiento.idabast = substring_index(substring_index(descripcion, '@', 2),'@',-1) " +
            "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = abastecimiento.idfabricacion " +
            "LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido " +
            "LEFT JOIN odc ON odc.idodc = pedido.idodc " +
            "LEFT JOIN material ON material.idmaterial = abastecimiento.idmaterial " +
            "WHERE (descripcion LIKE 'bmiReserv@%' AND active = true AND notificacion.idnotificacion = ?)", [req.params.idnotif],
            function(err, notif){
                if(err){
                    console.log("Error Selecting : %s", err);
                }
                console.log(notif);

                res.render('plan/alert_notif_plan', {notif: notif});


            });
    });
});

module.exports = router;


