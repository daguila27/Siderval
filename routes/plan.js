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
function verificar(usr){
  if(usr.nombre == 'plan' || usr.nombre == 'gerencia' || usr.nombre == 'abastecimiento'){
    return true;
  }else{
    return false;
  }
}


/* GET users listing. */
router.get('/', function(req, res, next) {
    if(verificar(req.session.userData)){
        res.render('plan/indx_new',{page_title:"Planificación",username: req.session.userData.nombre});}
    else{res.redirect('bad_login');}
});

router.get('/render_informes', function(req, res, next){
  if(verificar(req.session.userData)){
    res.render('plan/informes_fragment');}
  else{res.redirect('bad_login');}  
});



router.get('/view_pedidos', function(req, res, next){
  if(verificar(req.session.userData)){
    res.render('plan/view_pedidos');}
  else{res.redirect('bad_login');}  
});


router.get('/view_fabricaciones', function(req, res, next){
  if(verificar(req.session.userData)){
    res.render('plan/view_fabricaciones');}
  else{res.redirect('bad_login');}  
});


router.get('/calendar_peds', function(req, res, next){
  if(verificar(req.session.userData)){
    res.render('plan/calendar_view', {alto: '600px'});}
  else{res.redirect('bad_login');}  
});

router.get('/table_pedidos/:orden', function(req, res, next){
  if(verificar(req.session.userData)){
        var orden = req.params.orden;
        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM pedido LEFT JOIN odc ON odc.idodc=pedido.idodc LEFT JOIN cliente"
                +" ON cliente.idcliente = odc.idcliente LEFT JOIN material ON material.idmaterial=pedido.idmaterial"
                +" WHERE pedido.cantidad > pedido.despachados ORDER BY "+orden,
                function(err, odc){
                    if(err) throw err;

                    res.render('plan/table_pedidos', {data: odc, key: orden.replace(' ', '-')});
                
            });
        });
    }
  else{res.redirect('bad_login');}  
});


router.post('/buscar_pedido_list', function(req, res, next){
  if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var orden = input.orden;
        console.log(clave);
        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM pedido LEFT JOIN odc ON odc.idodc=pedido.idodc LEFT JOIN cliente"
                +" ON cliente.idcliente = odc.idcliente LEFT JOIN material ON material.idmaterial=pedido.idmaterial"
                +" WHERE pedido.cantidad > pedido.despachados and"
                +" (material.detalle like '%"+clave+"%' or odc.numoc like '%"+clave+"%' or pedido.cantidad"
                +" like '%"+clave+"%' or cliente.razon like '%"+clave+"%' or cliente.sigla like '%"+clave+"%')",
                function(err, odc){
                    if(err) throw err;

                    res.render('plan/table_pedidos', {data: odc, key: orden.replace(' ', '-')});
                
            });
        });
    }
  else{res.redirect('bad_login');}  
});

router.post('/buscar_odcs_item', function(req, res, next){
    if(verificar(req.session.userData)){
        var clave = JSON.parse(JSON.stringify(req.body)).clave;
        var where = '';
        console.log(clave);
        if(clave != '' || clave != null){
            where = " WHERE odc.numoc LIKE '%"+clave+"%'";
        }
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select odc.*, coalesce(cliente.razon, 'No Definido') as cliente from odc left join cliente on cliente.idcliente=odc.idcliente"+where,function(err, odc){
                if(err) throw err;

                res.render('plan/item_odcs', {data: odc});
            });
        });
    }
    else{res.redirect('bad_login');}
});

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
        console.log(clave);
        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select fabricaciones.*, ordenfabricacion.*, pedido.externo,material.detalle, odc.numoc"
                +" from fabricaciones left join ordenfabricacion on"
                +" ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join "
                +"odc on odc.idodc=ordenfabricacion.idodc left join pedido on pedido.idpedido=fabricaciones.idpedido left join material "
                +"on material.idmaterial=fabricaciones.idmaterial WHERE"+where
                +" (material.detalle like '%"+clave+"%' or ordenfabricacion.idordenfabricacion like '%"+clave+"%' or fabricaciones.cantidad"
                +" like '%"+clave+"%' OR odc.numoc like '%"+clave+"%')",
                function(err, odc){
                    if(err) throw err;

                    res.render('plan/table_fabricaciones', {data: odc, key: orden.replace(' ', '-')});
                
            });
        });
    }
  else{res.redirect('bad_login');}  
});

//ERROR EN ESTE CONTROLADOR, ESTA INCOMPLETO, FILTRO NO FUNCIONA
router.post('/buscar_fabricaciones_item', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var clave = input.clave;
        var showPend = input.showPend;
        var where = '';
        console.log(clave);
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
});

router.get('/table_fabricaciones/:orden/:showPend', function(req, res, next){
  if(verificar(req.session.userData)){
        var orden = req.params.orden;
        orden = orden.replace('-', ' ');
        console.log(req.params.showPend);
        var where = " ";
        if(req.params.showPend == 'true'){
            where = " WHERE pedido.externo = '0' AND fabricaciones.restantes>0 ";
        }
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select fabricaciones.*, ordenfabricacion.*,pedido.despachados ,pedido.externo, material.detalle, odc.numoc"
                +" from fabricaciones left join ordenfabricacion on"
                +" ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join "
                +"odc on odc.idodc=ordenfabricacion.idodc left join pedido on pedido.idpedido=fabricaciones.idpedido left join material "
                +"on material.idmaterial=fabricaciones.idmaterial"+where+"ORDER BY "+orden,
                function(err, of){
                    if(err) throw err;

                    res.render('plan/table_fabricaciones', {data: of, key: orden.replace(' ', '-')});
                
            });
        });
    }
  else{res.redirect('bad_login');}  
});

router.get('/construir', function(req, res, next){
  if(verificar(req.session.userData)){
    if(req.session.isUserLogged){
        req.getConnection(function(err,connection){
            if(err) console.log("Connection Error: %s",err);

        
           connection.query("SELECT material.detalle,material.idmaterial,producto.idproducto FROM producto RIGHT JOIN material ON material.idmaterial = producto.idmaterial" +
               " WHERE material.tipo = ? AND material.estado = ? GROUP BY material.idmaterial",["prod","bom"],function (err,materials){
               if(err) console.log("Select Error: %s",err);
               res.render('plan/construir',{data: materials});
           });
        });
    } else res.redirect("/bad_login");
  }
  else{res.redirect('bad_login');}

});

router.get('/item_odcs', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err, connection){
                if(err) throw err;
                connection.query("select odc.*, coalesce(cliente.razon, 'No Definido') as cliente from odc left join cliente on cliente.idcliente=odc.idcliente", function(err, odc){
                    if(err) throw err;
                    console.log(odc);
                    res.render('plan/item_odcs', {data: odc});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('/bad_login');}
});

router.get('/item_ofs/:showPend', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var where = " ";
            if(req.params.showPend){
                where = " WHERE fabricaciones.restantes > 0 "
            }
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err) console.log("Select Error: %s",err);
                   //console.log(rows);
                connection.query("SELECT * FROM ordenfabricacion LEFT JOIN odc ON odc.idodc=ordenfabricacion.idodc LEFT JOIN fabricaciones ON fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion"+where,
                    function (err,of){
                    if(err) console.log("Select Error: %s",err);
                    console.log(of);
                    res.render('plan/item_ofs',{data: of });
                });});
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('/bad_login');}

});
router.get('/list_ofs', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err) console.log("Select Error: %s",err);
                   //console.log(rows);
                connection.query("select ordenfabricacion.*,coalesce(odc.numoc, 'Sin OC') as numoc,sum(coalesce(pedido.despachados, 0)) as sum_desp, sum(fabricaciones.cantidad) as sum_cant,max(fabricaciones.cantidad>COALESCE(pedido.despachados,0) AND to_days(fabricaciones.f_entrega) < to_days(now())) as atraso," +
                    " GROUP_CONCAT(REPLACE(material.detalle,',', '.'),'@',fabricaciones.cantidad,'@'," +
                    " fabricaciones.f_entrega,'@',coalesce(fabricaciones.restantes,fabricaciones.cantidad),'@',fabs.cantidad,'@',coalesce(pedido.despachados, 'Sin OC vinculada'),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',coalesce(pedido.externo,0),'@',fabricaciones.lock,'@', fabricaciones.idfabricaciones) as token from ordenfabricacion" +
                    " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                    " left join material on fabricaciones.idmaterial=material.idmaterial" +
                    " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion left join pedido on pedido.idpedido=fabricaciones.idpedido" +
                    " GROUP BY fabricaciones.idfabricaciones ORDER BY pedido.idpedido DESC) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones left join odc ON odc.idodc = ordenfabricacion.idodc left join pedido ON (pedido.idpedido = fabricaciones.idpedido)" +
                    " GROUP BY ordenfabricacion.idordenfabricacion LIMIT 10",
                    function (err,of){
                    if(err) console.log("Select Error: %s",err);
                    console.log(of.length);
                    console.log(of);

                    res.render('plan/of_list',{data: of, filtro:'!="_"', nomore: 10 > of.length });
                });});
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('/bad_login');}

});




router.get('/list_peds', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err) console.log("Select Error: %s",err);
                   
                    connection.query("SELECT * FROM (select odc.*,group_concat(replace(material.detalle,',','.'),'@',pedido.cantidad,'@'"
                        +",pedido.despachados,'@',pedido.f_entrega,'@',to_days(pedido.f_entrega) - to_days(now()), '@',"+/*coalesce(desp_ped.desp_num,*/ '0'+/*)*/",'@NODATE@',coalesce(pedido.precio, 0),'@',pedido.externo,'@', coalesce(fabricaciones.restantes, 'Sin OF'),'@',pedido.idpedido ) as token,sum(pedido.cantidad) as sum_cant, sum(pedido.despachados) as sum_desp, "
                        +"max(pedido.cantidad>pedido.despachados AND to_days(pedido.f_entrega) < to_days(now())+1 ) as atraso, cliente.sigla, cliente.razon from odc left join pedido on pedido.idodc= odc.idodc"+ /*left join (select pedido.idpedido,count(despacho.iddespacho) as desp_num,max(despacho.fecha) as ult_desp from pedido left join despacho on Pedin_despacho(despacho.idf_token,pedido.idpedido) group by pedido.idpedido)"
                        +"as desp_ped on desp_ped.idpedido=pedido.idpedido*/" left join fabricaciones on fabricaciones.idpedido=pedido.idpedido left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente group by odc.idodc) as group_odc left join (select despacho.idorden_f"
                        +",(despacho.iddespacho),max(despacho.fecha) as ult_desp from despacho group by despacho.idorden_f) as despachos on (despachos.idorden_f=group_odc.idodc) limit 10",
                        function (err,ped){
                            if(err) console.log("Select Error: %s",err);

                            res.render('plan/ped_list',{data: ped, selector: 'todos', nomore: ped.length < 10});
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});


router.get('/page_of/:idof', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            console.log(req.params.idof);
            var idof = req.params.idof;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT ordenfabricacion.*, cliente.* FROM ordenfabricacion LEFT JOIN odc ON odc.idodc = ordenfabricacion.idodc LEFT JOIN cliente ON cliente.idcliente=odc.idcliente WHERE ordenfabricacion.idordenfabricacion = ?",[idof], function(err, of){
                    if(err) console.log("Select Error: %s",err);
                    connection.query("SELECT fabricaciones.*, material.*, (to_days(fabricaciones.f_entrega)-to_days(now())) as dias "
                        +"FROM fabricaciones LEFT JOIN material ON material.idmaterial = fabricaciones.idmaterial "
                        +"WHERE fabricaciones.idorden_f = ? ORDER BY (fabricaciones.numitem*1)",[idof], function(err ,fabs){
                        if(err) console.log("Select Error: %s",err);

                        //res.redirect('/plan');
                        res.render('plan/page_of', {of:of[0], fabs: fabs});
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.get('/page_oc/:idodc', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            console.log(req.params.idodc);
            var idodc = req.params.idodc;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT * FROM odc LEFT JOIN cliente ON cliente.idcliente=odc.idcliente WHERE odc.idodc = ?",[idodc], function(err, odc){
                    if(err) console.log("Select Error: %s",err);
                    connection.query("SELECT pedido.*, material.*, (to_days(pedido.f_entrega)-to_days(now())) as dias FROM pedido "
                        +"LEFT JOIN material ON material.idmaterial=pedido.idmaterial WHERE pedido.idodc = ? ORDER BY (pedido.numitem*1)",[idodc], function(err ,ped){
                            if(err) console.log("Select Error: %s",err);
                            
                            //res.redirect('/plan');
                            res.render('plan/page_oc', {odc: odc[0], ped: ped});
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});



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
                        
                            res.render('plan/client_list',{largo: client.length});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});
router.get('/search_client/:key', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            console.log(req.params);
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
                            res.render('plan/cliente_page',{data: client});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});



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
                        
                            console.log(client);
                            res.render('plan/cliente_page',{data: client});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

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
                    connection.query(/*"select odc.*,group_concat(replace(material.detalle,',','.'),'@',pedido.cantidad,'@'"
                        +",pedido.despachados,'@',pedido.f_entrega) as token,sum(pedido.cantidad) as sum_cant, sum(pedido.despachados) as sum_desp, "
                        +"max(pedido.cantidad>pedido.despachados AND pedido.f_entrega < now()) as atraso, cliente.sigla, cliente.razon from odc left join pedido on pedido.idodc= odc.idodc "
                        +"left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente where odc.idcliente = ? group by odc.idodc"*/
                        "SELECT * FROM (SELECT * FROM (select odc.*,group_concat(replace(material.detalle,',','.'),'@',pedido.cantidad,'@'"
                        +",pedido.despachados,'@',pedido.f_entrega,'@',to_days(pedido.f_entrega) - to_days(now()), '@',coalesce(desp_ped.desp_num, 0) ,'@',coalesce(desp_ped.ult_desp, 'NODATE') ) as token,sum(pedido.cantidad) as sum_cant, sum(pedido.despachados) as sum_desp, "
                        +"max(pedido.cantidad>pedido.despachados AND to_days(pedido.f_entrega) < to_days(now())+1 ) as atraso, cliente.sigla, cliente.razon from odc left join pedido on pedido.idodc= odc.idodc left join (select pedido.idpedido,count(despacho.iddespacho) as desp_num,max(despacho.fecha) as ult_desp from pedido left join despacho on Pedin_despacho(despacho.idf_token,pedido.idpedido) group by pedido.idpedido)"
                        +"as desp_ped on desp_ped.idpedido=pedido.idpedido left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente group by odc.idodc) as group_odc left join (select despacho.idorden_f"
                        +",(despacho.iddespacho),max(despacho.fecha) as ult_desp from despacho group by despacho.idorden_f) as despachos on (despachos.idorden_f=group_odc.idodc)) AS inquery WHERE inquery.idcliente = ?",[idcl], function(err, odcs){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        console.log(cl);

                        res.render('plan/ped_list',{data: odcs, selector: 'todos', nomore: true});
                        //res.render('plan/odc_client', {largo: odcs.length, idc: idcl, detail: cl[0]});
                        
                    });
                });    
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

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


