**REGLAS DE NEGOCIO PARA COMFENALCO**



**1. Carné Virtual**

Este submódulo es de consulta y verificación automatizada. No genera trámites complejos, pero restringe el acceso al ecosistema de beneficios corporativos de la Caja.

* RN-CV-001 (Validación de Afiliación): El sistema debe validar en tiempo real el estado del afiliado en la base de datos de aportes. Solo se expedirá el carné si el estado es ACTIVO.
* RN-CV-002 (Categorización Automática): El carné debe calcular y mostrar de manera obligatoria la categoría del afiliado (A, B o C) según sus ingresos mensuales calculados en Salarios Mínimos Mensuales Legales Vigentes (SMMLV):

&#x09;\* Categoría A: Ingresos de hasta 2 SMMLV.

&#x09;\* Categoría B: Ingresos de más de 2 y hasta 4 SMMLV.

&#x09;\* Categoría C: Ingresos superiores a 4 SMMLV.

* RN-CV-003 (Grupo Familiar adjunto): El carné del cotizante principal debe desplegar un arreglo o lista con los nombres, identificaciones y categorías de sus beneficiarios activos registrados (hijos, padres, cónyuge).



**2. Subsidio de Vivienda (FOVIS)**

Basado en la Ley de Subsidio Familiar de Vivienda de las Cajas de Compensación.

* RN-SV-001 (Techo de Ingresos): Los ingresos del grupo familiar postulante no deben superar los 4 SMMLV acumulados. Si la suma es > 4 SMMLV, el sistema bloqueará la radicación.
* RN-SV-002 (Cruce de Propiedad Inmobiliaria): El operador debe marcar una declaración juramentada donde conste que ningún miembro del hogar es propietario o poseedor de una vivienda en el territorio nacional (aplica para la modalidad de adquisición de vivienda nueva).
* RN-SV-003 (Preaprobación Financiera): Es obligatorio adjuntar de forma digital la carta de preaprobación de crédito hipotecario o leasing habitacional emitida por una entidad financiera, con vigencia no mayor a 90 días.
* RN-SV-004 (Restricción de Doble Beneficio): El sistema rechazará la solicitud si las identificaciones del hogar registran subsidios de vivienda asignados previamente por Fonvivienda, el Banco Agrario o cualquier otra Caja de Compensación (salvo concurrencia de subsidios autorizada por el programa nacional Mi Casa Ya).



**3. Subsidio de Desempleo (FOSFEC)**

Regulado por la Ley 1636 de 2013 y modificaciones vigentes como la Ley 2225 de 2022.

* RN-SD-001 (Tiempo mínimo de Cotización): El sistema cruzará datos e impedirá continuar si el postulante cesante no cumple con los aportes mínimos en los últimos 3 años:Trabajador Dependiente: Mínimo 12 meses de aportes continuos o discontinuos.Trabajador Independiente: Mínimo 24 meses de aportes continuos o discontinuos.
* RN-SD-002 (Última Caja de Afiliación): El sistema debe verificar que la última Caja a la que aportó el usuario sea Comfenalco Santander. De lo contrario, se disparará una alerta redirigiendo el trámite.
* RN-SD-003 (Frecuencia de Uso): Un usuario no puede postularse si ha recibido beneficios del Mecanismo de Protección al Cesante en los últimos 3 años. El sistema validará la fecha del último beneficio asignado.



**4. Protección al Cesante (Ruta de Empleabilidad)**

Este aspecto está directamente enlazado con el subsidio de desempleo, operando como un condicional de cumplimiento dinámico.

* RN-PC-001 (Inscripción Obligatoria de Hoja de Vida): Para que la solicitud de subsidio de desempleo pase de estado Radicado a Aprobado, el operador debe validar que el cesante esté registrado al 100% en la plataforma del Servicio Público de Empleo (SPE) de Comfenalco Santander.
* RN-PC-002 (Condicional de Capacitación): El sistema suspenderá automáticamente los pagos de aportes a seguridad social y transferencias económicas si el beneficiario no asiste o reprueba los cursos de capacitación obligatorios dictados por la Agencia de Empleo de la Caja.
* RN-PC-003 (Pérdida del Beneficio por Rechazo Laboral): El operador podrá marcar una novedad de rechazo si el usuario declina ofertas laborales viables provistas por el SPE que otorguen al menos el 80% de su último salario devengado. Esto cancelará el beneficio de inmediato.



**5. Créditos (Crédito Social)**

Reglas estándar de colocación de crédito reguladas por la Superintendencia Financiera aplicadas al contexto de Cajas de Compensación.

* RN-CRE-001 (Límites por Capacidad de Descuento): Si el crédito es bajo modalidad de libranza (pago por nómina), la cuota mensual no puede comprometer más del 50% del salario neto del trabajador (después de descuentos de ley).
* RN-CRE-002 (Pignoración de la Cuota Monetaria): Para líneas de crédito específicas con pignoración, el sistema permitirá usar la Cuota Monetaria del subsidio familiar (dinero mensual por hijos/padres a cargo) como respaldo o método de pago de la obligación. El monto del préstamo estará topado por el valor total de las cuotas monetarias activas del afiliado.
* RN-CRE-003 (Antigüedad de la Empresa Aportante): Si la solicitud es para crédito de libranza, la empresa donde trabaja el afiliado debe estar al día en sus aportes parafiscales del 4% a Comfenalco Santander, y contar con un convenio de libranza activo firmado con la Caja.

