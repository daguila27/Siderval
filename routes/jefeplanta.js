var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{
        host: '192.168.1.25',
        user: 'admin',
        password : 'tempo123',
        port : 3306,
        database:'siderval',
        insecureAuth : true

    },'pool')
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
    if(usr.nombre === 'jefeprod' || usr.nombre === 'gerencia' || usr.nombre === 'siderval' || usr.nombre === 'jefeplanta' || usr.nombre === 'dt'){
        return true;
    }else{
        return false;
    }
}

/* GET users listing. */
router.get('/', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if (err) throw err;
            connection.query("SET lc_time_names = 'es_CL'", function(err, idm) {
                if (err) throw err;

                res.render('jefeplanta/indx_new', {page_title: "Jefe de Planta", username: req.session.userData.nombre});
            });
        });
    }
    else{res.redirect('bad_login');}
});
/* GET users listing. */
router.get('/stats', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Connection : %s", err);
            var fecha = new Date().getFullYear() + "-" + (new Date().getUTCMonth() + 1) + "-";
            //fecha = '2019-1-';
            connection.query("SELECT DATE_FORMAT(gd.fecha,'%Y-%m') AS fecha,COUNT(*) AS cantidad,EXTRACT( YEAR FROM gd.fecha ) as ano,MONTHNAME(gd.fecha) as mes,gd.idgd AS numgd," +
                "SUM(coalesce(despachos.cantidad,0)*COALESCE(material.peso,0)) AS peso,gd.estado FROM gd" +
                " LEFT JOIN despachos ON despachos.idgd = gd.idgd" +
                " LEFT JOIN cliente ON cliente.idcliente = gd.idcliente" +
                " LEFT JOIN material ON material.idmaterial = despachos.idmaterial"+
                " WHERE material.detalle LIKE '%inserto%' GROUP BY SUBSTRING(gd.fecha, 1, 7)", function(err, etp){
                if(err){console.log("Error Selecting : %s", err);}

                connection.query("select " +
                    "etapafaena.nombre_etapa as etapa, sum(material.peso*produccion_history.enviados) as enviados " +
                    "from produccion_history " +
                    "left join etapafaena on etapafaena.value=produccion_history.to " +
                    "left join produccion on produccion_history.idproduccion=produccion.idproduccion " +
                    "left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones " +
                    "left join material on material.idmaterial=fabricaciones.idmaterial " +
                    "where produccion_history.from = 5 AND produccion_history.fecha BETWEEN ? AND ? " +
                    "group by produccion_history.to",[fecha+"01",fecha + "31"], function(err, tto) {
                    if (err){console.log("Error Selecting : %s", err);}
                    connection.query("select " +
                        "etapafaena.nombre_etapa as etapa, sum(material.peso) as enviados " +
                        "from produccion_history " +
                        "left join etapafaena on etapafaena.value=produccion_history.to " +
                        "left join produccion on produccion_history.idproduccion=produccion.idproduccion " +
                        "left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones " +
                        "left join material on material.idmaterial=fabricaciones.idmaterial " +
                        "where produccion_history.from = 4 AND produccion_history.fecha BETWEEN ? AND ? " +
                        "group by produccion_history.to",[fecha+"01",fecha + "31"], function(err, ter) {
                        if (err){console.log("Error Selecting : %s", err);}

                        console.log(ter);
                        console.log(tto);

                        res.render('jefeplanta/stats', {data: etp, tto: tto, ter: ter});
                    });
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});




router.post('/stats_fusion/:fill/:valetapa', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var fill = req.params.fill;
        var valetapa = req.params.valetapa;
        var array_fill = [
            "coalesce(fabricaciones.idorden_f,'Sin OF')",
            "material.detalle",
            "cliente.sigla"
        ];
        var object_fill = {
            "coalesce(fabricaciones.idorden_f,'Sin OF')-off": [],
            "material.detalle-off": [],
            "cliente.sigla-off": [],
            "coalesce(fabricaciones.idorden_f,'Sin OF')-on": [],
            "material.detalle-on": [],
            "cliente.sigla-on": []
        };
        var condiciones_where = ['produccion_history.from = '+valetapa];
        if(input.cond != '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);
        var where = result[0];
        var limit = result[1];


        var dataget;
        var group;
        var orderby;
        if(fill=='of'){
            dataget = "fabricaciones.idorden_f as token,max(produccion_history.fecha) as last_fusion";
            group = "fabricaciones.idorden_f";
        }
        else if(fill== 'producto'){
            dataget = "material.detalle as token,max(produccion_history.fecha) as last_fusion";
            group = "material.idmaterial";
        }
        else{
            dataget = "cliente.sigla as token,max(produccion_history.fecha) as last_fusion";
            group = "cliente.idcliente";
            condiciones_where.push('cliente.idcliente IS NOT NULL');
        }

        if(input.extraInfo === 'kg'){
            dataget += ",sum(produccion_history.enviados*material.peso) as fundidos ";
            orderby = "sum(produccion_history.enviados*material.peso)";
        }
        else{
            dataget += ",sum(produccion_history.enviados) as fundidos ";
            orderby = "sum(produccion_history.enviados)";
        }


        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Connection : %s", err);
            var fecha = new Date().getFullYear() + "-" + (new Date().getUTCMonth() + 1) + "-";
            //fecha = '2019-1-';
            connection.query("select " +
                dataget +
                " from produccion_history " +
                "left join produccion on produccion.idproduccion = produccion_history.idproduccion " +
                "left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                "left join material on material.idmaterial = fabricaciones.idmaterial " +
                "left join pedido on pedido.idpedido = fabricaciones.idpedido " +
                "left join odc on odc.idodc = pedido.idodc " +
                "left join cliente on cliente.idcliente = odc.idcliente " +
                where + " group by "+group+" order by "+orderby+" desc limit 10", function(err, fund){
                if(err){console.log("Error Selecting : %s", err);}

                res.render('jefeplanta/stats_fusion', {data: fund});
            });
        });
    }
    else{res.redirect('bad_login');}
});


