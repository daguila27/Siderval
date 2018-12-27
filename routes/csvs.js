
var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{
        host: '127.0.0.1',
        user: 'user',
        password : '1234',
        port : 3306,
        database:'siderval',
        insecureAuth : true
    },'pool')
);



router.get('/parsecsv_inventario', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var of_list = [];
                var fabs_query = '';
                var ids_query = '';
                var prod_list = [];
                var numof = [];
                var op_list = [];
                var fecha = new Date().toLocaleDateString();
                var fabs_list = [];
                var cuenta = 1;
                var can;
                for(var i=1; i < rows.length; i++){
                    if(numof.indexOf(rows[i][1]) == -1 ){
                        if(rows[i][1] == ''){
                            of_list.push([cuenta, fecha, 'incompleto']);
                            cuenta++;
                        }
                        else{
                            of_list.push([rows[i][1], fecha, 'incompleto']);
                        }
                        //numof.push(rows[i][1]);
                        op_list.push([fecha]);
                    }
                    else{
                        if(rows[i][1] == ''){
                            of_list.push([cuenta, fecha, 'incompleto']);
                            cuenta++;
                        }
                        else{
                            of_list.push([rows[i][1], fecha, 'incompleto']);
                        }
                        numof.push(rows[i][1]);
                        op_list.push([fecha]);
                    }
                    if(rows[i][8] != ''){
                        can = rows[i][8];
                    }
                    else{
                        can = 0;
                    }
                    //fabs_list.push([0, rows[i][9], fecha]);
                    //fabs_query += "(@, "+can+", (SELECT COALESCE(producido.idmaterial,15273) FROM producido LEFT JOIN material ON (producido.idmaterial = material.idmaterial) WHERE material.codigo = '"+rows[i][4]+"' LIMIT 1), (SELECT COALESCE(producido.idproducto,6129) FROM producido LEFT JOIN material ON (producido.idmaterial = material.idmaterial) WHERE material.codigo = '"+rows[i][4]+"' LIMIT 1) ),";
                    fabs_list.push([0,fecha, can, can]);
                    ids_query += " material.codigo = '"+rows[i][4]+"' OR";

                    prod_list.push([0, 0,rows[i][9], 0, 0, 0, 0, 0, 0, 0, 0, 0]);
                    //console.log(i);
                    //console.log(prod_list[i-1]);
                    if(rows[i][3] == 'Moldeo' || rows[i][3] == 'Armado'){prod_list[i-1][3] = rows[i][9];}
                    if(rows[i][3] == 'Quiebre'){prod_list[i-1][5] = rows[i][9];}
                    if(rows[i][3] == 'Tto tco'){prod_list[i-1][7] = rows[i][9];}
                    if(rows[i][3] == 'Terminacion'){prod_list[i-1][6] = rows[i][9];}
                }
                fabs_query = fabs_query.substring(0, fabs_query.length-1);
                ids_query = ids_query.substring(0, ids_query.length-2);
                //console.log(of_list);
                //console.log(numof);
                //console.log(fabs_query);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("INSERT INTO ordenfabricacion (`numordenfabricacion`, `creacion`,`estado`) VALUES ?",[of_list],function(err,ofs){
                        if(err) {
                            throw err;
                        }
                        /*console.log(ofs.insertId + 1);
                        console.log("aff: " + ofs.affectedRows);
                        console.log("f_len: " + fabs_list.length);*/
                        //fabs_query.replace('@', "k");
                        for(var j = 0; j < fabs_list.length; j++){
                            //fabs_query = ofs.insertId + j;
                            var insId = ofs.insertId + j;
                            //fabs_query = fabs_query.replace( '@',  insId);
                            fabs_list[j][0] = insId;
                        }
                        connection.query("INSERT INTO ordenproduccion (`f_gen`) VALUES ?", [op_list], function(err, ops){
                            if(err) {
                                throw err;
                            }
                            /*console.log(ops.insertId + 1);
                            console.log("aff: " + ops.affectedRows);
                            console.log("f_len: " + prod_list.length);*/
                            for(var j = 0; j < prod_list.length; j++){
                                prod_list[j][1] = ops.insertId + j;
                            }
                            //console.log(prod_list);
                            connection.query("SELECT COALESCE(producido.idmaterial,999) as idmaterial, COALESCE(producido.idproducto,999) as idproducto FROM producido LEFT JOIN material ON (producido.idmaterial = material.idmaterial) WHERE "+ids_query, function(err, ids){
                                if(err){throw err;}
                                //console.log(ids.length);
                                for(var u=0; u < fabs_list.length; u++){
                                    if(u < ids.length){
                                        fabs_list[u] = fabs_list[u].concat([ids[u].idmaterial, ids[u].idproducto]);
                                        //prod_list[u] = prod_list[u].concat([ids[u].idmaterial, ids[u].idproducto]);
                                    }
                                    else{
                                        fabs_list[u] = fabs_list[u].concat([16710, 7566]);
                                        //prod_list[u] = prod_list[u].concat([16710, 7566]);
                                    }
                                }
                                //console.log(fabs_list);
                                connection.query("INSERT INTO fabricaciones (idorden_f, f_entrega, restantes, cantidad, idmaterial, idproducto) VALUES ?",[fabs_list], function(err, fab){
                                    if(err){throw err;}
                                    /*console.log(fab.insertId + 1);
                                    console.log("aff: " + fab.affectedRows);
                                    console.log("f_len: " + prod_list.length);*/
                                    //fabs_query.replace('@', "k");
                                    for(var j = 0; j < prod_list.length; j++){
                                        //fabs_query = ofs.insertId + j;
                                        var insId = fab.insertId + j;
                                        //fabs_query = fabs_query.replace( '@',  insId);
                                        prod_list[j][0] = insId;
                                    }
                                    console.log(prod_list);
                                    connection.query("INSERT INTO produccion (idfabricaciones, idordenproduccion, cantidad, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `standby`)"+
                                        " VALUES ?", [prod_list], function(err, produc){
                                        if(err) throw err;
                                        res.redirect('/plan');
                                    });
                                });
                            });


                        });

                    });
                });
            });
        var input = fs.createReadStream('csvs/csvinvcodigo.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});






router.get('/parsecsv_codigo', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                req.getConnection(function(err,connection){
                    for(var k=0; k < rows.length; k++){
                        if(err) throw err;
                        connection.query("UPDATE material SET codigo = ? WHERE detalle = ?",[rows[k][0], rows[k][1]],function(err,rows){
                            if(err) {
                                throw err;
                            }
                            ;
                        });
                    }
                });
                console.log("EXITO");
            });
        var input = fs.createReadStream('csvs/productos.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});



router.get('/parsecsv_codigoforged', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                req.getConnection(function(err,connection){
                    for(var k=0; k < rows.length; k++){
                        if(err) throw err;
                        connection.query("UPDATE material SET codigo = ? WHERE detalle = ?",[rows[k][0], rows[k][1]],function(err,rows){
                            if(err) {
                                throw err;
                            }
                        });
                    }
                });
                console.log("EXITO");
            });
        var input = fs.createReadStream('csvs/forged.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/parse_of', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var all_regist = [];
                var array_ids = [];
                var list_of = [];
                var list_fab = [];
                var list_op = [];
                var list_fab_aux = [];
                var numof = [];
                var ids_query = '';
                var ids_query2 = '';
                var ids_query3 = '';
                var ids_query4 = '';
                var ids_query5 = '';
                /*fragmentar query en varias partes*/
                console.log("Lineas "+rows.length);
                for(var k=1; k < rows.length; k++){
                    if(numof.indexOf(rows[k][0]) == -1 ){  //si el indice no existe
                        numof.push(rows[k][0]);
                        list_of.push([rows[k][0], rows[k][1], 'incompleto']);
                        list_op.push([0, rows[k][1]]);
                    }
                    //numof     fecha_c     estado
                    all_regist.push({numof: rows[k][0],fecha_c: rows[k][1], estado: 'incompleto'});
                    //idordenf cantidad   fecha_e     restantes   despachados  codigo(aux) numOF(aux)
                    list_fab.push([0, rows[k][4], rows[k][7], rows[k][5], rows[k][6], 0, 0, rows[k][3], rows[k][4], rows[k][2]]);
                    list_fab_aux.push([rows[k][2],rows[k][0]]);
                    ids_query += " material.codigo = '"+rows[k][2]+"' OR";


                }

                ids_query = ids_query.substring(0, ids_query.length-2);

                //ids_query2 = ids_query2.substring(0, ids_query2.length-2);
                //ids_query3 = ids_query3.substring(0, ids_query3.length-2);
                //ids_query4 = ids_query4.substring(0, ids_query4.length-2);
                //ids_query5 = ids_query5.substring(0, ids_query5.length-2);
                req.getConnection(function(err, connection){
                    if(err){throw err;}
                    connection.query("INSERT INTO ordenfabricacion (numordenfabricacion, creacion, estado) VALUES ?", [list_of], function(err, result){
                        if(err){throw err;}
                        else{console.log("OFs creadas correctamente");}
                        for(var i=0; i < list_of.length; i++){
                            list_op[i][0] = result.insertId + i;
                        }


                        connection.query("SELECT * FROM ordenfabricacion", function(err, ofs){
                            if(err) throw err;

                            for(var j=0; j < ofs.length; j++){
                                for(var a=0; a < list_fab.length; a++){
                                    if(list_fab_aux[a][1] == ofs[j].numordenfabricacion){
                                        list_fab[a][0] = ofs[j].idordenfabricacion;
                                    }
                                }
                            }
                            //console.log("SELECT COALESCE(producido.idmaterial,999) as idmaterial, COALESCE(producido.idproducto,999) as idproducto, material.codigo FROM producido LEFT JOIN material ON (producido.idmaterial = material.idmaterial) WHERE "+ids_query);
                            connection.query("SELECT material.idmaterial, COALESCE(producido.idproducto,0) as idproducto, material.codigo FROM material LEFT JOIN producido ON (material.idmaterial = producido.idmaterial)",
                                function(err, ids){
                                    if(err){throw err;}
                                    //console.log(list_fab_aux);
                                    //console.log(list_fab);
                                    //console.log(ids.length);
                                    console.log("ids: "+ids.length);
                                    for(var t=0; t < ids.length; t++){
                                        for(var u=0; u < list_fab.length; u++){
                                            if(list_fab_aux[u][0] == ids[t].codigo && list_fab[u][5] == 0){
                                                list_fab[u][5] = ids[t].idmaterial;
                                                list_fab[u][6] = ids[t].idproducto;
                                            }
                                        }
                                    }
                                    connection.query("SELECT material.idmaterial, COALESCE(producto.idproducto,0) as idproducto, material.codigo FROM material INNER JOIN producto ON (material.idmaterial = producto.idmaterial)",
                                        function(err, ids){
                                            if(err){throw err;}
                                            console.log("ids: "+ids.length);
                                            for(var t=0; t < ids.length; t++){
                                                for(var u=0; u < list_fab.length; u++){
                                                    if(list_fab_aux[u][0] == ids[t].codigo && list_fab[u][5] == 0){
                                                        list_fab[u][5] = ids[t].idmaterial;
                                                        list_fab[u][6] = ids[t].idproducto;
                                                    }
                                                }
                                            }

                                            connection.query("SELECT material.idmaterial, COALESCE(Recurso.idproducto,0) as idproducto, material.codigo FROM material INNER JOIN Recurso ON (material.idmaterial = Recurso.idmaterial)",
                                                function(err, ids){
                                                    if(err){throw err;}
                                                    console.log("ids: "+ids.length);
                                                    for(var t=0; t < ids.length; t++){
                                                        for(var u=0; u < list_fab.length; u++){
                                                            if(list_fab_aux[u][0] == ids[t].codigo && list_fab[u][5] == 0){
                                                                list_fab[u][5] = ids[t].idmaterial;
                                                                list_fab[u][6] = ids[t].idproducto;
                                                            }
                                                        }
                                                    }

                                                    connection.query("SELECT material.idmaterial, COALESCE(Otro.idproducto,0) as idproducto, material.codigo FROM material INNER JOIN Otro ON (material.idmaterial = Otro.idmaterial)",
                                                        function(err, ids){
                                                            if(err){throw err;}
                                                            console.log("ids: "+ids.length);
                                                            for(var t=0; t < ids.length; t++){
                                                                for(var u=0; u < list_fab.length; u++){
                                                                    if(list_fab_aux[u][0] == ids[t].codigo && list_fab[u][5] == 0){
                                                                        list_fab[u][5] = ids[t].idmaterial;
                                                                        list_fab[u][6] = ids[t].idproducto;
                                                                    }
                                                                }
                                                            }
                                                            //console.log(list_fab);
                                                            /*var array_forged = [];
                                                            var c = 0;
                                                            var caca = 0;
                                                            var largo = list_fab.length
                                                            while(true){
                                                                if(list_fab[c][5] == 0 || list_fab[c][6] == 0){
                                                                    array_forged.push(list_fab[c]);
                                                                    list_fab.splice(c, 1);
                                                                    caca++;
                                                                }
                                                                else{
                                                                    list_fab[c].splice(7, 2);
                                                                    list_fab[c].splice(7, 1);
                                                                    console.log(list_fab[c]);
                                                                    c++
                                                                }


                                                                if(c == list_fab.length){break;}
                                                            }*/

                                                            /*console.log("filas eliminadas: "+caca);
                                                            for(var t=0; t<array_forged.length; t++){
                                                                var aux;
                                                                array_forged[t].splice(0, 6);
                                                                array_forged[t].splice(0, 1);
                                                                array_forged[t].splice(1, 1);

                                                            }*/
                                                            console.log(list_fab);

                                                            //console.log(array_forged);
                                                            /*connection.query("INSERT INTO fabricaciones (idorden_f, cantidad, f_entrega, restantes, despachados, idmaterial, idproducto) VALUES ?", [list_fab], function(err, fabr){
                                                                if(err){throw err;}
                                                                console.log(list_op);*/
                                                            //connection.query("INSERT INTO ordenproduccion (idordenproduccion, f_gen) VALUES ?", [list_op], function(err, rows){
                                                            //if(err){throw err;}
                                                            res.redirect('/plan');
                                                            //});
                                                            //});


                                                            /*for(var a=0; a < list_fab.length; a++){
                                                                if(list_fab[a].length == 5){
                                                                    list_fab[a] = list_fab[a].concat([ids[0].idmaterial, ids[0].idmaterial]);
                                                                }
                                                            }*/
                                                        });
                                                });
                                        });
                                });


                        });

                    });
                });
            });
        var input = fs.createReadStream('csvs/levantamiento.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});


router.get('/parse_ofs', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var query = "INSERT INTO fabricaciones (idorden_f,cantidad,f_entrega,restantes,idproducto,idmaterial,despachados) VALUES ";
                for(var i=0; i<rows.length; i++){
                    query += "(,"+rows[i][4]+","+rows[i][7]+","+rows[i][5]+","+","+","+rows[i][6]+"),"
                }
                console.log(query);
            });
        var input = fs.createReadStream('csvs/levantamiento.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});




router.get('/parse_prod', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var list_prod = [];
                var list_op = [];
                for(var i=1; i < rows.length; i++){
                    list_prod.push(
                        /*
                            N° OF,Fecha Creacion,Codigo,Descripcion,Solicitado,
                            Restante,Despachado,Fecha Cliente,Moldeo,Fusion,
                            Quiebre,Terminacion,TT,Mtza,CC,Stock,,OBS
                        */
                        [rows[i][0],rows[i][1],rows[i][2].replace(' ', ''),rows[i][3],
                            rows[i][4],rows[i][5],rows[i][6],rows[i][7], rows[i][8],
                            rows[i][9],rows[i][10],rows[i][11],rows[i][12],rows[i][13], rows[i][14],
                            rows[i][15]]);

                }

                req.getConnection(function(err, connection){
                    if(err) throw err;

                    connection.query("SELECT * FROM ordenfabricacion",function(err, ofs){
                        if(err) throw err;

                        for(var t=0; t <ofs.length; t++){
                            ofs.creacion = new Date(ofs[t].creacion).toLocaleDateString();
                            console.log( ofs.creacion.split("-")[2]+"-"+ofs.creacion.split("-")[1]+"-"+ofs.creacion.split("-")[0].substring(2,4));
                            list_op.push([t+ofs[0].idordenfabricacion,ofs.creacion]);

                        }
                        connection.query("INSERT INTO ordenproduccion (idordenproduccion,f_gen) VALUES ?", [list_op], function(err, ops){
                            if(err) throw err;

                            connection.query("SELECT material.idmaterial, COALESCE(producido.idproducto, 0) AS idproducto, material.codigo FROM material left join producido on material.idmaterial = producido.idmaterial",
                                function(err, ids){
                                    if(err) throw err;
                                    for(var t=0; t < ids.length; t++){
                                        for(var u=0; u < list_prod.length; u++){
                                            if(list_prod[u][2] == ids[t].codigo){
                                                //IDMATERIAL
                                                list_prod[u][16] = ids[t].idmaterial;
                                                //IDPRODUCTO
                                                list_prod[u][17] = ids[t].idproducto;
                                            }
                                        }
                                    }
                                    connection.query("SELECT * FROM fabricaciones LEFT JOIN ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion", function(err, fab){
                                        if(err) throw err;
                                        var idsfab = [];
                                        for(var j=0; j<fab.length; j++){
                                            for(var t=0; t<list_prod.length; t++){
                                                if(list_prod[t][0] == fab[j].numordenfabricacion &&  list_prod[t][16] == fab[j].idmaterial && idsfab.indexOf(fab[j].idfabricaciones)==-1 && list_prod[t][4] <= fab[j].cantidad){

                                                    console.log("Nueva fabricacion");
                                                    //IDFABRICACION
                                                    list_prod[t][18] = fab[j].idfabricaciones;
                                                    //ID ORDEN Produccion
                                                    list_prod[t][0] = fab[j].idorden_f;
                                                    //console.log(list_prod[t]);
                                                    idsfab.push(fab[j].idfabricaciones);


                                                }
                                            }
                                        }

                                        var ite = 0;
                                        while(true){
                                            if(!list_prod[ite][18]){
                                                //IDFABRICACION

                                                //list_prod[t][18] = 5781;
                                                //console.log("splic");
                                                list_prod.splice(ite, 1);

                                                //ID ORDEN Produccion
                                                //list_prod[t][0] = fab[j].idorden_f;
                                                //console.log(list_prod[t]);
                                            }
                                            else{ite++;}
                                            if(ite == list_prod.length){
                                                break;
                                            }
                                        }

                                        connection.query("SELECT * FROM ordenproduccion", function(err, orprod){
                                            if(err) throw err;
                                            var aux_forged = [];
                                            var count = 0;

                                            /*for(var r=0; r < orprod.length; r++){
                                                for(var y=0; y < list_prod.length; y++){
                                                    if(list_prod[y].){}
                                                }
                                            }*/
                                            while(true){
                                                if(list_prod[count].length <= 16){
                                                    //console.log(list_prod[count]);
                                                    aux_forged.push([list_prod[count][2],list_prod[count][3]]);
                                                    list_prod.splice(count,1);
                                                }else{
                                                    count++;
                                                }
                                                if(list_prod.length == count){
                                                    break;
                                                }
                                            }
                                            //console.log(list_prod);
                                            //console.log("termino");
                                            var prod_db = [];

                                            /*for(var t=0; t < req.session.arrayPt.length; t++){
                                                for(var g=0; g < list_prod.length; g++){
                                                    if(list_prod[g][2] == req.session.arrayPt[t][1] && list_prod[g][0] == req.session.arrayPt[t][0]){
                                                        list_prod[g][15] = req.session.arrayPt[t][1];
                                                    }
                                                }

                                            }*/
                                            for(var w=0; w < list_prod.length; w++){
                                                prod_db.push([list_prod[w][0], list_prod[w][4], list_prod[w][1], parseInt(list_prod[w][8].replace('', 0)),parseInt(list_prod[w][9].replace('', 0)),parseInt(list_prod[w][10].replace('', 0)),parseInt(list_prod[w][11].replace('', 0)),parseInt(list_prod[w][12].replace('', 0)),parseInt(list_prod[w][13].replace('', 0)),parseInt(list_prod[w][14].replace('', 0)),/*parseInt(list_prod[w][15].replace('', 0))*/ 0, list_prod[w][18]]);
                                            }


                                            console.log(prod_db);
                                            connection.query("INSERT INTO produccion (idordenproduccion, cantidad, f_gen, `1`,`2`,`3`,`4`,`5`,`6`,`7`,`8`, idfabricaciones) VALUES ?", [prod_db],
                                                function(err, rows){
                                                    if(err) throw err;
                                                    console.log("Parseo exitoso!");
                                                    res.redirect('/plan');
                                                });
                                        });
                                    });
                                });
                        });

                    });
                });
            });
        var input = fs.createReadStream('csvs/producciones.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});


router.get('/parsecsv2', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs');
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mat_list = [];
                var rec_list = [];
                var prod_list = [];
                var forged_list = [];
                var otro_list = [];
                for(var i=0;i<rows.length;i++){
                    caracts = parseInt(rows[i][1].slice(7,9));
                    if(parseInt(rows[i][1].slice(7,9)) == 0){
                        caracts = 99;
                    }
                    switch(rows[i][1][0]){
                        case "P":
                        case "S":
                            if(rows[i][1].slice(1,3) == "01"){
                                var idsub = parseInt(rows[i][1].slice(5,7));
                                if(parseInt(rows[i][1].slice(5,7)) == 0){
                                    idsub = 99;
                                }
                                continue;
                            } else {
                                prod_list.push([i,parseInt(rows[i][1].slice(3,5)) + 1]);
                            }
                            break;
                        case "M":
                        case "I":
                            rec_list.push([i]);
                            break;
                        default:
                            otro_list.push([i]);
                            break;
                    }
                    mat_list.push([i,rows[i][0],"fin",rows[i][1][0],parseInt(rows[i][1].slice(1,3)),caracts]);


                }
                console.log(mat_list);
                console.log(prod_list);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("INSERT INTO material (`idmaterial`,`detalle`,`estado`,`tipo`,`especificacion`,`caracteristica`) VALUES ?",[mat_list],function(err,rows){
                        if(err) {
                            console.log(mat_list);
                            throw err;
                        }
                        connection.query("INSERT INTO producto (`idmaterial`,`idaleacion`) VALUES ?",[prod_list],function(err,prods){
                            if(err) throw err;
                            connection.query("INSERT INTO recurso (`idmaterial`) VALUES ?",[rec_list],function(err,prods){
                                if(err) throw err;
                                connection.query("INSERT INTO otro (`idmaterial`) VALUES ?",[otro_list],function(err,prods){
                                    if(err) throw err;
                                    res.redirect('/plan');
                                });
                            });
                        });
                    })
                });
            });
        var input = fs.createReadStream('csvs/nuevosProductos.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});



router.get('/parse_ordenf', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var list_of = [];
                var list_fab = [];
                for(var i=0;i<rows.length;i++){
                    list_of.push([rows[i][0], rows[i][1], 'incompleto']);
                    list_fab.push([0, rows[i][4], rows[i][7], rows[i][5], 0, 0, rows[i][6]]);
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("INSERT INTO ordenfabricacion (numordenfabricacion, creacion, estado)",[list_of],
                        function(err, ofs){
                            if(err) throw err;
                            for(var t=0; t < ofs.length; t++){
                                list_fab[t]
                            }
                            connection.query("SELECT * FROM ordenfabricacion", function(err, ofs){
                                if(err) throw err;

                                for(var j=0; j < ofs.length; j++){
                                    for(var a=0; a < list_fab.length; a++){
                                        if(list_fab_aux[a][1] == ofs[j].numordenfabricacion){
                                            list_fab[a][0] = ofs[j].idordenfabricacion
                                        }
                                    }
                                }


                            });
                        });
                });});
        var input = fs.createReadStream('csvs/test.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});













router.get('/parseorden_f', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var all_regist = [];
                var array_ids = [];
                var list_of = [];
                var list_fab = [];
                var list_op = [];
                var list_fab_aux = [];
                var numof = [];
                var ids_query = '';
                var ids_query2 = '';
                var ids_query3 = '';
                var ids_query4 = '';
                var ids_query5 = '';
                var xdesp = 0;
                //req.session.arrayPt = [];
                /*fragmentar query en varias partes*/
                console.log("Lineas "+rows.length);
                for(var k=1; k < rows.length; k++){
                    if(numof.indexOf(rows[k][0]) == -1 ){  //si el indice no existe
                        numof.push(rows[k][0]);
                        list_of.push([rows[k][0], rows[k][1], 'incompleto']);
                        list_op.push([0, rows[k][1]]);
                    }
                    //numof     fecha_c     estado
                    all_regist.push({numof: rows[k][0],fecha_c: rows[k][1], estado: 'incompleto'});

                    xdesp = rows[k][4] - rows[k][6];
                    //NUM of          codigo,    despachados
                    //req.session.arrayPt.push([rows[k][0], rows[k][2], rows[k][6]]);
                    /*rows[k][5]   idordenf cantidad   fecha_e     restantes   despachados  codigo(aux) numOF(aux)*/
                    list_fab.push([0, rows[k][4], rows[k][7], xdesp, rows[k][6], 0, 0, rows[k][3], rows[k][4], rows[k][2]]);
                    list_fab_aux.push([rows[k][2],rows[k][0]]);
                    ids_query += " material.codigo = '"+rows[k][2]+"' OR";


                }

                ids_query = ids_query.substring(0, ids_query.length-2);

                req.getConnection(function(err, connection){
                    if(err){throw err;}
                    console.log("OFS: "+list_of.length);
                    connection.query("INSERT INTO ordenfabricacion (numordenfabricacion, creacion, estado) VALUES ?", [list_of],/*"SELECT * FROM ordenfabricacion",*/ function(err, result){
                        if(err){throw err;}
                        else{console.log("OFs creadas correctamente");}
                        for(var i=0; i < list_of.length; i++){
                            list_op[i][0] = result.insertId + i;
                        }


                        connection.query("SELECT * FROM ordenfabricacion", function(err, ofs){
                            if(err) throw err;

                            for(var j=0; j < ofs.length; j++){
                                for(var a=0; a < list_fab.length; a++){
                                    if(list_fab_aux[a][1] == ofs[j].numordenfabricacion){
                                        list_fab[a][0] = ofs[j].idordenfabricacion;
                                    }
                                }
                            }
                            connection.query("SELECT material.idmaterial, COALESCE(producido.idproducto,0) as idproducto, material.codigo FROM material INNER JOIN producido ON (material.idmaterial = producido.idmaterial)",
                                function(err, ids){
                                    if(err){throw err;}
                                    for(var i=0; i<ids.length; i++){
                                        for(var t=0; t<list_fab.length; t++){
                                            if(ids[i].codigo == list_fab[t][9]){
                                                list_fab[t][5] = ids[i].idmaterial;
                                                list_fab[t][6] = ids[i].idproducto;
                                            }
                                        }
                                    }

                                    var errores = 0;
                                    var count = 0;
                                    while(true){
                                        if(list_fab[count][5]==0 && list_fab[count][6]==0){
                                            list_fab.splice(count,1);
                                            errores++;
                                        }
                                        else{
                                            count++;
                                        }
                                        if(count == list_fab.length){
                                            break;
                                        }
                                    }
                                    var fab_db = [];
                                    for(var t=0; t<list_fab.length; t++){
                                        fab_db.push([list_fab[t][0], list_fab[t][1], list_fab[t][2], list_fab[t][4], list_fab[t][5],list_fab[t][6]]);
                                        //list_fab[t] = list_fab[t].splice(0,7);
                                        //list_fab[t] = list_fab[t].splice(3,1);
                                    }
                                    console.log("errores:"+errores);
                                    //console.log(list_fab);
                                    //console.log(fab_db);
                                    //console.log(list_fab[list_fab.length-2]);
                                    //console.log(list_fab[list_fab.length-1]);

                                    console.log("FABRICACIONES: "+fab_db.length);
                                    connection.query("INSERT INTO fabricaciones (idorden_f, cantidad, f_entrega, despachados, idmaterial, idproducto) VALUES ?", [fab_db], function(err, fabr){
                                        if(err){throw err;}
                                        res.redirect('/plan');
                                        //res.redirect('/plan/parse_prod');
                                    });

                                });
                        });

                    });
                });
            });
        var input = fs.createReadStream('csvs/levantamiento.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});










router.get('/parseOF', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var idsof = [];
                var ofs = [];
                for(var t=1; t<rows.length; t++){
                    if(idsof.indexOf(rows[t][0])==-1){
                        idsof.push(rows[t][0]);
                        ofs.push([rows[t][0], rows[t][1], 'incompleto']);
                    }
                }
                console.log("OFS RECOLECTADA: "+ofs.length);
                console.log(ofs);
                req.getConnection(function(err, connection){
                    if(err){console.log("Error Selecting : %s", err);}
                    connection.query("INSERT INTO ordenfabricacion (numordenfabricacion, creacion, estado) VALUES ?",[ofs], function(err, rows){
                        if(err) throw err;
                        console.log("OFS ingresadas");
                        res.redirect('/plan');
                    });
                });
            });
        var input = fs.createReadStream('csvs/levantamiento2.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});



router.get('/parse_stock', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                //var querys = "UPDATE material SET stock = (CASE ";
                var querys = [];

                for(var i=0; i<rows.length; i++){
                    querys.push("UPDATE material SET stock = stock + "+rows[i][2]+" WHERE codigo='"+rows[i][0]+"'");
                    //querys += "WHEN codigo= '"+rows[i][0]+"' THEN stock = "+rows[i][2]+" ";
                }
                //console.log(querys);
                req.getConnection(function(err, connection){
                    if(err) throw err;
                    console.log(querys);
                    for(var t=0; t<querys.length; t++){
                        connection.query(querys[t], function(err, stock){
                            if(err){throw err}
                            setTimeout(function(){
                                //console.log("Ingresado stock de "+rows[i][1]);
                            }, 1000);
                        });
                    }

                    /*for(var i=1; i < rows.length; i++){
                        //if(rows[i][] != ''){
                            console.log(rows[i]);
                            connection.query("UPDATE material SET stock = stock + ? WHERE codigo=?", [parseInt(rows[i][2]), rows[i][0]],
                                function(err, rows){
                                    if(err){throw err}

                            });
                            setTimeout(function(){
                                    console.log("Ingresado stock de "+rows[i][1]);
                                }, 1000);
                        //}
                    }*/
                    res.redirect('/plan');

                });
            });
        var input = fs.createReadStream('levantamiento/parsear_stock.csv');
        input.pipe(parser);


    } else res.redirect("/bad_login");
});



