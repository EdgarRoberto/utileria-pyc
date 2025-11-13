# app/inventario.py
from flask import Flask, render_template, request, redirect, url_for, jsonify
from app import app
import json

TASA_INTERES_MUEBLE = 1.34
TASA_INTERES_ROPA = 1.39


@app.route('/helix_precio_oferta')
def helix_precio_oferta():
    return render_template('helix_precio_oferta.html')

@app.route('/api/tasainteres', methods=['GET'])
def tasainteres():
    return jsonify({
                    "ropa": TASA_INTERES_ROPA,
                    "mueble": TASA_INTERES_MUEBLE
                }), 200 # 200 es el código de éxito HTTPreturn jsonify({datos})



@app.route('/api/procesar', methods=['POST'])
def procesar_json():
    # Verifica que la solicitud sea POST
    if request.method == 'POST':
        # Captura el cuerpo de la solicitud como un diccionario Python
        datos = request.get_json() 

        vigencia = datos.get('vigencia') 
        tipoScript = int(datos.get('tipoScript'))
        updateProducts = datos.get('updateProducts')
        opcion = datos.get('opcion')
        rows = datos.get('rows')

        listadoCodigos = []  # Asegúrate de que esta lista esté definida antes del bucle
        for row in rows:
            # 1. Dividir la fila por comas y eliminar espacios en blanco alrededor
            columns = [col.strip() for col in row.split(',')]

            # 2. Verificar que haya exactamente 5 columnas
            if len(columns) == 5:
                # 3. Desestructuración/Asignación de variables
                codigo_raw, price_raw, area_raw, fechainicio_raw, fechafin_raw = columns

                # 4. Conversión de tipos (usando int() para parseInt)
                try:
                    codigo = int(codigo_raw)
                    price = int(price_raw)
                    area = int(area_raw)
                except ValueError:
                    # Manejar el caso si la conversión a entero falla (opcional)
                    print(f"Advertencia: No se pudieron convertir los valores numéricos en la fila: {row}")
                    continue # Salta a la siguiente fila

                # 5. Mantener los campos de fecha como strings limpios
                fechainicio = fechainicio_raw.strip()
                fechafin = fechafin_raw.strip()

                # 6. Lógica para el prefijo y PartNumber (usando f-strings para interpolación)
                prefix = 'M-' if area == 3 else 'R-'
                partnumber = f"{prefix}{codigo_raw}{area_raw}"

                # 7. Agregar el diccionario resultante a la lista
                listadoCodigos.append({
                    "Codigo": codigo,
                    "Price": price,
                    "Area": area,
                    "PartNumber": partnumber,
                    "FechaInicio": fechainicio,
                    "FechaFin": fechafin
                })


        for plantilla in listadoCodigos:
            tasa_interes = TASA_INTERES_ROPA if int(plantilla['Area']) == 2 else TASA_INTERES_MUEBLE

            precio_interes = round(plantilla['Price'] * tasa_interes)
            quincena = round(precio_interes / 24)

            field1 = f"{quincena}/{precio_interes}/24"

            # Determinar los valores de fecha y promotion_price
            if opcion == 1:
                fecha_inicio = f"'{plantilla['FechaInicio']}'"
                fecha_fin = f"'{plantilla['FechaFin']}'"
                promotion_price = f"'{plantilla['Price']}'"
            else:
                fecha_inicio = 'NULL'
                fecha_fin = 'NULL'
                promotion_price = 'NULL'
            
            # Aplicar la lógica de anulación de fechas (vigencia)
            if not vigencia:
                fecha_inicio = 'NULL'
                fecha_fin = 'NULL'

            # Generar el script de salida (usando f-strings multilínea)

            # 1 = Actualiza tienda virtual, 2 = Actualiza salesforce
            if tipoScript == 1:
                # Usamos f-strings multilínea (triples comillas) para el SQL
                updateProducts += f"""
UPDATE mov_deltas_products 
SET promotion_price={promotion_price}, credito_price={precio_interes}, fechainicialpromo={fecha_inicio}, fechafinalpromo={fecha_fin}, flag_price='{opcion}' 
WHERE numcodigo={plantilla['Codigo']} AND numarea={plantilla['Area']};

UPDATE mov_deltas_offer_price SET price={plantilla['Price']}, field1='{field1}' WHERE partnumber LIKE '%{plantilla['PartNumber']}%';
"""
            else: # tipoScript == 2
                # Asumimos que crearJsonSalesforce es una función de Python
                json_data = crearJsonSalesforce(opcion, precio_interes)

                updateProducts += f"""
SKU: {plantilla['PartNumber']}
Precio Oferta: {plantilla['Price']}
Price Book: {json_data}
"""

        return jsonify({
                    "status": "success",
                    "datos_procesados": {"resultado": updateProducts, "tipo": tipoScript}
                }), 200 # 200 es el código de éxito HTTPreturn jsonify({datos})
    

def crearJsonSalesforce(tipo_promocion, precio_credito):
    # Inicialización de variables (se usa snake_case por convención de Python)
    nuevo_tipo = "NULL"
    nuevo_precio_credito_base = 0
    nuevo_precio_credito_promocional = 0

    # 1. Lógica para determinar el tipo y la asignación de precios
    # JavaScript usa '==' que en este contexto es similar a '==' en Python.
    if tipo_promocion == 1:
        nuevo_tipo = "PROMOTIONAL"
        nuevo_precio_credito_promocional = precio_credito
    else:
        # Nota: En el JS original, el caso '2' o '0' cae aquí.
        # Si es '2', se usa como precio base. Si es '0', también se usa como precio base.
        # Asumimos que si no es 1, el precio va al campo 'Base'.
        nuevo_tipo = "NULL"
        nuevo_precio_credito_base = precio_credito

    # 2. Creación del objeto/diccionario de Python
    objeto_promocional = {
        "promotionalOfferId": "0",
        "promotionalOfferPriceType": nuevo_tipo,
        "coppelCredit": {
            "itemCreditPriceFrom": nuevo_precio_credito_base
        },
        "coppelCreditPromotional": {
            "itemCreditPriceFrom": nuevo_precio_credito_promocional
        }
    }

    # 3. Serialización a cadena JSON (equivalente a JSON.stringify)
    return json.dumps(objeto_promocional)

       