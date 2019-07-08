var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');
var adminModel = require('./xlsx');

router.use(
    connection(mysql,{

        host: 'localhost',
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

    return [where, limit,condiciones_where.join('@')];
}
function verificar(usr){
	if(usr.nombre == 'abastecimiento' || usr.nombre == 'matprimas' || usr.nombre == 'plan' || usr.nombre == 'siderval'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */

var updOcaRouter = require('./modelos/ocaRouter');
router.use('/updOca',updOcaRouter);

router.get('/', function(req, res, next) {
	if(req.session.userData.nombre == 'abastecimiento'){
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s",err);
			connection.query("select cuenta_g.idcuenta, cuenta_g.cuenta, ccontable.idccontable, ccontable.cuenta as ccontable, sub_ccontable.idsub, sub_ccontable.nombre from sub_ccontable left join ccontable on ccontable.idccontable = sub_ccontable.idccontable left join cuenta_g on substring(ccontable.idccontable,1,2) = cuenta_g.idcuenta", function(err, subc){
				if(err)
					console.log("Error Selecting : %s", err);

		    	res.render('abast/indx_new', {page_title: "Abastecimiento", username: req.session.userData.nombre, subc: subc});		
			});
		});
	}
	else{res.redirect('bad_login');}	
});
//RENDERIZA LO QUE VA A APARECER EN EL PDF
router.get('/view_facturapdf_get/:idfactura', function(req,res){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        connection.query('select material.detalle,abastecimiento.cc as subcuenta, facturacion.costo as precio, facturacion.cantidad,' +
			' abastecimiento.exento FROM facturacion LEFT JOIN abastecimiento ON facturacion.idabast = abastecimiento.idabast' +
			' LEFT JOIN  material on material.idmaterial=abastecimiento.idmaterial WHERE facturacion.idfactura = ?', [req.params.idfactura],
            function(err, mats){
                if(err)
                    console.log("Error Selecting : %s", err);
                connection.query("SELECT oda.*,cliente.*,factura.fecha,factura.numfac as numfactura FROM factura" +
					" LEFT JOIN oda ON factura.idoda = oda.idoda" +
					" LEFT JOIN cliente ON cliente.idcliente = oda.idproveedor WHERE factura.idfactura = ?", [req.params.idfactura], function(err, oda){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    console.log(mats);
                    res.render('plan/template_oda', {oda: oda,mats: mats,tipo: 'factura'},function(err,html){
                    	if(err) console.log(err);
                    	res.send(html);
					});
                });
            });
    });
});
//Genera el PDF de una factura y retorna el PATH de guardado
router.get('/view_facturapdf/:idfactura', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err) console.log("Error Connection : %s", err);
		// Se consigue el número de la factura
		connection.query("SELECT numfac FROM factura WHERE factura.idfactura = ?", [req.params.idfactura], function(err, oda){
			if(err) console.log("Error Selecting : %s", err);
			var phantom = require('phantom');
            // Ubicacion donde se guardará el pdf
            var path = '/pdf/fact_N' + oda[0].numfac + '-' + new Date().getTime() + '.pdf';
			// Inicializa phantom y lo pone en 'ph'
			phantom.create().then(function(ph) {
				// Se Crea la 'promesa' o el ~canvas~ por decirlo de otra manera
				ph.createPage().then(function(page) {
					//Setea las propiedades de la pagina donde se pegara el html
					page.property('viewportSize',{width:612,height:792});
					//Cargar html a pegar desde un request http
					page.open("http://localhost:4300/abastecimiento/view_facturapdf_get/"+req.params.idfactura).then(function(status) {
						// Guardar pdf en el 'path' especificado
						page.render('public' + path).then(function() {
							ph.exit();
							//Enviar
							res.send(path);
						});
					});
				});
			});


		});

	});
});

router.get('/odcs', function(req, res, next) {
	if(verificar(req.session.userData)){
			req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SET SESSION group_concat_max_len = 10000000", function(err ,rows){
                    if(err) console.log("Select Error: %s",err);

                    connection.query("select oda.*,cliente.sigla,cliente.razon,group_concat(replace(material.detalle,',','.'),'@',abastecimiento.cantidad,'@',abastecimiento.recibidos) as token from oda left join abastecimiento on abastecimiento.idoda= oda.idoda "
                        +"left join material on material.idmaterial = abastecimiento.idmaterial left join cliente on cliente.idcliente=oda.idproveedor group by oda.numoda",
                        function (err,ped){
                            if(err) console.log("Select Error: %s",err);

                        console.log(ped);
                        res.render('abast/odas', {data: ped});

                    });
                });
            });

    }
	else{res.redirect('bad_login');}
});

//Renderizar la página de ODA específica de odoo.
router.get('/page_oda/:idoda', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var idoda = req.params.idoda;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("SELECT oda.*,cliente.razon,cliente.sigla,GROUP_CONCAT(DISTINCT CONCAT(factura.numfac,'@',factura.idfactura,'@',factura.fecha,'@',coalesce(factura.coment, 'Sin Comentarios.'))) AS facturas_token, GROUP_CONCAT(DISTINCT CONCAT(recepcion.numgd,'@',recepcion.idrecepcion,'@', recepcion.fecha )) as gd_token FROM oda" +
                    " LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor" +
                    " LEFT JOIN factura ON oda.idoda = factura.idoda "+
                    " LEFT JOIN abastecimiento ON abastecimiento.idoda=oda.idoda "+
                    " LEFT JOIN recepcion_detalle ON recepcion_detalle.idabast=abastecimiento.idabast "+
                    " LEFT JOIN recepcion ON recepcion.idrecepcion=recepcion_detalle.idrecepcion "+
                    " WHERE oda.idoda = ? GROUP BY oda.idoda",[idoda], function(err, oda){
                    if(err) console.log("Select Error: %s",err);
                    connection.query("SELECT abastecimiento.*,material.detalle,SUM(COALESCE(facturacion.cantidad,0)) as facturados, GROUP_CONCAT(facturacion.cantidad,facturacion.costo,factura.numfac) as fact_detalle" +
						" FROM abastecimiento LEFT JOIN material ON material.idmaterial=abastecimiento.idmaterial" +
						" LEFT JOIN facturacion ON facturacion.idabast = abastecimiento.idabast" +
                        " LEFT JOIN factura ON facturacion.idfactura = factura.idfactura " +
                        " WHERE abastecimiento.idoda = ?" +
						" GROUP BY abastecimiento.idabast",[idoda], function(err ,abast){
                        if(err) console.log("Select Error: %s",err);
                        //res.redirect('/plan');
						//console.log(abast);
                        //console.log(oda);
                        var isFacturable = false;
                        var isRecepcionable = true;
						for(var w=0; w < abast.length; w++){
							if(abast[w].cantidad > abast[w].facturados ){
								isFacturable = true;
							}

							if (abast[w].cantidad === abast[w].recibidos ){
								isRecepcionable = false;
							} else {
								isRecepcionable = true;
							}

						}
                        res.render('abast/page_oda', {oda:oda[0], abast: abast, isfact: isFacturable, isRecep: isRecepcionable, user: req.session.userData});
                    });
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

// Recepcionar todos
router.get('/receiveAll/:idoda', function(req, res, next){
	if(verificar(req.session.userData)) {
        let idoda = req.params.idoda;
        req.getConnection(function (err, connection) {
            if (err) {
                console.log('Error al Recepcionar: %s', err);
            }
            //Obtenemos informacion necesaria desde Abast
            connection.query("SELECT idabast, cantidad, recibidos FROM abastecimiento WHERE idoda = ?", idoda, function (err, abast) {
                console.log(abast);
                //Actualizamos Matstock y el Abastecimiento
                connection.query("UPDATE abastecimiento, material " +
				"SET abastecimiento.recibidos = abastecimiento.cantidad, " +
				"material.stock = material.stock + abastecimiento.cantidad - abastecimiento.recibidos " +
				"WHERE abastecimiento.idoda = ? AND material.idmaterial = abastecimiento.idmaterial", idoda,
				function (err, result) {
					if (err) {console.log('Error al UPDATE: %s', err);}
					//Creamos una repeccion
					connection.query("INSERT INTO recepcion (numgd) VALUES (?)", ["R" + idoda], function (err, result2) {
                        if (err) {console.log('Error al INSERT1: %s', err);}
						let list = [];
						for (let i = 0; i < abast.length; i++){
							list.push([result2.insertId, abast[i]['idabast'], abast[i]['cantidad']-abast[i]['recibidos']]);
						}
						//Rellenamos los detalles de la recepcion.
						connection.query("INSERT INTO recepcion_detalle (idrecepcion, idabast, cantidad) VALUES ?", [list],
						function (err, result3) {
                            if (err) {console.log('Error al INSERT2: %s', err);}
							res.redirect('../page_oda/'+idoda);
                        });
					});
                });
            });
        });
    }
});


router.get('/sol_odc', function(req, res, next) {
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select * from (select numordenfabricacion,material.idmaterial,"
				+" material.detalle, produccion.cantidad-produccion.abastecidos as porabastecer"
				+", fabricaciones.f_entrega, produccion.idproduccion from produccion left join "
				+"ordenproduccion on produccion.idordenproduccion = ordenproduccion.idordenprodu"
				+"ccion left join fabricaciones on produccion.idfabricaciones = fabricaciones.i"
				+"dfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion"
				+"=fabricaciones.idorden_f left join odc on odc.numoc=ordenfabricacion.numordenfabricacion "
				+"left join pedido on pedido.idodc=odc.idodc left join material on material.idmaterial = "
				+"fabricaciones.idmaterial group by produccion.idproduccion) as inquery where inquery.porabastecer>0",
				function(err, ped){
					if(err)
						console.log("Error Selecting : %s", err);
    				
    				res.render('abast/sol_odc', {largo: ped.length});

				});
		});
    }
	else{res.redirect('bad_login');}	
});

router.get('/bom_sol_uni_page/:page', function(req, res, next) {
	if(verificar(req.session.userData)){
		var pagina = req.params.page-1;
		pagina = pagina*15;
		console.log(pagina);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			/*connection.query("select ordenfabricacion.numordenfabricacion ,group_concat(material.idmaterial separator '@') as idmaterial, group_concat(material.detalle separator '@') as detalle, group_concat(fabricaciones.resta"
				+"ntes separator '@') as cant_ped, group_concat(fabricaciones.f_entrega separator '@') as fecha, group_concat(fabricaciones.idfabricaciones separator '@') as idfabs from fabricaciones left join ordenfabricacion on fabricaciones.idorden_f=ordenfabricacion.idordenfabricacion"
				+" left join material on material.idmaterial=fabricaciones.idmaterial where fabricaciones.restantes>0 group by ordenfabricacion.idordenfabricacion limit "+pagina+",15",
				function(err, ped){
					if(err)
						console.log("Error Selecting : %s", err);
*/
					connection.query("select * from (select ordenfabricacion.numordenfabricacion,material.idmaterial,"
						+" material.detalle, ordenproduccion.idordenproduccion,produccion.cantidad-produccion.abastecidos as porabastecer"
						+", fabricaciones.f_entrega, produccion.cantidad, produccion.idproduccion from produccion left join "
						+"ordenproduccion on produccion.idordenproduccion = ordenproduccion.idordenprodu"
						+"ccion left join fabricaciones on produccion.idfabricaciones = fabricaciones.i"
						+"dfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion"
						+"=fabricaciones.idorden_f left join odc on odc.numoc=ordenfabricacion.numordenfabricacion "
						+"left join pedido on pedido.idodc=odc.idodc left join material on material.idmaterial = "
						+"fabricaciones.idmaterial group by produccion.idproduccion) as inquery where inquery.porabastecer>0 limit "+pagina+",15",
						function(err, fab){
							if(err)
								console.log("Error Selecting : %s", err);
							res.render('abast/sol_odc_page', {data: fab});

						});

    				
				//});
		});
    }
	else{res.redirect('bad_login');}	
});

router.get('/bom_mat_uni_page/:page', function(req, res, next) {
	if(verificar(req.session.userData)){
		var pagina = req.params.page-1;
		pagina = pagina*15;
		console.log(pagina);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select * from material where material.codigo like 'P%' order by material.detalle limit "+pagina+",15",
				function(err, ped){
					if(err)
						console.log("Error Selecting : %s", err);
    				
    				res.render('abast/bom_all_list', {data: ped, page: pagina});

				});
		});
    }
	else{res.redirect('bad_login');}	
});

router.get('/bom_mat_uni', function(req, res, next) {
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select * from material order by material.detalle"
				,function(err, ped){
					if(err)
						console.log("Error Selecting : %s", err);
    				
    				res.render('abast/bom_all', {largo: ped.length});

				});
		});
    }
	else{res.redirect('bad_login');}	
});

router.post('/data_bom', function(req, res, next) {
	if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var adjuntar;
        if(input.addOCA){
        	adjuntar = input.addOCA;
		}
		else{
			adjuntar = false;
		}
        req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			if(input.cantidad){
				connection.query("select material.codigo,material.idmaterial,material.detalle, group_concat(mat2.detalle separator '@') as d_token, group_concat(mat2.u_medida separator '@') as u_token, group_concat"
							+"(mat2.precio separator '@') p_token, group_concat(bom.cantidad separator '@') as c_token, group_concat(mat2.stock separator '@') as s_token from material"
							+" left join bom on bom.idmaterial_master=material.idmaterial left join (SELECT * FROM material) as "
							+"mat2 on mat2.idmaterial=bom.idmaterial_slave WHERE "+/*mat2.e_abast != '3' AND */" material.idmaterial = ? group by material.idmaterial",
							[input.idmaterial], function(err, semi){
								if(err)
									console.log("Error Selecting : %s", err);

								if(semi.length == 0){
									console.log("SIN BOM");
								}
								res.render('abast/bom_mat', {data: [], cantidad: input.cantidad, semi: semi, idfab: input.idfab, add: adjuntar});
				});
			}
			else{
				connection.query("select material.codigo, material.idmaterial,material.detalle,group_concat(mat2.idmaterial separator '@') as idm_token,group_concat(mat2.stock_i separator '@') si_token,group_concat(mat2.stock_c separator '@') sc_token, group_concat(mat2.codigo separator '@') as cod_token, group_concat(mat2.detalle separator '@') as d_token, group_concat(mat2.u_medida separator '@') as u_token,  group_concat"
							+"(coalesce(mat2.precio,0) separator '@') p_token, group_concat(coalesce(bom.cantidad,0) separator '@') as c_token, group_concat(coalesce(mat2.stock,0) separator '@') as s_token from material"
							+" left join bom on bom.idmaterial_master=material.idmaterial left join (SELECT * FROM material) as "
							+"mat2 on mat2.idmaterial=bom.idmaterial_slave WHERE"+/*mat2.e_abast != '3' AND */" material.idmaterial = ? group by material.idmaterial",
							[input.idmaterial], function(err, semi){
								if(err)
									console.log("Error Selecting : %s", err);

								if(semi.length == 0){
									console.log("SIN BOM");
								}

	        	                res.render('abast/bom_mat_uni', {data: [], semi: semi, add: adjuntar});
				});
			}

		});
    }
	else{res.redirect('bad_login');}	
});

router.post('/abast_ped', function(req, res, next) {
	if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("SELECT * FROM bom WHERE idmaterial_master = ?", [input.idmat],function(err, bomp){
				if(err)
					console.log("Error Selecting : %s", err);

				var query = "UPDATE material SET stock = CASE ";
				var where = "WHERE idmaterial IN (";
				for(var t=0; t < bomp.length; t++){
					query += "WHEN idmaterial = "+bomp[t].idmaterial_slave+" THEN stock - "+(bomp[t].cantidad*input.cant)+" ";
					where += bomp[t].idmaterial_slave+","; 
				}
				query += "ELSE stock END ";
				where = where.substring(0, where.length-1) + ")";
				query = query +  where;
				console.log(query);
				connection.query(query, function(err, bomm){
					if(err)
						console.log("Error Selecting : %s", err);
					connection.query("UPDATE produccion SET abastecidos = abastecidos + "+input.cant+" WHERE idproduccion= ?",
						[input.idfab], function(err, rows){
							if(err)
								console.log("Error Selecting : %s", err);
							
							res.send('ok');			
						});
				});
			});

		});
    }
	else{res.redirect('bad_login');}	
});

router.post('/search_of_sol', function(req, res, next) {
	if(verificar(req.session.userData)){
        var info = JSON.parse(JSON.stringify(req.body)).info;
        console.log(info);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			

			connection.query("select * from (select ordenfabricacion.numordenfabricacion,material.idmaterial,"
						+" material.detalle, ordenproduccion.idordenproduccion, produccion.cantidad-produccion.abastecidos as porabastecer"
						+", fabricaciones.f_entrega, produccion.cantidad, produccion.idproduccion from produccion left join "
						+"ordenproduccion on produccion.idordenproduccion = ordenproduccion.idordenprodu"
						+"ccion left join fabricaciones on produccion.idfabricaciones = fabricaciones.i"
						+"dfabricaciones left join ordenfabricacion on ordenfabricacion.idordenfabricacion"
						+"=fabricaciones.idorden_f left join odc on odc.numoc=ordenfabricacion.numordenfabricacion "
						+"left join pedido on pedido.idodc=odc.idodc left join material on material.idmaterial = "
						+"fabricaciones.idmaterial where produccion.idordenproduccion = ? group by produccion.idproduccion) as inquery where inquery.porabastecer>0",
						[info], function(err, fab){
							
							if(err)
								console.log("Error Selecting : %s", err);
    						
							console.log(fab);
    						res.render('abast/sol_odc_page', {data: fab});
			
			});

				
		});
    }
	else{res.redirect('bad_login');}	
});

router.post('/search_bom', function(req, res, next) {
	if(verificar(req.session.userData)){
        var info = JSON.parse(JSON.stringify(req.body)).info;
        console.log(info);
        var list_input = info.split(' ');
        info = '';
        for (var i = 0; i < list_input.length; i++){
            info += "(material.detalle LIKE '%" + list_input[i] +"%' OR material.codigo LIKE '%"+ list_input[i] +"%')";
            if (i !== list_input.length - 1){
                info += ' AND ';
            }
        }
        console.log(info);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select * from material where ("+info+") and material.tipo='P' order by material.detalle",
			function(err, mat){
				if(err)
					console.log("Error Selecting : %s", err);


				console.log(mat);
				res.render('abast/bom_all_list', {data: mat});
			});
 
		});
    }
	else{res.redirect('bad_login');}	
});

router.get('/abast_myself', function(req, res, next) {
	if(verificar(req.session.userData)){
		
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Selecting : %s", err);
			connection.query(
				"select ordenfabricacion.*, sum(fabricaciones.cantidad) as cantidad, sum(fabricaciones.restantes) "
				+"as restantes,(sum(fabricaciones.restantes)/sum(fabricaciones.cantidad))*100 as porcentaje from fabricaciones"
				+" left join material on material.idmaterial=fabricaciones.idmaterial left join bom on bom.idmaterial_master=material.idmaterial"
				+" left join ordenfabricacion on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f where fabricaciones.cantidad - fabricaciones.restantes > 0 group by fabricaciones.idorden_f ORDER BY ordenfabricacion.idordenfabricacion DESC",
				function(err, ins){
					if(err)
						console.log("Error Selecting : %s", err);

					connection.query("select subcuenta from material where subcuenta!=null or subcuenta!='' group by subcuenta", function(err, subc){
						if(err)
							console.log("Error Selecting : %s", err);					
						connection.query("select " +
							"material.*,coalesce(caracteristica.cnom,'Sin Característica') as cnom from material " +
							"left join caracteristica on caracteristica.idcaracteristica = SUBSTRING(material.codigo, 4, 2) " +
							"where codigo like 'C%' or codigo like 'M%' or codigo like 'I%' or codigo like 'O%'", function(err, mats){
                            if(err)
                                console.log("Error Selecting : %s", err);
							connection.query("SELECT idoda FROM oda WHERE idoda=(SELECT max(idoda) FROM oda)", function(err, id){
								if(err)
									console.log("Error Selecting : %s", err);
								if(id.length){
									id[0].numoda = id[0].numoda+1;
									res.render('abast/lanzar_oc', {last: id[0].numoda, ofs: ins, subc: subc, mats: mats});
								}
								else{
									res.render('abast/lanzar_oc', {last: 1, ofs: ins, subc: subc, mats: mats});
								}
							});
                        });

					});
			});
		});
	}
	else{res.redirect('bad_login');}	
});

