import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import {
  crearSolicitud,
  getTiposSolicitudPorProyecto,
  type TipoSolicitudDto,
} from '../services/solicitudService';
import { getProyectosActivos, type ProyectoResponseDto } from '../services/proyectoService';
import { getCiudadanos, getCiudadanoDetalle, type CiudadanoResponseDto } from '../services/ciudadanoService';
import { getEmpresas, getEmpresaDetalle, getProductosEmpresa, type EmpresaResponseDto, type ProductoDto } from '../services/empresaService';
import {
  getVehiculos, getVehiculoDetalle, getBaseGravableVehiculo,
  type VehiculoResponseDto, type BaseGravableVehiculoDto,
} from '../services/vehiculoService';
import { formatMilesDePesos } from '../config/iuvaConfig';
import { CAMPOS_POR_TIPO, CAMPO_FALLBACK } from '../config/camposPorTipoSolicitud';
import { getColorProyecto } from '../config/colorPorProyecto';
import { DATOS_CONTRATO_VACIOS, construirDatosAdicionalesEstampillas, type DatosContratoEstampillas } from '../config/estampillasConfig';
import FormularioDatosContrato from '../components/estampillas/FormularioDatosContrato';
import { DATOS_TORNAGUIA_VACIOS, validarCoherenciaOrigenDestino, type DatosTornaguia } from '../config/infoconsumoConfig';
import FormularioTornaguia from '../components/infoconsumo/FormularioTornaguia';
import SelectorTipoTransporte from '../components/infoconsumo/SelectorTipoTransporte';
import CamposOrigenDestino from '../components/infoconsumo/CamposOrigenDestino';
import { crearSolicitudInfoconsumo } from '../services/infoconsumoService';
import BuscadorLoteGoTrace from '../components/infoconsumo/BuscadorLoteGoTrace';
import { DATOS_ESTAMPILLA_VACIOS, CATEGORIA_SIN_ESTAMPILLA_FISICA, type DatosEstampilla } from '../config/syctraceConfig';
import BuscadorTornaguiaInfoconsumo from '../components/syctrace/BuscadorTornaguiaInfoconsumo';
import FormularioEstampilla from '../components/syctrace/FormularioEstampilla';
import { crearSolicitudSycTrace } from '../services/syctraceService';
import { DATOS_LOTE_GOTRACE_VACIOS, type DatosLoteGoTrace } from '../config/gotraceConfig';
import FormularioLoteGoTrace from '../components/gotrace/FormularioLoteGoTrace';
import { crearSolicitudGoTrace } from '../services/gotraceService';
import { DATOS_INSTRUMENTO_PASIVO_VACIOS, TIPO_CONSULTA_EXPEDIENTE, totalMeses, type DatosInstrumentoPasivo } from '../config/pasivosLaboralesConfig';
import FormularioInstrumentoPasivo from '../components/pasivosLaborales/FormularioInstrumentoPasivo';
import { crearSolicitudPasivosLaborales } from '../services/pasivosLaboralesService';
import { DATOS_TURNO_VACIOS, fechaHoraCitaISO, type DatosTurno } from '../config/libroTotalConfig';
import FormularioTurno from '../components/librototal/FormularioTurno';
import { agendarTurno } from '../services/libroTotalService';
import {
  DATOS_CARNE_VACIOS, construirDatosAdicionalesCarneVirtual, type DatosCarneVirtual,
  DATOS_SUBSIDIO_DESEMPLEO_VACIOS, construirDatosAdicionalesSubsidioDesempleo, type DatosSubsidioDesempleo,
  DATOS_CREDITOS_VACIOS, type DatosCreditos,
} from '../config/comfenalcoConfig';
import FormularioCarneVirtual from '../components/comfenalco/FormularioCarneVirtual';
import FormularioSubsidioDesempleo from '../components/comfenalco/FormularioSubsidioDesempleo';
import FormularioCreditos from '../components/comfenalco/FormularioCreditos';

const ICONOS_TIPO: Record<string, React.ReactNode> = {
  'Subsidio de vivienda': <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  'Protección al cesante': <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />,
  'Subsidio de desempleo': <path d="M12 5v14M5 12h14" />,
  'Créditos': <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
  'Carné virtual': <rect x="6" y="3" width="12" height="18" rx="2" />,
  'Gestión de pasivo pensional': <><path d="M12 3v18M5 7l7-4 7 4" /></>,
  'Gestión de pasivo laboral': <><path d="M6 3h9l5 5v13H6z" /><path d="M14 3v5h5" /></>,
  'Consulta de expediente digital': <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
};

type TipoAfiliado = 'ciudadano' | 'empresa';