/* GET users listing. */
router.get('/view_planta', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('jefeplanta/view_planta');
    }
    else{res.redirect('bad_login');}
});
router.get('/view_despachositem/:tab', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('jefeplanta/view_despachositem', {tab: req.params.tab});
    }
    else{res.redirect('bad_login');}
});

router.get('/view_fusion', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('jefeplanta/view_fusion');
    }
    else{res.redirect('bad_login');}
});



router.post('/table_fusion/:idetapa', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var idetapa = req.params.idetapa;
        var array_fill = [
            "coalesce(fabricaciones.idorden_f,'Sin OF')",
            "material.detalle",
            "cliente.sigla"
        ];
        var object_fill = {
            "coalesce(fabricaciones.idorden_f,'Sin OF')-off": [],
            "material.detalle-off": [],
            "clientes.sigla-off": [],
            "coalesce(fabricaciones.idorden_f,'Sin OF')-on": [],
            "material.detalle-on": [],
            "cliente.sigla-on": []
        };

        var condiciones_where = ["produccion_history.from = '"+idetapa+"' AND produccion_history.to!='s'"];

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
        limit += " ORDER BY produccion_history.fecha DESC " + limit;
        req.getConnection(function(err, connection){
            if(err) throw err;

                var consulta = "select " +
                    "material.detalle, material.peso, " +
                    "produccion_history.*, produccion_history.fecha as mov_fecha,coalesce(odc.numoc, 'Producción para Stock') as numoc, " +
                    "fabricaciones.idorden_f, " +
                    "coalesce(cliente.sigla, 'SIDERVAL') as sigla, cliente.razon " +
                    "from produccion_history " +
                    "left join produccion on produccion.idproduccion = produccion_history.idproduccion " +
                    "left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                    "left join material on material.idmaterial = fabricaciones.idmaterial " +
                    "left join pedido on pedido.idpedido = fabricaciones.idpedido " +
                    "left join odc on odc.idodc = pedido.idodc " +
                    "left join cliente on cliente.idcliente = odc.idcliente "+where + limit;
                connection.query(consulta,
                    function(err, fund){
                        if(err) throw err;

                        res.render('jefeplanta/table_fusion', {data: fund, etapa: idetapa, user: req.session.userData.nombre});

                });
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/actualizar_fecha_produccion_history', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        req.getConnection(function(err, connection){
            if(err) throw err;
            //UPDATE produccion_history SET fecha = '2019-06-94 17:22:24' WHERE (idproduccion_history = ?);
            connection.query("UPDATE produccion_history SET fecha = '"+input.fecha+"' WHERE (idproduccion_history = ?)",
                [input.id],function(err, resp){
                    var send;
                    if(err) {
                        console.log("Error Updating: %s", err);
                    }
                    else{
                        send = 'ok';
                        console.log(resp);
                        res.send(send);
                    }
                });
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/table_planta', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var array_fill = [
            "coalesce(fabricaciones.idorden_f,'Sin OF')",
            "pedido.numitem",
            "material.detalle",
            "cliente.sigla"
        ];
        var object_fill = {
            "coalesce(fabricaciones.idorden_f,'Sin OF')-off": [],
            "pedido.numitem-off": [],
            "material.detalle-off": [],
            "cliente.sigla-off": [],
            "coalesce(fabricaciones.idorden_f,'Sin OF')-on": [],
            "pedido.numitem-on": [],
            "material.detalle-on": [],
            "cliente.sigla-on": []
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
        console.log(result);
        req.getConnection(function(err, connection){
            if(err) throw err;

            var consulta = "select " +
                "odc.numoc, cliente.sigla, cliente.razon,  pedido.numitem,pedido.despachados, coalesce(fabricaciones.idorden_f, 'No OF') as idordenfabricacion, material.detalle, pedido.cantidad as solicitados, " +
                "coalesce(pedido.cantidad - pedido.despachados,0) as xdespachar, pedido.f_entrega, " +
                "concat(dayname(pedido.f_entrega), ' ', day(pedido.f_entrega),' de ',monthname(pedido.f_entrega),' de ',year(pedido.f_entrega)) as esp_fecha_entrega," +
                "coalesce(fundidos.fundidos,0) as fundidos,pedido.externo, coalesce(queryPlanta.enproduccion, 0) as enproduccion, coalesce(queryPlanta.finalizados,0) as finalizados, " +
                "material.stock, material.peso, coalesce(material.peso*(pedido.cantidad - pedido.despachados), 0) as pesoxdespachar " +
                "from pedido " +
                "left join odc on odc.idodc = pedido.idodc " +
                "left join " +
                "(select pedido.idpedido, coalesce(sum(produccion_history.enviados), 0) as fundidos from produccion_history left join produccion on produccion.idproduccion = produccion_history.idproduccion left join fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones left join pedido on pedido.idpedido = fabricaciones.idpedido where produccion_history.from = 2 and pedido.idpedido is not null group by pedido.idpedido) " +
                "as fundidos on fundidos.idpedido= pedido.idpedido " +
                "left join cliente on odc.idcliente = cliente.idcliente " +
                "left join fabricaciones on (fabricaciones.idpedido = pedido.idpedido) " +
                "left join material on material.idmaterial = pedido.idmaterial " +
                "left join " +
                "(select produccion.idfabricaciones, sum(produccion.cantidad - produccion.`8` - produccion.standby - produccion.`1` - produccion.`2`) as enproduccion, produccion.`8` as finalizados from produccion group by produccion.idfabricaciones)" +
                " as queryPlanta on queryPlanta.idfabricaciones = fabricaciones.idfabricaciones "+where +" " + limit;
            connection.query(consulta,
                function(err, of){
                    if(err) throw err;

                    res.render('jefeplanta/table_planta', {data: of});

                });
        });
    }
    else{res.redirect('bad_login');}
});



