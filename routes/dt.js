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
	if(usr.nombre == 'dt'){
		return true;
	}else{
		return false;
	}
}

router.get('/', function(req, res, next){
	if(verificar(req.session.userData)){
    res.render('dt/indx', {page_title: "Direccion Tecnica", username: req.session.userData.nombre});}
	else{res.redirect('bad_login');}	
});


router.get('/render_registro',function(req, res, next){
	if(verificar(req.session.userData)){
		req.getConnection(function(err, connection){
		connection.query("SELECT producto.idproducto,material.idmaterial,material.detalle FROM producto LEFT JOIN material ON (producto.idmaterial = material.idmaterial) WHERE material.estado = 'fin'", function(err, rows){
			if(err)
				console.log("Error Selecting : %s", err);
			var data = rows;
			connection.query("SELECT * FROM EtapaFaena", function(err, rows){
				if(err)
					console.log("Error Selecting : %s", err);
				res.render('dt/render_registro', {data: data, etapas: rows});

			});
		});
	});
	}
	else{res.redirect('bad_login');}

});


router.get('/create_producto',function(req, res, next){
    if(verificar(req.session.userData)){
    	res.render('dt/create_producto');
    }
    else{res.redirect('bad_login');}

});
router.get('/check_code_version/:codigo',function(req, res, next){
    if(verificar(req.session.userData)){
    	var codigo = req.params.codigo;
    	var v;
    	req.getConnection(function(err, connection){
    		if(err){console.log("Error Connection: %s", err);}
    		connection.query("select max(codigo) as codigo from material where codigo like '"+codigo+"%'", function(err, rows){
                if(err){console.log("Error Selecting: %s", err);}

                console.log(rows);
                if(rows[0].codigo == null){
                    res.send(codigo+"@1");
                }
				else{
					v = rows[0].codigo.substring(9, rows[0].codigo.length);
                    v = parseInt(v) + 1;
					res.send(codigo+"@"+v);
                }

            });
		});
    }
    else{res.redirect('bad_login');}

});

router.post('/save_producto',function(req, res, next){
    if(verificar(req.session.userData)){
        var input = JSON.parse(JSON.stringify(req.body));
        var data = [];
        console.log(input);
        if(typeof input['cod[]'] === 'string'){
        	if(input["peso[]"] === ''){
        		input["peso[]"] = 0;
			}
            data.push([input["cod[]"], input["nombre[]"], input["unid[]"], input["peso[]"],input["cod[]"].substring(0,1)]);
		}
		else{
            for(var e=0; e < input["cod[]"].length; e++){
                if(input["peso[]"][e] === ''){
                    input["peso[]"][e] = 0;
                }
                data.push([input["cod[]"][e], input["nombre[]"][e], input["unid[]"][e],input["peso[]"][e],input["cod[]"][e].substring(0,1)]);
            }
		}

		console.log(data);
        req.getConnection(function(err, connection){
            connection.query("INSERT INTO material (codigo, detalle, u_medida, peso, tipo) VALUES ?", [data], function(err, rows){
                if(err){console.log("Error Selecting : %s", err);}

                res.redirect('/dt/create_producto');
            });
        });

    }
    else{res.redirect('bad_login');}

});



router.post('/registrar_material', function(req, res, next){
	var input = JSON.parse(JSON.stringify(req.body));
	var idproducto = input.idproducto;
	var idmaterial = input.idmaterial;
	var ruta = input.ruta;
	var pdf = input.pdf;
	console.log(ruta);
	req.getConnection(function(err, connection){
		connection.query("UPDATE producido SET ruta = '"+ruta+"' WHERE idproducto="+idproducto +" AND idmaterial = "+idmaterial, function(err, rows){
			if(err){console.log("Error Selecting : %s", err);}
			connection.query("UPDATE producido SET pdf = '"+pdf+"' WHERE idproducto="+idproducto +" AND idmaterial = "+idmaterial, function(err, rows){
				if(err){console.log("Error Selecting : %s", err);}
				res.send('ok');
			});	
		});
	});
});
/*router.post('/find_proccess', function(req, res, next){
	if(verificar(req.session.userData)){
			var input = JSON.parse(JSON.stringify(req.body));
			req.getConnection(function(err, connection){
				connection.query('SELECT * FROM EtapaFaena WHERE nombre_etapa LIKE "'+'%' + input.proccess + '%"', function(err, rows){
					if(err){
						console.log("Error Selecting : %s", err);
					}
					console.log(rows);
					res.render('dt/grid_proccess', {data: rows});
				});
			});
	}
	else{res.redirect('bad_login');}	
	
});
*/

module.exports = router;