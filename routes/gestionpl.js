var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;
router.use(
    connection(mysql,dbCredentials,'pool')
);

var conn = mysql.createConnection(dbCredentials);

function verificar(usr){
    if(usr.nombre === 'gestionpl'){
        return true;
    }else{
        return false;
    }
}
function getConditionArray(object_fill,array_fill, condiciones_where, input){
    var clave;
    var limit = "";
    console.log(input);
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
router.get('/', function(req, res, next) {
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("SELECT * FROM etapafaena", function(err, etp){
                if(err){console.log("Error Selecting : %s", err);}
                res.render('gestionpl/indx',{page_title:"Gestión Planta",username: req.session.userData.nombre, etapas: etp, route: '/gestionpl/create_production_history'});
            });
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/indx', function(req, res, next) {
    var r = req.body.route.split('%').join('/');
    console.log("rutaaaa");
    console.log(r);


    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("SELECT * FROM etapafaena", function(err, etp){
                if(err){ console.log("Error Selecting : %s", err);}
                res.render('gestionpl/indx',{page_title:"Gestión Planta",username: req.session.userData.nombre, etapas: etp, route: r});
            });
        });
    }
    else{res.redirect('bad_login');}
});



router.post('/save_production_history_state', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection : %s", err);}

            connection.query("INSERT INTO save SET ?",{llave: 'prodhist', token: input.token}, function (err, ids) {
                    if (err) {
                        console.log("Error Selecting : %s", err);
                    }
                    console.log(ids);
                    res.send("¡Guardado con Exito!");
                });
        });
    }
    else{res.redirect('bad_login');}
});

/*
*  Resumen:
*
*  Variables Influyentes:
*       req.params = {}
*       req.body = {}
*  Usages:
*
* */
router.get('/render_notificaciones', function(req, res, next){
    req.getConnection(function(err,connection){
        connection.query("SELECT " +
            "notificacion.*," +
            "material.detalle," +
            "etapafaena.nombre_etapa, material2.detalle AS detalle2, odc.numoc, odc.idodc " +
            "from notificacion " +
            "LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial " +
            "LEFT JOIN pedido ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=pedido.idpedido " +
            "LEFT JOIN odc ON odc.idodc=pedido.idodc " +
            "LEFT JOIN (SELECT * FROM material) AS material2 ON material2.idmaterial=pedido.idmaterial " +
            "LEFT JOIN etapafaena ON SUBSTRING_INDEX(notificacion.descripcion,'@',-1)=etapafaena.value " +
            "WHERE (SUBSTRING(notificacion.descripcion,1,3) = 'jfp' OR SUBSTRING(notificacion.descripcion,1,3) = 'idm' OR SUBSTRING(notificacion.descripcion,1,5) = 'crgdd') AND notificacion.active = true", function(err, notif){
            if(err){console.log("Error Selecting : %s", err);}
            var idprods = [];
            for(var e=0; e < notif.length; e++){
                if(notif[e].descripcion.split('@')[0] !== 'crgdd'){
                    for(var w=0; w < notif[e].descripcion.split('@')[4].split('-').length; w++){
                        idprods.push(notif[e].descripcion.split('@')[4].split('-')[w]);
                    }
                }
            }
            var q;
            if(idprods.length === 0){
                q = "SELECT idproduccion,coalesce(externo,false) as externo FROM produccion WHERE idproduccion IN ('0')";
            }else{
                q = "SELECT idproduccion,coalesce(externo,false) as externo FROM produccion WHERE idproduccion IN ("+idprods.join(',')+")";
            }
            connection.query(q, function(err, ext){
                if(err){console.log("Error Selecting : %s", err);}

                for(var e=0; e < notif.length; e++){
                    if(notif[e].descripcion.split('@')[0] !== 'crgdd') {
                        for (var w = 0; w < notif[e].descripcion.split('@')[4].split('-').length; w++) {
                            for (var q = 0; q < ext.length; q++) {
                                if (ext[q].idproduccion.toString() === notif[e].descripcion.split('@')[4].split('-')[w]) {
                                    //SE CREA
                                    if (notif[e].externo === undefined || !notif[e].externo) {
                                        notif[e].externo = ext[q].externo;
                                    }
                                }
                            }
                        }
                    }
                }
                res.render('gestionpl/notificaciones', {notif: notif});
            });
        });
    });
});