router.get('/get_insumos_of/:idof', function(req, res, next) {
	if(verificar(req.session.userData)){
		var idof = req.params.idof;
		console.log(idof);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Selecting : %s", err);
			connection.query("select peticion.idordenfabricacion,peticion.idmaterial,sum(peticion.cantidad) as cantidad,sum(peticion.sinenviar) as sinenviar,peticion.detalle,peticion.u_medida,peticion.tipo,peticion.stock from (select ordenfabricacion.idordenfabricacion,fabricaciones.cantidad-fabricaciones.restantes"
				+" as sinenviar,bom.cantidad,material.detalle,bom.idmaterial_slave as idmaterial,material.u_medida,material.tipo,material.stock from fabricaciones"
				+" left join bom on bom.idmaterial_master=fabricaciones.idmaterial left join material on "
				+"material.idmaterial=bom.idmaterial_slave left join ordenfabricacion on ordenfabricacion.idordenfabricacion"
				+" = fabricaciones.idorden_f where fabricaciones.cantidad-fabricaciones.restantes>0 and fabricaciones.idorden_f = ?) as peticion GROUP BY peticion.idmaterial",[idof],
				function(err, ins){
					if(err){
						console.log("Error Selecting : %s", err);
					}
					console.log(ins);
					res.render('abast/table_insumos_of', {ins: ins});
				});
		});
	}
	else{res.redirect('bad_login');}	
});

router.get('/stock_matp', function(req, res, next) {
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			connection.query("select material.idmaterial as idmatpri, detalle"
				+" as descripcion, stock,stock_i,stock_c, u_medida,precio as costoxu, codigo, cliente.sigla"
				+" from material left join recurso on recurso.idmaterial=material.idmaterial left join cliente on cliente.idcliente=recurso.cod_proveedor " +
				"where codigo like 'I%' or codigo like 'M%' or codigo like 'O%' or codigo like 'C%' or codigo like 'S%' or material.show_abast",
				 function(err, mat){
				if(err)
					console.log("Error Selecting : %s", err);
				//console.log(mat); 
    			res.render('abast/stock_matp', {mat: mat});
			});
		});
    }
	else{res.redirect('bad_login');}	
});

/*router.get('/set_recursos', function(req, res, next) {
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			connection.query("select idmaterial as idmatpri, detalle"
				+" as descripcion, stock, u_medida,precio as costoxu, codigo"
				+" from material where tipo = 'I' or tipo= 'M' or tipo= 'S'",
				 function(err, mat){
				if(err)
					console.log("Error Selecting : %s", err);
				var array = [];
				for(var e=0; e < mat.length; e++){
					array.push([mat[e].idmatpri]);
				}
				connection.query("INSERT INTO recurso (idmaterial) VALUES ?",[array], function(err, inRec){
					if(err)
						console.log("Error Selecting : %s", err);
					console.log(inRec);
					console.log("Recurso ingresados");	
				});
    			//res.render('abast/stock_matp', {mat: mat});
			});
		});
    }
	else{res.redirect('bad_login');}	
});*/

// Stream lanzar pedido cliente
router.post('/buscar_matp', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        list_input = input.det.split(' ');
        input.det = "WHERE ";
        //var wher = "WHERE (material.tipo = 'I' OR material.tipo='M') AND material.detalle LIKE ?";
        for (var i = 0; i < list_input.length; i++){
            input.det += "material.detalle LIKE '%" + list_input[i] +"%'";
            if (i !== list_input.length - 1){
                input.det += ' AND ';
            }
		}
        if(input.prod == 'false'){
        	input.det += " AND material.tipo != 'P' AND material.tipo != 'S'";
        }
        req.getConnection(function(err,connection){
            connection.query("SELECT material.*,caracteristica.cnom,producido.idproducto as idproducido,producto.idproducto,otro.idproducto AS idotro,GROUP_CONCAT(aleacion.nom,'@@',subaleacion.subnom) as alea_token FROM material " +
                "LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica LEFT JOIN producido ON producido.idmaterial = material.idmaterial" +
                " LEFT JOIN producto ON producto.idmaterial = material.idmaterial LEFT JOIN otro ON otro.idmaterial = material.idmaterial LEFT JOIN subaleacion ON producido.idsubaleacion = subaleacion.idsubaleacion" +
                " LEFT JOIN aleacion ON aleacion.idaleacion = subaleacion.idaleacion " + input.det +" GROUP BY material.detalle",function(err,rows)
            {
                if(err)
                    console.log("Error Selecting : %s ",err );
                /*console.log("SELECT material.*,caracteristica.cnom,producido.pdf,aleacion.nom,producido.idproducto as idprod,subaleacion.subnom FROM material LEFT JOIN producido ON material.idmaterial = producido.idmaterial" +
                " LEFT JOIN subaleacion ON subaleacion.idsubaleacion = producido.idsubaleacion LEFT JOIN aleacion ON subaleacion.idaleacion = aleacion.idaleacion" +
                " LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica " + wher + " GROUP BY producido.idproducto");*/
                res.render('abast/preped_stream',{data:rows},function(err,html){if(err)console.log(err);res.send(html)});

            });
            //console.log(query.sql);
        });
    } else res.redirect("/bad_login");

});

router.post('/saveStateODABD', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
    console.log(data);
    //var token = data['nroordenfabricacion']+"@";
    var token = data['money']+"@"+data['dest']+"@"+data['plae']+"@"+data['pag']+"@"+data['entr']+"@"+data['obs']+"@"+data['desc']+"@"+data['prov[]']+"@";
    if(data["idm[]"]){
        if(typeof data['idm[]'] == "string"){
            token += data['idm[]']+","+data['cants[]']+","+data['costo[]']+","+data['ex_iva[]']+"@";
        }
        else{
            for(var e=0; e < data['idm[]'].length; e++){
                token += data['idm[]'][e]+","+data['cants[]'][e]+","+data['costo[]'][e]+","+data['ex_iva[]'][e]+"@";
            }
        }
    }
    token = token.substring(0, token.length-1);
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Connection : %s", err);

        //INSERT INTO `siderval`.`save` (`token`) VALUES ('DDQWD');
        if(data.plantilla == 'false'){
            console.log("GUARDANDO ESTADO");
            connection.query("INSERT INTO save (llave,token) VALUES ?",[[['oda',token]]], function(err, inSave){
                if(err)
                    console.log("Error Insert : %s", err);
                res.send('ok');
            });
		}
		else if(data.plantilla == 'true'){
			console.log("GUARDANDO COMO PLANTILLA");
            connection.query("INSERT INTO plantilla (nombre, llave,token) VALUES ?",[[[data.namePlant, 'oda',token]]], function(err, inSave){
                if(err)
                    console.log("Error Insert : %s", err);
                res.send('ok');
            });
        }

    });

});
router.post('/loadStateODABD', function(req,res,next){
    var data = JSON.parse(JSON.stringify(req.body));
	console.log(data);
	var query;
	if(data.plantilla == 'true'){
		console.log("Abriendo Plantilla");
		query = "select plantilla.* from plantilla where idplant = "+data.idplant;
	}
	else{
        console.log("Abriendo Estado");
		query = "select save.* from save inner join (SELECT max(idsave) as ids, max(ult_save) as last_save FROM save where llave = 'oda' group by save.llave) as ult on ult.ids = save.idsave";
	}
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s",err);
        connection.query(query, function(err,estado){
            if(err)
                console.log("Error Selecting : %s", err);
            var token = estado[0].token;
            var datos;
            if(token.split('@').length > 8){
                console.log("Con productos");
                token = token.split('@');
                datos = { 
                    money: token[0],
                    cuent: token[1],
                    dest: token[2],
                    plae: token[4],
                    pag: token[3],
                    entr: token[6],
                    obs: token[5],
                    desc: token[7],
                    prov: token[8],  
                    'idm[]': [],
                    'cants[]': [],
                    'costo[]': [],
                    'ex_iva[]': []
                };
                for(var r=8; r < token.length; r++){
                    datos['idm[]'].push(token[r].split(',')[0]);
                    datos['cants[]'].push(token[r].split(',')[1]);
                    datos['costo[]'].push(token[r].split(',')[2]);
                    datos['ex_iva[]'].push(token[r].split(',')[3]);
                }
                datos['dets[]'] = [];
                datos['u_compra[]'] = [];
                datos['u_med[]'] = [];
                datos['subcuenta[]'] = [];
                var query_producto = "";
                for(var u=0; u<datos['idm[]'].length; u++){
                    if(u == 0){
                    	query_producto = "SELECT coalesce(concat(cuenta.subcuenta,'-',material.subcuenta,'-',coalesce(subcuenta.detalle,cuenta.detalle)),'N.D.') as cc,material.* FROM material left join cuenta on substring(cuenta.subcuenta,1,2) = substring(material.subcuenta,1,2) left join subcuenta on subcuenta.subcuenta=material.subcuenta ";
                    	query_producto += " WHERE material.idmaterial = "+datos['idm[]'][u];
                    }
                    else{
                    	query_producto += " OR material.idmaterial = "+datos['idm[]'][u];
                    }
                    datos['dets[]'].push('');
                    datos['u_compra[]'].push('');
                    datos['u_med[]'].push('');
                    datos['subcuenta[]'].push('');                    
                }
                connection.query(query_producto, function(err, productos){
                            if(err)
                                console.log("Error Selecting : %s", err);
                            
                            if(productos){
                                for(var y=0; y < productos.length; y++){
                                    for(var t=0; t < datos['idm[]'].length; t++){
                                        if(datos['idm[]'][t] == productos[y].idmaterial){
                                            datos['dets[]'][t] = productos[y].detalle;
                                            datos['u_compra[]'][t] = productos[y].u_compra;
                                            datos['u_med[]'][t] = productos[y].u_medida;
                                            datos['subcuenta[]'][t] = productos[y].cc;
                                            break;
                                        }
                                    }
                                }
                            }
                            connection.query("SELECT idoda FROM oda WHERE idoda=(SELECT max(idoda) FROM oda)", function(err, last){
                                if(err)
                                    console.log("Error Selecting : %s", err);
                                
                                var numero;
                                if(last.length > 0){
				                    numero = last[0].idoda+1;
			                    }
			                    else{
				                    numero = 1;
			                    	
			                    }
								res.render('abast/formoda_state',{data: datos, last: numero});
                                
                            });
                        });
             
            }
            else{
                console.log("Sin productos");
                datos = {
                	money: '',
					cuent: '',
					dest: '',
					plae: '',
					pag:  '',
					entr: '',
					prov: '',
					obs:  '',
					desc: ''
                };
                connection.query("SELECT idoda FROM oda WHERE idoda=(SELECT max(idoda) FROM oda)", function(err, last){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    
                   var numero;
                   if(last.length > 0){
				       numero = last[0].idoda+1;
			       }
			       else{
				       numero = 1;
			       	
			       }
			       console.log(numero);
                    res.render('abast/formoda_state',{data: datos, last: numero});
                    
                });    
            }
        }); 
    });
});

router.get('/show_plantillas', function(req,res,next){
    req.getConnection(function(err, connection){
        if(err)
            console.log("Error Selecting : %s",err);
        connection.query("SELECT idplant,nombre,ult_save FROM plantilla", function(err,plantillas){
            if(err)
                console.log("Error Selecting : %s", err);
			console.log(plantillas);
            res.render('abast/plantillas_list', {plant: plantillas});
        });
    });
});

router.post('/addsession_prepeds', function(req, res, next){
    if(verificar(req.session.userData)){
    	console.log(req.body);
        req.getConnection(function(err, connection){
            connection.query("SELECT material.detalle, material.u_medida,caracteristica.cnom,material.u_compra,sub_ccontable.idsub as idsub ,material.ccontable,sub_ccontable.idccontable, sub_ccontable.nombre as cuentadetalle,sub_ccontable.nombre as subc,coalesce(concat(sub_ccontable.idccontable,' ',sub_ccontable.nombre),'N.D.') as cc FROM material LEFT JOIN caracteristica ON caracteristica.idcaracteristica = material.caracteristica LEFT JOIN sub_ccontable ON sub_ccontable.idccontable = material.ccontable WHERE material.idmaterial = ?",
                [req.body.idm],function(err, details){
                    if(err){
                    	console.log("Error Selecting : %s", err);
                    }
                    if(req.body.cant){
                    	if(details[0].idccontable == null || details[0].idccontable == ''){
                    		res.send("<tr>" +
									"<td style='aling-content: center' class='td-ex'><input type='checkbox' name='ex_iva' class='ex_iva' onchange='refreshAllCost()'></td>" +
									"<td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'></td>" +
									"<td data-toggle='tooltip' title='Unidad de Compra' style='text-align: center'><h6 style='margin:0; text-aling: center;'><span class='label label-default'>"+details[0].u_compra+" "+ details[0].u_medida + "</span></h6></td>" +
									"<td style='display: flex' class='td-cant'><input class='form-control cant_compra' type='float' name='cants' onkeyup='refreshAllCost()' step='"+details[0].u_compra+"' onchange='refreshAllCost()' value='"+req.body.cant+"' min='"+details[0].u_compra+"' required></td>" +
									"<td class='td-money'><input class='form-control moneda key_money' type='float' name='costo' onkeyup='refreshAllCost()'  onchange='refreshAllCost()' min='0'></td>" +
									"<td class='costo-total'></td>" +
									"<td><input type='hidden' name='centroc' id='centroc"+req.body.items+"'><a class='setCC' onclick='selectCC(this)' data-toggle='modal' data-target='#ccModal'>N.D.</a></td>" +
									"<td><a onclick='drop(this)' class='btn btn-xs btn-danger'><i class='fa fa-remove'></i></a></td>" +
								"</tr>");
                    	}
                    	else{
                    		res.send("<tr>" +
									"<td style='aling-content: center' class='td-ex'><input type='checkbox' name='ex_iva' class='ex_iva' onchange='refreshAllCost()'></td>" +
									"<td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'></td>" +
									"<td data-toggle='tooltip' title='Unidad de Compra' style='text-align: center'><h6 style='margin:0; text-aling: center;'><span class='label label-default'>"+details[0].u_compra+" "+ details[0].u_medida + "</span></h6></td>" +
									"<td style='display: flex' class='td-cant'><input class='form-control cant_compra' type='float' name='cants' onkeyup='refreshAllCost()' step='"+details[0].u_compra+"' onchange='refreshAllCost()' value='"+req.body.cant+"' min='"+details[0].u_compra+"' required></td>" +
									"<td class='td-money'><input class='form-control moneda key_money' type='float' name='costo' onkeyup='refreshAllCost()'  onchange='refreshAllCost()' min='0'></td>" +
									"<td class='costo-total'></td>" +
									"<td><input type='hidden' name='centroc' id='centroc"+req.body.items+"' value='"+details[0].idsub+"'><a class='setCC' onclick='selectCC(this)' data-toggle='modal' data-target='#ccModal'>"+details[0].cc+"</a></td>" +
									"<td><a onclick='drop(this)' class='btn btn-xs btn-danger'><i class='fa fa-remove'></i></a></td>" +
								"</tr>");
                    	}
                    }
                    else{
                    	if(details[0].idccontable == null || details[0].idccontable == ''){
                    		res.send("<tr>" +
									"<td style='aling-content: center' class='td-ex'><input type='checkbox' name='ex_iva' class='ex_iva' onchange='refreshAllCost()'></td>" +
									"<td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'></td>" +
									"<td data-toggle='tooltip' title='Unidad de Compra' style='text-align: center'><h6 style='margin:0; text-aling: center;'><span class='label label-default'>"+details[0].u_compra+" "+ details[0].u_medida + "</span></h6></td>" +
									"<td style='display: flex' class='td-cant'><input class='form-control cant_compra' type='float' name='cants' min='"+details[0].u_compra+"' onkeyup='refreshAllCost()' onchange='refreshAllCost()' step='"+details[0].u_compra+"' required></td>" +
									"<td class='td-money'><input class='form-control moneda key_money' type='float' name='costo' onkeyup='refreshAllCost()' onchange='refreshAllCost()' min='0'></td>" +
									"<td class='costo-total'></td>" +
									"<td><input type='hidden' name='centroc' id='centroc"+req.body.items+"'><a class='setCC' onclick='selectCC(this)' data-toggle='modal' data-target='#ccModal'>N.D.</a></td>" +
									"<td><a onclick='drop(this)' class='btn btn-xs btn-danger'><i class='fa fa-remove'></i></a></td>" +
								"</tr>");
                    	}
                    	else{
                    		res.send("<tr>" +
									"<td style='aling-content: center' class='td-ex'><input type='checkbox' name='ex_iva' class='ex_iva' onchange='refreshAllCost()'></td>" +
									"<td>" + details[0].detalle + "<input type='hidden' name='idm' value='" + req.body.idm +"'></td>" +
									"<td data-toggle='tooltip' title='Unidad de Compra' style='text-align: center'><h6 style='margin:0; text-aling: center;'><span class='label label-default'>"+details[0].u_compra+" "+ details[0].u_medida + "</span></h6></td>" +
									"<td style='display: flex' class='td-cant'><input class='form-control cant_compra' type='float' name='cants' min='"+details[0].u_compra+"' onkeyup='refreshAllCost()' onchange='refreshAllCost()' step='"+details[0].u_compra+"' required></td>" +
									"<td class='td-money'><input class='form-control moneda key_money' type='float' name='costo' onkeyup='refreshAllCost()' onchange='refreshAllCost()' min='0'></td>" +
									"<td class='costo-total'></td>" +
									"<td><input type='hidden' name='centroc' id='centroc"+req.body.items+"' value='"+details[0].idsub+"'><a class='setCC' onclick='selectCC(this)' data-toggle='modal' data-target='#ccModal'>"+details[0].cc+"</a></td>" +
									"<td><a onclick='drop(this)' class='btn btn-xs btn-danger'><i class='fa fa-remove'></i></a></td>" +
								"</tr>");
                    	}
                    }
                });
        });
    } else res.redirect("/bad_login");

});
router.get('/found_subcuentas/:idcuenta', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT * FROM cuenta WHERE cuenta.cuenta = ?",
                [req.params.idcuenta],function(err, cuenta){
                    if(err){console.log("Error Selecting : %s", err);}

                    console.log(cuenta);
                    if(cuenta[0].subcuenta != ''){
	                    connection.query("SELECT coalesce(concat(cuenta.cuenta,'-',subcuenta.subcuenta,'-',coalesce(subcuenta.detalle,cuenta.detalle)),'N.D.') as cc,subcuenta.* FROM subcuenta LEFT JOIN cuenta ON substring(cuenta.subcuenta,1,2) = substring(subcuenta.subcuenta,1,2) WHERE subcuenta.subcuenta  LIKE '"+cuenta[0].subcuenta.substring(0,2)+"%' AND cuenta.cuenta = '"+cuenta[0].cuenta+"'", function(err, subcuenta){
	                    	if(err){console.log("Error Selecting : %s", err);}
	                    	console.log(subcuenta);
	                    	res.render('abast/option_select_sc', {subc: subcuenta});
	                    });
                    }
                    else{
                    	res.send('notsc');
                    }
                });
        });
    } else res.redirect("/bad_login");

});

