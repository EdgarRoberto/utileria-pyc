$(function () {
    console.log("ready!");
    $('#lbl_tasainteresmueble').text(tasaInteresMueble);
    $('#lbl_tasainteresropa').text(tasaInteresRopa);
});

function generarScript(opcion, descrpcion) {
    let textData = $('#txt_listadoCodigos').val().trim();
    let chkvigencia = $('#chk_vigencia').prop('checked')
    let rows = textData.split('\n');
    let listadoCodigos = [];
    let tipoScriptText = $('#cbo_opcion option:selected').text();
    let tipoScript = $('#cbo_opcion').val();
    let updateProducts = `--Script ${tipoScriptText} - ${descrpcion}`;
    //console.log(chkvigencia);

    rows.forEach(row => {
        const columns = row.split(',').map(col => col.trim());
    
        if (columns.length === 5) {
            const [codigoRaw, priceRaw, areaRaw, fechainicioRaw, fechafinRaw] = columns;
            const codigo = parseInt(codigoRaw);
            const price = parseInt(priceRaw);
            const area = parseInt(areaRaw);
            const fechainicio = fechainicioRaw.trim();
            const fechafin = fechafinRaw.trim();
            const prefix = area === 3 ? 'M-' : 'R-';
            const partnumber = `${prefix}${codigoRaw}${areaRaw}`;
    
            listadoCodigos.push({
                Codigo: codigo,
                Price: price,
                Area: area,
                PartNumber: partnumber,
                FechaInicio: fechainicio,
                FechaFin:fechafin
            });
        }
    });

    listadoCodigos.forEach(plantilla => {
        const tasaInteres = plantilla.Area === 2 ? tasaInteresRopa : tasaInteresMueble;
        const precioInteres = Math.round(plantilla.Price * tasaInteres);
        const quincena = Math.round(precioInteres / 24);
        const field1 = `${quincena}/${precioInteres}/24`;
        let fechaInicio = opcion === 1 ? `'${plantilla.FechaInicio}'` : 'NULL';
        let fechaFin = opcion === 1 ? `'${plantilla.FechaFin}'` : 'NULL';
        const promotion_price = opcion === 0 ? 'NULL' : `'${plantilla.Price}'` ;

        if (!chkvigencia) {
            fechaInicio = 'NULL';
            fechaFin = 'NULL';
        }

        //1= Actualiza tienda virtual, 2=Actualiza salesforce
        if (tipoScript == 1) {
            updateProducts += `
UPDATE mov_deltas_products 
SET promotion_price=${promotion_price}, credito_price=${precioInteres}, fechainicialpromo=${fechaInicio}, fechafinalpromo=${fechaFin}, flag_price='${opcion}' 
WHERE numcodigo=${plantilla.Codigo} AND numarea=${plantilla.Area};

UPDATE mov_deltas_offer_price SET price=${plantilla.Price}, field1='${field1}' WHERE partnumber LIKE '%${plantilla.PartNumber}%';
`;
        } else {
            json = crearJsonSalesforce(opcion, precioInteres);

            updateProducts += `
SKU: ${plantilla.PartNumber}
Precio Oferta: ${plantilla.Price}
Price Book: ${json}
`
        }
    });

    $('#txt_precioofertaCSV').val(updateProducts);
}

function crearJsonSalesforce(tipoPromocion, precioCredito) {

    /* 1= promocion, 2=rebaja 0=quitar promocion rebaja */
    var nuevoTipo= "NULL";
    var nuevoPrecioCreditoBase=0;
    var nuevoPrecioCreditoPromocional=0;

    if (tipoPromocion ==1){
        nuevoTipo="PROMOTIONAL"
        nuevoPrecioCreditoPromocional= precioCredito
    }else{
        nuevoTipo="NULL"
        nuevoPrecioCreditoBase= precioCredito
    }

    var objetoPromocional = {
        "promotionalOfferId": "0", 
        "promotionalOfferPriceType": nuevoTipo, 
        "coppelCredit": {
            "itemCreditPriceFrom": nuevoPrecioCreditoBase
        },
        "coppelCreditPromotional": {
            "itemCreditPriceFrom": nuevoPrecioCreditoPromocional
        }
    };
    
    return JSON.stringify(objetoPromocional);
}

function copiarScript(id) {
    // Obtener el texto del div
    let textToCopy = $('#' + id + '').val().replace(/<br\s*\/?>/g, "\n");
    let div_copy = 'div_mensajecopypo';

    // if (id == 'txt_preciolistaCSV') {
    //     div_copy = 'div_mensajecopypl';
    // }

    // Usar la API de Clipboard para copiar el texto
    navigator.clipboard.writeText(textToCopy)
        .then(function () {
            // Opcional: Mostrar un mensaje de confirmación
            //alert('Texto copiado al portapapeles: ' + textToCopy);
            $('#' + div_copy + '').show();
            setTimeout(function () {
                $('#' + div_copy + '').hide();
            }, 5000);
        })
        .catch(function (error) {
            // Manejar errores de copiado
            console.error('Error al copiar el texto: ', error);
        });
}

function descargaScript(id) {
    let textData = $('#' + id + '').val().trim();
    let rows = textData.split('\n');

    // Obtener fecha y hora actual
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minuto = String(ahora.getMinutes()).padStart(2, '0');
    const segundo = String(ahora.getSeconds()).padStart(2, '0');

    const nombreArchivo = `promociones_script_${año}-${mes}-${dia}_${hora}-${minuto}-${segundo}.sql`;

    let csvData=[]
    // Recorrer cada fila y añadir los datos procesados a csvData
    rows.forEach(function (row) {
        csvData.push(row);
    });

    // Convertir la matriz a una cadena CSV
    let csvString = csvData.join('\n');

    // Crear un blob y un enlace para descargar el CSV
    let blob = new Blob([csvString], { type: 'text/sql' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

