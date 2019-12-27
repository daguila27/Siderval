$(".buscador_eventos").keydown(function(event){
    var fills = $(this).data('cfiltros');
    var char = event.which || event.keyCode;
    var item = $(".o_searchview_autocomplete").data('item');
    //BORRAR LABEL
    if(char === 8 && ($(".buscador_eventos").val()===null || $(".buscador_eventos").val()==='' || $(".buscador_eventos").val()===undefined ) &&  parseInt($(".etiqueta-filtro-div").data('cant')) > 0 ){
        var labels = parseInt($(".etiqueta-filtro-div").data('cant'))-1;
        eliminarEtiqueta($("#label"+labels).children('div'));
    }
    //ENTER
    else if(char === 13){
        enter_buscar();
        //$(".fill-item-abast.o-selection-focus").click();
    }
    //ARRIBA
    /*else if(char === 38){
        item = parseInt(item) - 1;
    }*/
    //ABAJO
    /*else if(char === 40){
        item = parseInt(item) + 1;
    }*/


    //SI SOBREPASA EL LIMITE INFERIOR
    /*if(parseInt(item) >= fills){
        $(".o_searchview_autocomplete").data('item', "0");
        $(".fill-item-abast").removeClass("o-selection-focus");
        $(".item0").addClass("o-selection-focus");
    }*/
    //SI SOBREPASA EL LIMITE SUPERIOR
    /*else if(parseInt(item) < 0){
        $(".o_searchview_autocomplete").data('item', +fills-1);
        $(".fill-item-abast").removeClass("o-selection-focus");
        $(".item"+fills-1).addClass("o-selection-focus");
    }
    else{
        $(".o_searchview_autocomplete").data('item', item);
        $(".fill-item-abast").removeClass("o-selection-focus");
        $(".item"+item).addClass("o-selection-focus");
    }*/
});


$(".select-busc#fill-change").keydown(function(event){
    var char = event.which || event.keyCode;
    if(char === 13){
        enter_buscar();
    }
});

//SE SE ESCRIBE EN EL CAMPO BUSCAR SE ACTIVA input_keyup
$(".buscador_eventos").on('keyup', function(e){
    e.preventDefault();
    if($(this).val() === '' || $(this).val() === null || $(this).val()=== undefined ){
        $(".o_searchview_autocomplete").css('display', 'none');
        $(".o_searchview_autocomplete strong").html('');
    }
    else{
        $(".o_searchview_autocomplete").css('display', 'block');
        $(".o_searchview_autocomplete strong").html($(this).val());
    }
});

$('.fill-item-abast').on('hover', function(e){
    e.preventDefault();
    $('.fill-item-abast').css('cursor','pointer');
    $('.fill-item-abast').removeClass("o-selection-focus");
    $('.fill-item-abast').addClass("o-selection-focus");
    $(".o_searchview_autocomplete").data('item', $(".select-busc#fill-change").val());
});

