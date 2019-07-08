var express = require('express');
var router = express.Router();

var ocaModel = require('./oca');

function verificar(usr){
    if(usr.nombre == 'abastecimiento' || usr.nombre == 'matprimas' || usr.nombre == 'plan' || usr.nombre == 'siderval'){
        return true;
    }else{
        return false;
    }
}

router.post("/", function (req,res) {
    console.log(req.body);
    if (verificar(req.session.userData)) {
        var data = {
            idoda: parseInt(req.body.idoda),
            idproveedor: parseInt(req.body.prov),
            moneda: req.body.money
        };
        ocaModel.setProveedor(data, function (err,rows) {
            if (err) {
                console.log(err);
                res.send({err:true, errMsg:rows.errMsg});
            } else {
                res.send({err:false});
            }
        });
    } else {
        res.send({err:true, errMsg:"BAD LOGIN"});
    }
});

router.post("/updAbast", function (req,res) {
    if (verificar(req.session.userData)) {
        var data = {
            idabast: parseInt(req.body.idabast),
            costo: parseInt(req.body.costo),
            exento: parseInt(req.body.exento),
            cantidad: parseInt(req.body.cantidad)
        };
        ocaModel.updAbastecimiento(data, function (err,rows) {
            if (err) {
                console.log(err);
                res.send({err:true, errMsg:rows.errMsg});
            } else {
                res.send({err:false});
            }
        });
    } else {
        res.send({err:true, errMsg:"BAD LOGIN"});
    }
});

router.post("/cerrarAbast", function (req,res) {
    if (verificar(req.session.userData)) {
        var data = {
            idabast: parseInt(req.body.idabast),
            cantmin: req.body.cantmin
        };
        ocaModel.cerrarAbastecimiento(data, function (err,rows) {
            if (err) {
                console.log(err);
                res.send({err:true, errMsg:rows.errMsg});
            } else {
                res.send({err:false});
            }
        });
    } else {
        res.send({err:true, errMsg:"BAD LOGIN"});
    }
});

router.post("/anular", function (req,res) {
    if (verificar(req.session.userData)) {
        var data = {
            idoda: parseInt(req.body.idoda)
        };
        ocaModel.anularOda(data, function (err,rows) {
            if (err) {
                console.log(err);
                res.send({err:true, errMsg:rows.errMsg});
            } else {
                res.send({err:false});
            }
        });
    } else {
        res.send({err:true, errMsg:"BAD LOGIN"});
    }
});

router.post("/addAbast", function (req,res) {
    if (verificar(req.session.userData)) {
        var data = {
            idoda: parseInt(req.body.idoda),
            abast: {
                costo: parseInt(req.body.costo),
                exento: parseInt(req.body.exento),
                cantidad: parseInt(req.body.cantidad),
                idmaterial: parseInt(req.body.idmaterial),
                recibidos: 0,
                idoda: parseInt(req.body.idoda),
                facturado: 0
            }
        };
        ocaModel.addAbastecimiento(data, function (err,rows) {
            if (err) {
                console.log(err);
                res.send({err:true, errMsg:rows.errMsg});
            } else {
                res.send({err:false});
            }
        });
    } else {
        res.send({err:true, errMsg:"BAD LOGIN"});
    }
});

module.exports = router;