router.get('/load_production_history_state', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection : %s", err);}

            connection.query("SELECT * FROM save WHERE llave = 'prodhist' ORDER BY idsave DESC", function(err, save){
                if(err){console.log("Error Selecting : %s", err);}

                var etp = save[0].token.split('//');
                var mats = [];
                for(var e=0; e < etp.length; e++){
                    etp[e] = etp[e].split('%');
                    for(var w=0; w < etp[e].length; w++){
                        etp[e][w] = etp[e][w].split('@');
                        if(etp[e][w].length === 1 || etp[e][w] === ''){
                            etp[e] = [];
                        }else{
                            if(mats.indexOf(etp[e][w][0]) === -1){
                                mats.push(etp[e][w][0]);
                            }
                        }
                    }
                }

                if(mats.length > 0) {
                    connection.query("SELECT idmaterial,detalle FROM material WHERE idmaterial IN (" + mats.join(',') + ")", function (err, ids) {
                        if (err) {
                            console.log("Error Selecting : %s", err);
                        }
                        var mats = [];
                        var dets = [];
                        for (var q = 0; q < ids.length; q++) {
                            mats.push(ids[q].idmaterial);
                            dets.push(ids[q].detalle);
                        }
                        for (var e = 0; e < etp.length; e++) {
                            for (var c = 0; c < etp[e].length; c++) {
                                etp[e][c].splice(1, 0, dets[mats.indexOf(parseInt(etp[e][c][0]))]);
                            }
                        }
                        res.render('gestionpl/table_production_history', {etp: etp});
                    });
                }else{
                    etp = [];
                    res.render('gestionpl/table_production_history', {etp: etp});
                }
            });

        });
    }
    else{res.redirect('bad_login');}
});
router.get('/create_production_history', function(req, res, next){
    if(verificar(req.session.userData)){
        var query = "SELECT * FROM (SELECT producido.ruta,ordenproduccion.f_gen as creacion ,material.idmaterial,SUM(produccion.standby) as standby, SUM(produccion.`1`) as `1`,SUM(produccion.`2`) as `2`,SUM(produccion.`3`) as `3`,SUM(produccion.`4`) as `4`,SUM(produccion.`5`) as `5`,"
            + "SUM(produccion.`6`) as `6`,SUM(produccion.`7`) as `7`,SUM(produccion.`8`) as `8`,SUM(produccion.`e`) as `e`, GROUP_CONCAT(produccion.idproduccion separator ' - ') as idproduccion, '-' as trats,"
            + " '-' as numordenfabricacion, '-' as idfabricaciones, '-' as idordenproduccion, sum(produccion.cantidad) as cantidad, material.detalle,  opQuery.tok ,opQuery.idordenfabricacion"
            + " FROM produccion LEFT JOIN ordenproduccion ON ordenproduccion.idordenproduccion = produccion.idordenproduccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion"
            +" LEFT JOIN (select ordenfabricacion.idordenfabricacion, coalesce(group_concat(DISTINCT produccion.idordenproduccion separator ' - '), 'Sin OP') as tok from ordenfabricacion left join fabricaciones on"
            +" fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion left join produccion on produccion.idfabricaciones=fabricaciones.idfabricaciones group by ordenfabricacion.idordenfabricacion) as opQuery on opQuery.idordenfabricacion=ordenfabricacion.idordenfabricacion"
            +"  LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial LEFT JOIN producido ON producido.idmaterial = material.idmaterial WHERE produccion.`8` + produccion.standby != produccion.cantidad GROUP BY material.idmaterial) AS table_prod"
            +" GROUP BY table_prod.idmaterial";


        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection: %s", err);}
            connection.query(query, function(err, prods){
                if(err){console.log("Error Selecting: %s", err);}
                //OBTIENE TODOS LOS despachos CON GDD ESTADO Servicios QUE AUN NO SE HAYAN ENLAZADO
                connection.query("SELECT " +
                    "CONCAT(despachos.idgd, despachos.idmaterial), \n" +
                    " group_concat(despachos.cantidad) as group_cantidad," +
                    " sum(despachos.cantidad) as cantidad,\n" +
                    " despachos.idgd,\n" +
                    " group_concat(despachos.iddespacho) AS iddespacho,\n" +
                    " group_concat(despachos.idpedido) AS idpedido,\n" +
                    " material.idmaterial,\n" +
                    " material.detalle " +
                    "FROM despachos " +
                    "LEFT JOIN gd ON gd.idgd = despachos.idgd " +
                    "LEFT JOIN material ON material.idmaterial = despachos.idmaterial " +
                    "LEFT JOIN (SELECT idgd as iddesp, COALESCE(sum(enviados),0) AS despachados FROM produccion_history GROUP BY idgd) AS prod_gd ON prod_gd.iddesp = despachos.iddespacho " +
                    "WHERE gd.estado = 'Servicio' AND COALESCE(prod_gd.despachados,0) < despachos.cantidad GROUP BY CONCAT(despachos.idgd, despachos.idmaterial)", function(err, gdds){
                    if(err){console.log("Error Selecting: %s", err);}

                    res.render('gestionpl/create_production_history', {datalen: prods, gdds: gdds});
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});


function enviarNotificacionBodega(req, input){
    var userf = input.key.substring(2,3);
    conn.query("SELECT fabricaciones.idmaterial, produccion.idordenproduccion as idop FROM produccion LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones WHERE produccion.idproduccion = ?", [input.idproduccion], function(err, produccion){
        if(err){console.log("Error Selecting : %s", err);}
        var idmaterial = produccion[0].idmaterial;
        var idop = produccion[0].idop;
        var dataInsert = {};
        var d = new Date();

        var date = d.toLocaleDateString()+" "+d.toLocaleTimeString();
        /*date = [d.getMonth()+1,
                   d.getDate(),
                   d.getFullYear()].join('/')+' '+
                  [d.getHours(),
                   d.getMinutes(),
                   d.getSeconds()].join(':');*/
        if(userf === '8'){
            dataInsert.descripcion = "idm@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
            conn.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                req.app.locals.io.emit("notif");
                setTimeout(function(){return true;}, 500);

            });


        }
        else if(userf === "9"){
            dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
            conn.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                req.app.locals.io.emit("refreshfaena"+userf);
                setTimeout(function(){return true;}, 500);

            });
        }
        else{
            dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
            console.log(dataInsert);
            conn.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                req.app.locals.io.emit("refreshfaena"+userf);

                setTimeout(function(){return true;}, 500);

                //connection.end();
            });
        }


    });
}







 
function enviarNotificacionRechazo(req, input){
    if(conn){
        conn.query("SELECT fabricaciones.idmaterial,produccion.idordenproduccion as idop FROM produccion LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones WHERE produccion.idproduccion in ("+input.idproduccion.split('-').join(',')+")", function(err, produccion) {
            if(err){console.log("Error Selecting : %s", err);}
            var idmaterial = produccion[0].idmaterial;
            var idop = produccion[0].idop;
            var dataInsert = {};
            var d = new Date();
            var date = d.toLocaleDateString()+" "+d.toLocaleTimeString();
            dataInsert.descripcion = "jfp@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop+"@"+input.razon+"@"+input.etapa;
            conn.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                req.app.locals.io.sockets.emit("notif");
            });
        });
    }
}
function enviarNotificacionExternalizacion(req, input){
    if(conn){
        console.log("INGRESANDO NOTIFICACIÓN DE EXTERNALIZACION");
        console.log(input);
        //{ idproduccion: '22744-22853', cantidad: '1', key: 'fae' }
        //odaext@idproduccion@2019-07-08 16:51:53@idmaterial@cantidad
        conn.query("SELECT fabricaciones.idmaterial FROM produccion " +
            "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones " +
            "WHERE idproduccion IN ('"+input.idproduccion.split('-').join(',')+"') GROUP BY fabricaciones.idmaterial", function(err, idmat) {
            if(err){console.log("Error Selecting : %s", err);}
            idmat = idmat[0].idmaterial;
            var d = new Date();
            var date = d.toLocaleDateString()+" "+d.toLocaleTimeString();
            var token = "odaext@"+input.idproduccion+"@"+date+"@"+idmat+"@"+input.cantidad;
            console.log(token);
            conn.query("INSERT INTO notificacion (descripcion) VALUES ('"+token+"')", function(err, inNotif) {
                if(err){console.log("Error Selecting : %s", err);}

                           });
    	});
    }
}