export default function NuevaSolicitudPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const proyectoId = Number(searchParams.get('proyectoId'));
  // Defensa en profundidad: el backend ya rechaza el POST si el operador no tiene el proyecto
  // asignado, esto solo evita que llene el formulario completo para nada.
  const tieneAccesoProyecto = !proyectoId || Boolean(user?.esAdminSyc)
    || (user?.proyectos.some((p) => Number(p.proyectoId) === proyectoId) ?? false);
  const ciudadanoIdUrl = searchParams.get('ciudadanoId');
  const empresaIdUrl = searchParams.get('empresaId');
  const vehiculoIdUrl = searchParams.get('vehiculoId');

  const [proyecto, setProyecto] = useState<ProyectoResponseDto | null>(null);
  const [tipos, setTipos] = useState<TipoSolicitudDto[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoSolicitudDto | null>(null);
  // Infoconsumo: mientras el usuario no elija el tipo de trámite a mano, se autosugiere
  // según origen/destino (mismo departamento -> Tránsito local, distinto -> Movilización).
  const [tipoTornaguiaManual, setTipoTornaguiaManual] = useState(false);

  const [tipoAfiliado, setTipoAfiliado] = useState<TipoAfiliado>('ciudadano');
  const [busquedaAfiliado, setBusquedaAfiliado] = useState('');
  const [resultadosCiudadanos, setResultadosCiudadanos] = useState<CiudadanoResponseDto[]>([]);
  const [resultadosEmpresas, setResultadosEmpresas] = useState<EmpresaResponseDto[]>([]);

  const [ciudadanoSeleccionado, setCiudadanoSeleccionado] = useState<CiudadanoResponseDto | null>(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<EmpresaResponseDto | null>(null);
  const [productosEmpresaGoTrace, setProductosEmpresaGoTrace] = useState<ProductoDto[]>([]);
  const [vehiculoVinculado, setVehiculoVinculado] = useState<VehiculoResponseDto | null>(null);
  const [vehiculosProyecto, setVehiculosProyecto] = useState<VehiculoResponseDto[]>([]);
  const [busquedaVehiculo, setBusquedaVehiculo] = useState('');

  const [datosTramite, setDatosTramite] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState('');

  // Datos específicos del trámite IUVA — "3. Características" hereda todo del vehículo
  // vinculado (solo lectura); el único campo libre es vehiculoNuevo. La base gravable ("4. Base
  // gravable") se calcula en el servidor contra la tabla Mintransporte (o valorCompra si es
  // vehículo nuevo, Art. 143) — ver GET /Vehiculos/{id}/base-gravable.
  const [vehiculoNuevo, setVehiculoNuevo] = useState(false);
  const [valorCompra, setValorCompra] = useState('');
  const [baseGravable, setBaseGravable] = useState<BaseGravableVehiculoDto | null>(null);
  const [avaluoManual, setAvaluoManual] = useState('');

  // Datos específicos del trámite Estampillas — Datos del contrato
  const [datosContrato, setDatosContrato] = useState<DatosContratoEstampillas>(DATOS_CONTRATO_VACIOS);

  // Datos específicos del trámite Infoconsumo — Producto gravado y Movilización
  const [datosTornaguia, setDatosTornaguia] = useState<DatosTornaguia>(DATOS_TORNAGUIA_VACIOS);

  // Datos específicos del trámite SYCTrace — Solicitud de Estampillas + producto + rango
  const [datosEstampilla, setDatosEstampilla] = useState<DatosEstampilla>(DATOS_ESTAMPILLA_VACIOS);

  // Datos específicos del trámite Gotrace — Datos del lote + cadena de custodia
  const [datosLoteGoTrace, setDatosLoteGoTrace] = useState<DatosLoteGoTrace>(DATOS_LOTE_GOTRACE_VACIOS);

  // Datos específicos del trámite Pasivos Laborales — Servidor/pensionado + instrumento
  const [datosInstrumentoPasivo, setDatosInstrumentoPasivo] = useState<DatosInstrumentoPasivo>(DATOS_INSTRUMENTO_PASIVO_VACIOS);

  // Datos específicos del trámite Libro Total — Agendamiento de turno (sede + trámite + horario)
  const [datosTurno, setDatosTurno] = useState<DatosTurno>(DATOS_TURNO_VACIOS);

  // Datos específicos de Comfenalco — Carné virtual (estado de afiliación + grupo familiar)
  const [datosCarneVirtual, setDatosCarneVirtual] = useState<DatosCarneVirtual>(DATOS_CARNE_VACIOS);

  // Datos específicos de Comfenalco — Subsidio de desempleo (meses de aportes por selección)
  const [datosSubsidioDesempleo, setDatosSubsidioDesempleo] = useState<DatosSubsidioDesempleo>(DATOS_SUBSIDIO_DESEMPLEO_VACIOS);

  // Datos específicos de Comfenalco — Créditos (simulador con tasas de la Superfinanciera)
  const [datosCreditos, setDatosCreditos] = useState<DatosCreditos>(DATOS_CREDITOS_VACIOS);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esIUVA = proyecto?.nombre === 'IUVA';
  const esEstampillas = proyecto?.nombre === 'Estampillas';
  const esInfoconsumo = proyecto?.nombre === 'Infoconsumo';
  const esSycTrace = proyecto?.nombre === 'SYCTrace';
  const esGoTrace = proyecto?.nombre === 'Gotrace';
  const esPasivosLaborales = proyecto?.nombre === 'Pasivos Laborales';
  const esLibroTotal = proyecto?.nombre === 'Libro Total';
  const esCarneVirtual = proyecto?.nombre === 'Comfenalco' && tipoSeleccionado?.nombre === 'Carné virtual';
  const esSubsidioDesempleo = proyecto?.nombre === 'Comfenalco' && tipoSeleccionado?.nombre === 'Subsidio de desempleo';
  const esCreditos = proyecto?.nombre === 'Comfenalco' && tipoSeleccionado?.nombre === 'Créditos';

  useEffect(() => {
    if (!proyectoId) return;
    getProyectosActivos().then((lista) => setProyecto(lista.find((p) => p.id === proyectoId) ?? null));
    getTiposSolicitudPorProyecto(proyectoId).then((lista) => {
      setTipos(lista);
      if (lista.length > 0) setTipoSeleccionado(lista[0]);
    });
  }, [proyectoId]);

  useEffect(() => {
    if (!esInfoconsumo || tipoTornaguiaManual) return;
    const { departamentoOrigen, departamentoDestino } = datosTornaguia;
    if (!departamentoOrigen || !departamentoDestino) return;
    const nombreSugerido = departamentoOrigen === departamentoDestino ? 'Tránsito local' : 'Movilización';
    const sugerido = tipos.find((t) => t.nombre === nombreSugerido);
    if (sugerido && sugerido.id !== tipoSeleccionado?.id) {
      setTipoSeleccionado(sugerido);
    }
  }, [esInfoconsumo, tipoTornaguiaManual, tipos, datosTornaguia.departamentoOrigen, datosTornaguia.departamentoDestino]);

  // Infoconsumo/Gotrace/Pasivos Laborales: el afiliado siempre es una empresa (RUT/cámara de
  // comercio, o entidad territorial en el caso de Pasivos Laborales).
  useEffect(() => {
    if (esInfoconsumo || esGoTrace || esPasivosLaborales) setTipoAfiliado('empresa');
  }, [esInfoconsumo, esGoTrace, esPasivosLaborales]);

  // GoTrace: el catálogo de productos de la empresa alimenta tanto el resumen ("Productos
  // agregados: #") como el selector de producto del lote (paso 3).
  useEffect(() => {
    if (!esGoTrace || !empresaSeleccionada) { setProductosEmpresaGoTrace([]); return; }
    let cancelado = false;
    getProductosEmpresa(empresaSeleccionada.id).then((lista) => { if (!cancelado) setProductosEmpresaGoTrace(lista); });
    return () => { cancelado = true; };
  }, [esGoTrace, empresaSeleccionada]);

  // Afiliado que llega ya resuelto por la URL — ya sea del gancho de ficha,
  // o de volver de "crear nuevo ciudadano/empresa" a mitad del formulario
  useEffect(() => {
    if (ciudadanoIdUrl) {
      setTipoAfiliado('ciudadano');
      getCiudadanoDetalle(Number(ciudadanoIdUrl)).then((c) =>
        setCiudadanoSeleccionado({
          id: c.id,
          tipoDocumento: c.tipoDocumento,
          numeroDocumento: c.numeroDocumento,
          nombreCompleto: c.nombreCompleto,
          proyectosConActividad: [],
          totalSolicitudes: 0,
        })
      );
    } else if (empresaIdUrl) {
      setTipoAfiliado('empresa');
      getEmpresaDetalle(Number(empresaIdUrl)).then((e) =>
        setEmpresaSeleccionada({
          id: e.id,
          nit: e.nit,
          digitoVerificacion: e.digitoVerificacion,
          razonSocial: e.razonSocial,
          proyectosConActividad: [],
          totalSolicitudes: 0,
          tieneLogo: e.tieneLogo,
        })
      );
    }
  }, [ciudadanoIdUrl, empresaIdUrl]);

  // A partir de un vehículo (vinculado por URL o elegido en la búsqueda por placa),
  // resuelve su propietario como el afiliado de la solicitud.
  function resolverPropietarioDeVehiculo(v: VehiculoResponseDto) {
    if (v.ciudadanoId) {
      setTipoAfiliado('ciudadano');
      getCiudadanoDetalle(v.ciudadanoId).then((c) =>
        setCiudadanoSeleccionado({
          id: c.id,
          tipoDocumento: c.tipoDocumento,
          numeroDocumento: c.numeroDocumento,
          nombreCompleto: c.nombreCompleto,
          proyectosConActividad: [],
          totalSolicitudes: 0,
        })
      );
    } else if (v.empresaId) {
      setTipoAfiliado('empresa');
      getEmpresaDetalle(v.empresaId).then((e) =>
        setEmpresaSeleccionada({
          id: e.id,
          nit: e.nit,
          digitoVerificacion: e.digitoVerificacion,
          razonSocial: e.razonSocial,
          proyectosConActividad: [],
          totalSolicitudes: 0,
          tieneLogo: e.tieneLogo,
        })
      );
    }
  }

  // Vehículo vinculado (gancho desde la Ficha de Vehículo) — su propietario, si tiene,
  // se resuelve como el afiliado de la solicitud.
  useEffect(() => {
    if (!vehiculoIdUrl) {
      setVehiculoVinculado(null);
      return;
    }
    getVehiculoDetalle(Number(vehiculoIdUrl)).then((v) => {
      setVehiculoVinculado(v);
      resolverPropietarioDeVehiculo(v);
    });
  }, [vehiculoIdUrl]);

  // Proyectos IUVA: catálogo de vehículos del proyecto, para la búsqueda por placa del paso 2.
  useEffect(() => {
    if (!esIUVA || !proyectoId) {
      setVehiculosProyecto([]);
      return;
    }
    getVehiculos({ proyectoId }).then(setVehiculosProyecto);
  }, [esIUVA, proyectoId]);

  function seleccionarVehiculo(v: VehiculoResponseDto) {
    setVehiculoVinculado(v);
    setCiudadanoSeleccionado(null);
    setEmpresaSeleccionada(null);
    resolverPropietarioDeVehiculo(v);
  }

  function limpiarVehiculoVinculado() {
    setVehiculoVinculado(null);
    setCiudadanoSeleccionado(null);
    setEmpresaSeleccionada(null);
    setBusquedaVehiculo('');
    setBaseGravable(null);
    setAvaluoManual('');
  }

  // Base gravable IUVA (Ley 488/1998 Art. 143) — se recalcula en el servidor cada vez que
  // cambia el vehículo vinculado, "vehículo nuevo" o el valor de compra digitado.
  useEffect(() => {
    if (!esIUVA || !vehiculoVinculado) {
      setBaseGravable(null);
      return;
    }
    let cancelado = false;
    const timeout = setTimeout(() => {
      getBaseGravableVehiculo(vehiculoVinculado.id, {
        vehiculoNuevo,
        valorCompra: vehiculoNuevo && valorCompra ? Number(valorCompra) : undefined,
      })
        .then((r) => { if (!cancelado) setBaseGravable(r); })
        .catch(() => { if (!cancelado) setBaseGravable(null); });
    }, 300);
    return () => { cancelado = true; clearTimeout(timeout); };
  }, [esIUVA, vehiculoVinculado, vehiculoNuevo, valorCompra]);

  // Búsqueda con debounce — solo si no hay ya un afiliado resuelto por la URL
  // (o por el propietario del vehículo vinculado, una vez se resuelve)
  const vehiculoResuelveAfiliado = Boolean(vehiculoVinculado) && Boolean(ciudadanoSeleccionado || empresaSeleccionada);
  useEffect(() => {
    if (ciudadanoIdUrl || empresaIdUrl || vehiculoResuelveAfiliado) return;
    if (busquedaAfiliado.trim().length < 3) {
      setResultadosCiudadanos([]);
      setResultadosEmpresas([]);
      return;
    }
    const timeout = setTimeout(() => {
      if (tipoAfiliado === 'ciudadano') {
        getCiudadanos({ buscar: busquedaAfiliado, pagina: 1, tamanoPagina: 5 }).then((res) =>
          setResultadosCiudadanos(res.datos)
        );
      } else {
        getEmpresas({ buscar: busquedaAfiliado, pagina: 1, tamanoPagina: 5 }).then((res) =>
          setResultadosEmpresas(res.datos)
        );
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [busquedaAfiliado, tipoAfiliado, ciudadanoIdUrl, empresaIdUrl, vehiculoResuelveAfiliado]);

  const campos = tipoSeleccionado ? CAMPOS_POR_TIPO[tipoSeleccionado.nombre] : undefined;
  const afiliadoResueltoPorUrl = Boolean(ciudadanoIdUrl || empresaIdUrl || vehiculoResuelveAfiliado);
  const resultadosVehiculos = busquedaVehiculo.trim().length >= 2
    ? vehiculosProyecto.filter((v) => v.placa.toLowerCase().includes(busquedaVehiculo.trim().toLowerCase())).slice(0, 5)
    : [];
  const volverAActual = `/solicitudes/nueva?proyectoId=${proyectoId}${vehiculoIdUrl ? `&vehiculoId=${vehiculoIdUrl}` : ''}`;
  const color = getColorProyecto(proyecto?.nombre);

  if (proyectoId && !tieneAccesoProyecto) {
    return (
      <div className="flex min-h-screen bg-paper">
        <Sidebar active="solicitudes" />
        <main className="flex-1 flex items-center justify-center text-sm text-ink-400">No tienes acceso a este proyecto.</main>
      </div>
    );
  }

  if (proyectoId && !proyecto) {
    return (
      <div className="flex min-h-screen bg-paper">
        <Sidebar active="solicitudes" />
        <main className="flex-1 flex items-center justify-center text-sm text-ink-400">Cargando...</main>
      </div>
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!tipoSeleccionado) {
      setError('Selecciona un tipo de solicitud.');
      return;
    }
    if (!esSycTrace && !ciudadanoSeleccionado && !empresaSeleccionada) {
      setError('Selecciona un afiliado para continuar.');
      return;
    }
    if (esSycTrace) {
      if (!datosEstampilla.solicitudInfoconsumoId) {
        setError('Busca y selecciona una tornaguía de Infoconsumo con pago confirmado para continuar.');
        return;
      }
      if (!datosEstampilla.categoriaProducto || !datosEstampilla.subcategoriaProducto) {
        setError('Selecciona la categoría y subcategoría del producto para continuar.');
        return;
      }
      if (datosEstampilla.categoriaProducto === CATEGORIA_SIN_ESTAMPILLA_FISICA) {
        setError('Cervezas, sifones, refajos y mezclas no están sujetos a estampilla de señalización física en este flujo.');
        return;
      }
      if (!datosEstampilla.nombreProducto || !datosEstampilla.loteProduccion) {
        setError('Ingresa el nombre del producto y el lote de producción para continuar.');
        return;
      }
      if (!datosEstampilla.registroInvima || !datosEstampilla.prefijo || !datosEstampilla.codigoInicial) {
        setError('Espera a que se generen el registro INVIMA y el código de estampilla antes de continuar.');
        return;
      }
    }
    if (esGoTrace) {
      if (!datosLoteGoTrace.productoId || !datosLoteGoTrace.fechaProduccion || !datosLoteGoTrace.unidadesLote) {
        setError('Selecciona el producto e ingresa la fecha de producción y las unidades del lote para continuar.');
        return;
      }
    }
    if (esPasivosLaborales && tipoSeleccionado.nombre !== TIPO_CONSULTA_EXPEDIENTE) {
      if (!datosInstrumentoPasivo.instrumento) {
        setError('Selecciona el instrumento a tramitar para continuar.');
        return;
      }
      if (!datosInstrumentoPasivo.servidorNombre || !datosInstrumentoPasivo.servidorDocumento) {
        setError('Ingresa el nombre y el documento del servidor o pensionado para continuar.');
        return;
      }
    }
    if (esLibroTotal) {
      if (!datosTurno.sedeId) {
        setError('Selecciona la sede donde se atenderá al ciudadano.');
        return;
      }
      if (!fechaHoraCitaISO(datosTurno.fecha, datosTurno.hora)) {
        setError('Selecciona la fecha y la hora del turno.');
        return;
      }
    }
    if (esIUVA) {
      if (vehiculoNuevo && !valorCompra) {
        setError('Ingresa el valor de compra del vehículo nuevo para continuar.');
        return;
      }
      if (!vehiculoNuevo && !baseGravable?.soportado && !avaluoManual) {
        setError('No se encontró la base gravable en la tabla Mintransporte — diligénciala manualmente para continuar.');
        return;
      }
    }
    if (esEstampillas && !datosContrato.valorContratoBruto) {
      setError('Ingresa el valor total del contrato para continuar.');
      return;
    }
    if (esCarneVirtual) {
      if (!datosCarneVirtual.ingresosMensuales) {
        setError('Ingresa los ingresos mensuales del afiliado para continuar.');
        return;
      }
      if (datosCarneVirtual.estadoAfiliacion !== 'Activo') {
        setError('Solo se puede expedir el carné si el afiliado está ACTIVO en aportes.');
        return;
      }
    }
    if (esSubsidioDesempleo) {
      const minimo = datosSubsidioDesempleo.tipoTrabajador === 'Independiente' ? 24 : 12;
      if (datosSubsidioDesempleo.mesesSeleccionados.length < minimo) {
        setError(`Marca al menos ${minimo} meses de aportes para continuar.`);
        return;
      }
    }
    if (esCreditos && !datosCreditos.salarioNeto) {
      setError('Ingresa el salario neto para continuar.');
      return;
    }
    if (esInfoconsumo) {
      if (!datosTornaguia.categoriaProducto || !datosTornaguia.subcategoriaProducto) {
        setError('Selecciona la categoría y la subcategoría del producto para continuar.');
        return;
      }
      const cantidadRequerida = datosTornaguia.pesoGramos || datosTornaguia.unidadesFisicas;
      if (!cantidadRequerida || !datosTornaguia.placaVehiculo) {
        setError('Ingresa las unidades físicas (o el peso, según la subcategoría) y la placa del vehículo para continuar.');
        return;
      }
      const errorCoherencia = validarCoherenciaOrigenDestino(tipoSeleccionado.nombre, datosTornaguia.departamentoOrigen, datosTornaguia.departamentoDestino);
      if (errorCoherencia) {
        setError(errorCoherencia);
        return;
      }
    }

    if (esGoTrace) {
      setGuardando(true);
      try {
        const creada = await crearSolicitudGoTrace({
          proyectoId,
          tipoSolicitudId: tipoSeleccionado.id,
          empresaId: empresaSeleccionada!.id,
          productoId: datosLoteGoTrace.productoId!,
          fechaProduccion: datosLoteGoTrace.fechaProduccion,
          unidadesLote: Number(datosLoteGoTrace.unidadesLote) || 0,
          modoGeneracionUid: datosLoteGoTrace.modoGeneracionUid,
          puntosControlHabilitados: datosLoteGoTrace.puntosControlHabilitados,
        });
        navigate(`/solicitudes/${creada.id}`);
      } catch (err: any) {
        setError(err?.response?.data?.mensaje ?? 'No se pudo radicar la solicitud. Intenta de nuevo.');
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (esPasivosLaborales) {
      setGuardando(true);
      try {
        const creada = await crearSolicitudPasivosLaborales({
          proyectoId,
          tipoSolicitudId: tipoSeleccionado.id,
          empresaId: empresaSeleccionada!.id,
          instrumento: datosInstrumentoPasivo.instrumento || undefined,
          servidorNombre: datosInstrumentoPasivo.servidorNombre || undefined,
          servidorDocumento: datosInstrumentoPasivo.servidorDocumento || undefined,
          regimenPensional: datosInstrumentoPasivo.regimenPensional || undefined,
          tiempoLaboradoMeses: totalMeses(datosInstrumentoPasivo.tiempoLaboradoAnios, datosInstrumentoPasivo.tiempoLaboradoMesesAdicionales),
          tiempoTotalAportesMeses: totalMeses(datosInstrumentoPasivo.tiempoTotalAportesAnios, datosInstrumentoPasivo.tiempoTotalAportesMesesAdicionales),
          valorMesadaPensional: datosInstrumentoPasivo.valorMesadaPensional ? Number(datosInstrumentoPasivo.valorMesadaPensional) : undefined,
          observaciones: datosInstrumentoPasivo.observaciones || undefined,
          solicitudColpensionesId: datosInstrumentoPasivo.solicitudColpensionesId ?? undefined,
        });
        navigate(`/solicitudes/${creada.id}`);
      } catch (err: any) {
        setError(err?.response?.data?.mensaje ?? 'No se pudo radicar la solicitud. Intenta de nuevo.');
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (esLibroTotal) {
      setGuardando(true);
      try {
        const fechaHoraCita = fechaHoraCitaISO(datosTurno.fecha, datosTurno.hora)!;
        const creada = await agendarTurno({
          proyectoId,
          tipoSolicitudId: tipoSeleccionado.id,
          ciudadanoId: ciudadanoSeleccionado!.id,
          sedeId: datosTurno.sedeId!,
          motivo: datosTurno.motivo,
          fechaHoraCita,
        });
        navigate(`/solicitudes/${creada.id}`);
      } catch (err: any) {
        setError(err?.response?.data?.mensaje ?? 'No se pudo agendar el turno. Intenta de nuevo.');
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (esSycTrace) {
      setGuardando(true);
      try {
        const creada = await crearSolicitudSycTrace({
          proyectoId,
          tipoSolicitudId: tipoSeleccionado.id,
          solicitudInfoconsumoId: datosEstampilla.solicitudInfoconsumoId!,
          categoriaProducto: datosEstampilla.categoriaProducto,
          subcategoriaProducto: datosEstampilla.subcategoriaProducto,
          nombreProducto: datosEstampilla.nombreProducto,
          marca: datosEstampilla.marca || undefined,
          gradoAlcoholimetrico: datosEstampilla.gradoAlcoholimetrico ? Number(datosEstampilla.gradoAlcoholimetrico) : undefined,
          contenidoNetoCc: datosEstampilla.contenidoNetoCc ? Number(datosEstampilla.contenidoNetoCc) : undefined,
          unidadesPorCajetilla: datosEstampilla.unidadesPorCajetilla ? Number(datosEstampilla.unidadesPorCajetilla) : undefined,
          pesoGramos: datosEstampilla.pesoGramos ? Number(datosEstampilla.pesoGramos) : undefined,
          loteProduccion: datosEstampilla.loteProduccion,
          origenProducto: datosEstampilla.origenProducto,
          numeroTornaguia: datosEstampilla.numeroTornaguia || undefined,
          numeroDeclaracionImportacion: datosEstampilla.numeroDeclaracionImportacion || undefined,
          registroIntroduccion: datosEstampilla.registroIntroduccion || undefined,
        });
        navigate(`/solicitudes/${creada.id}`);
      } catch (err: any) {
        setError(err?.response?.data?.mensaje ?? 'No se pudo radicar la solicitud. Intenta de nuevo.');
      } finally {
        setGuardando(false);
      }
      return;
    }

    if (esInfoconsumo) {
      setGuardando(true);
      try {
        const creada = await crearSolicitudInfoconsumo({
          proyectoId,
          tipoSolicitudId: tipoSeleccionado.id,
          empresaId: empresaSeleccionada!.id,
          tipoTransporte: datosTornaguia.tipoTransporte,
          categoriaProducto: datosTornaguia.categoriaProducto,
          subcategoriaProducto: datosTornaguia.subcategoriaProducto,
          origenProducto: datosTornaguia.origenProducto || undefined,
          numeroLote: datosTornaguia.numeroLote || undefined,
          gradosAlcoholimetricos: datosTornaguia.gradosAlcoholimetricos ? Number(datosTornaguia.gradosAlcoholimetricos) : undefined,
          unidadesFisicas: Number(datosTornaguia.unidadesFisicas) || 0,
          pvpCertificado: Number(datosTornaguia.pvpCertificado) || 0,
          pesoGramos: datosTornaguia.pesoGramos ? Number(datosTornaguia.pesoGramos) : undefined,
          valorAduana: datosTornaguia.valorAduana ? Number(datosTornaguia.valorAduana) : undefined,
          gravamenesArancelarios: datosTornaguia.gravamenesArancelarios ? Number(datosTornaguia.gravamenesArancelarios) : undefined,
          departamentoOrigen: datosTornaguia.departamentoOrigen,
          municipioOrigen: datosTornaguia.municipioOrigen,
          departamentoDestino: datosTornaguia.departamentoDestino,
          municipioDestino: datosTornaguia.municipioDestino,
          direccionEspecificaOrigen: datosTornaguia.direccionEspecificaOrigen || undefined,
          latOrigen: datosTornaguia.latOrigen ?? undefined,
          lngOrigen: datosTornaguia.lngOrigen ?? undefined,
          direccionEspecificaDestino: datosTornaguia.direccionEspecificaDestino || undefined,
          latDestino: datosTornaguia.latDestino ?? undefined,
          lngDestino: datosTornaguia.lngDestino ?? undefined,
          empresaTransportadora: datosTornaguia.empresaTransportadora,
          nitTransportador: datosTornaguia.nitTransportador || undefined,
          placaVehiculo: datosTornaguia.placaVehiculo,
          conductor: datosTornaguia.conductor || undefined,
          cedulaConductor: datosTornaguia.cedulaConductor || undefined,
          tipoVehiculo: datosTornaguia.tipoVehiculo || undefined,
          observaciones: datosTornaguia.observaciones || undefined,
          loteGoTraceSolicitudId: datosTornaguia.loteGoTraceSolicitudId ?? undefined,
        });
        navigate(`/solicitudes/${creada.id}`);
      } catch (err: any) {
        setError(err?.response?.data?.mensaje ?? 'No se pudo radicar la solicitud. Intenta de nuevo.');
      } finally {
        setGuardando(false);
      }
      return;
    }

    // baseGravable queda en PESOS COMPLETOS (no miles) para que PreliquidacionPage — que ya
    // aplica las tarifas escalonadas del Art. 145 sobre este mismo campo con umbrales en pesos
    // completos — no necesite conversión. El blindaje (+10%) ya viene incluido aquí cuando la
    // tabla lo soporta (CalculadoraBaseGravableVehiculo), por eso PreliquidacionPage ya no debe
    // volver a aplicarlo (se quitó ese factor de calcularImpuesto para no contarlo dos veces).
    const baseGravableEnPesos = vehiculoNuevo
      ? (valorCompra ? Number(valorCompra) : 0)
      : baseGravable?.soportado
        ? (baseGravable.valorAjustado ?? 0) * 1000
        : (avaluoManual ? Number(avaluoManual) * 1000 : 0);

    const datosAdicionales = esIUVA
      ? JSON.stringify({
          tipoVehiculo: vehiculoVinculado?.tipoVehiculo ?? '',
          subtipo: vehiculoVinculado?.subtipo ?? '',
          cilindraje: vehiculoVinculado?.cilindraje ?? '',
          departamentoMatricula: vehiculoVinculado?.departamentoMatricula ?? '',
          municipioMatricula: vehiculoVinculado?.municipioMatricula ?? '',
          vehiculoNuevo: vehiculoNuevo ? 'Sí' : 'No',
          valorCompra: vehiculoNuevo ? valorCompra : '',
          baseGravable: String(baseGravableEnPesos),
          blindado: vehiculoVinculado?.blindado ? 'Sí' : 'No',
          antiguoClasico: vehiculoVinculado?.esClasicoAntiguo ? 'Sí' : 'No',
        })
      : esEstampillas
        ? JSON.stringify(construirDatosAdicionalesEstampillas(datosContrato, tipoSeleccionado.nombre))
        : esCarneVirtual
          ? JSON.stringify(construirDatosAdicionalesCarneVirtual(datosCarneVirtual))
          : esSubsidioDesempleo
            ? JSON.stringify(construirDatosAdicionalesSubsidioDesempleo(datosSubsidioDesempleo))
            : esCreditos
              ? JSON.stringify(datosCreditos)
              : campos
            ? JSON.stringify(datosTramite)
            : JSON.stringify({ observaciones });

    setGuardando(true);
    try {
      const creada = await crearSolicitud({
        proyectoId,
        tipoSolicitudId: tipoSeleccionado.id,
        ciudadanoId: ciudadanoSeleccionado?.id,
        empresaId: empresaSeleccionada?.id,
        vehiculoId: vehiculoVinculado?.id,
        datosAdicionales,
      });
      navigate(`/solicitudes/${creada.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.mensaje ?? 'No se pudo radicar la solicitud. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  function renderBuscadorAfiliado() {
    return (
      <>
        {!esInfoconsumo && (
          <div className="flex gap-1.5 mb-3.5">
            {(['ciudadano', 'empresa'] as TipoAfiliado[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTipoAfiliado(t); setBusquedaAfiliado(''); }}
                className={`text-xs font-semibold px-3.5 py-2 rounded-full ${
                  tipoAfiliado === t ? 'bg-[#0f172a] text-white' : 'bg-paper border border-line text-ink-600'
                }`}
              >
                {t === 'ciudadano' ? 'Persona natural' : 'Empresa'}
              </button>
            ))}
          </div>
        )}

        <label className="block text-xs font-semibold text-ink-900 mb-1.5">
          Buscar por {tipoAfiliado === 'ciudadano' ? 'documento o nombre' : 'razón social o NIT'}
        </label>
        <div className="flex items-center gap-2 bg-paper border border-line rounded-[9px] px-3 py-2.5 mb-3">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-4 h-4 stroke-ink-400 shrink-0">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            value={busquedaAfiliado}
            onChange={(e) => {
              setBusquedaAfiliado(e.target.value);
              setCiudadanoSeleccionado(null);
              setEmpresaSeleccionada(null);
            }}
            placeholder={tipoAfiliado === 'ciudadano' ? '1098765432' : 'TechSolutions S.A.S'}
            className="border-none outline-none bg-transparent text-[13px] w-full font-body"
          />
        </div>

        {tipoAfiliado === 'ciudadano'
          ? resultadosCiudadanos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCiudadanoSeleccionado(c)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 mb-1.5 text-left ${
                  ciudadanoSeleccionado?.id === c.id ? 'bg-[var(--color-accento-claro)] border border-[var(--color-accento)]' : 'bg-paper border border-line'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {c.nombreCompleto.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink-900">{c.nombreCompleto}</div>
                  <div className="text-[11px] text-ink-400">CC {c.numeroDocumento}</div>
                </div>
                {ciudadanoSeleccionado?.id === c.id && (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="w-4 h-4 stroke-[var(--color-accento)]">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))
          : resultadosEmpresas.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEmpresaSeleccionada(e)}
                className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 mb-1.5 text-left ${
                  empresaSeleccionada?.id === e.id ? 'bg-[var(--color-accento-claro)] border border-[var(--color-accento)]' : 'bg-paper border border-line'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {e.razonSocial.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink-900">{e.razonSocial}</div>
                  <div className="text-[11px] text-ink-400">NIT {e.nit}-{e.digitoVerificacion}</div>
                </div>
                {empresaSeleccionada?.id === e.id && (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="w-4 h-4 stroke-[var(--color-accento)]">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}

        <button
          type="button"
          onClick={() =>
            navigate(
              tipoAfiliado === 'ciudadano'
                ? `/ciudadanos/nuevo?volverA=${encodeURIComponent(volverAActual)}`
                : `/empresas/nueva?volverA=${encodeURIComponent(volverAActual)}${esGoTrace ? '&contexto=gotrace' : ''}`
            )
          }
          className="text-[12.5px] text-blue-600 font-medium mt-1"
        >
          {tipoAfiliado === 'ciudadano'
            ? '+ No aparece en el sistema — crear nuevo ciudadano'
            : '+ No aparece en el sistema — crear nueva empresa'}
        </button>
      </>
    );
  }

  return (
    <div
      className="flex min-h-screen bg-paper"
      style={{ '--color-accento': color.primario, '--color-accento-claro': color.primarioClaro } as React.CSSProperties}
    >
      <Sidebar active="solicitudes" />

      <main className="flex-1 px-4 md:px-[38px] py-7 pt-16 md:pt-7 overflow-y-auto max-w-[900px]">
        <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-3.5">
          <button onClick={() => navigate(`/solicitudes?proyectoId=${proyectoId}`)} className="hover:underline">
            Solicitudes
          </button>
          <span>/</span>
          <span className="text-ink-900 font-semibold">Nueva solicitud</span>
        </div>

        <h1 className="font-display text-[22px] font-semibold text-ink-900 mb-1.5">
          Nueva solicitud — {proyecto?.nombre ?? '...'}
        </h1>
        <p className="text-ink-600 text-[12.5px] mb-5">
          Selecciona el tipo de trámite y vincula al afiliado correspondiente.
        </p>

        <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
          <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">1. Tipo de solicitud</h3>
          {esInfoconsumo && (
            <>
              <SelectorTipoTransporte
                value={datosTornaguia.tipoTransporte}
                onChange={(tipoTransporte) => setDatosTornaguia((d) => ({ ...d, tipoTransporte }))}
              />
              <CamposOrigenDestino
                value={datosTornaguia}
                onChange={setDatosTornaguia}
                errorCoherencia={
                  tipoSeleccionado
                    ? validarCoherenciaOrigenDestino(tipoSeleccionado.nombre, datosTornaguia.departamentoOrigen, datosTornaguia.departamentoDestino)
                    : null
                }
              />
            </>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tipos.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTipoSeleccionado(t); setDatosTramite({}); setTipoTornaguiaManual(true); }}
                className={`flex items-center gap-2.5 border-[1.5px] rounded-xl px-4 py-3.5 text-[13px] font-semibold text-left ${
                  tipoSeleccionado?.id === t.id ? 'border-[var(--color-accento)] bg-[var(--color-accento-claro)] text-[var(--color-accento)]' : 'border-line text-ink-900'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[18px] h-[18px] stroke-current shrink-0">
                  {ICONOS_TIPO[t.nombre] ?? <circle cx="12" cy="12" r="9" />}
                </svg>
                {t.nombre}
              </button>
            ))}
          </div>
        </div>

        {esIUVA ? (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">2. Vehículo</h3>

            {!vehiculoVinculado ? (
              <>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">Buscar por placa</label>
                <div className="flex items-center gap-2 bg-paper border border-line rounded-[9px] px-3 py-2.5 mb-3">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="w-4 h-4 stroke-ink-400 shrink-0">
                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
                  </svg>
                  <input
                    value={busquedaVehiculo}
                    onChange={(e) => setBusquedaVehiculo(e.target.value)}
                    placeholder="Ej: EBH342"
                    className="border-none outline-none bg-transparent text-[13px] w-full font-body"
                  />
                </div>

                {resultadosVehiculos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => seleccionarVehiculo(v)}
                    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 mb-1.5 text-left bg-paper border border-line"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {v.placa.slice(0, 3)}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-ink-900">Placa {v.placa}</div>
                      <div className="text-[11px] text-ink-400">
                        {[v.marca, v.linea].filter(Boolean).join(' ') || 'Sin marca/línea'}
                        {(v.ciudadanoNombre ?? v.empresaNombre) ? ` · Propietario: ${v.ciudadanoNombre ?? v.empresaNombre}` : ''}
                      </div>
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/vehiculos/nuevo?proyectoId=${proyectoId}&volverA=${encodeURIComponent(volverAActual)}`)
                  }
                  className="text-[12.5px] text-blue-600 font-medium mt-1"
                >
                  + Vehículo no registrado — crear nueva ficha de vehículo
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 bg-[var(--color-accento-claro)] border border-[var(--color-accento)] rounded-xl px-3.5 py-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-accento)] flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-4 h-4 stroke-white">
                      <rect x="3" y="10" width="16" height="7" rx="1.5" /><path d="M6 10l1.5-4h6L15 10" />
                      <circle cx="6.5" cy="17.5" r="1.6" /><circle cx="14.5" cy="17.5" r="1.6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-ink-900">
                      Placa {vehiculoVinculado.placa}
                      {[vehiculoVinculado.marca, vehiculoVinculado.linea].filter(Boolean).length > 0
                        ? ` — ${[vehiculoVinculado.marca, vehiculoVinculado.linea].filter(Boolean).join(' ')}`
                        : ''}
                    </div>
                    <div className="text-[11px] text-ink-600">
                      {ciudadanoSeleccionado
                        ? `Propietario: ${ciudadanoSeleccionado.nombreCompleto} · CC ${ciudadanoSeleccionado.numeroDocumento}`
                        : empresaSeleccionada
                          ? `Propietario: ${empresaSeleccionada.razonSocial} · NIT ${empresaSeleccionada.nit}`
                          : 'Sin propietario registrado'}
                    </div>
                  </div>
                  {(ciudadanoSeleccionado || empresaSeleccionada) && (
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" className="w-4 h-4 stroke-[var(--color-accento)] shrink-0">
                      <path d="M5 12l4 4 10-10" />
                    </svg>
                  )}
                  <button type="button" onClick={limpiarVehiculoVinculado} className="text-[12px] font-semibold text-ink-600 shrink-0">
                    Cambiar
                  </button>
                </div>

                {!(ciudadanoSeleccionado || empresaSeleccionada) && (
                  <div className="mt-3.5">
                    <p className="text-[11.5px] text-ink-600 mb-2.5">
                      Este vehículo no tiene propietario registrado — selecciona a quién se vincula como afiliado.
                    </p>
                    {renderBuscadorAfiliado()}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">
              {esPasivosLaborales ? '2. Entidad territorial' : esLibroTotal ? '2. Ciudadano' : esInfoconsumo || esGoTrace ? '2. Empresa productora' : esEstampillas ? '2. Contribuyente' : esSycTrace ? '2. Tornaguía de Infoconsumo (pago confirmado)' : '2. Afiliado'}
            </h3>

            {vehiculoVinculado && (
              <div className="flex items-center gap-3 bg-paper border border-line rounded-xl px-3.5 py-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accento-claro)] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-4 h-4 stroke-[var(--color-accento)]">
                    <rect x="3" y="10" width="16" height="7" rx="1.5" /><path d="M6 10l1.5-4h6L15 10" />
                    <circle cx="6.5" cy="17.5" r="1.6" /><circle cx="14.5" cy="17.5" r="1.6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink-900">Placa {vehiculoVinculado.placa}</div>
                  <div className="text-[11px] text-ink-600">
                    {[vehiculoVinculado.marca, vehiculoVinculado.linea].filter(Boolean).join(' ') || 'Vehículo vinculado'}
                    {vehiculoVinculado.modelo ? ` · Modelo ${vehiculoVinculado.modelo}` : ''}
                  </div>
                </div>
              </div>
            )}

            {esSycTrace ? (
              <BuscadorTornaguiaInfoconsumo value={datosEstampilla} onChange={setDatosEstampilla} />
            ) : esInfoconsumo && !afiliadoResueltoPorUrl ? (
              <>
                <BuscadorLoteGoTrace
                  value={datosTornaguia}
                  onChange={setDatosTornaguia}
                  onEmpresaResuelta={setEmpresaSeleccionada}
                />
                {!datosTornaguia.loteGoTraceSolicitudId && renderBuscadorAfiliado()}
              </>
            ) : esGoTrace && empresaSeleccionada ? (
              <div className="flex items-center gap-3 bg-[var(--color-accento-claro)] border border-[var(--color-accento)] rounded-xl px-3.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accento)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {empresaSeleccionada.razonSocial.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink-900">{empresaSeleccionada.razonSocial}</div>
                  <div className="text-[11px] text-ink-600">
                    NIT {empresaSeleccionada.nit}-{empresaSeleccionada.digitoVerificacion} · Productos agregados: {productosEmpresaGoTrace.length}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEmpresaSeleccionada(null)}
                  className="text-[11.5px] text-blue-600 font-medium shrink-0"
                >
                  Cambiar
                </button>
              </div>
            ) : afiliadoResueltoPorUrl ? (
              <div className="flex items-center gap-3 bg-[var(--color-accento-claro)] border border-[var(--color-accento)] rounded-xl px-3.5 py-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accento)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {(ciudadanoSeleccionado?.nombreCompleto ?? empresaSeleccionada?.razonSocial ?? '')
                    .split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-ink-900">
                    {ciudadanoSeleccionado?.nombreCompleto ?? empresaSeleccionada?.razonSocial}
                  </div>
                  <div className="text-[11px] text-ink-600">
                    {ciudadanoSeleccionado
                      ? `CC ${ciudadanoSeleccionado.numeroDocumento}`
                      : `NIT ${empresaSeleccionada?.nit}-${empresaSeleccionada?.digitoVerificacion}`}
                    {' · Afiliado vinculado'}
                  </div>
                </div>
              </div>
            ) : renderBuscadorAfiliado()}
          </div>
        )}

        {esIUVA && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">3. Características del vehículo</h3>

            {vehiculoVinculado && (
              <>
                <div className="p-3 bg-[var(--color-accento-claro)] border border-[var(--color-accento)] rounded-lg text-[12.5px] font-medium mb-3.5" style={{ color: 'var(--color-accento)' }}>
                  Datos heredados de la ficha del vehículo — para corregirlos, edita el vehículo directamente.
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4 bg-paper rounded-[9px] px-4 py-3">
                  {[
                    ['Marca', vehiculoVinculado.marca || '—'],
                    ['Línea', vehiculoVinculado.linea || '—'],
                    ['Modelo', vehiculoVinculado.modelo ? String(vehiculoVinculado.modelo) : '—'],
                    ['Número de chasis', vehiculoVinculado.numeroChasis || '—'],
                    ['Cilindraje', vehiculoVinculado.cilindraje || '—'],
                    ['Tipo de vehículo', vehiculoVinculado.tipoVehiculo || '—'],
                    ['Subtipo', vehiculoVinculado.subtipo || '—'],
                    ['Municipio de matrícula', vehiculoVinculado.municipioMatricula || '—'],
                    ['Departamento de matrícula', vehiculoVinculado.departamentoMatricula || '—'],
                    ['Blindado', vehiculoVinculado.blindado ? 'Sí' : 'No'],
                    ['Antiguo o clásico', vehiculoVinculado.esClasicoAntiguo ? 'Sí' : 'No'],
                  ].map(([lbl, val]) => (
                    <div key={lbl}>
                      <div className="text-[10px] uppercase tracking-wide text-ink-400 font-semibold mb-0.5">{lbl}</div>
                      <div className="text-[12.5px] font-semibold text-ink-900">{val}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <label className="flex items-center gap-2.5 border border-line rounded-[9px] px-3.5 py-2.5 mb-3.5 w-fit cursor-pointer">
              <input
                type="checkbox"
                checked={vehiculoNuevo}
                onChange={(e) => setVehiculoNuevo(e.target.checked)}
                className="accent-[var(--color-accento)] w-4 h-4"
              />
              <span className="text-[13px] text-ink-900">¿Es vehículo nuevo (primera circulación)?</span>
            </label>

            <div className="flex gap-3 bg-[var(--color-accento-claro)] border border-[var(--color-accento)] rounded-xl px-4 py-3">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="w-[18px] h-[18px] stroke-[var(--color-accento)] shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
              </svg>
              <p className="text-[11.5px] text-ink-900 leading-relaxed">
                Si el cilindraje de la motocicleta es ≤125 cc, está exenta del impuesto por Ley 488 de 1998 — solo se generan derechos de semaforización, no una causación de IUVA.
              </p>
            </div>
          </div>
        )}

        {esIUVA && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">4. Base gravable</h3>

            {vehiculoNuevo ? (
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                  Valor de compra <span className="font-normal text-ink-400">(factura o declaración de importación — Art. 143)</span>
                </label>
                <input
                  type="number"
                  value={valorCompra}
                  onChange={(e) => setValorCompra(e.target.value)}
                  placeholder="$ 0"
                  className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                />
              </div>
            ) : baseGravable?.soportado ? (
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">
                  Base gravable <span className="font-normal text-ink-400">(tabla Ministerio de Transporte, en miles de pesos)</span>
                </label>
                <input
                  value={formatMilesDePesos(baseGravable.valorAjustado)}
                  disabled
                  className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none bg-paper text-ink-600 font-semibold"
                />
                {baseGravable.aplicaBlindaje && (
                  <p className="text-[11px] text-ink-400 mt-1.5">
                    Incluye +10% por blindaje sobre el avalúo de tabla ({formatMilesDePesos(baseGravable.valorTabla)}).
                  </p>
                )}
                {baseGravable.aplicaClasicoAntiguo && (
                  <p className="text-[11px] text-ink-400 mt-1.5">Base fija por vehículo antiguo o clásico, no la tabla de avalúo comercial.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[12.5px] font-medium mb-3.5">
                  {baseGravable?.motivoNoSoportado ?? 'Vincula un vehículo con tipo y año modelo registrados para calcular la base gravable.'}
                </div>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">Base gravable (manual)</label>
                <input
                  type="number"
                  value={avaluoManual}
                  onChange={(e) => setAvaluoManual(e.target.value)}
                  placeholder="Miles de pesos"
                  className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {esEstampillas && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">3. Datos del contrato</h3>
            <FormularioDatosContrato value={datosContrato} onChange={setDatosContrato} />
          </div>
        )}

        {esInfoconsumo && (
          <FormularioTornaguia value={datosTornaguia} onChange={setDatosTornaguia} />
        )}

        {esSycTrace && (
          <FormularioEstampilla value={datosEstampilla} onChange={setDatosEstampilla} />
        )}

        {esGoTrace && (
          <FormularioLoteGoTrace value={datosLoteGoTrace} onChange={setDatosLoteGoTrace} productos={productosEmpresaGoTrace} esNuevo />
        )}

        {esPasivosLaborales && (
          <FormularioInstrumentoPasivo
            value={datosInstrumentoPasivo}
            onChange={setDatosInstrumentoPasivo}
            tipoTramiteNombre={tipoSeleccionado?.nombre ?? ''}
          />
        )}

        {esLibroTotal && (
          <FormularioTurno value={datosTurno} onChange={setDatosTurno} />
        )}

        {esCarneVirtual && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">3. Carné virtual</h3>
            <FormularioCarneVirtual value={datosCarneVirtual} onChange={setDatosCarneVirtual} />
          </div>
        )}

        {esSubsidioDesempleo && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">3. Aportes y afiliación</h3>
            <FormularioSubsidioDesempleo value={datosSubsidioDesempleo} onChange={setDatosSubsidioDesempleo} />
          </div>
        )}

        {esCreditos && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">3. Datos del crédito</h3>
            <FormularioCreditos value={datosCreditos} onChange={setDatosCreditos} />
          </div>
        )}

        {!esIUVA && !esEstampillas && !esInfoconsumo && !esSycTrace && !esGoTrace && !esPasivosLaborales && !esLibroTotal
          && !esCarneVirtual && !esSubsidioDesempleo && !esCreditos && (
          <div className="bg-white border border-line rounded-[14px] p-5 mb-5">
            <h3 className="font-display text-[13.5px] font-semibold text-ink-900 mb-4">3. Datos específicos del trámite</h3>
            {campos ? (
              <div className="flex flex-col gap-3.5">
                {campos.map((c) => (
                  <div key={c.key}>
                    <label className="block text-xs font-semibold text-ink-900 mb-1.5">{c.label}</label>
                    {c.tipo === 'select' ? (
                      <select
                        value={datosTramite[c.key] ?? ''}
                        onChange={(e) => setDatosTramite((d) => ({ ...d, [c.key]: e.target.value }))}
                        className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                      >
                        {c.opciones?.map((op) => <option key={op} value={op}>{op}</option>)}
                      </select>
                    ) : (
                      <input
                        type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
                        value={datosTramite[c.key] ?? ''}
                        onChange={(e) => setDatosTramite((d) => ({ ...d, [c.key]: e.target.value }))}
                        placeholder={c.placeholder}
                        className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-ink-900 mb-1.5">{CAMPO_FALLBACK.label} (opcional)</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  placeholder="Información adicional relevante para el trámite"
                  className="w-full py-2.5 px-3 border-[1.5px] border-line rounded-[9px] text-[13px] outline-none focus:border-blue-500 resize-none"
                />
                <p className="text-[11px] text-ink-400 mt-1.5">
                  Este tipo de solicitud todavía no tiene campos específicos configurados.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/solicitudes?proyectoId=${proyectoId}`)}
            className="py-2.5 px-5 rounded-[9px] border border-line text-ink-600 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={guardando}
            className="flex items-center gap-1.5 py-2.5 px-5 rounded-[9px] bg-[var(--color-accento)] text-white text-sm font-semibold disabled:opacity-60"
          >
            {esSycTrace ? (guardando ? 'Autorizando...' : 'Autorizar expedición') : (guardando ? 'Radicando...' : 'Radicar solicitud')}
            {!guardando && (
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" className="w-3.5 h-3.5 stroke-white">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}