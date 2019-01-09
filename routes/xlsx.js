//llamamos al paquete mysql que hemos instalado
var mysql = require('mysql');
//creamos la conexion a nuestra base de datos con los datos de acceso de cada uno
var connection = mysql.createConnection({

    host: '192.168.1.25',
    user: 'admin',
    password : 'tempo123',
    port : 3306,
    database:'siderval',
    insecureAuth : true

});

var informe = {};

informe.getdatos = function(fecha,callback){
    if (connection){
        /*
        prods = [{
            fabricados: enviados desde CC a BPT, AS fabrs.fabricados
            despachados: segun guia de despacho SALIENTE, AS desps.despachados
            solicitados: según OC entrantes, AS peds.solicitados
            sol_atr: pedidos anteriores a la fecha sin despachar, AS peds_atrasados.solicitados
            necesarios: Segun teorico de BOM de todas OP, AS necesario.necesarios
            necesario_neto: Teorico del BOM en base a BPT, AS necesario.neto
            sum_dev: movimiento de bodega de DEVOLUCION, AS devs.sum_devs
            sum_sal: movimiento de bodega de SALIDA, AS salidas_mp.sum_sal
            ing_oda: Recepcion de GDD anexa a OCA (ODA) AS ing_oda.sum_ing
            virtuales: Cantidad en produccion, AS virts.virtuales,
            virtuales_oda: Cantidad no reccepcionada de ODA, AS virts_oda.sum_virtual
        },(...)];
        */
        connection.query("select material.codigo,material.stock,material.s_inicial,material.detalle, material.precio,material.u_medida," +
            "COALESCE(fabrs.fabricados,0) as fabricados,material.idmaterial,COALESCE(peds.solicitados,0) as solicitados,coalesce(peds_atrasados.solicitados,0) AS sol_atr" +
            ",COALESCE(desps.despachados,0) AS despachados,COALESCE(virts.virtuales,0) as virtuales,COALESCE(virts_oda.sum_virtual,0) as virtuales_oda" +
            ",COALESCE(necesario.neto,0) AS necesario_neto,COALESCE(necesario.necesarios,0) AS necesarios,COALESCE(salidas_mp.sum_sal,0) as sum_sal" +
            ",coalesce(devs.sum_devs,0) as sum_dev,coalesce(ing_oda.sum_ing,0) as ing_oda FROM material" +
            //Salidas De CC a BPT - as fabrs.fabricados
            " LEFT JOIN (SELECT fabricaciones.idmaterial,sum(produccion_history.enviados) as fabricados FROM produccion_history" +
            " LEFT JOIN produccion on produccion.idproduccion=produccion_history.idproduccion" +
            " LEFT JOIN fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " WHERE produccion_history.to='8' AND (produccion_history.fecha between '" + fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59')" +
            " GROUP BY fabricaciones.idmaterial) AS fabrs ON fabrs.idmaterial = material.idmaterial" +
            // Solicitado Teorico desde Bom -  as necesario.necesarios
            " LEFT JOIN (SELECT bom.idmaterial_slave,SUM(enprod.enprod*bom.cantidad) as necesarios,SUM(enprod.enbpt*bom.cantidad) as neto FROM" +
            " (SELECT fabricaciones.idmaterial, SUM(produccion.cantidad) as enprod,SUM(produccion.`8`) as enbpt FROM produccion" +
            " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " WHERE (produccion.f_gen" +
            " BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59')" +
            " GROUP BY fabricaciones.idmaterial) AS enprod" +
            " LEFT JOIN bom ON bom.idmaterial_master = enprod.idmaterial" +
            " LEFT JOIN material ON bom.idmaterial_slave = material.idmaterial" +
            " WHERE material.e_abast != 4" +
            " GROUP BY bom.idmaterial_slave) AS necesario ON necesario.idmaterial_slave = material.idmaterial" +
            // Salidas de materias primas - as salidas_mp.sum_sal
            " LEFT JOIN (select movimiento_detalle.idmaterial, sum(movimiento_detalle.cantidad) as sum_sal FROM movimiento" +
            " LEFT JOIN movimiento_detalle on movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
            " WHERE movimiento.tipo = 0 AND movimiento.f_gen" +
            " BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59'" +
            " GROUP BY movimiento_detalle.idmaterial) as salidas_mp ON salidas_mp.idmaterial = material.idmaterial" +
            // Entradas a materias primas - as devs.sum_devs
            " LEFT JOIN (SELECT material.idmaterial, SUM(coalesce(movimiento_detalle.cantidad,0)) as sum_devs FROM material" +
            " LEFT JOIN movimiento_detalle ON material.idmaterial = movimiento_detalle.idmaterial" +
            " LEFT JOIN movimiento ON movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
            " WHERE movimiento.tipo = 1 AND movimiento.f_gen BETWEEN '" + fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59'" +
            " GROUP BY material.idmaterial) AS devs ON devs.idmaterial = material.idmaterial" +
            // LEFT JOIN (sum_ing) AS ingresos -- entradas desde recepción de OCA
            " LEFT JOIN (select material.idmaterial, sum(recepcion_detalle.cantidad) as sum_ing FROM recepcion" +
            " LEFT JOIN recepcion_detalle on recepcion_detalle.idrecepcion = recepcion.idrecepcion" +
            " LEFT JOIN abastecimiento ON abastecimiento.idabast = recepcion_detalle.idabast" +
            " LEFT JOIN material ON material.idmaterial = abastecimiento.idmaterial" +
            " WHERE recepcion.fecha BETWEEN '" + fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59'" +
            " GROUP BY material.idmaterial) as ing_oda ON ing_oda.idmaterial = material.idmaterial" +
            //LEFT JOIN pedidos AKA cantidad pedida según OC entrantes
            " LEFT JOIN (SELECT pedido.idmaterial,SUM(pedido.cantidad) as solicitados" +
            " FROM pedido WHERE f_entrega BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59'" +
            " GROUP BY pedido.idmaterial) AS peds ON peds.idmaterial = material.idmaterial" +
            //LEFT JOIN pedidos atrasados AKA cantidad pedida según OC entrantes
            " LEFT JOIN (SELECT pedido.idmaterial,SUM(pedido.cantidad - pedido.despachados) as solicitados" +
            " FROM pedido WHERE f_entrega < '"+fecha[0]+" 00:00:00'" +
            " GROUP BY pedido.idmaterial) AS peds_atrasados ON peds_atrasados.idmaterial = material.idmaterial" +
            // LEFT JOIN despachos AKA cantidad en GDD
            " LEFT JOIN (SELECT material.idmaterial,SUM(despachos.cantidad) AS despachados" +
            " FROM material LEFT JOIN despachos ON material.idmaterial = despachos.idmaterial" +
            " LEFT JOIN gd ON gd.idgd = despachos.idgd WHERE gd.fecha BETWEEN '"+fecha[0]+" 00:00:00' AND '" + fecha[1]+" 23:59:59'" +
            " GROUP BY material.idmaterial) AS desps ON desps.idmaterial = material.idmaterial" +
            // LEFT JOIN produccion AKA cantidad en produccion
            " LEFT JOIN (SELECT fabricaciones.idmaterial,SUM(produccion.cantidad - produccion.`8` - produccion.standby) as virtuales" +
            " FROM produccion" +
            " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " GROUP BY fabricaciones.idmaterial) AS virts ON virts.idmaterial = material.idmaterial" +
            // FROM (sum_virtual) as virtuales -- Abastecimiento no recibidos.
            " LEFT JOIN (select abastecimiento.idmaterial, sum(abastecimiento.cantidad - abastecimiento.recibidos) as sum_virtual FROM oda" +
            " LEFT JOIN abastecimiento ON abastecimiento.idoda = oda.idoda" +
            " WHERE oda.creacion" +
            " BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59'" +
            " GROUP BY abastecimiento.idmaterial) AS virts_oda ON virts_oda.idmaterial = material.idmaterial" +
            " WHERE NOT (peds.solicitados = 0 AND fabrs.fabricados = 0 AND desps.despachados = 0 AND salidas_mp.sum_sal = 0" +
            " AND necesario.necesarios = 0 AND virts.virtuales = 0 AND peds_atrasados.solicitados = 0 AND virts_oda.sum_virtual = 0 AND devs.sum_devs = 0" +
            " AND ing_oda.sum_ing = 0) OR material.s_inicial != 0 OR material.stock != 0 GROUP BY material.idmaterial",function(err, prods){
            if(err){
                throw err;
            } else {
                callback(null,prods);
            }
        });
    }

};