router.post('/crear_oda', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var array=[];
        if(input.desc == '' || input.desc == undefined){
        	input.desc = 0;
        }
        if(input.exento == undefined){
        	input.exento = 'off';
        }
        var token = input.obs+"@"+input.dest+"@"+input.plae+"@"+input.pag+"@"+input.entr+"@"+input.cuent+"@"+input.money+"@"+input.exento+"@"+input.desc;
        var idprov = input['prov[]'].split(' - ')[0];
        req.getConnection(function(err,connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	//SE LANZA ODC CON CLIENTE SIDERVAL
        	connection.query("INSERT INTO oda (numoda, idproveedor, tokenoda) VALUES (?,?,?)", [input.nroordenfabricacion, idprov, token], 
        		function(err, odc){
        			if(err)
        				console.log("Error Selecting : %s", err);
        			
        			if(Array.isArray(input['idm[]']) ){
	        			for(var e=0; e < input['idm[]'].length; e++){
	        				if(input['ex_iva[]'][e] == 'off'){
	        					array.push([odc.insertId,input['idm[]'][e],parseFloat(input['cants[]'][e]), parseFloat(input['costo[]'][e].replace(',','.')),false, input['centroc[]'][e]]);
	        				}
	        				else{
	        					array.push([odc.insertId,input['idm[]'][e],parseFloat(input['cants[]'][e]), parseFloat(input['costo[]'][e].replace(',','.')),true, input['centroc[]'][e]]);
	        				}
	        			}
        			}
        			else{
        				if(input['ex_iva[]'] == 'off'){
		        			array.push([odc.insertId,input['idm[]'],parseFloat(input['cants[]']),parseFloat(input['costo[]'].replace(',','.')), false, input['centroc[]']]);
        				}
        				else{
	        				array.push([odc.insertId,input['idm[]'],parseFloat(input['cants[]']),parseFloat(input['costo[]'].replace(',','.')), true, input['centroc[]']]);
        				}
        			}
        			console.log(array);
        			connection.query("INSERT INTO abastecimiento (idoda, idmaterial, cantidad, costo, exento, cc) VALUES ?", [array], function(err, ped){
        				if(err){
        					console.log("Error Selecting : %s", err);
        					res.send('error');
        				}
        				else{
        					res.send(odc.insertId+'');
        					//res.redirect('/abastecimiento/abast_myself');
        				}
        			});
        		});
        });
      	
    } else res.redirect("/bad_login");
});

router.post('/tbody_bom', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));

        req.getConnection(function(err,connection){

        	if(err){
        		console.log("Error Connection : %s", err);
        	}
        	connection.query("select material.codigo,material.idmaterial,material.detalle, group_concat(mat2.detalle separator '@') as d_token,group_concat(mat2.u_medida separator '@') as u_token, group_concat"
							+"(mat2.precio separator '@') p_token, group_concat(bom.cantidad separator '@') as c_token, group_concat(mat2.stock separator '@') as s_token from material"
							+" left join bom on bom.idmaterial_master=material.idmaterial left join (SELECT * FROM material) as "
							+"mat2 on mat2.idmaterial=bom.idmaterial_slave where material.idmaterial = ? group by material.idmaterial",
							[input.idmat] , 
        					function(err, bomtable){
        			if(err){
        				console.log("Error Selecting : %s", err);
        			}

        			console.log(bomtable);	
        			res.render('abast/table_bom', {semi: bomtable, cantidad: input.cant});

        		});
        });
      	
    } else res.redirect("/bad_login");
});

router.get('/notif_abast', function(req, res, next){
        req.getConnection(function(err,connection){
        	if(err){
        		console.log("Error Connection : %s", err);
        	}
        	connection.query("SELECT notificacion.*, odc.numoc FROM notificacion left join odc on odc.idodc = substring_index(substring_index(descripcion, '@', 2),'@',-1) WHERE (descripcion LIKE 'aoc@%' AND active = true) OR (descripcion LIKE 'aof@%' AND active = true)", 
        					function(err, notif){
        			if(err){
        				console.log("Error Selecting : %s", err);
        			}
        			res.render('abast/notificaciones', {notif: notif});

        		});
        });
});

router.get('/drop_notifof/:idnotif', function(req, res, next){
        req.getConnection(function(err,connection){
        	if(err){
        		console.log("Error Connection : %s", err);
        	}
        	connection.query("UPDATE notificacion SET active = false WHERE idnotificacion = ?",[req.params.idnotif], 
        					function(err, notif){
        			if(err){
        				console.log("Error Selecting : %s", err);
        			}
        			//res.render('abast/notificaciones', {notif: notif});
        			res.redirect('/abastecimiento/notif_abast');
        		});
        });
});

router.get('/rec_odc', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select oda.numoda,oda.creacion,oda.idoda,cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat,"
        		+" group_concat(material.detalle separator '@') as matd, group_concat(material.u_medida) as umed,"
        		+"group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant, group_concat(abastecimiento.recibidos) as reci from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material"
        		+" on abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente=oda.idproveedor "+/*where abastecimiento.cantidad>abastecimiento.recibidos*/"group by oda.idoda",
        		function(err, odc){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		connection.query("select oda.numoda,oda.creacion,oda.idoda,cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat,"
        		+" group_concat(material.detalle separator '@') as matd, group_concat(material.u_medida) as umed,"
        		+"group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant, group_concat(abastecimiento.recibidos) as reci from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material"
        		+" on abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente=oda.idproveedor where abastecimiento.cantidad=abastecimiento.recibidos group by oda.idoda",
	        		function(err, odc2){
	        		if(err)
	        			console.log("Error Selecting : %s", err);
	        		

        			res.render('abast/recieved_ped', {largo: odc.length, largo2: odc2.length});
        		});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/rec_odc_page/:page', function(req, res, next){
    if(verificar(req.session.userData)){
		var pagina = req.params.page-1;
		pagina = pagina*15;
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select oda.numoda,abastecimiento.cantidad>abastecimiento.recibidos as incompleta_rec, oda.creacion,oda.idoda,oda.tokenoda,cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat,"
        		+" group_concat(material.detalle separator '@') as matd, group_concat(coalesce(material.u_medida, 'und') ) as umed,"
        		+"group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant, group_concat(abastecimiento.recibidos) as reci, group_concat(abastecimiento.costo) as cost,min(abastecimiento.facturado) as full_facturado from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material"
        		+" on abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente=oda.idproveedor"+/* where abastecimiento.cantidad>abastecimiento.recibidos*/" group by oda.idoda order by oda.idoda desc limit "+pagina+",15",
        		function(err, odc){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		res.render('abast/recieved_ped_page', {data: odc, recepcionar: true});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/view_odc_page/:page', function(req, res, next){
    if(verificar(req.session.userData)){
		var pagina = req.params.page-1;
		pagina = pagina*15;
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select oda.numoda,oda.creacion,oda.idoda,oda.numfac,oda.tokenoda,cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat,"
        		+" group_concat(material.detalle separator '@') as matd, group_concat(coalesce(material.u_medida, 'und') ) as umed,"
        		+"group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant, group_concat(abastecimiento.recibidos) as reci, group_concat(abastecimiento.costo) as cost from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material"
        		+" on abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente=oda.idproveedor where abastecimiento.cantidad=abastecimiento.recibidos group by oda.idoda order by oda.idoda desc limit "+pagina+",15",
        		function(err, odc){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		
        		res.render('abast/recieved_ped_page', {data: odc, recepcionar: false});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/fact_view', function(req, res, next){
    if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select cliente.sigla, cliente.razon,oda.numoda, factura.* from factura left join oda on oda.idoda = factura.idoda left join cliente on cliente.idcliente = oda.idproveedor",
			 function(err, facts){
			 	if(err)
				 	console.log("Error Selecting : %s", err);
			 	
			 	connection.query("select factura.*,factura.numfac as numFactura, oda.*, facturacion.*, material.detalle, cliente.* from facturacion left join factura on factura.idfactura = facturacion.idfactura left join abastecimiento on facturacion.idabast=abastecimiento.idabast left join material on material.idmaterial=abastecimiento.idmaterial left join oda on oda.idoda=factura.idoda left join cliente on cliente.idcliente=oda.idproveedor",
					function(err, tableFact){
						if(err)
				 			console.log("Error Selecting : %s", err);
					
						console.log(tableFact);
						res.render('abast/factura_view', {data: facts, fact: tableFact});
				});
			});
		});
    } else res.redirect("/bad_login");
});

router.get('/info_view', function(req, res, next){
    if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("SELECT * FROM abastecimiento LEFT JOIN oda ON oda.idoda=abastecimiento.idoda LEFT JOIN material ON material.idmaterial=abastecimiento.idmaterial LEFT JOIN cliente ON oda.idproveedor=cliente.idcliente",
			 function(err, info){
			 	if(err)
				 	console.log("Error Selecting : %s", err);
				console.log(info);
				res.render('abast/general_info_view', {data: info});
			});
		});
    } else res.redirect("/bad_login");
});

router.post('/search_fact', function(req, res, next){
    if(verificar(req.session.userData)){
		var num = JSON.parse(JSON.stringify(req.body)).info;
        console.log(num);
        req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select cliente.sigla, cliente.razon, oda.numoda, factura.* from factura left join oda on oda.idoda = factura.idoda left join cliente on cliente.idcliente = oda.idproveedor where factura.numfac LIKE '%"+num+"%' OR oda.numoda LIKE '%"+num+"%'",
			 function(err, facts){
			 	if(err)
			 		console.log("Error Selecting : %s", err);
				console.log(facts);
				res.render('abast/factura_item_view', {data: facts});
			});
		});
        	
    } else res.redirect("/bad_login");
});

router.get('/fact_info_view/:idfactura', function(req, res, next){
    if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select factura.numfac, facturacion.*,abastecimiento.costo as odacosto, material.detalle from facturacion left join factura on factura.idfactura = facturacion.idfactura left join oda on oda.idoda = factura.idoda left join abastecimiento on abastecimiento.idabast = facturacion.idabast left join material on material.idmaterial = abastecimiento.idmaterial where factura.idfactura = ?",
				[req.params.idfactura],
			 function(err, facts){
			 	if(err)
			 		console.log("Error Selecting : %s", err);
				connection.query("select substring_index(substring_index(oda.tokenoda,'@',7),'@', -1) as mon from factura left join oda on oda.idoda = factura.idoda where factura.idfactura = ?",
				[req.params.idfactura],
					 function(err, money){
					 	if(err)
					 		console.log("Error Selecting : %s", err);	

					res.render('abast/factura_info', {data: facts, mon: money[0].mon});
				});
			});
		});
    } else res.redirect("/bad_login");
});
// Renderizar modal para registrar factura a una OCA
router.post('/get_table_fact', function(req, res, next){
    if(verificar(req.session.userData)){
        var idoda = JSON.parse(JSON.stringify(req.body)).idoda;
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	// Se consigue cada fila de la OCA, acompaada del nombre del material de cada fila y la cantidad ya facturada por fila, además de la razón
        	connection.query("select abastecimiento.idabast,oda.idoda,cliente.sigla,cliente.razon, material.detalle, abastecimiento.cantidad,"
        		+" abastecimiento.costo,abastecimiento.recibidos, abastecimiento.costo*(abastecimiento.cantidad - SUM(COALESCE(facturacion.cantidad,0))) as odacosto,"
        		+" oda.tokenoda,SUM(COALESCE(facturacion.cantidad,0)) AS facturados from abastecimiento left join oda on oda.idoda=abastecimiento.idoda"
        		+" left join material on material.idmaterial=abastecimiento.idmaterial left join cliente on cliente.idcliente=oda.idproveedor" +
				" LEFT JOIN facturacion ON abastecimiento.idabast = facturacion.idabast WHERE abastecimiento.idoda = ? GROUP BY abastecimiento.idabast",[idoda],
        		function(err, oda){
        		if(err)
        			console.log("Error Selecting : %s", err);


        		//console.log(oda);
        		var isfacturable = false;
        		if(oda.length){
        			console.log("NOT EMPTY");
        			// Se revisa si existen 'filas' de la OCA que aún no hayan sido facturados
        			for(var i =0;i<oda.length;i++){
        				if(oda[i].cantidad > oda[i].facturados){
        					isfacturable = true;
        					break;
						}
					}
                    res.render('abast/table_factura', {oda: oda},function(err,html){
                        if(err) console.log(err);
                        res.send({html:html,isfacturable: isfacturable})
                    });
				} else {
        			console.log('EMPTY');
                    res.render('abast/table_factura', {oda: []},function(err,html){
                        if(err) console.log(err);
                        res.send({html:html,isfacturable: isfacturable})
                    });
				}
        	});
        });
    } else res.send({isfacturbale: false, err_msg: "MALDITO HACKER, BASTA"});
});
// Controlador que Guarda la factura en la bdd
router.post('/save_factura', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var fact = [];
        var items = [];
        var receps = [];
        console.log(input);
        if(typeof input['idabast[]'] == 'string' && input['costo_unid[]'] != '0' && input['costo_unid[]'] != '' && input['cantidad[]'] != '0'){
            items.push([input['costo_unid[]'], input['moneda-factura[]'], input['idabast[]'], input['cantidad[]']]);
            if(input['recepcion[]'] == 'true' && input['maxrec[]'] != '0'){
            	receps.push([input['idabast[]'], Math.min(parseInt(input['cantidad[]']),parseInt(input['maxrec[]']))]);
			}
        } else{
            for (var i = 0; i < input['idabast[]'].length; i++){
                if(input['costo_unid[]'][i] != '0' && input['costo_unid[]'][i] != '' && input['cantidad[]'][i] != '0'){
                    items.push([input['costo_unid[]'][i], input['moneda-factura[]'][i], input['idabast[]'][i], input['cantidad[]'][i]]);
                    if(input['recepcion[]'][i] == 'true' && input['maxrec[]'][i] != '0'){
                        receps.push([input['idabast[]'][i], Math.min(parseInt(input['cantidad[]'][i]),parseInt(input['maxrec[]'][i]))]);
                    }
                }
            }
        }
        console.log(receps);
        fact.push([input['fecha-facturacion'], input['numeroFactura'], input['idoda'], input['comentario']]);
        if(items.length){
			req.getConnection(function(err, connection){
				if(err)
					console.log("Error Connection : %s", err);
				connection.query("INSERT INTO factura (fecha, numfac, idoda, coment) VALUES ?", [fact], function(err, inFact){
					if(err)
						console.log("Error Insert : %s", err);
					if(typeof input['idabast[]'] == 'string'){
						items[0].unshift(inFact.insertId);
					} else {
						items.map(function(item){
							item.unshift(inFact.insertId);
							return items
						});
					}
					//console.log(items);
					connection.query("INSERT INTO facturacion (idfactura, costo, moneda, idabast, cantidad) VALUES ?", [items], function(err, fact){
						if(err) console.log("Error Insert : %s", err);
	/*					UPDATE `table` SET `uid` = CASE
							WHEN id = 1 THEN 2952
							WHEN id = 2 THEN 4925
							WHEN id = 3 THEN 1592
							ELSE `uid`
							END
						WHERE id  in (1,2,3)*/
						/* Actualizar precio de cada material facturado */
						var where_idabast = " WHERE abastecimiento.idabast IN (";
						for(var i=0; i<items.length; i++){
							where_idabast += items[i][3];
							if(i+1 != items.length){
								where_idabast += ", ";
							}
						}
						where_idabast += ")";
						// Query para obtener los idmaterial
						connection.query("SELECT abastecimiento.* FROM abastecimiento" + where_idabast, function(err,row){
							if(err) console.log("Error Select : %s", err);
							update_material = "UPDATE material SET precio = CASE";
							where_material = " ELSE precio END WHERE idmaterial in (";
							for(var i=0; i<row.length; i++){
								for(var j=0; j<items.length; j++){
									if(items[j][3] == row[i].idabast){
										update_material += " WHEN idmaterial = " + row[i].idmaterial + " THEN " + items[j][1];
									}
								}
								where_material += row[i].idmaterial;
								if(i+1 != row.length){
									where_material += " ,";
								}
							}
							where_material += ")";
							update_material += where_material;
							connection.query(update_material, function(err,row){
								if(err) console.log("Error Update : %s", err);
								if(receps.length){
									connection.query("INSERT INTO recepcion SET ?",[{numgd: "f" + input['numeroFactura']}],function(err,row){
		                                if(err)
		                                    console.log("Error Inserting : %s", err);
		                                var update = "UPDATE abastecimiento SET recibidos = CASE";
		                                var where = "(";
		                                for (var i = 0; i < receps.length; i++){
											update += " WHEN idabast = " + receps[i][0] + " THEN recibidos + " + parseInt(receps[i][1]);
											where += receps[i][0] + ",";
											receps[i].push(row.insertId);
		                                }
		                                where = where.substring(0, where.length-1);
		                                where += ")";
		                                update += ' ELSE recibidos END WHERE idabast in '+where;


		                                connection.query(update, function(err, upAbast){
                                            if(err) console.log("Error Updating : %s", err);
											let matselect = "";
		                                	if (receps.length){
		                                		matselect += "SELECT idmaterial FROM abastecimiento WHERE idabast IN (";
		                                		for (let i = 0; i < receps.length; i++){
													matselect+= receps[i][0];
													if (i === receps.length-1){
														matselect += ")";
													} else{
														matselect += ",";
													}
		                                		}
											}
											console.log(matselect);
											connection.query(matselect, function (err, recepMats) {
												console.log(recepMats);
												let stockupdate = "";
												if (recepMats.length){
													stockupdate += "UPDATE material SET stock = CASE ";
													let where = "";
													for (let i = 0; i < recepMats.length; i++){
														stockupdate += "WHEN idmaterial = "+recepMats[i]['idmaterial']+" THEN material.stock+"+receps[i][1];
                                                        where += recepMats[i]['idmaterial'];
														if (i === recepMats.length-1){
                                                            //stockupdate += ")";
                                                        } else{
                                                            stockupdate += ",";
                                                            where += ",";
                                                        }
													}
													stockupdate += " ELSE stock END WHERE idmaterial IN ("+where+")";
												}
                                                console.log(stockupdate);
												connection.query(stockupdate, function (err, updresults) {

													connection.query("INSERT INTO recepcion_detalle (idabast,cantidad,idrecepcion) VALUES ?",[receps],function(err,rows){
														if(err)
															console.log("Error inserting r_detalle : %s", err);
														res.send({err:false,msg:'¡Factura registrada con exito!'});
													});
                                                });
                                            });
		                                });
									});
								} else res.send({err:false,msg:'¡Factura registrada con exito!'});
							});
						});
					});
				});
			});
        } else res.send({err: true,msg: "Los valores ingresados son inválidos, asegúrese los datos son correctos"});
    } else res.redirect("/bad_login");
});

