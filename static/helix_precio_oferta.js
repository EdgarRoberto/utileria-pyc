$(function () {
    tasainteres(); 
});

async function tasainteres(){
    try {
        const response = await fetch('/api/tasainteres', {
            method: 'GET',
        });

        // Manejo explícito de respuestas no exitosas (status 4xx, 5xx)
        if (!response.ok) {
             const errorData = await response.json();
             infosistema(errorData.message || `Error en la solicitud con estado ${response.status}`);
             throw new Error(errorData.message || `Error en la solicitud con estado ${response.status}`);
        }

        const data = await response.json();
        $('#lbl_tasainteresmueble').text(data.mueble);
        $('#lbl_tasainteresropa').text(data.ropa);
        //console.log(data.mueble);
    } catch (error) {
        console.error('❌ Error al enviar o procesar la solicitud:', error.message || error);
        infosistema('❌ Error al enviar o procesar la solicitud');
    }
}


async function generarScript(opcion, descripcion) {
    const $listadoCodigos = $('#txt_listadoCodigos');
    const $vigencia = $('#chk_vigencia');
    const $opcion = $('#cbo_opcion');
    const textData = $listadoCodigos.val()?.trim() ?? ''; // Uso de optional chaining y nullish coalescing
    const vigencia = $vigencia.prop('checked') ?? false;
    // Filtramos las filas vacías que pueden resultar de un split con múltiples saltos de línea
    const rows = textData.split('\n').filter(row => row.trim() !== '');
    const tipoScriptText = $opcion.find('option:selected').text();
    const tipoScript = $opcion.val();
    const updateProducts = `--Script ${tipoScriptText} - ${descripcion}`;

    // Objeto de datos a enviar: uso de shorthand property names (si las variables coinciden)
    const datosAEnviar = {
        vigencia, 
        rows,
        tipoScript,
        updateProducts,
        opcion
    };
    // 4. Petición con fetch y async/await
    try {
        const response = await fetch('/api/procesar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosAEnviar)
        });

        if (!response.ok) {
             const errorData = await response.json();
             infosistema(errorData.message || `Error en la solicitud con estado ${response.status}`);
             throw new Error(errorData.message || `Error en la solicitud con estado ${response.status}`);
        }

        const data = await response.json();
        $('#txt_precioofertaCSV').val(data?.datos_procesados?.resultado ?? ''); // Uso de optional chaining
        infosistema('Script generado');
    } catch (error) {
        infosistema('❌ Error al enviar o procesar la solicitud');
        console.error('❌ Error al enviar o procesar la solicitud:', error.message || error);
    }
}

function infosistema(texto) {
    $('#info-sistema').text(texto);
    setTimeout(function () {
        $('#info-sistema').text('Creado con ❤️ por Edgar Guzmán');
    }, 5000);
}

function copiarScript(id) {
    // Obtener el texto del div
    let textToCopy = $('#' + id + '').val().replace(/<br\s*\/?>/g, "\n");
    //let div_copy = 'div_mensajecopypo';

    // if (id == 'txt_preciolistaCSV') {
    //     div_copy = 'div_mensajecopypl';
    // }

    // Usar la API de Clipboard para copiar el texto
    navigator.clipboard.writeText(textToCopy)
        .then(function () {
            // Opcional: Mostrar un mensaje de confirmación
            //alert('Texto copiado al portapapeles: ' + textToCopy);
            infosistema('Texto copiado al portapapeles');
            console.log("Texto copiado al portapapeles");

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
    infosistema('Archivo descargado');
}

