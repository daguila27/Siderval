
class Buscador{
    constructor(idinput, tag, array_fill, url, idtabla, ispage, dateFilter, iddate_section, columnaRango){
        this.filtros_seleccionados = [];
        this.idinput = idinput;
        this.iddate = iddate_section;
        this.tag = tag;
        this.array_fill = array_fill;
        this.url = url;
        this.idtabla = idtabla;
        this.page = 1;
        this.ispage = ispage;
        this.add_cond = '';
        this.datefill = dateFilter;
        this.rango = [];
        this.extraInfo = [];
        // Pagina actual
        this.limit = ( ( (this.page-1)*100) + 1 )+","+((this.page-1)*100 + 100);
        this.lastpage = false;
        this.html =
            "<div class='form-control etiqueta-input' style='display:flex; vertical-align: center'>" +
            "<div class='etiqueta-filtro-div' style='height: 100%;' data-cant='0'>" +
            "</div>" +
            "<input class='buscador_eventos' id='"+idinput+"' style='border: none;' placeholder='Buscar…' type='text' data-cfiltros='"+this.array_fill.length+"' autocomplete='off'>" +
            "<input id='"+idinput+"-value' style='display: none' type='text'>" +
            "<select style='margin: 0; padding: 0; width: 20%' class='btn btn-default select-busc' id='fill-change'>" ;
        this.columnaRango = columnaRango;
        for(var e=0; e < array_fill.length; e++){
            this.html += "<option value='"+e+"' class='item"+e+" fill-item-abast o-selection-focus'>"+array_fill[e].split('@')[0]+"</option>";
        }
        this.html += "</select></div>";
        if(this.datefill){
            $(this.iddate).html("<div class='dropdown' style='margin-left: 15px'>" +
                "<button class='btn btn-default dropdown-toggle' type='button' data-toggle='dropdown'>Acotar Fecha " +
                "<span class='caret'></span></button>" +
                "<ul class='dropdown-menu' style='padding: 7px'>" +
                "<li style='padding: 0px 10px; display:flex; width: 100%'>" +
                "<button class='dia setdates-buttons btn btn-xs btn-default' data-value='"+new Date().toLocaleDateString().split(' ')[0]+'@'+new Date().toLocaleDateString().split(' ')[0]+"'>Hoy</button>" +
                "<button class='semana setdates-buttons btn btn-xs btn-default' data-value='"+this.getMonday(new Date())+'@'+this.getSunday(new Date())+"'>Esta Semana</button>" +
                "<button class='mes setdates-buttons btn btn-xs btn-default active' data-value='"+new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString().split(' ')[0]+'@'+new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString().split(' ')[0]+"'>Este Mes</button>" +
                "</li>" +
                "<li class='dropdown-header'>Desde:</li>" +
                "<li><input id='fecha-desde' class='form-control' type='date' value='"+new Date(new Date().getFullYear(), new Date().getMonth(), 1)+"'></li>" +
                "<li class='divider'></li>" +
                "<li class='dropdown-header'>Hasta:</li>" +
                "<li><input id='fecha-hasta' class='form-control' type='date' value='"+ new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)+"'></li>" +
                "<li class='divider'></li>" +
                "<li class='pull-right' style='padding: 0px 10px'>" +
                "<button class='btn btn-xs btn-primary' onclick='busc.restartFechas()'><i class='fa fa-refresh' aria-hidden='true'></i></button>" +
                "<button class='btn btn-xs btn-success' onclick='busc.setFechas()'><i class='fa fa-check'></i></button>" +
                "</li>" +
                "</ul>" +
                "</div>");
        }