router.post('/edit_oc', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var input = JSON.parse(JSON.stringify(req.body));
            console.log(input);
            if(typeof input['idped[]'] == 'string'){
                input['idped[]'] = [input['idped[]']]; 
                input['newprecio[]'] = [input['newprecio[]']]; 
                input['newdate[]'] = [input['newdate[]']]; 
                input['newcant[]'] = [input['newcant[]']]; 
            }
            req.getConnection(function(err, connection){
                if(err)
                    console.log("Error Connection : %s", err);
                
                connection.query("SELECT * FROM pedido LEFT JOIN odc ON odc.idodc=pedido.idodc WHERE pedido.idodc = ?", [input.idodc], function(err, befPed){
                    if(err)
                        console.log("Error Selecting :%s", err);

                    var token;
                    for(var e=0; e < befPed.length; e++){
                        if(e == 0){
                            token = befPed[e].idcliente+"@"+befPed[e].numoc+"@";
                        }
                        token += befPed[e].idpedido+","+new Date(befPed[e].f_entrega).toLocaleString()+","+befPed[e].precio+"@";
                    }
                    token = token.substring(0, token.length-1);
                    //INSERT INTO `siderval`.`save` (`token`) VALUES ('DDQWD');
                    connection.query("INSERT INTO save (llave,token) VALUES ?",[[['odcRev',token]]], function(err, inSave){
                        if(err)
                            console.log("Error Insert : %s", err);

                        
                        var upqc = "UPDATE pedido SET cantidad = CASE ";
                        var upqd = "UPDATE pedido SET f_entrega = CASE ";
                        var upqp = "UPDATE pedido SET precio = CASE ";
                        var upqr = "UPDATE fabricaciones SET restantes = CASE ";
                        var upqfc = "UPDATE fabricaciones SET cantidad = CASE ";
                        var ids = '';
                        var send = {
                            idped: [],
                            ocant: [],
                            oprice: [],
                            odate: [],
                            orest: []
                        };
                        for(var i=0; i < input['idped[]'].length; i++){
                                send.idped.push(input['idped[]'][i]);
                                upqc += "WHEN idpedido = "+input['idped[]'][i]+" THEN "+input['newcant[]'][i]+" ";
                                
                                if(input['rest[]'][i] == 'EX'){
                                    send.orest.push('none');
                                    upqr += "WHEN idpedido = "+input['idped[]'][i]+" THEN restantes ";
                                }
                                else{
                                    send.orest.push(parseInt(input['rest[]'][i])+(parseInt(input['newcant[]'][i]) - parseInt(input['ocant[]'][i])));
                                    upqr += "WHEN idpedido = "+input['idped[]'][i]+" THEN "+(parseInt(input['rest[]'][i])+(parseInt(input['newcant[]'][i]) - parseInt(input['ocant[]'][i])))+" ";
                                    upqfc += "WHEN idpedido = "+input['idped[]'][i]+" THEN "+parseInt(input['newcant[]'][i])+" ";
                                    
                                }
                                send.ocant.push(input['newcant[]'][i]);
                                upqd += "WHEN idpedido = "+input['idped[]'][i]+" THEN '"+new Date(new Date(input['newdate[]'][i]).getTime() + 86400000).toLocaleString()+"' ";
                                send.odate.push(new Date(new Date(input['newdate[]'][i]).getTime() + 86400000).toLocaleString());
                                upqp += "WHEN idpedido = "+input['idped[]'][i]+" THEN "+input['newprecio[]'][i]+" ";
                                send.oprice.push(input['newprecio[]'][i]);
                                ids += input['idped[]'][i]+",";
                        }
                        ids = ids.substring(0, ids.length-1);
                        upqc += "ELSE cantidad END WHERE idpedido in ("+ids+")";
                        upqr += "ELSE restantes END WHERE idpedido in ("+ids+")";
                        upqfc += "ELSE cantidad END WHERE idpedido in ("+ids+")";
                        upqd += "ELSE f_entrega END WHERE idpedido in ("+ids+")";
                        upqp += "ELSE precio END WHERE idpedido in ("+ids+")";
                        connection.query(upqc, function(err, inSave){
                            if(err)
                                console.log("Error Insert : %s", err);
                            
                            connection.query(upqr, function(err, inSave){
                                    if(err)
                                        console.log("Error Insert : %s", err);
                                    
                                connection.query(upqd, function(err, inSave){
                                    if(err)
                                        console.log("Error Insert : %s", err);
                                    
                                    connection.query(upqp, function(err, inSave){
                                            if(err)
                                                console.log("Error Insert : %s", err);
                                        
                                        connection.query(upqfc, function(err, inSave){
                                                if(err)
                                                    console.log("Error Insert : %s", err);
                                                
                                                console.log(send);
                                                res.send(send);
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
             
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.post('/edit_client', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var input = JSON.parse(JSON.stringify(req.body));
            console.log("Editando Cliente");
            console.log(input);
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


router.get('/info_client/:idcliente', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var id = req.params.idcliente;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT * FROM cliente WHERE idcliente =  ?", [id],
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            console.log(client[0]);
                            res.send(client[0]);
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.get('/show_ofs', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT ordenfabricacion.*,GROUP_CONCAT(DISTINCT fabricaciones.idfabricaciones) as fabs FROM ordenfabricacion LEFT JOIN fabricaciones ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion" +
                    " GROUP BY ordenfabricacion.idordenfabricacion",function (err,of){
                    if(err) console.log("Select Error: %s",err);
                    res.render('plan/show_of');
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});


router.post('/addsession_prefabr', function(req,res,next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT material.detalle,caracteristica.cnom FROM material LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica WHERE material.idmaterial = ?",
                [req.body.idm],function(err, details){
                    if(err){console.log("Error Selecting : %s", err);}
                    res.send("<tr><td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'><input type='hidden' name='idp' value='" + req.body.idp +"'></td><td><input type='date' name='fechas' class='form-control' min='"+ new Date().toLocaleDateString() +"' required></td>" +
                        "<td><input class='form-control' type='number' name='cants' min='1' required></td><td style='text-align: center;'><input type='checkbox' name='lock'></td><td><a onclick='drop(this)' class='btn btn-danger'><i class='fa fa-remove'></i></a></td></tr>");
                });
        });
    } else res.redirect("/bad_login");

});

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

                    res.render("plan/lanzar_" + req.params.tipo,{caracts: rows, cli: cli});
                });
            });    
        })
    } else res.redirect("/bad_login");

});

router.post('/crear_odc', function(req, res, next){
    if(verificar(req.session.userData)){
        var dats = {
          numordenfabricacion: req.body.nroordenfabricacion,
          estado: "incompleto"
        };
        var cliente = JSON.parse(JSON.stringify(req.body)).cliente;
        var moneda = JSON.parse(JSON.stringify(req.body)).moneda;
        var factor_item = JSON.parse(JSON.stringify(req.body)).factor_item;
        console.log(req.body);
        var list = [];
        var listp = [];
        var abast = [];
        if(typeof req.body['idm[]'] != 'undefined'){
            req.getConnection(function(err,connection){
                var bolfab = false;
                var bolabast = false;         
                connection.query("INSERT INTO odc SET ?",[{numoc: req.body.nroordenfabricacion, idcliente: cliente, moneda: moneda}],function(err,odc){
                    if(err)throw err;
                    if(typeof req.body['idm[]'] == 'string'){
                        if(req.body['prov[]'] == '-1'){
                            bolfab = true;
                            console.log("prov[]:" + req.body['prov[]']);
                            console.log("bolfab:" + bolfab);
                            listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], false, 0, (1)*factor_item]);
                        }
                        else{
                            bolfab = true;
                            bolabast = true;
                            console.log("prov[]:" + req.body['prov[]']);
                            console.log("bolfab:" + bolfab);
                            listp.push([odc.insertId,0,req.body['fechas[]'],parseInt(req.body['idm[]']),parseInt(req.body['cants[]']), req.body['precio[]'], true, 0, (1)*factor_item]);
                        }
                    } else {
                        for(var i = 0;i<req.body['idm[]'].length;i++){
                            if(req.body['prov[]'][i] == '-1'){
                                bolfab = true;
                                console.log("prov[]:" + req.body['prov[]'][i]);
                                console.log("bolfab:" + bolfab);
                                listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], false, 0, (i+1)*factor_item]);
                            }
                            else{
                                bolabast = true;
                                bolfab = true;
                                console.log("prov[]:" + req.body['prov[]'][i]);
                                console.log("bolfab:" + bolfab);
                                listp.push([odc.insertId,0,req.body['fechas[]'][i],req.body['idm[]'][i],req.body['cants[]'][i], req.body['precio[]'][i], true, 0,(i+1)*factor_item]);
                            }
                        }
                    }
                    dats.idodc = odc.insertId;
                connection.query("INSERT INTO pedido " +
                                    "(`idodc`,`despachados`," +
                                    "`f_entrega`," +
                                    "`idmaterial`," +
                                    "`cantidad`,`precio`, `externo`, `idproveedor`,`numitem`) " +
                                    "VALUES ?",[listp],function(err,Peds){
                                    if(err)throw err;
                                    if(bolfab){
                                        console.log(Peds);
                                        connection.query("INSERT INTO ordenfabricacion SET ?",dats,function(err,rows){
                                            if(err)
                                                console.log("Error Selecting : %s ",err );

                                            var idof = rows.insertId;
                                            if(typeof req.body['idm[]'] == 'string'){
                                                    //if(req.body['prov[]']=='-1'){
                                                        list.push([rows.insertId,req.body['cants[]'],req.body['fechas[]'],req.body['idm[]'],req.body['idp[]'],req.body['cants[]'], req.body['lock[]'], Peds.insertId, (1)*factor_item]);
                                                    //}
                                            } else {
                                                for(var i = 0;i<req.body['idm[]'].length;i++){
                                                    //if(req.body['prov[]'][i] == '-1'){
                                                        list.push([rows.insertId,req.body['cants[]'][i],req.body['fechas[]'][i],req.body['idm[]'][i],req.body['idp[]'][i],req.body['cants[]'][i], req.body['lock[]'][i], Peds.insertId, (i+1)*factor_item]);
                                                        Peds.insertId++;
                                                    //}
                                                }
                                            }
                                            console.log(list);
                                            connection.query("INSERT INTO fabricaciones (`idorden_f`,`cantidad`,`f_entrega`,`idmaterial`,`idproducto`,`restantes`, `lock`, `idpedido`, `numitem`) VALUES ?",[list],function(err,fabrs){
                                                if(err)throw err;

                                                //req.session.estadoAlm = { cliente: '6331', nroordenfabricacion: '' };
                                                
                                                connection.query("INSERT INTO save (llave,token) VALUES ?",[[['odc', '6331@']]],function(err,inSave){
                                                    if(err) console.log(err);
                                                    
                                                    res.send(idof+'');
                                                    //res.redirect('/plan/lanzar_of/pedido');
                                                    //res.redirect('/plan/lanzar_of/of');
                                                });
                                                });
                                            });
                                    }
                                    else{
                                        //req.session.estadoAlm = { cliente: '6331', nroordenfabricacion: '' };
                                        //res.redirect('/plan/lanzar_of/pedido');
                                        
                                                connection.query("INSERT INTO save (llave,token) VALUES ?",[[['odc', '6331@']]],function(err,inSave){
                                                    if(err) console.log(err);
                                                    res.send('none');
                                                    //res.redirect('/plan/lanzar_of/pedido');
                                                    //res.redirect('/plan/lanzar_of/of');
                                                });

                                    }
                                    });
                            });
                        //console.log(query.sql);
                });
        } else {
            res.send("error");
        }
    } else res.redirect("/bad_login");
});

router.post('/habilitar_fabricacion', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var idfab = input.idfab;
        var lock = input.lock;
        req.getConnection(function(err, connection){
            connection.query("UPDATE fabricaciones SET `lock` = NOT `lock` WHERE idfabricaciones = ?", [idfab], function(err, upfab){
                if(err)
                    console.log("Error Updating : %s", err);

                console.log(upfab);
                res.send('ok');
            });
        });
    } else res.redirect("/bad_login");
});

