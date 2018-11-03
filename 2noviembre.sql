-- MySQL Script generated by MySQL Workbench
-- 10/25/18 10:55:52
-- Model: New Model    Version: 1.0
-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='TRADITIONAL,ALLOW_INVALID_DATES';

-- -----------------------------------------------------
-- Schema mydb
-- -----------------------------------------------------
-- -----------------------------------------------------
-- Schema siderval
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema siderval
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `siderval2` DEFAULT CHARACTER SET latin1 ;
USE `siderval2` ;

-- -----------------------------------------------------
-- Table `siderval`.`abastecimiento`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`abastecimiento` (
  `idabast` INT(11) NOT NULL AUTO_INCREMENT,
  `cantidad` INT(4) NOT NULL DEFAULT '0',
  `recibidos` INT(4) NOT NULL DEFAULT '0',
  `idoda` INT(11) NOT NULL,
  `idmaterial` INT(11) NOT NULL,
  `costo` FLOAT NOT NULL DEFAULT '0',
  `cc` VARCHAR(30) NULL DEFAULT NULL,
  `exento` TINYINT(1) NULL DEFAULT '0',
  `facturado` TINYINT(1) NULL DEFAULT '0',
  `numfac` VARCHAR(20) NULL DEFAULT NULL,
  PRIMARY KEY (`idabast`))
ENGINE = InnoDB
AUTO_INCREMENT = 53681
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`aleacion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`aleacion` (
  `idaleacion` INT(11) NOT NULL AUTO_INCREMENT,
  `nom` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`idaleacion`))
ENGINE = InnoDB
AUTO_INCREMENT = 19
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`material`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`material` (
  `idmaterial` INT(11) NOT NULL AUTO_INCREMENT,
  `u_medida` VARCHAR(10) NULL DEFAULT NULL,
  `f_aprov` VARCHAR(20) NULL DEFAULT NULL,
  `leadtime` INT(11) NULL DEFAULT NULL,
  `precio` INT(11) NULL DEFAULT NULL,
  `abc` VARCHAR(1) NULL DEFAULT NULL,
  `tipo` VARCHAR(5) NOT NULL,
  `especificacion` INT(11) NULL DEFAULT NULL,
  `idproducto` INT(11) NULL DEFAULT NULL,
  `estado` VARCHAR(11) NULL DEFAULT NULL,
  `detalle` VARCHAR(300) NULL DEFAULT NULL,
  `caracteristica` INT(11) NULL DEFAULT NULL,
  `stock` INT(11) NOT NULL DEFAULT '0',
  `stock_i` INT(11) NOT NULL DEFAULT '15',
  `stock_c` INT(11) NOT NULL DEFAULT '5',
  `u_compra` INT(11) NOT NULL DEFAULT '1',
  `subcuenta` VARCHAR(11) NULL DEFAULT NULL,
  `codigo` VARCHAR(15) NULL DEFAULT NULL,
  `peso` DECIMAL(11,0) NULL DEFAULT '0',
  `notbom` TINYINT(1) NULL DEFAULT '0',
  PRIMARY KEY (`idmaterial`),
  INDEX `foreing_caracteristi_idx` (`caracteristica` ASC))
ENGINE = InnoDB
AUTO_INCREMENT = 141158
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`bom`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`bom` (
  `idproducto` INT(11) NOT NULL,
  `idmaterial_master` INT(11) NOT NULL,
  `idmaterial_slave` INT(11) NOT NULL,
  `cantidad` FLOAT NULL DEFAULT NULL,
  `tipo` INT(1) NOT NULL DEFAULT '1',
  `abast` TINYINT(1) NULL DEFAULT '0',
  PRIMARY KEY (`idproducto`, `idmaterial_master`, `idmaterial_slave`),
  INDEX `fk_Producto_has_material_material1_idx` (`idmaterial_slave` ASC),
  INDEX `fk_Producto_has_material_Producto1_idx` (`idproducto` ASC, `idmaterial_master` ASC),
  CONSTRAINT `fk_Producto_has_material_material1`
    FOREIGN KEY (`idmaterial_slave`)
    REFERENCES `siderval2`.`material` (`idmaterial`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`caracteristica`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`caracteristica` (
  `idcaracteristica` INT(11) NOT NULL AUTO_INCREMENT,
  `cnom` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`idcaracteristica`))
ENGINE = InnoDB
AUTO_INCREMENT = 100
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`cliente`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`cliente` (
  `idcliente` INT(11) NOT NULL AUTO_INCREMENT,
  `rut` VARCHAR(15) NOT NULL,
  `sigla` VARCHAR(90) NOT NULL,
  `razon` VARCHAR(90) NOT NULL,
  `direccion` VARCHAR(100) NOT NULL,
  `ciudad` VARCHAR(50) NULL DEFAULT NULL,
  `giro` VARCHAR(150) NULL DEFAULT NULL,
  `telefono` VARCHAR(50) NULL DEFAULT NULL,
  `contacto` VARCHAR(50) NULL DEFAULT NULL,
  `pago` VARCHAR(200) NOT NULL DEFAULT 'CONTADO',
  PRIMARY KEY (`idcliente`))
ENGINE = InnoDB
AUTO_INCREMENT = 7511
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`cuenta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`cuenta` (
  `cuenta` VARCHAR(10) NOT NULL,
  `subcuenta` VARCHAR(10) NOT NULL,
  `detalle` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`cuenta`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `siderval`.`despacho`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`despacho` (
  `iddespacho` INT(11) NOT NULL AUTO_INCREMENT,
  `idorden_f` INT(11) NULL DEFAULT NULL,
  `mat_token` MEDIUMTEXT NULL DEFAULT NULL,
  `cant_token` VARCHAR(300) NULL DEFAULT NULL,
  `id_token` VARCHAR(200) NULL DEFAULT NULL,
  `idf_token` VARCHAR(200) NULL DEFAULT NULL,
  `fecha` DATETIME NULL DEFAULT NULL,
  `estado` VARCHAR(10) NOT NULL DEFAULT 'blanco',
  `obs` VARCHAR(200) NULL DEFAULT NULL,
  `last_mod` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`iddespacho`))
