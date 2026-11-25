# consumoelectrico

Aplicación de cálculo de consumo eléctrico y generación de esquemas unifilares y de tablero desde una planilla Excel, con exportación a SVG y DXF editable por capas.

## Uso

1. Descargar o clonar este repositorio.
2. Abrir `sistema-calculo-electrico/index.html` en Chrome o Edge, conservando las carpetas y archivos que lo acompañan.
3. Revisar los parámetros del proyecto.
4. En **Cargas → Importar Excel**, elegir la planilla y confirmar las cargas de la vista previa.
5. Revisar FP, fases, respaldo y longitudes antes de generar los planos.
6. En **Diagrama unifilar** o **Tablero**, recorrer el dibujo con el zoom y descargar el DXF o SVG.

La importación y generación se realizan localmente en el navegador. No requieren un servidor ni instalación de paquetes.

## Archivos

- `Calculo de consumo Sala El Tabo.xlsx`: planilla de ejemplo utilizada para las pruebas.
- `sistema-calculo-electrico/index.html`: aplicación.
- `sistema-calculo-electrico/cad.js`: geometría compartida entre SVG y DXF e interpretación de las filas de entrada.
- `sistema-calculo-electrico/entregables/`: ejemplos de planos DXF y SVG.
- `sistema-calculo-electrico/LEEME.txt`: instrucciones, supuestos y alcance técnico.
- `sistema-calculo-electrico/respaldo/index-original.html`: versión inicial del prototipo.
- `sistema-calculo-electrico/vendor/`: SheetJS CE 0.20.3 y su licencia.

## Validación

Con Node.js instalado, desde la raíz del repositorio:

```sh
node sistema-calculo-electrico/tests/cad.test.cjs
```

Para regenerar los ejemplos:

```sh
node sistema-calculo-electrico/tests/cad.test.cjs --export
```

Las pruebas cubren la planilla suministrada, conservación de partidas, separación de respaldo, conexión de UPS, geometría SVG/DXF, textos largos, múltiples circuitos, proyecto vacío y entradas inválidas.

## Alcance técnico

Los planos son esquemas de anteproyecto con simbología simplificada y sin escala física. El tablero no representa un diseño de fabricación. El cálculo original utiliza criterios orientativos; sus resultados requieren revisión de ingeniería, especialmente el balance por fase, las protecciones y la compatibilidad del respaldo.

El Excel no contiene todas las especificaciones necesarias para definir gabinete, módulos DIN, borneras, curvas, poder de corte, sensibilidad diferencial ni conexiones N/PE. Los ejemplos conservan parámetros del prototipo que no se deducen de la planilla. Consulte `LEEME.txt` antes de utilizarlos.

Los DXF se verificaron mediante lectura y auditoría con ezdxf; aún no se ha comprobado su apertura en AutoCAD.