router.post('/crear_of', function(req, res, next){
    if(verificar(req.session.userData)){
        var dats = {
          numordenfabricacion: req.body.nroordenfabricacion,
          estado: "incompleto"
        };
        var cliente = JSON.parse(JSON.stringify(req.body)).cliente;
        var factor_item = JSON.parse(JSON.stringify(req.body)).factor_item;
        var list = [];
        var listp = [];
        var abast = [];
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



router.get('/xlsx_of', function(req,res){
    if(verificar(req.session.userData)){
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
        req.getConnection(function(err, connection) {
            if(err)
                console.log("Error connection : %s", err);
            connection.query("select material.codigo,fabricaciones.idorden_f,fabricaciones.restantes,coalesce(prod_query.pt,0) as pt,coalesce(odc.numoc, 'SIDERVAL') as numoc,"
                +" material.detalle,subaleacion.subnom as aleacion, coalesce(pedido.despachados,"
                +" concat(fabricaciones.cantidad-fabricaciones.restantes, ' sin producción')) as despachados,"
                +" coalesce(pedido.cantidad, fabricaciones.cantidad) as solicitados, coalesce(material.peso,0) as peso_u,"
                +" coalesce(material.peso*pedido.cantidad,0) as peso_t, coalesce(material.peso*(pedido.cantidad - pedido.despachados),0)"
                +" as peso_d, coalesce(pedido.f_entrega, fabricaciones.f_entrega) as f_entrega,coalesce(group_concat(despacho.iddespacho),"
                +" 'Sin GD') as gd from fabricaciones left join material on material.idmaterial=fabricaciones.idmaterial left join pedido on"
                +" pedido.idpedido=fabricaciones.idpedido left join producido on producido.idmaterial=material.idmaterial left join subaleacion"
                +" on subaleacion.idsubaleacion=producido.idsubaleacion left join odc on odc.idodc=pedido.idodc left join despacho on Pedin_despacho(despacho.idf_token,pedido.idpedido)"
                +" left join (select produccion.idfabricaciones ,sum(produccion.`8`) as pt  from produccion group by produccion.idfabricaciones) as prod_query on prod_query.idfabricaciones=fabricaciones.idfabricaciones group by pedido.idpedido order by fabricaciones.idfabricaciones",
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    console.log(rows);
                    if(rows.length>0){
                        var nombre = 'csvs/master_of_' + ident + '.xlsx';
                        sheet.getCell('A1').value = 'Código';
                        sheet.getCell('B1').value = 'OF';
                        sheet.getCell('C1').value = 'Estado';
                        sheet.getCell('D1').value = 'OC';
                        sheet.getCell('E1').value = 'Item';
                        sheet.getCell('F1').value = 'Solicitados';
                        sheet.getCell('G1').value = 'Despachados';
                        sheet.getCell('H1').value = 'Detalle';
                        sheet.getCell('I1').value = 'Aleación';
                        sheet.getCell('J1').value = 'Peso Unitario';
                        sheet.getCell('K1').value = 'Peso por Despachar';
                        sheet.getCell('L1').value = 'Peso Total';
                        sheet.getCell('M1').value = 'GD';
                        sheet.getCell('N1').value = 'Días de Atraso';
                        sheet.getCell('O1').value = 'Sin Producir';
                        sheet.getCell('P1').value = 'Planta';
                        sheet.getCell('Q1').value = 'Finalizados';
                        sheet.getCell('R1').value = 'Fecha de Entrega';
                        var numitem = 0;
                        var fechaInicio;
                        var fechaFin;
                        var diff = 0;   
                        for(var j=0; j<rows.length; j++){
                            numitem++;
                            auxrow = 2 + j;
                            sheet.getCell('A' + auxrow.toString()).value = rows[j].codigo;
                            sheet.getCell('B' + auxrow.toString()).value = rows[j].idorden_f;
                            if(rows[j].solicitados == rows[j].despachados){
                                sheet.getCell('C' + auxrow.toString()).value = "Finalizado";
                            }
                            else if(new Date(rows[j].f_entrega) > new Date()){
                                fechaEntrega = new Date(rows[j].f_entrega).getTime();
                                Hoy    = new Date().getTime();
                                diff = Hoy - fechaEntrega;
                                console.log(diff);
                                console.log(diff/(1000*60*60*24));
                                sheet.getCell('C' + auxrow.toString()).value = "Atrasado";
                            }
                            else{
                                sheet.getCell('C' + auxrow.toString()).value = "Por Entregar";
                            }
                            sheet.getCell('D' + auxrow.toString()).value = rows[j].numoc;
                            sheet.getCell('E' + auxrow.toString()).value = numitem;
                            sheet.getCell('F' + auxrow.toString()).value = rows[j].solicitados;
                            sheet.getCell('G' + auxrow.toString()).value = rows[j].despachados;
                            sheet.getCell('H' + auxrow.toString()).value = rows[j].detalle;
                            sheet.getCell('I' + auxrow.toString()).value = rows[j].aleacion;
                            sheet.getCell('J' + auxrow.toString()).value = rows[j].peso_u;
                            sheet.getCell('K' + auxrow.toString()).value = rows[j].peso_d;
                            sheet.getCell('L' + auxrow.toString()).value = rows[j].peso_t;
                            sheet.getCell('M' + auxrow.toString()).value = rows[j].gd;
                            sheet.getCell('N' + auxrow.toString()).value = diff;
                            sheet.getCell('O' + auxrow.toString()).value = rows[j].restantes;
                            sheet.getCell('P' + auxrow.toString()).value = rows[j].solicitados - rows[j].restantes;
                            sheet.getCell('Q' + auxrow.toString()).value = rows[j].pt;
                            sheet.getCell('R' + auxrow.toString()).value = rows[j].f_entrega;
                            if(rows[j+1]){
                                if(rows[j+1].idorden_f != rows[j].idorden_f ){
                                    numitem = 0;
                                }
                            }
                        }
                        workbook.xlsx.writeFile('public/' + nombre)
                            .then(function() {
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
                connection.query("SELECT despacho.*,ordenfabricacion.numordenfabricacion FROM despacho LEFT JOIN ordenfabricacion ON despacho.idorden_f = ordenfabricacion.idordenfabricacion GROUP BY despacho.iddespacho ORDER BY despacho.fecha DESC",
                function(err, rows){
                    if (err)
                        console.log("Error Select : %s ",err );

                    console.log(rows);
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
                        sheet.getCell('C1').value = 'Nombre';
                        sheet.getCell('D1').value = 'Cantidad';
                        sheet.getCell('E1').value = 'Fecha de Despacho';
                         for (var i = 0; i < rows.length; i++) {
                            tokenizer2 = rows[i].mat_token.split('@@');
                            tokenizer = rows[i].cant_token.split(',');
                            console.log('i: '+ i);
                            console.log("tokenizer length: "+tokenizer.length);
                            for(var j = 0; j<tokenizer.length; j++){
                                console.log(aux);
                                sheet.getCell('A' + aux.toString()).value = rows[i].iddespacho;
                                sheet.getCell('B' + aux.toString()).value = rows[i].numordenfabricacion;
                                sheet.getCell('C' + aux.toString()).value = tokenizer2[j]; 
                                sheet.getCell('D' + aux.toString()).value = tokenizer[j];
                                sheet.getCell('E' + aux.toString()).value = new Date(rows[i].fecha).toLocaleDateString();
                                aux++;
                            }
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

router.post('/producidos_stream', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        input.det = "%" + input.det + "%";
        var wher = "WHERE (material.tipo = 'P' OR material.tipo= 'S') "+ /*AND material.especificacion = 1 */"AND material.detalle LIKE ?";
        var dats = [input.det];
        if(input.caract != "0"){
            wher += " AND material.caracteristica = ?";
            dats.push(parseInt(input.caract));
        }
        req.getConnection(function(err,connection){
            connection.query("SELECT material.*,caracteristica.cnom,producido.pdf,aleacion.nom,producido.idproducto as idprod,subaleacion.subnom FROM material INNER JOIN producido ON material.idmaterial = producido.idmaterial" +
                " LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producido.idsubaleacion LEFT JOIN aleacion ON "+/*subaleacion.idaleacion*/"CAST(substring(material.codigo,4,2) AS UNSIGNED) = aleacion.idaleacion" +
                " LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica " + wher + " GROUP BY producido.idproducto",dats,function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                /*console.log("SELECT material.*,caracteristica.cnom,producido.pdf,aleacion.nom,producido.idproducto as idprod,subaleacion.subnom FROM material LEFT JOIN producido ON material.idmaterial = producido.idmaterial" +
                " LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producido.idsubaleacion LEFT JOIN aleacion ON subaleacion.idaleacion = aleacion.idaleacion" +
                " LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica " + wher + " GROUP BY producido.idproducto");*/
                console.log(rows);
                res.render('plan/prefabrs_stream',{data:rows});

            });
            //console.log(query.sql);
        });
    } else res.redirect("/bad_login");
});


router.get('/levantar_oc', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var oc = [];
                var ped = [];
                for(var r=0; r < rows.length; r++){
                    console.log(rows[r]);
                    oc.push([rows[r][0], rows[r][8] /*rows[r][9]*/, rows[r][10] ] );
                }
                req.getConnection(function(err, connection){
                    if(err)
                        console.log("Error Connection : %s", err);

                    connection.query("SELECT * FROM cliente", function(err, cli){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        for(var e=0; e < oc.length; e++){
                            for(var a=0; a < cli.length; a++){
                                if(oc[r][1] == cli[a].sigla){
                                    oc[r][1] == cli[a].idcliente;
                                } 
                            }
                        }
                        connection.query("INSERT INTO odc (`numoc`,`idcliente`, `creacion`) VALUES ?",[oc], function(err, inOC){
                            if(err)
                                console.log("Error Inserting : %s", err);

                            /*connection.query("INSERT INTO pedido (`idodc`,`cantidad`,`despachados`,`externo`,`f_entrega`) VALUES ?",[ped], function(err, inOC){
                                if(err)
                                    console.log("Error Inserting : %s", err);

                                
                            });*/
                        });

                    });
                });
            });
        var input = fs.createReadStream('csvs/OrdenesCompra.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});



router.get('/parsecsv_bomBD', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mats = [];
                for(var i=1; i<rows.length; i++){
                    //console.log(rows);
                    //         CODIGO master cod insumo  cantidad 
                    mats.push([rows[i][0], rows[i][2],parseFloat(rows[i][4]) ]);
                }
                console.log(mats);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM material", function(err, productos){
                        if(err)
                            console.log("Error Selecting : %s");
                        for(var e=0; e < productos.length; e++){
                            for(var r=0; r < mats.length; r++){
                                if(mats[r][0] == productos[e].codigo){
                                    mats[r][0] = productos[e].idmaterial;
                                }
                                if(mats[r][1] == productos[e].codigo){
                                    mats[r][1] = productos[e].idmaterial;
                                }
                            }
                        }
                        connection.query("SELECT * FROM producto",function(err,product){
                            if(err) {
                                throw err;
                            }
                            //console.log(mats);
                            for(var r=0; r < mats.length; r++){
                                for(var e=0; e < product.length; e++){
                                    if(mats[r][0] == product[e].idmaterial){
                                        mats[r][3] = product[e].idproducto;
                                        break;
                                    }
                                    else if(r == product.length-1){
                                        console.log("idmaterial: "+mats[r][0]);
                                    }
                                }
                            }
                            //console.log(mats);
                            connection.query("INSERT IGNORE INTO bom (`idmaterial_master`,`idmaterial_slave`,`cantidad`,`idproducto`) VALUES ?",[mats],function(err,rows){
                                if(err) {
                                    throw err;
                                }
                                console.log(rows);
                                res.redirect('/plan');
                            });
                        });
                        
                    });
                    
                });
            });
        var input = fs.createReadStream('csvs/BOM.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});
router.get('/parsecsv_procesado', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var array = [];
                var names = [];
                var suma = 0;
                var codes = "(";
                for(var i=1; i<rows.length; i++){
                    suma = parseInt(rows[i][4])+parseInt(rows[i][5])+parseInt(rows[i][6])+
                        parseInt(rows[i][7])+parseInt(rows[i][8])+parseInt(rows[i][9])+parseInt(rows[i][10]);
                    if(names.indexOf(rows[i][3]) == -1){
                        array.push({   
                                nombre: rows[i][3],
                                cantidad:  suma,
                                procesado: 0,
                                diferencia: 0,
                                molIni: parseInt(rows[i][4]),
                                fusIni: parseInt(rows[i][5]),
                                quiIni: parseInt(rows[i][6]),
                                terIni: parseInt(rows[i][8]),
                                ttoIni: parseInt(rows[i][7]),
                                calIni: parseInt(rows[i][9]),
                                bptIni: parseInt(rows[i][10]),
                                mol: parseInt(rows[i][4]),
                                fus: parseInt(rows[i][5]),
                                qui: parseInt(rows[i][6]),
                                ter: parseInt(rows[i][8]),
                                tto: parseInt(rows[i][7]),
                                cal: parseInt(rows[i][9]),
                                bpt: parseInt(rows[i][10]),
                                codigo: rows[i][2]
                            });
                        names.push(rows[i][3]);
                        codes += "'"+rows[i][2]+"',";
                    }
                    else{
                        //if(req.params.dia == rows[i][1]){
                            array[names.indexOf(rows[i][3])].procesado += suma;
                            /*
                            array[names.indexOf(rows[i][3])].mol -= parseInt(rows[i][4]);                        
                            array[names.indexOf(rows[i][3])].fus -= parseInt(rows[i][5]);                        
                            array[names.indexOf(rows[i][3])].qui -= parseInt(rows[i][6]);                        
                            array[names.indexOf(rows[i][3])].ter -= parseInt(rows[i][8]);                        
                            array[names.indexOf(rows[i][3])].tto -= parseInt(rows[i][7]);                        
                            array[names.indexOf(rows[i][3])].cal -= parseInt(rows[i][9]);
                            
                            array[names.indexOf(rows[i][3])].fus += parseInt(rows[i][4]);
                            array[names.indexOf(rows[i][3])].qui += parseInt(rows[i][5]);
                            array[names.indexOf(rows[i][3])].ter += parseInt(rows[i][6]);
                            array[names.indexOf(rows[i][3])].tto += parseInt(rows[i][8]);
                            array[names.indexOf(rows[i][3])].cal += parseInt(rows[i][7]);                        
                            array[names.indexOf(rows[i][3])].bpt += parseInt(rows[i][9]);
                            Moldeo  1 [4]
                            Fusión  2 [5]  
                            Quiebre 3 [6] 
                            Tratamiento Térmico 5 [7]
                            Terminación 4 [8]
                            Control de Calidad  7 [9]
                            Producto Terminado  8 [10]
                                
                                1,2,3,5,4,7,8
                         */    
                            
                            array[names.indexOf(rows[i][3])].mol -= parseInt(rows[i][4]);                        
                            array[names.indexOf(rows[i][3])].fus += parseInt(rows[i][4]);
                            
                            array[names.indexOf(rows[i][3])].fus -= parseInt(rows[i][5]);                        
                            array[names.indexOf(rows[i][3])].qui += parseInt(rows[i][5]);
                            
                            array[names.indexOf(rows[i][3])].qui -= parseInt(rows[i][6]);                        
                            array[names.indexOf(rows[i][3])].tto += parseInt(rows[i][6]);
                            
                            array[names.indexOf(rows[i][3])].tto -= parseInt(rows[i][7]);                        
                            array[names.indexOf(rows[i][3])].ter += parseInt(rows[i][7]);
                            
                            array[names.indexOf(rows[i][3])].ter -= parseInt(rows[i][8]);                        
                            array[names.indexOf(rows[i][3])].cal += parseInt(rows[i][8]);                        
                            
                            array[names.indexOf(rows[i][3])].cal -= parseInt(rows[i][9]);
                            array[names.indexOf(rows[i][3])].bpt += parseInt(rows[i][9]);
                        //}
                    }
                }
                /*array[names.indexOf(rows[i][3])].mol -= parseInt(rows[i][4]);                        
                array[names.indexOf(rows[i][3])].fus += parseInt(rows[i][4]);
                array[names.indexOf(rows[i][3])].fus -= parseInt(rows[i][5]);                        
                array[names.indexOf(rows[i][3])].qui += parseInt(rows[i][5]);

                array[names.indexOf(rows[i][3])].qui -= parseInt(rows[i][6]);                        
                array[names.indexOf(rows[i][3])].ter += parseInt(rows[i][6]);

                array[names.indexOf(rows[i][3])].ter -= parseInt(rows[i][8]);                        
                array[names.indexOf(rows[i][3])].tto += parseInt(rows[i][8]);

                array[names.indexOf(rows[i][3])].tto -= parseInt(rows[i][7]);                        
                array[names.indexOf(rows[i][3])].cal += parseInt(rows[i][7]);                        
                
                
                array[names.indexOf(rows[i][3])].cal -= parseInt(rows[i][9]);
                array[names.indexOf(rows[i][3])].bpt += parseInt(rows[i][9]);
                Moldeo  1
                Fusión  2
                Quiebre 3
                Tratamiento Térmico 5
                Terminación 4
                Control de Calidad  7
                Maestranza  6
                Producto Terminado  8

                    1,2,3,5,4,7,8
                */
                codes = codes.substring(0,codes.length-1) + ")";
                //moldeo = [];
                for(var j=0; j<array.length; j++){
                    array[j].diferencia = array[j].cantidad - array[j].procesado;
                    if(array[j].mol < 0){
                        array[j].molIni += (array[j].mol*-1);
                    }
                    if(array[j].fus < 0){
                        array[j].fusIni += (array[j].fus*-1);
                    }
                    if(array[j].qui < 0){
                        array[j].quiIni += (array[j].qui*-1);
                    }
                    if(array[j].ter < 0){
                        array[j].terIni += (array[j].ter*-1);
                    }
                    if(array[j].cal < 0){
                        array[j].calIni += (array[j].cal*-1);
                    }
                    //moldeo.push(array[j].molIni);

                }
                //names = [];
                //array = [];
               /* for(var i=1; i<rows.length; i++){
                    suma = parseInt(rows[i][4])+parseInt(rows[i][5])+parseInt(rows[i][6])+
                        parseInt(rows[i][7])+parseInt(rows[i][8])+parseInt(rows[i][9])+parseInt(rows[i][10]);
                    if(names.indexOf(rows[i][3]) == -1){
                        array.push({   
                                nombre: rows[i][3],
                                cantidad:  suma,
                                procesado: 0,
                                diferencia: 0,
                                molIni: moldeo[i-1],
                                mol: moldeo[i-1],
                                fus: parseInt(rows[i][5]),
                                qui: parseInt(rows[i][6]),
                                ter: parseInt(rows[i][8]),
                                tto: parseInt(rows[i][7]),
                                cal: parseInt(rows[i][9]),
                                maes: 0,
                                bpt: parseInt(rows[i][10]),
                                codigo: rows[i][2]
                            });
                        names.push(rows[i][3]);
                    }
                    else{
                        if(req.params.dia == rows[i][1]){
                            array[names.indexOf(rows[i][3])].procesado += suma;
            
                            

                            array[names.indexOf(rows[i][3])].mol -= parseInt(rows[i][4]);                        
                            array[names.indexOf(rows[i][3])].tto += parseInt(rows[i][4]);
                            
                            array[names.indexOf(rows[i][3])].tto -= parseInt(rows[i][7]);                        
                            array[names.indexOf(rows[i][3])].qui += parseInt(rows[i][7]);
                            
                            array[names.indexOf(rows[i][3])].qui -= parseInt(rows[i][6]);                        
                            array[names.indexOf(rows[i][3])].ter += parseInt(rows[i][6]);

                            array[names.indexOf(rows[i][3])].ter -= parseInt(rows[i][8]);                        
                            array[names.indexOf(rows[i][3])].fus += parseInt(rows[i][8]);
                            
                            array[names.indexOf(rows[i][3])].fus -= parseInt(rows[i][5]);                        
                            array[names.indexOf(rows[i][3])].cal += parseInt(rows[i][5]);                        
                            
                            array[names.indexOf(rows[i][3])].cal -= parseInt(rows[i][9]);                        
                            array[names.indexOf(rows[i][3])].maes += parseInt(rows[i][9]);                        

                            array[names.indexOf(rows[i][3])].maes -= parseInt(rows[i][9]);
                            array[names.indexOf(rows[i][3])].bpt += parseInt(rows[i][9]);
                        }
                    }
                }
                */
                req.getConnection(function(err, connection){
                    if(err) throw err;
                    connection.query("SELECT idmaterial, codigo FROM material WHERE codigo in "+codes, function(err, mats){
                        if(err) throw err;
                        for(var w=0; w < mats.length; w++){
                            for(var q=0; q<array.length; q++){
                                if(mats[w].codigo == array[q].codigo){
                                    array[q].idmat = mats[w].idmaterial;
                                    break;
                                }
                            }
                        }
                        connection.query("SELECT produccion.idproduccion, fabricaciones.idfabricaciones, fabricaciones.idmaterial FROM produccion LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones=produccion.idfabricaciones",
                            function(err, fabs){
                                if(err) throw err;
                                
                                for(var p=0; p < fabs.length; p++){
                                    for(var u=0; u < array.length; u++){
                                        if(array[u].idmat == fabs[p].idmaterial){
                                            array[u].idfab = fabs[p].idfabricaciones;
                                            break;
                                        }
                                    }
                                }
                                console.log(array);
                                /*
                                UPDATE `table` SET `uid` = CASE
                                    WHEN id = 1 THEN 2952
                                    WHEN id = 2 THEN 4925
                                    WHEN id = 3 THEN 1592
                                    ELSE `uid`
                                    END
                                WHERE id  in (1,2,3)
                                
                                Moldeo  1 [4]
                                Fusión  2 [5]  
                                Quiebre 3 [6] 
                                Tratamiento Térmico 5 [7]
                                Terminación 4 [8]
                                Control de Calidad  7 [9]
                                Producto Terminado  8 [10]
                                */
                                var ids = "(";
                                var queryF = "UDPATE fabricaciones SET cantidad = CASE";
                                var queryP = "UDPATE produccion SET cantidad = CASE";
                                var queryMol = "UPDATE produccion SET produccion.`1` = CASE";
                                var queryFus = "UPDATE produccion SET produccion.`2` = CASE";
                                var queryQui = "UPDATE produccion SET produccion.`3` = CASE";
                                var queryTto = "UPDATE produccion SET produccion.`5` = CASE";
                                var queryTer = "UPDATE produccion SET produccion.`4` = CASE";
                                var queryCal = "UPDATE produccion SET produccion.`7` = CASE";
                                var queryBpt = "UPDATE produccion SET produccion.`8` = CASE";
                                for(var e=0; e<array.length; e++){
                                        queryF += " WHEN idfabricaciones = "+array[e].idfab+" THEN cantidad+"+(-1*parseInt(array[e].diferencia));
                                        queryP += " WHEN idfabricaciones = "+array[e].idfab+" THEN cantidad+"+(-1*parseInt(array[e].diferencia));
                                        queryMol += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].molIni);
                                        queryFus += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].fusIni);
                                        queryQui += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].quiIni);
                                        queryTto += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].ttoIni);
                                        queryTer += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].terIni);
                                        queryCal += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].calIni);
                                        queryBpt += " WHEN idfabricaciones = "+array[e].idfab+" THEN "+parseInt(array[e].bptIni);
                                        ids += array[e].idfab+",";
                                }
                                ids = ids.substring(0, ids.length-1)+")";
                                queryF += " ELSE cantidad END WHERE idfabricaciones IN "+ids; 
                                queryP += " ELSE cantidad END WHERE idfabricaciones IN "+ids;

                                queryMol += " ELSE produccion.`1` END WHERE idfabricaciones IN "+ids; 
                                queryFus += " ELSE produccion.`2` END WHERE idfabricaciones IN "+ids; 
                                queryQui += " ELSE produccion.`3` END WHERE idfabricaciones IN "+ids; 
                                queryTto += " ELSE produccion.`5` END WHERE idfabricaciones IN "+ids; 
                                queryTer += " ELSE produccion.`4` END WHERE idfabricaciones IN "+ids; 
                                queryCal += " ELSE produccion.`7` END WHERE idfabricaciones IN "+ids; 
                                queryBpt += " ELSE produccion.`8` END WHERE idfabricaciones IN "+ids; 
                                console.log(queryMol);
                                console.log(queryFus);
                                console.log(queryQui);
                                console.log(queryTto);
                                connection.query(queryMol, function(err, upCase){
                                    if(err) throw err;
                                    connection.query(queryFus, function(err, upCase){
                                        if(err) throw err;
                                        connection.query(queryQui, function(err, upCase){
                                            if(err) throw err;
                                            connection.query(queryTto, function(err, upCase){
                                                if(err) throw err;
                                                connection.query(queryTer, function(err, upCase){
                                                    if(err) throw err;
                                                    connection.query(queryCal, function(err, upCase){
                                                        if(err) throw err;
                                                        
                                                        connection.query(queryBpt, function(err, upCase){
                                                            if(err) throw err;

                                                            console.log(queryF);
                                                            console.log(queryP);
                                                            res.redirect('/plan');
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
        var input = fs.createReadStream('csvs/PROCESADO.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});



router.get('/parsecsv_fase1testeo_5', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                //numof idodc
                var of = [[1234, 0]];
                //creacion
                var op = [[new Date().toLocaleString()]];
                var fabs = [];
                var prods = [];
                /*CREAR ORDEN DE FABRICACION Y FABRICACIONES, ORDEN DE PRODUCCION Y PRODUCCIONES*/
                for(var i=1; i<rows.length; i++){ 
                    //codigo idorden_f  cant  despachados idpedido idproducto
                    fabs.push([rows[i][0], 0, rows[i][11], rows[i][10], 0, 0]);
                    //idfabricaciones   idordenproduccion  cantidad abastecidos 1 2 3 4 5 6 7 8 standby f_gen
                    prods.push([0, 0, rows[i][11], 0, rows[i][2],rows[i][3],rows[i][4],rows[i][5],rows[i][6],rows[i][7],rows[i][8],rows[i][9], 0, new Date().toLocaleString()]);      
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM material", function(err, mats){
                        if(err) throw err;


                        for(var e=0; e < mats.length; e++){
                            for(var r=0; r < fabs.length; r++){
                                if(fabs[r][0] == mats[e].codigo){
                                    fabs[r][0] = mats[e].idmaterial;
                                    //fabs[r][5] = mats[e].idproducto;
                                }
                            }
                        }

                        console.log(fabs.length);
                        connection.query("SELECT * FROM producido", function(err, producido){
                            if(err) throw err;
                            for(var e=0; e < producido.length; e++){
                                for(var r=0; r < fabs.length; r++){
                                    if(fabs[r][0] == producido[e].idmaterial){
                                        fabs[r][5] = producido[e].idproducto;
                                    }
                                }
                            }                                                
                            connection.query("INSERT INTO ordenfabricacion (`numordenfabricacion`,`idodc`) VALUES ?", [of], function(err, inOF){
                                if(err) throw err;
                                console.log(inOF);
                                for(var r=0; r < fabs.length; r++){
                                    fabs[r][1] = inOF.insertId;
                                }

                                connection.query("INSERT INTO fabricaciones (`idmaterial`,`idorden_f`,`cantidad`,`despachados`,`idpedido`, `idproducto`) VALUES ?", [fabs], function(err, inFabs){
                                    if(err) throw err;
                                    console.log(inFabs);

                                    for(var e=0; e < prods.length; e++){
                                        prods[e][0] = inFabs.insertId + e; 
                                    }
                                    connection.query("INSERT INTO ordenproduccion (`f_gen`) VALUES ?", [op], function(err, inOP){
                                        if(err) throw err;

                                        console.log(inOP);
                                        for(var e=0; e < prods.length; e++){
                                            prods[e][1] = inOP.insertId; 
                                        }   
                                        connection.query("INSERT INTO produccion (`idfabricaciones`,`idordenproduccion`,`cantidad`,`abastecidos`,`1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `standby`, `f_gen`) VALUES ?", [prods], function(err, inProds){
                                            if(err) throw err;

                                            console.log(inProds);
                                            res.redirect('/plan');
                                        });
                                    });
                                });


                            });
                        });
                    });
                    
                });
            });
        var input = fs.createReadStream('csvs/INVENTARIO.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});




router.get('/parsecsv_fase1testeo_1', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,odc){
                if(err) throw err;
                var peds = [];
                var orden = [];
                var numocs = [];
                for(var i=1; i<odc.length; i++){
                    if(odc[i][7] == 'Interna'){
                        odc[i][7] = false;
                    }
                    else{
                        odc[i][7] = true;
                    }
                    odc[i][10] = odc[i][10].split('-')[1]+'-'+odc[i][10].split('-')[0]+'-'+odc[i][10].split('-')[2];
                    //ODC      numoc       idcliente  moneda     creacion
                    if(numocs.indexOf(odc[i][0]) == -1){
                        if(new Date(odc[i][10]).toLocaleString() == 'Invalid Date'){
                            odc[i][10] = '01-01-2018';
                        }
                        orden.push([odc[i][0], odc[i][9],  'clp',  new Date(odc[i][10]).toLocaleString()]);            
                        numocs.push(odc[i][0]);
                    }
                    odc[i][6] = odc[i][6].split('-')[1]+'-'+odc[i][6].split('-')[0]+'-'+odc[i][6].split('-')[2];
                    if(new Date(odc[i][6]).toLocaleString() == 'Invalid Date'){
                        odc[i][6] = '01-01-2018';
                    }
                    //PEDIDOS  cantidad    f_entrega  despachados idmaterial  externo  numoc

                    peds.push([odc[i][4], new Date(odc[i][6]).toLocaleString(),  odc[i][5],  odc[i][2],  odc[i][7], odc[i][0], odc[i][1] ]);
                }
                //console.log(orden);
//                console.log(peds);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM cliente", function(err, cli){
                        if(err)
                            console.log("Error Selecting : %s", err);

                        for(var e=0; e < orden.length; e++){
                            for(var t=0; t < cli.length; t++){
                                if(orden[e][1].toString().replace('.','').replace('-','') == cli[t].rut.replace('.','').replace('-','')){
                                    orden[e][1] = cli[t].idcliente;
                                    break;
                                }
                                else if(t==cli.length-1){
                                    orden[e][1] = 0;
                                }
                            }
                        }
                        connection.query("SELECT * FROM material", function(err, mats){
                            if(err)
                                console.log("Error Selecting : %s", err);

                            for(var e=0; e < peds.length; e++){
                                for(var t=0; t < mats.length; t++){
                                    if(peds[e][3] == mats[t].codigo){
                                        peds[e][3] = mats[t].idmaterial;
                                        break;
                                    }
                                    else if(t == mats.length-1){
                                        console.log("CONFLICTO EN LINEA %s", e-1);
                                        console.log(peds[e][3]);
                                        peds.splice(e, 1);
                                        e--;
                                    }
                                }
                            }

                            connection.query("INSERT INTO odc (`numoc`,`idcliente`,`moneda`,`creacion`) VALUES  ?", [orden], function(err, inODC){
                                if(err)
                                    console.log("Error Inserting : %s", err);

                                console.log(inODC);

                                connection.query("SELECT * FROM odc", function(err, sodc){

                                    if(err)
                                        console.log("Error Selecting : %s", err);

                                    for(var e=0; e < peds.length; e++){
                                        for(var t=0; t < sodc.length; t++){
                                            if(peds[e][5] == sodc[t].numoc){
                                                peds[e][5] = sodc[t].idodc;
                                            }
                                        }
                                    }

                                    console.log(peds);
                                    connection.query("INSERT INTO pedido (`cantidad`,`f_entrega`,`despachados`,`idmaterial`,`externo`,`idodc`, `numitem`) VALUES  ?", [peds], function(err, inPeds){
                                        if(err)
                                            console.log("Error Inserting : %s", err);

                                        console.log(inPeds);
                                        res.redirect('/plan');


                                    });
                                });
                            });

                        });
                        
                        

                    });
                    
                });
            }
        );
        var input = fs.createReadStream('csvs/OC3.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});




router.get('/parsecsv_fixrestantes', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,of){
                if(err) throw err;
                var item = [];
                var data =[];
                var datasi = [];
                var datani = [];
                for(var e=1; e < of.length; e++){
                    //if(of[e][1] != '' && of[e][1] != null){
                        if(item.indexOf(of[e][0]+of[e][1]+of[e][5]) == -1 ){
                            data.push({
                                numof: of[e][0],
                                item: of[e][1],
                                codigo: of[e][5],
                                detalle: of[e][2],
                                cantidad: of[e][3],
                                restantes: parseInt(of[e][4]),
                                menor: parseInt(of[e][4]),
                                idfabricaciones: ''
                            });
                            item.push(of[e][0]+of[e][1]+of[e][5]);
                        }
                        else{
                            if(data[item.indexOf(of[e][0]+of[e][1]+of[e][5])].menor > parseInt(of[e][4]) ){
                                data[item.indexOf(of[e][0]+of[e][1]+of[e][5])].menor = parseInt(of[e][4]);
                            }
                            //data[item.indexOf(of[e][0]+of[e][1])].restantes -= parseInt(of[e][4]);
                        }
                    //}
                }
                var cuenta = 0;
                for(var w=0; w < data.length; w++){
                    if(data[w].menor != 0 ){
                        cuenta++;
                        if(data[w].item == '' || data[w].item == null){
                            datani.push(data[w]);
                        }   
                        else{
                            datasi.push(data[w]);
                        } 
                    }
                }
                //console.log(data);
                //console.log(datani);
                req.getConnection(function(err, connection){
                    if(err) console.log("Error Connection : %s", err);

                    connection.query("SELECT * FROM fabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f", function(err, fabs){
                        if(err) console.log("Error Selecting : %s", err);
                        console.log(fabs);
                        var c = 0;
                        for(var b=0; b < datasi.length; b++){
                            for(var a=0; a < fabs.length; a++){
                                if(fabs[a].numitem == datasi[b].item && fabs[a].numordenfabricacion == datasi[b].numof){
                                    c++;
                                    datasi[b].numof = fabs[a].idordenfabricacion;
                                    datasi[b].idfabricaciones = fabs[a].idfabricaciones;
                                    break;
                                }
                            }

                        }
                        console.log("ENCONTRADOS : "+c);
                        console.log(datasi.length);
                        /*
                        UPDATE `table` SET `uid` = CASE
                            WHEN id = 1 THEN 2952
                            WHEN id = 2 THEN 4925
                            WHEN id = 3 THEN 1592
                            ELSE `uid`
                            END
                        WHERE id  in (1,2,3)
                        console.log(datasi);
                        */
                        var query = "UPDATE fabricaciones SET restantes = CASE";
                        var ids = "";
                        for(var w=0; w < datasi.length; w++){
                            if(datasi[w].idfabricaciones != ''){
                                query += " WHEN idfabricaciones = "+datasi[w].idfabricaciones+" THEN "+datasi[w].menor;
                                ids += datasi[w].idfabricaciones+",";
                            }
                        }
                        query += " ELSE restantes END WHERE idfabricaciones IN ("+ids.substring(0, ids.length-1)+")";
                        console.log(query);
                        connection.query(query, function(err, upOF){
                            if(err) console.log("Error Updating : %s", err);
                            console.log(upOF); 
                            res.redirect('/plan');
                        });
                        //console.log(datasi);
                    });
                });
            });
        var input = fs.createReadStream('csvs/Restantes.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});



router.get('/parsecsv_fase1testeo_2', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,of){
                if(err) throw err;
                var fabs = [];
                var orden = [];
                var numofs = [];
                for(var i=1; i<of.length; i++){
                    if(numofs.indexOf(parseInt(of[i][1])) == -1){
                        of[i][7] = of[i][7].split('-')[1]+'-'+of[i][7].split('-')[0]+'-'+of[i][7].split('-')[2];
                        if(new Date(of[i][7]).toLocaleString() == 'Invalid Date'){
                            of[i][7] = '01-01-2018';
                        }
                        if(of[i][2] == '' || of[i][2] == null){
                            //OF       numordenfabricacion   creacion  idodc   
                            orden.push([of[i][1],       new Date(of[i][7]).toLocaleString(),  0,of[i][1] ]);
                            numofs.push(parseInt(of[i][1]));
                        }
                        else{
                            //OF       numordenfabricacion   creacion  idodc   
                            orden.push([of[i][1],        new Date(of[i][7]).toLocaleString(),  of[i][2],of[i][1]]);
                            numofs.push(parseInt(of[i][1]));
                        }
                    }
                    of[i][5] = of[i][5].split('-')[1]+'-'+of[i][5].split('-')[0]+'-'+of[i][5].split('-')[2];
                    if(new Date(of[i][5]).toLocaleString() == 'Invalid Date'){
                        of[i][5] = '01-01-2018';
                    }
                    //FABS    idorden_f-cant-f_entrega-idmaterial-idpedido-idodc
                    fabs.push([parseInt(of[i][1]), 0, new Date(of[i][5]).toLocaleString() , of[i][3], of[i][0],  of[i][2] , of[i][0]]);
                }
                //console.log(orden);
                //console.log(fabs);
                req.getConnection(function(err,connection){
                    if(err) throw err;

                    connection.query("SELECT * FROM odc", function(err, odc){
                        if(err) throw err;

                        for(var e=0; e < orden.length; e++){
                            for(var o=0; o < odc.length; o++){
                                if(orden[e][2] == odc[o].numoc){
                                    orden[e][4] = orden[e][2];
                                    orden[e][2] = odc[o].idodc;
                                }
                            }
                        }
                        for(var e=0; e < orden.length; e++){
                            orden[e][3] = parseInt(orden[e][3]);
                            for(var o=0; o < fabs.length; o++){
                                if(orden[e][4] == fabs[o][0]){
                                    fabs[e][5] = orden[e][2];
                                }
                            }
                        }
                        for(var e=0; e < orden.length; e++){
                            orden[e].splice(4,1);
                            console.log(orden[e]);
                        }
                        connection.query("INSERT INTO ordenfabricacion (`numordenfabricacion`,`creacion`,`idodc`,`idordenfabricacion`) VALUES ?", [orden], function(err, inOF){
                            if(err) throw err;
                            
                            console.log(inOF);
                            connection.query("SELECT * FROM ordenfabricacion", function(err, ofs){
                                if(err) throw err;

                                for(var e=0; e < fabs.length; e++){
                                    for(var o=0; o < ofs.length; o++){
                                        if(fabs[e][0] == ofs[o].numordenfabricacion){
                                            fabs[e][0] = ofs[o].idordenfabricacion;
                                        }
                                    }
                                }

                                //PETICION PARA ENLAZAR LOS ITEMS DE LA OF CON SU SIMILAR DE LA OC
                                connection.query("select odc.idodc,odc.numoc, group_concat(material.codigo separator '@') as codigo , group_concat(pedido.f_entrega separator '@') as f_entrega ,group_concat(pedido.numitem separator '@') as numitem, group_concat(pedido.cantidad separator '@') as cantidad,group_concat(pedido.idpedido separator '@') as idpedido from pedido left join odc on odc.idodc = pedido.idodc left join material on material.idmaterial=pedido.idmaterial group by odc.idodc",
                                    function(err, token){
                                        if(err) throw err;
                                        var min;
                                        //console.log("INSERTANDO IDPEDIDO");
                                        for(var t=0; t < token.length; t++){
                                            for(var w=0; w < fabs.length; w++){
                                                if(fabs[w][5] == token[t].numoc){
                                                    //console.log("OC ENCONTRADA");
                                                    //console.log(fabs[w][5]+" <--> "+token[t].numoc);
                                                    //console.log(token[t].idpedido);
                                                    token[t].idpedido = token[t].idpedido.split('@');
                                                    token[t].cantidad = token[t].cantidad.split('@');
                                                    token[t].f_entrega = token[t].f_entrega.split('@');
                                                    token[t].numitem = token[t].numitem.split('@');
                                                    token[t].codigo = token[t].codigo.split('@');
                                                    min = token[t].idpedido[0];
                                                    for(var p=0; p < token[t].idpedido.length; p++){
                                                        //if(fabs[w][4] == parseInt(token[t].idpedido[p]) - min + 1){
                                                        if(fabs[w][6] == token[t].numitem[p] ){
                                                            //console.log("ITEM ENCONTRADO");
                                                            fabs[w][4] = token[t].idpedido[p];
                                                            fabs[w][1] = parseInt(token[t].cantidad[p]);
                                                            break;
                                                        }
                                                    }
                                                    token[t].idpedido = token[t].idpedido.join('@');
                                                    token[t].cantidad = token[t].cantidad.join('@');
                                                    token[t].f_entrega = token[t].f_entrega.join('@');
                                                    token[t].codigo = token[t].codigo.join('@');
                                                    token[t].numitem = token[t].numitem.join('@');
                                                }
                                            }
                                        }
                                        //console.log("PEDIDOS INSERTADOS");

                                        for(var e=0; e < fabs.length; e++){
                                            //fabs[e].splice(5, 1);
                                        }
                                        connection.query("SELECT * FROM material",function(err, mats1){
                                            if(err) throw err;

                                            console.log("INSERTANDO IDMATERIAL");
                                            for(var w=0; w < fabs.length; w++){
                                                for(var t=0; t < mats1.length; t++){
                                                    if(mats1[t].codigo == fabs[w][3]){
                                                        fabs[w][3] = mats1[t].idmaterial;
                                                        if(mats1[t].idproducto==null || mats1[t].idproducto == ''){
                                                            console.log(mats1[t].idmaterial);
                                                            console.log(mats1[t].idproducto);
                                                        }
                                                        if( mats1[t].idproducto == null || mats1[t].idproducto == 'null' ){
                                                            fabs[w][5] = 0;
                                                        }   
                                                        else{
                                                            fabs[w][5] = mats1[t].idproducto;
                                                        }        

                                                        break;           
                                                    }
                                                    else if(t == mats1.length-1){
                                                        console.log("CONFLICTO");
                                                        console.log(fabs[w][3]);
                                                        fabs.splice(w,1);
                                                        w--;
                                                    }                                                    
                                                }
                                            }

                                            console.log("INSERTANDO FABRICACIONES");
                                            console.log(fabs);
                                            for(var w=0; w < fabs.length; w++){
                                                if(w == 1197 || w-1 == 1197 || w+1 == 1197){
                                                    console.log(fabs[w]);
                                                }
                                            }
                                            connection.query("INSERT INTO fabricaciones (`idorden_f`,`cantidad`,`f_entrega`,`idmaterial`, `idpedido`, `idproducto`, `numitem`) VALUES ?", [fabs], function(err, inFabs){
                                                if(err) throw err;
                                                
                                                console.log(inFabs);
                                                res.redirect('/plan');


                                            });
                                            
                                        });


                                    });



                                                        
                            }); 
                        });
                    });
                                        
                });
            });
        var input = fs.createReadStream('csvs/OF3.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});





router.get('/parsecsv_fase1testeo_3', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,gd){
                if(err) throw err;
                var allgd = [];
                var gds = {};
                var numsgd = [];
                for(var i=1; i<gd.length; i++){
                    //GD,OC,Item OC,Codigo Producto,Descripción Producto,Cantidad Despachada,Fecha Despacho,Tipo GD;
                    //if(gd[i][7].toLowerCase() == 'venta' ){
                        if(numsgd.indexOf(gd[i][0]) == -1 ){
                            //iddespacho    idorden_f    mat_token    cant_token     id_token    idf_token    fecha
                            //allgd.push([gd[i][0],  gd[i][1],   gd[i][3],  gd[i][5],  0,  0,  gd[i][6] ]);
                            gds[gd[i][0]] = {idorden_f: [], mat_token:[] , cant_token: [], id_token: [], idf_token: [], fecha: '', estado: ''};
                            numsgd.push(gd[i][0]);
                        }
                        if(gd[i][4].toLowerCase() == 'nula'){
                            gd[i][7] = 'Anulado';
                            gd[i][4] = '';
                        }
                        else if(gd[i][7].toLowerCase() != 'venta' && gd[i][7].toLowerCase() != 'blanco'){
                            gd[i][7] = 'Traslado';
                        }   
                        else{
                            gd[i][7] = gd[i][7].substring(0, 1).toUpperCase()+gd[i][7].substring(1, gd[i][7].length).toLowerCase();
                        }
                    //}
                }
                
                req.getConnection(function(err,connection){
                    if(err) throw err;

                    connection.query("SELECT * FROM material", function(err, mats){
                        if(err) throw err;
                        
                        for(var w=0; w < mats.length; w++){
                            for(var i=1; i<gd.length; i++){
                                //GD,OC,Item OC,Codigo Producto,Descripción Producto,Cantidad Despachada,Fecha Despacho,Tipo GD;
                                //if(gd[i][7].toLowerCase() == 'venta' ){
                                    if(gd[i][3] == mats[w].codigo){
                                        gd[i][3] = mats[w].idmaterial;
                                        gd[i][4] = mats[w].detalle;
                                    }   
                                //}
                            }
                        }
                       connection.query("SELECT * FROM odc", function(err, odc){
                           if(err) throw err;
                           
                           for(var w=0; w < odc.length; w++){
                                for(var i=1; i<gd.length; i++){
                                    //GD,OC,Item OC,Codigo Producto,Descripción Producto,Cantidad Despachada,Fecha Despacho,Tipo GD;
                                    //if(gd[i][7].toLowerCase() == 'venta' ){
                                        if(gd[i][1] == odc[w].numoc){
                                            gd[i][1] = odc[w].idodc;
                                        }   
                                    //}
                                }
                            }
                            connection.query("SELECT * FROM pedido", function(err, ped){
                                if(err) throw err;
                                
                                for(var w=0; w < ped.length; w++){
                                    for(var i=1; i<gd.length; i++){
                                        //GD,OC,Item OC,Codigo Producto,Descripción Producto,Cantidad Despachada,Fecha Despacho,Tipo GD;
                                        //if(gd[i][7].toLowerCase() == 'venta' ){
                                            if(gd[i][1] == ped[w].idodc && gd[i][3] == ped[w].idmaterial){
                                                gd[i][8] = ped[w].idpedido;
                                            }   
                                        //}
                                    }
                                }
                               for(var i=1; i<gd.length; i++){
                                   //GD,OC,Item OC,Codigo Producto,Descripción Producto,Cantidad Despachada,Fecha Despacho,Tipo GD;
                                   //if(gd[i][7].toLowerCase() == 'venta' ){
                                           gds[gd[i][0]].idorden_f = gd[i][1];
                                           gds[gd[i][0]].mat_token.push(gd[i][4]);
                                           gds[gd[i][0]].cant_token.push(gd[i][5]);
                                           gds[gd[i][0]].id_token.push(gd[i][3]);
                                           gds[gd[i][0]].idf_token.push(gd[i][8]);
                                           gds[gd[i][0]].fecha = gd[i][6];
                                           gds[gd[i][0]].estado = gd[i][7]
                                   //}
                               }
                               for(var i=0; i<numsgd.length; i++){
                                   //gds[numsgd[i]].idorden_f = gds[numsgd[i]].idorden_f.join('@');
                                   //gds[numsgd[i]].mat_token = gds[numsgd[i]].mat_token.join('@');
                                   //gds[numsgd[i]].cant_token = gds[numsgd[i]].cant_token.join('@');
                                   //gds[numsgd[i]].id_token = gds[numsgd[i]].id_token.join('@');
                                   //gds[numsgd[i]].idf_token = gds[numsgd[i]].idf_token.join('@');

                                    allgd.push([
                                        numsgd[i], 
                                        gds[numsgd[i]].idorden_f,
                                        gds[numsgd[i]].mat_token.join('@@'),
                                        gds[numsgd[i]].cant_token.join(','),
                                        gds[numsgd[i]].id_token.join('@'),
                                        gds[numsgd[i]].idf_token.join('@'),
                                        new Date( [gds[numsgd[i]].fecha.split('-')[1],gds[numsgd[i]].fecha.split('-')[0],gds[numsgd[i]].fecha.split('-')[2]].join('-') ).toLocaleString(),
                                        gds[numsgd[i]].estado
                                    ]);
                               }
                               console.log("REGISTROS POR INGRESAR: "+allgd.length);
                                connection.query("INSERT IGNORE INTO despacho (`iddespacho`,`idorden_f`,`mat_token`,`cant_token`,`id_token`,`idf_token`,`fecha`,  `estado`) VALUES ?", [allgd], function(err, inGD){
                                    if(err) throw err;
                                    console.log(inGD);
                                    res.redirect('/plan');
                                });
                            });
                       });
                    });
                                        
                });
            });
        var input = fs.createReadStream('csvs/GD4.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});


router.get('/parsecsv_despachos_fixfechas', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,gd){
                if(err) throw err;
                /*
                UPDATE `table` SET `uid` = CASE
                    WHEN id = 1 THEN 2952
                    WHEN id = 2 THEN 4925
                    WHEN id = 3 THEN 1592
                    ELSE `uid`
                    END
                WHERE id  in (1,2,3)
                */
                var query = "UPDATE despacho SET fecha = CASE ";
                var id = '';
                var ids = [];
                for(var e=1; e < gd.length; e++){
                    if(ids.indexOf(gd[e][0]) == -1 && gd[e][0] != '-' && gd[e][0].indexOf('A')==-1 ){
                        ids.push(gd[e][0]);
                        id += ""+gd[e][0]+",";

                        if(new Date([gd[e][6].split('-')[1], gd[e][6].split('-')[2], gd[e][6].split('-')[0]].join('-')).toLocaleString()  != 'Invalid Date'){
                            query += "WHEN iddespacho = "+gd[e][0]+" THEN '"+new Date([gd[e][6].split('-')[1], gd[e][6].split('-')[2], gd[e][6].split('-')[0]].join('-')).toLocaleString()+"' ";
                        }
                        else{
                            console.log(gd[e][0]);
                            console.log([gd[e][6].split('-')[1], gd[e][6].split('-')[2], gd[e][6].split('-')[0]].join('-'));

                        }
                    }
                }
                id = "("+id.substring(0,id.length-1)+")";
                query = query + "ELSE fecha END WHERE iddespacho IN "+id;
                //console.log(query);
                req.getConnection(function(err, connection){
                    if(err) console.log("Error Connection : %s", err);
                    connection.query(query, function(err, upGD){
                        if(err) console.log("Error Selecting : %s", err);
                        console.log(upGD);
                        res.redirect('/plan');
                    });
                });


            });
        var input = fs.createReadStream('csvs/GD4.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});


router.get('/parsecsv_despachos_fixfechas', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,gd){
                if(err) throw err;
                /*
                UPDATE `table` SET `uid` = CASE
                    WHEN id = 1 THEN 2952
                    WHEN id = 2 THEN 4925
                    WHEN id = 3 THEN 1592
                    ELSE `uid`
                    END
                WHERE id  in (1,2,3)
                */
                var query = "UPDATE despacho SET fecha = CASE ";
                var id = '';
                var ids = [];
                for(var e=1; e < gd.length; e++){
                    if(ids.indexOf(gd[e][0]) == -1 && gd[e][0] != '-' && gd[e][0].indexOf('A')==-1 ){
                        ids.push(gd[e][0]);
                        id += ""+gd[e][0]+",";

                        if(new Date([gd[e][6].split('-')[1], gd[e][6].split('-')[2], gd[e][6].split('-')[0]].join('-')).toLocaleString()  != 'Invalid Date'){
                            query += "WHEN iddespacho = "+gd[e][0]+" THEN '"+new Date([gd[e][6].split('-')[1], gd[e][6].split('-')[2], gd[e][6].split('-')[0]].join('-')).toLocaleString()+"' ";
                        }
                        else{
                            console.log(gd[e][0]);
                            console.log([gd[e][6].split('-')[1], gd[e][6].split('-')[2], gd[e][6].split('-')[0]].join('-'));

                        }
                    }
                }
                id = "("+id.substring(0,id.length-1)+")";
                query = query + "ELSE fecha END WHERE iddespacho IN "+id;
                //console.log(query);
                req.getConnection(function(err, connection){
                    if(err) console.log("Error Connection : %s", err);
                    connection.query(query, function(err, upGD){
                        if(err) console.log("Error Selecting : %s", err);
                        console.log(upGD);
                        res.redirect('/plan');
                    });
                });


            });
        var input = fs.createReadStream('csvs/GD4.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/parsecsv_fabricaciones_fixexterno', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,oc){
                if(err) throw err;
                /*
                UPDATE `table` SET `uid` = CASE
                    WHEN id = 1 THEN 2952
                    WHEN id = 2 THEN 4925
                    WHEN id = 3 THEN 1592
                    ELSE `uid`
                    END
                WHERE id  in (1,2,3)
                */
                var ocs = [];
                for(var e=1; e < oc.length; e++){
                    if(oc[e][0] != 'S/MAIL'){
                        //0 - Orden de Compra, 7 - Tipo de Fabricaci�n,9 - RUT Cliente
                        ocs.push([oc[e][0], oc[e][7]]);
                    }
                }
                console.log(ocs);
                req.getConnection(function(err, connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM odc", function(err, odc){
                        if(err) throw err;
                        var cuenta = 0;
                        for(var b=0; b < ocs.length; b++){
                            for(var a=0; a < odc.length; a++){
                                if(odc[a].numoc.replace(' ', '') == ocs[b][0].replace(' ', '')){
                                    ocs[b][0] = odc[a].idodc;
                                    cuenta++;
                                    break;
                                }
                            }
                        }
                        console.log(cuenta + " ids encontrados");
                        console.log("Largo del arreglo " + ocs.length);
                        var query = "UPDATE pedido SET externo = CASE";
                        var nums = '';
                        for(var e=0; e < ocs.length; e++){
                            if(ocs[e][1] == 'Externa'){
                                query += " WHEN idodc = '"+ocs[e][0]+"' THEN '1'";
                            }
                            else{
                                query += " WHEN idodc = '"+ocs[e][0]+"' THEN '0'";
                            }
                            nums += "'"+ocs[e][0]+"',";
                        }
                        query = query + " ELSE externo END WHERE idodc IN ("+nums.substring(0, nums.length-1)+")";
                        connection.query(query, function(err, inCase){
                            if(err) throw  err;
                            console.log(inCase);
                            res.redirect('/plan');
                        });

                    });
                });

            });
        var input = fs.createReadStream('csvs/OC3.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});




router.get('/parsecsv_fase1testeo_4000', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,oca){
                if(err) throw err;
                
                var prod = [];
                var ocas = [];
                var orden = [];
                var idoca = [];
                var abast = [];
                //N° OC-0,CODIGO-1,PRODUCTO-2,CANT-3,UNIT NETO-4,TOTAL NETO-5,ENTREGA-6,EXENTO-7,C° COSTO-8,OF-9,PROVEEDOR-10
                //,RUT-11,TOTAL C/IVA-12,FECHA-13,FACTURA-14,OBSERVACIONES-15,ESTADO-16,
                for(var w=1; w < oca.length; w++){
                        oca[w][6] = [oca[w][6].split('-')[1], oca[w][6].split('-')[0], oca[w][6].split('-')[2]].join('-');
                        oca[w][13] = [oca[w][13].split('-')[1], oca[w][13].split('-')[0], oca[w][13].split('-')[2]].join('-');
                        if( idoca.indexOf(oca[w][0]) == -1 ){
                            idoca.push(oca[w][0]);
                            //idoca, numoca, creacion, idproveedor, tokenoda(input.obs+"@"+input.dest+"@"+input.plae+"@"+input.pag+"@"+input.entr+"@"+input.cuent+"@"+input.money+"@"+input.exento+"@"+input.desc)
                            orden.push([oca[w][0], oca[w][0], new Date(oca[w][13]).toLocaleString() , oca[w][11],  oca[w][15]+"@@"+oca[w][6]+"@@siderval@undefined@clp@off@0", oca[w][9], false, oca[w][14] ]);
                        }
                        if(oca[w][1] == "#N/A" || oca[w][1] == '' || oca[w][1] == null ){
                            //prod.push(['X'+w,oca[w][2],'X']); 
                            oca[w][1] = "X"+w;
                            prod.push([oca[w][1], oca[w][2].substring(0, 1).toUpperCase() +oca[w][2].substring(1, oca[w][2].length).toLowerCase()  , 'X' ]);
                        }

                        //cantidad , recibido, idoda, idmaterial, costo unitario, cc, exento, facturado
                        if(oca[w][16].toUpperCase() == 'FIN'){
                            abast.push([oca[w][3],oca[w][3], oca[w][0], oca[w][1], oca[w][4], oca[w][8], 0, 1, oca[w][14] ]);
                        }
                        else{
                            abast.push([oca[w][3],0, oca[w][0], oca[w][1], oca[w][4], oca[w][8], 0, 0, oca[w][14]]);
                        }
                }
                /*for(var w=1; w < oca.length; w++){
                    if(oca[w][10].toUpperCase() == 'NULA'){
                        oca.splice(w,1);
                        w--;
                    }
                    
                }*/

                

                console.log("Productos por ingresar: "+prod.length);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                        connection.query("INSERT INTO material (`codigo`,`detalle`,`tipo`) VALUES ?", [prod], function(err, inMats){
                            if(err) throw err;
                            console.log(inMats);
                            connection.query("SELECT * FROM material", function(err, mats){
                                if(err) throw err;


                                console.log("Productos : "+mats.length);
                                for(var a=0; a < abast.length; a++){
                                    for(var e=0; e < mats.length; e++){
                                        if(abast[a][3] == mats[e].codigo){
                                            abast[a][3] = mats[e].idmaterial;
                                        }
                                    }
                                }
                                console.log(oca);
                                connection.query("SELECT * FROM ordenfabricacion", function(err, of){
                                    if(err) throw err;

                                    for(var q=0; q < of.length; q++){
                                        for(var p=0; p < orden.length; p++){
                                            if(of[q].numordenfabricacion == orden[p][5] && !orden[p][6]){
                                                orden[p][5] = of[q].idordenfabricacion;
                                                orden[p][6] = true;
                                                break;
                                            }
                                        }
                                    }

                                    connection.query("SELECT * FROM cliente", function(err, cli){
                                        if(err) throw err;

                                        for(var p=0; p < orden.length; p++){
                                            for(var q=0; q < cli.length; q++){
                                                if(cli[q].rut.replace(',','').replace('.', '').replace('-','') == orden[p][3].replace(',','').replace('.', '').replace('-','')){
                                                    orden[p][3] = cli[q].idcliente;
                                                    break;
                                                }
                                            }
                                        }
                                        for(var p=0; p < orden.length; p++){
                                            orden[p].splice(6,1);
                                        }
                                        connection.query("INSERT IGNORE INTO oda (`idoda`, `numoda`, `creacion`, `idproveedor`, `tokenoda`,`idof`,`numfac`) VALUES ?", [orden], function(err, inODA){
                                            if(err) throw err;

                                            console.log(inODA);
                                            connection.query("INSERT IGNORE INTO abastecimiento (`cantidad` , `recibidos`, `idoda`, `idmaterial`, `costo`, `cc`, `exento`, `facturado`, `numfac`) VALUES ?", [abast], function(err, inAbast){
                                                if(err) throw err;

                                                console.log(inAbast);
                                                res.redirect('/plan');
                                            });

                                        });

                                    });
                                });
                            });
                        });                  
                });
            });
        var input = fs.createReadStream('csvs/OCA2.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});





router.get('/parsecsv_verifProd', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,oca){
                if(err) throw err;
                var rech = [];
                //N° OC-0,-1,PRODUCTO-2,CANT-3,UNIT NETO-4,TOTAL NETO-5,ENTREGA-6,EXENTO-7,C° COSTO-8,OF-9,PROVEEDOR-10
                //,RUT-11,TOTAL C/IVA-12,FECHA-13,FACTURA-14,OBSERVACIONES-15,ESTADO-16,
                for(var w=1; w < oca.length; w++){
                        
                        if(oca[w][1] == "#N/A" || oca[w][1] == '' || oca[w][1] == null ){
                            //prod.push(['X'+w,oca[w][2],'X']); 
                            oca[w][1] = "X"+w;
                        }

                       
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                        
                    connection.query("SELECT * FROM material", function(err, mats){
                        if(err) throw err;


                        for(var a=0; a < oca.length; a++){
                            for(var e=0; e < mats.length; e++){
                                if(oca[a][1].toUpperCase() == mats[e].codigo){
                                    break;
                                }
                                else if(e == mats.length-1){
                                    rech.push([oca[a][1].toUpperCase(), oca[a][2]]);
                                }
                            }
                        }
                        console.log(rech);
                        res.redirect('/plan');
                                 
                    });                  
                });
            });
        var input = fs.createReadStream('csvs/OCA.csv');
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
                    /*switch(rows[i][1][0]){
                        case "P":
                            console.log(rows[i][1][0]);
                        case "S":
                            if(rows[i][1].slice(1,3) == "01"){
                                var idsub = parseInt(rows[i][1].slice(5,7));
                                if(parseInt(rows[i][1].slice(5,7)) == 0){
                                    idsub = 99;
                                }
                                continue;
                            } else {
                                prod_list.push([i+111968,parseInt(rows[i][1].slice(3,5))+1]);
                            }
                            //break;
                        case "M":
                        case "I":
                            rec_list.push([i+111968]);
                            //break;
                        default:
                            otro_list.push([i+111968]);
                            //break;
                    }*/
                    console.log([i+111968,rows[i][0],"fin",rows[i][1][0],parseInt(rows[i][1].slice(1,3)),caracts]);
                    mat_list.push([i+111968,rows[i][0],"fin",rows[i][1][0],parseInt(rows[i][1].slice(1,3)),caracts, rows[i][1]]);
                    prod_list.push([i+111968,parseInt(rows[i][1].slice(3,5))+1]);


                }
                console.log(mat_list);
                console.log(prod_list);
                console.log(rec_list);
                req.getConnection(function(err, connection){
                    if(err) throw err;
                    connection.query("INSERT INTO material (`idmaterial`,`detalle`,`estado`,`tipo`,`especificacion`,`caracteristica`, `codigo`) VALUES ?",[mat_list],function(err,rows){
                        if(err) {
                            console.log(mat_list);
                            throw err;
                        }
                        connection.query("INSERT INTO producto (`idmaterial`,`idaleacion`) VALUES ?",[prod_list],function(err,prods){
                            if(err) throw err;
                            
                                    res.redirect('/plan');
                            
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

router.get('/parsecsv_cuentas', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                
                var cuenta = [];
                var subcuenta = [];
                for(var i=1; i<rows.length; i++){
                    //console.log(rows);
                    //         CODIGO master cod insumo  cantidad 
                    console.log(rows[i]);
                    if(rows[i][0] != ''){
                        cuenta.push([rows[i][0], rows[i][1].replace('-',''), rows[i][2]]);
                    }
                    else{
                        subcuenta.push([rows[i][1].replace('-',''), rows[i][2]]);
                    }
                }
                console.log(cuenta);
                console.log(subcuenta);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    
                    connection.query("INSERT IGNORE INTO cuenta (`cuenta`,`subcuenta`,`detalle`) VALUES ?",[cuenta],function(err,rows){
                                if(err) {
                                    throw err;
                                }
                                
                                console.log(rows);
                                connection.query("INSERT IGNORE INTO subcuenta (`subcuenta`,`detalle`) VALUES ?",[subcuenta],function(err,rows){
                                    if(err) {
                                        throw err;
                                    }
                                    console.log(rows);
                                });
                            });
                });
            });
        var input = fs.createReadStream('csvs/cuentas.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/parsecsv_stock_productos', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mats = [];
                var query1 = "update material set stock_i = case";
                var query2 = "update material set stock_c = case";
                var query3 = "update material set u_compra = case";
                var query4 = "update material set subcuenta = case";
                where = "WHERE codigo in (";
                for(var i=1; i<rows.length; i++){
                    //console.log(rows);
                    //         CODIGO        critico   aviso      minima compra  subcuenta
                    mats.push([rows[i][0], rows[i][8],rows[i][9], rows[i][10], rows[i][7]]);
                    if(rows[i][9] == ''){
                        rows[i][9] = 0;
                    }
                    if(rows[i][8] == ''){
                        rows[i][8] = 0;
                    }
                    if(rows[i][10] == ''){
                        rows[i][10] = 0;
                    }
                    query1 += " WHEN codigo = '"+rows[i][0]+"' THEN "+rows[i][9];
                    query2 += " WHEN codigo = '"+rows[i][0]+"' THEN "+rows[i][8];
                    query3 += " WHEN codigo = '"+rows[i][0]+"' THEN "+rows[i][10];
                    query4 += " WHEN codigo = '"+rows[i][0]+"' THEN '"+rows[i][7]+"'";                
                    where += "'"+rows[i][0]+"',";
                    if(i==rows.length-1){
                        where = where.substring(0, where.length-1);
                        query1 += " ELSE 0 END ";
                        query2 += " ELSE 0 END ";
                        query3 += " ELSE 0 END ";
                        query4 += " ELSE 0 END ";
                    }
                }
                where += ")";
                query1 += where;
                query2 += where;
                query3 += where;
                query4 += where;
                console.log(query1);
                console.log(query2);
                console.log(query3);
                console.log(query4);
                /*
                    UPDATE `table` SET `uid` = CASE
                        WHEN id = 1 THEN 2952
                        WHEN id = 2 THEN 4925
                        WHEN id = 3 THEN 1592
                        ELSE `uid`
                        END
                        WHERE id  in (1,2,3)
                */

                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query(query1, function(err, productos){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        connection.query(query2, function(err, productos){
                            if(err)
                                console.log("Error Selecting : %s", err);
                           
                            connection.query(query3, function(err, productos){
                                if(err)
                                    console.log("Error Selecting : %s",err);
                               
                                connection.query(query4, function(err, productos){
                                    if(err)
                                        console.log("Error Selecting : %s",err);
                                    

                                    console.log("FIN");
                                    
                                });     
                            });    
                        });
                        
                    });
                    
                });
            });
        var input = fs.createReadStream('csvs/stocks.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/parsecsv_pago_clientes', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mats = [];
                var query1 = "update cliente set pago = case";
                where = "WHERE rut in (";
                for(var i=1; i<rows.length; i++){
                    //console.log(rows);
                    //         CODIGO        critico   aviso      minima compra  subcuenta
                    mats.push([rows[i][2], rows[i][7]]);
                    if(rows[i][7] == ''){
                        rows[i][7] = "CONTADO";
                    }
                    query1 += " WHEN rut LIKE '%"+rows[i][2]+"%' THEN '"+rows[i][7]+"'";
                    where += "'"+rows[i][2]+"',";
                    if(i==rows.length-1){
                        where = where.substring(0, where.length-1);
                        query1 += " ELSE 'CONTADO' END ";
                    }
                }
                where += ")";
                query1 += where;
                console.log(query1);
                /*
                    UPDATE `table` SET `uid` = CASE
                        WHEN id = 1 THEN 2952
                        WHEN id = 2 THEN 4925
                        WHEN id = 3 THEN 1592
                        ELSE `uid`
                        END
                        WHERE id  in (1,2,3)
                */
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query(query1, function(err, productos){
                        if(err)
                            console.log("Error Selecting : %s", err);
                              
                        console.log("FIN");            
                    });
                    
                });
            });
        var input = fs.createReadStream('csvs/clientes_pago.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/parsecsv_rutas', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mats = [];
                for(var i=1; i<rows.length; i++){
                    //console.log(rows);
                    //         CODIGO      idaleacion
                    if(rows[i][2] != 'EXTERNO'){
                        mats.push([rows[i][0], parseInt(rows[i][0].substring(5,7)), rows[i][2].split('-').join(',') ]);
                    }
                }
                console.log(mats);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM material", function(err, productos){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        
                        for(var e=0; e < productos.length; e++){
                            for(var r=0; r < mats.length; r++){
                                if(mats[r][0] == productos[e].codigo){
                                    mats[r][0] = productos[e].idmaterial;
                                }
                            }
                        }
                        console.log(mats);
                       connection.query("INSERT INTO producido (`idmaterial`,`idsubaleacion`, `ruta`) VALUES ?",[mats],function(err,rows){
                            if(err) {
                                throw err;
                            }
                            console.log(rows);
                        });
                    });
                    
                });
            });
        var input = fs.createReadStream('csvs/productosRuta.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

/*router.get('/parsecsv_forged', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var prod_list = [];
                for(var i=1; i<rows.length; i++){
                    //codigo ---- sigla de cliente
                    prod_list.push([rows[i][0], rows[i][4]]);
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("INSERT INTO material (`detalle`,`estado`,`tipo`,`especificacion`,`caracteristica`,`codigo`) VALUES ?",[mat_list],function(err,rows){
                        if(err) {
                            throw err;
                        }
                       
                    });
                });
            });
        var input = fs.createReadStream('csvs/productocliente.csv');
        input.pipe(parser);


    } else res.redirect("/bad_login");
});*/

router.get('/parsecsv_aleaciones', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var datos = [];
                for(var i=1; i<rows.length; i++){
                    if(datos.indexOf(rows[i][0]) == -1){
                        datos.push(rows[i][0]);
                    }
                }
                for(var t=0; t < datos.length; t++){
                    datos[t] = [datos[t]];
                }
                console.log(datos);
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("INSERT INTO subaleacion (subnom) VALUES ?", [datos], function(err, dat){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        res.redirect('/plan');
                    });
                });
            });
        var input = fs.createReadStream('csvs/newBD/new_aleaciones.csv');
        input.pipe(parser);

   
    } else res.redirect("/bad_login");
});

