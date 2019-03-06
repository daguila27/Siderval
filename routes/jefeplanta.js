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
function verificar(usr){
    if(usr.nombre === 'jefeprod' || usr.nombre === 'gerencia' || usr.nombre === 'siderval' || usr.nombre === 'jefeplanta'){
        return true;
    }else{
        return false;
    }
}

/* GET users listing. */
router.get('/', function(req, res, next){
    if(verificar(req.session.userData)){
        res.render('jefeplanta/indx_new', {page_title: "Jefe de Planta", username: req.session.userData.nombre});
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


router.post('/table_planta', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var array_fill = [
            "coalesce(fabricaciones.idorden_f,'Sin OF')",
            "pedido.numitem",
            "material.detalle"
        ];
        var object_fill = {
            "coalesce(fabricaciones.idorden_f,'Sin OF')-off": [],
            "pedido.numitem-off": [],
            "material.detalle-off": [],
            "coalesce(fabricaciones.idorden_f,'Sin OF')-on": [],
            "pedido.numitem-on": [],
            "material.detalle-on": []
        };
        var clave;
        var where;
        var condiciones_where = ['coalesce(pedido.cantidad - pedido.despachados,0) > 0'];
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
        if(input.pendientes == 'false'){
            condiciones_where.push('(MONTH(pedido.f_entrega) <= MONTH(CURRENT_DATE()) AND YEAR(pedido.f_entrega) <= YEAR(CURRENT_DATE()))');
            //where = " WHERE pedido.externo = '0' AND fabricaciones.restantes>0 ";
        }

        if(condiciones_where.length==0){
            where = "";
        }
        else{
            where = " WHERE "+ condiciones_where.join(" AND ");
        }
        console.log(where);
        req.getConnection(function(err, connection){
            if(err) throw err;

            var consulta = "select " +
                "odc.numoc, cliente.sigla, cliente.razon,  pedido.numitem,pedido.despachados, coalesce(fabricaciones.idorden_f, 'No OF') as idordenfabricacion, material.detalle, pedido.cantidad as solicitados, " +

                "coalesce(pedido.cantidad - pedido.despachados,0) as xdespachar, pedido.f_entrega, " +
                "pedido.externo, coalesce(queryPlanta.enproduccion, 0) as enproduccion, coalesce(queryPlanta.finalizados,0) as finalizados, " +
                "material.stock, material.peso, coalesce(material.peso*(pedido.cantidad - pedido.despachados), 0) as pesoxdespachar " +
                "from pedido " +
                "left join odc on odc.idodc = pedido.idodc " +

                "left join cliente on odc.idcliente = cliente.idcliente " +
                "left join fabricaciones on (fabricaciones.idpedido = pedido.idpedido) " +
                "left join material on material.idmaterial = pedido.idmaterial " +
                "left join " +
                "(select produccion.idfabricaciones, sum(produccion.cantidad - produccion.`8` - produccion.standby) as enproduccion, produccion.`8` as finalizados from produccion group by produccion.idfabricaciones)" +
                " as queryPlanta on queryPlanta.idfabricaciones = fabricaciones.idfabricaciones "+where;
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
            condiciones_where.push("gd.fecha BETWEEN '"+input.rango.split('@')[0]+"' AND '"+input.rango.split('@')[1]+"'");
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
