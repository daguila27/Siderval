var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;
router.use(
    connection(mysql,dbCredentials,'pool')
);

var conn = mysql.createConnection({
    host: 'localhost',
    user: 'admin',
    password : 'tempo123',
    port : 3306,
    database:'siderval',
    insecureAuth : true
});

function verificar(usr){
    if(usr.nombre == 'gestionpl'){
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
                res.render('gestionpl/indx',{page_title:"Gestión Planta",username: req.session.userData.nombre, etapas: etp});
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
            "etapafaena.nombre_etapa " +
            "from notificacion " +
            "LEFT JOIN material ON substring_index(substring_index(notificacion.descripcion,'@',2), '@', -1)=material.idmaterial " +
            "LEFT JOIN etapafaena ON SUBSTRING_INDEX(notificacion.descripcion,'@',-1)=etapafaena.value " +
            "WHERE (SUBSTRING(notificacion.descripcion,1,3) = 'jfp' OR SUBSTRING(notificacion.descripcion,1,3) = 'idm') AND notificacion.active = true", function(err, notif){
            if(err){console.log("Error Selecting : %s", err);}
            var idprods = [];
            for(var e=0; e < notif.length; e++){
                for(var w=0; w < notif[e].descripcion.split('@')[4].split('-').length; w++){
                    idprods.push(notif[e].descripcion.split('@')[4].split('-')[w]);
                }
            }
            var q;
            if(idprods.length === 0){
                q = "SELECT idproduccion,coalesce(externo,false) as externo FROM produccion WHERE idproduccion IN ('0')";
            }else{
                q = "SELECT idproduccion,coalesce(externo,false) as externo FROM produccion WHERE idproduccion IN ("+idprods.join(',')+")";
            }
            console.log(q);
            connection.query(q, function(err, ext){
                if(err){console.log("Error Selecting : %s", err);}

                for(var e=0; e < notif.length; e++){
                    for(var w=0; w < notif[e].descripcion.split('@')[4].split('-').length; w++){
                        for(var q=0; q < ext.length; q++){
                            if(ext[q].idproduccion.toString() === notif[e].descripcion.split('@')[4].split('-')[w]){
                                //SE CREA
                                if(notif[e].externo === undefined || !notif[e].externo){
                                    notif[e].externo = ext[q].externo;
                                }
                            }
                        }
                    }
                }
                console.log("GESTIONPL notificacion");
                console.log(notif);
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

                res.render('gestionpl/create_production_history', {datalen: prods});
            });
        });
    }
    else{res.redirect('bad_login');}
});

router.post('/save_production_history', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        if(typeof input['idmat[]'] === 'string'){
            recursive_save_ph(input['idmat[]'],input['env[]'],input['from[]'],input['to[]']," ", req);
        }
        else{
            for(var e=0; e < input['idmat[]'].length; e++){
                recursive_save_ph(input['idmat[]'][e],input['env[]'][e],input['from[]'][e],input['to[]'][e]," ", req);
            }
        }
        res.send("¡Movimiento Diario registrado con exito!");
    }
    else{res.redirect('bad_login');}
});

function recursive_save_ph(idmat,env,from,to,obs, req){
    if(conn){
        conn.query("select " +
            "material.detalle,material.idmaterial,group_concat(produccion.idproduccion SEPARATOR '-') as idprod, group_concat(produccion."+from+" SEPARATOR '-') as cantprod " +
            "from produccion " +
            "left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones " +
            "left join material on material.idmaterial=fabricaciones.idmaterial " +
            "where produccion.cantidad > produccion.8 + produccion.standby and produccion."+from+">0 and material.idmaterial = ? group by material.idmaterial order by produccion.idproduccion ASC", [idmat], function(err, rows){
            if(err) throw err;

            console.log(rows);
            /*
            * { idprod: '22725-22716-22717',
                  cantprod: '400-391-300',
                  newetapa: '2',
                  sendnum: '91',
                  etapa_act: '1' };
            * */
            //EXT === 9
            if(to === '9'){to = 'e';}
            var input = {
                idprod: rows[0].idprod,
                cantprod: rows[0].cantprod,
                newetapa: to,
                sendnum: env,
                etapa_act: from
            };
            //jfp@109603@120@2019-6-25 16:19:58@22901-22864-22866@283@COMENTARIO@4
            //ENVIAR NOTIFICACIÓN
           var notif;
            if(to === 's'){
                notif = {
                    idproduccion: rows[0].idprod,
                    cantidad: env,
                    razon: obs,
                    etapa: from
                };
                enviarNotificacionRechazo(req, notif);
            }else if(to === '8'){
                notif = {
                    idproduccion: rows[0].idprod,
                    cantidad: env,
                    key: 'fa8'
                };
                enviarNotificacionBodega(req, notif);
            }
            /*
            * input.cantprod: token separado por comas que representa el saldo disponible en cada producción (según la etapa)
            *
            * */
            input.idprod = input.idprod.split('-');
            input.cantprod = input.cantprod.split('-');
            var query = "UPDATE produccion SET produccion.`"+input.etapa_act+"` = CASE ";
            var query2;
            if(to === 's'){
                query2 = "UPDATE produccion SET produccion.`standby` = CASE ";
            }else{
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
                    // SI cant_aux ES MAYOR A CERO SIGNIFICA QUE SE UTILIZO TODO EL SALDO DE LA PRODUCCION
                    query += " WHEN idproduccion ="+input.idprod[w]+" THEN 0";
                    if(input.newetapa === 's'){
                        query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`standby` + "+input.cantprod[w];
                    }else{
                        query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+input.cantprod[w];
                    }

                    if(parseInt(input.cantprod[w]) > 0){
                        history.push([input.idprod[w], input.cantprod[w], input.etapa_act, input.newetapa]);
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
                    }else{
                        query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+(cant_aux+parseInt(input.cantprod[w]));
                    }
                    //history.push({idproduccion: input.idprod[w],enviados: cant_aux+parseInt(input.cantprod[w]),from: input.etapa_act,to:input.newetapa});
                    history.push([input.idprod[w], cant_aux+parseInt(input.cantprod[w]), input.etapa_act, input.newetapa]);
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
            }else{
                query2 += " ELSE produccion.`"+input.newetapa+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")";
            }
            conn.query(query ,function(err,upProd1){
                if(err) throw err;
                conn.query(query2 ,function(err,upProd2){
                    if(err) throw err;

                    conn.query("INSERT INTO produccion_history (`idproduccion`, `enviados`, `from`, `to`) VALUES ?",[history],function(err,insert_h){
                        if(err) throw err;


                        if(to === 'e'){
                            notif = {
                                idproduccion: prod_affected.join('-'),
                                cantidad: env_affected.join('-'),
                                key: 'fae'
                            };
                            enviarNotificacionExternalizacion(req, notif);
                        }
                    });
                });
            });
            setTimeout(function(){return true;}, 250);
        });
    }
}


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
            });


        }
        else if(userf === "9"){
            dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
            conn.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                req.app.locals.io.emit("refreshfaena"+userf);

                //connection.end();
            });
        }
        else{
            dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
            console.log(dataInsert);
            conn.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}
                req.app.locals.io.emit("refreshfaena"+userf);

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



router.get('/ver_ruta_modal/:idmaterial', function(req, res, next){
    if(verificar(req.session.userData)){
        console.log(req.params.idmaterial);

    }
    else{res.redirect('bad_login');}
});


module.exports = router;