ENGINE = InnoDB
AUTO_INCREMENT = 21179
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`etapafaena`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`etapafaena` (
  `id_etapa` INT(11) NOT NULL,
  `nombre_etapa` VARCHAR(45) NULL DEFAULT NULL,
  `value` VARCHAR(45) NULL DEFAULT NULL,
  `pin` VARCHAR(4) NOT NULL DEFAULT '0000',
  PRIMARY KEY (`id_etapa`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`ordenfabricacion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`ordenfabricacion` (
  `idordenfabricacion` INT(11) NOT NULL AUTO_INCREMENT,
  `numordenfabricacion` VARCHAR(20) NULL DEFAULT NULL,
  `creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` VARCHAR(45) NOT NULL DEFAULT '"',
  `idodc` INT(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`idordenfabricacion`))
ENGINE = InnoDB
AUTO_INCREMENT = 7998
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`fabricaciones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`fabricaciones` (
  `idfabricaciones` INT(11) NOT NULL AUTO_INCREMENT,
  `numitem` VARCHAR(11) NOT NULL DEFAULT '1',
  `idorden_f` INT(11) NOT NULL,
  `cantidad` INT(11) NULL DEFAULT NULL,
  `f_entrega` DATETIME NULL DEFAULT NULL,
  `restantes` INT(11) NULL DEFAULT NULL,
  `idproducto` INT(11) NOT NULL,
  `idmaterial` INT(11) NOT NULL,
  `despachados` INT(11) NULL DEFAULT '0',
  `abastecidos` INT(11) NOT NULL DEFAULT '0',
  `idpedido` INT(11) NULL DEFAULT '0',
  `lock` TINYINT(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`idfabricaciones`),
  INDEX `fk_fabricaciones_orden_f1_idx` (`idorden_f` ASC),
  CONSTRAINT `fk_fabricaciones_orden_f1`
    FOREIGN KEY (`idorden_f`)
    REFERENCES `siderval2`.`ordenfabricacion` (`idordenfabricacion`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB
AUTO_INCREMENT = 27014
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`factura`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`factura` (
  `idfactura` INT(11) NOT NULL AUTO_INCREMENT,
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `numfac` VARCHAR(10) NOT NULL,
  `idoda` INT(11) NOT NULL,
  `coment` VARCHAR(200) NULL DEFAULT NULL,
  PRIMARY KEY (`idfactura`))
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `siderval`.`facturacion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`facturacion` (
  `idfact` INT(11) NOT NULL AUTO_INCREMENT,
  `idfactura` INT(11) NOT NULL,
  `idabast` INT(11) NOT NULL,
  `costo` DOUBLE NOT NULL,
  `moneda` VARCHAR(5) NULL DEFAULT NULL,
  PRIMARY KEY (`idfact`))
ENGINE = InnoDB
AUTO_INCREMENT = 2
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `siderval`.`ingreso`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`ingreso` (
  `idingreso` INT(11) NOT NULL AUTO_INCREMENT,
  `idmat_token` VARCHAR(100) NULL DEFAULT NULL,
  `mat_token` VARCHAR(300) NULL DEFAULT NULL,
  `cant_token` VARCHAR(100) NULL DEFAULT NULL,
  `un_token` VARCHAR(100) NULL DEFAULT NULL,
  `idoda` INT(11) NOT NULL,
  `fecha` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `numgdd` VARCHAR(8) NULL DEFAULT NULL,
  PRIMARY KEY (`idingreso`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`notificacion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`notificacion` (
  `idnotificacion` INT(11) NOT NULL AUTO_INCREMENT,
  `descripcion` VARCHAR(200) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idnotificacion`))
ENGINE = InnoDB
AUTO_INCREMENT = 50
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`oda`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`oda` (
  `idoda` INT(11) NOT NULL AUTO_INCREMENT,
  `numoda` INT(6) NOT NULL,
  `creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `idproveedor` INT(11) NOT NULL,
  `gdd` VARCHAR(10) NULL DEFAULT NULL,
  `tokenoda` VARCHAR(200) NULL DEFAULT NULL,
  `idof` INT(11) NULL DEFAULT NULL,
  `numfac` VARCHAR(20) NULL DEFAULT NULL,
  PRIMARY KEY (`idoda`))
ENGINE = InnoDB
AUTO_INCREMENT = 23415
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`odc`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`odc` (
  `idodc` INT(11) NOT NULL AUTO_INCREMENT,
  `numoc` VARCHAR(20) NULL DEFAULT NULL,
  `idcliente` INT(11) NOT NULL,
  `moneda` VARCHAR(5) NOT NULL DEFAULT 'usd',
  `estado` VARCHAR(10) NULL DEFAULT NULL,
  `creacion` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idodc`))
ENGINE = InnoDB
AUTO_INCREMENT = 1257
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`ops_abastecidas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`ops_abastecidas` (
  `idpet` INT(11) NOT NULL AUTO_INCREMENT,
  `idop` INT(10) NOT NULL,
  `idmaterial` INT(10) NOT NULL,
  `cantidad` FLOAT NOT NULL,
  `ingreso` TINYINT(1) NULL DEFAULT '1',
  `fecha` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `cont` TINYINT(1) NULL DEFAULT '0',
  PRIMARY KEY (`idpet`))
ENGINE = InnoDB
AUTO_INCREMENT = 3
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`ordenproduccion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`ordenproduccion` (
  `idordenproduccion` INT(11) NOT NULL AUTO_INCREMENT,
  `f_gen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fin` TINYINT(1) NULL DEFAULT '0',
  `anulado` TINYINT(1) NULL DEFAULT '0',
  `f_anulado` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`idordenproduccion`))
ENGINE = InnoDB
AUTO_INCREMENT = 4
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`otro`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`otro` (
  `idproducto` INT(11) NOT NULL AUTO_INCREMENT,
  `idmaterial` INT(11) NOT NULL,
  `helper` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`idproducto`, `idmaterial`),
  INDEX `fk_Otro_material1_idx` (`idmaterial` ASC),
  CONSTRAINT `fk_Otro_material1`
    FOREIGN KEY (`idmaterial`)
    REFERENCES `siderval`.`material` (`idmaterial`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`pedido`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`pedido` (
  `idpedido` INT(11) NOT NULL AUTO_INCREMENT,
  `numitem` INT(11) NOT NULL DEFAULT '1',
  `despachados` INT(11) NOT NULL DEFAULT '0',
  `f_entrega` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `cantidad` INT(11) NULL DEFAULT NULL,
  `precio` FLOAT NULL DEFAULT '0',
  `idmaterial` INT(11) NOT NULL,
  `idodc` INT(11) NULL DEFAULT NULL,
  `idproveedor` INT(11) NULL DEFAULT NULL,
  `externo` TINYINT(1) NULL DEFAULT '0',
  PRIMARY KEY (`idpedido`),
  INDEX `idmaterial_idx` (`idmaterial` ASC),
  INDEX `idodc_idx` (`idodc` ASC),
  CONSTRAINT `idmaterial`
    FOREIGN KEY (`idmaterial`)
    REFERENCES `siderval`.`material` (`idmaterial`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `idodc`
    FOREIGN KEY (`idodc`)
    REFERENCES `siderval`.`odc` (`idodc`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
AUTO_INCREMENT = 18588
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`plantilla`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`plantilla` (
  `idplant` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `llave` VARCHAR(9) NOT NULL DEFAULT 'odc',
  `token` VARCHAR(1000) NULL DEFAULT NULL,
  `ult_save` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idplant`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `siderval`.`produccion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`produccion` (
  `idmaterial` INT(11) NOT NULL AUTO_INCREMENT,
  `sin_producir` INT(11) NULL DEFAULT NULL,
  `abastecidos` INT(4) NOT NULL DEFAULT '0',
  `1` INT(11) NULL DEFAULT '0',
  `2` INT(11) NULL DEFAULT '0',
  `3` INT(11) NULL DEFAULT '0',
  `4` INT(11) NULL DEFAULT '0',
  `5` INT(11) NULL DEFAULT '0',
  `6` INT(11) NULL DEFAULT '0',
  `7` INT(11) NULL DEFAULT '0',
  `8` INT(11) NULL DEFAULT '0',
  `0` INT(11) NULL DEFAULT '0',
  `f_gen` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `el` TINYINT(1) NULL DEFAULT '0',
  PRIMARY KEY (`idmaterial`),
  INDEX `fk_ordenproduccion_fabricaciones1_idx` (`i` ASC),
  INDEX `fk_produccion_ordenproduccion1_idx` (`idordenproduccion` ASC),
  CONSTRAINT `fk_ordenproduccion_fabricaciones1`
    FOREIGN KEY (`idfabricaciones`)
    REFERENCES `siderval`.`fabricaciones` (`idfabricaciones`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_produccion_ordenproduccion1`
    FOREIGN KEY (`idordenproduccion`)
    REFERENCES `siderval`.`ordenproduccion` (`idordenproduccion`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`produccion_history`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval2`.`produccion_history` (
  `idproduccion_history` INT(11) NOT NULL AUTO_INCREMENT,
  `idproduccion` INT(11) NOT NULL,
  `enviados` INT(11) NULL DEFAULT NULL,
  `fecha` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `to` VARCHAR(45) NULL DEFAULT NULL,
  `from` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`idproduccion_history`),
  INDEX `fk_produccion_history_produccion1_idx` (`idproduccion` ASC),
  CONSTRAINT `fk_produccion_history_produccion1`
    FOREIGN KEY (`idproduccion`)
    REFERENCES `siderval`.`produccion` (`idproduccion`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`producido`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`producido` (
  `idproducto` INT(11) NOT NULL AUTO_INCREMENT,
  `idmaterial` INT(11) NOT NULL,
  `pdf` VARCHAR(200) NULL DEFAULT NULL,
  `idsubaleacion` INT(11) NOT NULL,
  `ruta` VARCHAR(100) NOT NULL DEFAULT 'Moldeo,Fusion,Control de Calidad',
  PRIMARY KEY (`idproducto`, `idmaterial`),
  INDEX `fk_Pterminado_material_idx` (`idmaterial` ASC),
  CONSTRAINT `fk_Pterminado_material`
    FOREIGN KEY (`idmaterial`)
    REFERENCES `siderval`.`material` (`idmaterial`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB
AUTO_INCREMENT = 47520
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`producto`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`producto` (
  `idproducto` INT(11) NOT NULL AUTO_INCREMENT,
  `idmaterial` INT(11) NOT NULL,
  `idaleacion` INT(11) NOT NULL,
  `u_pedido` VARCHAR(10) NULL DEFAULT NULL,
  `cod_proveedor` VARCHAR(45) NULL DEFAULT NULL,
  `punto_pedido` VARCHAR(50) NULL DEFAULT NULL,
  PRIMARY KEY (`idproducto`, `idmaterial`),
  INDEX `fk_producto_material1_idx` (`idmaterial` ASC),
  CONSTRAINT `fk_producto_material1`
    FOREIGN KEY (`idmaterial`)
    REFERENCES `siderval`.`material` (`idmaterial`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
AUTO_INCREMENT = 57323
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`recurso`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`recurso` (
  `idproducto` INT(11) NOT NULL AUTO_INCREMENT,
  `idmaterial` INT(11) NOT NULL,
  `u_pedido` VARCHAR(10) NULL DEFAULT NULL,
  `cod_proveedor` VARCHAR(45) NULL DEFAULT NULL,
  `punto_pedido` VARCHAR(50) NULL DEFAULT NULL,
  PRIMARY KEY (`idproducto`, `idmaterial`),
  INDEX `fk_Recurso_material1` (`idmaterial` ASC),
  CONSTRAINT `fk_Recurso_material1`
    FOREIGN KEY (`idmaterial`)
    REFERENCES `siderval`.`material` (`idmaterial`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`save`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`save` (
  `idsave` INT(4) NOT NULL AUTO_INCREMENT,
  `llave` VARCHAR(10) NULL DEFAULT NULL,
  `token` VARCHAR(1000) NULL DEFAULT NULL,
  `ult_save` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idsave`))
ENGINE = InnoDB
AUTO_INCREMENT = 617
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `siderval`.`subaleacion`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`subaleacion` (
  `idsubaleacion` INT(11) NOT NULL AUTO_INCREMENT,
  `subnom` VARCHAR(45) NULL DEFAULT NULL,
  `idaleacion` INT(11) NULL DEFAULT NULL,
  PRIMARY KEY (`idsubaleacion`))
ENGINE = InnoDB
AUTO_INCREMENT = 149
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `siderval`.`subcuenta`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`subcuenta` (
  `subcuenta` VARCHAR(10) NOT NULL,
  `detalle` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`subcuenta`))
ENGINE = InnoDB
DEFAULT CHARACTER SET = latin1;


-- -----------------------------------------------------
-- Table `siderval`.`user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `siderval`.`user` (
  `iduser` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(45) NOT NULL,
  `password` VARCHAR(45) NOT NULL,
  `creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipo` INT(11) NOT NULL DEFAULT '2',
  `nombre` VARCHAR(45) NULL DEFAULT NULL,
  PRIMARY KEY (`iduser`))
ENGINE = InnoDB
AUTO_INCREMENT = 10
DEFAULT CHARACTER SET = utf8;

CREATE TABLE IF NOT EXISTS `siderval`.`retiro` (
  `idretiro` INT NOT NULL,
  `etapa` INT NULL,
  `receptor` VARCHAR(50) NULL,
  `f_gen` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idretiro`))
ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS `siderval`.`retiro_detalle` (
  `idretiro` INT NOT NULL,
  `idmaterial` INT(11) NOT NULL,
  `cantidad` VARCHAR(45) NULL,
  PRIMARY KEY (`idretiro`, `idmaterial`),
  INDEX `fk_retiro_detalle_retiro_idx` (`idretiro` ASC),
  INDEX `fk_retiro_detalle_material1_idx` (`idmaterial` ASC),
  CONSTRAINT `fk_retiro_detalle_retiro`
    FOREIGN KEY (`idretiro`)
    REFERENCES `siderval`.`retiro` (`idretiro`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_retiro_detalle_material1`
    FOREIGN KEY (`idmaterial`)
    REFERENCES `siderval`.`material` (`idmaterial`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

USE `siderval` ;

-- -----------------------------------------------------
-- function Pedin_despacho
-- -----------------------------------------------------

DELIMITER $$
USE `siderval`$$
CREATE DEFINER=`admin`@`localhost` FUNCTION `Pedin_despacho`(token varchar(100), idped varchar(20)) RETURNS tinyint(1)
BEGIN
  DECLARE count INT(4) DEFAULT 0;
  DECLARE indesp boolean default false;
  ped_loop: LOOP
    SET count = count + 1;
    IF substring_index(substring_index(token, '@', count), '@', -1) = idped THEN 
      SET indesp = true;
      LEAVE ped_loop;
    END IF;
    IF length(token) - length(replace(token,'@','')) = count-1 THEN 
      LEAVE ped_loop;
    END IF;
  END LOOP ped_loop;
  RETURN indesp;
  END$$

DELIMITER ;

-- -----------------------------------------------------
-- function Siguiente
-- -----------------------------------------------------

DELIMITER $$
USE `siderval`$$
CREATE DEFINER=`root`@`localhost` FUNCTION `Siguiente`(ruta VARCHAR(30), actual VARCHAR(1)) RETURNS varchar(1) CHARSET utf8
BEGIN
    DECLARE count INT(2) DEFAULT 0;
  DECLARE sig VARCHAR(1);
  ruta_loop: LOOP 
    SET count = count + 1;
    IF substring_index(substring_index(ruta, ',', count), ',', -1) = actual THEN 
      SET sig = substring_index(substring_index(ruta, ',', count+1), ',', -1);
      LEAVE ruta_loop;
    END IF;
  END LOOP ruta_loop;
  RETURN sig;
  END$$

DELIMITER ;
USE `siderval`;

DELIMITER $$
USE `siderval`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `siderval`.`Otro_AFTER_INSERT`
AFTER INSERT ON `siderval`.`otro`
FOR EACH ROW
BEGIN

END$$

USE `siderval`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `siderval`.`Producto_AFTER_INSERT`
AFTER INSERT ON `siderval`.`producto`
FOR EACH ROW
BEGIN
 UPDATE material SET material.idproducto = NEW.idproducto WHERE material.idmaterial = NEW.idmaterial; 
END$$

USE `siderval`$$
CREATE
DEFINER=`root`@`localhost`
TRIGGER `siderval`.`Recurso_AFTER_INSERT`
AFTER INSERT ON `siderval`.`recurso`
FOR EACH ROW
BEGIN
	UPDATE material SET material.idproducto = NEW.idproducto WHERE material.idmaterial = NEW.idmaterial;
END$$


DELIMITER ;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;