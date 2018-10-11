function item_seller(data){
	var comand = "<li class='list-group-item' id='" + data.rut + "'><h3>" + data.nombre + "</h3>";
	comand += "<div class='buttons'>";
	comand += "<div><button class='btn btn-default' type='button'><span class='glyphicon glyphicon-barcode' aria-hidden='true'></span></button></div>";
	comand += "<div class='delete' id='boton" + data.rut + "'><button class='btn btn-default' type='button'><span class='glyphicon glyphicon-remove' aria-hidden='true'></span></button></div>";
	comand += "</div></li>";
	return comand;
}

/*<li class='list-group-item' id="<%=data[i].rut%>"><h3><%=data[i].nombre%></h3>
      <div class="buttons">
      	
      	<div><button class='btn btn-default' type="button"><span class='glyphicon glyphicon-barcode' aria-hidden='true'></span></button></div>
      	
      	<div class="delete" id="boton<%=data[i].rut%>"><button class='btn btn-default' type="button" id="boton<%=data[i].rut%>"><span class='glyphicon glyphicon-remove' aria-hidden='true'></span></button></div>
      
      </div>
      </li>*/