router.get('/parsecsv_bdmateriales', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
               
               var mat = [];
               var producto = [];
               var producido = [];
               for(var e = 1; e < rows.length; e++){
                    if(rows[e][8] != "No Registra"){
                    //         codigo(0) , detalle(1) , peso(8),    caracteristica                         tipo 
                        mat.push([rows[e][0],rows[e][1],rows[e][8], parseInt(rows[e][0].substring(3,5)), rows[e][0].substring(0,1) ]);
                    }
                    else{
                    //         codigo(0) , detalle(1) , peso(8),    caracteristica                         tipo 
                        mat.push([rows[e][0],rows[e][1],0, parseInt(rows[e][0].substring(3,5)), rows[e][0].substring(0,1) ]);    
                    }
                    if(rows[e][2] != 'EXTERNO'){
                        //              codigo(0),  subaleacion(7), ruta(2)
                        producido.push([rows[e][0], rows[e][7],rows[e][2].split('-').join(',')]);
                    }
                    //              codigo(0) , subaleacion(7)
                    producto.push([rows[e][0], rows[e][7]]);
               }
               console.log(mat)
               req.getConnection(function(err, connection){
                    if(err)
                        console.log("Error Connection : %s", err);
                    connection.query("SELECT * FROM subaleacion", function(err, subal){
                        if(err)
                            console.log("Error Selecting : %s", err);

                        var subnom; 
                        for(var q=0; q < producto.length; q++){
                            for(var w=0; w < subal.length; w++){
                                if(producto[q][1] == subal[w].subnom){
                                    producto[q][1] = subal[w].idsubaleacion;
                                    break;
                                }
                                else if(w == subal.length-1){
                                    producto[q][1] = 99;
                                }
                            }
                        }
                        for(var q=0; q < producido.length; q++){
                            for(var w=0; w < subal.length; w++){
                                if(producido[q][1] == subal[w].subnom){
                                    producido[q][1] = subal[w].idsubaleacion;
                                    break;
                                }
                                else if(w == subal.length-1){
                                    producido[q][1] = 99;
                                }
                            }
                        }
                        console.log(mat);
                        connection.query("INSERT INTO material (codigo, detalle, peso, caracteristica, tipo) VALUES ?", [mat], function(err, inMat){
                            if(err)
                                console.log("Error Inserting : %s", err);
                            
                            console.log(inMat);
                            connection.query("SELECT * FROM material", function(err, mates){
                                if(err)
                                    console.log("Error Selecting : %s", err);

                                for(var d=0; d < mates.length; d++){
                                    for(var e=0; e < producto.length; e++){
                                        if(producto[e][0] == mates[d].codigo){
                                            producto[e][0] = mates[d].idmaterial;
                                        }
                                    }
                                }
                                for(var d=0; d < mates.length; d++){
                                    for(var e=0; e < producido.length; e++){
                                        if(producido[e][0] == mates[d].codigo){
                                            producido[e][0] = mates[d].idmaterial;
                                        }
                                    }
                                }
                                console.log(producido);
                                console.log(producto);
                                connection.query("INSERT INTO producido (idmaterial, idsubaleacion, ruta) VALUES ?", [producido], function(err, inProducido){
                                    if(err)
                                        console.log("Error Inserting : %s", err);
                                    console.log(inProducido)
                                    connection.query("INSERT INTO producto (idmaterial, idaleacion) VALUES ?", [producto], function(err, inProducto){
                                        if(err)
                                            console.log("Error Inserting : %s", err);
                                        console.log(inProducto);
                                    });
                                });    
                            });
                        });
                        

                    });
               });
            });
        var input = fs.createReadStream('csvs/productosBD.csv');
        input.pipe(parser);

   
    } else res.redirect("/bad_login");
});

