
	$(".parsear_nro").each(function(){
		x = $(this).text();
    	var parts = x.toString().split(".");
	    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	    if(parts.length > 1){
	    	if(parts[1].length > 2){
	    		parts[1] = parts[1].substring(0,2);
            }
	    }
        var num =  parts.join(",");
	    $(this).text(num);
	});
