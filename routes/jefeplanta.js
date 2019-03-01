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


router.post('/table_planta', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var array_fill = [
            "fabricaciones.idorden_f",
            "pedido.numitem",
            "material.detalle"
        ];
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
                condiciones_where.push(array_fill[parseInt(clave[e].split('@')[0])]+" LIKE '%"+clave[e].split('@')[1]+"%'");
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
                "odc.numoc, pedido.numitem,pedido.despachados, fabricaciones.idorden_f as idordenfabricacion, material.detalle, pedido.cantidad as solicitados, " +
                "coalesce(pedido.cantidad - pedido.despachados,0) as xdespachar, pedido.f_entrega, " +
                "pedido.externo, coalesce(queryPlanta.enproduccion, 0) as enproduccion, coalesce(queryPlanta.finalizados,0) as finalizados, " +
                "material.stock, material.peso, coalesce(material.peso*(pedido.cantidad - pedido.despachados), 0) as pesoxdespachar " +
                "from pedido " +
                "left join odc on odc.idodc = pedido.idodc " +
                "left join fabricaciones on (fabricaciones.idpedido = pedido.idpedido AND !pedido.externo) " +
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



module.exports = router;