// Renderizar modal para registrar Recepción (GDD)
router.get('/get_dataoda/:idoda', function(req, res, next){
    if(verificar(req.session.userData)){
		var idodc = req.params.idoda;
		req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select oda.numoda, oda.idoda, cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat, group_concat(material.detalle separator '@') as matd,"
        		+"group_concat(coalesce(material.u_medida,'und')) as umed,group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on " 
        		+"abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente = oda.idproveedor where oda.idoda=? and abastecimiento.recibidos<abastecimiento.cantidad group by oda.idoda",
        		[idodc],function(err, oda){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		res.render('abast/modal_odc_received', {data: oda});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/get_dataodc/:idodc', function(req, res, next){
    if(verificar(req.session.userData)){
		var idodc = req.params.idodc;
		console.log(idodc);
		req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select MAX(numoda) as num from oda", function(err, last){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		connection.query("select idcliente, sigla,pago, razon from cliente", function(err, proveedor){
	        		if(err)
	        			console.log("Error Selecting : %s", err);
	        		connection.query("SELECT odc.numoc,concat(cliente.sigla, ' - ',cliente.razon) as client ,"
	        			+"group_concat(pedido.idpedido) as idp_token, group_concat(pedido.cantidad) as cant_token, group_concat(pedido.f_entrega) as date_token,"
	        			+" group_concat(material.u_medida) as uni_token,group_concat(material.u_compra) as ucompra_token,group_concat(coalesce(concat(cuenta.subcuenta,'-',material.subcuenta,'-',coalesce(subcuenta.detalle,cuenta.detalle)),'N.D.')) as cc,"
	        			+"group_concat(material.detalle separator '@') as mat_token FROM notificacion left join odc"
	        			+" on odc.idodc = substring_index(substring_index(notificacion.descripcion, '@', 2),'@',-1) left"
	        			+" join pedido on pedido.idodc = odc.idodc LEFT JOIN material ON material.idmaterial = pedido.idmaterial"
	        			+" left join cliente on odc.idcliente = cliente.idcliente LEFT JOIN subcuenta ON subcuenta.subcuenta = material.subcuenta LEFT JOIN cuenta ON cuenta.subcuenta = concat(substring(material.subcuenta, 1,2),'000') WHERE notificacion.descripcion LIKE 'aoc@%' AND"
	        			+" pedido.externo=true AND pedido.idproveedor = 0 AND pedido.idodc=?",
		        		[idodc],function(err, oda){
		        		if(err)
		        			console.log("Error Selecting : %s", err);


		        		console.log(oda);
		        		res.render('abast/modal_odc_creation', {data: oda, provs: proveedor, last: last[0].num + 1});
		        	});	
	        	});
        	});
        	
        	
        });
    } else res.redirect("/bad_login");
});

/*UPDATE mat_prima SET stock = CASE
    WHEN idmatpri = 5 THEN stock - 10
    WHEN idmatpri = 6 THEN stock - 20
    WHEN idmatpri = 7 THEN stock - 30
    ELSE stock
    END
WHERE idmatpri  in (5,6,7);*/

router.post('/crear_ingreso', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var gdd = input['numgdd'];
        var idoda;
        var idtoken = "";
        var canttoken = "";
        var mattoken = "";
        var unitoken = "";
        //idmat_token  mat_token  cant_token  idoda  numgdd 
        var ingresos = ['','','','',''];
        var query = "UPDATE material SET stock = CASE ";
        var abast = "UPDATE abastecimiento SET recibidos = CASE ";
		var where = "WHERE idmaterial IN (";
		if(typeof input['idmat[]'] == 'string'){
			idoda = input['idoda[]'];
			query += "WHEN idmaterial = "+input['idmat[]']+" THEN stock + "+( input['rec[]'])+" ";
			abast += "WHEN idmaterial = "+input['idmat[]']+" THEN recibidos + "+( input['rec[]'])+" ";
			where += input['idmat[]']+",";
			ingresos[0] = input['idmat[]']; 
			ingresos[1] = input['mat[]']; 
			ingresos[2] = input['rec[]']; 
			ingresos[3] = input['uni[]'];
			ingresos[4] = input['idoda[]'];
			ingresos[5] = gdd; 
		
		}
		else{
			for(var t=0; t < input['idmat[]'].length; t++){
				idoda = input['idoda[]'][0];
				query += "WHEN idmaterial = "+input['idmat[]'][t]+" THEN stock + "+( input['rec[]'][t])+" ";
				abast += "WHEN idmaterial = "+input['idmat[]'][t]+" THEN recibidos + "+( input['rec[]'][t])+" ";
				where += input['idmat[]'][t]+",";		
				ingresos[0] += input['idmat[]'][t]+"@"; 
				ingresos[1] += input['mat[]'][t]+"@"; 
				ingresos[2] += input['rec[]'][t]+"@"; 
				ingresos[3] += input['uni[]'][t]+"@"; 
				ingresos[4] = input['idoda[]'][0]; 
				ingresos[5] = gdd;
				if(t == input['idmat[]'].length-1){
					ingresos[0] = ingresos[0].substring(0, ingresos[0].length-1); 
					ingresos[1] = ingresos[1].substring(0, ingresos[1].length-1); 
					ingresos[2] = ingresos[2].substring(0, ingresos[2].length-1); 
					ingresos[3] = ingresos[3].substring(0, ingresos[3].length-1);
				}  
			}
		}
		console.log(ingresos);
		query += "ELSE stock END ";
		abast += "ELSE recibidos END ";
		where = where.substring(0, where.length-1) + ")";
		query = query +  where;
		abast = abast + where + " AND idoda = "+idoda;
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query(query, function(err, ing){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		connection.query(abast, function(err, ab){
        			if(err)
        				console.log("Error Selecting : %s", err);
        			connection.query("INSERT INTO ingreso (idmat_token, mat_token, cant_token,  un_token,idoda,  numgdd) VALUES ?", [[ingresos]], function(err, ingres){
        				if(err)
        					console.log("Error Selecting : %s", err);

        				res.redirect('/abastecimiento/rec_odc_page/1');		

        			});
        			/*connection.query("UPDATE oda SET gdd='"+gdd+"' WHERE idoda=?", [idoda], function(err, oda){
        				if(err)
        					console.log("Error Selecting : %s", err);
        				
        				res.redirect('/abastecimiento/rec_odc_page/1');		
        			});*/
        		});
        	});
        });
	 } else res.redirect("/bad_login");
});

router.get('/abast_ops', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("SELECT ordenproduccion.*, group_concat(material.detalle separator '@') "
    	 		+"as mats,group_concat(produccion.cantidad) as cants, group_concat(produccion.abastecidos) as abast"
    	 		+" FROM produccion LEFT JOIN ordenproduccion ON produccion.idordenproduccion=ordenproduccion.idordenproduccion"
    	 		+" LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones=produccion.idfabricaciones LEFT JOIN material ON"
    	 		+" material.idmaterial=fabricaciones.idmaterial"+ /*WHERE produccion.cantidad>produccion.abastecidos*/" WHERE ordenproduccion.fin = false GROUP BY produccion.idordenproduccion",
        		function(err, ops){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		connection.query("SELECT ordenproduccion.*, group_concat(material.detalle separator '@') "
    	 		+"as mats,group_concat(produccion.cantidad) as cants, group_concat(produccion.abastecidos) as abast"
    	 		+" FROM produccion LEFT JOIN ordenproduccion ON produccion.idordenproduccion=ordenproduccion.idordenproduccion"
    	 		+" LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones=produccion.idfabricaciones LEFT JOIN material ON"
    	 		+" material.idmaterial=fabricaciones.idmaterial"+ /*WHERE produccion.cantidad>produccion.abastecidos*/" WHERE ordenproduccion.fin = true GROUP BY produccion.idordenproduccion",
	        			function(err, dev){
	        			if(err)
	        				console.log("Error Selecting : %s", err);
	        		//console.log(dev.length);
        			res.render('abast/abast_ops', {largo: ops.length, largo2: dev.length});
        		});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/abast_ops_page/:page', function(req, res, next){
    if(verificar(req.session.userData)){
		var pagina = req.params.page-1;
		pagina = pagina*15;
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("SELECT ordenproduccion.*, min(produccion.cantidad = produccion.`8`+produccion.standby) as cerrado, group_concat(produccion.cantidad = produccion.`8`+produccion.standby) as cerrado_token , group_concat(material.detalle separator '@') "
    	 		+"as mats, group_concat(material.u_medida) as unid, group_concat(produccion.cantidad) as cants, group_concat(produccion.abastecidos) as abast"
    	 		+" FROM produccion LEFT JOIN ordenproduccion ON produccion.idordenproduccion=ordenproduccion.idordenproduccion"
    	 		+" LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones=produccion.idfabricaciones LEFT JOIN material ON"
    	 		+" material.idmaterial=fabricaciones.idmaterial"+/* WHERE produccion.cantidad>produccion.abastecidos*/" WHERE ordenproduccion.fin=false GROUP BY produccion.idordenproduccion LIMIT "+pagina+",15",
        		function(err, odc){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		console.log(odc);
        		res.render('abast/abast_ops_page', {data: odc});	
        	});
        });
    } else res.redirect("/bad_login");
});
//Renderizar vista de INFORME DE STOCK para FABRICACIONES.
router.get('/fabrs_ids/:idview', function(req, res, next){
    if(verificar(req.session.userData)){
		res.render('plan/view_ids', {idview: req.params.idview, username: req.session.userData.nombre});
    } else res.redirect("/bad_login");
});


router.post('/table_ids', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var array_fill = [
            "material.codigo",
            "material.detalle"
        ];

        var object_fill = {
            "material.codigo-off": [],
            "material.detalle-off": [],
            "material.codigo-on": [],
            "material.detalle-on": []
        };

        var condiciones_where = [];
        if(input.cond != ''){
            for(var e=0; e < input.cond.split('@').length; e++){
                condiciones_where.push(input.cond.split('@')[e]);
            }
        }


        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);

        if(result[2] === ''){
        	result[2] = [];
		}else{
            result[2] = result[2].split('@');
		}
        adminModel.getdatos(input.extraInfo.split('%'),function(err,data){
            if(err) console.log(err);

            res.render("plan/table_ids",{prods:data, token: input.extraInfo});
        }, result[2], result[1]);
    } else res.redirect("/bad_login");
});





//Renderizar vista de INFORME DE STOCK para INSUMOS.
router.get('/ops_close', function(req, res, next){
    if(verificar(req.session.userData)){

        res.render('abast/cierre_ops');
    } else res.redirect("/bad_login");
});
//Cargar Datos de INFORME DE STOCK para FABRICACIONES
router.get("/fabrs_list/:token",function(req,res){
    if(verificar(req.session.userData)){
		adminModel.getdatos(req.params.token.split('@'),function(err,data){
			if(err) console.log(err);
			console.log(req.params.token);
            res.render("plan/insumos_table",{prods:data, token: req.params.token});
		});
    } else res.redirect("/bad_login");
});
//Cargar Datos de INFORME DE STOCK para INSUMOS
router.get('/insumos_list/:token', function(req, res, next){
    if(verificar(req.session.userData)){
    	console.log(req.params.token);
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	//SELECT ordenproduccion.*,group_concat(material.detalle separator '@') as mat_token, group_concat(material.precio), group_concat(salidas.sum_sal) as sum_sal_token, group_concat(ingresos.sum_ing) as sum_ing_token FROM (select ops_abastecidas.idop, ops_abastecidas.idmaterial, sum(coalesce(ops_abastecidas.cantidad)) as sum_sal from ops_abastecidas where ops_abastecidas.ingreso = false and ops_abastecidas.cont=false group by ops_abastecidas.idmaterial) as salidas left join (select ops_abastecidas.idop, ops_abastecidas.idmaterial, sum(coalesce(ops_abastecidas.cantidad,0)) as sum_ing from ops_abastecidas where ops_abastecidas.ingreso = true and ops_abastecidas.cont = false group by ops_abastecidas.idmaterial) as ingresos on (ingresos.idop = salidas.idop AND ingresos.idmaterial = salidas.idmaterial) left join material on material.idmaterial=salidas.idmaterial left join ordenproduccion on ordenproduccion.idordenproduccion=ops_abastecidas.idop group by ordenproduccion.idordenproduccion;

        	connection.query("SELECT material.s_inicial,material.stock,material.codigo,material.idmaterial,material.detalle,COALESCE(salidas.sum_sal,0) AS sum_sal,coalesce(ingresos.sum_ing,0) as sum_ing" +
				",coalesce(devs.sum_devs,0) as sum_dev,coalesce(virtuales.sum_virtual,0) as sum_virtual" +
				",material.u_medida,coalesce(solicitados.necesarios,0) as sum_sol" +
                // FROM (sum_sal) AS salidas -- salidas desde movimientos tipo 0
				" FROM material LEFT JOIN (select movimiento_detalle.idmaterial, sum(movimiento_detalle.cantidad) as sum_sal FROM movimiento" +
				" LEFT JOIN movimiento_detalle on movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
				" WHERE movimiento.tipo = 0 AND movimiento.f_gen" +
				" BETWEEN '"+req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
				" GROUP BY movimiento_detalle.idmaterial) as salidas ON salidas.idmaterial = material.idmaterial" +
				// LEFT JOIN (sum_ing) AS ingresos -- entradas desde recepción de OCA
				" LEFT JOIN (select material.idmaterial, sum(recepcion_detalle.cantidad) as sum_ing FROM recepcion" +
                " LEFT JOIN recepcion_detalle on recepcion_detalle.idrecepcion = recepcion.idrecepcion" +
                " LEFT JOIN abastecimiento ON abastecimiento.idabast = recepcion_detalle.idabast" +
                " LEFT JOIN material ON material.idmaterial = abastecimiento.idmaterial" +
                " WHERE recepcion.fecha BETWEEN '" + req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
				" GROUP BY material.idmaterial) as ingresos ON ingresos.idmaterial = material.idmaterial" +
                // LEFT JOIN (sum_devs) AS devs -- entradas desde movimientos tipo 1
				" LEFT JOIN (SELECT material.idmaterial, SUM(coalesce(movimiento_detalle.cantidad,0)) as sum_devs FROM material" +
                " LEFT JOIN movimiento_detalle ON material.idmaterial = movimiento_detalle.idmaterial" +
                " LEFT JOIN movimiento ON movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
				" WHERE movimiento.tipo = 1 AND movimiento.f_gen BETWEEN '" + req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
				" GROUP BY material.idmaterial) AS devs ON devs.idmaterial = material.idmaterial" +
                // LEFT JOIN (sum_devs) AS devs -- solicitadas
                " LEFT JOIN (SELECT bom.idmaterial_slave,SUM(enprod.enprod*bom.cantidad) as necesarios FROM (SELECT fabricaciones.idmaterial, SUM(produccion.cantidad) as enprod FROM produccion" +
                " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
				" WHERE produccion.cantidad != produccion.`8` AND (produccion.f_gen" +
                " BETWEEN '"+req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59')" +
				" GROUP BY fabricaciones.idmaterial) AS enprod" +
                " LEFT JOIN bom ON bom.idmaterial_master = enprod.idmaterial" +
				" LEFT JOIN material ON bom.idmaterial_slave = material.idmaterial" +
                " WHERE material.e_abast != 4" +
                " GROUP BY bom.idmaterial_slave) AS solicitados ON solicitados.idmaterial_slave = material.idmaterial" +
                // FROM (sum_virtual) as virtuales -- Abastecimiento no recibidos.
                " LEFT JOIN (select abastecimiento.idmaterial, sum(abastecimiento.cantidad - abastecimiento.recibidos) as sum_virtual FROM oda" +
                " LEFT JOIN abastecimiento ON abastecimiento.idoda = oda.idoda" +
                " WHERE oda.creacion" +
                " BETWEEN '"+req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
                " GROUP BY abastecimiento.idmaterial) AS virtuales ON virtuales.idmaterial = material.idmaterial" +
                " WHERE NOT (solicitados.necesarios = 0 AND virtuales.sum_virtual = 0 AND salidas.sum_sal = 0 AND ingresos.sum_ing = 0 AND devs.sum_devs = 0) GROUP BY material.idmaterial" ,function(err, ops){
        		if(err)
        			console.log("Error Selecting : %s", err);

        		res.render('abast/insumos_table', {data: ops});
        	});
        });
    } else res.redirect("/bad_login");
});





router.get('/xlsx_oda', function(req,res){
    if(verificar(req.session.userData)){
        let fecha = new Date();
        var nombre = "master-oda-" + fecha.getDate()  + "-" + (fecha.getMonth() + 1).toString() + "-" + fecha.getFullYear() + "---" + fecha.getTime() + '.xlsx';
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet1 = workbook.addWorksheet('Pedidos');
        var sheet2 = workbook.addWorksheet('Facturas');
        sheet1.columns = [
            { header: 'N° OCA', key: 'id', width: 15 },
            { header: 'Código', key: 'name', width: 50 },
            { header: 'Detalle', key: 'unit', width: 10},
            { header: 'Cantidad', key: 'asked', width: 15},
            { header: 'Costo Unitario', key: 'virtual', width: 10},
            { header: 'Centro de Costo', key: 'virtual', width: 10},
            { header: 'Fecha Creación', key: 'income', width: 10},
            { header: 'Proveedor', key: 'income', width: 10}
		];
        sheet2.columns = [
            { header: 'Factura', key: 'id', width: 15 },
            { header: 'Código', key: 'name', width: 50 },
            { header: 'Detalle', key: 'unit', width: 10},
            { header: 'Facturado', key: 'virtual', width: 10},
            { header: 'Costo', key: 'virtual', width: 10},
            { header: 'N° OCA', key: 'income', width: 10},
            { header: 'Fecha de Facturación', key: 'income', width: 10}
        ];


        adminModel.getdatosODA(null,function(err,ops){
            if(err) console.log(err);
            sheet1.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet1.getRow(1).font = {
                name: 'Comic Sans MS',
                family: 4,
                size: 11,
                underline: false,
                bold: true
            };
            /*
            sheet1.columns = [
                { header: 'N° OCA', key: 'id', width: 15 },
                { header: 'Código', key: 'name', width: 50 },
                { header: 'Detalle', key: 'unit', width: 10},
                { header: 'Cantidad', key: 'asked', width: 15},
                { header: 'Costo Unitario', key: 'virtual', width: 10},
                { header: 'Centro de Costo', key: 'virtual', width: 10},
                { header: 'Fecha Creación', key: 'income', width: 10},
                { header: 'Proveedor', key: 'income', width: 10}
            ];
            * */
            for(var i = 2; i < ops.length+2; i++){
                sheet1.getCell('A'+i.toString()).value = ops[i-2].idoda;
                sheet1.getCell('B'+i.toString()).value = ops[i-2].codigo;
                sheet1.getCell('C'+i.toString()).value = ops[i-2].detalle;
                sheet1.getCell('D'+i.toString()).value = ops[i-2].cantidad;
                sheet1.getCell('E'+i.toString()).value = ops[i-2].costo;
                sheet1.getCell('F'+i.toString()).value = ops[i-2].cc;
                sheet1.getCell('G'+i.toString()).value = ops[i-2].fecha;
                sheet1.getCell('H'+i.toString()).value = ops[i-2].sigla;
            }
            sheet1.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet1.getRow(1).font = {
                name: 'Arial',
                family: 4,
                size: 11,
                color: {argb: 'FDFEFE'},
                underline: false, //subrayado
                bold: false //negrita
            };
            sheet1.getRow(1).border = {
                right: {style:'thin', color: {argb:'00000000'}},
                left: {style:'thin', color: {argb:'00000000'}},
                top: {style:'thin', color: {argb:'00000000'}},
                bottom: {style:'thin', color: {argb:'00000000'}}
            };

            adminModel.getDatosFacturas(null,function(err,prods){
                if(err) throw err;
                /*
                sheet2.columns = [
                    { header: 'Factura', key: 'id', width: 15 },
                    { header: 'Código', key: 'name', width: 50 },
                    { header: 'Detalle', key: 'unit', width: 10},
                    { header: 'Facturado', key: 'virtual', width: 10},
                    { header: 'Costo', key: 'virtual', width: 10},
                    { header: 'N° OCA', key: 'income', width: 10},
                    { header: 'Fecha de Facturación', key: 'income', width: 10}
                ];
                * */
                for(let i=0;i<prods.length;i++){
                    sheet2.addRow([prods[i].numfac,prods[i].codigo,prods[i].detalle,prods[i].cantidad,prods[i].costo,prods[i].idoda,prods[i].fecha]);
                }
                workbook.xlsx.writeFile('public/csvs/' + nombre).then(function() {
                    console.log(nombre);
                    res.send('/csvs/'+nombre);
                });
            });

        });
    }
    else res.redirect('/bad_login');
});



