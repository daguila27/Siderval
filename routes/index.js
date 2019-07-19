var express = require('express');
var router = express.Router();
var path = require('path');
var connection  = require('express-myconnection');
var mysql = require('mysql');

var dbCredentials = require("../dbCredentials");
dbCredentials.insecureAuth = true;

router.use(

    connection(mysql,dbCredentials,'pool')

);


/* GET home page. */
router.get('/', function(req, res, next) {
    res.redirect('/user');
  //res.render('index', { title: 'Express' , username: req.session.userData.nombre});
});
router.get('/testio', function(req, res, next){
        req.app.locals.io.emit('notif', {cant: 99});
        console.log("Emitiendo");
        res.redirect('/');
        
});

router.get('/bad_login', function(req, res, next){
	res.render('bad_login', {page_title: 'Acceso denegado!'});
});


// file ajax
router.post('/subir_pic', function (req,res) {
    var formidable = require('formidable');
    var fs = require('fs');
    var f_gen = new Date();
    f_gen = f_gen.getHours()+":"+f_gen.getMinutes()+":"+f_gen.getSeconds()+"_"+f_gen.getDate()+"-"+(f_gen.getMonth()+1)+"-"+f_gen.getFullYear()+"_";
    f_gen = f_gen + req.session.userData.nombre + ".pdf";
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files){
        if(err) console.log("error file: %s",err);
        //fields.filetouploas = 'C:/fakepath/ejercicios.pdf'
        console.log(fields);
        var oldpath = files.filetoupload.path;
        //oldpath = "home/daniel/Escritorio/latex/ejercicios/ejercicios.pdf";
        console.log(oldpath);
        //APU TIENES QUE CAMBIAR LAS RUTAS MADAFUCKER
        //pd: deja la mia como comentario xD
        var newpath = '/home/daniel/Escritorio/siderval/siderval/public/archivos/' + f_gen;
        fs.rename(oldpath, newpath, function (err) {
            if (err) {res.send("error");}
            else{
                console.log('File uploaded and moved!');
                res.send('ok');
            }
        });
    });
});

router.get('/list_dir', function(req, res){
	var data = [];
	var fs = require("fs");
                fs.readdir('/home/daniel/Escritorio/siderval/public/archivos', function(err, files) {
                    if (err) {
                        console.log("Error: ", err);
                    }
                    files.map(function(file) {
                        return path.join('/home/daniel/Escritorio/siderval/public/archivos', file);
                    }).filter(function(file) {
                        return fs.statSync(file).isFile();
                    }).forEach(function(file) {
                        var ext = path.extname(file);
                        var name_complete = path.basename(file);
                        var name_simple = name_complete.replace(ext, "");
                        data[data.length] = {nombre: name_simple};
                        console.log("---> %s : %s (%s)", name_complete, name_simple, ext);
                    });
                    console.log(data);
                    res.render('admin/render_files', {data: data});
                });
});



router.get('/pdf_file/:filename', function(req, res, next) {

        res.render('pdf/pdf');    
});


router.get('/login_faena', function(req, res){
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM EtapaFaena WHERE value < 8 ORDER BY value", function(err, proc){
            if(err){console.log("Error Selecting : %s", err);}
            res.render('login_faena', {faena: proc});
        });
    });
});


router.get('/login_screen_planta', function(req, res){
    if(!req.session.invPin){
        req.session.invPin = false;
    }
    req.getConnection(function(err, connection){
        connection.query("SELECT * FROM EtapaFaena WHERE value < 8 ORDER BY value", function(err, proc){
            if(err){console.log("Error Selecting : %s", err);}

            console.log(proc);
            res.render('login_pview', {faena: proc, invalid: req.session.invPin});
        });
    });
});

router.get('/reset_sessionInv', function(req, res){
    req.session.invPin = false;
    res.send('ok');
});



router.get('/google_topdf', function(req, res){
    var phantom = require('phantom');   

    phantom.create().then(function(ph) {
        ph.createPage().then(function(page) {
            page.open("http://www.google.com").then(function(status) {
                page.render('odc.pdf').then(function() {
                    console.log('Page Rendered');
                    ph.exit();
                });
            });
        });
    });
});


module.exports = router;