//function recursive_save_ph(idmat,env,from,to,obs,fecha, req){
function recursive_save_ph(data, index, req){
    if(conn){
        console.log("Posicion "+index);
        console.log(data);
        var q = "select " +
            "material.detalle,material.idmaterial,group_concat(produccion.idproduccion SEPARATOR '-') as idprod, group_concat(produccion."+data['from[]'][index]+" SEPARATOR '-') as cantprod " +
            "from produccion " +
            "left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones " +
            "left join material on material.idmaterial=fabricaciones.idmaterial " +
            "where produccion.cantidad > produccion.8 + produccion.standby and produccion."+data['from[]'][index]+">0 and material.idmaterial = "+data['idmat[]'][index]+" group by material.idmaterial order by produccion.idproduccion ASC";
        //console.log(q);
        conn.query(q, function(err, rows){
            if(err){ throw err; }

            //QUEDA SALDO EN PRODUCCION PARA REALIZAR EL MOVIMIENTO
            if(rows.length > 0) {
                /*
                * { idprod: '22725-22716-22717',
                      cantprod: '400-391-300',
                      newetapa: '2',
                      sendnum: '91',
                      etapa_act: '1' };
                * */
                if(data['iddesp[]'][index].toString() === '0'){data['iddesp[]'][index] = null;}
                //EXT === 9
                if(data['to[]'][index] === '9'){data['to[]'][index] = 'e';}
                var input = {
                    idprod: rows[0].idprod,
                    cantprod: rows[0].cantprod,
                    newetapa: data['to[]'][index],
                    sendnum: data['env[]'][index],
                    etapa_act: data['from[]'][index],
                    iddesp: data['iddesp[]'][index]
                };
                //jfp@109603@120@2019-6-25 16:19:58@22901-22864-22866@283@COMENTARIO@4
                //ENVIAR NOTIFICACIÓN
                var notif;
                var fecha = data['fecha[]'][index];
                if(data['to[]'][index] === 's'){
                    notif = {
                        idproduccion: rows[0].idprod,
                        cantidad: data['env[]'][index],
                        razon: data['coment[]'][index],
                        etapa: data['from[]'][index]
                    };
                    setTimeout(function(){ enviarNotificacionRechazo(req, notif); }, 666);

                }
                else if(data['to[]'][index] === '8'){
                    notif = {
                        idproduccion: rows[0].idprod,
                        cantidad: data['env[]'][index],
                        key: 'fa8'
                    };
                    setTimeout(function(){ enviarNotificacionBodega(req, notif); }, 666);

                }
                /*
                * input.cantprod: token separado por comas que representa el saldo disponible en cada producción (según la etapa)
                *
                * */
                input.idprod = input.idprod.split('-');
                input.cantprod = input.cantprod.split('-');
                var query = "UPDATE produccion SET produccion.`"+input.etapa_act+"` = CASE ";
                var query2;
                if(data['to[]'][index] === 's'){
                    query2 = "UPDATE produccion SET produccion.`standby` = CASE ";
                }
                else{
                    query2 = "UPDATE produccion SET produccion.`"+input.newetapa+"` = CASE ";
                }
                var ids = "";
                var cant_aux = parseInt(input.sendnum);
                var history = [];
                var prod_affected = [];
                var env_affected = [];
                for(var w=0; w < input.idprod.length; w++){
                    cant_aux -= parseInt(input.cantprod[w]);
                    if(cant_aux > 0){
                        /* SI cant_aux ES MAYOR A CERO SIGNIFICA QUE SE UTILIZO TODO EL SALDO DE LA PRODUCCION*/
                        query += " WHEN idproduccion ="+input.idprod[w]+" THEN 0";
                        if(input.newetapa === 's'){
                            query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`standby` + "+input.cantprod[w];
                        }
                        else{
                            query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+input.cantprod[w];
                        }

                        if(parseInt(input.cantprod[w]) > 0){
                            if(fecha === '' || fecha === ' ' || !fecha || fecha === null || fecha === undefined ){
                                fecha = new Date();
                            }
                            else{
                                fecha = new Date(fecha);
                                fecha.setTime( fecha.getTime() + new Date().getTimezoneOffset()*60*1000 );
                            }
                            history.push([input.idprod[w], input.cantprod[w], input.etapa_act, input.newetapa, fecha, input.iddesp]);
                            prod_affected.push(input.idprod[w]);
                            //LA CANTIDAD TRASPASADA
                            env_affected.push(input.cantprod[w]);
                        }
                        ids += input.idprod[w]+",";
                    }
                    else{
                        /* EN CASO CONTRARIO QUEDA SALDO EN LA ETAPA --> cant_aux negativo*/
                        query += " WHEN idproduccion ="+input.idprod[w]+" THEN "+Math.abs(cant_aux);
                        if(input.newetapa === 's'){
                            query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`standby` + "+(cant_aux+parseInt(input.cantprod[w]));
                        }
                        else{
                            query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+(cant_aux+parseInt(input.cantprod[w]));
                        }
                        //history.push({idproduccion: input.idprod[w],enviados: cant_aux+parseInt(input.cantprod[w]),from: input.etapa_act,to:input.newetapa});
                        if(fecha === '' || fecha === ' ' || !fecha || fecha === null || fecha === undefined ){
                            fecha = new Date();
                        }
                        else{
                            fecha = new Date(fecha);
                            fecha.setTime( fecha.getTime() + new Date().getTimezoneOffset()*60*1000 );
                        }
                        history.push([input.idprod[w], cant_aux+parseInt(input.cantprod[w]), input.etapa_act, input.newetapa, fecha, input.iddesp]);
                        prod_affected.push(input.idprod[w]);
                        //LA CANTIDAD TRASPASADA
                        env_affected.push(cant_aux+parseInt(input.cantprod[w]));
                        ids += input.idprod[w]+",";
                        break;
                    }
                }
                //var notif =  {cant: input.sendnum, idproduccion: input.idprod};
                query += " ELSE produccion.`"+input.etapa_act+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")";
                if(input.newetapa === 's'){
                    query2 += " ELSE produccion.`standby` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")";
                }
                else{

                    query2 += " ELSE produccion.`"+input.newetapa+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")";
                }
                conn.query(query ,function(err,upProd1){
                    if(err) {throw err;}

                    conn.query(query2 ,function(err,upProd2){
                        if(err){throw err;}
                        console.log(history);

                        conn.query("INSERT INTO produccion_history (`idproduccion`, `enviados`, `from`, `to`, `fecha`, `idgd`) VALUES ?",[history],function(err,insert_h){
                            if(err) {throw err;}

                            if(data['to[]'][index] === 'e'){
                                notif = {
                                    idproduccion: prod_affected.join('-'),
                                    cantidad: env_affected.join('-'),
                                    key: 'fae'
                                };
                                enviarNotificacionExternalizacion(req, notif);
                            }


                            if(data['idmat[]'][++index]){
                                recursive_save_ph(data, index, req);
                            }else{
                                return true;
                            }
                        });
                    });
                });
            }
            else{
                if(data['idmat[]'][++index]){
                    recursive_save_ph(data, index, req);
                }else{
                    return true;
                }
            }
        });
    }
}