// Descargar xlsx de insumos
router.get('/xlsx_ids_ins/:token', function (req, res, next) {
    if(verificar(req.session.userData)){
        console.log(req.params.token);
        let fecha = new Date();
        let nombre = "IDS-Insumos-" + fecha.getDate()  + "-" + (fecha.getMonth() + 1).toString() + "-" + fecha.getFullYear() + " --- " + fecha.getTime() + '.xlsx';
		let Excel = require('exceljs');
		let workbook = new Excel.Workbook();
		let sheet = workbook.addWorksheet('stockmaster',{properties:{tabColor:{argb:'FFC0000'}}});
		let ident  = new Date().toLocaleDateString().replace(' ','');
		ident = ident.replace('/','');
		ident = ident.replace(':','');
		sheet.columns = [
			{ header: 'Código', key: 'id', width: 15 },
			{ header: 'Detalle', key: 'name', width: 50 },
			{ header: 'Unidad Med.', key: 'unit', width: 10},
			{ header: 'Stock Inicial', key: 'initial', width: 15},
			{ header: 'Cantidad Solicitada', key: 'asked', width: 15},
			{ header: 'Stock Virtual', key: 'virtual', width: 15},
			{ header: 'Ingresos', key: 'income', width: 15},
			{ header: 'Salidas', key: 'departures', width: 15},
			{ header: 'Stock Final', key: 'final', width: 15}
		];
        req.getConnection(function(err, connection){
            if(err)
                console.log("Error Connection : %s", err);
			connection.query("SELECT material.s_inicial,material.codigo,material.idmaterial,material.detalle,COALESCE(salidas.sum_sal,0) AS sum_sal,coalesce(ingresos.sum_ing,0) as sum_ing" +
                ",coalesce(devs.sum_devs,0) as sum_dev,coalesce(virtuales.sum_virtual,0) as sum_virtual" +
                ",material.u_medida,coalesce(solicitados.necesarios,0) as sum_sol" +
                // FROM (sum_sal) AS salidas -- salidas desde movimientos tipo 0
                " FROM material LEFT JOIN (select movimiento_detalle.idmaterial, sum(movimiento_detalle.cantidad) as sum_sal FROM movimiento" +
                " LEFT JOIN movimiento_detalle on movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
                " WHERE movimiento.tipo = 0 AND movimiento.f_gen" +
                " BETWEEN '"+req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
                " GROUP BY movimiento_detalle.idmaterial) as salidas ON salidas.idmaterial = material.idmaterial" +
                // LEFT JOIN (sum_ing) AS ingresos -- entradas desde recepción de OCA
                " LEFT JOIN (select material.idmaterial, sum(recepcion_detalle.cantidad) as sum_ing FROM recepcion" +
                " LEFT JOIN recepcion_detalle on recepcion_detalle.idrecepcion = recepcion.idrecepcion" +
                " LEFT JOIN abastecimiento ON abastecimiento.idabast = recepcion_detalle.idabast" +
                " LEFT JOIN material ON material.idmaterial = abastecimiento.idmaterial" +
                " WHERE recepcion.fecha BETWEEN '" + req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
                " GROUP BY material.idmaterial) as ingresos ON ingresos.idmaterial = material.idmaterial" +
                // LEFT JOIN (sum_devs) AS devs -- entradas desde movimientos tipo 1
                " LEFT JOIN (SELECT material.idmaterial, SUM(coalesce(movimiento_detalle.cantidad,0)) as sum_devs FROM material" +
                " LEFT JOIN movimiento_detalle ON material.idmaterial = movimiento_detalle.idmaterial" +
                " LEFT JOIN movimiento ON movimiento_detalle.idmovimiento = movimiento.idmovimiento" +
                " WHERE movimiento.tipo = 1 AND movimiento.f_gen BETWEEN '" + req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
                " GROUP BY material.idmaterial) AS devs ON devs.idmaterial = material.idmaterial" +
                // LEFT JOIN (sum_devs) AS devs -- solicitadas
                " LEFT JOIN (SELECT bom.idmaterial_slave,SUM(enprod.enprod*bom.cantidad) as necesarios FROM (SELECT fabricaciones.idmaterial, SUM(produccion.cantidad) as enprod FROM produccion" +
                " LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones = produccion.idfabricaciones" +
                " WHERE produccion.cantidad != produccion.`8` AND (produccion.f_gen" +
                " BETWEEN '"+req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59')" +
                " GROUP BY fabricaciones.idmaterial) AS enprod" +
                " LEFT JOIN bom ON bom.idmaterial_master = enprod.idmaterial" +
                " LEFT JOIN material ON bom.idmaterial_slave = material.idmaterial" +
                " WHERE material.e_abast != 4" +
                " GROUP BY bom.idmaterial_slave) AS solicitados ON solicitados.idmaterial_slave = material.idmaterial" +
                // FROM (sum_virtual) as virtuales -- salidas desde movimientos tipo 0
                " LEFT JOIN (select abastecimiento.idmaterial, sum(abastecimiento.cantidad - abastecimiento.recibidos) as sum_virtual FROM oda" +
                " LEFT JOIN abastecimiento ON abastecimiento.idoda = oda.idoda" +
				" WHERE oda.creacion" +
                " BETWEEN '"+req.params.token.split('@')[0]+" 00:00:00' AND '"+req.params.token.split('@')[1]+" 23:59:59'" +
                " GROUP BY abastecimiento.idmaterial) AS virtuales ON virtuales.idmaterial = material.idmaterial" +
                " WHERE NOT (solicitados.necesarios = 0 AND virtuales.sum_virtual = 0 AND salidas.sum_sal = 0 AND ingresos.sum_ing = 0 AND devs.sum_devs = 0) GROUP BY material.idmaterial", function(err, ops){
				if(err) throw err;

				//Inicio de la funcion post query.
				for(var i = 2; i < ops.length+2; i++){
					sheet.getCell('A'+i.toString()).value = ops[i-2].codigo;
					sheet.getCell('B'+i.toString()).value = ops[i-2].detalle;
					sheet.getCell('C'+i.toString()).value = ops[i-2].u_medida;
					//Stock Inicial
                    sheet.getCell('D'+i.toString()).value = ops[i-2].s_inicial;
                    sheet.getCell('E'+i.toString()).value = ops[i-2].sum_sol;
					//Cantidad Solicitada
					sheet.getCell('F'+i.toString()).value = ops[i-2].sum_virtual;
                    sheet.getCell('G'+i.toString()).value = ops[i-2].sum_ing + ops[i-2].sum_dev;
                    sheet.getCell('H'+i.toString()).value = ops[i-2].sum_sal;
                    sheet.getCell('I	'+i.toString()).value = ops[i-2].s_inicial + ops[i-2].sum_ing + ops[i-2].sum_dev - ops[i-2].sum_sal;
				}

				workbook.xlsx.writeFile('public/csvs/' + nombre).then(function() {
					console.log('new xlsx');
					res.send(nombre);
				});
			});
        });
    }
});
// Descargar xlsx de fabrs
router.get('/xlsx_ids_fabrs/:token', function (req, res, next) {
    if(verificar(req.session.userData)){
    	let fecha = new Date();
    	var nombre;
        console.log(req.params.token);
    	console.log(req.params.token.split('@')[2]);
    	if(parseInt(req.params.token.split('@')[2]) == 1){
            nombre = "IDS-producidos-" + fecha.getDate()  + "-" + (fecha.getMonth() + 1).toString() + "-" + fecha.getFullYear() + "---" + fecha.getTime() + '.xlsx';
        }
        else if(parseInt(req.params.token.split('@')[2]) == 2){
            nombre = "IDS-matp&insumos-" + fecha.getDate()  + "-" + (fecha.getMonth() + 1).toString() + "-" + fecha.getFullYear() + "---" + fecha.getTime() + '.xlsx';
        }
        else{
            nombre = "IDS-pedidos&producidos-" + fecha.getDate()  + "-" + (fecha.getMonth() + 1).toString() + "-" + fecha.getFullYear() + "---" + fecha.getTime() + '.xlsx';
        }

        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet4 = workbook.addWorksheet('Informe de Stock Resumen');
        var sheet = workbook.addWorksheet('InformeTotal');
        var sheet2 = workbook.addWorksheet('Produccion');
        var sheet3 = workbook.addWorksheet('Salidas');
        sheet.columns = [
            { header: 'Código', key: 'id', width: 15, style: 'text-aling: center' },
            { header: 'Detalle', key: 'name', width: 50 },
            { header: 'Unidad Med.', key: 'unit', width: 10},
            { header: 'Stock Inicio Mes', key: 'initial', width: 15},
            { header: 'Pendientes Totales en OC', key: 'asked', width: 15},
            { header: 'Solicitado en OC (Mensual)', key: 'asked', width: 15},
            { header: 'Solicitado en OC atrasado', key: 'asked', width: 20},
            { header: 'Solicitada según OP', key: 'asked', width: 20},
			{ header: 'Solicitada según entradas a BPT', key: 'asked', width: 28},
            { header: 'Stock en producción', key: 'virtual', width: 15},
            { header: 'Rechazados', key: 'virtual', width: 15},
            { header: 'Stock de ODA sin recepcionar', key: 'virtual', width: 25},
            { header: 'Aceptados por CC', key: 'income', width: 15},
            { header: 'Devolución a BMI', key: 'income', width: 15},
            { header: 'Recepcion GDD', key: 'income', width: 15},
            { header: 'Retiros en BMI', key: 'departures', width: 15},
            { header: 'Salidas en GDD', key: 'departures', width: 15},
            { header: 'Facturados', key: 'departures', width: 15},
            { header: 'Por Facturar', key: 'departures', width: 15},
            { header: 'Stock Final', key: 'final', width: 15}
        ];
        sheet2.columns = [
            { header: 'Código', key: 'id', width: 15 },
            { header: 'Detalle', key: 'name', width: 50 },
            { header: 'Unidad Med.', key: 'unit', width: 10},
            { header: 'Solicitado en OP', key: 'asked', width: 15},
            { header: 'Moldeo', key: 'virtual', width: 10},
            { header: 'Fusion', key: 'income', width: 10},
            { header: 'Quiebre', key: 'income', width: 10},
            { header: 'Terminación', key: 'departures', width: 10},
            { header: 'Tratamiento Térmico', key: 'income', width: 15},
            { header: 'Maestranza', key: 'departures', width: 10},
            { header: 'Control de Calidad', key: 'final', width: 15},
            { header: 'Rechazado', key: 'final', width: 15},
            { header: 'Ingresado a BPT', key: 'final', width: 15}
        ];
        sheet3.columns = [
            { header: 'Código', key: 'id', width: 15 },
            { header: 'Detalle', key: 'name', width: 50 },
            { header: 'Unidad Med.', key: 'unit', width: 10},
            { header: 'Retiro Bodega', key: 'virtual', width: 10},
            { header: 'GDD Venta', key: 'income', width: 10},
            { header: 'GDD Traslado', key: 'income', width: 10},
            { header: 'GDD Devolucion', key: 'departures', width: 10},
            { header: 'GDD Anulada', key: 'income', width: 15}
        ];

        sheet4.columns = [
            { header: 'Código', key: 'id', width: 13, height: 13.43},
            { header: 'Detalle', key: 'name', width: 42.14 },
            { header: 'Unidad', key: 'unit', width: 7.86},
            { header: 'Peso Unitario (KG)', key: 'virtual', width: 14.71},
            { header: 'Inicial BPT', key: 'virtual', width: 14.71},
            { header: 'Inicial Planta', key: 'income', width: 14.71},
            { header: 'Total Fusión Mes', key: 'income', width: 13.57},
            { header: 'Entradas a Producción', key: 'income', width: 13.57},
            { header: 'Actual en Planta', key: 'income', width: 13.57},
            { header: 'Total Despachado GDD', key: 'departures', width: 14.71},
            { header: 'Total Rechazos Mes', key: 'income', width: 14.71},
            { header: 'Total Externalizado Mes', key: 'income', width: 14.71},
            { header: 'Stock en Siderval', key: 'income', width: 11}
        ];
        var env = [
        	req.params.token.split("@")[0],
			req.params.token.split("@")[1],
			req.params.token.split("@")[2]
		];
        console.log(env);
        adminModel.getdatos(env ,function(err,ops){
            if(err) console.log(err);
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


            sheet.getRow(1).height = 42.75;
            sheet2.getRow(1).height = 42.75;
            sheet3.getRow(1).height = 42.75;
            sheet4.getRow(1).height = 42.75;
            for(var i = 2; i < ops.length+2; i++){
				sheet.getCell('A'+i.toString()).value = ops[i-2].codigo;
				sheet.getCell('B'+i.toString()).value = ops[i-2].detalle;
				sheet.getCell('C'+i.toString()).value = ops[i-2].u_medida;

				sheet.getCell('C'+i.toString()).border = {
					right: {style:'double', color: {argb:'00000000'}}
				};
                /*
                ops = [{
                    solicitados: según OC entrantes, AS peds.solicitados
                    sol_atr: pedidos anteriores a la fecha sin despachar, AS peds_atrasados.solicitados
                    necesarios: Segun teorico de BOM de todas OP, AS necesario.necesarios
                    necesario_neto: Teorico del BOM en base a BPT, AS necesario.neto
                    virtuales: Cantidad en produccion, AS virts.virtuales,
                    virtuales_oda: Cantidad no reccepcionada de ODA, AS virts_oda.sum_virtual
                    fabricados: enviados desde CC a BPT, AS fabrs.fabricados
                    sum_dev: movimiento de bodega de DEVOLUCION, AS devs.sum_devs
                    ing_oda: Recepcion de GDD anexa a OCA (ODA) AS ing_oda.sum_ing
                    despachados: segun guia de despacho SALIENTE, AS desps.despachados
                    sum_sal: movimiento de bodega de SALIDA, AS salidas_mp.sum_sal
                },(...)];
                */
				//Stock Inicial
				sheet.getCell('D'+i.toString()).value = ops[i-2].s_inicial;
				sheet.getCell('D'+i.toString()).border = {
                    right: {style:'double', color: {argb:'00000000'}}
				};



                sheet.getCell('E'+i.toString()).value = ops[i-2].pendientes;


                sheet.getCell('F'+i.toString()).value = ops[i-2].solicitados;
				//Cantidad Solicitada
				sheet.getCell('G'+i.toString()).value = ops[i-2].sol_atr;
				sheet.getCell('H'+i.toString()).value = ops[i-2].necesarios;
				sheet.getCell('I'+i.toString()).value = ops[i-2].necesario_neto;
				sheet.getCell('I'+i.toString()).border = {
                    right: {style:'double', color: {argb:'00000000'}}
				};

				sheet.getCell('J'+i.toString()).value = ops[i-2].virtuales;

                sheet.getCell('K'+i.toString()).value = ops[i-2].rechazados;

                sheet.getCell('L'+i.toString()).value = ops[i-2].virtuales_oda;

				sheet.getCell('L'+i.toString()).border = {
                    right: {style:'double', color: {argb:'00000000'}}
				};

                sheet.getCell('M'+i.toString()).value = ops[i-2].fabricados;
                sheet.getCell('N'+i.toString()).value = ops[i-2].sum_dev;
                sheet.getCell('O'+i.toString()).value = ops[i-2].ing_oda;
				sheet.getCell('O'+i.toString()).border = {
                    right: {style:'double', color: {argb:'00000000'}}
				};
	            sheet.getCell('P'+i.toString()).value = ops[i-2].sum_sal;
                sheet.getCell('Q'+i.toString()).value = ops[i-2].despachados;
                sheet.getCell('R'+i.toString()).value = ops[i-2].sum_fact;
                sheet.getCell('S'+i.toString()).value = parseInt(ops[i-2].despachados) - parseInt(ops[i-2].sum_fact);
                //sheet.getCell('R'+i.toString()).value = parseInt(ops[i-2].s_inicial) + parseInt(ops[i-2].fabricados) - parseInt(ops[i-2].despachados);
                sheet.getCell('T'+i.toString()).value =
					parseInt(ops[i-2].s_inicial) +
					parseInt(ops[i-2].fabricados) +
					parseInt(ops[i-2].sum_dev) +
					parseInt(ops[i-2].ing_oda) -
					parseInt(ops[i-2].despachados) -
					parseInt(ops[i-2].sum_sal);
                /*sheet.getCell('S'+i.toString()).value = parseInt(ops[i-2].stock);
                sheet.getCell('S'+i.toString()).border = {
                    left: {style:'double', color: {argb:'00000000'}},
                };*/





                sheet4.getCell('A'+i.toString()).value = ops[i-2].codigo;
                sheet4.getCell('B'+i.toString()).value = ops[i-2].detalle;
                sheet4.getCell('C'+i.toString()).value = ops[i-2].u_medida;
                sheet4.getCell('D'+i.toString()).value = ops[i-2].peso;
                sheet4.getCell('E'+i.toString()).value = ops[i-2].s_inicial;
                sheet4.getCell('F'+i.toString()).value = ops[i-2].p_inicial;
                sheet4.getCell('G'+i.toString()).value = ops[i-2].fundidos;

                sheet4.getCell('H'+i.toString()).value = ops[i-2].virtuales + (ops[i-2].fabricados+ops[i-2].rechazados)-ops[i-2].p_inicial;
                sheet4.getCell('I'+i.toString()).value = ops[i-2].virtuales;


                sheet4.getCell('J'+i.toString()).value = ops[i-2].despachados;
                sheet4.getCell('K'+i.toString()).value = ops[i-2].rechazados;
                sheet4.getCell('L'+i.toString()).value = ops[i-2].ing_oda;
                sheet4.getCell('M'+i.toString()).value =
                    ops[i-2].s_inicial +
                    ops[i-2].p_inicial +
                    ops[i-2].ing_oda +
                    ops[i-2].fundidos -
                    ops[i-2].despachados -
                    ops[i-2].rechazados -
					(ops[i-2].sum_sal - ops[i-2].sum_dev);
                //STOCK_SIDERVAL_FINAL = STOCK_I + PROD_I + RECEP_GDD + FUND - DESP_GDD - RECH - (RET_BMP - DEV_BMP)
				//STOCK_BPT_FINAL = STOCK_I + RECEP_GDD + ACEP_CC - DESP_GDD - (RET_BMP - DEV_BMP)
				//STOCK_PRODUCCION_FINAL = PROD_I + FUND - ACEP_CC - RECH
				//STOCK_SIDERVAL_FINAL = STOCK_BPT_FINAL + STOCK_PRODUCCION_FINAL
            }
           /* sheet.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet.getRow(1).font = {
                name: 'Arial',
                family: 4,
                size: 11,
                color: {argb: 'FDFEFE'},
                underline: false, //subrayado
                bold: false //negrita
            };
            sheet.getRow(1).border = {
                right: {style:'thin', color: {argb:'00000000'}},
                left: {style:'thin', color: {argb:'00000000'}},
                top: {style:'thin', color: {argb:'00000000'}},
                bottom: {style:'thin', color: {argb:'00000000'}}
            };*/

            sheet.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet.getRow(1).font = {
                name: 'Arial',
                family: 4,
                size: 11,
                color: {argb: '00000000'},
                underline: false, //subrayado
                bold: true //negrita
            };
            sheet.getRow(1).border = {
                right: {style:'thin', color: {argb:'00000000'}},
                left: {style:'thin', color: {argb:'00000000'}},
                top: {style:'thin', color: {argb:'00000000'}},
                bottom: {style:'thin', color: {argb:'00000000'}}
            };

            sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center',  wrapText: true  };
            sheet.autoFilter = {
                from: 'A1',
                to: 'T1',
            };




            sheet2.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet2.getRow(1).font = {
                name: 'Arial',
                family: 4,
                size: 11,
                color: {argb: '00000000'},
                underline: false, //subrayado
                bold: true //negrita
            };
            sheet2.getRow(1).border = {
                right: {style:'thin', color: {argb:'00000000'}},
                left: {style:'thin', color: {argb:'00000000'}},
                top: {style:'thin', color: {argb:'00000000'}},
                bottom: {style:'thin', color: {argb:'00000000'}}
            };

            sheet2.getRow(1).alignment = { vertical: 'middle', horizontal: 'center',  wrapText: true  };
            sheet2.autoFilter = {
                from: 'A1',
                to: 'M1',
            };




            sheet3.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet3.getRow(1).font = {
                name: 'Arial',
                family: 4,
                size: 11,
                color: {argb: '00000000'},
                underline: false, //subrayado
                bold: true //negrita
            };
            sheet3.getRow(1).border = {
                right: {style:'thin', color: {argb:'00000000'}},
                left: {style:'thin', color: {argb:'00000000'}},
                top: {style:'thin', color: {argb:'00000000'}},
                bottom: {style:'thin', color: {argb:'00000000'}}
            };

            sheet3.getRow(1).alignment = { vertical: 'middle', horizontal: 'center',  wrapText: true  };
            sheet3.autoFilter = {
                from: 'A1',
                to: 'H1',
            };


            sheet4.getRow(1).fill = {
                type: 'pattern',
                pattern:'solid',
                fgColor:{argb:'F4D03F'}
            };
            sheet4.getRow(1).font = {
                name: 'Arial',
                family: 4,
                size: 11,
                color: {argb: '00000000'},
                underline: false, //subrayado
                bold: true //negrita
            };
            sheet4.getRow(1).border = {
                right: {style:'thin', color: {argb:'00000000'}},
                left: {style:'thin', color: {argb:'00000000'}},
                top: {style:'thin', color: {argb:'00000000'}},
                bottom: {style:'thin', color: {argb:'00000000'}}
            };

            sheet4.getRow(1).alignment = { vertical: 'middle', horizontal: 'center',  wrapText: true  };
            sheet4.autoFilter = {
                from: 'A1',
                to: 'M1',
            };
            adminModel.produccion(req.params.token.split("@"),function(err,prods){
				if(err) throw err;
				for(let i=0;i<prods.length;i++){
					sheet2.addRow([prods[i].codigo,prods[i].detalle,prods[i].u_medida,prods[i].cant_total,prods[i].moldeo,prods[i].fusion,prods[i].quiebre
						,prods[i].terminacion,prods[i].tt,prods[i].maestranza,prods[i].cc,prods[i].rechazados,prods[i].fabricados]);
				}
				adminModel.salidas(req.params.token.split("@"),function(err,salidas){
					if(err) throw err;
                    for(let i=0;i<salidas.length;i++){
                        sheet3.addRow([salidas[i].codigo,salidas[i].detalle,salidas[i].u_medida,salidas[i].salidas,salidas[i].venta,salidas[i].traslado,salidas[i].devolucion, salidas[i].anulado]);
                    }
                    workbook.xlsx.writeFile('public/csvs/' + nombre).then(function() {
                    	console.log(nombre);
                        res.send(nombre);
                    });
				});
            });

        });
    }
});