router.get('/parsecsv_todo', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var productos = [];
                var producidos = [];
                for(var w=1; w < rows.length; w++){
                    if(rows[w][2] != 'EXTERNO' && rows[w][2] != 'SERVICIO'){
                        producidos.push(rows[w]);
                    }
                    productos.push(rows[w]);
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT * FROM subaleacion", function(err, alea){
                        if(err)
                            console.log("Error Selecting : %s", err);



                        for(var y=0; y < alea.length; y++){
                            for(var w=0; w < producidos.length; w++){
                                if(producidos[w][7] == alea[y].subnom){
                                    producidos[w][7] = alea[y].idsubaleacion;
                                }
                            }
                        }
                        for(var y=0; y < alea.length; y++){
                            for(var w=0; w < productos.length; w++){
                                if(productos[w][7] == alea[y].subnom){
                                    productos[w][7] = alea[y].idsubaleacion;
                                }
                            }
                        }
                        for(var w=1; w < rows.length; w++){
                            if(rows[w][8] == 'No Registra'){
                                rows[w][8] = '0';
                            }
                            rows[w] = [rows[w][0],rows[w][1].replace(new RegExp("'","g"), '"'),parseFloat(rows[w][8]) , rows[w][0].substring(0,1)];
                        }
                        rows.shift();
                        connection.query("INSERT INTO material (codigo, detalle, peso, tipo) VALUES ?",[rows], function(err, mats){
                            if(err)
                                console.log("Error Selecting : %s", err);
                            
                            connection.query("SELECT * FROM material", function(err, mates){
                                if(err)
                                    console.log("Error Selecting : %s", err);
                                

                                //idmaterial - idaleacion/subaleacion
                                for(var y=0; y < productos.length; y++){
                                    for(var w=0; w < mates.length; w++){
                                        if(productos[y][0] == mates[w].codigo){
                                            productos[y][0] = mates[w].idmaterial;
                                        }
                                    }
                                }

                                //idmaterial - idaleacion/subaleacion - ruta
                                for(var y=0; y < producidos.length; y++){
                                    for(var w=0; w < mates.length; w++){
                                        if(producidos[y][0] == mates[w].codigo){
                                            producidos[y][0] = mates[w].idmaterial;
                                        }
                                    }
                                }
                                for(var y=0; y < producidos.length; y++){
                                    if(producidos[y][7] == 'No Registra'){
                                        producidos[y][7] = '99'; 
                                    }
                                    producidos[y] = [producidos[y][0], producidos[y][7], producidos[y][2].replace(new RegExp("-","g"), ',')]; 
                                }
                                for(var y=0; y < productos.length; y++){
                                    if(productos[y][7] == 'No Registra'){
                                        productos[y][7] = '0'; 
                                    }
                                    productos[y] = [productos[y][0], productos[y][7]]; 
                                }
                                connection.query("INSERT INTO producto (idmaterial, idaleacion) VALUES ?",[productos], function(err, prod){
                                    if(err)
                                        console.log("Error Selecting : %s", err);
                                    console.log(prod);
                                    connection.query("INSERT INTO producido (idmaterial, idsubaleacion, ruta) VALUES ?",[producidos], function(err, produc){
                                        if(err)
                                            console.log("Error Selecting : %s", err);
                                        console.log(produc);
                                        res.redirect('/plan');
                                    });
                                });
                            });
                        });
                        //connection.query("INSERTO INTO material ();")



                    });
                });
            });
        var input = fs.createReadStream('csvs/newBD/bd_maestro.csv');
        input.pipe(parser);

   
    } else res.redirect("/bad_login");
});

