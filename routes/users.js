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


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('login');
});

router.post('/handler', function(req,res){
    var input = JSON.parse(JSON.stringify(req.body));

    var username = input.username;
    var password = input.password;

    req.getConnection(function(err,connection){
        if(err)
            console.log("Error connecting : %s ",err );
        connection.query('SELECT * FROM user WHERE nombre = ? AND password = ?',[username,password],function(err,rows)
        {

            if(err)
                console.log("Error Selecting : %s ",err );
            if(rows.length == 0 ){
                console.log('Invalid Username or Password.');
                res.redirect('/bad_login');
            }

            if(rows.length == 1){
                req.session.isUserLogged = true;
                req.session.userData = {
                    nombre: rows[0].username,
                    contrasena: rows[0].password,
                    tipo: rows[0].tipo
                };
                if(rows[0].tipo == 1){
                    res.redirect('/'+rows[0].username);
                }
                else{
                    res.redirect('/'+rows[0].username);
                }
            }
        });

        //console.log(query.sql);
    });


});
router.post('/handler_faena', function(req,res){
    var input = JSON.parse(JSON.stringify(req.body));

    var username = input.username;
    var password = input.password;
    var etapa = input.etapa;
    var pin = input.pin
    console.log(input);
    req.getConnection(function(err,connection){
        if(err)
            console.log("Error connecting : %s ",err );
        connection.query('SELECT * FROM user WHERE nombre = ? AND password = ?',[username,password],function(err,rows)
        {

            if(err)
                console.log("Error Selecting : %s ",err );
            if(rows.length == 0 ){
                console.log('Invalid Username or Password.');
                res.redirect('/bad_login');
            }

            if(rows.length == 1){
                connection.query("SELECT * FROM etapaFaena WHERE pin = ? AND value = ?", [pin, etapa], function(err, proc){
                    if(err)
                        console.log("Error Selecting : %s", err);
                    if(proc.length == 0 ){
                        console.log('Invalid PIN.');
                        req.session.invPin = true;
                        res.redirect('/login_screen_planta');
                    }
                    if(proc.length > 0){
                        req.session.isUserLogged = true;
                        req.session.userData = {
                            nombre: rows[0].username,
                            contrasena: rows[0].password,
                            tipo: rows[0].tipo
                        };
                        req.session.myValue = etapa;
                        if(rows[0].tipo == 1){    
                            res.redirect('/'+rows[0].username);
                        }
                        else{
                            res.redirect('/'+rows[0].username);
                        }
                    }
                });
                
            }
        });

        //console.log(query.sql);
    });


});
router.post('/handler_faena_nopin', function(req,res){
    var input = JSON.parse(JSON.stringify(req.body));

    var username = input.username;
    var password = input.password;
    var etapa = input.etapa;
    console.log(input);
    req.getConnection(function(err,connection){
        if(err)
            console.log("Error connecting : %s ",err );
        connection.query('SELECT * FROM user WHERE nombre = ? AND password = ?',[username,password],function(err,rows)
        {

            if(err)
                console.log("Error Selecting : %s ",err );
            if(rows.length == 0 ){
                console.log('Invalid Username or Password.');
                res.redirect('/bad_login');
            }

            if(rows.length == 1){
                        req.session.isUserLogged = true;
                        req.session.userData = {
                            nombre: rows[0].username,
                            contrasena: rows[0].password,
                            tipo: rows[0].tipo
                        };
                        req.session.myValue = etapa;
                        if(rows[0].tipo == 1){    
                            res.redirect('/'+rows[0].username);
                        }
                        else{
                            res.redirect('/'+rows[0].username);
                        }    
            }
        });

        //console.log(query.sql);
    });


});



router.get('/log_out', function(req, res){
    console.log(req.session.userData);
    req.session.userData = undefined;
    console.log("Restaurando datos de usuario");
    console.log(req.session.userData);
    res.redirect('/user');
});


router.get('/log_out_faena', function(req, res){
    console.log(req.session.userData);
    req.session.userData = undefined;
    res.redirect('/login_screen_planta');
});

module.exports = router;