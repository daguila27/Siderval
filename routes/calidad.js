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
    if(usr.nombre === 'calidad' || usr.nombre === 'siderval'){
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


    if(input.clave === '' || input.clave === null || input.clave === undefined){
        clave = [];
    }
    else{
        clave = input.clave.split(',');
    }
    if(clave.length>0){
        for(var e=0; e < clave.length; e++){
            if(clave[e].split('@')[2] === 'off') {
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
        res.render('calidad/indx',{page_title:"Control de Calidad",username: req.session.userData.nombre, route: '/calidad/create_production_rech_prodh'});
    }
    else{res.redirect('bad_login');}
});

router.post('/indx', function(req, res, next) {
    var r = req.body.route.split('%').join('/');
    if(verificar(req.session.userData)){
        res.render('calidad/indx',{page_title:"Control de Calidad", username: req.session.userData.nombre,  route: r});
    }
    else{res.redirect('bad_login');}
});


router.get('/change_bloc_user', function(req, res, next) {
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s", err)}

            connection.query("UPDATE user SET block_s = false WHERE username = 'calidad'", function(err, userUp){
                if(err){console.log("Error Updating : %s", err);}

                console.log(userUp);
                res.send("ok");

            });
        });
    }
    else{res.redirect('bad_login');}
});