router.get('/parsecsv_insumos', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                rows.shift();
                var ins = "UPDATE material SET e_abast = CASE ";

                for(var w=0; w < rows.length; w++){
                    ins += "WHEN codigo = '" + rows[w][0] + "' THEN '" + rows[w][4] + "' ";
                    //console.log(rows[w][4]);
                }
                ins += "ELSE '0' END";
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    
                    connection.query(ins, function(err, mats){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        res.send('YUPI!');
                    });
                });
            });
        var input = fs.createReadStream('csvs/insumosBD2.csv');
        input.pipe(parser);

   
    } else res.redirect("/bad_login");
});


router.get('/parsecsv_facturas', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                rows.shift();
                var numfac = [];
                var facturas = [];
                var facs = [];
                /*
                * CSV:
                * N° OC[0],	CODIGO[1],	PRODUCTO [2],	CANT [3],	UNIT NETO[4],
                * TOTAL NETO[5],	ENTREGA[6],	EXENTO[7],	C° COSTO[8],
                * OF[9],	PROVEEDOR[10], RUT[1|], TOTAL C/IVA[12],	FECHA[13],
                * FACTURA[14],	OBSERVACIONES[15],	ESTADO [16]
                *
                * BD:
                * Factura:
                *   idfactura, fecha, numfac, idoda, coment
                * Facturación:
                *   idfact, idfactura, idabast, costo, moneda
                *
                * LOS PEDIDOS ESTAN EN EL MISMO ORDEN TANTO EN EL CSV COMO EN LA BD
                *
                * LOS IDENTIFICADORES DE LAS FACTURAS EN EL CSV SON EL RUT DEL CLIENTE Y NÚMERO DE FACTURAS
                * */
                for(var w=0; w < rows.length; w++){
                    if(numfac.indexOf(rows[w][14]) == -1){
                        //LA FACTURA AUN NO SE INGRESA A facturas[]
                        facturas.push([rows[w][13],rows[w][14],rows[w][0],rows[w][15]]);
                        //A facs LUEGO SE DEBE VINCULAR CON LA FACTURA RECIEN INGRESADA (idfactura)
                        facs.push([rows[w][14], w, parseFloat(rows[w][12])]);
                        numfac.push(rows[w][14]);
                    }
                    else{
                        //LA FACTURA YA SE INGRESÓ A facturas[]
                        facs.push([rows[w][14], w, rows[w][12]]);
                    }
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT min(idabast) as pr_abast FROM abastecimiento", function(err, idabast){
                        if(err) throw err;
                        idabast = idabast[0].pr_abast;
                        for(var e=0; e < facs.length; e++){
                            facs[e][1] = idabast + e;
                        }
                        console.log(facturas);
                        console.log(facs);
                        connection.query("INSERT IGNORE INTO factura (fecha, numfac, idoda, coment) VALUES ?",[facturas], function(err, inFacts){
                            if(err) throw err;
                            connection.query("SELECT idfactura,numfac FROM factura", function(err, Facts){
                                if(err) throw err;
                                for(var f=0; f < facs.length; f++){
                                    for(var b=0; b < Facts.length; b++){
                                        if(Facts[b].numfac == facs[f][0] ){
                                            facs[f][0] = Facts[b].idfactura;
                                            break;
                                        }
                                    }
                                }
                                connection.query("INSERT IGNORE INTO facturacion (idfactura, idabast, costo) VALUES ?", [facs], function(err, inFacturacion){
                                    if(err) throw err;

                                    res.redirect('/plan');

                                });
                            });
                        });


                    });


                });
            });
        var input = fs.createReadStream('csvs/OCA2.csv');
        input.pipe(parser);


    } else res.redirect("/bad_login");
});



router.get('/parsecsv_fixcostos', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                rows.shift();
                /*
                * CSV:
                * N° OC[0],	CODIGO[1],	PRODUCTO [2],	CANT [3],	UNIT NETO[4],
                * TOTAL NETO[5],	ENTREGA[6],	EXENTO[7],	C° COSTO[8],
                * OF[9],	PROVEEDOR[10], RUT[11], TOTAL C/IVA[12],	FECHA[13],
                * FACTURA[14],	OBSERVACIONES[15],	ESTADO [16]
                *
                *
                * UPDATE `table` SET `uid` = CASE
                    WHEN id = 1 THEN 2952
                    WHEN id = 2 THEN 4925
                    WHEN id = 3 THEN 1592
                    ELSE `uid`
                    END
                WHERE id  in (1,2,3)
                * */
                var query = "UPDATE abastecimiento SET costo = CASE"
                var id = '';
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("SELECT min(idabast) as idmin FROM abastecimiento", function(err, idabast){
                        if(err) throw err;
                        idabast = idabast[0].idmin;
                        for(var w=0; w < rows.length; w++){
                            if(rows[w][4] == ''){
                                rows[w][4] = 'costo';
                            }
                            query += " WHEN idabast = "+(idabast+w)+" THEN "+rows[w][4].replace('.','');
                            id += (idabast+w)+",";
                        }
                        id = id.substring(0, id.length-1);
                        query = query + " ELSE costo END WHERE idabast in ("+id+")";
                        connection.query(query, function(err, inC){
                            if(err) throw err;

                            res.redirect('/plan');
                        });
                    });


                });
            });
        var input = fs.createReadStream('csvs/OCA2.csv');
        input.pipe(parser);


    } else res.redirect("/bad_login");
});


router.get('/parsecsv_of_op', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var cod_list = [];
                var fabrs_list = [];
                var ops_list = [];
                for(var i=1; i<rows.length; i++){
                    if(rows[i][10] == "0"){
                        continue;
                    }
                    cod_list.push(rows[i][0]);
                    fabrs_list.push([i,1,rows[i][10],new Date('2018-02-28 00:00:00')]);
                    ops_list.push([i,i,1,rows[i][10],new Date('2018-02-01 00:00:00')]);
                    for(var j = 2;j<10;j++){
                        if(rows[i][j] == ""){
                            ops_list[ops_list.length- 1].push(0);
                        } else{
                            ops_list[ops_list.length- 1].push(parseInt(rows[i][j]));
                        }
                    }
                    ops_list[ops_list.length- 1].push(0);
                    console.log(ops_list);
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    connection.query("INSERT INTO produccion (`idproduccion`,`idfabricaciones`,`idordenproduccion`,`cantidad`,`f_gen`,`1`,`2`,`3`,`4`,`5`,`6`,`7`,`8`,`standby`) VALUES ?",[ops_list],function(err,rows){
                        if(err) {
                            throw err;
                        }
                        console.log(rows.insertId + 1);
                        console.log("aff: " + rows.affectedRows);

                        res.redirect('/plan');
                    })
                });
            });
        var input = fs.createReadStream('public/OFinicial.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});























router.get('/parsecsv_forged2', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var mat_list = [];
                var forged_list = [];
                var idsub;
                console.log(rows.length);
                for(var i=1; i<rows.length; i++){
                    caracts = parseInt(rows[i][0].slice(7,9));
                    if(parseInt(rows[i][0].slice(7,9)) == 0){
                        caracts = 99;
                    }
                    idsub = parseInt(rows[i][0].slice(5,7));
                    if(idsub == 0){
                        idsub = 99
                    }
                    /*if(rows[i][2] == ""){
                        continue;
                    } else if( rows[i][2] == "EXTERNO"){
                        continue;
                    }*/
                    mat_list.push([rows[i][1],"fin",rows[i][0][0],parseInt(rows[i][0].slice(1,3)),caracts, rows[i][0]]);
                    if(rows[i][2] != "EXTERNO"){forged_list.push([i,idsub,rows[i][2].replace(/-/g,",")]);}
                }
                req.getConnection(function(err,connection){
                    if(err) throw err;
                    
                    console.log(mat_list);
                    connection.query("INSERT INTO material (`detalle`,`estado`,`tipo`,`especificacion`,`caracteristica`,`codigo`) VALUES ?",[mat_list],function(err,rows){
                        if(err) {
                            throw err;
                        }
                        console.log(rows.insertId + 1);
                        console.log("aff: " + rows.affectedRows);
                        console.log("f_len: " + forged_list.length);
                        for(var j = 0;j<forged_list.length;j++){
                            forged_list[j][0] = rows.insertId + j;
                        }
                        console.log(forged_list);
                        connection.query("INSERT INTO producido (`idmaterial`,`idsubaleacion`,`ruta`) VALUES ?",[forged_list],function(err,forgeds){
                            if(err) throw err;
                            res.redirect('/plan');
                        });
                    })
                });
            });
        var input = fs.createReadStream('levantamiento/productos1602.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});





















router.get('/parsecsv', function(req, res, next){
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

                mat_list.push([i, rows[i][1],"fin",rows[i][0][0],parseInt(rows[i][0].slice(1,3)),caracts, rows[i][0]]);
                //otro_list.push([i]);
                switch(rows[i][0][0]){
                    case "P":
                        console.log("P");
                    case "S":
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
                    case "M":
                    case "I":
                        rec_list.push([i]);
                        break;
                    default:
                        //otro_list.push([i]);
                        break;
                }
                //mat_list.push([i,rows[i][1],"fin",rows[i][0][0],parseInt(rows[i][0].slice(1,3)),caracts, rows[i][0]]);

            }
            console.log(mat_list);
            console.log(otro_list);
            /*req.getConnection(function(err,connection){
                if(err) throw err;
                connection.query("INSERT INTO material (`idmaterial`,`detalle`,`estado`,`tipo`,`especificacion`,`caracteristica`,`codigo`) VALUES ?",[mat_list],function(err,rows){
                    if(err) {
                        console.log(mat_list);
                        throw err;
                    }
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
                });
            });*/
        });
        var input = fs.createReadStream('csvs/productos1602.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});































router.get('/render_ficha_lanzamiento', function(req, res, next){
  if(verificar(req.session.userData)){
    res.render('plan/ficha_lanzamiento_fragment');}
  else{res.redirect('bad_login');}  
});

router.post('/registro_mat', function(req, res, next){
  if(verificar(req.session.userData)){
    if(req.session.isUserLogged){

        var tipo = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function (err, connection){
           if(err) console.log("Connection Error: %s",err);
           connection.query("SELECT * FROM caracteristica",function(err,caracts){
               if(err) console.log("Select Error: %s",err);
               if(tipo.tipo == "prod"){
                   connection.query("SELECT aleacion.idaleacion,aleacion.nom,GROUP_CONCAT(subaleacion.idsubaleacion,'@',subaleacion.subnom) as subs FROM aleacion LEFT JOIN subaleacion" +
                       " ON subaleacion.idaleacion = aleacion.idaleacion GROUP BY aleacion.idaleacion",function (err,aleaciones){
                       if(err) console.log("Select Error: %s",err);
                       res.render('plan/registro_mat',{tipo: tipo.tipo,caracts: caracts, data: aleaciones});
                   });
               } else{
                   res.render('plan/registro_mat',{tipo: tipo.tipo,caracts: caracts,data: []});
               }

           });
        });
    }
  }
  else{res.redirect('bad_login');}  
    
});