function enter_buscar(){
    var clase = busc.array_fill[parseInt($(".select-busc#fill-change").val())].split('@');
    var labels = parseInt($(".etiqueta-filtro-div").data('cant'));
    $(".etiqueta-filtro-div").append(
        "<label " +
        "id='label"+labels+"' " +
        "data-toggle='tooltip' " +
        "title='Buscando "+'"'+$(".buscador_eventos").val()+'"'+" ' " +
        "data-valor='"+$(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val()+"@off' " +
        "class='etiqueta-filtro label label-primary'>"+clase[0]+": <strong>" + $(".buscador_eventos").val()+
        "</strong><div data-state='off' onclick='cambiarEtiqueta(this)' class='fa fa-toggle-off etiqueta-filtro-cha'></div> <div onclick='eliminarEtiqueta(this)' class='fa fa-sm fa-remove etiqueta-filtro-del'></div></label>"
    );
    $(".etiqueta-filtro-div").data('cant', labels+1);
    if($(".buscador_eventos-value").val() === '' || $(".buscador_eventos-value").val() === null || $(".buscador_eventos-value").val() === undefined){
        $(".buscador_eventos-value").val($(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val()+"@off");
    }
    else{
        $(".buscador_eventos-value").val([$(".buscador_eventos-value").val(),$(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val(), 'off'].join(','));
    }
    busc.filtros_seleccionados.push($(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val()+"@off");
    $(".o_searchview_autocomplete").css('display', 'none');
    $(".o_searchview_autocomplete strong").html('');
    $(".buscador_eventos").val('');
    $(".buscador_eventos").focus();
    busc.page = 1;
    busc.buscar_action();
}
//SI SE SELECCIONA ALGUN FILTRO SE ACTIVA option_fill_selected
$(".fill-item-abast").on('click', function(e){
    e.preventDefault();
    var clase = busc.array_fill[parseInt($(".select-busc#fill-change").val())].split('@');
    var labels = parseInt($(".etiqueta-filtro-div").data('cant'));
    $(".etiqueta-filtro-div").append(
        "<label " +
        "id='label"+labels+"' " +
        "data-toggle='tooltip' " +
        "title='Buscando "+'"'+$(".buscador_eventos").val()+'"'+" ' " +
        "data-valor='"+$(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val()+"@off' " +
        "class='etiqueta-filtro label label-primary'>"+clase[0]+": <strong>" + $(".buscador_eventos").val()+
        "</strong><div data-state='off' onclick='cambiarEtiqueta(this)' class='fa fa-toggle-off etiqueta-filtro-cha'></div> <div onclick='eliminarEtiqueta(this)' class='fa fa-sm fa-remove etiqueta-filtro-del'></div></label>"
    );
    $(".etiqueta-filtro-div").data('cant', labels+1);
    if($(".buscador_eventos-value").val() === '' || $(".buscador_eventos-value").val() === null || $(".buscador_eventos-value").val() === undefined){
        $(".buscador_eventos-value").val($(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val()+"@off");
    }
    else{
        $(".buscador_eventos-value").val([$(".buscador_eventos-value").val(),$(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val(), 'off'].join(','));
    }
    busc.filtros_seleccionados.push($(".select-busc#fill-change").val()+"@"+$(".buscador_eventos").val()+"@off");
    $(".o_searchview_autocomplete").css('display', 'none');
    $(".o_searchview_autocomplete strong").html('');
    $(".buscador_eventos").val('');
    $(".buscador_eventos").focus();
    busc.page = 1;
    busc.buscar_action();

});


function eliminarEtiqueta(yo){
    busc.filtros_seleccionados.splice(busc.filtros_seleccionados.indexOf($(yo).parent().data('valor')),1);
    $(yo).parent().remove();
    $(".etiqueta-filtro").removeAttr('id');
    var count = 0;
    $(".etiqueta-filtro").each(function(){
        $(this).attr("id","label"+count);
        count++;
    });
    $(".etiqueta-filtro-div").data('cant', $(".etiqueta-filtro-div").data('cant')-1);
    busc.page = 1;
    busc.buscar_action();
}

function cambiarEtiqueta(yo){
    if($(yo).data('state') === 'off') {
        $(yo).parent().removeClass('label-primary');
        $(yo).parent().addClass('label-danger');
        $(yo).parent().data('valor', [$(yo).parent().data('valor').split('@')[0],$(yo).parent().data('valor').split('@')[1],'on'].join('@'));


        busc.filtros_seleccionados[parseInt($(yo).parent().attr('id').substring(5,6))] = $(yo).parent().data('valor');

        $(yo).parent().attr('title', "Removiendo "+'"'+$(yo).parent().children('strong').text()+'"'+" de la busqueda");
        $(yo).removeClass('fa-toggle-off');
        $(yo).addClass('fa-toggle-on');
        $(yo).data('state', 'on');
    }
    else{
        $(yo).parent().removeClass('label-danger');
        $(yo).parent().addClass('label-primary');
        $(yo).parent().data('valor', [$(yo).parent().data('valor').split('@')[0],$(yo).parent().data('valor').split('@')[1],'off'].join('@'));

        busc.filtros_seleccionados[parseInt($(yo).parent().attr('id').substring(5,6))] = $(yo).parent().data('valor');

        $(yo).parent().attr('title', "Buscando "+'"'+$(yo).parent().children('strong').text()+'"');

        $(yo).removeClass('fa-toggle-on');
        $(yo).addClass('fa-toggle-off');

        $(yo).data('state', 'off');
    }
    busc.page = 1;
    busc.buscar_action();
}



function add_zero(num){
    if(num.length == 1){
        num = '0'+num;
    }
    return num;
}

$(".setdates-buttons").on('click', function(e){
    e.preventDefault();
    $(".setdates-buttons").removeClass('active');
    $(this).addClass('active');
    var d;
    var h;
    if($(this).hasClass('dia')){
        d = new Date().toLocaleDateString();
        h = new Date().toLocaleDateString();
    }
    else if($(this).hasClass('semana')){
        var curr = new Date(); // get current date
        var first = curr.getDate() - curr.getDay() + 1; // First day is the day of the month - the day of the week
        var last = first + 6; // last day is the first day + 6
        d = new Date(curr.setDate(first)).toLocaleDateString();
        h = new Date(curr.setDate(last)).toLocaleDateString();
    }
    else{
        d = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString();
        h = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString();
    }

    $("#fecha-desde").val([d.split('/')[2],add_zero(d.split('/')[1]), add_zero(d.split('/')[0]) ].join('-'));
    $("#fecha-hasta").val([h.split('/')[2],add_zero(h.split('/')[1]), add_zero(h.split('/')[0]) ].join('-'));

    busc.setFechas();
});



function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    return new Date(d.setDate(diff)).toLocaleDateString().split(' ')[0];
}
function getSunday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6:1) + 6; // adjust when day is sunday
    return new Date(d.setDate(diff)).toLocaleDateString().split(' ')[0];
}


function next_page(){
    busc.page = (parseInt(busc.page) + 1).toString();
    busc.buscar_action();
}
function previus_page(){

    busc.page = (parseInt(busc.page) - 1).toString();
    busc.buscar_action();
}

function toggleColTable(ind1, ind2,  table){
    //columna de ind1 se intercambia por la con ind2
    var c = 0, htmlAux1 = null, htmlAux2 = null , stringHtml = '', classHtml = '', styleHtml = '', clickHtml = '';
    //FILAS
    htmlAux1 = $("#"+table+" tbody tr[data-ind="+ind1+"]");
    htmlAux2 = $("#"+table+" tbody tr[data-ind="+ind2+"]");

    stringHtml = htmlAux1.html();
    classHtml = htmlAux1.attr('class');
    styleHtml = htmlAux1.attr('style');
    clickHtml = htmlAux1.attr('onclick');

    htmlAux1.html(htmlAux2.html());
    htmlAux1.attr('class', htmlAux2.attr('class'));
    htmlAux1.attr('style', htmlAux2.attr('style'));
    htmlAux1.attr('onclick', htmlAux2.attr('onclick'));
    htmlAux1.data('ind', ind2);

    htmlAux2.html(stringHtml);
    htmlAux2.attr('class', classHtml);
    htmlAux2.attr('style', styleHtml);
    htmlAux2.attr('onclick', clickHtml);
    htmlAux2.data('ind', ind1);
}

function sortTable(table, yo){
    showLoad();
    setTimeout(function(){
        var indCol = $(yo).data('sort');
        var updown = $(yo).data('updown');
        $("#"+table+" thead tr th[data-sort="+indCol+"]").data('updown', !updown);
        $(yo).data('updown', !updown);
        //updown:
        // true: se ordena de mayor a menor
        // false: se ordena de menor a mayor
        var c = 0, arrayAux = [],  k;
        $("#"+table+" tbody tr td[data-sort="+indCol+"]").each(function(){
            if($(this).data('order')){
                arrayAux.push($(this).data('order'));
            }else{
                arrayAux.push($(this).html());
            }
        });
        if(updown){
            //SE ORDENA DE MAYOR A MENOR
            for(var i=0; i<arrayAux.length; i++) {
                for(var j=1; j < arrayAux.length; j++) {
                    if( arrayAux[j-1] <= arrayAux[j] ) {
                        k=arrayAux[j];
                        arrayAux[j]=arrayAux[j-1];
                        arrayAux[j-1]=k;
                        toggleColTable(j-1, j, table);
                    }
                }
            }
        }else{
            //SE ORDENA DE MENOR A MAYOR
            for(var i=0; i<arrayAux.length; i++) {
                for(var j=1; j < arrayAux.length; j++) {
                    if( arrayAux[j-1] > arrayAux[j] ) {
                        k=arrayAux[j];
                        arrayAux[j]=arrayAux[j-1];
                        arrayAux[j-1]=k;
                        toggleColTable(j-1, j, table);
                    }
                }
            }
        }
        hideLoad();
    }, 1000);
}





