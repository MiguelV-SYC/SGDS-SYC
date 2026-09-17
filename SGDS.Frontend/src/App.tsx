import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardAdminPage from './pages/DashboardAdminPage';
import SolicitaAccesoPage from './pages/SolicitaAccesoPage';
import RecuperarPasswordPage from './pages/RecuperarPasswordPage';
import GestionUsuariosPage from './pages/GestionUsuariosPage';
import AprobacionUsuariosPage from './pages/AprobacionUsuarioPage';
import GestionProyectosPage from './pages/GestionProyectosPage';
import CiudadanosListPage from './pages/CiudadanosListPage';
import OperadorHomePage from './pages/OperadorHomePage';
import FichaCiudadanoPage from './pages/FichaCiudadanoPage';
import FormularioCiudadanoPage from './pages/FormularioCiudadanoPage';
import ListadoEmpresasPage from './pages/ListadoEmpresasPage';
import FichaEmpresaPage from './pages/FichaEmpresaPage';
import FormularioEmpresaPage from './pages/FormularioEmpresaPage';
import ListadoSolicitudesPage from './pages/ListadoSolicitudesPage';
import NuevaSolicitudPage from './pages/NuevaSolicitudPage';
import DetalleSolicitudPage from './pages/DetalleSolicitudPage';
import WorkflowKanbanPage from './pages/WorkFlowKanbanPage';
import DocumentosPage from './pages/DocumentosPage';
import ReportesPage from './pages/ReportesPage';
import MiPerfilPage from './pages/MiPerfilPage';
import AuditoriaPage from './pages/AuditoriaPage';
import ProyectoWorkspacePage from './pages/ProyectoWorkspacePage';
import VehiculosListPage from './pages/VehiculosListPage';
import FichaVehiculoPage from './pages/FichaVehiculoPage';
import FormularioVehiculoPage from './pages/FormularioVehiculoPage';
import PreliquidacionPage from './pages/PreliquidacionPage';
import EditarSolicitudPage from './pages/EditarSolicitudPage';
import PreliquidacionEstampillasPage from './pages/PreliquidacionEstampillasPage';
import TornaguiaPage from './pages/TornaguiaPage';
import EstampillaPage from './pages/EstampillaPage';
import EstampillaArtePage from './pages/EstampillaArtePage';
import CarneVirtualPage from './pages/CarneVirtualPage';
import CertificadoTrazabilidadPage from './pages/CertificadoTrazabilidadPage';
import LiquidacionImpoConsumoPage from './pages/LiquidacionImpoConsumoPage';
import LiquidacionPasivoLaboralPage from './pages/LiquidacionPasivoLaboralPage';
import SedesPage from './pages/SedesPage';
import SedeDetallePage from './pages/SedeDetallePage';
import ConsultaConsolidadaPage from './pages/ConsultaConsolidadaPage';
import EstadoCuentaConsolidadoPage from './pages/EstadoCuentaConsolidadoPage';
import HistorialEmpresaPage from './pages/HistorialEmpresaPage';
import GerencialHomePage from './pages/GerencialHomePage';
import GerencialAnalisisAvanzadoPage from './pages/GerencialAnalisisAvanzadoPage';
import GerencialProyectosPage from './pages/GerencialProyectosPage';
import GerencialIndicadoresPage from './pages/GerencialIndicadoresPage';
import GerencialTendenciasPage from './pages/GerencialTendenciasPage';
import GerencialComparativosPage from './pages/GerencialComparativosPage';
import GerencialInsightsPage from './pages/GerencialInsightsPage';
import GerencialAlertasPage from './pages/GerencialAlertasPage';
import GerencialAsistenteIaPage from './pages/GerencialAsistenteIaPage';
import AsistenteIaOperador from './components/asistente/AsistenteIaOperador';