router.post('/save_mat', function(req, res, next){
  if(verificar(req.session.userData)){
      if(req.session.isUserLogged){

        var input = JSON.parse(JSON.stringify(req.body));
        var data = {
            u_medida: input.u_medida,
            f_aprov: input.f_aprov,
            leadtime: input.leadtime,
            precio:input.precio,
            abc:input.abc,
            tipo:input.tipo,
            especificacion:input.especificacion,
            caracteristica:input.caracteristica,
            detalle:input.detalle
        };
        if(input.tipo== "prod"){
            data.estado = "pdf";
        } else {
            data.estado = "geCho";
        }

        req.getConnection(function (err, connection){
            if(err) console.log("Connection Error: %s",err);
            connection.query("INSERT INTO material SET ?",data,function(err,material){
                if(err) console.log("Select Error: %s",err);
                if(input.tipo == "prod"){
                    connection.query("INSERT INTO producto SET ?",{idmaterial: material.insertId,idaleacion:input.aleacion},function (err,aleaciones){
                        if(err) console.log("Select Error: %s",err);
                        connection.query("INSERT INTO producido SET ?", {idproducto: aleaciones.insertId, idmaterial: material.insertId, idsubaleacion: input.subaleacion}, function(err, rows){
                          if(err) console.log("Select Error: %s",err);
                          res.send("si");
                        });
                    });
                } else if(input.tipo=="recur"){
                    connection.query("INSERT INTO recurso SET ?",{idmaterial: material.insertId,u_pedido:input.u_pedido,cod_proveedor:input.cod_proveedor,punto_pedido:input.punto_pedido},function (err,aleaciones){
                        if(err) console.log("Select Error: %s",err);
                        res.send("si");
                    });
                } else {
                    connection.query("INSERT INTO otro SET ?",{idmaterial: material.insertId},function (err,aleaciones){
                        if(err) console.log("Select Error: %s",err);
                        res.send("si");
                    });
                }
            });
        });
    }




  }
  else{res.redirect('bad_login');}  
    
});
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
router.post('/addsession_prepeds', function(req,res,next){
    var query,clase,fila;
    var fabricacion;
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT material.detalle,material.stock,caracteristica.cnom FROM material LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica WHERE material.idmaterial = ?",
                [req.body.idm],function(err, details){
                    if(err){console.log("Error Selecting : %s", err);}
                    if(req.body.tipo == 'producido'){fabricacion='Interna'}
                    else{fabricacion='Externa'}
                    fila = "<td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'><input type='hidden' name='idp' value='" + req.body.idp +"'></td><td><strong>" + fabricacion + "</strong></td>";
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
                        default:
                            query = "SELECT otro.helper as aux1,GROUP_CONCAT('Precio: ',material.precio) as aux2 FROM otro LEFT JOIN material ON material.idmaterial = otro.idmaterial WHERE otro.idproducto = ? GROUP BY otro.idproducto";
                            clase = "danger";
                            break;
                    }
                    fila = "<tr class='" + clase + "'>" + fila;
                    connection.query(query,[parseInt(req.body.idp)],function(err,auxs){
                        if(err)throw err;


                        console.log(auxs);
                        if(inputprov){fila = fila + "<td>" + auxs[0].aux1 +"<input type='text' value='1' name='prov' style='display:none;'></input></td>"/*<div class='predic_text' onkeyup='getPredictions(this)'><input type='text' name='prov' autocomplete='off'></input><div></div></div>*/;}
                        else{ fila = fila + "<td><input type='text' value='-1' name='prov' style='display:none;'></input>" + auxs[0].aux2 +"</td>";}
                        fila = fila + "<td><input type='date' name='fechas' class='form-control' min='"+ new Date().toLocaleDateString() +"' required></td>" +
                            "<td><input class='form-control' type='number' name='cants' min='1' required></td><td>"+details[0].stock+"</td><td><input type='number' class='form-control' placeholder='Precio' name='precio'></td><td style='text-align:center;'><input type='checkbox' name='lock'></td><td><a onclick='drop(this)' class='btn btn-danger'><i class='fa fa-remove'></i></a></td></tr>";
                        res.send(fila);

                    });

                });
        });
    } else res.redirect("/bad_login");

});

// Stream lanzar pedido cliente
router.post('/buscar_mat', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        input.det = "%" + input.det + "%";
        var wher = "WHERE (material.tipo != 'I' and material.tipo != 'C' and material.tipo != 'X' and material.tipo!='S' and material.tipo!='M') AND material.detalle LIKE ?";
        var dats = [input.det];
        if(input.caract != "0"){
            wher += " AND material.caracteristica = ?";
            dats.push(parseInt(input.caract));
        }
        req.getConnection(function(err,connection){
            connection.query("SELECT material.*,caracteristica.cnom,producido.idproducto as idproducido,producto.idproducto,otro.idproducto AS idotro,GROUP_CONCAT(aleacion.nom,'@@',subaleacion.subnom) as alea_token FROM material " +
                "LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica LEFT JOIN producido ON producido.idmaterial = material.idmaterial" +
                " LEFT JOIN producto ON producto.idmaterial = material.idmaterial LEFT JOIN otro ON otro.idmaterial = material.idmaterial LEFT JOIN subaleacion ON producido.idsubaleacion = subaleacion.idsubaleacion" +
                " LEFT JOIN aleacion ON aleacion.idaleacion = subaleacion.idaleacion " + wher + " GROUP BY material.idmaterial",dats,function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                /*console.log("SELECT material.*,caracteristica.cnom,producido.pdf,aleacion.nom,producido.idproducto as idprod,subaleacion.subnom FROM material LEFT JOIN producido ON material.idmaterial = producido.idmaterial" +
                " LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producido.idsubaleacion LEFT JOIN aleacion ON subaleacion.idaleacion = aleacion.idaleacion" +
                " LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica " + wher + " GROUP BY producido.idproducto");*/
                res.render('plan/prepeds_stream',{data:rows},function(err,html){if(err)console.log(err);res.send(html)});

            });
            //console.log(query.sql);
        });
    } else res.redirect("/bad_login");

});

router.post('/buscar_prod', function(req, res, next){
  if(verificar(req.session.userData)){
    var input = JSON.parse(JSON.stringify(req.body));
    var where;
    //if(input.codigo == ''){
        where = "WHERE material.detalle LIKE '%"+ input.detalle +"%' OR alias.numordenfabricacion LIKE '%"+input.detalle+"%'"; 
    /*}
    else{
        where = "WHERE material.codigo LIKE '%"+ input.codigo +"%' "; 
    
    }*/
    req.getConnection(function(err, connection){
            connection.query("SELECT material.idmaterial,material.detalle, GROUP_CONCAT(alias.numordenfabricacion,'@', alias.cantidad, '@', alias.restantes, '@', alias.f_entrega, '@', alias.pt,'@',alias.despachados)" +
                "  as content FROM (SELECT ordenfabricacion.numordenfabricacion ,fabricaciones.idorden_f, fabricaciones.idfabricaciones,fabricaciones.cantidad," +
                " fabricaciones.restantes,fabricaciones.idmaterial,fabricaciones.f_entrega,pedido.despachados,COALESCE(SUM(produccion.8),0) as pt FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                " LEFT JOIN ordenfabricacion ON ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f left join odc on odc.numoc = ordenfabricacion.numordenfabricacion left join pedido ON (pedido.idodc = odc.idodc AND pedido.f_entrega = fabricaciones.f_entrega AND fabricaciones.idmaterial = pedido.idmaterial) GROUP BY fabricaciones.idfabricaciones) alias LEFT JOIN material ON alias.idmaterial=material.idmaterial "+where+" GROUP BY material.idmaterial",
                function(err, productos){
                    if(err){console.log("Error Selecting : %s", err);}
                    res.render('plan/show_prod', {productos: productos, paginas: 1, thispag: 0});
                });
    });
  }
  else{res.redirect('bad_login');}  
    
});

router.get('/found_num_of/:num', function(req, res, next){
  if(verificar(req.session.userData)){
    var num = req.params.num;
    console.log(num);
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM ordenfabricacion WHERE numordenfabricacion= ?", [num], function(err, ofs){
            if(err){console.log("Error Selecting : %s", err);}

            console.log(ofs);
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

router.get('/found_num/:num/:idcli', function(req, res, next){
  if(verificar(req.session.userData)){
    var num = req.params.num;
    var idcli = req.params.idcli;
    console.log(num);
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM odc WHERE numoc= ? AND idcliente=?", [num, idcli], function(err, ofs){
            if(err){console.log("Error Selecting : %s", err);}

            console.log(ofs);
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
            connection.query(/*"select * from (select ordenfabricacion.*,max(to_days(fabricaciones.f_entrega) > to_days(now())) as atraso," +
                        " GROUP_CONCAT(material.detalle,'@',fabricaciones.cantidad,'@'," +
                        " fabricaciones.f_entrega,'@',fabricaciones.restantes,'@',fabs.cantidad,'@',fabs.despachados,'@',to_days(fabricaciones.f_entrega) - to_days(now())) as token from ordenfabricacion" +
                        " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                        " left join material on fabricaciones.idmaterial=material.idmaterial" +
                        " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad,pedido.despachados FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion" +
                        "  left join odc ON odc.numoc = ordenfabricacion.numordenfabricacion left join pedido ON (pedido.idodc = odc.idodc AND pedido.idmaterial = fabricaciones.idmaterial AND fabricaciones.f_entrega = pedido.f_entrega) GROUP BY fabricaciones.idfabricaciones) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones" +
                        " GROUP BY ordenfabricacion.idordenfabricacion ORDER BY ordenfabricacion.creacion DESC) as sup_query where "+query*/
                        "SELECT * FROM (select ordenfabricacion.*,coalesce(odc.numoc, 'Sin OC') as numoc,max(fabricaciones.cantidad>COALESCE(pedido.despachados,0) AND to_days(fabricaciones.f_entrega) < to_days(now())) as atraso,sum(coalesce(pedido.despachados, 0)) as sum_desp, sum(fabricaciones.cantidad) as sum_cant," +
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
                                console.log(ofFound);
                                res.render('plan/of_list',{data: ofFound, filtro: filtro, nomore: limit > ofFound.length});
                            }
                            else{
                                res.render('plan/of_list',{data: [], filtro: filtro, nomore: limit > ofFound.length});
                            }
                        });}
        else{
            connection.query(/*"select * from (select ordenfabricacion.*,max(to_days(fabricaciones.f_entrega) > to_days(now())) as atraso," +
                        " GROUP_CONCAT(material.detalle,'@',fabricaciones.cantidad,'@'," +
                        " fabricaciones.f_entrega,'@',fabricaciones.restantes,'@',fabs.cantidad,'@',fabs.despachados,'@',to_days(fabricaciones.f_entrega) - to_days(now())) as token from ordenfabricacion" +
                        " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                        " left join material on fabricaciones.idmaterial=material.idmaterial" +
                        " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad,pedido.despachados FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion" +
                        "  left join odc ON odc.numoc = ordenfabricacion.numordenfabricacion left join pedido ON (pedido.idodc = odc.idodc AND pedido.idmaterial = fabricaciones.idmaterial AND fabricaciones.f_entrega = pedido.f_entrega) GROUP BY fabricaciones.idfabricaciones) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones" +
                        " GROUP BY ordenfabricacion.idordenfabricacion ORDER BY ordenfabricacion.creacion DESC) as sup_query where "+query*/
                        "SELECT * FROM (select ordenfabricacion.*,coalesce(odc.numoc, 'Sin OC') as numoc,max(fabricaciones.cantidad>COALESCE(pedido.despachados,0) AND to_days(fabricaciones.f_entrega) < to_days(now())) as atraso,sum(coalesce(pedido.despachados, 0)) as sum_desp, sum(fabricaciones.cantidad) as sum_cant," +
                    " GROUP_CONCAT(REPLACE(material.detalle,',', '.'),'@',fabricaciones.cantidad,'@'," +
                    " fabricaciones.f_entrega,'@',coalesce(fabricaciones.restantes, fabricaciones.cantidad),'@',fabs.cantidad,'@',coalesce(pedido.despachados, 'Sin OC vinculada'),'@',to_days(fabricaciones.f_entrega) - to_days(now()),'@',coalesce(pedido.externo, 0),'@', fabricaciones.lock,'@', fabricaciones.idfabricaciones) as token from ordenfabricacion" +
                    " left join fabricaciones on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f" +
                    " left join material on fabricaciones.idmaterial=material.idmaterial" +
                    " left join (SELECT fabricaciones.idfabricaciones,SUM(COALESCE(produccion.8,0)) as cantidad FROM fabricaciones LEFT JOIN produccion ON fabricaciones.idfabricaciones = produccion.idfabricaciones left join ordenfabricacion ON fabricaciones.idorden_f = ordenfabricacion.idordenfabricacion" +
                    "  GROUP BY fabricaciones.idfabricaciones) fabs ON fabricaciones.idfabricaciones=fabs.idfabricaciones left join odc ON odc.idodc = ordenfabricacion.idodc left join pedido ON (pedido.idpedido=fabricaciones.idpedido)" +
                    " GROUP BY ordenfabricacion.idordenfabricacion) AS sup_query where sup_query.numoc"+req.body.ocvinc+" LIMIT "+limit,
                        data, function(err, ofFound){
                            if(err){console.log("Error Selecting : %s", err);}
                            
                            console.log(ofFound);
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



router.post('/buscar_ped', function(req, res, next){
    var data = [];
    var query = '';
    var aux;
    var estado = req.body.estad;
    var limit = req.body.items;
    console.log(req.body);
    req.getConnection(function(err, connection){
        if(req.body.estad == 'todos'){query+= ' inquery.numoc LIKE ? OR inquery.sigla LIKE "%'+req.body.num+'%" OR inquery.razon LIKE "%'+req.body.num+'%"';}
        else if(req.body.estad == 'despachado'){query+= ' (inquery.numoc LIKE ? OR inquery.sigla LIKE "%'+req.body.num+'%" OR inquery.razon LIKE "%'+req.body.num+'%") AND inquery.sum_cant = inquery.sum_desp';}
        else if(req.body.estad == 'atraso'){query+= ' (inquery.numoc LIKE ? OR inquery.sigla LIKE "%'+req.body.num+'%" OR inquery.razon LIKE "%'+req.body.num+'%") AND inquery.atraso';}
        else if(req.body.estad == 'activo'){query+= ' (inquery.numoc LIKE ? OR inquery.sigla LIKE "%'+req.body.num+'%" OR inquery.razon LIKE "%'+req.body.num+'%") AND !inquery.atraso AND inquery.sum_cant != inquery.sum_desp';}
        data.push(["%"+req.body.num+"%"]);
        if(data.length>0){
            connection.query("SELECT * FROM (SELECT * FROM (select odc.*,group_concat(replace(material.detalle,',','.'),'@',pedido.cantidad,'@'"
                        +",pedido.despachados,'@',pedido.f_entrega,'@',to_days(pedido.f_entrega) - to_days(now()), '@',"+/*coalesce(desp_ped.desp_num,*/ "0"+/*)*/" ,'@',"+/*coalesce(desp_ped.ult_desp, */"'NODATE'"+/*)*/",'@',coalesce(pedido.precio, 0)) as token,sum(pedido.cantidad) as sum_cant, sum(pedido.despachados) as sum_desp, "
                        +"max(pedido.cantidad>pedido.despachados AND to_days(pedido.f_entrega) < to_days(now())+1 ) as atraso, cliente.sigla, cliente.razon from odc left join pedido on pedido.idodc= odc.idodc "/*left join (select pedido.idpedido,count(despacho.iddespacho) as desp_num,max(despacho.fecha) as ult_desp from pedido left join despacho on Pedin_despacho(despacho.idf_token,pedido.idpedido) group by pedido.idpedido)"*/
                        +/*"as desp_ped on desp_ped.idpedido=pedido.idpedido */"left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente group by odc.idodc) as group_odc left join (select despacho.idorden_f"
                        +",(despacho.iddespacho),max(despacho.fecha) as ult_desp from despacho group by despacho.idorden_f) as despachos on (despachos.idorden_f=group_odc.idodc)) AS inquery WHERE"+query+" LIMIT "+limit

                /*"SELECT * FROM (select odc.*,group_concat(replace(material.detalle, ',', '.'),'@',pedido.cantidad,'@',pedido.despachados,'@',pedido.f_entrega) as token, sum(pedido.cantidad) as sum_cant, sum(pedido.despachados) as sum_desp,max(pedido.cantidad>pedido.despachados AND pedido.f_entrega < now()) as atraso, cliente.sigla, cliente.razon from odc left join pedido on pedido.idodc= odc.idodc "
                        +"left join (select pedido.idpedido,count(despacho.iddespacho) as desp_num,max(despacho.fecha) as ult_desp from pedido left join despacho on Pedin_despacho(despacho.idf_token,pedido.idpedido) group by pedido.idpedido) as desp_ped on desp_ped.idpedido=pedido.idpedido left join material on material.idmaterial = pedido.idmaterial left join cliente on odc.idcliente=cliente.idcliente group by odc.numoc ) as inquery WHERE"+query*/,[data], 
                        function(err, ofFound){
                            if(err){console.log("Error Selecting : %s", err);}
                            //if(ofFound.length > 0){
                                //console.log(ofFound);
                            res.render('plan/ped_list',{data: ofFound, selector: estado, nomore: limit > ofFound.length });
                            /*}
                            else{
                                res.send('null');
                            }*/
                        });
        }
        else{
            res.redirect('/plan/list_peds');   
        }
    });
});












router.get('/ofto_odc',function(req, res, next){
    var data = [];
    var query = '';
    var aux;
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
        connection.query("SELECT * FROM ordenfabricacion",function(err, ofs){
            if(err)
                console.log("Error Selecting : %s", err);
            var odc = [];
            for(var t=0; t < ofs.length; t++){
                odc.push([ofs[t].idordenfabricacion, ofs[t].numordenfabricacion]);
            }
            connection.query("SELECT * FROM fabricaciones",function(err, fabs){
                if(err)
                    console.log("Error Selecting : %s", err);
                var ped = [];
                for(var i=0; i < fabs.length; i++){
                    ped.push([fabs[i].idfabricaciones, fabs[i].despachados,fabs[i].f_entrega,fabs[i].cantidad,fabs[i].idmaterial,fabs[i].idorden_f]);
                }
                connection.query("INSERT INTO odc (idodc, numoc) VALUES ?", [odc], function(err, odc){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    connection.query("INSERT INTO pedido (idpedido, despachados, f_entrega, cantidad, idmaterial, idodc) VALUES ?", [ped], function(err, peds){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        res.redirect('/plan');
                    });

                });
            });
        });    

    });

});






router.get('/parsecsv_clientes', function(req, res, next){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var arrayCliente = [];
                console.log(rows);
                for(var t=1; t<rows.length; t++){
                    arrayCliente.push([rows[t][1],rows[t][2],rows[t][3],rows[t][4],rows[t][5],rows[t][8],rows[t][9],rows[t][10]]);
                }
                console.log(arrayCliente);
                
                req.getConnection(function(err, connection){
                    connection.query("INSERT INTO cliente (sigla, razon, rut, direccion, ciudad, giro, telefono, contacto) VALUES ?", [arrayCliente], function(err,rows){
                        if(err){console.log("Error Selecting : %s", err);}
                        res.redirect('/');
                    });
                });
            });
        var input = fs.createReadStream('csvs/bdcliente3.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

});


router.get('/parsecsv_clientes2', function(req, res, next){
        var fs = require('fs')
        var parse = require('csv-parse');

        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var arrayCliente = [];
                //console.log(rows);
                for(var t=1; t<rows.length; t++){
                    //console.log(rows[t][2]=='');
                    if(rows[t][2] != ''){
                        arrayCliente.push([rows[t][0],rows[t][1],rows[t][2],rows[t][3],rows[t][4],rows[t][5],rows[t][6],rows[t][8]]);
                    }
                }
                console.log(arrayCliente.length);
                req.getConnection(function(err, connection){
                    connection.query("SELECT  * FROM cliente", function(err, client){
                        if(err)
                            console.log("Error Selecting : %s", err);
                        
                        
                        var cuenta = 0;
                        while(arrayCliente[cuenta]){
                            for(var i=0; i < client.length; i++){
                                if( arrayCliente[cuenta][2] == client[i].rut){
                                    arrayCliente.splice(cuenta,1);                            
                                    break;
                                }
                                else if(i == client.length-1){
                                    cuenta++;
                                }
                            }
                        }

                        //console.log(arrayCliente);

                        console.log(arrayCliente.length);
                        console.log(arrayCliente[10]);
                        connection.query("INSERT INTO cliente (sigla, razon, rut, direccion, ciudad, giro, telefono, contacto) VALUES ?", [arrayCliente], function(err,rows){
                            if(err){console.log("Error Selecting : %s", err);}
                            
                            res.redirect('/');
                        });
                    });
                    
                });
            });
        var input = fs.createReadStream('csvs/proveedores2.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

});




router.get('/fix_clientes', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query("SELECT * from (SELECT sigla,rut,count(rut) AS c,group_concat(idcliente) as tokenc FROM siderval.cliente where rut!='0' group by rut order by c desc) as queryc WHERE queryc.c>1",
            function(err, cliente){
                if(err)
                    console.log("Error Selecting : %s");

                var comand = "DELETE FROM cliente WHERE ";
                var split;
                for(var y=0; y < cliente.length; y++){
                    split = cliente[y].tokenc.split(',');
                    for(var t = 1; t < split.length; t++){
                        comand += "idcliente="+split[t]+" OR ";
                    }
                }
                comand = comand.substring(0,comand.length-3);
                connection.query(comand, function(err, com){
                    if(err)
                        console.log("Error Deleting : %s", err);
                    res.redirect('/plan');
                });
            });
    });
});






