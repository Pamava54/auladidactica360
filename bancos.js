/* ==========================================================
   BANCOS DE PREGUNTAS LISTOS
   tipo: 'multiple' (correcta = 0..3), 'vf' (correcta = 0 Verdadero, 1 Falso), 'desc' (modelo = respuesta modelo)
   Para agregar un banco nuevo, copia un bloque y cambia los datos.
   ========================================================== */
(function(){
const M = (tema, texto, opciones, correcta) => ({ tipo: 'multiple', tema, texto, opciones, correcta, segundos: 20 });
const VF = (tema, texto, correcta) => ({ tipo: 'vf', tema, texto, correcta, segundos: 15 });
const D = (tema, texto, modelo) => ({ tipo: 'desc', tema, texto, modelo, segundos: 60 });

window.BANCOS = [
  { id: 'contabilidad-basica', nombre: 'Contabilidad básica', preguntas: [
    M('Activos', '¿Cuál de estas cuentas es un activo?', ['Proveedores', 'Caja', 'Capital social', 'Ingresos por ventas'], 1),
    M('Ecuación', 'La ecuación contable básica es:', ['Activo = Pasivo + Patrimonio', 'Activo + Pasivo = Patrimonio', 'Pasivo = Activo + Patrimonio', 'Patrimonio = Pasivo − Activo'], 0),
    M('PUC', 'En el Plan Único de Cuentas (PUC) colombiano, la clase 2 corresponde a:', ['Activo', 'Patrimonio', 'Pasivo', 'Ingresos'], 2),
    M('Naturaleza', '¿Cuál de estas cuentas tiene naturaleza crédito?', ['Inventarios', 'Bancos', 'Gastos de personal', 'Proveedores'], 3),
    VF('Activos', 'Un activo es un recurso controlado por la empresa del que se espera obtener beneficios económicos.', 0),
    VF('Gastos', 'Las cuentas de gastos aumentan por el crédito.', 1),
    VF('Patrimonio', 'El patrimonio es lo que queda de los activos después de restar los pasivos.', 0),
    D('Partida doble', 'Explica con tus palabras qué es la partida doble.', 'Todo hecho económico afecta como mínimo dos cuentas, y el total de los débitos siempre es igual al total de los créditos.'),
    D('Pasivo', 'Define qué es un pasivo y da dos ejemplos.', 'Obligación presente de la empresa con terceros, originada en hechos pasados. Ejemplos: proveedores, obligaciones financieras, impuestos por pagar.'),
    D('Gasto y costo', '¿Qué diferencia hay entre un gasto y un costo?', 'El costo está relacionado directamente con producir o comprar lo que se vende; el gasto corresponde a lo necesario para administrar el negocio y venderlo (administración y ventas).')
  ] },

  { id: 'asientos-libros', nombre: 'Asientos y libros contables', preguntas: [
    M('Libro diario', '¿En qué libro se registran los hechos económicos en orden cronológico?', ['Libro mayor', 'Libro diario', 'Balance de prueba', 'Libro de inventarios'], 1),
    M('Libro mayor', 'El libro mayor sirve para:', ['Agrupar los movimientos por cuenta', 'Registrar solo las ventas', 'Guardar las facturas físicas', 'Calcular la nómina'], 0),
    M('Compras', 'Al comprar mercancía de contado, ¿qué cuentas se afectan principalmente?', ['Inventarios (crédito) y Caja (débito)', 'Gastos (débito) y Proveedores (débito)', 'Inventarios (débito) y Caja o Bancos (crédito)', 'Ingresos (crédito) y Caja (crédito)'], 2),
    M('Balance de prueba', 'El balance de prueba permite verificar que:', ['Las ventas aumentaron', 'La empresa pagó sus impuestos', 'Los inventarios no tengan pérdidas', 'Los saldos débito y crédito de las cuentas estén cuadrados'], 3),
    VF('Asiento', 'Un asiento contable es correcto cuando los débitos y los créditos suman lo mismo.', 0),
    VF('Libro diario', 'El libro diario se lleva solo al final del año.', 1),
    VF('Comprobante', 'Un comprobante contable es el documento interno que respalda un asiento.', 0),
    D('Registro', 'Describe los pasos para registrar un hecho económico en la contabilidad.', 'Identificar el documento soporte, analizar qué cuentas se afectan, determinar su naturaleza (débito o crédito), registrar el asiento en el libro diario, pasar los valores al libro mayor y verificar que quede cuadrado.'),
    D('Soporte', '¿Para qué sirve el documento soporte de un asiento? Da un ejemplo.', 'Respalda y comprueba que el hecho económico ocurrió. Ejemplos: factura de venta o de compra, recibo de caja, extracto bancario.'),
    D('Ajustes', 'Explica qué es un asiento de ajuste y cuándo se hace.', 'Es el registro que se hace al cierre de un periodo para reconocer hechos que aún no se han contabilizado, como la depreciación, gastos pagados por anticipado o intereses causados, para que los estados financieros reflejen la realidad.')
  ] },

  { id: 'iva-facturacion', nombre: 'IVA y facturación', preguntas: [
    M('IVA', 'El IVA es un impuesto:', ['Directo sobre la renta', 'Indirecto sobre el consumo', 'Sobre el patrimonio', 'Municipal sobre industria y comercio'], 1),
    M('IVA por pagar', 'Para calcular el IVA por pagar de un periodo se compara:', ['IVA generado menos IVA descontable', 'Ingresos menos gastos', 'Activos menos pasivos', 'Compras menos ventas'], 0),
    M('Tarifa', 'En Colombia, la tarifa general del IVA es:', ['5 %', '16 %', '19 %', '21 %'], 2),
    M('Factura', '¿Cuál documento soporta electrónicamente una venta gravada con IVA?', ['Cotización', 'Orden de compra', 'Remisión', 'Factura electrónica de venta'], 3),
    VF('IVA descontable', 'El IVA descontable es el que la empresa paga en sus compras y puede restar del IVA generado.', 0),
    VF('Bienes gravados', 'Todos los bienes y servicios están gravados con IVA.', 1),
    VF('IVA generado', 'El IVA generado es el que cobra la empresa en sus ventas.', 0),
    D('Generado y descontable', 'Explica la diferencia entre IVA generado e IVA descontable.', 'Generado: el IVA que la empresa cobra a sus clientes en las ventas. Descontable: el IVA que la empresa pagó en compras y gastos y que puede restar del generado.'),
    D('Excluido y exento', '¿Qué diferencia hay entre un producto excluido y uno exento de IVA?', 'Excluido: no causa IVA y quien lo vende no puede descontar el IVA de sus compras. Exento: causa IVA a tarifa 0 %, por lo que quien lo vende sí puede descontar el IVA de sus compras.'),
    D('Factura', 'Menciona los datos mínimos que debe tener una factura de venta.', 'Datos del vendedor y del comprador (nombre y NIT), número de factura, fecha, descripción de bienes o servicios, valor unitario y total, IVA discriminado y forma de pago.')
  ] },

  { id: 'nomina', nombre: 'Nómina y prestaciones sociales', preguntas: [
    M('Cesantías', 'Las cesantías equivalen aproximadamente a:', ['Medio mes de salario por año', 'Tres meses de salario por año', 'Un mes de salario por cada año de servicio', 'Una quincena por año'], 2),
    M('Prima', 'La prima de servicios se paga en:', ['Una sola cuota en enero', 'Dos cuotas: junio y diciembre', 'Cuatro cuotas al año', 'Cada mes'], 1),
    M('Seguridad social', '¿Cuál de estos aportes hace parte de la seguridad social?', ['Prima de servicios', 'Vacaciones', 'Pensión', 'Cesantías'], 2),
    M('Vacaciones', 'Por cada año de servicio, el trabajador tiene derecho a vacaciones de:', ['8 días hábiles', '10 días hábiles', '15 días hábiles', '30 días calendario'], 2),
    VF('Auxilio de transporte', 'El auxilio de transporte hace parte de la base para calcular los aportes de seguridad social.', 1),
    VF('Aportes', 'Los aportes a salud y pensión se liquidan sobre el salario del trabajador.', 0),
    VF('Prima', 'Un trabajador con contrato a término indefinido no tiene derecho a prima de servicios.', 1),
    D('Nómina', 'Explica qué es la liquidación de nómina.', 'Proceso de calcular lo que se paga a cada trabajador en un periodo: salario devengado, horas extras y auxilios, menos las deducciones de ley (salud, pensión) y otras deducciones, para obtener el neto a pagar.'),
    D('Devengados', '¿Qué diferencia hay entre devengados y deducciones?', 'Devengados: lo que gana el trabajador (salario, horas extras, auxilio de transporte, comisiones). Deducciones: lo que se descuenta (aporte a salud, pensión, libranzas, préstamos).'),
    D('Prestaciones', '¿Qué son las prestaciones sociales? Menciona dos.', 'Beneficios que la ley reconoce al trabajador además del salario; por ejemplo prima de servicios, cesantías, intereses sobre las cesantías y dotación.')
  ] },

  { id: 'conciliacion-bancaria', nombre: 'Conciliación bancaria', preguntas: [
    M('Partidas', '¿Cuál es una partida conciliatoria típica?', ['Compra de inventario', 'Pago de nómina quincenal', 'Venta a crédito', 'Cheque girado y no cobrado'], 3),
    M('Tránsito', 'Una consignación en tránsito es:', ['Dinero consignado por la empresa que el banco aún no refleja', 'Un cheque devuelto', 'Un cobro de comisión del banco', 'Un préstamo aprobado'], 0),
    M('Nota débito', 'Una nota débito del banco por comisiones se debe:', ['Ignorar porque no afecta', 'Registrar en los libros de la empresa', 'Devolver al banco', 'Pagar con caja menor'], 1),
    M('GMF', 'El GMF (4 por mil) es:', ['Una comisión que cobra la empresa', 'Una multa del banco', 'El gravamen a los movimientos financieros', 'El interés de una cuenta de ahorros'], 2),
    VF('Conciliación', 'La conciliación bancaria compara el extracto del banco con el libro de bancos de la empresa.', 0),
    VF('Diferencias', 'Si el saldo del banco y el de libros son distintos, siempre hay un error del banco.', 1),
    VF('Cheques', 'Un cheque girado y no cobrado ya disminuyó el saldo en libros, pero aún no el del banco.', 0),
    D('Objetivo', '¿Para qué se hace una conciliación bancaria?', 'Para comparar el saldo del extracto con el de los libros, identificar las diferencias (partidas conciliatorias), detectar errores y fraudes y dejar el saldo de bancos ajustado a la realidad.'),
    D('Nota crédito', 'Explica qué hacer con una nota crédito del banco que no está registrada.', 'Verificar el concepto (por ejemplo intereses o una consignación directa) y registrarla en libros aumentando Bancos y acreditando la cuenta que corresponda.'),
    D('Diferencias', 'Menciona tres diferencias comunes entre el extracto bancario y los libros.', 'Cheques girados no cobrados, consignaciones en tránsito, notas débito o crédito del banco sin registrar, errores de digitación.')
  ] },

  { id: 'ventas-servicio', nombre: 'Ventas y servicio al cliente', preguntas: [
    M('Objeción de precio', '¿Cuál es la mejor forma de manejar una objeción de precio?', ['Bajar el precio de inmediato', 'Escuchar, validar y mostrar el valor del producto', 'Ignorarla y cambiar de tema', 'Decir que el cliente se equivoca'], 1),
    M('Empatía', 'La empatía en el servicio al cliente consiste en:', ['Hablar rápido', 'Evitar las quejas', 'Ponerse en el lugar del cliente y entender su necesidad', 'Dar siempre la razón'], 2),
    M('Ciclo de venta', 'En el ciclo de ventas, ¿qué paso sigue después de detectar la necesidad del cliente?', ['Cerrar la venta', 'Despedirse', 'Cobrar', 'Presentar la propuesta o solución'], 3),
    M('Quejas', 'Una queja bien atendida puede convertirse en:', ['Una oportunidad de fidelizar al cliente', 'Una pérdida segura', 'Un trámite sin importancia', 'Un motivo para cerrar el negocio'], 0),
    VF('Escucha', 'Escuchar activamente es clave para detectar la necesidad del cliente.', 0),
    VF('Cliente molesto', 'Un cliente molesto siempre quiere maltratar al asesor.', 1),
    VF('Fidelizar', 'Fidelizar a un cliente suele costar menos que conseguir uno nuevo.', 0),
    D('Objeción', '¿Qué es una objeción y cómo se maneja?', 'Es una duda o resistencia del cliente frente a la compra. Se maneja escuchando, validando lo que siente, preguntando para entender el motivo y respondiendo con beneficios y evidencias.'),
    D('Queja', 'Describe tres pasos para atender una queja.', 'Escuchar sin interrumpir, empatizar y pedir disculpas si corresponde, proponer una solución, hacer seguimiento y confirmar la satisfacción del cliente.'),
    D('Fidelizar', '¿Qué significa fidelizar a un cliente?', 'Lograr que el cliente vuelva y recomiende la empresa mediante buena atención, cumplimiento y valor constante.')
  ] }
];
})();