informe.produccion = function(fecha,callback){
    if(connection){
        connection.query("SELECT material.*,prods.*,COALESCE(rech.rechazados,0) AS rechazados,COALESCE(fabrs.fabricados,0) AS fabricados FROM material" +
            //Salidas De CC a BPT - as fabrs.fabricados
            " LEFT JOIN (SELECT fabricaciones.idmaterial,sum(produccion_history.enviados) as fabricados FROM produccion_history" +
            " LEFT JOIN produccion on produccion.idproduccion=produccion_history.idproduccion" +
            " LEFT JOIN fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " WHERE produccion_history.to='8' AND (produccion_history.fecha between '" + fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59')" +
            " GROUP BY fabricaciones.idmaterial) AS fabrs ON fabrs.idmaterial = material.idmaterial" +
            //Rechazos en JefeProd - as rech.rechazados
            " LEFT JOIN (SELECT fabricaciones.idmaterial,sum(produccion_history.enviados) as rechazados FROM produccion_history" +
            " LEFT JOIN produccion on produccion.idproduccion=produccion_history.idproduccion" +
            " LEFT JOIN fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " WHERE produccion_history.to = 's' AND (produccion_history.fecha between '" + fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59')" +
            " GROUP BY fabricaciones.idmaterial) AS rech ON rech.idmaterial = material.idmaterial" +
            //Materiales en produccion - AS prods.*
            " LEFT JOIN (SELECT fabricaciones.idmaterial,SUM(produccion.cantidad) AS cant_total,sum(produccion.`1`) as moldeo,sum(produccion.`2`) as fusion,sum(produccion.`3`) as quiebre," +
            "sum(produccion.`4`) as terminacion,sum(produccion.`5`) as tt,sum(produccion.`6`) as maestranza,sum(produccion.`7`) as cc FROM produccion" +
            " LEFT JOIN fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " WHERE (produccion.cantidad != produccion.`8`)" +
            " GROUP BY fabricaciones.idmaterial) AS prods ON prods.idmaterial = material.idmaterial" +
            " WHERE prods.cant_total != 0 GROUP BY material.idmaterial",function(err,rows){
            if(err) throw err;
            else callback(null,rows);
        });
    } else callback("Error",{});
};
informe.salidas = function(fecha,callback){
    if(connection){
        connection.query("SELECT material.*,desps.*,COALESCE(salidas_mp.sum_sal,0) AS salidas FROM material" +
            //Salidas De CC a BPT - as fabrs.fabricados
            " LEFT JOIN (SELECT fabricaciones.idmaterial,sum(produccion_history.enviados) as fabricados FROM produccion_history" +
            " LEFT JOIN produccion on produccion.idproduccion=produccion_history.idproduccion" +
            " LEFT JOIN fabricaciones on fabricaciones.idfabricaciones = produccion.idfabricaciones" +
            " WHERE produccion_history.to='8' AND (produccion_history.fecha between '" + fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59')" +
            " GROUP BY fabricaciones.idmaterial) AS fabrs ON fabrs.idmaterial = material.idmaterial" +
            // Salidas de materias primas - as salidas_mp.sum_sal
            " LEFT JOIN (select movimiento_detalle.idmaterial, sum(movimiento_detalle.cantidad) as sum_sal FROM movimiento" +
            " LEFT JOIN movimiento_detalle on movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
            " WHERE movimiento.tipo = 0 AND movimiento.f_gen" +
            " BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59'" +
            " GROUP BY movimiento_detalle.idmaterial) as salidas_mp ON salidas_mp.idmaterial = material.idmaterial" +
            //Materiales en produccion - AS prods.*
            " LEFT JOIN (SELECT material.idmaterial,COALESCE(ventas.num,0) AS venta,COALESCE(traslado.num,0) AS traslado,COALESCE(anulado.num,0) AS anulado" +
            ",COALESCE(devolucion.num,0) AS devolucion FROM material" +
            " LEFT JOIN (SELECT material.idmaterial,SUM(despachos.cantidad) AS num FROM despachos " +
            " LEFT JOIN material ON material.idmaterial = despachos.idmaterial LEFT JOIN gd ON gd.idgd = despachos.idgd" +
            " WHERE gd.estado = 'Venta' AND gd.fecha BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59' GROUP BY material.idmaterial)" +
            " AS ventas ON ventas.idmaterial = material.idmaterial" +
            " LEFT JOIN (SELECT material.idmaterial,SUM(despachos.cantidad) AS num FROM despachos " +
            " LEFT JOIN material ON material.idmaterial = despachos.idmaterial LEFT JOIN gd ON gd.idgd = despachos.idgd" +
            " WHERE gd.estado = 'Anulado' AND gd.fecha BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59' GROUP BY material.idmaterial)" +
            " AS anulado ON anulado.idmaterial = material.idmaterial" +
            " LEFT JOIN (SELECT material.idmaterial,SUM(despachos.cantidad) AS num FROM despachos " +
            " LEFT JOIN material ON material.idmaterial = despachos.idmaterial LEFT JOIN gd ON gd.idgd = despachos.idgd" +
            " WHERE gd.estado = 'Traslado' AND gd.fecha BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59' GROUP BY material.idmaterial)" +
            " AS traslado ON traslado.idmaterial = material.idmaterial" +
            " LEFT JOIN (SELECT material.idmaterial,SUM(despachos.cantidad) AS num FROM despachos " +
            " LEFT JOIN material ON material.idmaterial = despachos.idmaterial LEFT JOIN gd ON gd.idgd = despachos.idgd" +
            " WHERE gd.estado = 'Devolucion' AND gd.fecha BETWEEN '"+fecha[0]+" 00:00:00' AND '"+fecha[1]+" 23:59:59' GROUP BY material.idmaterial)" +
            " AS devolucion ON devolucion.idmaterial = material.idmaterial" +
            " WHERE NOT(ventas.num = 0 AND devolucion.num = 0 AND anulado.num = 0 AND traslado.num = 0) GROUP BY material.idmaterial)" +
            " AS desps ON desps.idmaterial = material.idmaterial" +
            " GROUP BY material.idmaterial",function(err,rows){
            if(err) throw err;
            else callback(null,rows);
        });
    } else callback("Error",{});
};

module.exports = informe;