router.get('/verificar_material', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                req.getConnection(function(err, connection){
                    connection.query("SELECT * FROM material", function(err, mat){
                        if(err){throw err;}
                        for(var t=1; t<rows.length; t++){
                            //console.log(rows);
                            for(var m=0; m<mat.length; m++){
                                if(rows[t][0] == mat[m].codigo){
                                    console.log("Correcto: "+rows[t][0].length);
                                    break;
                                }
                                else{
                                    if(m == mat.length-1){
                                        //console.log("No encontrada: "+rows[t][0].length);
                                        //console.log(rows[t][0]+","+rows[t][1]);
                                    }
                                }
                            }
                        }
                        res.redirect('/plan');

                    });
                });

            });
        var input = fs.createReadStream('csvs/productocodigo.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});






router.get('/parsecsv_olvidados', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mat_list = [];
                var rec_list = [];
                var prod_list = [];
                var forged_list = [];
                var otro_list = [];
                //console.log(rows);
                for(var i=1;i<rows.length;i++){
                    caracts = parseInt(rows[i][0].slice(7,9));
                    if(parseInt(rows[i][0].slice(7,9)) == 0){
                        caracts = 99;
                    }
                    //console.log(rows[i][0]);
                    //console.log(rows[i][1]);
                    //console.log(caracts);
                    //console.log(rows[i][0][0]);

                    console.log(i+" "+rows[i][1]+" fin "+rows[i][0][0]+" "+parseInt(rows[i][0].slice(1,3))+" "+caracts+" "+rows[i][0]);
                    //mat_list2.push([i+2553,rows[i][1],"fin",rows[i][0][0],parseInt(rows[i][0].slice(1,3)),caracts, rows[i][0]]);
                    console.log(mat_list);
                    switch(rows[i][0][0]){
                        case "P"://OTRO
                        case "S"://SI ES SEMIELBORADO PRODUCIDO VA A OTRO, SINO VA A PRODUCCION
                            if(rows[i][0].slice(1,3) == "01"){
                                var idsub = parseInt(rows[i][0].slice(5,7));
                                if(parseInt(rows[i][0].slice(5,7)) == 0){
                                    idsub = 99;
                                }
                                continue;
                            } else {
                                prod_list.push([i,parseInt(rows[i][0].slice(3,5)) + 1]);
                            }
                            break;
                        case "M"://OTRO
                        case "I"://INSUMO
                            rec_list.push([i]);
                            break;
                        default:
                            //console.log("otrro");
                            otro_list.push([i]);
                            break;
                    }
                    //console.log(rows[i]);
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    /*connection.query("INSERT INTO material (`idmaterial`,`detalle`,`estado`,`tipo`,`especificacion`,`caracteristica`,`codigo`) VALUES ?",[mat_list],function(err,rows){
                        if(err) {
                            console.log(mat_list);
                            throw err;
                        }*/
                    connection.query("INSERT INTO producto (`idmaterial`,`idaleacion`) VALUES ?",[prod_list],function(err,prods){
                        if(err) throw err;
                        connection.query("INSERT INTO Recurso (`idmaterial`) VALUES ?",[rec_list],function(err,prods){
                            if(err) throw err;
                            connection.query("INSERT INTO Otro (`idmaterial`) VALUES ?",[otro_list],function(err,prods){
                                if(err) throw err;
                                res.redirect('/plan');
                            });
                        });
                    });
                    //});
                });
            });
        var input = fs.createReadStream('csvs/nopasados.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});


router.get('/comprobar_codigos', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var query = "";
                for(var t=0; t<rows.length; t++){
                    query += " material.codigo='"+rows[t][2] +"' OR";
                }
                query = query.substring(0,query.length-2);
                console.log(query);
                req.getConnection(function(err, connection){
                    connection.query("SELECT * FROM material WHERE"+query, function(err,rows){
                        if(err){console.log("Error Selecting : %s", err);}
                        console.log(rows.length);
                    });
                });
            });
        var input = fs.createReadStream('csvs/levantamiento.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});




router.get('/parse_producciones', function(req, res, next){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var prods = [];
                var ops = [];
                var idop = [];
                var of = [9000];
                var fabs = [];
                var sinid_prod = [];
                var autoincrement = 21;
                // idmaterial-0
                // op-1
                // detalle-2
                // cantidad-3
                // moldeo-4
                // fusion-5
                // quiebre-6
                // terminacion-7
                // t.termico-8
                // maestranza-9
                // control calidad-10
                // bpt-11
                var cuent = 1;
                for(var e=1; e < rows.length; e++){
                    if(parseInt(rows[e][3]) > 0){
                        rows[e][1] = parseInt(rows[e][1]) + autoincrement;
                        if (idop.indexOf(rows[e][1]) == -1) {
                            //IDOP
                            ops.push([rows[e][1]]);
                            idop.push(rows[e][1])
                        }
                        //idordenproduccion, cantidad,  1, 2, 3, 4, 5, 6, 7, 8, standby
                        prods.push([
                            rows[e][1], rows[e][3], rows[e][4],
                            rows[e][5], rows[e][6], rows[e][7],
                            rows[e][8], rows[e][9], rows[e][10],
                            rows[e][11], 0
                        ]);
                        //FALTA UNIR CON idfabricaciones

                        //numitem, cantidad, f_entrega, restantes, idmaterial, despachados, idpedido
                        fabs.push([cuent, parseInt(rows[e][3]), new Date().toLocaleString(), 0, rows[e][0], parseInt(rows[e][3]), 0, rows[e][2]]);
                        // FALTA UNIR CON EL idproducto y el idordenfabricacion
                        cuent++;
                    }
                }
                req.getConnection(function(err, connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM producido", function(err, mats){
                        if(err) throw err;
                        for(var i=0; i < fabs.length; i++){
                            for(var t=0; t < mats.length; t++){
                                if(mats[t].idmaterial == fabs[i][4]){
                                    fabs[i][7] = mats[t].idproducto;
                                    break;
                                }
                                else if(t == mats.length-1){
                                    sinid_prod.push(fabs[i]);
                                    fabs.splice(i, 1);
                                    prods.splice(i, 1);
                                    i--;
                                }
                            }
                        }
                        console.log(fabs);
                        console.log(of);
                        connection.query("INSERT INTO ordenfabricacion (numordenfabricacion) VALUES ('9000')", function(err, inOF){
                            if(err) throw err;
                            console.log(inOF);
                            for(var w=0; w < fabs.length; w++){
                                fabs[w][8] = inOF.insertId;
                            }
                            //numitem, cantidad, f_entrega, restantes, idmaterial, despachados, idpedido
                            connection.query("INSERT INTO fabricaciones (numitem, cantidad, f_entrega, restantes, idmaterial, despachados, idpedido, idproducto, idorden_f) VALUES ?",[fabs], function(err, inFabs){
                                if(err) throw err;
                                console.log(inFabs);
                                for(var w=0; w < prods.length; w++){
                                    prods[w][11] = inFabs.insertId + w;
                                }
                                connection.query("INSERT INTO ordenproduccion (idordenproduccion) VALUES ?", [ops], function(err, inOP){
                                    if(err) throw err;
                                    console.log(inOP);
                                    console.log(prods);
                                    //idordenproduccion, cantidad,  1, 2, 3, 4, 5, 6, 7, 8, standby, idfabricaciones
                                    connection.query("INSERT INTO produccion (`idordenproduccion`, `cantidad`,  `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `standby`, `idfabricaciones`) VALUES ?",[prods], function(err, inProds){
                                        if(err) throw err;
                                        console.log(inProds);
                                        console.log("EXITO!");
                                        res.redirect('/');
                                    });
                                });
                            });
                        });
                    });
                });
            });
        var input = fs.createReadStream('csvs/PRODUCCIONES_01-12.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/
});




