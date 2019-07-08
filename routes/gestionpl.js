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
        res.render('gestionpl/indx',{page_title:"Gestión Planta",username: req.session.userData.nombre});}
    else{res.redirect('bad_login');}
});

router.get('/create_production_history', function(req, res, next){
    if(verificar(req.session.userData)){
        var query = "SELECT * FROM (SELECT producido.ruta,ordenproduccion.f_gen as creacion ,material.idmaterial,SUM(produccion.standby) as standby, SUM(produccion.`1`) as `1`,SUM(produccion.`2`) as `2`,SUM(produccion.`3`) as `3`,SUM(produccion.`4`) as `4`,SUM(produccion.`5`) as `5`,"
            + "SUM(produccion.`6`) as `6`,SUM(produccion.`7`) as `7`,SUM(produccion.`8`) as `8`, GROUP_CONCAT(produccion.idproduccion separator ' - ') as idproduccion, '-' as trats,"
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
        console.log(input);
        console.log(typeof input['idmat[]']);
        if(typeof input['idmat[]'] === 'string'){
            recursive_save_ph(input['idmat[]'],input['env[]'],input['from[]'],input['to[]']," ");
        }
        else{
            for(var e=0; e < input['idmat[]'].length; e++){
                recursive_save_ph(input['idmat[]'][e],input['env[]'][e],input['from[]'][e],input['to[]'][e]," ");
            }
        }
        res.send("¡Movimiento Diario registrado con exito!");

    }
    else{res.redirect('bad_login');}
});

function recursive_save_ph(idmat,env,from,to,obs){
    if(conn){
        conn.query("select " +
            "material.detalle,material.idmaterial,group_concat(produccion.idproduccion SEPARATOR '-') as idprod, group_concat(produccion."+from+" SEPARATOR '-') as cantprod " +
            "from produccion " +
            "left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones " +
            "left join material on material.idmaterial=fabricaciones.idmaterial " +
            "where produccion.cantidad > produccion.8 + produccion.standby and produccion."+from+">0 and material.idmaterial = ? group by material.idmaterial", [idmat], function(err, rows){
            if(err) throw err;

            console.log(rows);
            console.log("QUERY FUNCION");
            /*
            * { idprod: '22725-22716-22717',
                  cantprod: '400-391-300',
                  newetapa: '2',
                  sendnum: '91',
                  etapa_act: '1' };
            * */
            var input = {
                idprod: rows[0].idprod,
                cantprod: rows[0].cantprod,
                newetapa: to,
                sendnum: env,
                etapa_act: from
            };
            console.log(input);
            /*
            * input.cantprod: token separado por comas que representa el saldo disponible en cada producción (según la etapa)
            *
            * */
            /*
            * UPDATE `table` SET `uid` = CASE
                    WHEN id = 1 THEN 2952
                    WHEN id = 2 THEN 4925
                    WHEN id = 3 THEN 1592
                    ELSE `uid`
                    END
                WHERE id  in (1,2,3)
            **/
            input.idprod = input.idprod.split('-');
            input.cantprod = input.cantprod.split('-');
            var query = "UPDATE produccion SET produccion.`"+input.etapa_act+"` = CASE ";
            var query2 = "UPDATE produccion SET produccion.`"+input.newetapa+"` = CASE ";

            var ids = "";
            var cant_aux = parseInt(input.sendnum);
            var history = [];

            for(var w=0; w < input.idprod.length; w++){
                cant_aux -= parseInt(input.cantprod[w]);
                if(cant_aux > 0){
                    // SI cant_aux ES MAYOR A CERO SIGNIFICA QUE SE UTILIZO TODO EL SALDO DE LA PRODUCCION
                    query += " WHEN idproduccion ="+input.idprod[w]+" THEN 0";
                    query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+input.cantprod[w];
                    //history.push({idproduccion: input.idprod[w],enviados: input.cantprod[w],from: input.etapa_act,to:input.newetapa});
                    if(input.cantprod[w] > 0){
                        history.push([input.idprod[w], input.cantprod[w], input.etapa_act, input.newetapa]);
                    }
                    ids += input.idprod[w]+",";
                }
                else{
                    /* EN CASO CONTRARIO QUEDA SALDO EN LA ETAPA */
                    query += " WHEN idproduccion ="+input.idprod[w]+" THEN "+Math.abs(cant_aux);
                    query2 += " WHEN idproduccion ="+input.idprod[w]+" THEN produccion.`"+input.newetapa+"` + "+(cant_aux+parseInt(input.cantprod[w]));
                    //history.push({idproduccion: input.idprod[w],enviados: cant_aux+parseInt(input.cantprod[w]),from: input.etapa_act,to:input.newetapa});
                    history.push([input.idprod[w], cant_aux+parseInt(input.cantprod[w]), input.etapa_act, input.newetapa]);
                    ids += input.idprod[w]+",";
                    break;
                }
            }
            var notif =  {cant: input.sendnum, idproduccion: input.idprod};
            query += " ELSE produccion.`"+input.etapa_act+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")";
            query2 += " ELSE produccion.`"+input.newetapa+"` END WHERE idproduccion IN (" +ids.substring(0, ids.length-1) +")";
            conn.query(query ,function(err,upProd1){
                if(err) throw err;

                conn.query(query2 ,function(err,upProd2){
                    if(err) throw err;

                    conn.query("INSERT INTO produccion_history (`idproduccion`, `enviados`, `from`, `to`) VALUES ?",[history],function(err,insert_h){
                        if(err) throw err;

                    });
                });
            });
            setTimeout(function(){return true;}, 250);
        });
    }
}



module.exports = router;
