var express = require('express');
var path = require('path');
var connect = require('connect');
var http = require('http');

//se crea server
var app = express();
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var Service = require('node-windows').Service;

var index = require('./routes/index');
var users = require('./routes/users');
var admin = require('./routes/admin');
var siderval = require('./routes/siderval');
var faena = require('./routes/faena');
var plan = require('./routes/plan');
var dt = require('./routes/dt');
var dm = require('./routes/dm');
var jefeprod = require('./routes/jefeprod');
var jefeplanta = require('./routes/jefeplanta');
var bodega = require('./routes/bodega');
var abast = require('./routes/abast');
var matprimas = require('./routes/matprimas');
var csvs = require('./routes/csvs');
var test = require('./routes/test');
var gestionpl = require('./routes/gestionpl');
var calidad = require('./routes/calidad');

//const ejslint = require('ejs-lint');



// view engine setup
app.set('port', process.env.PORT || 6300);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser("usuarios"));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
    name: 'session',
    keys: ['usuario_espejo']
}));


app.use('/', index);
app.use('/user', users);
app.use('/siderval', siderval);
app.use('/plan', plan);
app.use('/gerencia', admin);
app.use('/faena', faena);
app.use('/dt', dt);
app.use('/plan', plan);
app.use('/dm', dm);
app.use('/jefeprod', jefeprod);
app.use('/jefeplanta', jefeplanta);
app.use('/bodega', bodega);
app.use('/abastecimiento', abast);
app.use('/matprimas', matprimas);
app.use('/csvs', csvs);
app.use('/test', test);
app.use('/gestionpl', gestionpl);
app.use('/calidad', calidad);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
  res.status(err.status || 500);
  res.render('error');
});



// Create a new service object
/*
var svc = new Service({
  name:'Siderval espejo alfa',
  description: 'Servicio creado por nodejs para nuevo repositorio git.',
  script: 'C:/Siderapp/alpha-testeo/app.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();*/

var server  = http.createServer(app);


//EJECUTA EL SERVER
server.listen(app.get('port'), function(){
    console.log('The game starts on port ' + app.get('port'));
});

const io = require('socket.io')(server);


var mysql = require('mysql');
var dbcredentials = require('./dbCredentials');
dbcredentials.insecureAuth = true;

var connection = mysql.createConnection(dbcredentials);


