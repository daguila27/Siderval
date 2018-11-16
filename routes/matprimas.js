var express = require('express');
var router = express.Router();
var connection  = require('express-myconnection');
var mysql = require('mysql');

router.use(
    connection(mysql,{

        host: '127.0.0.1',
        user: 'admin',
        password : 'tempo123',
        port : 3306,
        database:'siderval',
  insecureAuth : true

    },'pool')

);

function verificar(usr){
	if(usr.nombre == 'matprimas'){
		return true;
	}else{
		return false;
	}
}
/* GET users listing. */
router.get('/', function(req, res, next) {
	if(verificar(req.session.userData)){
    	res.render('matprimas/indx_new', {page_title: "Materias Primas", username: req.session.userData.nombre});
	}
	else{res.redirect('bad_login');}	
});
// Enviar la vista para registrar un movimiento
router.get("/crear_movimiento",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT idmaterial,codigo,detalle,stock,u_medida as u_compra FROM material WHERE (codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%' OR tipo = 'X') AND notbom = true AND material.detalle != '' GROUP BY material.detalle",function (err,materiales) {

                if(err) console.log(err);
                res.render("matprimas/create_retiro",{mat: materiales});
            });
        });
    } else res.redirect("/bad_login");
});
// Enviar la vista para registrar un movimiento (DEVOLUCIÓN)
router.get("/crear_movimiento_dev",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("SELECT idmaterial,codigo,detalle,stock,u_medida as u_compra FROM material WHERE (codigo LIKE 'I%' OR codigo LIKE 'O%' OR codigo LIKE 'M%' OR tipo = 'X') AND notbom = true AND material.detalle != '' GROUP BY material.detalle",function (err,materiales) {
                if(err) console.log(err);

                console.log(materiales.length);
                res.render("matprimas/create_devolucion",{mat: materiales});
            });
        });
    } else res.redirect("/bad_login");
});
// Procesar creación de un movimiento
router.post("/save_movimiento",function(req,res,next){
	var lista = [];
	var inventario_char = "";
	switch (parseInt(req.body.tipo)){
        case 1: // Devolución
            inventario_char = "+";
            break;
        default: // Retiro
            inventario_char = "-";
            break;
    }
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            //req.body = {
			// 		lista_m: [idmaterial1,idmaterial2,...],
			// 		lista_v:[cant1,cant2,...],
            //      tipo: 0 | 1,
			// 		etapa: "...",
			// 		receptor: "..."
			// }
            connection.query("INSERT INTO movimiento SET ?",{etapa: req.body.etapa,receptor: req.body.receptor,tipo: req.body.tipo},function(err,row){
                if(err) console.log(err);
                //Revisar si se creó el movimiento
                if(row){
                	if(typeof req.body['lista_m[]'] == 'string'){ // si sólo se seleccionó un material para el movimiento
                		var data = {
                			cantidad: req.body['lista_v[]'],
							idmaterial: req.body['lista_m[]'],
							idmovimiento: row.insertId
						};
                        connection.query("INSERT INTO movimiento_detalle SET ?",[data],function(err,rows){// Crear el detalle del movimiento
                            if(err) console.log(err);
                            connection.query("UPDATE material SET stock = stock " + inventario_char + " ? WHERE idmaterial = ?",[req.body['lista_v[]'],req.body['lista_m[]']],function(err,rows){ //cambia el stock del único material seleccionado
                                if(err) console.log(err);
                                res.send({err:false,msg:"El movimiento se registró exitosamente"});

                            });
                        });
					} else { // sis se seleccionaron mas de uno
                		var query = "UPDATE material SET stock = CASE "; //partir creando el query para actualizar el stock
                        for(var i = 0; i< req.body['lista_m[]'].length;i++){
                            lista.push([req.body['lista_v[]'][i],req.body['lista_m[]'][i],row.insertId]); // Agrupar el idmaterial con el reitro y la cantidad pedida
                            query = query + "WHEN idmaterial = " + req.body['lista_m[]'][i] + " THEN stock " + inventario_char + " " + req.body['lista_v[]'][i] + " "; // añadir CASE a la query para ajustar stocks
                        }
                        query += "end WHERE idmaterial IN ?"; //Terminar la query de actualización de stocks
                        connection.query("INSERT INTO movimiento_detalle (`cantidad`,`idmaterial`,`idmovimiento`) VALUES ?",[lista],function(err,rows){ //insertar el detalle del movimiento
                            if(err)console.log(err);
                            connection.query(query,[[req.body['lista_m[]']]],function(err,rows){// Actualizar el stock
                                if(err) console.log(err);
                                res.send({err:false,msg:"El movimiento se registró exitosamente"});
                            });
                        });
					};
                } else res.send({err: true,message: "No se pudo crear el movimiento"});
            });
        });
    } else res.redirect("/bad_login");
});
/*
* CONTROLADOR QUE RENDERIZA LA VISTA PRINCIPAL DE Materias Primas --> Movimientos --> Ver Movimientos
* */
router.get("/busq_oda",function(req,res,next){
    if(req.session.userData){
        res.render("matprimas/search_oda");
    } else res.redirect("/bad_login");
});
/*
* CONTROLADOR QUE ENVÍA VISTA PARA RECEPCIÓN DE OCA
* */
router.post("/search_oca",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err,connection){
            if(err) console.log(err);
            connection.query("select oda.numoda,abastecimiento.idabast,material.idmaterial,material.detalle,coalesce(material.u_medida,'und') AS umed,abastecimiento.cantidad,abastecimiento.recibidos"
                + " from abastecimiento left join oda on abastecimiento.idoda=oda.idoda left join material on "
                + "abastecimiento.idmaterial = material.idmaterial WHERE oda.numoda = ? and abastecimiento.recibidos < abastecimiento.cantidad group by abastecimiento.idabast"
                ,[req.body.numoda],function(err,rows){
                if(err) console.log(err);
                if(rows.length){
                    res.render("matprimas/oda_recep",{data:rows},function(err,html){
                        if(err) console.log(err);
                        res.send({err: false,err_msg: "Exito",html:html});
                    });
                } else {
                    res.send({err: true,err_msg: "No se encontró ninguna OC con tal número"});
                }
            });

        });
    } else res.redirect("/bad_login");
});
/*
* CONTROLADOR QUE REGISTRA LA RECEPCIÓN DESDE PROVEEDORES
* */
router.post("/save_recepcion",function(req,res,next){
    if(req.session.userData){
        console.log(req.body);
        res.send({err:false,err_msg: "inprogress"});
    } else res.send({err:true,err_msg:"MENTIROSO, EMBUSTERO"});
});
/*
* Controlador que renderiza la vista Mat_primas --> Registrar Llegada de Productos.
* */
router.get("/view_movimientos",function(req,res,next){
    if(req.session.userData){
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("SELECT * FROM etapafaena", function(err, etp){
                if(err) throw err;
                res.render('matprimas/view_movimientos', {etp: etp});
            });
        });
    } else res.redirect("/bad_login");
});



router.post("/table_movimientos",function(req,res,next){
    if(req.session.userData){
        var input = JSON.parse(JSON.stringify(req.body));
        console.log(input);
        var orden = input.orden.replace('-', ' ');
        var clave = input.clave;
        var where = " WHERE movimiento_detalle.idmovimiento like '%"+clave+"%' OR material.detalle like '%"+clave+"%'";
        req.getConnection(function(err, connection){
            if(err) throw err;
            connection.query("select movimiento.*,movimiento.tipo as tipo_mov, movimiento_detalle.*, material.*,"
                +"coalesce(etapafaena.nombre_etapa, 'Jefe de Producción') as nombre_etapa"
                +" from movimiento_detalle"
                +" left join movimiento on movimiento.idmovimiento=movimiento_detalle.idmovimiento"
                +" left join material on material.idmaterial=movimiento_detalle.idmaterial"
                +" left join etapafaena on etapafaena.value = movimiento.etapa"+where+" ORDER BY "+orden, function(err, mov){
                if(err) throw err;
                res.render('matprimas/table_movimientos', {data: mov, key: orden.replace(' ', '-')});
            });
        } );
    } else res.redirect("/bad_login");
});

module.exports = router;
