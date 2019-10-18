
	$(".parsear_nro").each(function(){

        x = $(this).text();
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		var cs;
        if($(this).data('cs') === undefined){
            cs = 2;
        }else{
        	cs = $(this).data('cs');
		}
        if(parts.length > 1){
	    	if(parts[1].length >= cs){
	    		parts[1] = parts[1].substring(0,cs);
            }
            else{
            	parts[1] = parts[1]+'0'.repeat(cs-parts[1].length);
			}
	    }
	    else{
            parts[1] = '0'.repeat(cs);
		}
        var num;


		if(cs === 0){
            num =  parts[0];
		}
		else{
            num =  parts.join(",");
		}
	    $(this).text(num);
	});


