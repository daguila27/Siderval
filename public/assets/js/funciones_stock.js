function item_product(data){
	var comand = "<ul id='container_products'>";
	comand += "<li class='list-group-item'>";
	comand += "<h3>" + data.rows[0].nombre +"</h3>";
	comand += "<h4>" + data.rows[0].cantidad +"</h4>";
	comand += "</li></ul>";
	return comand;
}
/*<li class='list-group-item'>
      	<h3><%=data[i].nombre%></h3>
      	<h4><%=data[i].cantidad%></h4>
      </li>*/