/*  Funcion que renderiza la cabecera que posee un buscador de abastecimientos*/
router.get('/view_abastecimiento', function(req, res, next) {
	if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
            connection.query("SELECT * FROM cuenta", function(err, cc){
				if(err) throw err;
				req.getConnection(function(err, connection){
		        	if(err) { console.log("Error Connection : %s", err);
		        	} else {
			        	connection.query("select abastecimiento.*, coalesce(cliente.sigla, 'Sin Proveedor') as sigla,coalesce(cuenta.detalle, 'NO DEFINIDO') as cuenta,oda.numoda, oda.creacion, material.u_medida, material.detalle "+
			        		"from abastecimiento left join oda on oda.idoda=abastecimiento.idoda left join cliente on cliente.idcliente=oda.idproveedor left " +
			        		"join material on abastecimiento.idmaterial=material.idmaterial left join cuenta on cuenta.cuenta = substring_index(abastecimiento.cc,'-',1) WHERE  abastecimiento.cantidad > abastecimiento.recibidos", function(err, abs){
			        		if(err) { console.log("Error Selecting : %s", err);
			        		}else {
				        		res.render('abast/view_abastecimiento', {cc: cc, largo: abs.length, username: req.session.userData.nombre});
				        	}
			        	});
			        }
		        });
			});
        });
    }
	else{res.redirect('bad_login');}	
});



router.get('/view_stockp', function(req, res, next) {
    if(verificar(req.session.userData)){
        res.render('abast/view_stockp', {username: req.session.userData.nombre});
    }
    else{res.redirect('bad_login');}
});

/*  Funcion que busca los abastecimientos y los ordena segun paramentro orden en la url, muestra solo pendiente si showPend es true
	Renderiza una tabla con los abastecimientos solicitados
*/
router.post('/table_abastecimientos', function(req, res, next){
	if(verificar(req.session.userData)){
		//Obtiene la pagina de la url y obtiene el nro de registros a solicitar
        var input = JSON.parse(JSON.stringify(req.body));
		var array_fill = [
            "abastecimiento.idodabast",
            "abastecimiento.factura_token",
            "abastecimiento.gd_token",
            "abastecimiento.sigla",
            "abastecimiento.detalle",
            "abastecimiento.cuenta"
        ];
        var object_fill = {
            "abastecimiento.idodabast-off":[],
            "abastecimiento.factura_token-off":[],
            "abastecimiento.gd_token-off":[],
            "abastecimiento.sigla-off":[],
            "abastecimiento.detalle-off":[],
            "abastecimiento.cuenta-off":[],
            "abastecimiento.idodabast-on":[],
            "abastecimiento.factura_token-on":[],
            "abastecimiento.gd_token-on":[],
            "abastecimiento.sigla-on":[],
            "abastecimiento.detalle-on":[],
            "abastecimiento.cuenta-on":[]
        };

        var condiciones_where = [];
		if(input.cond != ''){
            for(var e=0; e < input.cond.split('@').length; e++){
                condiciones_where.push(input.cond.split('@')[e]);
            }
		}


        //SE LLAMA A LA FUNCIÓN QUE GENERA CONDICIÓN WHERE QUE LUEGO SE APLICARÁ A LA QUERY
        var result = getConditionArray(object_fill, array_fill, condiciones_where, input);
        var where = result[0];
        var limit = result[1];
        req.getConnection(function(err, connection){
        	if(err) { console.log("Error Connection : %s", err);
        	} else {
                connection.query("select * from (select abastecimiento.*,oda.anulado,oda.creacion as oda_creacion,coalesce(recepciones.cantidad,0) as recib,coalesce(facturacion.cantidad,0) as facturados, facturacion.factura_token,recepciones.gd_token, " +
                    "COALESCE(cliente.sigla, 'Sin Proveedor') as sigla, COALESCE(sub_ccontable.nombre, 'NO DEFINIDO') as subcuenta,COALESCE(cuenta_g.cuenta, 'NO DEFINIDO') as cuenta_g,COALESCE(ccontable.cuenta, 'NO DEFINIDO') as cuenta,coalesce(sub_ccontable.idccontable, 'Indefinido') as idccontable,oda.idoda as idodabast, oda.creacion, material.u_medida, material.detalle from abastecimiento " +
                    "left join (select facturacion.idabast, sum(facturacion.cantidad) as cantidad,GROUP_CONCAT(DISTINCT CONCAT(coalesce(factura.numfac,'Sin N°'),'@',factura.idfactura)) as factura_token from facturacion left join factura on factura.idfactura = facturacion.idfactura group by facturacion.idabast) as facturacion on facturacion.idabast = abastecimiento.idabast " +
                    "left join (select recepcion_detalle.idabast,sum(recepcion_detalle.cantidad) as cantidad, group_concat(DISTINCT CONCAT(recepcion.numgd,'@',recepcion.idrecepcion)) as gd_token from recepcion_detalle left join recepcion on recepcion.idrecepcion = recepcion_detalle.idrecepcion group by recepcion_detalle.idabast) as recepciones on recepciones.idabast = abastecimiento.idabast " +
                    "LEFT JOIN oda ON oda.idoda=abastecimiento.idoda " +
                    "LEFT JOIN material ON abastecimiento.idmaterial=material.idmaterial " +
                    "LEFT JOIN cliente ON cliente.idcliente=oda.idproveedor " +
                    "LEFT JOIN sub_ccontable on sub_ccontable.idsub = abastecimiento.cc " +
					"LEFT JOIN ccontable on sub_ccontable.idccontable = ccontable.idccontable " +
					"LEFT JOIN cuenta_g ON cuenta_g.idcuenta = SUBSTRING(ccontable.idccontable, 1, 2)) as abastecimiento "+where +" ORDER BY abastecimiento.oda_creacion DESC "+limit, function(err, abs){
                    if(err) { console.log("Error Selecting : %s", err);
                    }else {
                        res.render('abast/table_abastecimientos', {data: abs,  page: parseInt(req.params.page), largoData: abs.length },function(err,html){
                            if(err) console.log(err);
                            res.send(html);
                        });
                    }
                });
            }
        });
    } else res.redirect("/bad_login");
});

/*  Funcion que renderiza las ordenes de compra de abastecimiento en forma de items
*/
router.get('/item_abs/:showPend', function(req, res, next){
	if(verificar(req.session.userData)){
    	console.log(req.params.token);
    	var where = " ";
        if(req.params.showPend == 'true'){
            where = " WHERE abastecimiento.cantidad > abastecimiento.recibidos ";
        }
        req.getConnection(function(err, connection){
        	if(err) { console.log("Error Connection : %s", err);
        	} else {
	        	connection.query("select abastecimiento.*, oda.numoda, oda.creacion, cliente.sigla "+
	        		"from abastecimiento left join oda on oda.idoda=abastecimiento.idoda " +
	        		"left join cliente on cliente.idcliente=oda.idproveedor " + where + "GROUP BY abastecimiento.idoda", function(err, abs){
	        		if(err) { console.log("Error Selecting : %s", err);
	        		}else {
	        			console.log(abs);
		        		res.render('abast/item_abs', {data: abs});
		        	}
	        	});
	        }
        });
    } else res.redirect("/bad_login");
});

/*  Funcion que renderiza las ordenes de compra de abastecimiento buscadas por el filtro
	 ESTA ESTA INCOMPLETA,HAY QUE ARREGLAR LA QUERI !!!!!!!!!!!!!!!!!!
*/
router.post('/buscar_abastecimientos_list', function(req, res, next){
	if(verificar(req.session.userData)){
    	var input = JSON.parse(JSON.stringify(req.body));
    	var clave = input.clave;
        var orden = input.orden.split('/')[1].replace('-',' ');
        var showPend = input.showPend;
        var cc_selected = input.cc_selected.split(',');
        var where = " WHERE (material.detalle LIKE '%"+clave+"%' OR abastecimiento.idoda LIKE '%"+clave+"%' OR cliente.sigla LIKE '%"+clave+"%')";
        var cc_cond = " ";
        if(showPend == 'true'){
            where += " AND abastecimiento.cantidad > abastecimiento.recibidos ";
        }
        if(cc_selected.length>0){
            for(var cc=0; cc <  cc_selected.length ; cc++){
            	if(cc_selected[cc] == 'all'){
                    cc_cond = " abastecimiento.cc LIKE '%%' OR";
                    break;
				}
				else{
                    cc_cond += " abastecimiento.cc LIKE '%"+cc_selected[cc]+"%' OR";
                }
            }
            cc_cond = cc_cond.substring(0, cc_cond.length-2);
            where = where +" AND ("+cc_cond+") ";
		}
        orden = orden.replace('-', ' ');
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select abastecimiento.*, coalesce(cuenta.detalle, 'NO DEFINIDO') as cuenta, material.*,oda.numoda, oda.creacion, cliente.sigla "+
	        		"from abastecimiento left join oda on oda.idoda=abastecimiento.idoda left join material on material.idmaterial=abastecimiento.idmaterial " +
					"left join cuenta on cuenta.cuenta = substring_index(abastecimiento.cc,'-',1) "+
	        		"left join cliente on cliente.idcliente=oda.idproveedor " + where + "ORDER BY "+orden,
                function(err, abs){
                    if(err) {throw err;}
                    else{
                    	res.render('abast/table_abastecimientos', {data: abs, key: orden.replace(' ', '-')});
                    }
            });
        });
    } else res.redirect("/bad_login");
});


router.post('/getOP_insu', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));

        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	//SELECT ordenproduccion.*,group_concat(material.detalle separator '@') as mat_token, group_concat(material.precio), group_concat(salidas.sum_sal) as sum_sal_token, group_concat(ingresos.sum_ing) as sum_ing_token FROM (select ops_abastecidas.idop, ops_abastecidas.idmaterial, sum(coalesce(ops_abastecidas.cantidad)) as sum_sal from ops_abastecidas where ops_abastecidas.ingreso = false and ops_abastecidas.cont=false group by ops_abastecidas.idmaterial) as salidas left join (select ops_abastecidas.idop, ops_abastecidas.idmaterial, sum(coalesce(ops_abastecidas.cantidad,0)) as sum_ing from ops_abastecidas where ops_abastecidas.ingreso = true and ops_abastecidas.cont = false group by ops_abastecidas.idmaterial) as ingresos on (ingresos.idop = salidas.idop AND ingresos.idmaterial = salidas.idmaterial) left join material on material.idmaterial=salidas.idmaterial left join ordenproduccion on ordenproduccion.idordenproduccion=ops_abastecidas.idop group by ordenproduccion.idordenproduccion;

        	connection.query("select ops_abastecidas.*,material.detalle,material.u_medida from ops_abastecidas left join material on material.idmaterial = ops_abastecidas.idmaterial where ops_abastecidas.idmaterial=? AND (ops_abastecidas.fecha  BETWEEN '"+input.token.split('@')[0]+" 00:00:00' AND '"+input.token.split('@')[1]+" 23:59:59')", [input.idmaterial] ,function(err, ops){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		console.log(ops);
        		res.render('abast/cierre_ops_table', {data: ops});	
        	});
        });
    } else res.redirect("/bad_login");
});

router.post('/getOP_fabricados', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);

        	connection.query("select ordenproduccion.idordenproduccion, material.detalle, produccion.cantidad, produccion.`8` as finalizado from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ordenproduccion on ordenproduccion.idordenproduccion=produccion.idordenproduccion left join material on material.idmaterial=fabricaciones.idmaterial where produccion.`8` > 0 AND produccion.idmaterial=?", [input.idmaterial] ,function(err, ops){
        		if(err)
        			console.log("Error Selecting : %s", err);
        		console.log(ops);
        		res.render('abast/cierre_ops_table', {data: ops});	
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/dev_ops_page/:page', function(req, res, next){
    if(verificar(req.session.userData)){
		var pagina = req.params.page-1;
		pagina = pagina*15;
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("SELECT ordenproduccion.*, min(produccion.cantidad = produccion.`8`+produccion.standby) as cerrado, group_concat(produccion.cantidad = produccion.`8`+produccion.standby) as cerrado_token , group_concat(material.detalle separator '@') "
    	 		+"as mats, group_concat(material.u_medida) as unid, group_concat(produccion.cantidad) as cants, group_concat(produccion.abastecidos) as abast"
    	 		+" FROM produccion LEFT JOIN ordenproduccion ON produccion.idordenproduccion=ordenproduccion.idordenproduccion"
    	 		+" LEFT JOIN fabricaciones ON fabricaciones.idfabricaciones=produccion.idfabricaciones LEFT JOIN material ON"
    	 		+" material.idmaterial=fabricaciones.idmaterial"+/* WHERE produccion.cantidad>produccion.abastecidos*/" WHERE ordenproduccion.fin=true GROUP BY produccion.idordenproduccion LIMIT "+pagina+",15",
        		function(err, odc){
        		if(err)
        			console.log("Error Selecting : %s", err);

        		res.render('abast/dev_ops_page', {data: odc});	
        		//res.render('login');
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/get_databom/:idop', function(req, res, next){
    if(verificar(req.session.userData)){
		var idop = req.params.idop;
		req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select  material.idmaterial, material.detalle, material.codigo,produccion.cantidad,group_concat(billof.idmaterial) as idmaterial_token,group_concat(billof.abast) as abast_token," +
						" group_concat(billof.stock) as stock, group_concat(billof.stock_i) as stocki, group_concat(billof.stock_c) as stockc, group_concat(billof.codigo separator '@') as code_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+
                        "select bom.idmaterial_master,material.idmaterial,material.stock_i,material.stock_c, material.detalle, material.stock,material.codigo,bom.cantidad,material.u_medida,bom.abast from bom left join material on material.idmaterial=bom.idmaterial_slave where bom.abast = false AND material.notbom=true order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
                        function(err, mats){
			        		if(err)
			        			console.log("Error Selecting : %s", err);
			        		console.log(mats);
			        		var aux = [];
			        		var array = [];
			        		var indice = 0;
			        		for(var y=0; y < mats.length; y++){
			        			if(mats[y].code_token){
                                    mats[y].abast_token = mats[y].abast_token.split(',');
                                    mats[y].idmaterial_token = mats[y].idmaterial_token.split(',');
                                    mats[y].code_token = mats[y].code_token.split('@');
                                    mats[y].componentes = mats[y].componentes.split('@');
                                    mats[y].cant_bom = mats[y].cant_bom.split(',');
                                    mats[y].u_bom = mats[y].u_bom.split(',');
                                    mats[y].stock = mats[y].stock.split(',');
                                    mats[y].stockc = mats[y].stockc.split(',');
				        			mats[y].stocki = mats[y].stocki.split(',');
				        			for(var t=0; t < mats[y].code_token.length; t++){
				        				indice = aux.indexOf(mats[y].code_token[t]);
				        				if(indice == -1){
				        					aux.push(mats[y].code_token[t]);
				        					array.push([mats[y].code_token[t], mats[y].componentes[t], mats[y].cant_bom[t]*mats[y].cantidad, mats[y].u_bom[t], mats[y].stock[t], mats[y].idmaterial_token[t], mats[y].abast_token[t],mats[y].stocki[t],mats[y].stockc[t]]);
				        				}
				        				else{
				        					array[indice][2] = array[indice][2] + (mats[y].cant_bom[t]*mats[y].cantidad);
				        				}
				        			}
			        			}
			        		}
			        		connection.query("SELECT * FROM ops_abastecidas WHERE idop = ?", [idop], function(err, ab){
			        			if(err)
			        				console.log("Error Selecting : %s", err);
			        			
			        			for(var y=0; y < ab.length; y++){
			        				for(var x=0; x < array.length; x++){
			        					if(array[x][5] == ab[y].idmaterial){
			        						if(ab[y].ingreso){
			        							array[x][2] = array[x][2] + ab[y].cantidad;
			        						}
			        						else{
			        							array[x][2] = array[x][2] - ab[y].cantidad;
			        						}	
			        					}
			        				}
			        			}
				        		res.render('abast/modal_bom_op', {data: array, idop: idop, abast: true});
			        		});
			        		//res.render('abast/modal_bom_op', {data: array, idop: idop, abast: true});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/get_databomdev/:idop', function(req, res, next){
    if(verificar(req.session.userData)){
		var idop = req.params.idop;
		req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select  material.detalle, material.codigo,produccion.cantidad,group_concat(billof.idmaterial) as idmaterial_token ,group_concat(billof.stock) as stock, group_concat(billof.codigo separator '@') as code_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master, material.idmaterial, material.detalle, material.stock,material.codigo,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
                        function(err, mats){
			        		if(err)
			        			console.log("Error Selecting : %s", err);

			        		var aux = [];
			        		var array = [];
			        		var indice = 0;
			        		for(var y=0; y < mats.length; y++){
			        			if(mats[y].code_token){
				        			mats[y].idmaterial_token = mats[y].idmaterial_token.split(',');
				        			mats[y].code_token = mats[y].code_token.split('@');
				        			mats[y].componentes = mats[y].componentes.split('@');
				        			mats[y].cant_bom = mats[y].cant_bom.split(',');
				        			mats[y].u_bom = mats[y].u_bom.split(',');
				        			mats[y].stock = mats[y].stock.split(',');
				        			for(var t=0; t < mats[y].code_token.length; t++){
				        				indice = aux.indexOf(mats[y].code_token[t]);
				        				if(indice == -1){
				        					aux.push(mats[y].code_token[t]);
				        					array.push([mats[y].code_token[t], mats[y].componentes[t],/*mats[y].cant_bom[t]*mats[y].cantidad*/0, mats[y].u_bom[t], mats[y].stock[t], mats[y].idmaterial_token[t],mats[y].cant_bom[t]*mats[y].cantidad]);
				        				}
				        				else{
				        					array[indice][6] = array[indice][6] + (mats[y].cant_bom[t]*mats[y].cantidad);
				        				}
				        			}
			        			}
			        		}
			        		connection.query("SELECT * FROM ops_abastecidas WHERE idop = ?", [idop], function(err, ab){
			        			if(err)
			        				console.log("Error Selecting : %s", err);
			        			console.log(ab);
			        			console.log(array);
			        			for(var y=0; y < ab.length; y++){
			        				for(var x=0; x < array.length; x++){
			        					if(array[x][5] == ab[y].idmaterial){
			        						if(ab[y].ingreso){
			        							array[x][2] = array[x][2] - ab[y].cantidad;
			        						}
			        						else{
			        							array[x][2] = array[x][2] + ab[y].cantidad;
			        						}	
			        					}
			        				}
			        			}
			        			console.log(array);			        				
				        		res.render('abast/modal_bom_op', {data: array, idop: idop, abast: false});
			        		});
			        		
        	});
        });
    } else res.redirect("/bad_login");
});

router.post('/desp_matp', function(req, res, next) {
	if(verificar(req.session.userData)){
        var data = JSON.parse(JSON.stringify(req.body));
		console.log(data);
		var idop = data['datos[0][]'];
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query(/*"select  material.detalle, material.codigo,produccion.cantidad,group_concat(billof.stock) as stock, group_concat(billof.idmaterial) as id_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master, material.detalle, material.stock,material.codigo,material.idmaterial,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by material.idmaterial"*/
                        "select  material.detalle, material.codigo,produccion.cantidad,group_concat(billof.stock) as stock, group_concat(billof.idmaterial) as id_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master,material.idmaterial, material.detalle, material.stock,material.codigo,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
                        function(err, mats){
			        		if(err)
			        			console.log("Error Selecting : %s", err);
			        		


			        		var aux = [];
			        		var array = [];
			        		var indice = 0;
			        		
							for(var t=1; t < Object.keys(data).length; t++){
								array.push([data["datos["+t+"][]"][0],data["datos["+t+"][]"][1]]);
							
							}
							console.log(array);
			        		/*for(var y=0; y < mats.length; y++){
			        			if(mats[y].id_token){
				        			mats[y].id_token = mats[y].id_token.split(',');
				        			mats[y].componentes = mats[y].componentes.split('@');
				        			mats[y].cant_bom = mats[y].cant_bom.split(',');
				        			for(var t=0; t < mats[y].id_token.length; t++){
				        				indice = aux.indexOf(mats[y].id_token[t]);
				        				if(indice == -1){
				        					aux.push(mats[y].id_token[t]);
				        					array.push([mats[y].id_token[t], mats[y].componentes[t], mats[y].cant_bom[t]*mats[y].cantidad]);
				        				}
				        				else{
				        					array[indice][2] = array[indice][2] + (mats[y].cant_bom[t]*mats[y].cantidad);
				        				}
				        			}
			        			}
			        		}*/
			        		var abasteciendo = [];
			        		var query = "UPDATE material SET stock = CASE ";
							var where = "WHERE idmaterial IN (";
							for(var t=0; t < array.length; t++){
								query += "WHEN idmaterial = "+array[t][0]+" THEN stock - "+array[t][1]+" ";
								where += array[t][0]+",";
								if(array[t][1]!=0){
									abasteciendo.push([idop, array[t][0], array[t][1], false]); 
								}
							}
							query += "ELSE stock END ";
							where = where.substring(0, where.length-1) + ")";
							query = query +  where;
							console.log(query);
							connection.query(query, function(err, que){
								if(err)
									console.log("Error Selecting : %s", err);
								/*connection.query("UPDATE produccion SET abastecidos=cantidad WHERE idordenproduccion=?",[idop], function(err, upd){
									if(err)
										console.log("Error Selecting : %s", err);
	
									res.redirect('/abastecimiento/abast_ops');
								});*/
								connection.query("INSERT INTO ops_abastecidas (idop, idmaterial, cantidad, ingreso) VALUES ?", [abasteciendo], function(err, abastIn){
									if(err)
										console.log("Error Selecting : %s", err);

									res.redirect('/abastecimiento/abast_ops');
								});
								/*connection.query("UPDATE produccion SET abastecidos=cantidad WHERE idordenproduccion=?",[idop], function(err, upd){
									if(err)
										console.log("Error Selecting : %s", err);
	
									res.redirect('/abastecimiento/abast_ops');
								});*/
							});
			        		//res.render('abast/modal_bom_op', {data: array, idop: idop});
        	});

		});
    }
	else{res.redirect('bad_login');}	
});