function allMovFunction(input, req){
    if(typeof input['idmat[]'] === 'string'){
        input = {
            'idmat[]': [ input['idmat[]']  ],
            'env[]': [  input['env[]'] ],
            'to[]': [  input['to[]'] ],
            'from[]': [  input['from[]']],
            'coment[]': [  input['coment[]']],
            'fecha[]': [  input['fecha[]'] ],
            'iddesp[]': [  input['iddesp[]'] ]
        };
    }
    for(var t=0; t < input['idmat[]'].length; t++){
        //HACIA EXTERNALIZADO => ENLAZADO CON despachos
        if(input['iddesp[]'][t].split(',').length > 1){
            for(var w=0; w < input['iddesp[]'][t].split(',').length; w++){
                if(w >= 1){
                    input['idmat[]'].push(input['idmat[]'][t]);
                    input['to[]'].push(input['to[]'][t]);
                    input['from[]'].push(input['from[]'][t]);
                    input['coment[]'].push(input['coment[]'][t]);
                    input['fecha[]'].push(input['fecha[]'][t]);

                    input['env[]'].push( input['env[]'][t].split(',')[w] );
                    input['iddesp[]'].push( input['iddesp[]'][t].split(',')[w] );
                }
            }
            input['env[]'][t] =  input['env[]'][t].split(',')[0];
            input['iddesp[]'][t] =  input['iddesp[]'][t].split(',')[0];
        }

        //SI ES RECHAZO SE DEBE SEPARA EL MOVIMIENTO DE 1 EN 1
        if( input['to[]'][t] === 's' && parseInt(input['env[]'][t]) > 1 ){
            console.log("Separando Rechazo");
            for(var e=0; e < parseInt(input['env[]'][t])-1; e++){
                input['idmat[]'].push(input['idmat[]'][t]);
                input['to[]'].push(input['to[]'][t]);
                input['from[]'].push(input['from[]'][t]);
                input['coment[]'].push(input['coment[]'][t]);
                input['fecha[]'].push(input['fecha[]'][t]);
                input['iddesp[]'].push(input['iddesp[]'][t]);
                input['env[]'].push( '1' );
            }
            input['env[]'][t] =  '1';
        }
    }
    recursive_save_ph(input, 0, req);
}