router.post('/table_despachositem', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log("estamos aqui");
        var array_fill = [
            "gd.idgd",
            "odc.numoc",
            "material.detalle",
            "cliente.sigla"
        ];
        var object_fill = {
            "gd.idgd-off": [],
            "odc.numoc-off": [],
            "material.detalle-off": [],
            "cliente.sigla-off": [],
            "gd.idgd-on": [],
            "odc.numoc-on": [],
            "material.detalle-on": [],
            "cliente.sigla-on": []
        };
        var clave;
        var where;
        var condiciones_where = ['despachos.cantidad > 0'];

        if(input.tab == 'funds'){
            condiciones_where.push('(material.codigo LIKE "P%" AND material.detalle NOT LIKE "%ceramico%")');
        }
        else{
            condiciones_where.push('(material.codigo NOT LIKE "P%" OR material.detalle LIKE "%ceramico%")');
        }
        if(input.rango == undefined || input.rango == null || input.rango == ''){
            condiciones_where.push("gd.fecha > '2019-01-01 00:00:00'");
        }
        else{
            console.log(input.rango);
            condiciones_where.push("gd.fecha BETWEEN '"+input.rango.split('@')[0]+" 00:00:00' AND '"+input.rango.split('@')[1]+" 23:59:59'");
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


        if(condiciones_where.length==0){
            where = "";
        }
        else{
            where = " WHERE "+ condiciones_where.join(" AND ");
        }

        console.log("WHERE");
        console.log(where);

        req.getConnection(function(err, connection){
            if(err) throw err;

            var consulta = "SELECT " +
                "gd.idgd, coalesce(odc.numoc, ' - ') as numoc, coalesce(pedido.numitem, ' - ') as numitem, " +
                "concat(dayname(gd.fecha), ' ', day(gd.fecha),' de ',monthname(gd.fecha),' de ',year(gd.fecha)) as esp_fecha_gd," +
                "material.detalle, material.peso, despachos.cantidad, cliente.sigla, cliente.razon, gd.fecha " +
                "FROM despachos " +
                "left join gd on gd.idgd = despachos.idgd " +
                "left join cliente on cliente.idcliente = gd.idcliente " +
                "left join material on material.idmaterial = despachos.idmaterial " +
                "left join pedido on pedido.idpedido = despachos.idpedido " +
                "left join odc on odc.idodc = pedido.idodc "+where ;
            connection.query(consulta,
                function(err, desp){
                    if(err) throw err;
                    res.render('jefeplanta/table_despachositem', {data: desp});

                });
        });
    }
    else{res.redirect('bad_login');}
});



module.exports = router;