        $(this.tag).html(this.html);
    }


    //add_cond es un string con la concatenación en sql de cualquier filtro adicional que se desea incluir
    //Ejemplo: "material.detalle>0@gd.tipo='Blanco'";
    buscar_action(forpageoc){
        var t = this.idtabla;
        var ispage = this.ispage;
        $.ajax({
            type: 'POST',
            data: {clave: this.filtros_seleccionados.join(','),cond: this.add_cond, ispage: ispage, rango: this.rango.join('@'), page: this.page, isRango: this.datefill, columnaRango: this.columnaRango, extraInfo: this.extraInfo.join('%')  },
            url: this.url,
            beforeSend: function(){
                if(!forpageoc){
                    $("#"+t).DataTable().destroy();
                }
                $(".main-page").html("<div style='width: 100%; height:100%;text-align: center;'><img style='width: 20%;margin: 11%;' src='/loading.gif'></div>");

            },
            success: function(data){

                $(".main-page").html(data);
                $("#"+t).css('font-family', '12px');
                $(".up-fills").css('margin-top', $("#oe_main_menu_navbar").height());
                $("#fw-container").css('margin-top', $("#oe_main_menu_navbar").height()+$(".up-fills").height());

            }
        });
    }


    destroyDataTable(reload){
        $("#"+this.idtabla).DataTable().destroy();
        $(".main-page").html("<div style='width: 100%; height:100%;text-align: center;'><img style='width: 20%;margin: 11%;' src='/loading.gif'></div>");
        var i = this;
        $(".main-page").html("<div style='width: 100%; height:100%;text-align: center;'><img style='width: 20%;margin: 11%;' src='/loading.gif'></div>");
        if(reload){
            setTimeout(function(){ i.buscar_action(); }, 100);
        }
    }


    renderPagesIndicator(idtag){
        if(this.ispage){
            //Muestra la cantidad de pedidos
            if(this.page === 1 && this.lastpage){
                $(idtag).html("<h5><small>Mostrando de " + this.limit.split(',')[0] + " a "+this.limit.split(',')[1]+" pedido(s).</small></h5>");
            }
            else if(this.page === 1){
                $(idtag).html("<h5><small>Mostrando de " + this.limit.split(',')[0] + " a "+this.limit.split(',')[1]+" <b class='ch_page' onclick='next_page()'> &raquo; </b> pedido(s).</small></h5>");
            }
            else if(this.lastpage){
                $(idtag).html("<h5><small>Mostrando de <b class='ch_page' onclick='previus_page()'> &laquo; </b> " + this.limit.split(',')[0] + " a "+this.limit.split(',')[1]+"  pedido(s).</small></h5>");
            }
            else{
                $(idtag).html("<h5><small>Mostrando de <b class='ch_page' onclick='previus_page()'> &laquo; </b> " + this.limit.split(',')[0] + " a "+this.limit.split(',')[1]+" <b class='ch_page' onclick='next_page()'> &raquo; </b> pedido(s).</small></h5>");
            }
        }
        else{
            $(idtag).html("<h5><small>Mostrando "+$(idtag).data('total')+" pedido(s).</small></h5>");
        }

    }


    setIndicadorPaginas(largo, tag){
        if(this.ispage){
            this.lastpage = largo < 100 ;
            if(this.lastpage){
                this.limit = ( ( (this.page-1)*100) + 1 )+","+((this.page-1)*100 + largo);
            }
            else{
                this.limit = ( ( (this.page-1)*100) + 1 )+","+((this.page-1)*100 + 100);

            }
            this.renderPagesIndicator(tag);
        }
        else{
            $(tag).data('total', largo);
            this.renderPagesIndicator(tag);
        }
    }


    setFechas(){
        if($("#fecha-desde").val() == '' || $("#fecha-hasta").val() == ''){
            alert("Debe ingresar ambas fechas.");
        }
        else{

            $(".indicator-of-check").css('display', 'none');
            this.rango = [$("#fecha-desde").val(),$("#fecha-hasta").val()];

            this.buscar_action();
        }
    }

    restartFechas(){
        this.rango = [];
        $(".indicator-of-check").css('display', 'block');
        this.buscar_action();
    }




    getMonday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
        return new Date(d.setDate(diff)).toLocaleDateString().split(' ')[0];
    }
    getSunday(d) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6:1) + 6; // adjust when day is sunday
        return new Date(d.setDate(diff)).toLocaleDateString().split(' ')[0];
    }


}