router.post('/save_production_history', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        allMovFunction(input, req);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}
            connection.query("UPDATE user SET block_s = true WHERE username = 'calidad'", function(err, upCdc){
                if(err){console.log("Error Updating : %s", err);}

                connection.query("INSERT INTO notificacion (`descripcion`) VALUES ('cdcBloc@@"+new Date().toLocaleString()+"')", function(err, upCdc){
                    if(err){console.log("Error Updating : %s", err);}

                    res.send("¡Movimiento Diario registrado con exito!");
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});






router.post('/save_production_history_check_gdd', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        /*
        * {
          'idmat[]': [ '110932', '110932', '110931' ],
          'env[]': [ '4', '5', '1' ],
          'to[]': [ '4', '7', '5' ],
          'from[]': [ '3', '5', '7' ],
          'coment[]': [ '', '', '' ],
          'fecha[]': [ '2019-11-11', '2019-11-11', '2019-11-11' ],
          'iddesp[]': [ '0', '0', '0' ] }
        */
        if(typeof input['idmat[]'] === 'string'){
            input = {
                'idmat[]': [ input['idmat[]']  ],
                'env[]': [  input['env[]'] ],
                'to[]': [  input['to[]'] ],
                'from[]': [  input['from[]']],
                'coment[]': [  input['coment[]']],
                'fecha[]': [  input['fecha[]'] ],
                'iddesp[]': [  input['iddesp[]'] ]
            };
        }
        var iddesp = [];
        for(var t=0; t < input['idmat[]'].length; t++){
            if(input['iddesp[]'][t] !== '0'){iddesp.push(input['iddesp[]'][t]);}
        }
        var q = "SELECT " +
            "despachos.idgd," +
            "count(despachos.iddespacho) as total, count(despachos.iddespacho) < totalGd.total as noComplete, " +
            "totalGd.total AS totalGd FROM despachos " +
            "LEFT JOIN (" +
            "   SELECT " +
            "       despachos.idgd," +
            "       count(despachos.iddespacho) as total " +
            "   FROM despachos GROUP BY despachos.idgd) AS totalGd ON totalGd.idgd = despachos.idgd " +
            "WHERE despachos.iddespacho IN ("+iddesp.join(',')+") GROUP BY despachos.idgd";
        console.log(q);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err);}

            connection.query(q, function(err, check){
                if(err){console.log("Error Selecting : %s", err);}
                console.log(check);
                var boolSend = false;
                var idgds = [];
                if(check){
                    for(var w=0; w < check.length; w++){
                        if(check[w].noComplete === '1' || check[w].noComplete === 1){
                            idgds.push(check[w].idgd);
                            boolSend = true;
                            break;
                        }
                    }
                }
                console.log("SELECT " +
                    "CONCAT('<li>GDD ', despachos.idgd, ' : ', material.detalle, ' ', despachos.cantidad, ' despachado(s).</li>' ) AS text " +
                    "FROM despachos " +
                    "LEFT JOIN material ON material.idmaterial = despachos.idmaterial " +
                    "WHERE despachos.idgd IN ("+idgds.join(',')+") AND despachos.iddespacho NOT IN ("+iddesp.join(',')+")");
                connection.query("SELECT " +
                    "CONCAT('<li>GDD ', despachos.idgd, ' : ', material.detalle, ' ', despachos.cantidad, ' despachado(s).</li>' ) AS text " +
                    "FROM despachos " +
                    "LEFT JOIN material ON material.idmaterial = despachos.idmaterial " +
                    "WHERE despachos.idgd IN ("+idgds.join(',')+") AND despachos.iddespacho NOT IN ("+iddesp.join(',')+")", function(err, restDesp){
                    if(err){console.log("Error Selecting : %s", err);}

                    var msg = [];

                    if(restDesp){
                        restDesp.map(function(x) {
                            msg.push(x['text']);
                        });
                    }

                    res.send([boolSend, "<ul style='white-space: nowrap; margin: 0; padding: 0;'>"+msg.join("\n")+"</ul>"]);
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});







router.get('/ver_ruta_modal/:idmaterial', function(req, res, next){
    if(verificar(req.session.userData)){console.log(req.params.idmaterial);}
    else{res.redirect('bad_login');}
});



router.get('/render_alert_notificacion/:idnotif', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);

        connection.query("SELECT " +
            "notificacion.*," +
            "material.detalle," +
            "etapafaena.nombre_etapa, material2.detalle AS detalle2, odc.numoc, odc.idodc " +
            "from notificacion " +
            "LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial " +
            "LEFT JOIN pedido ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=pedido.idpedido " +
            "LEFT JOIN odc ON odc.idodc=pedido.idodc " +
            "LEFT JOIN (SELECT * FROM material) AS material2 ON material2.idmaterial=pedido.idmaterial " +
            "LEFT JOIN etapafaena ON SUBSTRING_INDEX(notificacion.descripcion,'@',-1)=etapafaena.value " +
            "WHERE (SUBSTRING(notificacion.descripcion,1,3) = 'jfp' OR SUBSTRING(notificacion.descripcion,1,3) = 'idm' OR SUBSTRING(notificacion.descripcion,1,5) = 'crgdd') AND notificacion.active = true", function(err, notif){
            if(err){console.log("Error Selecting : %s", err);}
            var idprods = [];
            for(var e=0; e < notif.length; e++){
                if(notif[e].descripcion.split('@')[0] !== 'crgdd'){
                    for(var w=0; w < notif[e].descripcion.split('@')[4].split('-').length; w++){
                        idprods.push(notif[e].descripcion.split('@')[4].split('-')[w]);
                    }
                }
            }
            var q;
            if(idprods.length === 0){
                q = "SELECT idproduccion,coalesce(externo,false) as externo FROM produccion WHERE idproduccion IN ('0')";
            }else{
                q = "SELECT idproduccion,coalesce(externo,false) as externo FROM produccion WHERE idproduccion IN ("+idprods.join(',')+")";
            }
            connection.query(q, function(err, ext){
                if(err){console.log("Error Selecting : %s", err);}

                for(var e=0; e < notif.length; e++){
                    if(notif[e].descripcion.split('@')[0] !== 'crgdd') {
                        for (var w = 0; w < notif[e].descripcion.split('@')[4].split('-').length; w++) {
                            for (var q = 0; q < ext.length; q++) {
                                if (ext[q].idproduccion.toString() === notif[e].descripcion.split('@')[4].split('-')[w]) {
                                    //SE CREA
                                    if (notif[e].externo === undefined || !notif[e].externo) {
                                        notif[e].externo = ext[q].externo;
                                    }
                                }
                            }
                        }
                    }
                }


                console.log("GESTIONPL notificacion");
                console.log(notif);
                res.render('gestionpl/alert_notif_gestionpl', {notif: notif});

            });
        });
    });
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
                res.redirect('/gestionpl/render_notificaciones');
            });
    });
});



module.exports = router;
