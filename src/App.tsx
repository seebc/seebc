import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Settings, 
  Route, 
  ClipboardList, 
  Search, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Printer, 
  FileText, 
  BarChart2, 
  Shield, 
  LogOut, 
  LogIn, 
  Eye, 
  EyeOff, 
  Menu, 
  FileCheck, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2,
  Users as UsersIcon,
  Vote
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';
import { useSessionTimeout } from './hooks/useSessionTimeout';

// --- Tipos Sugeridos ---
type Tables = Database['public']['Tables'];
type Municipio = Tables['municipios']['Row'];
type Seccion = Tables['secciones']['Row'];
type RepresentanteGeneral = Tables['rg']['Row'];
type RepresentanteCasilla = Tables['rc']['Row'];
type Ruta = Tables['rutas']['Row'];
type Casilla = Tables['casillas']['Row'];
type DistritoFederal = Tables['df']['Row'];
type DistritoLocal = Tables['dl']['Row'];

interface UsuarioManual {
  id: number;
  usuario: string;
  correo: string;
  municipio: number;
}

// Regex para validación de clave de elector (formato INE)
const CLAVE_ELECTOR_REGEX = /^[A-Z]{6}[0-9]{8}[HM][0-9]{3}$/;

// Error Boundary Simple
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.hasError = false;
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state?.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
          <div className="card p-8 max-w-md text-center space-y-4">
            <div className="bg-danger-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-danger-600" />
            </div>
            <h2 className="text-xl font-bold text-surface-900">Algo salió mal</h2>
            <p className="text-surface-500 text-sm">Hubo un error al cargar este módulo. Intenta recargar la página.</p>
            <button onClick={() => window.location.reload()} className="btn-primary w-full">Recargar Aplicación</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // --- Estados de Aplicación ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState<UsuarioManual | null>(() => {
    const saved = localStorage.getItem('seebc_user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- Estados de Datos ---
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [distritosFederales, setDistritosFederales] = useState<DistritoFederal[]>([]);
  const [distritosLocales, setDistritosLocales] = useState<DistritoLocal[]>([]);
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [representantesGenerales, setRepresentantesGenerales] = useState<RepresentanteGeneral[]>([]);
  const [representantesCasilla, setRepresentantesCasilla] = useState<RepresentanteCasilla[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados de UI / Filtros ---
  const [searchTerm, setSearchTerm] = useState('');
  const [reporteOpTipo, setReporteOpTipo] = useState<'rg' | 'df' | 'dl'>('rg');
  const [reporteOpValor, setReporteOpValor] = useState('');
  
  // Nuevo estado para buscador de casillas en Rutas
  const [casillaSearch, setCasillaSearch] = useState('');

  // --- Estados de Formulario RG ---
  const [editingRgId, setEditingRgId] = useState<number | null>(null);
  const [rgForm, setRgForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    clave_elector: '',
    numero_credencial: '',
    cic: '',
    telefono: '',
    correo_electronico: '',
    seccion_id: '',
    municipio_id: '',
    df_id: '',
    dl_id: '',
    calle: '',
    num_ext: '',
    num_int: '',
    colonia: '',
    codigo_postal: '',
    credencial_vigente: true,
    es_militante: false,
    autoriza_propaganda: false,
    tipo_propaganda: 'Ninguno' as 'Lona' | 'Pinta de Barda' | 'Otro' | 'Ninguno',
    firma_capturada: false
  });
  const [rgValidado, setRgValidado] = useState(false);

  // --- Estados de Formulario RC ---
  const [editingRcId, setEditingRcId] = useState<number | null>(null);
  const [rcForm, setRcForm] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    clave_elector: '',
    numero_credencial: '',
    cic: '',
    telefono: '',
    correo_electronico: '',
    seccion_id: '',
    municipio_id: '',
    casilla_id: '',
    df_id: '',
    dl_id: '',
    tipo_nombramiento: 'Propietario' as 'Propietario' | 'Suplente',
    calle: '',
    num_ext: '',
    num_int: '',
    colonia: '',
    codigo_postal: '',
    credencial_vigente: true,
    es_militante: false,
    autoriza_propaganda: false,
    tipo_propaganda: 'Ninguno' as 'Lona' | 'Pinta de Barda' | 'Otro' | 'Ninguno',
    firma_capturada: false
  });
  const [rcValidado, setRcValidado] = useState(false);

  // --- Estados de Formulario Ruta ---
  const [editingRutaId, setEditingRutaId] = useState<number | null>(null);
  const [rutaForm, setRutaForm] = useState({
    nombre_ruta: '',
    representante_general_id: '',
    municipio_id: '',
    df_id: '',
    dl_id: '',
    casillas_asignada: [] as number[]
  });

  // --- Estados de Validación Elector ---
  const [credencialValidacion, setCredencialValidacion] = useState('');
  const [mensajeValidacion, setMensajeValidacion] = useState<'exito' | 'advertencia' | null>(null);
  const [credencialEncontrada, setCredencialEncontrada] = useState<any>(null);

  // --- Gestión de Sesión ---
  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('seebc_user');
    toast('Sesión finalizada', { icon: '👋' });
  }, []);

  useSessionTimeout(logout, !!currentUser);

  // --- Carga de Datos ---
  useEffect(() => {
    if (!currentUser) return;
    loadAllData();
  }, [currentUser]);

  async function loadAllData() {
    setLoading(true);
    try {
      const [
        {data: mun}, {data: sec}, {data: df}, {data: dl}, 
        {data: cas}, {data: rgs}, {data: rcs}, {data: rut}
      ] = await Promise.all([
        supabase.from('municipios').select('*'),
        supabase.from('secciones').select('*'),
        supabase.from('df').select('*'),
        supabase.from('dl').select('*'),
        supabase.from('casillas').select('*'),
        supabase.from('rg').select('*'),
        supabase.from('rc').select('*'),
        supabase.from('rutas').select('*')
      ]);

      setMunicipios(mun || []);
      setSecciones(sec || []);
      setDistritosFederales(df || []);
      setDistritosLocales(dl || []);
      setCasillas(cas || []);
      setRepresentantesGenerales(rgs || []);
      setRepresentantesCasilla(rcs || []);
      setRutas(rut || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos de la base de datos');
    } finally {
      setLoading(false);
    }
  }

  // --- Manejadores Navegación ---
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setSearchTerm('');
    setCasillaSearch(''); // Resetear buscador de casillas al cambiar pestaña
    
    // Resetear validaciones al cambiar de pestaña
    setCredencialValidacion('');
    setMensajeValidacion(null);
    setCredencialEncontrada(null);
    
    // Resetear formularios si no se está editando
    if (tabId === 'generales' && !editingRgId) {
       setRgForm({
        nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '', numero_credencial: '',
        cic: '', telefono: '', correo_electronico: '', seccion_id: '', municipio_id: '', df_id: '', dl_id: '',
        calle: '', num_ext: '', num_int: '', colonia: '', codigo_postal: '', credencial_vigente: true,
        es_militante: false, autoriza_propaganda: false, tipo_propaganda: 'Ninguno', firma_capturada: false
       });
       setRgValidado(false);
    }
    
    if (tabId === 'casilla' && !editingRcId) {
      setRcForm({
        nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '', numero_credencial: '',
        cic: '', telefono: '', correo_electronico: '', seccion_id: '', municipio_id: '', casilla_id: '',
        df_id: '', dl_id: '', tipo_nombramiento: 'Propietario', calle: '', num_ext: '', num_int: '',
        colonia: '', codigo_postal: '', credencial_vigente: true, es_militante: false,
        autoriza_propaganda: false, tipo_propaganda: 'Ninguno', firma_capturada: false
      });
      setRcValidado(false);
    }

    if (tabId === 'rutas_form' && !editingRutaId) {
      setRutaForm({
        nombre_ruta: '', representante_general_id: '', municipio_id: '', 
        df_id: '', dl_id: '', casillas_asignada: []
      });
    }

    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // --- CRUD Representantes Generales ---
  async function handleSaveRg(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...rgForm,
      seccion_id: parseInt(rgForm.seccion_id),
      df_id: parseInt(rgForm.df_id),
      dl_id: parseInt(rgForm.dl_id)
    };

    try {
      if (editingRgId) {
        const { error } = await supabase.from('rg').update(data).eq('id', editingRgId);
        if (error) throw error;
        toast.success('RG actualizado correctamente');
      } else {
        const { error } = await supabase.from('rg').insert([data]);
        if (error) throw error;
        toast.success('RG registrado correctamente');
      }
      setEditingRgId(null);
      handleTabClick('listado_rg');
      loadAllData();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  }

  function handleEditRg(rg: RepresentanteGeneral) {
    setEditingRgId(rg.id);
    const seccionObj = secciones.find(s => s.id === rg.seccion_id);
    setRgForm({
      ...rg,
      seccion_id: String(rg.seccion_id),
      municipio_id: String(seccionObj?.municipio_id || ''),
      df_id: String(rg.df_id),
      dl_id: String(rg.dl_id)
    });
    setRgValidado(true);
    setActiveTab('generales');
  }

  async function handleDeleteRg(id: number) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      const { error } = await supabase.from('rg').delete().eq('id', id);
      if (error) throw error;
      toast.success('Registro eliminado');
      loadAllData();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  }

  // --- CRUD Representantes de Casilla ---
  async function handleSaveRc(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...rcForm,
      seccion_id: parseInt(rcForm.seccion_id),
      casilla_id: parseInt(rcForm.casilla_id),
      df_id: parseInt(rcForm.df_id),
      dl_id: parseInt(rcForm.dl_id)
    };

    try {
      if (editingRcId) {
        const { error } = await supabase.from('rc').update(data).eq('id', editingRcId);
        if (error) throw error;
        toast.success('RC actualizado correctamente');
      } else {
        const { error } = await supabase.from('rc').insert([data]);
        if (error) throw error;
        toast.success('RC registrado correctamente');
      }
      setEditingRcId(null);
      handleTabClick('listado_rc');
      loadAllData();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  }

  function handleEditRc(rc: RepresentanteCasilla) {
    setEditingRcId(rc.id);
    const casObj = casillas.find(c => c.casilla_id === rc.casilla_id);
    setRcForm({
      ...rc,
      seccion_id: String(rc.seccion_id),
      municipio_id: String(casObj?.municipio || ''),
      casilla_id: String(rc.casilla_id),
      df_id: String(rc.df_id),
      dl_id: String(rc.dl_id)
    });
    setRcValidado(true);
    setActiveTab('casilla');
  }

  async function handleDeleteRc(id: number) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      const { error } = await supabase.from('rc').delete().eq('id', id);
      if (error) throw error;
      toast.success('Registro eliminado');
      loadAllData();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  }

  // --- CRUD Rutas ---
  async function handleSaveRuta(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      nombre_ruta: rutaForm.nombre_ruta,
      representante_general_id: parseInt(rutaForm.representante_general_id),
      casillas_asignada: rutaForm.casillas_asignada,
      municipio_id: rutaForm.municipio_id ? parseInt(rutaForm.municipio_id) : null,
      df_id: rutaForm.df_id ? parseInt(rutaForm.df_id) : null,
      dl_id: parseInt(rutaForm.dl_id)
    };

    try {
      if (editingRutaId) {
        const { error } = await supabase.from('rutas').update(data).eq('id', editingRutaId);
        if (error) throw error;
        toast.success('Ruta actualizada');
      } else {
        const { error } = await supabase.from('rutas').insert([data]);
        if (error) throw error;
        toast.success('Ruta creada con éxito');
      }
      setEditingRutaId(null);
      handleTabClick('rutas_list');
      loadAllData();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  }

  function handleEditRuta(ruta: Ruta) {
    setEditingRutaId(ruta.id);
    setRutaForm({
      nombre_ruta: ruta.nombre_ruta,
      representante_general_id: String(ruta.representante_general_id),
      municipio_id: String(ruta.municipio_id || ''),
      df_id: String(ruta.df_id || ''),
      dl_id: String(ruta.dl_id),
      casillas_asignada: Array.isArray(ruta.casillas_asignada) ? ruta.casillas_asignada as number[] : []
    });
    setActiveTab('rutas_form');
  }

  async function handleDeleteRuta(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta ruta?')) return;
    try {
      const { error } = await supabase.from('rutas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Ruta eliminada');
      loadAllData();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  }

  if (!currentUser) return <Login onLoginSuccess={setCurrentUser} />;

  return (
    <ErrorBoundary>
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen bg-surface-50 overflow-hidden font-sans">
        
        {/* Sidebar backdrop (Mobile) */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-surface-900/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar 
          activeTab={activeTab} 
          handleTabClick={handleTabClick} 
          currentUser={currentUser}
          onLogout={logout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Header */}
          <header className="h-16 bg-white border-b border-surface-200 px-6 flex items-center justify-between no-print flex-shrink-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="btn-icon lg:hidden p-2"
              >
                <Menu className="w-5 h-5 text-surface-500" />
              </button>
              <div className="hidden sm:flex items-center gap-2 text-surface-400 text-xs font-medium uppercase tracking-wider">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Sistema Electoral</span>
                <span className="text-surface-300">/</span>
                <span className="text-surface-900">{activeTab.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group max-w-xs hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input 
                  type="text" 
                  placeholder="Buscar en el sistema..." 
                  className="input-field pl-9 h-10 text-xs bg-surface-50 border-transparent focus:bg-white"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-px h-6 bg-surface-200 hidden sm:block"></div>
              <button className="btn-icon relative">
                <div className="absolute top-2 right-2 w-2 h-2 bg-inst-500 rounded-full border-2 border-white"></div>
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                 <div className="w-12 h-12 border-4 border-inst-100 border-t-inst-600 rounded-full animate-spin"></div>
                 <p className="text-surface-400 text-sm font-medium animate-pulse">Sincronizando con base de datos...</p>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto space-y-8 pb-12">
                
                {/* ============ DASHBOARD ============ */}
                {activeTab === 'dashboard' && (
                  <div className="space-y-8 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-inst-600 text-xs font-bold uppercase tracking-widest">Resumen General</p>
                        <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">Panel de Control</h1>
                      </div>
                      <div className="bg-white border border-surface-200 p-1 rounded-xl flex shadow-sm">
                        <button className="px-4 py-2 text-xs font-bold bg-surface-900 text-white rounded-lg">Hoy</button>
                        <button className="px-4 py-2 text-xs font-bold text-surface-500 hover:text-surface-900 transition-colors">Semana</button>
                        <button className="px-4 py-2 text-xs font-bold text-surface-500 hover:text-surface-900 transition-colors">Mes</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="card-metric border-l-4 border-l-inst-600">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-inst-50 rounded-xl text-inst-600"><UsersIcon className="w-5 h-5" /></div>
                          <span className="text-[10px] font-bold text-success-600 bg-success-50 px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <p className="text-surface-500 text-xs font-bold uppercase tracking-wider">Representantes Grales.</p>
                        <h3 className="text-3xl font-black text-surface-900 mt-1">{representantesGenerales.length}</h3>
                      </div>
                      
                      <div className="card-metric border-l-4 border-l-warning-600">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-warning-50 rounded-xl text-warning-600"><ClipboardList className="w-5 h-5" /></div>
                          <span className="text-[10px] font-bold text-success-600 bg-success-50 px-2 py-1 rounded-full">+5%</span>
                        </div>
                        <p className="text-surface-500 text-xs font-bold uppercase tracking-wider">Rep. de Casilla</p>
                        <h3 className="text-3xl font-black text-surface-900 mt-1">{representantesCasilla.length}</h3>
                      </div>

                      <div className="card-metric border-l-4 border-l-success-600">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-success-50 rounded-xl text-success-600"><Vote className="w-5 h-5" /></div>
                          <p className="text-[10px] font-bold text-surface-400 uppercase">Meta: 4,250</p>
                        </div>
                        <p className="text-surface-500 text-xs font-bold uppercase tracking-wider">Casillas Cubiertas</p>
                        <h3 className="text-3xl font-black text-surface-900 mt-1">
                          {new Set(representantesCasilla.map(r => r.casilla_id)).size}
                        </h3>
                      </div>

                      <div className="card-metric border-l-4 border-l-surface-600">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-surface-100 rounded-xl text-surface-600"><Route className="w-5 h-5" /></div>
                          <span className="text-[10px] font-bold text-surface-400 px-2 py-1 bg-surface-50 rounded-full">Activas</span>
                        </div>
                        <p className="text-surface-500 text-xs font-bold uppercase tracking-wider">Rutas Logísticas</p>
                        <h3 className="text-3xl font-black text-surface-900 mt-1">{rutas.length}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       <div className="lg:col-span-2 space-y-6">
                          <div className="card p-6">
                             <div className="flex items-center justify-between mb-8">
                                <div>
                                   <h3 className="font-bold text-surface-900">Cobertura por Municipio</h3>
                                   <p className="text-xs text-surface-400 mt-0.5">Avance real vs Casillas totales</p>
                                </div>
                                <button className="btn-icon"><BarChart2 className="w-4 h-4" /></button>
                             </div>
                             <div className="space-y-6">
                                {municipios.slice(0, 5).map(m => {
                                  const count = representantesCasilla.filter(rc => {
                                    const cas = casillas.find(c => c.casilla_id === rc.casilla_id);
                                    return cas && String(cas.municipio) === String(m.id);
                                  }).length;
                                  const total = casillas.filter(c => String(c.municipio) === String(m.id)).length;
                                  const perc = total > 0 ? (count / total) * 100 : 0;
                                  
                                  return (
                                    <div key={m.id} className="space-y-2">
                                       <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                                          <span className="text-surface-700">{m.municipio}</span>
                                          <span className="text-inst-600">{count} / {total} <span className="text-surface-300 ml-1">({perc.toFixed(0)}%)</span></span>
                                       </div>
                                       <div className="progress-bar">
                                          <div 
                                            className="progress-bar-fill bg-inst-600" 
                                            style={{ width: `${perc}%` }}
                                          ></div>
                                       </div>
                                    </div>
                                  );
                                })}
                             </div>
                          </div>
                       </div>
                       
                       <div className="space-y-6">
                          <div className="card p-6 border-transparent bg-gradient-to-br from-inst-900 to-inst-700 text-white relative overflow-hidden group">
                             <div className="relative z-10 space-y-4">
                                <h3 className="text-lg font-bold leading-tight">Optimiza tu gestión operativa</h3>
                                <p className="text-inst-100 text-xs leading-relaxed opacity-80">Genera reportes técnicos y listados en tiempo real para la coordinación de campo.</p>
                                <button 
                                  onClick={() => handleTabClick('reporte_rutas')}
                                  className="btn-primary bg-white text-inst-900 hover:bg-inst-50 border-none w-full"
                                >
                                   Ir a Reportes
                                </button>
                             </div>
                             <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                          </div>

                          <div className="card p-6">
                             <h3 className="font-bold text-surface-900 mb-5">Vínculos Rápidos</h3>
                             <div className="grid grid-cols-1 gap-2">
                                <button onClick={() => handleTabClick('generales')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 text-xs font-semibold text-surface-600 transition-colors">
                                   <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-surface-400 group-hover:bg-inst-100 group-hover:text-inst-600"><UserCircle className="w-4 h-4" /></div>
                                   Registrar nuevo RG
                                </button>
                                <button onClick={() => handleTabClick('casilla')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 text-xs font-semibold text-surface-600 transition-colors">
                                   <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-surface-400"><ClipboardList className="w-4 h-4" /></div>
                                   Registrar nuevo RC
                                </button>
                                <button onClick={() => handleTabClick('rutas_form')} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 text-xs font-semibold text-surface-600 transition-colors">
                                   <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-surface-400"><Route className="w-4 h-4" /></div>
                                   Gestionar Rutas
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}

                {/* ============ REPORTE RUTAS ============ */}
                {activeTab === 'reporte_rutas' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="flex justify-between items-center no-print">
                      <div>
                        <h1 className="text-2xl font-extrabold text-surface-900">Listados Operativos</h1>
                        <p className="text-surface-500 text-sm">Base de datos técnica para coordinación regional</p>
                      </div>
                      <button onClick={() => window.print()} className="btn-secondary">
                        <Printer className="w-4 h-4" />
                        Imprimir Reporte
                      </button>
                    </div>

                    <div className="card p-6 no-print">
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="input-label">Tipo de Filtro</label>
                            <select 
                              className="select-field" 
                              value={reporteOpTipo} 
                              onChange={(e) => {
                                setReporteOpTipo(e.target.value as any);
                                setReporteOpValor('');
                              }}
                            >
                               <option value="rg">Representante General (RG)</option>
                               <option value="df">Distrito Federal (DF)</option>
                               <option value="dl">Distrito Local (DL)</option>
                            </select>
                          </div>
                          
                          <div>
                             <label className="input-label">Seleccionar Valor</label>
                             <select 
                               className="select-field" 
                               value={reporteOpValor} 
                               onChange={(e) => setReporteOpValor(e.target.value)}
                             >
                                <option value="">Selecciona una opción...</option>
                                {reporteOpTipo === 'rg' && [...representantesGenerales].sort((a,b) => a.nombre.localeCompare(b.nombre)).map(rg => (
                                  <option key={rg.id} value={rg.id}>{rg.nombre} {rg.apellido_paterno}</option>
                                ))}
                                {reporteOpTipo === 'df' && [...distritosFederales].sort((a,b) => (a.df || 0) - (b.df || 0)).map(df => (
                                  <option key={df.id} value={df.id}>Distrito Federal {df.df}</option>
                                ))}
                                {reporteOpTipo === 'dl' && [...distritosLocales].sort((a,b) => (a.dl || 0) - (b.dl || 0)).map(dl => (
                                  <option key={dl.id} value={dl.id}>Distrito Local {dl.dl}</option>
                                ))}
                             </select>
                          </div>
                       </div>
                    </div>

                    {reporteOpValor ? (
                      <div className="card overflow-hidden printable-area">
                        {/* Print Header */}
                        <div className="p-6 border-b-2 border-surface-900 flex justify-between items-end">
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest">Control de Estructura Electoral 2026</p>
                            <h3 className="text-xl font-bold text-surface-900">
                              {reporteOpTipo === 'rg' ? `RG: ${representantesGenerales.find(r => String(r.id) === reporteOpValor)?.nombre} ${representantesGenerales.find(r => String(r.id) === reporteOpValor)?.apellido_paterno}` : 
                               reporteOpTipo === 'df' ? `Distrito Federal ${distritosFederales.find(d => String(d.id) === reporteOpValor)?.df}` :
                               `Distrito Local ${distritosLocales.find(d => String(d.id) === reporteOpValor)?.dl}`}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Página 1 de 1</p>
                            <p className="text-sm font-semibold text-surface-800">{new Date().toLocaleDateString()}</p>
                          </div>
                        </div>

                        <table className="data-table">
                           <thead>
                              <tr>
                                 <th>Casilla</th>
                                 <th>Nombre del Representante</th>
                                 <th>Tipo</th>
                                 <th className="text-center">DL / DF</th>
                                 <th>Celular</th>
                                 <th>Correo Electrónico</th>
                              </tr>
                           </thead>
                           <tbody>
                              {representantesCasilla
                                .filter(rc => {
                                  if (reporteOpTipo === 'rg') {
                                    const ruta = rutas.find(r => 
                                      Array.isArray(r.casillas_asignada) && 
                                      r.casillas_asignada.map(String).includes(String(rc.casilla_id))
                                    );
                                    return String(ruta?.representante_general_id) === reporteOpValor;
                                  }
                                  if (reporteOpTipo === 'df') return String(rc.df_id) === reporteOpValor;
                                  if (reporteOpTipo === 'dl') return String(rc.dl_id) === reporteOpValor;
                                  return false;
                                })
                                .sort((a,b) => {
                                  const casA = casillas.find(c => c.casilla_id === a.casilla_id)?.casilla || '';
                                  const casB = casillas.find(c => c.casilla_id === b.casilla_id)?.casilla || '';
                                  return (casA || '').localeCompare(casB || '', undefined, {numeric: true, sensitivity: 'base'});
                                })
                                .map(rc => {
                                   const cas = casillas.find(c => c.casilla_id === rc.casilla_id);
                                   return (
                                     <tr key={rc.id}>
                                       <td><span className="font-semibold text-surface-900 whitespace-nowrap text-xs">{cas?.casilla || 'N/A'}</span></td>
                                       <td><span className="font-semibold text-surface-800 uppercase text-xs">{rc.nombre} {rc.apellido_paterno} {rc.apellido_materno || ''}</span></td>
                                       <td><span className="text-xs text-surface-500">{rc.tipo_nombramiento}</span></td>
                                       <td className="text-center"><span className="text-xs text-surface-500">{rc.dl_id} / {rc.df_id}</span></td>
                                       <td><span className="text-xs font-medium text-inst-600 font-mono">{rc.telefono || '—'}</span></td>
                                       <td><span className="text-xs text-surface-400 truncate max-w-[150px] inline-block">{rc.correo_electronico || '—'}</span></td>
                                     </tr>
                                   );
                                })}
                              {representantesCasilla.filter(rc => {
                                  if (reporteOpTipo === 'rg') {
                                    const ruta = rutas.find(r => 
                                      Array.isArray(r.casillas_asignada) && 
                                      r.casillas_asignada.map(String).includes(String(rc.casilla_id))
                                    );
                                    return String(ruta?.representante_general_id) === reporteOpValor;
                                  }
                                  if (reporteOpTipo === 'df') return String(rc.df_id) === reporteOpValor;
                                  if (reporteOpTipo === 'dl') return String(rc.dl_id) === reporteOpValor;
                                  return false;
                              }).length === 0 && (
                                <tr>
                                  <td colSpan={6} className="text-center py-12">
                                     <p className="text-sm text-surface-400">Sin registros que coincidan con la selección</p>
                                  </td>
                                </tr>
                              )}
                           </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="card border-dashed border-2 py-20 flex flex-col items-center gap-4 text-center">
                        <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center">
                          <Printer className="w-7 h-7 text-surface-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-600">Configuración del Reporte</p>
                          <p className="text-sm text-surface-400 mt-1">Selecciona el tipo de filtro y el valor para generar el listado.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ============ LISTADO RG ============ */}
                {activeTab === 'listado_rg' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-surface-900">Representantes Generales</h1>
                        <p className="text-surface-500 text-sm mt-1">Administración y seguimiento de la estructura capturada</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge-info">{representantesGenerales.length} registros</span>
                        <button onClick={() => handleTabClick('generales')} className="btn-primary">
                          <UserCircle className="w-4 h-4" />
                          Nuevo RG
                        </button>
                      </div>
                    </div>

                    <div className="table-wrapper overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nombre Completo</th>
                            <th>Teléfono</th>
                            <th>Correo</th>
                            <th>Municipio / Sección</th>
                            <th>Distritos</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {representantesGenerales
                            .filter(rg => 
                              rg.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (rg.telefono && rg.telefono.includes(searchTerm)) ||
                              (rg.correo_electronico && rg.correo_electronico.toLowerCase().includes(searchTerm.toLowerCase()))
                            )
                            .sort((a, b) => a.nombre.localeCompare(b.nombre))
                            .map((rg) => {
                              const seccionObj = secciones.find(s => s.id === rg.seccion_id);
                              const municipio = municipios.find(m => m.id === seccionObj?.municipio_id)?.municipio || 'N/A';
                              const dfObj = distritosFederales.find(d => String(d.id) === String(rg.df_id));
                              const dlObj = distritosLocales.find(d => String(d.id) === String(rg.dl_id));
                              
                              return (
                                <tr key={rg.id}>
                                  <td>
                                    <span className="font-semibold text-surface-800 uppercase">{rg.nombre} {rg.apellido_paterno} {rg.apellido_materno || ''}</span>
                                  </td>
                                  <td>
                                    <span className="text-surface-600 text-xs font-mono">{rg.telefono || 'N/A'}</span>
                                  </td>
                                  <td>
                                    <span className="text-surface-400 text-xs">{rg.correo_electronico || 'N/A'}</span>
                                  </td>
                                  <td>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-medium text-surface-700">{municipio}</span>
                                      <span className="text-[11px] text-surface-400">Sección {seccionObj?.id || 'N/A'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="flex gap-1.5">
                                      <span className="badge-info">DF {dfObj?.df || 'N/A'}</span>
                                      <span className="badge-success">DL {dlObj?.dl || 'N/A'}</span>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleEditRg(rg)} className="btn-icon" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRg(rg.id)} className="btn-icon hover:!text-danger-600 hover:!bg-danger-50" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {representantesGenerales.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                  <UsersIcon className="w-10 h-10 text-surface-300" />
                                  <p className="text-sm text-surface-400">No hay representantes registrados</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ============ FORM RG ============ */}
                {activeTab === 'generales' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge-info">Estructura Electoral</span>
                      </div>
                      <h1 className="text-2xl font-bold text-surface-900">{editingRgId ? 'Editar' : 'Registro de'} Representante General</h1>
                    </div>

                    <ValidadorCredencial 
                      tipo="rg"
                      onSuccess={(clave: string) => {
                        setRgForm(prev => ({ ...prev, clave_elector: clave }));
                        setRgValidado(true);
                      }}
                      credencialValidacion={credencialValidacion}
                      setCredencialValidacion={setCredencialValidacion}
                      mensajeValidacion={mensajeValidacion}
                      setMensajeValidacion={setMensajeValidacion}
                      credencialEncontrada={credencialEncontrada}
                      setCredencialEncontrada={setCredencialEncontrada}
                      activeTab={activeTab}
                      representantesGenerales={representantesGenerales}
                      representantesCasilla={representantesCasilla}
                      editingRgId={editingRgId}
                      editingRcId={editingRcId}
                    />

                    {(rgValidado || editingRgId) && (
                      <form onSubmit={handleSaveRg} className="card p-6 lg:p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-inst-600" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="input-label">Nombre(s)</label>
                            <input type="text" required className="input-field uppercase" value={rgForm.nombre} onChange={e => setRgForm({...rgForm, nombre: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">Apellido Paterno</label>
                            <input type="text" required className="input-field uppercase" value={rgForm.apellido_paterno} onChange={e => setRgForm({...rgForm, apellido_paterno: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">Apellido Materno</label>
                            <input type="text" className="input-field uppercase" value={rgForm.apellido_materno} onChange={e => setRgForm({...rgForm, apellido_materno: e.target.value.toUpperCase()})} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="input-label">Clave de Elector</label>
                            <input type="text" readOnly className="input-field bg-surface-50 text-surface-400 cursor-not-allowed font-mono uppercase" value={rgForm.clave_elector} />
                          </div>
                          <div>
                            <label className="input-label">No. Credencial</label>
                            <input type="text" className="input-field uppercase" value={rgForm.numero_credencial} onChange={e => setRgForm({...rgForm, numero_credencial: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">CIC</label>
                            <input type="text" className="input-field uppercase" value={rgForm.cic} onChange={e => setRgForm({...rgForm, cic: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">Teléfono</label>
                            <input type="tel" className="input-field uppercase" value={rgForm.telefono} onChange={e => setRgForm({...rgForm, telefono: e.target.value.toUpperCase()})} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="input-label">Municipio</label>
                            <select required className="select-field" value={rgForm.municipio_id} onChange={e => setRgForm({...rgForm, municipio_id: e.target.value, seccion_id: ''})}>
                              <option value="">Seleccionar...</option>
                              {[...municipios].sort((a,b) => (a.municipio || '').localeCompare(b.municipio || '')).map(m => <option key={m.id} value={m.id}>{m.municipio}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="input-label">Sección</label>
                            <select required className="select-field" value={rgForm.seccion_id} onChange={e => setRgForm({...rgForm, seccion_id: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {secciones.filter(s => String(s.municipio_id) === rgForm.municipio_id).sort((a,b) => a.id - b.id).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="input-label">Distrito Federal</label>
                            <select required className="select-field" value={rgForm.df_id} onChange={e => setRgForm({...rgForm, df_id: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {[...distritosFederales].sort((a, b) => (a.df || 0) - (b.df || 0)).map(d => <option key={d.id} value={d.id}>DF {d.df}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="input-label">Distrito Local</label>
                            <select required className="select-field" value={rgForm.dl_id} onChange={e => setRgForm({...rgForm, dl_id: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {[...distritosLocales].sort((a, b) => (a.dl || 0) - (b.dl || 0)).map(d => <option key={d.id} value={d.id}>DL {d.dl}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Correo electrónico */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Correo Electrónico</label>
                            <input type="email" className="input-field" value={rgForm.correo_electronico} onChange={e => setRgForm({...rgForm, correo_electronico: e.target.value})} placeholder="correo@ejemplo.com" />
                          </div>
                        </div>

                        {/* Dirección */}
                        <div>
                          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Domicilio</p>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <label className="input-label">Calle</label>
                              <input type="text" className="input-field uppercase" value={rgForm.calle} onChange={e => setRgForm({...rgForm, calle: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                              <label className="input-label">Núm. Exterior</label>
                              <input type="text" className="input-field uppercase" value={rgForm.num_ext} onChange={e => setRgForm({...rgForm, num_ext: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                              <label className="input-label">Núm. Interior</label>
                              <input type="text" className="input-field uppercase" value={rgForm.num_int} onChange={e => setRgForm({...rgForm, num_int: e.target.value.toUpperCase()})} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <div className="md:col-span-2">
                              <label className="input-label">Colonia</label>
                              <input type="text" className="input-field uppercase" value={rgForm.colonia} onChange={e => setRgForm({...rgForm, colonia: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                              <label className="input-label">Código Postal</label>
                              <input type="text" className="input-field uppercase" maxLength={5} value={rgForm.codigo_postal} onChange={e => setRgForm({...rgForm, codigo_postal: e.target.value.toUpperCase()})} />
                            </div>
                          </div>
                        </div>

                        {/* Información adicional */}
                        <div>
                          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Información Adicional</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rgForm.credencial_vigente} onChange={e => setRgForm({...rgForm, credencial_vigente: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Credencial Vigente</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rgForm.es_militante} onChange={e => setRgForm({...rgForm, es_militante: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Es Militante</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rgForm.autoriza_propaganda} onChange={e => setRgForm({...rgForm, autoriza_propaganda: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Autoriza Propaganda</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rgForm.firma_capturada} onChange={e => setRgForm({...rgForm, firma_capturada: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Firma Capturada</span>
                            </label>
                          </div>
                          {rgForm.autoriza_propaganda && (
                            <div className="mt-4 max-w-xs">
                              <label className="input-label">Tipo de Propaganda</label>
                              <select className="select-field" value={rgForm.tipo_propaganda} onChange={e => setRgForm({...rgForm, tipo_propaganda: e.target.value as any})}>
                                <option value="Ninguno">Ninguno</option>
                                <option value="Lona">Lona</option>
                                <option value="Pinta de Barda">Pinta de Barda</option>
                                <option value="Otro">Otro</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                          <button type="button" onClick={() => handleTabClick('listado_rg')} className="btn-ghost">Cancelar</button>
                          <button type="submit" className="btn-primary">
                            {editingRgId ? 'Actualizar Registro' : 'Completar Registro'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* ============ FORM RC ============ */}
                {activeTab === 'casilla' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge-warning">Estructura Electoral</span>
                      </div>
                      <h1 className="text-2xl font-bold text-surface-900">{editingRcId ? 'Editar' : 'Registro de'} Representante de Casilla</h1>
                    </div>

                    <ValidadorCredencial 
                      tipo="rc"
                      registrosExistentes={representantesCasilla}
                      onSuccess={(clave: string) => {
                        setRcForm(prev => ({ ...prev, clave_elector: clave }));
                        setRcValidado(true);
                      }}
                      credencialValidacion={credencialValidacion}
                      setCredencialValidacion={setCredencialValidacion}
                      mensajeValidacion={mensajeValidacion}
                      setMensajeValidacion={setMensajeValidacion}
                      credencialEncontrada={credencialEncontrada}
                      setCredencialEncontrada={setCredencialEncontrada}
                      activeTab={activeTab}
                      representantesGenerales={representantesGenerales}
                      representantesCasilla={representantesCasilla}
                      editingRgId={editingRgId}
                      editingRcId={editingRcId}
                      setRgForm={setRgForm}
                      setRcForm={setRcForm}
                      handleEditRg={handleEditRg}
                      handleEditRc={handleEditRc}
                    />

                    {(rcValidado || editingRcId) && (
                      <form onSubmit={handleSaveRc} className="card p-6 lg:p-8 space-y-8 relative overflow-hidden animate-scale-in">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-warning-600" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="input-label">Nombre(s)</label>
                            <input type="text" required className="input-field uppercase" value={rcForm.nombre} onChange={e => setRcForm({...rcForm, nombre: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">Apellido Paterno</label>
                            <input type="text" required className="input-field uppercase" value={rcForm.apellido_paterno} onChange={e => setRcForm({...rcForm, apellido_paterno: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">Apellido Materno</label>
                            <input type="text" className="input-field uppercase" value={rcForm.apellido_materno} onChange={e => setRcForm({...rcForm, apellido_materno: e.target.value.toUpperCase()})} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="input-label">Clave de Elector</label>
                            <input type="text" readOnly className="input-field bg-surface-50 text-surface-400 cursor-not-allowed font-mono uppercase" value={rcForm.clave_elector} />
                          </div>
                          <div>
                            <label className="input-label">No. Credencial</label>
                            <input type="text" className="input-field uppercase" value={rcForm.numero_credencial} onChange={e => setRcForm({...rcForm, numero_credencial: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">CIC</label>
                            <input type="text" className="input-field uppercase" value={rcForm.cic} onChange={e => setRcForm({...rcForm, cic: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                            <label className="input-label">Teléfono</label>
                            <input type="tel" className="input-field uppercase" value={rcForm.telefono} onChange={e => setRcForm({...rcForm, telefono: e.target.value.toUpperCase()})} />
                          </div>
                        </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="input-label">Tipo Registro</label>
                            <select className="select-field" value={rcForm.tipo_nombramiento} onChange={e => setRcForm({...rcForm, tipo_nombramiento: e.target.value as any})}>
                              <option value="Propietario">Propietario</option>
                              <option value="Suplente">Suplente</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="input-label">Municipio</label>
                            <select required className="select-field" value={rcForm.municipio_id} onChange={e => setRcForm({...rcForm, municipio_id: e.target.value, seccion_id: '', casilla_id: ''})}>
                              <option value="">Seleccionar...</option>
                              {[...municipios].sort((a,b) => (a.municipio || '').localeCompare(b.municipio || '')).map(m => <option key={m.id} value={m.id}>{m.municipio}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="input-label">Sección</label>
                            <select required className="select-field" value={rcForm.seccion_id} onChange={e => setRcForm({...rcForm, seccion_id: e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {secciones.filter(s => String(s.municipio_id) === rcForm.municipio_id).sort((a,b) => a.id - b.id).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                            </select>
                          </div>
                          <div>
                             <label className="input-label">Casilla Asignada</label>
                             <select required className="select-field" value={rcForm.casilla_id} onChange={e => {
                               const cas = casillas.find(c => String(c.casilla_id) === e.target.value);
                               setRcForm({
                                 ...rcForm, 
                                 casilla_id: e.target.value,
                                 df_id: cas ? String(cas.df) : rcForm.df_id,
                                 dl_id: cas ? String(cas.dl) : rcForm.dl_id
                               });
                             }}>
                               <option value="">Seleccionar...</option>
                               {casillas
                                 .filter(c => String(c.municipio) === rcForm.municipio_id)
                                 .sort((a,b) => (a.casilla || '').localeCompare(b.casilla || '', undefined, {numeric: true}))
                                 .map(c => <option key={c.casilla_id} value={c.casilla_id}>{c.casilla}</option>)}
                             </select>
                          </div>
                        </div>



                        {/* Dirección */}
                        <div>
                          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Domicilio</p>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <label className="input-label">Calle</label>
                              <input type="text" className="input-field uppercase" value={rcForm.calle} onChange={e => setRcForm({...rcForm, calle: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                              <label className="input-label">Núm. Exterior</label>
                              <input type="text" className="input-field uppercase" value={rcForm.num_ext} onChange={e => setRcForm({...rcForm, num_ext: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                              <label className="input-label">Núm. Interior</label>
                              <input type="text" className="input-field uppercase" value={rcForm.num_int} onChange={e => setRcForm({...rcForm, num_int: e.target.value.toUpperCase()})} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                            <div className="md:col-span-2">
                              <label className="input-label">Colonia</label>
                              <input type="text" className="input-field uppercase" value={rcForm.colonia} onChange={e => setRcForm({...rcForm, colonia: e.target.value.toUpperCase()})} />
                            </div>
                            <div>
                              <label className="input-label">Código Postal</label>
                              <input type="text" className="input-field uppercase" maxLength={5} value={rcForm.codigo_postal} onChange={e => setRcForm({...rcForm, codigo_postal: e.target.value.toUpperCase()})} />
                            </div>
                          </div>
                        </div>

                        {/* Información adicional */}
                        <div>
                          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Información Adicional</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rcForm.credencial_vigente} onChange={e => setRcForm({...rcForm, credencial_vigente: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Credencial Vigente</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rcForm.es_militante} onChange={e => setRcForm({...rcForm, es_militante: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Es Militante</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rcForm.autoriza_propaganda} onChange={e => setRcForm({...rcForm, autoriza_propaganda: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Autoriza Propaganda</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 cursor-pointer hover:bg-surface-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 accent-inst-600" checked={rcForm.firma_capturada} onChange={e => setRcForm({...rcForm, firma_capturada: e.target.checked})} />
                              <span className="text-sm font-medium text-surface-700">Firma Capturada</span>
                            </label>
                          </div>
                          {rcForm.autoriza_propaganda && (
                            <div className="mt-4 max-w-xs">
                              <label className="input-label">Tipo de Propaganda</label>
                              <select className="select-field" value={rcForm.tipo_propaganda} onChange={e => setRcForm({...rcForm, tipo_propaganda: e.target.value as any})}>
                                <option value="Ninguno">Ninguno</option>
                                <option value="Lona">Lona</option>
                                <option value="Pinta de Barda">Pinta de Barda</option>
                                <option value="Otro">Otro</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="input-label">Correo Electrónico</label>
                            <input type="email" className="input-field" value={rcForm.correo_electronico} onChange={e => setRcForm({...rcForm, correo_electronico: e.target.value})} placeholder="correo@ejemplo.com" />
                          </div>
                          <div>
                            <label className="input-label">Distrito Federal</label>
                            <input type="text" readOnly className="input-field bg-surface-50 text-surface-400 cursor-not-allowed font-mono" value={rcForm.df_id ? `DF ${rcForm.df_id}` : '—'} />
                          </div>
                          <div>
                            <label className="input-label">Distrito Local</label>
                            <input type="text" readOnly className="input-field bg-surface-50 text-surface-400 cursor-not-allowed font-mono" value={rcForm.dl_id ? `DL ${rcForm.dl_id}` : '—'} />
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                          <button type="button" onClick={() => handleTabClick('listado_rc')} className="btn-ghost">Cancelar</button>
                          <button type="submit" className="btn-primary">
                            {editingRcId ? 'Actualizar Registro' : 'Completar Registro'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* ============ LISTADO RC ============ */}
                {activeTab === 'listado_rc' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-surface-900">Representantes de Casilla</h1>
                        <p className="text-surface-500 text-sm mt-1">Seguimiento de la estructura en niveles de casilla</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge-warning">{representantesCasilla.length} registros</span>
                        <button onClick={() => handleTabClick('casilla')} className="btn-primary">
                          <UserCircle className="w-4 h-4" />
                          Nuevo RC
                        </button>
                      </div>
                    </div>

                    <div className="table-wrapper overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nombre Completo</th>
                            <th>Casilla</th>
                            <th>Tipo</th>
                            <th>RG Responsable</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {representantesCasilla
                            .filter(rc => 
                              rc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (rc.telefono && rc.telefono.includes(searchTerm))
                            )
                            .map((rc) => {
                              const cas = casillas.find(c => String(c.casilla_id) === String(rc.casilla_id));
                              
                              // Buscar RG dinámicamente: RC -> Sección -> Ruta -> RG 
                              const ruta = rutas.find(r => 
                                Array.isArray(r.casillas_asignada) && 
                                r.casillas_asignada.map(String).includes(String(rc.casilla_id))
                              );
                              const rg = ruta ? representantesGenerales.find(r => String(r.id) === String(ruta.representante_general_id)) : null;

                              return (
                                <tr key={rc.id}>
                                  <td><span className="font-semibold text-surface-800 uppercase">{rc.nombre} {rc.apellido_paterno}</span></td>
                                  <td><span className="font-semibold text-inst-600 text-xs">{cas?.casilla || 'N/A'}</span></td>
                                  <td><span className="text-xs text-surface-500">{rc.tipo_nombramiento}</span></td>
                                  <td><span className="text-xs text-surface-600">{rg ? `${rg.nombre} ${rg.apellido_paterno}` : 'Sin asignar'}</span></td>
                                  <td className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleEditRc(rc)} className="btn-icon" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                      <button onClick={() => handleDeleteRc(rc.id)} className="btn-icon hover:!text-danger-600 hover:!bg-danger-50" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ============ RUTAS FORM ============ */}
                {activeTab === 'rutas_form' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div>
                      <h1 className="text-2xl font-bold text-surface-900">{editingRutaId ? 'Editar' : 'Registro de'} Ruta</h1>
                    </div>

                    <form onSubmit={handleSaveRuta} className="card p-6 lg:p-8 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-surface-600" />
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="input-label">Nombre de la Ruta</label>
                          <input type="text" required className="input-field uppercase" value={rutaForm.nombre_ruta} onChange={e => setRutaForm({...rutaForm, nombre_ruta: e.target.value.toUpperCase()})} />
                        </div>
                        <div>
                          <label className="input-label">Municipio (Filtro)</label>
                          <select className="select-field" value={rutaForm.municipio_id} onChange={e => setRutaForm({...rutaForm, municipio_id: e.target.value})}>
                            <option value="">Todos los municipios...</option>
                            {[...municipios].sort((a,b) => (a.municipio || '').localeCompare(b.municipio || '')).map(m => <option key={m.id} value={m.id}>{m.municipio}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="input-label">RG Responsable</label>
                          <select required className="select-field" value={rutaForm.representante_general_id} onChange={e => setRutaForm({...rutaForm, representante_general_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {[...representantesGenerales].sort((a,b) => a.nombre.localeCompare(b.nombre)).map(rg => <option key={rg.id} value={rg.id}>{rg.nombre} {rg.apellido_paterno}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="input-label">Distrito Federal</label>
                          <select className="select-field" value={rutaForm.df_id} onChange={e => setRutaForm({...rutaForm, df_id: e.target.value})}>
                            <option value="">Todos los distritos...</option>
                            {[...distritosFederales].sort((a,b) => (a.df || 0) - (b.df || 0)).map(d => <option key={d.id} value={d.id}>DF {d.df}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="input-label">Distrito Local</label>
                          <select className="select-field" value={rutaForm.dl_id} onChange={e => setRutaForm({...rutaForm, dl_id: e.target.value})}>
                            <option value="">Todos los distritos...</option>
                            {[...distritosLocales].sort((a,b) => (a.dl || 0) - (b.dl || 0)).map(d => <option key={d.id} value={d.id}>DL {d.dl}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <label className="input-label">Seleccionar Casillas ({casillas.filter(c => {
                            if (rutaForm.municipio_id && String(c.municipio) !== rutaForm.municipio_id) return false;
                            if (rutaForm.df_id && String(c.df) !== rutaForm.df_id) return false;
                            if (rutaForm.dl_id && String(c.dl) !== rutaForm.dl_id) return false;
                            return true;
                          }).length} disponibles)</label>
                          <span className="text-xs font-semibold text-inst-600 bg-inst-50 px-2 py-1 rounded">
                            {rutaForm.casillas_asignada.length} seleccionadas
                          </span>
                        </div>

                        {/* Buscador de Casillas */}
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-surface-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Buscar casilla por nombre..."
                            className="input-field pl-10"
                            value={casillaSearch}
                            onChange={(e) => setCasillaSearch(e.target.value)}
                          />
                        </div>

                        <div className="border border-surface-200 rounded-lg p-2 bg-surface-50">
                          <div className="max-h-60 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2">
                            {casillas
                              .filter(c => {
                                if (rutaForm.municipio_id && String(c.municipio) !== rutaForm.municipio_id) return false;
                                if (rutaForm.df_id && String(c.df) !== rutaForm.df_id) return false;
                                if (rutaForm.dl_id && String(c.dl) !== rutaForm.dl_id) return false;
                                
                                if (casillaSearch.trim()) {
                                  const search = casillaSearch.toLowerCase();
                                  return (c.casilla || '').toLowerCase().includes(search);
                                }

                                return true;
                              })
                              .sort((a,b) => (a.casilla || '').localeCompare(b.casilla || ''))
                              .map(c => (
                                <label key={c.casilla_id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                                  rutaForm.casillas_asignada.includes(c.casilla_id) 
                                    ? 'bg-inst-50 border-inst-200 shadow-sm' 
                                    : 'bg-white border-transparent hover:border-surface-200'
                                }`}>
                                  <input 
                                    type="checkbox" 
                                    checked={rutaForm.casillas_asignada.includes(c.casilla_id)}
                                    onChange={(e) => {
                                      const newSelection = e.target.checked 
                                        ? [...rutaForm.casillas_asignada, c.casilla_id]
                                        : rutaForm.casillas_asignada.filter((id: number) => id !== c.casilla_id);
                                      setRutaForm({...rutaForm, casillas_asignada: newSelection});
                                    }}
                                    className="w-4 h-4 rounded text-inst-600 focus:ring-inst-500"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-surface-900 uppercase">{c.casilla}</span>
                                  </div>
                                </label>
                              ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                        <button type="button" onClick={() => handleTabClick('rutas_list')} className="btn-ghost">Cancelar</button>
                        <button type="submit" className="btn-primary">
                          {editingRutaId ? 'Actualizar Ruta' : 'Crear Ruta'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* ============ RUTAS LIST ============ */}
                {activeTab === 'rutas_list' && (
                  <div className="space-y-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-surface-900">Listado de Rutas</h1>
                        <p className="text-surface-500 text-sm mt-1">Estructura de rutas asignadas</p>
                      </div>
                      <button onClick={() => handleTabClick('rutas_form')} className="btn-primary">
                        <Route className="w-4 h-4" />
                        Nueva Ruta
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rutas.map(ruta => {
                        const rg = representantesGenerales.find(r => String(r.id) === String(ruta.representante_general_id));
                        return (
                          <div key={ruta.id} className="card p-5 hover-lift">
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center">
                                <Route className="w-5 h-5 text-surface-500" />
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => handleEditRuta(ruta)} className="btn-icon" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteRuta(ruta.id)} className="btn-icon hover:!text-danger-600 hover:!bg-danger-50" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </div>
                            <h4 className="font-bold text-surface-900 uppercase">{ruta.nombre_ruta}</h4>
                            <div className="space-y-1 mt-2">
                              <p className="text-xs text-surface-500 flex justify-between">
                                <span>RG:</span> 
                                <span className="font-medium text-surface-700">{rg ? `${rg.nombre} ${rg.apellido_paterno}` : 'Sin asignar'}</span>
                              </p>
                              <p className="text-xs text-surface-500 flex justify-between">
                                <span>Municipio:</span> 
                                <span className="font-medium text-surface-700">{municipios.find(m => m.id === ruta.municipio_id)?.municipio || 'N/A'}</span>
                              </p>
                              <p className="text-xs text-surface-500 flex justify-between">
                                <span>Casillas:</span> 
                                <span className="font-medium text-surface-700">{(ruta.casillas_asignada as any[])?.length || 0}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
          </div>
          </div>
        </>
        </ErrorBoundary>
      );
    }
    
    // --- Sub-componente Validador ---
    function ValidadorCredencial({ 
      tipo,
      onSuccess,
      credencialValidacion, 
      setCredencialValidacion, 
      mensajeValidacion, 
      setMensajeValidacion, 
      credencialEncontrada, 
      setCredencialEncontrada,
      representantesGenerales, 
      representantesCasilla, 
      editingRgId, 
      editingRcId
    }: any) {
      const isRG = tipo === 'rg';
      
      return (
        <div className="card p-6 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-10 h-10 ${isRG ? 'bg-inst-600' : 'bg-warning-600'} rounded-lg flex items-center justify-center`}>
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-800">Validador de Credencial</h3>
              <p className="text-xs text-surface-400">Verifica duplicidad para {isRG ? 'RG' : 'RC'}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={credencialValidacion}
              onChange={(e) => {
                const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 18);
                setCredencialValidacion(val);
                setMensajeValidacion(null);
                setCredencialEncontrada(null);
              }}
              placeholder="INGRESA CLAVE DE ELECTOR (18 CARACTERES)"
              className="input-field flex-1 font-mono tracking-widest text-base"
              maxLength={18}
            />
            <button
              onClick={() => {
                if (credencialValidacion.length === 0) {
                  toast.error('Ingresa la clave de elector');
                  return;
                }
                if (credencialValidacion.length !== 18) {
                  toast.error(`Incompleta: faltan ${18 - credencialValidacion.length} caracteres`);
                  return;
                }
                if (!CLAVE_ELECTOR_REGEX.test(credencialValidacion)) {
                  toast.error('Formato inválido (6L, 8N, H/M, 3N)');
                  return;
                }
                const encontrada = [...representantesGenerales, ...representantesCasilla].find((r: any) => 
                  r.clave_elector === credencialValidacion && 
                  r.id !== (isRG ? editingRgId : editingRcId)
                );
                if (encontrada) {
                  setCredencialEncontrada(encontrada);
                  setMensajeValidacion('advertencia');
                } else {
                  setCredencialEncontrada(null);
                  setMensajeValidacion('exito');
                  toast.success('Clave validada');
                  onSuccess(credencialValidacion);
                }
              }}
              className="btn-primary whitespace-nowrap"
            >
              Validar Clave
            </button>
          </div>
    
          {/* Success message */}
          {mensajeValidacion === 'exito' && (
            <div className="mt-4 p-4 bg-success-50 border border-success-100 rounded-lg flex items-center gap-3 animate-fade-in-up">
              <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-success-700 text-sm">Disponible</p>
                <p className="text-success-600 text-xs">Clave no registrada. Puedes continuar con la captura.</p>
              </div>
            </div>
          )}
    
          {/* Duplicate Alert Modal */}
          {mensajeValidacion === 'advertencia' && credencialEncontrada && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-900/60 backdrop-blur-sm p-6 no-print animate-fade-in-up">
               <div className="card p-8 max-w-md w-full text-center space-y-6 animate-scale-in shadow-2xl">
                  <div className="bg-danger-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
                     <AlertTriangle className="w-8 h-8 text-danger-600" />
                  </div>
                  <div className="space-y-3">
                     <div className="">
                        <p className="text-xs font-semibold text-danger-600 uppercase tracking-wider mb-1">Alerta de Seguridad</p>
                        <h3 className="text-xl font-bold text-surface-900">Clave Duplicada</h3>
                     </div>
                     <div className="bg-surface-50 p-4 rounded-lg">
                        <p className="text-surface-900 font-bold uppercase">{credencialEncontrada.nombre} {credencialEncontrada.apellido_paterno}</p>
                        <p className="text-surface-500 text-xs mt-1">
                          Asignado como: <span className="font-semibold text-surface-700">{credencialEncontrada.casilla_id ? 'Rep. de Casilla' : 'Rep. General'}</span>
                        </p>
                     </div>
                  </div>
                  <div>
                     <button 
                       onClick={() => {
                         setMensajeValidacion(null);
                         setCredencialEncontrada(null);
                         setCredencialValidacion('');
                       }}
                       className="btn-primary w-full"
                     >
                       Cerrar y Limpiar
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      );
    }
    
    // --- Sidebar ---
    function Sidebar({ 
      activeTab, 
      handleTabClick,
      currentUser,
      onLogout,
      isOpen,
      onClose
    }: { 
      activeTab: string; 
      handleTabClick: (id: string) => void;
      currentUser: any;
      onLogout: () => void;
      isOpen: boolean;
      onClose: () => void;
    }) {
      const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    
      const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
      };
    
      const navigationItems = [
        { id: 'dashboard', label: 'Inicio', Icon: LayoutDashboard },
        { 
          id: 'group_generales', 
          label: 'Generales', 
          Icon: Briefcase,
          isGroup: true,
          subItems: [
            { id: 'generales', label: 'Nuevo RG', Icon: UserCircle },
            { id: 'listado_rg', label: 'Listado RG', Icon: UsersIcon },
          ]
        },
        { 
          id: 'group_casillas', 
          label: 'Rep. Casillas', 
          Icon: ClipboardList,
          isGroup: true,
          subItems: [
            { id: 'casilla', label: 'Nuevo RC', Icon: UserCircle },
            { id: 'listado_rc', label: 'Listado RC', Icon: UsersIcon },
          ]
        },
        { 
          id: 'group_rutas', 
          label: 'Rutas', 
          Icon: Route,
          isGroup: true,
          subItems: [
            { id: 'rutas_form', label: 'Capturar Ruta', Icon: Search },
            { id: 'rutas_list', label: 'Listado Rutas', Icon: Route },
          ]
        },
        { id: 'casillas', label: 'Casillas', Icon: Vote },
        { id: 'padron', label: 'Padrón', Icon: Search },
        { 
          id: 'group_reportes', 
          label: 'Reportes', 
          Icon: BarChart2,
          isGroup: true,
          subItems: [
            { id: 'reporte_cobertura', label: 'Cobertura', Icon: FileCheck },
            { id: 'reporte_rutas', label: 'Listados Op.', Icon: FileText },
          ]
        },
      ];
    
      return (
        <aside className={`
          w-64 bg-white border-r border-surface-200 flex flex-col h-screen flex-shrink-0 no-print
          fixed lg:sticky top-0 z-50 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Logo Area */}
          <div className="h-16 px-5 border-b border-surface-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-inst-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 5v6.5c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V5l-8-3zM12 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-surface-900">SEEBC <span className="text-inst-600">2027</span></h1>
                <p className="text-[10px] text-surface-400 font-medium">Plataforma Electoral</p>
              </div>
            </div>
            {/* Close button - mobile only */}
            <button onClick={onClose} className="btn-icon lg:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
            {navigationItems.map(item => (
              <div key={item.id}>
                {item.isGroup ? (
                  <>
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className={`sidebar-link group ${openGroups[item.id] ? 'text-surface-800' : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50'}`}
                    >
                      <item.Icon className="w-[18px] h-[18px]" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {openGroups[item.id] ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                    </button>
                    
                    {openGroups[item.id] && (
                      <div className="ml-5 pl-3 border-l border-surface-100 space-y-0.5 mt-0.5 mb-1">
                        {item.subItems?.map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => handleTabClick(sub.id)}
                            className={`sidebar-link text-[13px] ${
                              activeTab === sub.id 
                              ? 'sidebar-link-active' 
                              : 'sidebar-link-inactive'
                            }`}
                          >
                            <sub.Icon className="w-4 h-4" />
                            <span>{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`sidebar-link ${
                      activeTab === item.id 
                      ? 'sidebar-link-active' 
                      : 'sidebar-link-inactive'
                    }`}
                  >
                    <item.Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>
    
          {/* User Footer */}
          <div className="p-3 border-t border-surface-200">
            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 bg-inst-50 rounded-lg flex items-center justify-center text-sm font-semibold text-inst-700">
                {currentUser?.usuario?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-800 truncate">{currentUser?.usuario || 'Invitado'}</p>
                <p className="text-[11px] text-success-600 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span> En línea
                </p>
              </div>
              <button onClick={onLogout} className="btn-icon" title="Cerrar Sesión">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      );
    }
    
    // --- Componente Login ---
    function Login({ onLoginSuccess }: { onLoginSuccess: (user: UsuarioManual) => void }) {
      const [usuario, setUsuario] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [showPassword, setShowPassword] = useState(false);
      const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
      async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        
        try {
          const { data, error } = await (supabase as any).rpc('verify_user_password', { 
            p_usuario: usuario, 
            p_password: password 
          });
    
          if (error) throw error;
          
          const res = data as { success: boolean, user?: UsuarioManual, message?: string };
    
          if (!res.success) {
            setErrorMsg(res.message || 'Usuario o contraseña incorrectos.');
            toast.error('Credenciales incorrectas');
          } else if (res.user) {
            toast.success(`Bienvenido, ${res.user.usuario}`);
            onLoginSuccess(res.user);
          }
        } catch (err: any) {
          console.error('Login error:', err);
          setErrorMsg('Error de conexión con el servidor.');
          toast.error('Error de conexión');
        } finally {
          setLoading(false);
        }
      }
    
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-surface-50">
          {/* Background decorative gradient */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-inst-600/5 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-inst-500/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
          </div>
    
          <div className="w-full max-w-sm space-y-8 relative z-10 animate-fade-in-up">
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 bg-inst-600 rounded-2xl flex items-center justify-center shadow-lg shadow-inst-600/20 mb-6">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4 5v6.5c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V5l-8-3zM12 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold text-surface-900">Acceso a Plataforma</h1>
                <p className="text-surface-500 text-sm">Ingresa tus credenciales para continuar</p>
              </div>
            </div>
    
            <form onSubmit={handleLogin} className="card p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="input-label">Usuario</label>
                  <div className="relative group">
                    <input
                      type="text"
                      required
                      placeholder="Nombre de usuario"
                      className="input-field pl-11 h-12 relative z-10 bg-transparent uppercase"
                      value={usuario}
                      onChange={(e) => setUsuario(e.target.value.toUpperCase())}
                      autoComplete="username"
                    />
                    <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 z-20 pointer-events-none group-focus-within:text-inst-500 transition-colors" />
                    <div className="absolute inset-0 bg-white border border-surface-200 group-focus-within:border-inst-500 transition-all rounded-none" />
                  </div>
                </div>
    
                <div>
                  <label className="input-label">Contraseña</label>
                  <div className="relative group">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="input-field pl-11 pr-11 h-12 relative z-10 bg-transparent"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 z-20 pointer-events-none group-focus-within:text-inst-500 transition-colors" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 focus:text-inst-600 transition-colors z-30 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <div className="absolute inset-0 bg-white border border-surface-200 group-focus-within:border-inst-500 transition-all rounded-none" />
                  </div>
                </div>
              </div>
    
              {errorMsg && (
                <div className="animate-fade-in-up">
                  <div className="bg-danger-50 border border-danger-100 rounded-lg p-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-danger-700">{errorMsg}</p>
                  </div>
                </div>
              )}
    
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </button>
            </form>
    
            <footer className="text-center">
              <p className="text-[11px] font-medium text-surface-400">
                SEEBC ©2027 · Versión 3.0
              </p>
            </footer>
          </div>
        </div>
      );
    }
