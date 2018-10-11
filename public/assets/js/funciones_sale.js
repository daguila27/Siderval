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


function style_number(number){
	var cola = number.length % 3;
	var style_number = "";

	if(number.length <= 3){
		return number;
	}
	else{
		var ite = (number.length - cola)/3;//EJEMPLO: 2	
		if(cola == 0){style_number += number.substring(0, 2);}
		else{style_number += number.substring(0, cola-1);}
		var index;
		for(var i=0; i<ite; i++){//number.substring
			index = cola + i*cola;
			style_number += "." + number.substring(index, index+2);
		}
	}
}