router.get('/parse_bodegaPT', function(req, res, next){
    var fs = require('fs')
    var parse = require('csv-parse');

    var parser = parse(
        function(err,rows){
            if(err) throw err;
            /* * UPDATE `table` SET `uid` = CASE
                WHEN id = 1 THEN 2952
                WHEN id = 2 THEN 4925
                WHEN id = 3 THEN 1592
                ELSE `uid`
                END
            WHERE id  in (1,2,3)
            * */
            var ids = [];
            var update = "UPDATE material SET stock = CASE";
            var update2 = "UPDATE material SET s_inicial = CASE";
            //idmaterial 0 ,detalle 1 ,cant 2 ,Ocurrencias 3
            for(var i=1; i < rows.length; i++){
                if(ids.indexOf(rows[i][0]) == -1){
                    ids.push(rows[i][0]);
                    update += " WHEN idmaterial = "+rows[i][0]+" THEN "+rows[i][1];
                    update2 += " WHEN idmaterial = "+rows[i][0]+" THEN "+rows[i][1];
                }
            }
            update += " ELSE stock END WHERE idmaterial IN ("+ids.join(',')+")";
            update2 += " ELSE s_inicial END WHERE idmaterial IN ("+ids.join(',')+")";
            console.log(update);
            req.getConnection(function(err, connection){
                if (err) throw  err;
                connection.query(update, function(err, up){
                    if (err) throw  err;
                    console.log(up);
                    connection.query(update2, function(err, up){
                        if (err) throw  err;
                        console.log(up);
                        console.log("EXITO!");
                        res.redirect('/');
                    });
                });
            });
        });
    var input = fs.createReadStream('csvs/stock_abastecimiento.csv');
    input.pipe(parser);

    /*input.pipe(parse(function(err, rows){
        if(err) throw err;
        console.log(rows);
    }));*/
});




