function provider_for_id(list, id){
	for(var i=0; i<list.length; i++){
		if(list[i].Codigo_proveedor == id){
			return list[i].Nombre_proovedor;
		}
	}
}


function style_number(number){
	var cola = number.length % 3;
	var style_number = "";
	console.log(cola);

	if(number.length <= 3){
		return number;
	}
	else{
		var ite = (number.length - cola)/3;//EJEMPLO: 2	
		if(cola != 0){
			style_number += number.substring(0, cola) + ".";
			console.log("cola: " + number.substring(0, cola))
		}
		var index;
		for(var i=0; i<ite; i++){//number.substring
			index = cola + i*3;
			style_number += number.substring(index, index+3);
			if(i != ite-1){
				style_number += ".";
			}	
		}
		return style_number;
	}
}



function precio_costo(valor){
	var comand = "<div id='precioCosto'> $" + valor.toString() + "</div>";
	return comand;
}

function item_producto(total, data, inventOrsale, cantidadBefore){
	 var newCant = cantidadBefore + parseInt(data.datos_producto.cantidad);
	 var comand = "<tr id='" + data.id_producto + "'>";
     comand += "<td>" + data.datos_producto.nombre + "</td>\n";
     //<input type="text" id="p<%=data_products[i].id_producto%>"></div>
     //comand += "<td  class='in_text'><div>$<input type='number' id='p" + data.id_producto +"'></div></td>";
     if(inventOrsale){
    	//comand += "<td  class='in_text'><div>$<input type='number' id='p" + data.id_producto +"'></div></td>";
     	comand += "<td>" + data.datos_producto.cantidad + "</td><input type='hidden' id='c" + data.id_producto + "' value='" + data.datos_producto.cantidad + "'>\n";
        //comand += "<td class='ganancia' id='g" + data.id_producto + "'><div></div></td>";
     }
     else{
     	comand += "<td>$" + data.datos_producto.precio + "</td>";
     }
     /*<td class="ganancia" id="g<%=data_products[i].id_producto%>"></td>*/
     comand += "<td class='buttons'>";
     comand += "<div class='delete' id='delete_" + data.id_producto + "'><button type='button' class='btn btn-default'>";
  	 comand += "<span class='glyphicon glyphicon-remove'></span></button></div>";
  	 comand += "<div><button type='button' class='btn btn-default'>";
     comand += "<span class='glyphicon glyphicon-barcode'></span></button></div></td>";
     comand += "</tr>";
     comand += "<tr id='head' class='total'>";
     comand += "<td><b>Cantidad Total: <div>" + newCant + "</div></b></td>";
     comand += "</tr>";
     return comand;
}

function generate_barcode(id_producto, cantidad){
	var codigo_generados = [];
	for(var i=0; i<cantidad; i++){
			codigo_generados[i] = (id_producto * 1000) + i;
			console.log(codigo_generados[i]);
		}
}




function add_tag(){
	var comand = "<div id='add_tag'>";
	comand += "<h4>Agregar Tag</h4>";
	comand += "</div>";
	return comand;
}

function add_null(){
	var comand = "<div></div>"
	return comand;
}


function show_tags(data){
	var comand = "";
	for(var i=0; i < data.length; i++){
		if(i%6 == 0){//ACA SE ABRE EL ROW
			comand += "<div class='row'>"; 
			comand += "<div class='col-sm-2' id='" + data[i].tag + "'>";
			comand += "<p>" + data[i].tag + "</p>";
			comand += "</div>";
			if((i+1) == data.length){
				comand += "</div>";
			}
		}
		else if((i+1)%6 == 0){//ACA SE CIERRA EL ROW
			comand += "<div class='col-sm-2' id='" + data[i].tag + "'>";
			comand += "<p>" + data[i].tag + "</p>";
			comand += "</div></div>";	
		}
		else if((i + 1) == data.length){//ACA SE CIERRA EL ROW
			comand += "<div class='col-sm-2' id='" + data[i].tag + "'>";
			comand += "<p>" + data[i].tag + "</p>";
			comand += "</div></div>";
		} 
		else{//ITEM INTERMEDIO
			comand += "<div class='col-sm-2' id='" + data[i].tag + "'>";
			comand += "<p>" + data[i].tag + "</p>";
			comand += "</div>";
		}	
	}
	return comand;
}


function adaptador_texto(text){
	var word = "";
	var largo = text.length - 1;
	for(var i= largo; i >= 0; i--){
		if(text[i] == "," ){
			word = text.substring(i+1);
			break;
		}
		else{
			word = text;
			}
	}
	for(var h=0; h<word.length; h++){
		if(word[h] != " "){
			word = word.substring(h);
			break;
		}
	}
	return word;
}	

function put_tag(bar, tag){
	var aux = "";
	for(var i =bar.length; i>=0; i--){
		if(bar[i] == ","){
			aux = bar.substring(0, i+1);
			aux += " " + tag;
			break;
		}
		else{
			aux = tag;
		}
	}
	console.log(aux);
	return aux;
}


function MAYUS_P(string){
	var text = "";
	for(var i=0; i<string.length; i++){
		if(i == 0){
			text += string[i].toUpperCase();
		}
		else
			text += string[i];
	}

	return text;
}

function MAYUS(string){
	return string.toUpperCase();
}

function Cutie(text){
	text = text.toLowerCase();
	return text;
}


function Split(string, caracter){
	var array = [];
	var index = 0;
	var aux = "";
	for(var i=0; i<string.length; i++){
		if(string[i] == caracter){
			array[index] = aux;
			console.log("aux:" + aux);
			index++; 
			aux = "";
		}
		else if( (i+1) == string.length){
			aux+= string[i];
			array[index] = aux;
			console.log("aux finish:" + aux);
			aux = "";
		}
		else{
			aux += string[i]
		}
	}
	return array;
}

function CutieSplit(string, caracter){
	var array = Split(string, caracter);
	for(var i=0; i<array.length; i++){
		array[i] = Cutie(array[i]);
	}
	return array;
}



//FUNCIONES PARA LA VISTA SALE.EJS
function render_product(rows){
	var comand = "<div id='div_product'>\n";
	comand += rows[0].nombre;
	comand += "\n";
	comand += "</div>\n";
	return comand;
}
function invalid_code(){
	var comand = "<div id='div_product'>\n";
	comand += "CODIGO INVALIDO";
	comand += "\n";
	comand += "</div>\n";
	return comand;
}