router.get('/get_client_pred/:text', function(req,res,next){
    var text = req.params.text;
    console.log(text);
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);
        connection.query("SELECT idcliente,sigla,coalesce(formapago.tokenoda, '') as tokenoda,cliente.pago FROM cliente left join (select max(oda.creacion) as creacion, tokenoda, oda.idproveedor from oda group by idproveedor) as formapago on formapago.idproveedor = cliente.idcliente WHERE cliente.sigla LIKE '%"+text+"%' LIMIT 7",
            function(err, datos){
                if(err)
                    console.log("Error Selecting : %s", err);
                console.log(datos);
                res.render('plan/predict_stream', {info : datos});

            });
        });
});



//SE LLAMA A ESTA RUTA INMEDIATAMENTE DESPUES DE CREAR LA ODA
router.post('/view_ordenpdf', function(req,res,next){
    var idoda = JSON.parse(JSON.stringify(req.body)).idoda;
    var fs = require('fs');
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

                        page.open("http://localhost:4300/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
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
                        page.paperSize = {
                          format: 'Letter',
                          margin: '5px'
                        };
                        page.open("http://localhost:4300/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
                            page.render('public/pdf/odc'+oda[0].idoda+'.pdf').then(function() {
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

                        page.open("http://localhost:4300/plan/view_ordenpdf_get/"+oda[0].idoda).then(function(status) {
                            page.render('public/pdf/odc'+oda[0].numoda+'.pdf').then(function() {
                                console.log('Page Rendered');
                                ph.exit();
                                var fs = require('fs');
                                var filePath = '\\pdf\\odc'+oda[0].numoda+'.pdf';
                                console.log(__dirname.replace('routes','public') + filePath);
                                fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
                                    res.contentType("application/pdf");
                                    console.log(data);
                                    res.redirect('/plan/download_pdf/'+oda[0].numoda);
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

router.get('/show_pdf/:numoda', function(req,res,next){
      var fs = require('fs');
      var filePath = '\\pdf\\odc'+req.params.numoda+'.pdf';
      console.log(__dirname.replace('routes','public') + filePath);

      fs.readFile(__dirname.replace('routes','public') + filePath, (err, data) => {
        if(err) {
          console.log('error: ', err);
          console.log("ARCHIVO INEXISTENTE");
          res.redirect('/plan/view_ordenpdf_after/'+req.params.numoda);
            
        } else {
          console.log(data);
          console.log("ARCHIVO SI EXISTE");
          fs.readFile(__dirname.replace('routes','public') + filePath , function (err,data){
              res.contentType("application/pdf");
              console.log(data);
              res.send(data);
          });
        }
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

        connection.query('select material.detalle,abastecimiento.cc as subcuenta, abastecimiento.costo as precio, abastecimiento.cantidad,abastecimiento.exento from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on material.idmaterial=abastecimiento.idmaterial where oda.idoda=?', [req.params.idoda],
         function(err, mats){
            if(err)
                console.log("Error Selecting : %s", err);
            connection.query("SELECT * FROM oda LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor WHERE oda.idoda = ?", [req.params.idoda], function(err, oda){
                if(err)
                    console.log("Error Selecting : %s", err);
                console.log(mats);
                res.render('plan/template_oda', {oda: oda,mats: mats});
            });
        });        
    });    
});


router.post('/saveStateOC', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
    console.log(data);
    req.session.estadoAlm = data;
    res.send('ok');

});


router.post('/saveStateOC', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
    console.log(data);
    req.session.estadoAlm = data;
    res.send('ok');

});
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

router.post('/saveStateOF', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
    console.log(data);
    req.session.estadoAlmOF = data;
    res.send('ok');

});

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

router.get('/loadStateOC', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s",err);
        console.log(req.session.estadoAlm);
        if(req.session.estadoAlm){
            if(req.session.estadoAlm['idm[]']){
                console.log("Con productos....!!");
                var datos = req.session.estadoAlm;
                datos['dets[]'] = [];
                datos['alea[]'] = [];
                datos['stock[]'] = [];
                var c_int = 0;
                var c_ext = 0;

                var query_producido = '';
                var query_producto = '';
                if(typeof req.session.estadoAlm['idm[]'] == 'string'){
                        if(req.session.estadoAlm['prov[]'] == '-1'){//PRODUCIDO
                            query_producido = "SELECT * FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion";
                            query_producido += " WHERE material.idmaterial = "+req.session.estadoAlm['idm[]'];
                        }
                         else{//PRODUCTO
                            query_producto = "SELECT * FROM material left join producto on producto.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producto.idaleacion";
                            query_producto += " WHERE material.idmaterial = "+req.session.estadoAlm['idm[]']; 
                        }

                        datos['dets[]'].push('');
                        datos['alea[]'].push('');
                        datos['stock[]'].push('');
                }
                else{
                    for(var u=0; u<req.session.estadoAlm['idm[]'].length; u++){
                        if(req.session.estadoAlm['prov[]'][u] == '-1'){//PRODUCIDO
                            if(c_int == 0){
                                query_producido = "SELECT * FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion";
                                query_producido += " WHERE material.idmaterial = "+req.session.estadoAlm['idm[]'][u];
                            }
                            else{    
                                query_producido += " OR material.idmaterial = "+req.session.estadoAlm['idm[]'][u];
                            }
                            c_int++;

                        }
                        else{//PRODUCTO
                            if(c_ext == 0){
                                query_producto = "SELECT * FROM material left join producto on producto.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producto.idaleacion";
                                query_producto += " WHERE material.idmaterial = "+req.session.estadoAlm['idm[]'][u];
                            }
                            else{    
                                query_producto += " OR material.idmaterial = "+req.session.estadoAlm['idm[]'][u];
                            }
                            c_ext++;

                        }
                        datos['dets[]'].push('');
                        datos['alea[]'].push('');
                        datos['stock[]'].push('');
                    }
                }
                connection.query(query_producto, function(err, productos){
                            if(err)
                                console.log("Error Selecting : %s", err);
                            
                            if(productos){
                                for(var y=0; y < productos.length; y++){
                                    if(typeof req.session.estadoAlm['idm[]'] == 'string'){
                                        if(req.session.estadoAlm['idm[]'] == productos[y].idmaterial && productos[y].idproducto == req.session.estadoAlm['idp[]']){
                                                datos['dets[]'] = productos[y].detalle;
                                                if(productos[y].subnom == null){
                                                    datos['alea[]'] = 'sin';
                                                }
                                                else{
                                                    datos['alea[]'] = productos[y].subnom;
                                                }
                                                datos['stock[]'] = productos[y].stock;
                                        }
                                    }
                                    else{
                                        for(var t=0; t < req.session.estadoAlm['dets[]'].length; t++){
                                            if(req.session.estadoAlm['idm[]'][t] == productos[y].idmaterial && productos[y].idproducto == req.session.estadoAlm['idp[]'][t]){
                                                datos['dets[]'][t] = productos[y].detalle;
                                                if(productos[y].subnom == null){
                                                    datos['alea[]'][t] = 'sin';
                                                }
                                                else{
                                                    datos['alea[]'][t] = productos[y].subnom;
                                                }
                                                datos['stock[]'][t] = productos[y].stock;
                                            }
                                        }
                                    }
                                }
                            }
                            connection.query(query_producido, function(err, producidos){
                                if(err)
                                    console.log("Error Selecting : %s", err);
                                
                                if(producidos){
                                    for(var y=0; y < producidos.length; y++){
                                        if(typeof req.session.estadoAlm['idm[]'] == 'string'){
                                            if(req.session.estadoAlm['idm[]'] == producidos[y].idmaterial && producidos[y].idproducto == req.session.estadoAlm['idp[]']){
                                                    datos['dets[]'] = producidos[y].detalle;
                                                    if(producidos[y].subnom == null){
                                                        datos['alea[]'] = 'sin';
                                                    }
                                                    else{
                                                        datos['alea[]'] = producidos[y].subnom;
                                                    }
                                                    datos['stock[]'] = producidos[y].stock;
                                                }
                                        }
                                        else{
                                            for(var t=0; t < req.session.estadoAlm['dets[]'].length; t++){
                                                if(req.session.estadoAlm['idm[]'][t] == producidos[y].idmaterial && producidos[y].idproducto == req.session.estadoAlm['idp[]'][t]){
                                                    datos['dets[]'][t] = producidos[y].detalle;
                                                    if(producidos[y].subnom == null){
                                                        datos['alea[]'][t] = 'sin';
                                                    }
                                                    else{
                                                        datos['alea[]'][t] = producidos[y].subnom;
                                                    }
                                                    datos['stock[]'][t] = producidos[y].stock;
                                                }
                                            }
                                        }
                                    }
                                }
                                connection.query("SELECT idcliente,razon,sigla FROM cliente", function(err, cli){
                                    if(err)
                                        console.log("Error Selecting : %s", err);
                                    if(typeof datos['idm[]'] == 'string'){
                                        datos['idm[]'] = [datos['idm[]']];
                                        datos['idp[]'] = [datos['idp[]']];
                                        datos['fechas[]'] = [datos['fechas[]']];
                                        datos['cants[]'] = [datos['cants[]']];
                                        datos['prov[]'] = [datos['prov[]']];
                                        datos['dets[]'] = [datos['dets[]']];
                                        datos['alea[]'] = [datos['alea[]']];
                                        datos['stock[]'] = [datos['stock[]']];
                                    }

                                    res.render('plan/formped_state',{data: datos, cli: cli});
                                    
                                });
                            });
                        });
                
            }
            else{
               console.log("sin productos");
                connection.query("SELECT idcliente,razon,sigla FROM cliente", function(err, cli){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    
                    if(req.session.estadoAlm == undefined){
                        req.session.estadoAlm = { cliente: '6331', nroordenfabricacion: '' };
                    }

                    res.render('plan/formped_state',{data: req.session.estadoAlm, cli: cli});
                    
                });
            }
        }
        else{
            console.log("sin productos");
            connection.query("SELECT idcliente,razon,sigla FROM cliente", function(err, cli){
                            if(err)
                                console.log("Error Selecting : %s", err);
                            
                            if(req.session.estadoAlm == undefined){
                                req.session.estadoAlm = { cliente: '6331', nroordenfabricacion: '' };
                            }

                            res.render('plan/formped_state',{data: req.session.estadoAlm, cli: cli});
                            
                        });
            }


    });
});



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

                var query_producido = '';
                var query_producto = '';
                for(var u=0; u<datos['idm[]'].length; u++){
                    if(datos['prov[]'][u] == '-1'){//PRODUCIDO
                        if(c_int == 0){
                            query_producido = "SELECT * FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion";
                            query_producido += " WHERE material.idmaterial = "+datos['idm[]'][u];
                        }
                        else{    
                            query_producido += " OR material.idmaterial = "+datos['idm[]'][u];
                        }
                        c_int++;

                    }
                    else{//PRODUCTO
                        if(c_ext == 0){
                            query_producto = "SELECT * FROM material left join producto on producto.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producto.idaleacion";
                            query_producto += " WHERE material.idmaterial = "+datos['idm[]'][u];
                        }
                        else{    
                            query_producto += " OR material.idmaterial = "+datos['idm[]'][u];
                        }
                        c_ext++;

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
                                            datos['stock[]'][t] = productos[y].stock;
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
                                                    datos['stock[]'] = producidos[y].stock;
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
                                                    datos['stock[]'][t] = producidos[y].stock;
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


router.get('/loadStateOF', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s",err);
        console.log(req.session.estadoAlmOF);
        if(req.session.estadoAlmOF){
            if(req.session.estadoAlmOF['idm[]']){
                console.log("Con productos....!!");
                var datos = req.session.estadoAlmOF;
                datos['dets[]'] = [];
                var c_int = 0;

                var query_producido = '';
                var query_producto = '';
                if(typeof req.session.estadoAlmOF['idm[]'] == 'string'){
                        query_producido = "SELECT * FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion";
                        query_producido += " WHERE material.idmaterial = "+req.session.estadoAlmOF['idm[]'];
                        
                        datos['dets[]'].push('');
                        
                }
                else{
                    for(var u=0; u<req.session.estadoAlmOF['idm[]'].length; u++){
                        if(c_int == 0){
                            query_producido = "SELECT * FROM material left join producido on producido.idmaterial=material.idmaterial left join subaleacion on subaleacion.idsubaleacion=producido.idsubaleacion";
                            query_producido += " WHERE material.idmaterial = "+req.session.estadoAlmOF['idm[]'][u];
                        }
                        else{    
                            query_producido += " OR material.idmaterial = "+req.session.estadoAlmOF['idm[]'][u];
                        }
                        c_int++;
                        datos['dets[]'].push('');
                    }
                }
                            connection.query(query_producido, function(err, producidos){
                                if(err)
                                    console.log("Error Selecting : %s", err);


                                if(typeof datos['idm[]'] == 'string'){
                                    datos['idm[]'] = [datos['idm[]']];
                                    datos['idp[]'] = [datos['idp[]']];
                                    datos['fechas[]'] = [datos['fechas[]']];
                                    datos['cants[]'] = [datos['cants[]']];
                                }
                                for(var t=0; t < datos['idm[]'].length; t++){
                                    for(var r=0; r < producidos.length; r++){
                                        if(datos['idm[]'][t] == producidos[r].idmaterial){
                                            datos['dets[]'][t] = producidos[r].detalle;
                                        }
                                    }
                                }
                                console.log(datos);

                                res.render('plan/formfab_state',{data: datos});
                                    
                            });
                
            }
            else{
               console.log("sin productos");
                
               if(req.session.estadoAlmOF == undefined){
                   req.session.estadoAlmOF = { 'idm[]': [], 'idp[]': [], 'fechas[]': [], 'cants[]': [], 'nroordenfabricacion': '1'};
               }

               res.render('plan/formfab_state',{data: req.session.estadoAlmOF});
                    
            }
        }
        else{
            console.log("sin productos");  
            if(req.session.estadoAlmOF == undefined){
                req.session.estadoAlmOF = { 'idm[]': [], 'idp[]': [], 'fechas[]': [], 'cants[]': [], 'nroordenfabricacion': '1'};
            }
            res.render('plan/formfab_state',{data: req.session.estadoAlmOF});
                            
            }


    });
});






module.exports = router;


