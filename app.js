var express = require('express');
var path = require('path');
var connect = require('connect');
var http = require('http');

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

//const ejslint = require('ejs-lint');



// view engine setup
app.set('port', process.env.PORT || 4300);
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
    keys: ['usuarios']
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

/*var svc = new Service({
  name:'Siderval SGP',
  description: 'Servicio creado por nodejs para nuevo repositorio git.',
  script: '/app.js'
});*/

// Listen for the "install" event, which indicates the
// process is available as a service.
/*svc.on('install',function(){
  svc.start();
});

svc.install();*/

var server  = http.createServer(app);

server.listen(app.get('port'), function(){
    console.log('The game starts on port ' + app.get('port'));
});

const io = require('socket.io')(server);


var mysql      = require('mysql');
var connection = mysql.createConnection({
      host: '127.0.0.1',
      user: 'admin',
      password: 'tempo123',
      port: 3306,
      database: 'siderval',
      insecureAuth : true
});


connection.connect();
io.on('connection', function (socket) {
      console.log("Conectado");
      socket.on('addError',function(input){
         connection.query("SELECT fabricaciones.idmaterial,produccion.idordenproduccion as idop FROM produccion LEFT JOIN fabricaciones ON produccion.idfabricaciones = fabricaciones.idfabricaciones WHERE produccion.idproduccion = ?", [input.idproduccion], function(err, produccion) {
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
                 io.sockets.emit("notif");
             });
         });
     });
      socket.on('addNotificacion', function(input){ 
          var userf = input.key.substring(2,3);
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
                if(userf == '8'){
                  dataInsert.descripcion = "idm@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
                  connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                      if(err){console.log("Error Selecting : %s", err);}                    
                        io.sockets.emit("notif");
                  });


                }
                else if(userf == "9"){
                    dataInsert.descripcion = input.key+"@"+idmaterial+"@"+input.cantidad+"@"+date+"@"+input.idproduccion+"@"+idop;
                    console.log(dataInsert);
                    connection.query("INSERT INTO notificacion SET ?", [dataInsert], function(err, rows){
                        if(err){console.log("Error Selecting : %s", err);}
                        io.sockets.emit("refreshfaena"+userf);

                        //connection.end();
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
          connection.query("select * from pedido left join odc on odc.idodc = pedido.idodc where odc.numoc = ? and odc.idcliente = ? and pedido.externo = true", [input[1],input[0]],function(err, oc){
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
});
app.locals.io = io;