router.get('/close_op/:idop', function(req,res,next){
	if(verificar(req.session.userData)){
		var id = req.params.idop;
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Selecting : %s" ,err);

			connection.query("UPDATE ordenproduccion SET fin = true WHERE idordenproduccion = ?", [id], function(err, op){
				if(err){
					console.log("Error Selecting : %s", err);
					res.send('error');
				}
				else{	
					res.redirect('/abastecimiento/abast_ops');
				}
			});
		});
	}
	else{
		res.redirect('bad_login');
	}
});

router.post('/cerrar_op_mes', function(req,res,next){
	if(verificar(req.session.userData)){
		var token = JSON.parse(JSON.stringify(req.body)).token;
		console.log(token);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Selecting : %s" ,err);

			var phantom = require('phantom');   
                phantom.create().then(function(ph) {
                    ph.createPage().then(function(page) {
                        page.open("http://localhost:4300/abastecimiento/view_gastopdf_get/"+token).then(function(status) {
                            page.render('routes/gastos/gasto'+token.split('@')[0].split("-")[0]+"-"+token.split('@')[0].split("-")[1]+'.pdf').then(function() {
                                console.log('Page Rendered');
                                ph.exit();
                                var fs = require('fs');
                                var filePath = '\\gastos\\gasto'+token.split('@')[0].split("-")[0]+"-"+token.split('@')[0].split("-")[1]+'.pdf';
                                console.log(__dirname + filePath);
                                fs.readFile(__dirname + filePath , function (err,data){
                                    res.contentType("application/pdf");
                                    console.log(data);
                                    res.redirect('/abastecimiento/update_opsabastecidas/'+token);
										
                                    //res.send(data);
                                });
                                //res.send('/Users/dagui/Desktop/siderval/pdfs/odc'+oda[0].numoda+'-'+oda[0].idoda+'.pdf');
                                //res.redirect("/plan/view_ordenpdf_get/"+oda[0].idoda);
                            });
                        });
                    });
                });			

			
		});
	}
	else{
		res.redirect('bad_login');
	}
});

router.get('/update_opsabastecidas/:token', function(req,res,next){
	if(verificar(req.session.userData)){
		var token = req.params.token;
		console.log(token);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Selecting : %s" ,err);
			connection.query("UPDATE ops_abastecidas SET cont = true WHERE cont = false AND (fecha BETWEEN '"+token.split('@')[0]+" 00:00:00' AND '"+token.split('@')[1]+" 23:59:59')", function(err, op){
										if(err){
											console.log("Error Selecting : %s", err);
											res.send('error');
										}
										else{
											console.log(op);	
											res.send('gasto'+token.split('@')[0].split("-")[0]+"-"+token.split('@')[0].split("-")[1]);
											//res.redirect('/abastecimiento/show_pdf_cierre/gasto'+token.split('@')[0].split("-")[0]+"-"+token.split('@')[0].split("-")[1]);
										
										}
									});
		});
	}
	else{
		res.redirect('bad_login');
	}
});

router.get('/show_pdf_cierre/:token', function(req,res,next){
      var fs = require('fs');
      var token = req.params.token;
      var filePath = '\\gastos\\'+token+'.pdf';
      console.log(__dirname + filePath);
      fs.readFile(__dirname + filePath , function (err,data){
          res.contentType("application/pdf");
          res.send(data);
      });
                     
});

router.get('/view_gastopdf_get/:token', function(req,res,next){
		var token = req.params.token;
		console.log(token);
		console.log(req.session.userData);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Selecting : %s" ,err);

			connection.query("SELECT material.idmaterial,material.detalle,material.precio,salidas.sum_sal,coalesce(ingresos.sum_ing,0) as sum_ing,material.u_medida FROM (select ops_abastecidas.idop, ops_abastecidas.idmaterial, sum(ops_abastecidas.cantidad) as sum_sal from ops_abastecidas where ops_abastecidas.ingreso = false and ops_abastecidas.cont = false AND ops_abastecidas.fecha BETWEEN '"+token.split('@')[0]+" 00:00:00' AND '"+token.split('@')[1]+" 23:59:59' group by ops_abastecidas.idmaterial) as salidas left join (select ops_abastecidas.idop, ops_abastecidas.idmaterial, sum(ops_abastecidas.cantidad) as sum_ing from ops_abastecidas where ops_abastecidas.ingreso = true and ops_abastecidas.cont = false AND ops_abastecidas.fecha BETWEEN '"+token.split('@')[0]+" 00:00:00' AND '"+token.split('@')[1]+" 23:59:59' group by ops_abastecidas.idmaterial) as ingresos on (ingresos.idmaterial = salidas.idmaterial) left join material on material.idmaterial=salidas.idmaterial",function(err, info){
				if(err)
					console.log("Error Selecting : %s", err);
				console.log(info);
				res.render('abast/pdf_gastos_vistas', {data: info, mes: token});
			});
			
		});
	
});

router.post('/dev_matp', function(req, res, next) {
	if(verificar(req.session.userData)){
		var data = JSON.parse(JSON.stringify(req.body));
		console.log(data);
		var idop = data['datos[0][]'];
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query(/*"select  material.detalle, material.codigo,produccion.cantidad,group_concat(billof.stock) as stock, group_concat(billof.idmaterial) as id_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master, material.detalle, material.stock,material.codigo,material.idmaterial,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by material.idmaterial"*/
                        "select  material.detalle, material.codigo,produccion.cantidad,group_concat(billof.stock) as stock, group_concat(billof.idmaterial) as id_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master,material.idmaterial, material.detalle, material.stock,material.codigo,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
                        function(err, mats){
			        		if(err)
			        			console.log("Error Selecting : %s", err);
			        		


			        		var aux = [];
			        		var array = [];
			        		var indice = 0;
			        		
							for(var t=1; t < Object.keys(data).length; t++){
								array.push([data["datos["+t+"][]"][0],data["datos["+t+"][]"][1]]);
							
							}
							console.log(array);
			        		/*for(var y=0; y < mats.length; y++){
			        			if(mats[y].id_token){
				        			mats[y].id_token = mats[y].id_token.split(',');
				        			mats[y].componentes = mats[y].componentes.split('@');
				        			mats[y].cant_bom = mats[y].cant_bom.split(',');
				        			for(var t=0; t < mats[y].id_token.length; t++){
				        				indice = aux.indexOf(mats[y].id_token[t]);
				        				if(indice == -1){
				        					aux.push(mats[y].id_token[t]);
				        					array.push([mats[y].id_token[t], mats[y].componentes[t], mats[y].cant_bom[t]*mats[y].cantidad]);
				        				}
				        				else{
				        					array[indice][2] = array[indice][2] + (mats[y].cant_bom[t]*mats[y].cantidad);
				        				}
				        			}
			        			}
			        		}*/
			        		var abasteciendo = [];
			        		var query = "UPDATE material SET stock = CASE ";
							var where = "WHERE idmaterial IN (";
							for(var t=0; t < array.length; t++){
								query += "WHEN idmaterial = "+array[t][0]+" THEN stock + "+array[t][1]+" ";
								where += array[t][0]+",";
								if(array[t][1]!=0){
									abasteciendo.push([idop, array[t][0], array[t][1], true]); 
								}
							}
							query += "ELSE stock END ";
							where = where.substring(0, where.length-1) + ")";
							query = query +  where;
							console.log(query);
							connection.query(query, function(err, que){
								if(err)
									console.log("Error Selecting : %s", err);
								
								connection.query("INSERT INTO ops_abastecidas (idop, idmaterial, cantidad, ingreso) VALUES ?", [abasteciendo], function(err, abastIn){
									if(err)
										console.log("Error Selecting : %s", err);

									console.log(abastIn);
									
									res.redirect('/abastecimiento/abast_ops');
									//res.redirect('/abastecimiento/close_op/'+idop);
								});
								/*connection.query("UPDATE produccion SET abastecidos=cantidad WHERE idordenproduccion=?",[idop], function(err, upd){
									if(err)
										console.log("Error Selecting : %s", err);
	
									res.redirect('/abastecimiento/abast_ops');
								});*/
							});
			        		//res.render('abast/modal_bom_op', {data: array, idop: idop});
        	});

		});
        /*var idop = JSON.parse(JSON.stringify(req.body)).idop;
        console.log(idop);
		req.getConnection(function(err, connection){
			if(err)
				console.log("Error Connection : %s", err);
			connection.query("select  material.detalle, material.codigo,produccion.cantidad,group_concat(billof.stock) as stock, group_concat(billof.idmaterial) as id_token,group_concat(billof.detalle separator '@') as componentes, group_concat(billof.cantidad) as cant_bom, group_concat(billof.u_medida) as u_bom from produccion left join fabricaciones on fabricaciones.idfabricaciones=produccion.idfabricaciones left join ("+                
                        "select bom.idmaterial_master, material.idmaterial,material.detalle, material.stock,material.codigo,bom.cantidad,material.u_medida from bom left join material on material.idmaterial=bom.idmaterial_slave order by bom.idmaterial_master)"+
                        "as billof on billof.idmaterial_master=fabricaciones.idmaterial left join material on material.idmaterial=fabricaciones.idmaterial where produccion.idordenproduccion=? group by produccion.idproduccion", [idop], 
                        function(err, mats){
			        		if(err)
			        			console.log("Error Selecting : %s", err);
			        		console.log(mats);
			        		var aux = [];
			        		var array = [];
			        		var indice = 0;
			        		for(var y=0; y < mats.length; y++){
			        			if(mats[y].id_token){
				        			mats[y].id_token = mats[y].id_token.split(',');
				        			mats[y].componentes = mats[y].componentes.split('@');
				        			mats[y].cant_bom = mats[y].cant_bom.split(',');
				        			for(var t=0; t < mats[y].id_token.length; t++){
				        				indice = aux.indexOf(mats[y].id_token[t]);
				        				if(indice == -1){
				        					aux.push(mats[y].id_token[t]);
				        					array.push([mats[y].id_token[t], mats[y].componentes[t], mats[y].cant_bom[t]*mats[y].cantidad]);
				        				}
				        				else{
				        					array[indice][2] = array[indice][2] + (mats[y].cant_bom[t]*mats[y].cantidad);
				        				}
				        			}
			        			}
			        		}
			        		console.log(array);
			        		var query = "UPDATE material SET stock = CASE ";
							var where = "WHERE idmaterial IN (";
							for(var t=0; t < array.length; t++){
								query += "WHEN idmaterial = "+array[t][0]+" THEN stock + "+array[t][2]+" ";
								where += array[t][0]+","; 
							}
							query += "ELSE stock END ";
							where = where.substring(0, where.length-1) + ")";
							query = query +  where;
							console.log(query);
							connection.query(query, function(err, que){
								if(err)
									console.log("Error Selecting : %s", err);
								connection.query("UPDATE produccion SET abastecidos=0 WHERE idordenproduccion=?",[idop], function(err, upd){
									if(err)
										console.log("Error Selecting : %s", err);
	
									res.redirect('/abastecimiento/abast_ops');
								});
							});
			});

		});*/
    }
	else{res.redirect('bad_login');}	
});

router.get("/xlsx_stock", function(req, res, next){
    if(verificar(req.session.userData)){
        var Excel = require('exceljs');
        var workbook = new Excel.Workbook();
        var sheet = workbook.addWorksheet('stockmaster');
        var ident  = new Date().toLocaleDateString().replace(' ','');
        ident = ident.replace('/','');
        ident = ident.replace(':','');
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
            connection.query("SELECT * FROM material WHERE tipo = 'I' OR tipo = 'M' OR tipo = 'O'",function(err, rows)
                {

                    if (err)
                        console.log("Error Select : %s ",err );
                    if(rows.length>0){
                        var nombre = 'csvs/master_stock_' + ident + '.xlsx';
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
								res.send('/csvs/master_stock_'+ ident + '.xlsx');

							});
                    }

                });
        });
    }
    else res.redirect('/bad_login');
});

