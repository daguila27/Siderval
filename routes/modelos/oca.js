var mysql = require('mysql');

var dbCredentials = require("../../dbCredentials");
dbCredentials.connectionLimit = 10;

var poolDb = mysql.createPool(dbCredentials);
var obj = {};

obj.getAbastecimiento = function (data, callback) {
    poolDb.query("SELECT abastecimiento.*, GROUP_CONCAT(recepcion_detalle.idrecepcion_d,'@',recepcion_detalle.cantidad) AS r_token" +
        ", GROUP_CONCAT(facturacion.idfact,'@',facturacion.cantidad) AS f_token" +
        " FROM abastecimiento" +
        " LEFT JOIN recepcion_detalle ON recepcion_detalle.idabast = abastecimiento.idabast" +
        " LEFT JOIN facturacion ON facturacion.idabast = abastecimiento.idabast" +
        " WHERE abastecimiento.idabast = ? GROUP BY abastecimiento.idabast", [data.idabast], function (err, abast) {
        if (err) {
            callback(err, {errMsg: "Error Select SQL"});
        } else {
            callback(null,abast);
        }
    });
};
obj.setProveedor = function (data, callback) {
    /*
Descripción:
    Cambia el idproveedor de una ODA
Parametros:
    data = {
        idproveedor: id del proveedor nuevo de la OCA,
        idoda: id de la OCA que cambiará de proveedor
    }
    callback = funcion que manejará los datos conseguidos desde esta función
Retorno (respuesta):
    Error:
        callback(err,{errMsg: mensaje de error})
    Correcto:
        callback(null,rows)
 */
    if (data.idoda !== null && data.idproveedor !== null) {
        poolDb.query("UPDATE oda SET idproveedor = ?, tokenoda = CONCAT(SUBSTRING_INDEX(tokenoda,'@',6),'@',?,'@off@0') WHERE idoda = ?", [data.idproveedor, data.moneda, data.idoda], function (err, rows) {
            if (err) {
                callback(err,{errMsg:"Error SQL"});
            } else {
                callback(null,rows);
            }
        });
    } else {
        callback(true,{errMsg:"Inputs Incorrectos"});
    }
};
obj.updAbastecimiento = function (data, callback) {
    /*
Descripción:
    Cambia la cantidad, precio y la característica de exento de una de las filas de la OCA.
    Se revisa si la cantidad a cambiar es válida.
Parametros:
    data = {
        idabast: id de la fila de la OCA correspondiente,
        cantidad: cantidad a reemplazar en la fila,
        exento: característica 'exento' a reemplazar,
        costo: costo a reemplazar en la fila
    }
    callback = funcion que manejará los datos conseguidos desde esta función
Retorno (respuesta):
    Error:
        callback(err,{errMsg: mensaje de error})
    Correcto:
        callback(null,rows)
 */
    obj.getAbastecimiento({idabast: data.idabast}, function (err, rows) {
        if (err) {
            callback(err, {errMsg: rows.errMsg});
        } else {
            if (rows) {
                var abast = rows[0];
                if (typeof abast.f_token != 'string') {
                    abast.facturados = 0;
                } else {
                    abast.f_token = abast.f_token.split(",");
                    var suma = 0;
                    abast.f_token.map(function (token) {
                        var aux = token.split("@");
                        suma +=  parseInt(aux[1]);
                        return aux;
                    });
                    abast.facturados = suma;
                }
                if (typeof abast.r_token != 'string') {
                    abast.recibidos = 0;
                } else {
                    abast.r_token = abast.r_token.split(",");
                    var suma2 = 0;
                    abast.r_token.map(function (token) {
                        var aux = token.split("@");
                        suma2 +=  parseInt(aux[1]);
                        return aux;
                    });
                    abast.recibidos = suma2;
                }
                abast.minimo = Math.min(Math.max(abast.recibidos,abast.facturados),abast.cantidad);
                if (abast.minimo > data.cantidad) {
                    callback(true,{errMsg:"Cambio de Cantidad no válido"});
                } else if (parseInt(data.cantidad) === 0) {
                    obj.cerrarAbastecimiento({idabast: data.idabast}, function (err, rows) {
                        if (err) {
                            callback(err,{errMsg:rows.errMsg});
                        } else {
                            callback(null,rows);
                        }
                    });
                } else {
                    poolDb.query("UPDATE abastecimiento SET ? WHERE idabast  = ?", [{cantidad:data.cantidad,exento:data.exento,costo:data.costo},data.idabast], function (err,rows) {
                        if (err) {
                            callback(err, {errMsg:"Error UPDATE SQL"});
                        } else {
                            callback(null,rows);
                        }
                    });
                }
            } else {
                callback(true, {errMsg: "No existe el abastecimiento"});
            }
        }
    });
};
obj.addAbastecimiento = function (data, callback) {
    /*
Descripción:
    Agrega una nueva fila a una ODA ya existente.
Parámetros:
    data = {
        abast: id de la fila de la OCA correspondiente,
        cantidad: cantidad a reemplazar en la fila,
        exento: característica 'exento' a reemplazar,
        costo: costo a reemplazar en la fila
    }
    callback = funcion que manejará los datos conseguidos desde esta función
Retorno (respuesta):
    Error:
        callback(err,{errMsg: mensaje de error})
    Correcto:
        callback(null,rows)
 */
  poolDb.query("SELECT * FROM oda WHERE idoda = ?", [data.idoda], function (err,rows){
      if (err) {
          callback(err, {errMsg: "Error SELECT SQL"});
      } else {
          if (rows) {
              poolDb.query("INSERT INTO abastecimiento SET ? ", [data.abast], function (err,rows){
                 if (err) {
                     callback(err,{errMsg: "ERROR INSERT SQL"});
                 } else {
                     callback(null,rows);
                 }
              });
          } else {
              callback(err, {errMsg:"No existe la ODA especificada"});
          }
      }
  })
};
obj.anularOda = function (data, callback) {
    poolDb.query("SELECT abastecimiento.*, GROUP_CONCAT(recepcion_detalle.idrecepcion_d,'@',recepcion_detalle.cantidad) AS r_token" +
        ", GROUP_CONCAT(facturacion.idfact,'@',facturacion.cantidad) AS f_token" +
        " FROM abastecimiento" +
        " LEFT JOIN recepcion_detalle ON recepcion_detalle.idabast = abastecimiento.idabast" +
        " LEFT JOIN facturacion ON facturacion.idabast = abastecimiento.idabast" +
        " WHERE abastecimiento.idoda = ? GROUP BY abastecimiento.idabast", [data.idoda], function (err, abasts) {
        if (err) {
            callback(err, {errMsg: "Error Select SQL"});
        } else {
            if (abasts) {
                var isAnulable = true;
                abasts.map(function (abast) {
                    if (abast.r_token !== null || abast.f_token !== null) {
                        console.log(abast);
                        isAnulable = false;
                    }
                    return abast;
                });
                if (isAnulable) {
                    poolDb.query("UPDATE oda SET anulado = 1 WHERE idoda = ?", [data.idoda], function (err, rows) {
                        if (err) {
                            callback(err, {errMsg: "Error Update SQL"});
                        } else {
                            callback(null, rows);
                        }
                    });
                } else {
                    callback(true, {errMsg: "No se puede Anular pues tiene facturas y/o recepciones sin anular"});
                }
            } else {
                callback(true, {errMsg: "No existe la oda"});
            }
        }
    });
};
obj.cerrarAbastecimiento = function (data, callback) {
    obj.getAbastecimiento({idabast: data.idabast}, function (err, rows) {
        if (err) {
            callback(err, {errMsg: rows.errMsg});
        } else {
            if (rows) {
                if (rows[0].r_token === null && rows[0].f_token === null) {
                    poolDb.query("DELETE FROM abastecimiento WHERE idabast = ?", [data.idabast], function (err, rows){
                        if (err) {
                            callback(err, {errMsg: "Error DELETE SQL"});
                        } else {
                            callback(null,rows);
                        }
                    });
                } else {
                    var objModif = {
                        idabast: data.idabast,
                        costo:rows[0].costo,
                        exento: rows[0].exento,
                        cantidad: data.cantmin
                    };
                    obj.updAbastecimiento(objModif, function (err, rows) {
                        if (err) {
                            callback(err,{errMsg:rows.errMsg});
                        } else {
                            callback(null, rows);
                        }
                    });
                }
            } else {
                callback(true, {errMsg: "No existe el abastecimiento"});
            }
        }
    });
};

module.exports = obj;