router.get('/create_production_rech', function(req, res, next){
    if(verificar(req.session.userData)){
        console.log("here");

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



                connection.query("select * from etapafaena where etapafaena.value not in (7,8,'s','e')", function(err, dataEtp){
                    if(err){console.log("Error Selecting: %s", err);}
                    connection.query("SELECT " +
                        "causal_etapacausal.idcausal_etapacausal AS idcausal, " +
                        "etapacausal.nombre AS causal, " +
                        "etapacausal.idetapacausal AS idetapa, causal.causal AS nombre_etapa FROM causal_etapacausal" +
                        " LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal" +
                        " LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal", function(err, causal){
                        if(err){console.log("Error Selecting: %s", err);}

                        var cau = {};
                        for(var e=0; e < causal.length; e++){
                            if(!cau[causal[e].nombre_etapa.toString()]){
                                cau[causal[e].nombre_etapa.toString()] = [];
                            }

                            cau[causal[e].nombre_etapa.toString()].push([causal[e].idcausal, causal[e].causal ]);
                        }



                        connection.query("SELECT * FROM user WHERE username = 'calidad'", function(err, userDat){
                            if(err){console.log("Error Selecting : %s", err);}


                            connection.query("SELECT * FROM (SELECT max(notificacion.idnotificacion) as idnotif_max FROM notificacion WHERE (descripcion LIKE 'cdcBloc@%')) as queryNotifMax LEFT JOIN \n" +
                                "(SELECT * FROM notificacion)\n" +
                                " AS queryNotif ON queryNotif.idnotificacion = queryNotifMax.idnotif_max",
                                function(err, notifMax){
                                    if(err){console.log("Error Selecting : %s", err);}

                                    var alertMsg = "";
                                    if(notifMax.length > 0){
                                            alertMsg = "El ultimo registro de Gestión Planta se realizó el "+
                                                [notifMax[0].descripcion.split('@')[2].split(' ')[0].split('-')[2], notifMax[0].descripcion.split('@')[2].split(' ')[0].split('-')[1], notifMax[0].descripcion.split('@')[2].split(' ')[0].split('-')[0]].join('/')+
                                                " a las "+
                                                [notifMax[0].descripcion.split('@')[2].split(' ')[1].split(':')[0] , notifMax[0].descripcion.split('@')[2].split(' ')[1].split(':')[1]].join(':')+ " "+notifMax[0].descripcion.split('@')[2].split(' ')[2] +
                                                ". Para continuar presione Confirmar.";
                                    }
                                    res.render('calidad/create_production_rech', {datalen: prods, etp: dataEtp, causal: causal, opt_causal: cau, user: userDat[0].block_s, alertMsg: alertMsg});
                            });
                        });

                    });
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});

router.get('/create_production_rech_prodh', function(req, res, next){
    if(verificar(req.session.userData)){
        console.log("here");

        var query = "SELECT produccion_history.*, material.detalle, fabricaciones.idorden_f AS idof, etapafaena.nombre_etapa FROM produccion_history \n" +
            "            LEFT JOIN produccion ON produccion_history.idproduccion = produccion.idproduccion \n" +
            "            LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones \n" +
            "            LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
            "            LEFT JOIN rechazos_cdc ON rechazos_cdc.idproduccion_h = produccion_history.idproduccion_history \n" +
            "            LEFT JOIN etapafaena ON etapafaena.value = produccion_history.from \n" +
            "            WHERE produccion_history.to = 's' \n" +
            "            AND produccion_history.fecha > '2019-11-01'\n" +
            "            AND produccion_history.enviados = 1 \n" +
            "            AND rechazos_cdc.idproduccion_h IS NULL";
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connection: %s", err);}
            connection.query(query, function(err, prods){
                if(err){console.log("Error Selecting: %s", err);}



                connection.query("select * from etapafaena where etapafaena.value not in (7,8,'s','e')", function(err, dataEtp){
                    if(err){console.log("Error Selecting: %s", err);}
                    connection.query("SELECT " +
                        "causal_etapacausal.idcausal_etapacausal AS idcausal, " +
                        "etapacausal.nombre AS causal, " +
                        "etapacausal.idetapacausal AS idetapa, causal.causal AS nombre_etapa FROM causal_etapacausal" +
                        " LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal" +
                        " LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal", function(err, causal){
                        if(err){console.log("Error Selecting: %s", err);}

                        var cau = {};
                        for(var e=0; e < causal.length; e++){
                            if(!cau[causal[e].nombre_etapa.toString()]){
                                cau[causal[e].nombre_etapa.toString()] = [];
                            }

                            cau[causal[e].nombre_etapa.toString()].push([causal[e].idcausal, causal[e].causal ]);
                        }



                        connection.query("SELECT * FROM user WHERE username = 'calidad'", function(err, userDat){
                            if(err){console.log("Error Selecting : %s", err);}


                            connection.query("SELECT * FROM (SELECT max(notificacion.idnotificacion) as idnotif_max FROM notificacion WHERE (descripcion LIKE 'cdcBloc@%')) as queryNotifMax LEFT JOIN \n" +
                                "(SELECT * FROM notificacion)\n" +
                                " AS queryNotif ON queryNotif.idnotificacion = queryNotifMax.idnotif_max",
                                function(err, notifMax){
                                    if(err){console.log("Error Selecting : %s", err);}


                                    var alertMsg = "";
                                    if(notifMax.length > 0 && notifMax[0].idnotif_max !== null ){
                                        alertMsg = "El ultimo registro de Gestión Planta se realizó el "+
                                            [notifMax[0].descripcion.split('@')[2].split(' ')[0].split('-')[2], notifMax[0].descripcion.split('@')[2].split(' ')[0].split('-')[1], notifMax[0].descripcion.split('@')[2].split(' ')[0].split('-')[0]].join('/')+
                                            " a las "+
                                            [notifMax[0].descripcion.split('@')[2].split(' ')[1].split(':')[0] , notifMax[0].descripcion.split('@')[2].split(' ')[1].split(':')[1]].join(':')+ " "+notifMax[0].descripcion.split('@')[2].split(' ')[2] +
                                            ". Para continuar presione Confirmar.";
                                    }
                                    //res.render('calidad/create_production_rech', {datalen: prods, etp: dataEtp, causal: causal, opt_causal: cau, user: userDat[0].block_s, alertMsg: alertMsg});
                                    res.render('calidad/create_production_rech_prodh', {datalen: prods, etp: dataEtp, causal: causal, opt_causal: cau, user: userDat[0].block_s, alertMsg: alertMsg});

                                });
                        });

                    });
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});


router.post('/save_production_rech', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        if(typeof input['idmat[]'] === 'string'){
            input = {
                'idmat[]': [input['idmat[]']],
                'env[]': [input['env[]']],
                'fecha[]': [input['fecha[]']],
                'coment[]': [input['coment[]']],
                'colada[]': [input['colada[]']],
                'producto[]': [input['producto[]']],
                'causal[]': [input['causal[]']],
                'area[]': [input['area[]']],
                'from[]': [input['from[]']],
                'del[]': [input['del[]']]
            };
        }

        //OBTENEMOS DESDE BD UNA COLECCION CON TODAS LAS PRODUCCIONES
        //AGRUPADAS SEGUN PRODUCTO Y UNA CONCATENACION DE LOS
        //IDPRODUCCION Y LA CANTIDAD RESPECTIVA EN CdC (SEPARADAS POR "-")
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s");}

            connection.query("SELECT * FROM etapafaena WHERE etapafaena.value != 's'", function(err, etps){
                if(err){console.log("Error Selecting : %s", err);}

                var queryProd = [];
                for(var t=0; t < etps.length; t++){
                    queryProd.push("GROUP_CONCAT(q.`"+etps[t].value+"`) AS prod"+etps[t].value);
                }
                queryProd = "SELECT " +
                    "q.idmaterial, " +
                    queryProd.join(',') +
                    ",GROUP_CONCAT(q.idproduccion) AS idproduccion " +
                    " FROM (SELECT produccion.*, fabricaciones.idmaterial FROM produccion " +
                    "LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones " +
                    "WHERE produccion.`8` + produccion.standby != produccion.cantidad " +
                    "ORDER BY produccion.idproduccion ASC) AS q GROUP BY q.idmaterial";

                connection.query(queryProd, function(err, prod){
                    if(err){console.log("Error Selecting : %s", err);}

                    /*
                *
                  'idmat[]': [ '110931', '109580', '124984' ],
                  'env[]': [ '1', '1', '1' ],
                  'fecha[]':
                   [ '2019-11-06T15:55', '2019-11-06T15:55', '2019-11-06T15:55' ],
                  'coment[]': [ '', '', '' ],
                  'colada[]': [ '19H15', '19H15', '19H15' ],
                  'producto[]': [ '005', '005', '005' ],
                  'causal[]': [ '1', '25', '25' ],
                  'area[]': [ '1', '5', '5' ],
                  'del[]': [ ' ', ' ', ' ' ] }
                * */
                    //REGISTRO PARA INGRESAR A BD
                    var hist = [];
                    var rech = [];
                    var rech_causal = [];
                    var aux_idprod;
                    var idmats = getArrayKey('idmaterial', prod);
                    var aux;
                    var obj;
                    var prod_acu = {};
                    /*
                    * {idprod1: {'1': 10, '2': 5},
                    * idprod2: {'4': 1, '6': 5},
                    * }
                    * */
                    for(var e = 0; e < prod.length; e++){
                        for(var a = 0; a < etps.length; a++){
                            //CREA ARRAY CON IDS PRODUCCION
                            if(!prod[e]['ids'+etps[a].value]){
                                prod[e]['ids'+etps[a].value] = prod[e].idproduccion.split(',');
                            }
                            prod[e]['prod'+etps[a].value] = prod[e]['prod'+etps[a].value].split(',');

                            for(var t=0; t < prod[e]['prod'+etps[a].value].length; t++){
                                if(parseInt(prod[e]['prod'+etps[a].value][t]) <= 0){
                                    prod[e]['prod'+etps[a].value].splice(t,1);
                                    prod[e]['ids'+etps[a].value].splice(t,1);
                                    t--;
                                }
                            }



                            //SE ORDENA ASCENDENTEMENTE SEGUN idproduccion
                            aux = orderTwoArrayAsc(prod[e]['ids'+etps[a].value], prod[e]['prod'+etps[a].value]);
                            prod[e]['prod'+etps[a].value] = aux[1].join(',');
                            prod[e]['ids'+etps[a].value] = aux[0].join(',');
                            /*if(a === etps.length-1){
                                prod[e].idproduccion = aux[0].join(',');
                            }*/
                        }
                    }


                    //SE RECORRE input PARA RECOLECTAR LOS MOVIMIENTO QUE SE INGRESARAN EN produccion_history
                    //Y PARA CREAR LA QUERY QUE ACTUALIZA LA MATRIZ DE PRODUCCION
                    for(var w=0; w < input['idmat[]'].length; w++){
                        //SE OBTIENE LOS DATOS PRODUCCION DE BD
                        if(idmats.indexOf(input['idmat[]'][w]) !== -1 ){
                            if(  parseInt(prod[idmats.indexOf(input['idmat[]'][w])]['prod'+input['from[]'][w]].split(',')[0]) === 1 ){
                                if(prod[idmats.indexOf(input['idmat[]'][w])]['prod'+input['from[]'][w]].split(',').length === 1){
                                    aux_idprod = prod[idmats.indexOf(input['idmat[]'][w])]['ids'+input['from[]'][w]].split(',')[0];

                                    rech.push([input['colada[]'][w], input['producto[]'][w], input['causal[]'][w]]);
                                    hist.push([prod[idmats.indexOf(input['idmat[]'][w])].idproduccion.split(',')[0], 1, input['from[]'][w], 's', input['coment[]'][w]]);
                                    //SE ELIMINA EL REGISTRO DEL ARRAY
                                    //prod.splice(idmats.indexOf(input['idmat[]'][w]),1);
                                }else{
                                    //SE ELIMINA EL PRIMER ITEM DE prod'input['from[]'] Y ids'input['from[]']
                                    aux = prod[idmats.indexOf(input['idmat[]'][w])]['prod'+input['from[]'][w]].split(',');
                                    aux.splice(0,1);
                                    prod[idmats.indexOf(input['idmat[]'][w])]['prod'+input['from[]'][w]] = aux.join(',');

                                    aux_idprod = prod[idmats.indexOf(input['idmat[]'][w])]['ids'+input['from[]'][w]].split(',')[0];
                                    rech.push([input['colada[]'][w], input['producto[]'][w], input['causal[]'][w]]);
                                    hist.push([prod[idmats.indexOf(input['idmat[]'][w])].idproduccion.split(',')[0], 1, input['from[]'][w], 's', input['coment[]'][w]]);

                                    aux = prod[idmats.indexOf(input['idmat[]'][w])]['ids'+input['from[]'][w]].split(',');
                                    aux.splice(0,1);
                                    prod[idmats.indexOf(input['idmat[]'][w])]['ids'+input['from[]'][w]] = aux.join(',');
                                }
                            }
                            else{
                                //SE DESCUENTA 1 DEL PRIMER ITEM DE prod.cdc
                                aux = prod[idmats.indexOf(input['idmat[]'][w])]['prod'+input['from[]'][w]].split(',');
                                aux[0] = aux[0]-1;
                                prod[idmats.indexOf(input['idmat[]'][w])]['prod'+input['from[]'][w]] = aux.join(',');

                                aux_idprod = prod[idmats.indexOf(input['idmat[]'][w])]['ids'+input['from[]'][w]].split(',')[0];
                                rech.push([input['colada[]'][w], input['producto[]'][w], input['causal[]'][w]]);
                                hist.push([prod[idmats.indexOf(input['idmat[]'][w])]['ids'+input['from[]'][w]].split(',')[0], 1, input['from[]'][w], 's', input['coment[]'][w]]);
                            }

                            //DATA QUE SE INSERTA A produccionh_causal
                            //[[idcausal_etapacausal (toke), idproduccion_h],[idcausal_etapacausal (token), idproduccion_h], ...]
                            rech_causal.push([input['causal[]'][w], 0]);

                            if (!(aux_idprod.toString() in prod_acu)){
                                prod_acu[aux_idprod.toString()] = {};
                                prod_acu[aux_idprod.toString()][input['from[]'][w]] = 1;

                            }
                            else{prod_acu[aux_idprod.toString()][input['from[]'][w]] += 1;}
                        }
                    }
                    console.log(prod_acu);

                    var queryUpProdMol = "";
                    var queryUpProdFus = "";
                    var queryUpProdQui = "";
                    var queryUpProdTer = "";
                    var queryUpProdTto = "";
                    var queryUpProdMae = "";
                    var queryUpProdCdc = "";
                    var queryUpProdRech = "";
                    var idprod_rech = {};
                    /*
                    * {
                    * idprod1: acumRech1;
                    * idprod2: acumRech2;
                    * idprod3: acumRech3;
                    * }
                    * */
                    //SE RECORRE EL OBJETO prod_acu CON LAS CANTIDADES ACULMULADAS.
                    for(var t=0; t < Object.keys(prod_acu).length; t++ ){
                        for(var e=0; e < Object.keys(prod_acu[Object.keys(prod_acu)[t]]).length; e++ ){
                            if(!idprod_rech[Object.keys(prod_acu)[t]]){
                                idprod_rech[Object.keys(prod_acu)[t]] = 0;
                            }
                            idprod_rech[Object.keys(prod_acu)[t]] += 1;
                            switch (Object.keys(prod_acu[Object.keys(prod_acu)[t]])[e]) {
                                case '1':
                                    queryUpProdMol = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`1` - "+prod_acu[Object.keys(prod_acu)[t]]['1']
                                    break;
                                case '2':
                                    queryUpProdFus = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`2` - "+prod_acu[Object.keys(prod_acu)[t]]['2']
                                    break;
                                case '3':
                                    queryUpProdQui = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`3` - "+prod_acu[Object.keys(prod_acu)[t]]['3']
                                    break;
                                case '4':
                                    queryUpProdTer = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`4` - "+prod_acu[Object.keys(prod_acu)[t]]['4']
                                    break;
                                case '5':
                                    queryUpProdTto = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`5` - "+prod_acu[Object.keys(prod_acu)[t]]['5']
                                    break;
                                case '6':
                                    queryUpProdMae = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`6` - "+prod_acu[Object.keys(prod_acu)[t]]['6']
                                    break;
                                case '7':
                                    queryUpProdCdc = " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`7` - "+prod_acu[Object.keys(prod_acu)[t]]['7']
                                    break;
                            }
                        }
                        //queryUpProdCdc += " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.`7` - "+prod_acu[Object.keys(prod_acu)[t]];
                        //queryUpProdRech += " WHEN idproduccion = "+Object.keys(prod_acu)[t]+" THEN produccion.standby + "+prod_acu[Object.keys(prod_acu)[t]];
                    }

                    for(var q=0; q < Object.keys(idprod_rech).length; q++){
                        queryUpProdRech += " WHEN idproduccion = "+Object.keys(idprod_rech)[q]+" THEN produccion.standby + "+idprod_rech[Object.keys(idprod_rech)[q]];
                    }

                    queryUpProdMol = "UPDATE produccion SET produccion.`1` = CASE "+queryUpProdMol+" ELSE produccion.`1` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdFus = "UPDATE produccion SET produccion.`2` = CASE "+queryUpProdFus+" ELSE produccion.`2` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdQui = "UPDATE produccion SET produccion.`3` = CASE "+queryUpProdQui+" ELSE produccion.`3` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdTer = "UPDATE produccion SET produccion.`4` = CASE "+queryUpProdTer+" ELSE produccion.`4` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdTto = "UPDATE produccion SET produccion.`5` = CASE "+queryUpProdTto+" ELSE produccion.`5` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdMae = "UPDATE produccion SET produccion.`6` = CASE "+queryUpProdMae+" ELSE produccion.`6` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdCdc = "UPDATE produccion SET produccion.`7` = CASE "+queryUpProdCdc+" ELSE produccion.`7` END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";
                    queryUpProdRech = "UPDATE produccion SET produccion.standby = CASE "+queryUpProdRech+" ELSE produccion.standby END WHERE produccion.idproduccion IN ("+Object.keys(prod_acu).join(',')+")";



                    connection.query("INSERT INTO produccion_history (`idproduccion`, `enviados`, `from`, `to`, `comentario`) VALUES ?", [hist], function(err, inProdHist){
                        if(err){console.log("Error Inserting : %s", err);}

                        for(var a=0; a < rech.length; a++){
                            rech[a].push(inProdHist.insertId + a);
                        }
                        for(var e=0; e < rech.length; e++){
                            rech_causal[e][1] = inProdHist.insertId + e;
                        }
                        var rech_causal2 = [];
                        for(var i=0; i < rech_causal.length; i++){
                            rech_causal[i][0] = rech_causal[i][0].split('-');
                            for(var o=0; o < rech_causal[i][0].length; o++){
                                rech_causal2.push([ rech_causal[i][0][o], rech_causal[i][1] ]);
                            }
                        }


                        connection.query("INSERT INTO rechazos_cdc (`colada`, `producto`, `causal`, `idproduccion_h`) VALUES ?", [rech], function(err, inRechCdc){
                            if(err){console.log("Error Inserting : %s", err);}

                            console.log("inRechCdc");
                            console.log(inRechCdc);

                            connection.query("INSERT INTO produccionh_causal (`idcausal_etapacausal`, `idproduccion_h`) VALUES ?", [rech_causal2], function(err, inProdHistCau) {
                                if (err) {console.log("Error Inserting : %s", err);}

                                console.log("inProdHistCau");
                                console.log(inProdHistCau);
                                connection.query(queryUpProdMol, function(err, upProdMol){
                                    if(err){console.log("Error Updating : %s", err);}
                                    connection.query(queryUpProdFus, function(err, upProdFus){
                                        if(err){console.log("Error Updating : %s", err);}

                                        connection.query(queryUpProdQui, function(err, upProdQui){
                                            if(err){console.log("Error Updating : %s", err);}

                                            connection.query(queryUpProdTer, function(err, upProdTer){
                                                if(err){console.log("Error Updating : %s", err);}

                                                connection.query(queryUpProdTto, function(err, upProdTto){
                                                    if(err){console.log("Error Updating : %s", err);}

                                                    connection.query(queryUpProdMae, function(err, upProdMae){
                                                        if(err){console.log("Error Updating : %s", err);}

                                                        connection.query(queryUpProdCdc, function(err, upProdCdc){
                                                            if(err){console.log("Error Updating : %s", err);}

                                                            connection.query(queryUpProdRech, function(err, upProdRech){
                                                                if(err){console.log("Error Updating : %s", err);}

                                                                console.log(upProdRech);

                                                                res.send("¡Rechazo registrado con exito!");
                                                            });
                                                        });
                                                    });
                                                });

                                            });
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


router.post('/save_production_rech_prod', function(req, res, next){
    if(verificar(req.session.userData)){
        var base64Img = require('base64-img');
        var input = JSON.parse(JSON.stringify(req.body));
        var rech = [];
        var rech_causal = [];
        if(typeof input['idmat[]'] === 'string'){
            input = {
                'idmat[]': [input['idmat[]']],
                'env[]': [input['env[]']],
                'fecha[]': [input['fecha[]']],
                'coment[]': [input['coment[]']],
                'colada[]': [input['colada[]']],
                'producto[]': [input['producto[]']],
                'causal[]': [input['causal[]']],
                'causal_check[]': [input['causal_check[]']],
                'area[]': [input['area[]']],
                'from[]': [input['from[]']],
                'idprodh[]': [input['idprodh[]']],
                'image[]': [input['image[]']],
                'image_type[]': [input['image_type[]']]
            };
        }
        console.log(input);
        req.getConnection(function(err, connection){
            if(err){console.log("Error Connecting : %s");}

            for(var w=0; w < input['idmat[]'].length; w++){
                rech.push([input['colada[]'][w], input['producto[]'][w], input['causal[]'][w], input['idprodh[]'][w], input['image_type[]'][w] ]);
                //DATA QUE SE INSERTA A produccionh_causal
                //[[idcausal_etapacausal (toke), idproduccion_h],[idcausal_etapacausal (token), idproduccion_h], ...]
                for(var q=0; q < input['causal[]'][w].split('-').length; q++){
                    if( input['causal_check[]'][w].split('-')[q] === 'true' ){
                        rech_causal.push([input['causal[]'][w].split('-')[q], input['idprodh[]'][w], true]);
                    }
                    else{
                        rech_causal.push([input['causal[]'][w].split('-')[q], input['idprodh[]'][w], false]);
                    }
                }
            }
            connection.query("INSERT INTO rechazos_cdc (`colada`, `producto`, `causal`, `idproduccion_h`, `imagen_tipo`) VALUES ?", [rech], function(err, inRechCdc){
                if(err){console.log("Error Inserting : %s", err);}
                connection.query("INSERT INTO produccionh_causal (`idcausal_etapacausal`, `idproduccion_h`, `princ`) VALUES ?", [rech_causal], function(err, inProdHistCau) {
                    if (err) {console.log("Error Inserting : %s", err);}

                    for(var w=0; w < input['idmat[]'].length; w++){
                        //SE GUARDA LA IMAGEN
                        if(input['image[]'][w] !== '' && input['image[]'][w] !== ' ' && input['image[]'][w] !== null && input['image[]'][w] !== undefined){
                            base64Img.img(input['image[]'][w], "public/img/rechazos", "rechazo"+input['idprodh[]'][w],
                                function (err, filepath) {
                                    if(err){console.log("Error al Subir Imagen : %s", err);}
                                    else{console.log(filepath);}
                                }
                            );
                        }
                    }


                    res.send("¡Rechazo registrado con exito!");
                });
            });
        });
    }
    else{res.redirect('bad_login');}
});


function getArrayKey(key, obj){
    var arr = [];
    obj.map(function(item){
        arr.push(item[key].toString());
    });
    return arr;
}


//FUNCION QUE ORDENA EL PRIMER ARRAY DE MENOR A MAYOR
//Y LUEGO APLICA LOS MISMOS MOVIMIENTOS AL SEGUNDO ARRAY
//AMBOS ARRAY DEBEN TENER EL MISMO LARGO
function orderTwoArrayAsc(arr1, arr2){
    var k;
    for(var t = 0; t < arr1.length; t++)
    {
        for(var j = 0; j < (arr1.length-t); j++){
            if(arr1[j]>arr1[j+1]) {
                k=arr1[j+1];
                arr1[j+1]=arr1[j];
                arr1[j]=k;

                k=arr2[j+1];
                arr2[j+1]=arr2[j];
                arr2[j]=k;
            }
        }
    }

    //RETORNA UNA ARREGLO DE 2 ITEM CON AMBAS LISTAS ORDENADAS
    return [arr1, arr2];
}



router.get('/view_rechazos', function(req, res, next){
    if(verificar(req.session.userData)) {
        res.render('calidad/view_rechazos' ,{username: req.session.userData.nombre});
    }
    else{res.redirect('bad_login');}
});



router.post('/table_rechazos', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var agrupar = input.extraInfo;
        var array_fill = [
            "mainTable.detalle",
            "mainTable.colada",
            "mainTable.producto",
            "mainTable.sigla"
        ];
        var object_fill = {
            "mainTable.detalle-off": [],
            "mainTable.colada-off": [],
            "mainTable.producto-off": [],
            "mainTable.sigla-off": [],
            "mainTable.detalle-on": [],
            "mainTable.colada-on": [],
            "mainTable.producto-on": [],
            "mainTable.sigla-on": []
        };
        var condiciones_where = [];

        if(input.cond !== '') {
            for (var e = 0; e < input.cond.split('@').length; e++) {
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }
        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);
        var where = result[0];
        var limit = result[1];
        var query;
        var view = '';
        /*Fecha ,
                    Descripción Producto (p),
                    Área de Rechazo,
                    OF,	OP,
                    Código Único de Colada,
                    Correlativo Producto,
                    Peso Unitario [kg] (p),
                    Causal de Rechazo,
                    Etapa Causal de Rechazo,
                    Imagen

                    CANTIDAD*/
        switch(agrupar){
            case 'desc':
                query = "SELECT mainTable.*, SUM(mainTable.enviados) AS total_rechazados," +
                    "GROUP_CONCAT(CONCAT(" +
                    "mainTable.etapa_desde,'@', " +
                    "mainTable.colada,'@', " +
                    "mainTable.producto,'@', " +
                    "mainTable.fecha_rech,'@', " +
                    "mainTable.causal,'@', " +
                    "mainTable.etapacausal,'@', " +
                    "mainTable.idop,'@', " +
                    "mainTable.idof,'@', " +
                    "mainTable.causal_princ) SEPARATOR '%') AS det_rech" +
                    " FROM (SELECT \n" +
                    "\t\t\t\t\tproduccionh_causal.idproduccion_h,\n" +
                    "                    fabricaciones.idmaterial, \n" +
                    "                    pedido.idpedido, \n" +
                    "                    fabricaciones.idfabricaciones, \n" +
                    "                    COALESCE(cliente.sigla, ' - ') AS sigla, \n" +
                    "                    material.detalle, \n" +
                    "                    material.peso, \n" +
                    "                    produccion_history.enviados, \n" +
                    "                    COALESCE(rechazos_cdc.colada, ' - ') AS colada, \n" +
                    "                    COALESCE(rechazos_cdc.producto, ' - ') AS producto, \n" +
                    "                    GROUP_CONCAT(causal.causal SEPARATOR '-') AS causal,\n" +
                    "                    GROUP_CONCAT(produccionh_causal.princ SEPARATOR '-') AS causal_princ,\n" +
                    "                    GROUP_CONCAT(etapacausal.nombre SEPARATOR '-') AS etapacausal, \n" +
                    "                    etapafaena.nombre_etapa AS etapa_desde, \n" +
                    "                    rechazos_cdc.fecha AS fecha_rech, fabricaciones.idorden_f AS idof, produccion.idordenproduccion AS idop \n" +
                    "                    FROM produccionh_causal  \n" +
                    "                    LEFT JOIN produccion_history ON produccion_history.idproduccion_history = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN produccion ON produccion.idproduccion = produccion_history.idproduccion \n" +
                    "                    LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones \n" +
                    "                    LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
                    "                    LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                    "                    LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                    "                    LEFT JOIN cliente ON cliente.idcliente = odc.idcliente \n" +
                    "                    LEFT JOIN rechazos_cdc ON rechazos_cdc.idproduccion_h = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN causal_etapacausal ON causal_etapacausal.idcausal_etapacausal = produccionh_causal.idcausal_etapacausal\n" +
                    "                    LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal \n" +
                    "                    LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal \n" +
                    "                    LEFT JOIN etapafaena ON produccion_history.from = etapafaena.value GROUP BY rechazos_cdc.idproduccion_h) AS mainTable " +
                    where +" GROUP BY mainTable.idmaterial "+limit
                view = "table_rechazos_prod"
                break;

            case 'colada':
                query = "SELECT mainTable.*,SUM(COALESCE(mainTable.peso,0)) AS pesoTotal, SUM(COALESCE(mainTable.enviados,0)) AS enviadosTotal, " +
                    "GROUP_CONCAT(" +
                    "CONCAT(" +
                    "mainTable.detalle,'@'," +
                    "mainTable.enviados,'@'," +
                    "mainTable.peso,'@'," +
                    "mainTable.etapa_desde,'@'," +
                    "mainTable.producto,'@'," +
                    "mainTable.fecha_rech,'@'," +
                    "mainTable.causal,'@'," +
                    "mainTable.etapacausal,'@'," +
                    "mainTable.idop,'@'," +
                    "mainTable.idof,'@'," +
                    "mainTable.causal_princ) SEPARATOR '%%') AS det_rech FROM (SELECT \n" +
                    "\t\t\t\t\trechazos_cdc.idproduccion_h,\n" +
                    "                    material.idmaterial, \n" +
                    "                    pedido.idpedido, \n" +
                    "                    fabricaciones.idfabricaciones, \n" +
                    "                    COALESCE(cliente.sigla, ' - ') AS sigla, \n" +
                    "                    material.detalle, \n" +
                    "                    material.peso, \n" +
                    "                    produccion_history.enviados, \n" +
                    "                    COALESCE(rechazos_cdc.colada, ' - ') AS colada, \n" +
                    "                    COALESCE(rechazos_cdc.producto, ' - ') AS producto, \n" +
                    "                    GROUP_CONCAT(causal.causal SEPARATOR '-') AS causal,\n" +
                    "                    GROUP_CONCAT(produccionh_causal.princ SEPARATOR '-') AS causal_princ,\n" +
                    "                    GROUP_CONCAT(etapacausal.nombre SEPARATOR '-') AS etapacausal, \n" +
                    "                    etapafaena.nombre_etapa AS etapa_desde, \n" +
                    "                    rechazos_cdc.fecha as fecha_rech, fabricaciones.idorden_f AS idof, produccion.idordenproduccion AS idop \n" +
                    "                    FROM produccionh_causal  \n" +
                    "                    LEFT JOIN produccion_history ON produccion_history.idproduccion_history = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN produccion ON produccion.idproduccion = produccion_history.idproduccion \n" +
                    "                    LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones \n" +
                    "                    LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
                    "                    LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                    "                    LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                    "                    LEFT JOIN cliente ON cliente.idcliente = odc.idcliente \n" +
                    "                    LEFT JOIN rechazos_cdc ON rechazos_cdc.idproduccion_h = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN causal_etapacausal ON causal_etapacausal.idcausal_etapacausal = produccionh_causal.idcausal_etapacausal\n" +
                    "                    LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal \n" +
                    "                    LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal \n" +
                    "                    LEFT JOIN etapafaena ON produccion_history.from = etapafaena.value GROUP BY rechazos_cdc.idproduccion_h) AS mainTable " +
                    where +" GROUP BY mainTable.colada "+limit
                view = "table_rechazos_col"
                break;

            case 'causal':
                query = "SELECT mainTable.*, SUM(peso_total) AS peso_total, " +
                    "GROUP_CONCAT(" +
                    "CONCAT(" +
                    "mainTable.detalle,'@'," +
                    "mainTable.fecha_rech,'@', " +
                    "mainTable.idof,'@', " +
                    "mainTable.idop,'@', " +
                    "mainTable.colada,'@', " +
                    "mainTable.producto,'@', " +
                    "mainTable.enviados,'@', " +
                    "mainTable.peso,'@', " +
                    "mainTable.etapa_desde) SEPARATOR '%%') AS det_rech, " +
                    "SUM(mainTable.enviados) AS total_rechazados " +
                    "FROM (SELECT \n" +
                    "\t\t\t\t\trechazos_cdc.idproduccion_h,\n" +
                    "                    material.idmaterial, \n" +
                    "                    pedido.idpedido, \n" +
                    "                    fabricaciones.idfabricaciones, \n" +
                    "                    COALESCE(cliente.sigla, ' - ') AS sigla, \n" +
                    "                    material.detalle, \n" +
                    "                    material.peso, material.peso*produccion_history.enviados AS peso_total, \n" +
                    "                    produccion_history.enviados, \n" +
                    "                    COALESCE(rechazos_cdc.colada, ' - ') AS colada, \n" +
                    "                    COALESCE(rechazos_cdc.producto, ' - ') AS producto, \n" +
                    "                    causal.causal,causal.idcausal,\n" +
                    "                    etapacausal.nombre AS etapacausal,etapacausal.idetapacausal, \n" +
                    "                    etapafaena.nombre_etapa AS etapa_desde, " +
                    "                    produccionh_causal.idcausal_etapacausal, \n" +
                    "                    rechazos_cdc.fecha as fecha_rech, fabricaciones.idorden_f AS idof, produccion.idordenproduccion AS idop \n" +
                    "                    FROM produccionh_causal  \n" +
                    "                    LEFT JOIN produccion_history ON produccion_history.idproduccion_history = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN produccion ON produccion.idproduccion = produccion_history.idproduccion \n" +
                    "                    LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones \n" +
                    "                    LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
                    "                    LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                    "                    LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                    "                    LEFT JOIN cliente ON cliente.idcliente = odc.idcliente \n" +
                    "                    LEFT JOIN rechazos_cdc ON rechazos_cdc.idproduccion_h = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN causal_etapacausal ON causal_etapacausal.idcausal_etapacausal = produccionh_causal.idcausal_etapacausal\n" +
                    "                    LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal \n" +
                    "                    LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal \n" +
                    "                    LEFT JOIN etapafaena ON produccion_history.from = etapafaena.value) AS mainTable " +
                    where +" GROUP BY mainTable.idcausal_etapacausal "+limit
                view = "table_rechazos_cau"
                break;

            default:
                query = "SELECT * FROM (SELECT \n" +
                    "\t\t\t\t\trechazos_cdc.idproduccion_h,rechazos_cdc.imagen_tipo,\n" +
                    "                    material.idmaterial, \n" +
                    "                    pedido.idpedido, \n" +
                    "                    fabricaciones.idfabricaciones, \n" +
                    "                    COALESCE(cliente.sigla, ' - ') AS sigla, \n" +
                    "                    material.detalle, \n" +
                    "                    material.peso, \n" +
                    "                    produccion_history.enviados, \n" +
                    "                    COALESCE(rechazos_cdc.colada, ' - ') AS colada, \n" +
                    "                    COALESCE(rechazos_cdc.producto, ' - ') AS producto, \n" +
                    "                    GROUP_CONCAT(causal.causal SEPARATOR '@') AS causal, \n" +
                    "                    GROUP_CONCAT(produccionh_causal.princ SEPARATOR '@') AS causal_princ,\n" +
                    "                    GROUP_CONCAT(etapacausal.nombre SEPARATOR '@') AS etapacausal, \n" +
                    "                    etapafaena.nombre_etapa AS etapa_desde, \n" +
                    "                    rechazos_cdc.fecha as fecha_rech, fabricaciones.idorden_f AS idof, produccion.idordenproduccion AS idop \n" +
                    "                    FROM produccionh_causal  \n" +
                    "                    LEFT JOIN produccion_history ON produccion_history.idproduccion_history = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN produccion ON produccion.idproduccion = produccion_history.idproduccion \n" +
                    "                    LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones \n" +
                    "                    LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
                    "                    LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                    "                    LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                    "                    LEFT JOIN cliente ON cliente.idcliente = odc.idcliente \n" +
                    "                    LEFT JOIN rechazos_cdc ON rechazos_cdc.idproduccion_h = produccionh_causal.idproduccion_h \n" +
                    "                    LEFT JOIN causal_etapacausal ON causal_etapacausal.idcausal_etapacausal = produccionh_causal.idcausal_etapacausal\n" +
                    "                    LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal \n" +
                    "                    LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal \n" +
                    "                    LEFT JOIN etapafaena ON produccion_history.from = etapafaena.value GROUP BY rechazos_cdc.idproduccion_h) AS mainTable " +
                    where +" "+limit
                view = "table_rechazos"
                break;
        }
        req.getConnection(function(err, connection){
            if(err) throw err;

            connection.query("SET SESSION group_concat_max_len = 1000000",
                function(err, setLength){
                    if(err) throw err;


                    connection.query(query,
                        function(err, rech){
                            if(err) throw err;

                            console.log('calidad/'+view);
                            res.render('calidad/'+view, {datalen: rech, user: req.session.userData.nombre });
                    });
            });
        });
    }
    else{res.redirect('bad_login');}
}); //reSearch() pa la purga


router.get('/render_notificaciones', function(req, res, next){
    req.getConnection(function(err,connection){
        if(err){
            console.log("Error Connection : %s", err);
        }
        connection.query("SELECT notificacion.* FROM notificacion " +
            "WHERE (descripcion LIKE 'cdcBloc@%' AND active = true)",
            function(err, notif){
                if(err){
                    console.log("Error Selecting : %s", err);
                }


                res.render('calidad/notificaciones', {notif: notif});

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
                res.redirect('/calidad/render_notificaciones');
            });
    });
});



router.get('/xlsx_rech', function(req,res){
    if(verificar(req.session.userData)){
        console.log("¡Profesor Jirafales!");
        var fs = require('fs');
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('rechmaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');

        console.log("¡Doña Florinda!");
        sheet.columns = [
            { header: 'Fecha de Rechazo', key: 'fecha', width: 15 },
            { header: 'Hora de Rechazo', key: 'hora', width: 15 },
            { header: 'Descripción Producto', key: 'desc', width: 15 },
            { header: 'Área de Rechazo', key: 'area', width: 15 },
            { header: 'OF', key: 'of', width: 15 },
            { header: 'OP', key: 'op', width: 15 },
            { header: 'Código de Colada', key: 'codcol', width: 15 },
            { header: 'Corr Producto', key: 'corrprod', width: 80 },
            { header: 'Peso Unitario [Kg]', key: 'peso', width: 15 },
            { header: 'Causal de Rechazo', key: 'causal', width: 15 },
            { header: 'Etapa Causal de Rechazo', key: 'etapa', width: 15 }
        ];
        console.log("¿no gusta pasar a tomar una tasita de cafe?");

        sheet.getRow(1).font = {
            name: 'Calibri',
            family: 4,
            size: 11,
            underline: false,
            bold: true
        };
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);

            var query = "SELECT mainTable.* FROM (SELECT \n" +
                "\t\t\t\t\tproduccionh_causal.idproduccion_h,\n" +
                "                    fabricaciones.idmaterial, \n" +
                "                    pedido.idpedido, \n" +
                "                    fabricaciones.idfabricaciones, \n" +
                "                    COALESCE(cliente.sigla, ' - ') AS sigla, \n" +
                "                    material.detalle, \n" +
                "                    material.peso, \n" +
                "                    produccion_history.enviados, \n" +
                "                    COALESCE(rechazos_cdc.colada, ' - ') AS colada, \n" +
                "                    COALESCE(rechazos_cdc.producto, ' - ') AS producto, \n" +
                "                    causal.causal,\n" +
                "                    etapacausal.nombre AS etapacausal, \n" +
                "                    etapafaena.nombre_etapa AS etapa_desde, \n" +
                "                    produccion_history.fecha, fabricaciones.idorden_f AS idof, produccion.idordenproduccion AS idop \n" +
                "                    FROM produccionh_causal  \n" +
                "                    LEFT JOIN produccion_history ON produccion_history.idproduccion_history = produccionh_causal.idproduccion_h \n" +
                "                    LEFT JOIN produccion ON produccion.idproduccion = produccion_history.idproduccion \n" +
                "                    LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones \n" +
                "                    LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial \n" +
                "                    LEFT JOIN pedido ON pedido.idpedido = fabricaciones.idpedido \n" +
                "                    LEFT JOIN odc ON odc.idodc = pedido.idodc \n" +
                "                    LEFT JOIN cliente ON cliente.idcliente = odc.idcliente \n" +
                "                    LEFT JOIN rechazos_cdc ON rechazos_cdc.idproduccion_h = produccionh_causal.idproduccion_h \n" +
                "                    LEFT JOIN causal_etapacausal ON causal_etapacausal.idcausal_etapacausal = produccionh_causal.idcausal_etapacausal\n" +
                "                    LEFT JOIN causal ON causal.idcausal = causal_etapacausal.idcausal \n" +
                "                    LEFT JOIN etapacausal ON etapacausal.idetapacausal = causal_etapacausal.idetapacausal \n" +
                "                    LEFT JOIN etapafaena ON produccion_history.from = etapafaena.value GROUP BY rechazos_cdc.idproduccion_h) AS mainTable";
            console.log("¿No será mucha molestia?");

            connection.query(query,
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    console.log("Por supuesto que no pase usted");
                    if(rows.length>0){
                        var nombre = 'csvs/master_rech_' + ident + '.xlsx';
                        var numitem = 0;
                        var fechaInicio;
                        var fechaFin;
                        var diff = 0;
                        var auxrow;

                        sheet.getRow(1).fill = {
                            type: 'pattern',
                            pattern:'solid',
                            fgColor:{argb:'F4D03F'}
                        };
                        sheet.getRow(1).font = {
                            name: 'Comic Sans MS',
                            family: 4,
                            size: 11,
                            underline: false,
                            bold: true
                        };
                        // Fecha de Rechazo
                        // Hora de Rechazo
                        // Descripción Producto
                        // Área de Rechazo
                        // OF
                        // OP
                        // Código Único de Colada
                        // Corr. Producto
                        // Peso Unitario [Kg]
                        // Causal de Rechazo
                        // Etapa Causal de Rechazo
                        for(var j=0; j < rows.length; j++){
                            numitem++;
                            auxrow = 2 + j;
                            console.log(auxrow);
                            sheet.getCell('A' + auxrow.toString()).value = rows[j].fecha;
                            sheet.getCell('B' + auxrow.toString()).value = rows[j].fecha;
                            sheet.getCell('C' + auxrow.toString()).value = rows[j].detalle;
                            sheet.getCell('D' + auxrow.toString()).value = rows[j].etapa_desde;
                            sheet.getCell('E' + auxrow.toString()).value = rows[j].idof;
                            sheet.getCell('F' + auxrow.toString()).value = rows[j].idop;
                            sheet.getCell('G' + auxrow.toString()).value = rows[j].colada;
                            sheet.getCell('H' + auxrow.toString()).value = rows[j].producto;
                            sheet.getCell('I' + auxrow.toString()).value = rows[j].peso;
                            sheet.getCell('J' + auxrow.toString()).value = rows[j].causal;
                            sheet.getCell('K' + auxrow.toString()).value = rows[j].etapacausal;
                        }

                        console.log("Despues de usted");
                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
                                console.log("Aaww");
                                res.send('/csvs/master_rech_'+ ident + '.xlsx');

                            });
                    }

                });
        });
    }
    else res.redirect('/bad_login');
});



module.exports = router;