router.get('/setear_bom', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var recha = [];
        var csvWriter = require('csv-write-stream');
        var writer = csvWriter({ headers: ["Codigo","Detalle"]});
        var fs = require('fs');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var data = [];
                for(var i=1; i < rows.length; i++){
                	//codigo master 	codigo insumo    cantidad 		tipo	detalle insumo
                	data.push([rows[i][0], rows[i][3], rows[i][4] , 1, rows[i][2]]);
                }
                req.getConnection(function(err, connection){
                	if(err) console.log("Error Connection : %s", err);

                	connection.query("SELECT * FROM material", function(err, mats){
                		if(err)
                			console.log("Error Selecting : %s", err);
                		for(var t=0; t < mats.length; t++){
                			for(var r=0; r < data.length; r++){
                				if(data[r][0] == mats[t].codigo){
                					data[r][0] = mats[t].idmaterial;
                				}
                				if(data[r][1] == mats[t].codigo){
                					data[r][1] = mats[t].idmaterial;
                				}
                				else if(data[r][1] == '#N/A' || data[r][1] == '0.0' || data[r][1] == '0' || !data[r][2]){
                					//recha.push(data[r]);
                					data.splice(r, 1);
                					r--;
                				}
                			}
                		}
                		connection.query("SELECT * FROM producido", function(err, prod){
                			if(err) console.log("Error Selecting : %s", err);
                			for(var e=0; e < prod.length; e++){
                				for(var w=0; w < data.length; w++){
                					if(prod[e].idmaterial == data[w][0]){
                						data[w][3] = prod[e].idproducto;
                					}
                				}

                			}
                			//console.log(data);
                			for(var f=0; f < data.length; f++){
                				if(typeof data[f][1] == 'string' || data[f][0] == ''){
                					recha.push(data[f]);
                					data.splice(f, 1);
                					f--;
                				}
                				else{
                					data[f].splice(4,1);
                				}
                			}
                			//console.log("Rechazados: "+recha.length);
                			//console.log("Pasados: "+data.length);
                			console.log(recha);
                			//console.log(data);
                			connection.query("INSERT IGNORE INTO bom (idmaterial_master, idmaterial_slave, cantidad, idproducto) VALUES ?", [data], function(err, bom){
                					if(err)
                						console.log("Error Selecting :%s", err);
                					console.log("ok");
                					//console.log(bom);
                					writer.pipe(fs.createWriteStream('public/csvs/sinregistro1.csv'));
                        			for(var t=0; t < recha.length; t++){
                                		writer.write([recha[t][1], recha[t][4]]);
                        			}
			                        writer.end();
                				});

                			
                		} );
                	});
                });
                

            });
        var input = fs.createReadStream('public/csvs/bom4.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/parsecsv_bom', function(req, res, next){
    if(req.session.isUserLogged){
        var parse = require('csv-parse');
        var fs = require('fs');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var data = [];
                for(var i=1; i < rows.length; i++){
                	//codigo master 	codigo insumo    cantidad 		tipo	detalle insumo
                	data.push([rows[i][0], rows[i][2], rows[i][4] , 1]);
                }
                req.getConnection(function(err, connection){
                	if(err) console.log("Error Connection : %s", err);

                	connection.query("SELECT * FROM material", function(err, mats){
                		if(err)
                			console.log("Error Selecting : %s", err);
                		for(var t=0; t < mats.length; t++){
                			for(var r=0; r < data.length; r++){
                				if(data[r][0] == mats[t].codigo){
                					data[r][0] = mats[t].idmaterial;
                				}
                				if(data[r][1] == mats[t].codigo){
                					data[r][1] = mats[t].idmaterial;
                				}
                			}
                		}
                		connection.query("SELECT * FROM producido", function(err, prod){
                			if(err) console.log("Error Selecting : %s", err);
                			for(var e=0; e < prod.length; e++){
                				for(var w=0; w < data.length; w++){
                					if(prod[e].idmaterial == data[w][0]){
                						data[w][3] = prod[e].idproducto;
                					}
                				}

                			}
                			console.log(data);
                			
                			connection.query("INSERT IGNORE INTO bom (idmaterial_master, idmaterial_slave, cantidad, idproducto) VALUES ?", [data], function(err, bom){
                					if(err)
                						console.log("Error Selecting :%s", err);
                					console.log(bom);
                					res.redirect("/abastecimiento");
                			});

                			
                		} );
                	});
                });
                

            });
        var input = fs.createReadStream('csvs/newBD/boms.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.get('/fix_unidades', function(req, res, next){
    if(req.session.isUserLogged){
        var fs = require('fs')
        var parse = require('csv-parse');
        var parser = parse(
            function(err,rows){
                if(err) throw err;
                var data = [];
                for(var i=1; i < rows.length; i++){
                	//			Detalle  	Codigo     Unidad
                	data.push([rows[i][0], rows[i][1], rows[i][2]]);
                }
                var uni = [];
                req.getConnection(function(err, connection){
                	if(err) console.log("Error Connection : %s", err);

                	connection.query("SELECT * FROM material", function(err, mats){
                		if(err)
                			console.log("Error Selecting : %s", err);
                		
                		for(var r=0; r < data.length; r++){
                			for(var y=0; y < mats.length; y++){
                				if(data[r][1] == mats[y].codigo){
                					uni.push([mats[y].idmaterial, data[r][2]]);
                				}
                			}
                		}
                		console.log(uni);
                		var query = "UPDATE material SET u_medida = CASE ";
						var where = "WHERE idmaterial IN (";
						for(var t=0; t < uni.length; t++){
							query += 'WHEN idmaterial = '+uni[t][0]+" THEN '"+uni[t][1]+"' ";
							where += uni[t][0]+","; 
						}
						query += "ELSE u_medida END ";
						where = where.substring(0, where.length-1) + ")";
						query = query +  where;
						console.log(query);
							connection.query(query, function(err, up){
								if(err){
									console.log("Error Selecting : %s", err);
								}
								console.log(up);
								res.redirect('/abastecimiento');	
									
							});
                		});
                	});
                });
                
        var input = fs.createReadStream('unidades.csv');
        input.pipe(parser);

        /*input.pipe(parse(function(err, rows){
            if(err) throw err;
            console.log(rows);
        }));*/

    } else res.redirect("/bad_login");
});

router.post('/search_oc_prec', function(req, res, next){
    if(req.session.isUserLogged){
        var num = JSON.parse(JSON.stringify(req.body)).info;
        console.log(num);
        req.getConnection(function(err,connection){
        	if(err)
        		console.log("Error Connection : %s", err);
			connection.query("SELECT * FROM (select oda.numoda,oda.creacion,oda.tokenoda,oda.idoda,abastecimiento.cantidad>abastecimiento.recibidos as incompleta_rec, oda.numfac,cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat,"
        		+" group_concat(material.detalle separator '@') as matd, group_concat(coalesce(material.u_medida,'und') ) as umed,"
        		+"group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant, group_concat(abastecimiento.recibidos) as reci, group_concat(abastecimiento.costo) as cost,min(abastecimiento.facturado) as full_facturado from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material"
        		+" on abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente=oda.idproveedor "+/*where abastecimiento.cantidad>abastecimiento.recibidos*/"group by oda.idoda) as definer where (definer.numoda LIKE '%"+num+"%' OR definer.sigla LIKE '%"+num+"%' OR definer.matd LIKE '%"+num+"%')",
        		function(err, odc){
        			if(err)
        				console.log("Error Selecting : %s", err);
        			console.log(odc);
        			res.render('abast/recieved_ped_page', {data: odc, recepcionar: true});
        	});
        });
    } else res.redirect("/bad_login");
});

router.post('/search_oc_dev', function(req, res, next){
    if(req.session.isUserLogged){
        var num = JSON.parse(JSON.stringify(req.body)).info;
    	console.log(num);
    	req.getConnection(function(err,connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("SELECT * FROM (select oda.numoda,oda.creacion,oda.idoda,oda.numfac,cliente.sigla, cliente.razon,group_concat(material.idmaterial) as idmat,"
        		+" group_concat(material.detalle separator '@') as matd, group_concat(material.u_medida) as umed,"
        		+"group_concat(abastecimiento.cantidad - abastecimiento.recibidos) as xrec,group_concat(abastecimiento.cantidad)"
        		+" as cant, group_concat(abastecimiento.recibidos) as reci from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material"
        		+" on abastecimiento.idmaterial=material.idmaterial left join cliente on cliente.idcliente=oda.idproveedor where abastecimiento.cantidad=abastecimiento.recibidos  group by oda.idoda) as definer where (definer.numoda LIKE '%"+num+"%' OR definer.sigla LIKE '%"+num+"%' OR definer.matd LIKE '%"+num+"%' OR definer.numfac LIKE '%"+num+"%' )", function(err, odc){
        			if(err)
        				console.log("Error Selecting : %s", err);

        			res.render('abast/recieved_ped_page', {data: odc, recepcionar: false});
        		});
        });
    } else res.redirect("/bad_login");
});

router.post('/set_factura', function(req, res, next){
    if(req.session.isUserLogged){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
    	req.getConnection(function(err,connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("UPDATE oda SET numfac = ? WHERE idoda = ?",[input.numfac, input.idoda], function(err, odc){
        			if(err)
        				console.log("Error Selecting : %s", err);

        			res.redirect('/abastecimiento/view_odc_page/1');
        		});
        });
    } else res.redirect("/bad_login");
});

router.post('/stock_info', function(req, res, next){
    if(req.session.isUserLogged){
        var num = JSON.parse(JSON.stringify(req.body)).info;
    	console.log(num);
    	req.getConnection(function(err,connection){
        	if(err)
        		console.log("Error Connection : %s", err);

        	connection.query("select idop, group_concat(ops_abastecidas.idmaterial) as idmaterial_token, group_concat(ops_abastecidas.cantidad) as cant_token, group_concat(ops_abastecidas.fecha separator '@') as fecha_token, group_concat(ops_abastecidas.ingreso) as in_token from ops_abastecidas group by ops_abastecidas.idop;", function(err, info){
        			if(err)
        				console.log("Error Selecting : %s", err);

        			console.log(info);

        			res.render('abast/stock_info', {info: info});
        		});
        });
    } else res.redirect("/bad_login");
});

router.get('/gdd_proveedores', function(req, res, next){
    if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("select ingreso.*, oda.numoda, cliente.razon, cliente.giro from ingreso left join oda on oda.idoda = ingreso.idoda left join cliente on cliente.idcliente=oda.idproveedor ORDER BY ingreso.fecha desc",
        		function(err, gdd){
        		if(err)
        			console.log("Error Selecting : %s", err);


        		//console.log(gdd);
        		res.render('abast/guias_proveedores', {gdd: gdd});
        	});
        });
    } else res.redirect("/bad_login");
});

router.post('/search_gdd_proveedores', function(req, res, next){
    if(verificar(req.session.userData)){
        var info = JSON.parse(JSON.stringify(req.body)).info;
        console.log(info);
		req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("SELECT * FROM (select ingreso.*, oda.numoda, cliente.razon, cliente.giro,cliente.sigla from ingreso left join oda on oda.idoda = ingreso.idoda left join cliente on cliente.idcliente=oda.idproveedor ORDER BY ingreso.fecha desc) as definer" +
				" WHERE (definer.numgdd LIKE '%"+info+"%' OR definer.numoda LIKE '%"+info+"%' OR definer.sigla LIKE '%"+info+"%' OR definer.mat_token = '%"+info+"%')",
        		function(err, gdd){
        		if(err)
        			console.log("Error Selecting : %s", err);

        		console.log(gdd);
        		res.render('abast/guias_proveedores', {gdd: gdd});
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/virtual_bd', function(req, res, next){
    if(verificar(req.session.userData)){
        req.getConnection(function(err, connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	connection.query("",
        		function(err, gdd){
        		if(err)
        			console.log("Error Selecting : %s", err);


        		console.log(gdd);
        		res.render('abast/bodega_virtual');
        	});
        });
    } else res.redirect("/bad_login");
});

router.get('/all_proveedores', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("select cliente.*,coalesce(queryodc.odcs,0) as odcs from cliente inner join (select oda.idproveedor, count(oda.idproveedor) as odcs from oda group by oda.idproveedor) as queryodc on queryodc.idproveedor=cliente.idcliente",
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            //console.log(client);
                            res.render('abast/proveedor_list',{largo: client.length});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.get('/pag_proveedores/:pagina', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            var pagina = (req.params.pagina-1) ;
            pagina = pagina*15;
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("select cliente.*,coalesce(queryodc.odcs,0) as odcs from cliente inner join (select oda.idproveedor, count(oda.idproveedor) as odcs from oda group by oda.idproveedor) as queryodc on queryodc.idproveedor=cliente.idcliente order by cliente.sigla asc limit "+pagina+",15",
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            //console.log(client);
                            res.render('abast/proveedor_page',{data: client});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.get('/search_proveedor/:key', function(req, res, next){
    if(verificar(req.session.userData)){
        if(req.session.isUserLogged){
            console.log(req.params);
            var key = req.params.key;

            console.log(key);
            var where = " WHERE cliente.sigla LIKE '%"+key+"%' OR cliente.razon LIKE '%"+key+"%' OR cliente.giro LIKE '%"+key+"%' OR cliente.rut LIKE '%"+key+"%'";
            req.getConnection(function(err,connection){
                if(err) console.log("Connection Error: %s",err);
                connection.query("select cliente.*,coalesce(queryodc.odcs,0) as odcs from cliente inner join"
                	+" (select oda.idproveedor, count(oda.idproveedor) as odcs from oda"
                	+" group by oda.idproveedor) as queryodc on queryodc.idproveedor=cliente.idcliente"+where,
                        function (err,client){
                            if(err) console.log("Select Error: %s",err);
                        
                            //console.log(client);
                            res.render('abast/proveedor_page',{data: client});
                });
            });
        } else res.redirect("/bad_login");
    }
    else{res.redirect('bad_login');}

});

router.post('/newoc_ped', function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        if(input.desc == '' || input.desc == undefined){
        	input.desc = 0;
        }
        if(input.exento == undefined){
        	input.exento = 'off';
        }
        var array=[];
        var token = input.obs+"@"+input.dest+"@"+input.plae+"@"+input.pag+"@"+input.entr+"@"+input.cuent+"@"+input.money+"@off@"+input.desc;
        var idprov = input.prov;
        var where = " WHERE";

	    for(var y=0; y < input.idped.split('@').length; y++){
        	where += " pedido.idpedido = "+input.idped.split('@')[y]+" OR";
        }
        where = where.substring(0, where.length - 2 );
        req.getConnection(function(err,connection){
        	if(err)
        		console.log("Error Connection : %s", err);
        	
        	connection.query("INSERT INTO oda (numoda, idproveedor, tokenoda) VALUES (?,?,?)", [input.nrodc, idprov, token], 
        		function(err, odc){
        			if(err)
        				console.log("Error Selecting : %s", err);
        			
        			connection.query("SELECT * FROM pedido "+where, function(err, mats){
        				if(err)
        					console.log("Error Selecting : %s", err);
        				console.log(mats);
        				var idorden = mats[0].idodc;
        				var idODC = odc.insertId;
        				if(mats.length>0){
		        			for(var e=0; e < mats.length; e++){
		        				for(var w=0; w < input.idped.split("@").length; w++){
		        					if(input.idped.split("@")[w]==mats[e].idpedido){
		        						if(input.ex_iva.split('@')[w] == 'on'){
		        							array.push([odc.insertId,mats[e].idmaterial,mats[e].cantidad, input.costo.split("@")[w].replace(',','.'), true, input.centroc.split('@')[w]]);
		        						}
		        						else{
		        							array.push([odc.insertId,mats[e].idmaterial,mats[e].cantidad, input.costo.split("@")[w].replace(',','.'), false, input.centroc.split('@')[w]]);
		        						}
		        					}
		        				}
		        			}
	        			}
	        			console.log(array);
	        			connection.query("INSERT INTO abastecimiento (idoda, idmaterial, cantidad, costo, exento, cc) VALUES ?", [array], function(err, ped){
	        				if(err){
	        					console.log("Error Selecting : %s", err);
	        					res.send('error');
	        				}
	        				else{
	        					/*
								UPDATE `table` SET `uid` = CASE
								    WHEN id = 1 THEN 2952
								    WHEN id = 2 THEN 4925
								    WHEN id = 3 THEN 1592
								    ELSE `uid`
								    END
								WHERE id  in (1,2,3)
	        					*/
	        					var wh = " WHERE"
						        for(var y=0; y < input.idped.split('@').length; y++){
						        	wh += " idpedido="+input.idped.split('@')[y]+" OR";
						        }
						        wh = wh.substring(0,wh.length-2);
	        					console.log(wh);
	        					connection.query("UPDATE pedido SET idproveedor = ? "+wh, [odc.insertId], function(err, upData){
	        						if(err)
	        							console.log("Error Selecting :%s", err);
	        						console.log(upData);
	        						//res.redirect('/abastecimiento/comprobar_notificaciones/'+idorden);

		        					res.send(idorden+'@'+idODC);
	        					});
	        				}
	        			});

        			});

        			
        		});
        });
      	
    } else res.redirect("/bad_login");
});

router.get('/comprobar_notificaciones/:idorden', function(req, res, next){
	req.getConnection(function(err, connection){
		if(err)
			console.log("Error Selecting : %s", err);
		connection.query("SELECT * FROM notificacion WHERE substring_index(substring_index"
			+"(descripcion, '@', 2),'@',-1) = ?", [req.params.idorden], function(err, not){
				if(err)
					console.log("Error Selecting : %s", err);

				//console.log(not);
				connection.query("SELECT notificacion.*,pedido.*, "
					+"odc.numoc FROM notificacion left join odc on "
					+"odc.idodc = substring_index(substring_index"
					+"(descripcion, '@', 2),'@',-1) LEFT JOIN pedido "
					+"ON pedido.idodc = odc.idodc WHERE descripcion "
					+"LIKE 'aoc@%' AND odc.idodc = ? AND pedido.externo=true AND pedido.idproveedor = 0",
					[req.params.idorden], function(err, notif){
					if(err)
						console.log("Error Selecting : %s", err);
					//console.log("notif");
					//console.log(notif);
					if(notif.length==0){
						connection.query("UPDATE notificacion SET active = false WHERE idnotificacion = ?", [not[0].idnotificacion],
							function(err, upNot){
								if(err)
									console.log("Error Update : %s", err);
								
								//console.log(upNot);
								res.redirect('/abastecimiento/notif_abast');

							});
					}
					else{
						res.redirect('/abastecimiento/notif_abast');
					}

				});
			});
		
	});
});
//La verdad es que esta funcion se puede simplificar, no requiere tantos query
//SI SE PUEDE SIMPLIFICAR... POR ESO SON MUY PERO MUY PERO MUY IMPORTANTES LOS "LEFT JOINS" EN SQL
router.get('/get_factura/:idfact', function(req, res, next) {
	req.getConnection(function(err, connection) {
		if(err) console.log("Error Selecting : %s", err);
		connection.query('SELECT * FROM factura WHERE idfactura = ?', [req.params.idfact], function (err, factura) {
			connection.query('SELECT * FROM facturacion WHERE idfactura = ?',[req.params.idfact], function (err, factcion) {
				connection.query('SELECT facturacion.*,material.detalle, material.codigo FROM facturacion LEFT JOIN abastecimiento ON facturacion.idabast = abastecimiento.idabast LEFT JOIN material ON abastecimiento.idmaterial = material.idmaterial WHERE idfactura = ?'
                    ,[factura[0].idfactura], function(err, mats) {
					if (err) console.log('We got an error! - '+err);
					res.render('abast/modal_factura', {factura: factura, factcion: factcion, mats: mats});
				});
            });
        });
    });
});


router.get('/get_guiaAbast/:idgd', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        connection.query('SELECT recepcion.fecha, recepcion.numgd ,material.detalle, material.u_medida,'
					+'abastecimiento.cantidad as solicitados , recepcion_detalle.cantidad FROM recepcion_detalle '
					+'LEFT JOIN recepcion ON recepcion.idrecepcion = recepcion_detalle.idrecepcion '
					+'LEFT JOIN abastecimiento ON abastecimiento.idabast=recepcion_detalle.idabast '
					+'LEFT JOIN material ON material.idmaterial=abastecimiento.idmaterial WHERE recepcion.idrecepcion = ?', [req.params.idgd], function (err, guia) {
	        	if (err) console.log('We got an error! - '+err);
	        	res.render('abast/modal_gd', {guia: guia, info: [guia[0].fecha, guia[0].numgd, guia[0].razon] });

        });
    });
});

router.post('/new_cliente/', function (req, res, next) {
    var input = JSON.parse(JSON.stringify(req.body));
    console.log(input);
	req.getConnection(function (err, connection) {
		connection.query("INSERT INTO cliente SET ?", [input], function (err, cliente) {
			if (err) {console.log("Error en la query cliente");}
            console.log(cliente);
			res.send("Se inserto nuevo cliente");
        });
    });
});

router.get('/refreshProductWhitP/:check', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        var cond ;
        if(req.params.check){
        	cond = " OR codigo like 'P%' OR codigo like 'S%'";
		}
		else{
			cond = " ";
		}

        connection.query("select " +
            "material.*,coalesce(caracteristica.cnom,'Sin Característica') as cnom from material " +
            "left join caracteristica on caracteristica.idcaracteristica = SUBSTRING(material.codigo, 4, 2) " +
            "where codigo like 'C%' or codigo like 'M%' or codigo like 'I%' or codigo like 'O%'"+ cond, function(err, mats){
            if(err)
                console.log("Error Selecting : %s", err);

            res.render('abast/table_session_preoda', {mats: mats});
        });
    });
});
router.get('/visualizar_ofs', function(req, res, next) {
    req.getConnection(function(err, connection) {
        if(err) console.log("Error Selecting : %s", err);
        connection.query("SELECT " +
			"material.*,ordenfabricacion.*, pedido.externo, fabricaciones.* " +
			"FROM fabricaciones " +
			"LEFT JOIN ordenfabricacion on ordenfabricacion.idordenfabricacion=fabricaciones.idorden_f " +
			"left join pedido on pedido.idpedido=fabricaciones.idpedido " +
			"left join material on material.idmaterial=fabricaciones.idmaterial where fabricaciones.restantes > 0 order by ordenfabricacion.idordenfabricacion DESC", function (err, ofs) {
            if (err) console.log('We got an error! - '+err);

            res.render('abast/visualizar_ofs', {of: ofs});
        });
    });
});

module.exports = router;
