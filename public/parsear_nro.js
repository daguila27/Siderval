$(document).ready(function(){
	$(".parsear_nro").each(function(){
		x = $(this).text();
    	var parts = x.toString().split(".");
	    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	    var num =  parts.join(",");
	    $(this).text(num);
	});
});