function App() {
  const { user } = useAuth();

  return (
    <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.esGerencial ? (
            <GerencialHomePage />
          ) : user.esAdminSyc ? (
            <DashboardAdminPage />
          ) : (
            <OperadorHomePage />
          )
        }
      />

      <Route 
        path="/solicita-acceso" 
        element={<SolicitaAccesoPage />} 
        />

      <Route 
        path="/recuperar-password" 
        element={<RecuperarPasswordPage />} 
        />

      <Route
        path="/usuarios"
        element={user?.esAdminSyc ? <GestionUsuariosPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/usuarios/aprobacion"
        element={user?.esAdminSyc ? <AprobacionUsuariosPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/proyectos"
        element={user?.esAdminSyc ? <GestionProyectosPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route 
        path="/ciudadanos" 
        element={user ? <CiudadanosListPage /> : <Navigate to="/login" replace />} 
      />

      
      <Route
        path="/ciudadanos/:id"
        element={user ? <FichaCiudadanoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/ciudadanos/nuevo" 
        element={user ? <FormularioCiudadanoPage /> : <Navigate to="/login" replace />}
      />
      
      <Route
        path="/ciudadanos/:id/editar" 
        element={user ? <FormularioCiudadanoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/empresas" 
        element={user ? <ListadoEmpresasPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/empresas/:id"
        element={user ? <FichaEmpresaPage /> : <Navigate to="/login" replace />}
      /> 

      <Route
        path="/empresas/nueva"
        element={user ? <FormularioEmpresaPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/empresas/:id/editar"
        element={user ? <FormularioEmpresaPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes"
        element={user ? <ListadoSolicitudesPage /> : <Navigate to="/login" replace /> }
      />

      <Route 
      path="/solicitudes/nueva" 
      element={user ? <NuevaSolicitudPage /> : <Navigate to="/login" replace />} 
      />

      <Route
        path="/solicitudes/:id"
        element={user ? <DetalleSolicitudPage/> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/preliquidacion"
        element={user ? <PreliquidacionPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/editar"
        element={user ? <EditarSolicitudPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/preliquidacion-estampillas"
        element={user ? <PreliquidacionEstampillasPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/tornaguia"
        element={user ? <TornaguiaPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/estampilla"
        element={user ? <EstampillaPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/estampilla/arte"
        element={user ? <EstampillaArtePage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/carne-virtual"
        element={user ? <CarneVirtualPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/certificado-trazabilidad"
        element={user ? <CertificadoTrazabilidadPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/liquidacion-impoconsumo"
        element={user ? <LiquidacionImpoConsumoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/liquidacion-pasivo-laboral"
        element={user ? <LiquidacionPasivoLaboralPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/librototal/sedes"
        element={user ? <SedesPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/librototal/sedes/:id"
        element={user ? <SedeDetallePage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/librototal/consulta-consolidada"
        element={user ? <ConsultaConsolidadaPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/librototal/estado-cuenta"
        element={user ? <EstadoCuentaConsolidadoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/solicitudes/:id/estado-cuenta"
        element={user ? <EstadoCuentaConsolidadoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/gerencial/indicadores"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialIndicadoresPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/tendencias"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialTendenciasPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/comparativos"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialComparativosPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/analisis-avanzado"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialAnalisisAvanzadoPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/insights"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialInsightsPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/alertas"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialAlertasPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/asistente-ia"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialAsistenteIaPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/gerencial/proyectos"
        element={user?.esGerencial || user?.esAdminSyc ? <GerencialProyectosPage /> : <Navigate to="/dashboard" replace />}
      />

      <Route
        path="/infoconsumo/empresas/:empresaId/historial"
        element={user ? <HistorialEmpresaPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/vehiculos"
        element={user ? <VehiculosListPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/vehiculos/:id"
        element={user ? <FichaVehiculoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/vehiculos/nuevo"
        element={user ? <FormularioVehiculoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/vehiculos/:id/editar"
        element={user ? <FormularioVehiculoPage /> : <Navigate to="/login" replace />}
      />

      <Route
        path="/workflow"
        element={user ? <WorkflowKanbanPage /> : <Navigate to="/login" replace />}
      />

      <Route 
        path="/documentos" 
        element={user ? <DocumentosPage /> : <Navigate to="/login" replace />} 
      />

      <Route
        path="/reportes"
        element={user ? <ReportesPage /> : <Navigate to="/login" replace />}
      />
      <Route 
        path="/mi-perfil" 
        element={user ? <MiPerfilPage /> : <Navigate to="/login" replace />} 
      />

      <Route 
        path="/auditoria"
        element={(user?.esAdminSyc || user?.esGerencial) ? <AuditoriaPage /> : <Navigate to="/dashboard" replace />} 
      />

      <Route
        path="/proyectos/:proyectoId" 
        element={user?.esAdminSyc ? <ProyectoWorkspacePage /> : <Navigate to="/dashboard" replace />} 
      />
      
      <Route 
        path="*" 
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />} 
      />



      </Routes>
    <AsistenteIaOperador />
    </>
  );
}

export default App;