connection.connect();
io.on('connection', function (socket) {
      //FUNCION QUE SE REGISTRA LAS NOTIFICACIONES DE RECHAZO EN JEFE DE PRODUCCIÓN
      socket.on('addError',function(input){
         console.log("INGRESANDO NOTIFICACIÓN DE RECHAZO");
         connection.query("SELECT fabricaciones.idmaterial,produccion.idordenproduccion as idop FROM produccion LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones WHERE produccion.idproduccion in ("+input.idproduccion.split('-').join(',')+")", function(err, produccion) {
             if (err) {
                 console.log("Error Selecting : %s", err);
             }
             var idmaterial = produccion[0].idmaterial;
             var idop = produccion[0].idop;
             var dataInsert = {};
             var d = new Date();

             var date = d.toLocaleDateString()+" "+d.toLocaleTimeString();
             dataInsert.descripcion = "jfp@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop+"@"+input.razon+"@"+input.etapa;
             connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                 if(err){console.log("Error Selecting : %s", err);}
                 io.sockets.emit("refreshBodegaNotif", [rows.insertId]);
                 io.sockets.emit("refreshGestionplNotif", [rows.insertId]);
             });
         });
     });
      socket.on('addNotificacion', function(input){
          console.log("addNotificacion");
          console.log(input);
          var userf = input.key.substring(2,input.key.length);
          connection.query("SELECT fabricaciones.idmaterial, produccion.idordenproduccion as idop FROM produccion LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones WHERE produccion.idproduccion = ?", [input.idproduccion], function(err, produccion){
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
                  connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                      if(err){console.log("Error Selecting : %s", err);}
                        io.sockets.emit("refreshBodegaNotif", [rows.insertId]);
                        io.sockets.emit("refreshGestionplNotif", [rows.insertId]);
                  });

                }
                else if(userf === "e"){
                    dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
                    console.log(dataInsert);
                    connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                        if(err){console.log("Error Selecting : %s", err);}

                        var idprod = [];
                        var cantprod = [];
                        var cant_aux = parseInt(input.cantidad);

                        for(var w=0; w < input.idproduccion.split('-').length; w++){
                            cant_aux -= parseInt(input.cantprod.split('-')[w]);
                            if(cant_aux > 0){
                                idprod.push(input.idproduccion.split('-')[w]);
                                cantprod.push(parseInt(input.cantprod.split('-')[w]));
                            }
                            else{
                                idprod.push(input.idproduccion.split('-')[w]);
                                cantprod.push(cant_aux+parseInt(input.cantprod.split('-')[w]));
                                break;
                            }
                        }
                        //odaext@22955-22958@2019-7-10 01:04:06@110813@300-684
                        var token = "odaext@"+idprod.join('-')+"@"+date+"@"+idmaterial+"@"+cantprod.join('-');
                        dataInsert = {descripcion: token};
                        connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                            if(err){console.log("Error Selecting : %s", err);}


                            io.sockets.emit("refreshfaena"+userf);

                            //connection.end();
                        });

                    });
                }
                else{
                  dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
                  console.log(dataInsert);
                  connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                      if(err){console.log("Error Selecting : %s", err);}
                      io.sockets.emit("refreshfaena"+userf);

                      //connection.end();
                  });
                }


        });
      });
      socket.on('showToast', function(input){ 
            console.log(input);
          
            io.sockets.emit('showToastnewOF', {newOF: input});
            
      });
      socket.on('showToastCount', function(){
            console.log("HELLO WORLD");  
            io.sockets.emit('showToastnewFab');
      });
      socket.on('showToastnotif', function(input){ 
          console.log(input);
          var fecha = new Date().toLocaleDateString()+" "+ new Date().toLocaleTimeString();
          //var token = "aof@"+input+"@"+fecha;
          var dataInsert = {};
          connection.query("SELECT * FROM cliente WHERE idcliente = ?", [input[1]], function(err, cli){
              if(err)
                console.log("Error Selecting : %s", err);
              console.log(cli);
              if(cli.length>0){
                  dataInsert.descripcion = "aof@"+input[0]+"-"+cli[0].sigla+"@"+fecha;
              }
              else{
                  dataInsert.descripcion = "aof@"+input[0]+"-Sin OC@"+fecha;
              }
              connection.query("INSERT INTO notificacion SET ?", dataInsert, function(err, not){
                if(err)
                  console.log("Error Selecting : %s", err);
                  console.log("notificacion");
                  console.log(not);
                  io.sockets.emit('showNotifnewOF', {});
              });
          });
            
      });
      socket.on('abastNotificacion', function(input){ 
          connection.query("select * from pedido left join odc on odc.idodc = pedido.idodc where odc.numoc = ? and odc.idcliente = ? and (pedido.externo = true || pedido.bmi = true)", [input[1],input[0]],function(err, oc){
            if(err)
              console.log("Error Selecting : %s", err);
            if(oc.length > 0){
                //key@idoc@creacion
                var dataInsert = {};
                var fecha = new Date().toLocaleDateString()+" "+ new Date().toLocaleTimeString();
                dataInsert.descripcion = "aoc@"+oc[0].idodc+"@"+fecha;
                connection.query("INSERT INTO notificacion SET ?", dataInsert, function(err, not){
                  if(err)
                    console.log("Error Selecting : %s", err);
        
                  io.sockets.emit("pend_oc_creation", {info: input});    
                });
            }
          });
      });
      socket.on('refreshJefeprod', function(id){ 
          console.log('refreshJefeprod');
          console.log(id);
          io.sockets.emit("refreshProduccion", {info : id});
      });
       //SOCKET ACTUALIZA NOTIFICACIONES EN USUARIO BODEGA
      socket.on('actNotifBodega', function(idnotifs){
          console.log('Actualizando notificaciones [Bodega]...');
          io.sockets.emit("refreshBodegaNotif", idnotifs);
      });

    //SOCKET ACTUALIZA NOTIFICACIONES EN USUARIO BODEGA
    socket.on('actNotifGestionPl', function(idnotifs){
        console.log('Actualizando notificaciones [Gestion Planta]...');
        io.sockets.emit("refreshGestionplNotif", idnotifs);
    });
    //SOCKET ACTUALIZA NOTIFICACIONES EN USUARIO Planificación
    socket.on('actNotifPlan', function(idnotifs){
        console.log('Actualizando notificaciones [Planificación]...');
        console.log(idnotifs);
        io.sockets.emit("refreshPlanNotif", idnotifs);
    });
    socket.on('dteError', function(obj){
      var fecha = new Date().toLocaleDateString()+" "+ new Date().toLocaleTimeString();
      connection.query('INSERT INTO notificacion SET ?', {descripcion: 'dtegdd@@' + obj.idgdd + '@@' + fecha + '@@false@@' + obj.msg}, function(err){
        if(err){
          console.log(err);
        }
      });
    })
    socket.on('dteSuccess', function(obj) {
      connection.query('UPDATE gd SET timbrado = 1 where idgd = ?', obj.idgdd, function(err, rows){
        if(err){
          console.log(err);
        } else {
          var fecha = new Date().toLocaleDateString()+" "+ new Date().toLocaleTimeString();
          if(err){
            console.log(err);
          } else {
            connection.query('INSERT INTO notificacion SET ?', {descripcion: 'dtegddgpl@@' + obj.idgdd + '@@' + fecha + '@@true@@' + obj.path}, function(err, rows){
              if(err){
                console.log(err);
              } else {
                io.sockets.emit('refreshGestionplNotif', [rows.insertId]);
                connection.query('INSERT INTO notificacion SET ?', {descripcion: 'dtegddplan@@' + obj.idgdd + '@@' + fecha + '@@true@@' + obj.path}, function(err, rows){
                  if(err){
                    console.log(err);
                  } else {
                    io.sockets.emit('refreshPlanNotif', [rows.insertId]);
                  }
                });

              }
            });
          }
        }
      });
    });
      app.locals.socket = socket;
});






app.locals.io = io;
app.locals.puerto = app.get('port');