router.get('/convert_despachos', function(req, res, next){
    req.getConnection(function(err, connection){
        if(err) throw err;
        connection.query("SELECT * FROM despacho", function(err, desp){
           if(err) throw err;

           /*
           *
           * SQL's para crear tablas.
           *
           * create table gd(
                idgd int not null auto_increment,
                estado varchar(11) not null default 'Venta',
                fecha datetime default current_timestamp,
                last_mod datetime default current_timestamp,
                obs varchar(100) default null,
                primary key(idgd)
            );

            create table despachos(
                iddespacho int(10) not null auto_increment,
                idgd int(10) not null,
                idpedido int(10) default 0,
                idmaterial int(10) not null,
                cantidad int default 0,
                primary key(iddespacho),
                foreign key (idgd) references gd (idgd) on delete cascade,
                FOREIGN KEY (`idpedido`)  REFERENCES `siderval`.`pedido` (`idpedido`)  ON DELETE cascade,
                FOREIGN KEY (`idmaterial`)  REFERENCES `siderval`.`material` (`idmaterial`)  ON DELETE cascade
            );
           * */

           //BD actual (concatenada):
           //   iddespacho, idorden_f, mat_token, cant_token, id_token, idf_token, fecha, estado, obs, last_mod
           //Nueva BD:
           //   idgd (auto_increment), estado, fecha despacho, fecha ultima modificaci�n, observaci�n
           var gds = [];
           //   idgd, idmaterial, idfabricacion, cantidad
           var despachos = [];
           for(var a=0; a < desp.length; a++){
               desp[a].id_token = desp[a].id_token.split('@');
               desp[a].cant_token = desp[a].cant_token.split(',');
               desp[a].idf_token = desp[a].idf_token.split('@');
               gds.push([desp[a].iddespacho, desp[a].estado, desp[a].fecha, desp[a].last_mod, desp[a].obs]);
               //Si esta anulada, solo agregar gd pero no despachos.
               if(desp[a].estado != 'Anulado' && desp[a].estado != 'Blanco'){
                   for(var b=0; b < desp[a].cant_token.length; b++){
                       if(isNaN(parseInt(desp[a].id_token[b])) || isNaN(parseInt(desp[a].cant_token[b]))){
                           continue;
                       }
                       if(isNaN(parseInt(desp[a].idf_token[b])) || desp[a].idf_token[b] == '' || desp[a].idf_token[b] == '0'){
                           desp[a].idf_token[b] = null;
                       }
                       if(isNaN(parseInt(desp[a].cant_token[b]))){
                           desp[a].cant_token[b] = '0';
                       }
                       if(desp[a].id_token[b] == '0' || desp[a].id_token[b] == ''){
                           gds[a][4] += " " + desp[a].cant_token[b] + " - " + desp[a].mat_token[b] + " \n";
                       } else despachos.push([desp[a].iddespacho, parseInt(desp[a].id_token[b]), parseInt(desp[a].cant_token[b]),null]);
                   }
               }
           }
           connection.query("INSERT INTO gd (idgd, estado, fecha, last_mod, obs) VALUES ?", [gds],function(err, inGD){
               if(err) throw err;
               console.log(inGD);
               console.log(despachos);
               connection.query("INSERT INTO despachos (idgd, idmaterial, cantidad, idpedido) VALUES ?", [despachos],function(err, inDesp){
                   if(err) throw err;
                   console.log(inDesp);
                   res.redirect('/');
               });
           });
        });
    })
});


module.exports = router;