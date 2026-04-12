import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  Users, 
  Search, 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle, 
  AlertTriangle,
  UserCircle,
  Briefcase,
  ChevronDown,
  ChevronUp,
  LogOut,
  Trash2,
  Edit2,
  FileText,
  BarChart2,
  Globe,
  Printer,
  Shield,
  Eye,
  EyeOff,
  LogIn,
  Route,
  Vote,
  FileCheck
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { Tables } from './database.types';

type Casilla = Tables<'casillas'>;
type DistritoFederal = Tables<'df'>;
type DistritoLocal = Tables<'dl'>;
type Municipio = Tables<'municipios'>;
type RepresentanteCasilla = Tables<'rc'>;
type RepresentanteGeneral = Tables<'rg'>;
type Seccion = Tables<'secciones'>;
type Ruta = Tables<'rutas'>;
type UsuarioManual = Tables<'usuarios'>;
import { 
  SkeletonTable,
  SkeletonDashboard
} from './components/UI';
import { useSessionTimeout } from './hooks/useSessionTimeout';

// --- Constantes y Validaciones ---
const CLAVE_ELECTOR_REGEX = /^[A-Z]{6}\d{8}[HM]\d{3}$/;

// --- Interfaces de Formulario ---
interface RGFormData {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  clave_elector: string;
  numero_credencial: string;
  cic: string;
  municipio_id: string; // UI Only
  df_id: string;
  dl_id: string;
  seccion_id: string;
  credencial_vigente: boolean;
  es_militante: boolean;
  calle: string;
  num_ext: string;
  num_int: string;
  colonia: string;
  codigo_postal: string;
  telefono: string;
  correo_electronico: string;
  autoriza_propaganda: boolean;
  tipo_propaganda: 'Ninguno' | 'Lona' | 'Pinta de Barda' | 'Otro';
  firma_capturada: boolean;
}

interface RCFormData extends RGFormData {
  casilla_id: string;
  rg_id: string; // UI Only
  tipo_nombramiento: 'Propietario' | 'Suplente';
}

// --- Componente de Error para el Dashboard ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-12 shadow-2xl rounded-[3rem] border-4 border-rose-50 text-center space-y-6 max-w-md">
            <div className="bg-rose-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Algo salió mal</h2>
            <p className="text-slate-500 font-medium">Hubo un error crítico en la aplicación. Por favor, recarga la página.</p>
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
              Recargar Sitio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // --- Estados de Sesión ---
  const [currentUser, setCurrentUser] = useState<UsuarioManual | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // --- Estados de Datos ---
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [secciones, setSecciones] = useState<Seccion[]>([]);
  const [distritosFederales, setDistritosFederales] = useState<DistritoFederal[]>([]);
  const [distritosLocales, setDistritosLocales] = useState<DistritoLocal[]>([]);
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [representantesGenerales, setRepresentantesGenerales] = useState<RepresentanteGeneral[]>([]);
  const [representantesCasilla, setRepresentantesCasilla] = useState<RepresentanteCasilla[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- UI y Navegación ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generales' | 'casilla' | 'listado_rg' | 'listado_rc' | 'casillas' | 'padron' | 'rutas_form' | 'rutas_list' | 'reporte_cobertura' | 'reporte_rutas'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Estados de Validación ---
  const [credencialValidacion, setCredencialValidacion] = useState('');
  const [mensajeValidacion, setMensajeValidacion] = useState<'exito' | 'advertencia' | null>(null);
  const [credencialEncontrada, setCredencialEncontrada] = useState<any>(null);

  // --- Estados para Reportes Operativos ---
  const [reporteOpTipo, setReporteOpTipo] = useState<'rg' | 'df' | 'dl'>('rg');
  const [reporteOpValor, setReporteOpValor] = useState<string>('');

  // --- Formularios ---
  const [rgForm, setRgForm] = useState<RGFormData>({
    nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '', numero_credencial: '', cic: '',
    municipio_id: '', df_id: '', dl_id: '', seccion_id: '', credencial_vigente: true, es_militante: false,
    calle: '', num_ext: '', num_int: '', colonia: '', codigo_postal: '', telefono: '', correo_electronico: '',
    autoriza_propaganda: false, tipo_propaganda: 'Ninguno', firma_capturada: false
  });

  const [rcForm, setRcForm] = useState<RCFormData>({
    nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '', numero_credencial: '', cic: '',
    municipio_id: '', df_id: '', dl_id: '', seccion_id: '', casilla_id: '', rg_id: '',
    tipo_nombramiento: 'Propietario', credencial_vigente: true, es_militante: false,
    calle: '', num_ext: '', num_int: '', colonia: '', codigo_postal: '', telefono: '', correo_electronico: '',
    autoriza_propaganda: false, tipo_propaganda: 'Ninguno', firma_capturada: false
  });

  const [rutaForm, setRutaForm] = useState({
    nombre_ruta: '', representante_general_id: '', df_id: '', dl_id: '', secciones_asignadas: [] as string[]
  });

  // --- Edición ---
  const [editingRgId, setEditingRgId] = useState<number | null>(null);
  const [editingRcId, setEditingRcId] = useState<number | null>(null);
  const [editingRutaId, setEditingRutaId] = useState<number | null>(null);

  // --- Lógica de Auth ---
  useEffect(() => {
    const session = localStorage.getItem('seebc_user');
    if (session) {
      setCurrentUser(JSON.parse(session));
    }
    setAuthChecking(false);
  }, []);

  const handleLoginSuccess = (user: UsuarioManual) => {
    setCurrentUser(user);
    localStorage.setItem('seebc_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('seebc_user');
    toast.success('Sesión cerrada');
  };

  useSessionTimeout(handleLogout, !!currentUser);

  // --- Carga de Datos ---
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [
        { data: munData }, { data: secData }, { data: dfData }, 
        { data: dlData }, { data: casData }, { data: rgData }, 
        { data: rcData }, { data: rutaData }
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

      if (munData) setMunicipios(munData);
      if (secData) setSecciones(secData);
      if (dfData) setDistritosFederales(dfData);
      if (dlData) setDistritosLocales(dlData);
      if (casData) setCasillas(casData);
      if (rgData) setRepresentantesGenerales(rgData);
      if (rcData) setRepresentantesCasilla(rcData);
      if (rutaData) setRutas(rutaData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos del sistema');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  const handleTabClick = useCallback((itemId: string) => {
    setActiveTab(itemId as any);
    setEditingRgId(null);
    setEditingRcId(null);
    setCredencialValidacion('');
    setMensajeValidacion(null);
    setCredencialEncontrada(null);
    if (itemId === 'generales') {
      setRgForm({
        nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '', numero_credencial: '', cic: '',
        municipio_id: '', df_id: '', dl_id: '', seccion_id: '', credencial_vigente: true, es_militante: false,
        calle: '', num_ext: '', num_int: '', colonia: '', codigo_postal: '', telefono: '', correo_electronico: '',
        autoriza_propaganda: false, tipo_propaganda: 'Ninguno' as any, firma_capturada: false
      });
    } else if (itemId === 'casilla') {
      setRcForm({
        nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '', numero_credencial: '', cic: '',
        municipio_id: '', df_id: '', dl_id: '', seccion_id: '', casilla_id: '', rg_id: '',
        tipo_nombramiento: 'Propietario' as any, credencial_vigente: true, es_militante: false,
        calle: '', num_ext: '', num_int: '', colonia: '', codigo_postal: '', telefono: '', correo_electronico: '',
        autoriza_propaganda: false, tipo_propaganda: 'Ninguno' as any, firma_capturada: false
      });
    } else if (itemId === 'rutas_form') {
      if (!editingRutaId) {
        setRutaForm({ nombre_ruta: '', representante_general_id: '', df_id: '', dl_id: '', secciones_asignadas: [] });
      }
    }
  }, [editingRutaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers: Representantes Generales ---
  const handleSaveRg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rgForm.clave_elector || rgForm.clave_elector.length !== 18) {
      toast.error('Debes validar una clave de elector de 18 caracteres');
      return;
    }

    try {
      const { municipio_id, ...payload } = rgForm;
      const dataToSave = {
        ...payload,
        df_id: parseInt(payload.df_id),
        dl_id: parseInt(payload.dl_id),
        seccion_id: parseInt(payload.seccion_id)
      };

      if (editingRgId) {
        const { error } = await supabase.from('rg').update(dataToSave).eq('id', editingRgId);
        if (error) throw error;
        toast.success('Representante General actualizado');
      } else {
        const { error } = await supabase.from('rg').insert([dataToSave]);
        if (error) throw error;
        toast.success('Representante General registrado');
      }
      setEditingRgId(null);
      setCredencialValidacion('');
      setMensajeValidacion(null);
      fetchData();
      setActiveTab('listado_rg');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleEditRg = (rg: any) => {
    setEditingRgId(rg.id);
    setRgForm({
      nombre: rg.nombre, apellido_paterno: rg.apellido_paterno, apellido_materno: rg.apellido_materno || '',
      clave_elector: rg.clave_elector, numero_credencial: rg.numero_credencial || '', cic: rg.cic || '',
      municipio_id: rg.municipio_id ? String(rg.municipio_id) : '', 
      df_id: rg.df_id ? String(rg.df_id) : '', 
      dl_id: rg.dl_id ? String(rg.dl_id) : '', 
      seccion_id: rg.seccion_id ? String(rg.seccion_id) : '',
      credencial_vigente: rg.credencial_vigente, es_militante: rg.es_militante,
      calle: rg.calle || '', num_ext: rg.num_ext || '', num_int: rg.num_int || '', colonia: rg.colonia || '', 
      codigo_postal: rg.codigo_postal || '', telefono: rg.telefono || '', correo_electronico: rg.correo_electronico || '',
      autoriza_propaganda: rg.autoriza_propaganda, tipo_propaganda: rg.tipo_propaganda || 'Ninguno', firma_capturada: rg.firma_capturada || false
    });
    setCredencialValidacion(rg.clave_elector);
    setMensajeValidacion('exito');
    setActiveTab('generales');
  };

  const handleDeleteRg = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    const { error } = await supabase.from('rg').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Registro eliminado'); fetchData(); }
  };

  // --- Handlers: Representantes de Casilla ---
  const handleSaveRc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcForm.clave_elector || rcForm.clave_elector.length !== 18) {
      toast.error('Debes validar una clave de elector de 18 caracteres');
      return;
    }

    try {
      const { municipio_id, rg_id, ...payload } = rcForm;
      const dataToSave = {
        ...payload,
        casilla_id: payload.casilla_id ? parseInt(payload.casilla_id) : null,
        df_id: parseInt(payload.df_id),
        dl_id: parseInt(payload.dl_id),
        seccion_id: parseInt(payload.seccion_id)
      };

      if (editingRcId) {
        const { error } = await supabase.from('rc').update(dataToSave).eq('id', editingRcId);
        if (error) throw error;
        toast.success('Representante de Casilla actualizado');
      } else {
        const { error } = await supabase.from('rc').insert([dataToSave]);
        if (error) throw error;
        toast.success('Representante de Casilla registrado');
      }
      setEditingRcId(null);
      setCredencialValidacion('');
      setMensajeValidacion(null);
      fetchData();
      setActiveTab('listado_rc');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleEditRc = (rc: any) => {
    setEditingRcId(rc.id);
    setRcForm({
      nombre: rc.nombre, apellido_paterno: rc.apellido_paterno, apellido_materno: rc.apellido_materno || '',
      clave_elector: rc.clave_elector, numero_credencial: rc.numero_credencial || '', cic: rc.cic || '',
      municipio_id: rc.municipio_id ? String(rc.municipio_id) : '', 
      df_id: rc.df_id ? String(rc.df_id) : '', 
      dl_id: rc.dl_id ? String(rc.dl_id) : '', 
      seccion_id: rc.seccion_id ? String(rc.seccion_id) : '',
      casilla_id: rc.casilla_id ? String(rc.casilla_id) : '', 
      rg_id: rc.rg_id ? String(rc.rg_id) : '',
      tipo_nombramiento: rc.tipo_nombramiento || 'Propietario',
      credencial_vigente: rc.credencial_vigente, es_militante: rc.es_militante,
      calle: rc.calle || '', num_ext: rc.num_ext || '', num_int: rc.num_int || '', colonia: rc.colonia || '', 
      codigo_postal: rc.codigo_postal || '', telefono: rc.telefono || '', correo_electronico: rc.correo_electronico || '',
      autoriza_propaganda: rc.autoriza_propaganda, tipo_propaganda: rc.tipo_propaganda || 'Ninguno', firma_capturada: rc.firma_capturada || false
    });
    setCredencialValidacion(rc.clave_elector);
    setMensajeValidacion('exito');
    setActiveTab('casilla');
  };

  const handleDeleteRc = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este registro?')) return;
    const { error } = await supabase.from('rc').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Registro eliminado'); fetchData(); }
  };

  // --- Handlers: Rutas ---
  const handleSaveRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...rutaForm,
        df_id: parseInt(rutaForm.df_id),
        dl_id: parseInt(rutaForm.dl_id),
        representante_general_id: rutaForm.representante_general_id ? parseInt(rutaForm.representante_general_id) : null,
        secciones_asignadas: rutaForm.secciones_asignadas as any
      };

      if (editingRutaId) {
        const { error } = await supabase.from('rutas').update(dataToSave).eq('id', editingRutaId);
        if (error) throw error;
        toast.success('Ruta actualizada');
      } else {
        const { error } = await supabase.from('rutas').insert([dataToSave]);
        if (error) throw error;
        toast.success('Ruta registrada');
      }
      setEditingRutaId(null);
      setRutaForm({ nombre_ruta: '', representante_general_id: '', df_id: '', dl_id: '', secciones_asignadas: [] });
      fetchData();
      setActiveTab('rutas_list');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar ruta');
    }
  };

  const handleEditRuta = (ruta: Ruta) => {
    setEditingRutaId(ruta.id);
    setRutaForm({
      nombre_ruta: ruta.nombre_ruta,
      representante_general_id: String(ruta.representante_general_id),
      df_id: ruta.df_id ? String(ruta.df_id) : '',
      dl_id: ruta.dl_id ? String(ruta.dl_id) : '',
      secciones_asignadas: (ruta.secciones_asignadas as string[]) || []
    });
    setActiveTab('rutas_form');
  };

  const handleDeleteRuta = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar esta ruta?')) return;
    const { error } = await supabase.from('rutas').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Ruta eliminada'); fetchData(); }
  };

  if (authChecking) return null;
  if (!currentUser) return <Login onLoginSuccess={handleLoginSuccess} />;

  return (
    <ErrorBoundary>
    <>
      <Toaster position="top-right" toastOptions={{ 
        style: { borderRadius: '0', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 'bold' },
        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
        error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } }
      }} />
      <div className="min-h-screen bg-white flex overflow-hidden">
      
      {/* Sidebar Fija (Design System: Bento Sidebar) */}
      <Sidebar 
        activeTab={activeTab} 
        handleTabClick={handleTabClick}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header (Design System: Glassmorphism/Minimal) */}
      <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-12 z-10 no-print flex-shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => history.back()} className="p-2.5 hover:bg-slate-50 text-slate-400 group transition-all active:scale-90">
            <Globe className="w-5 h-5 group-hover:text-blue-600" />
          </button>
          <div className="h-8 w-px bg-slate-100" />
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar registros..." 
              className="bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white pl-12 pr-6 py-3 rounded-2xl w-96 text-sm font-bold transition-all outline-none placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Estatus Sistema</p>
            <div className="flex items-center justify-end gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-black text-slate-800">Operativo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-12 bg-slate-50/30 custom-scrollbar relative">
        {isLoading ? (
          activeTab === 'dashboard' ? <SkeletonDashboard /> : <SkeletonTable />
        ) : (
          <div className="max-w-7xl mx-auto pb-20">
            {activeTab === 'dashboard' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex justify-between items-end">
                  <header>
                    <p className="text-blue-600 text-xs font-black uppercase tracking-[0.3em] mb-3">Panel de Control</p>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Bienvenido al <span className="text-slate-400">Dashboard</span></h2>
                  </header>
                  <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
                    <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10">General</button>
                    <button className="px-6 py-3 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-colors">Distritación</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="group bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-slate-100 hover:border-blue-500/20 transition-all hover:-translate-y-2">
                    <div className="flex justify-between items-center mb-10">
                      <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-600 transition-colors">
                        <Users className="w-6 h-6 text-blue-600 group-hover:text-white" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">+12%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-slate-900">{representantesGenerales.length}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Representantes Generales</p>
                    </div>
                  </div>

                  <div className="group bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-amber-500/5 border border-slate-100 hover:border-amber-500/20 transition-all hover:-translate-y-2">
                    <div className="flex justify-between items-center mb-10">
                      <div className="bg-amber-50 p-4 rounded-2xl group-hover:bg-amber-600 transition-colors">
                        <LayoutDashboard className="w-6 h-6 text-amber-600 group-hover:text-white" />
                      </div>
                      <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-full">Meta: 90%</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-slate-900">{representantesCasilla.length}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Representantes de Casilla</p>
                    </div>
                  </div>

                  <div className="group bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-500/5 border border-slate-100 hover:border-emerald-500/20 transition-all hover:-translate-y-2">
                    <div className="flex justify-between items-center mb-10">
                      <div className="bg-emerald-50 p-4 rounded-2xl group-hover:bg-emerald-600 transition-colors">
                        <CheckCircle className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">Activo</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-slate-900">{Math.round((representantesCasilla.length / (casillas.length || 1)) * 100)}%</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cobertura Estatal</p>
                    </div>
                  </div>

                  <div className="group bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-rose-500/5 border border-slate-100 hover:border-rose-500/20 transition-all hover:-translate-y-2">
                    <div className="flex justify-between items-center mb-10">
                      <div className="bg-rose-50 p-4 rounded-2xl group-hover:bg-rose-600 transition-colors">
                        <AlertTriangle className="w-6 h-6 text-rose-600 group-hover:text-white" />
                      </div>
                      <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full">Prioridad</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-4xl font-black text-rose-600">{casillas.length - Array.from(new Set(representantesCasilla.map(rc => rc.casilla_id))).length}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Casillas sin Cobertura</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Cobertura por Municipio */}
                  <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Cobertura por Municipio</h3>
                      <BarChart2 className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="p-8 space-y-6 flex-1 overflow-y-auto max-h-[500px]">
                      {municipios.map(m => {
                        const casillasEnMun = casillas.filter(c => c.municipio === m.id);
                        const casillasCubiertas = Array.from(new Set(representantesCasilla.filter(rc => {
                          const cas = casillas.find(c => c.casilla_id === rc.casilla_id);
                          return cas?.municipio === m.id;
                        }).map(rc => rc.casilla_id))).length;
                        const porc = casillasEnMun.length > 0 ? (casillasCubiertas / casillasEnMun.length) * 100 : 0;
                        
                        return (
                          <div key={m.id} className="space-y-2">
                            <div className="flex justify-between items-end">
                              <span className="text-xs font-black text-slate-700 uppercase">{m.municipio}</span>
                              <span className="text-[10px] font-black text-slate-400">{casillasCubiertas} / {casillasEnMun.length}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                              <div className={`h-full transition-all duration-1000 ${porc < 50 ? 'bg-rose-500' : porc < 90 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${porc}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alertas de Vacíos */}
                  <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-8 border-b bg-rose-50 flex justify-between items-center">
                      <h3 className="font-bold text-rose-800 uppercase tracking-widest text-xs">Prioridad de Cobertura (Vacíos)</h3>
                      <AlertTriangle className="w-4 h-4 text-rose-300" />
                    </div>
                    <div className="p-0 flex-1 overflow-y-auto max-h-[500px]">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sec.</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Municipio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {casillas
                            .filter(c => !representantesCasilla.some(rc => rc.casilla_id === c.casilla_id))
                            .slice(0, 50)
                            .map(c => (
                              <tr key={c.casilla_id} className="hover:bg-rose-50/30">
                                <td className="px-8 py-4"><span className="text-xs font-black text-slate-700">{c.casilla?.split(' ')[0]}</span></td>
                                <td className="px-8 py-4"><span className="text-xs font-bold text-rose-600">{c.casilla}</span></td>
                                <td className="px-8 py-4"><span className="text-[10px] font-bold text-slate-400 uppercase">{municipios.find(m => m.id === c.municipio)?.municipio}</span></td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reporte_rutas' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                <header className="flex justify-between items-center no-print border-b-2 border-slate-100 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-2xl"><Printer className="w-6 h-6 text-white" /></div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Listados Operativos</h2>
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Formato de Campo - Tamaño Carta</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.print()} 
                    disabled={!reporteOpValor}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-30 flex items-center gap-3 active:scale-95"
                  >
                    <Printer className="w-5 h-5" />
                    Imprimir Listado
                  </button>
                </header>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-slate-50 no-print">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por</label>
                        <select 
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                          value={reporteOpTipo}
                          onChange={(e) => {
                            setReporteOpTipo(e.target.value as any);
                            setReporteOpValor('');
                          }}
                        >
                          <option value="rg">Responsable General (RG)</option>
                          <option value="df">Distrito Federal (DF)</option>
                          <option value="dl">Distrito Local (DL)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar {reporteOpTipo.toUpperCase()}</label>
                        <select 
                          className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-bold focus:border-blue-500 outline-none transition-all"
                          value={reporteOpValor}
                          onChange={(e) => setReporteOpValor(e.target.value)}
                        >
                          <option value="">-- Elige una opción --</option>
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
                  <div className="bg-white rounded-none shadow-none border border-slate-200 overflow-hidden printable-area">
                    {/* Cabecera del Reporte para Impresión */}
                    <div className="p-8 border-b-4 border-slate-900 flex justify-between items-end">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Control de Estructura Electoral 2026</p>
                        <h3 className="text-3xl font-black text-slate-900 uppercase">
                          {reporteOpTipo === 'rg' ? `RG: ${representantesGenerales.find(r => String(r.id) === reporteOpValor)?.nombre} ${representantesGenerales.find(r => String(r.id) === reporteOpValor)?.apellido_paterno}` : 
                           reporteOpTipo === 'df' ? `Distrito Federal ${distritosFederales.find(d => String(d.id) === reporteOpValor)?.df}` :
                           `Distrito Local ${distritosLocales.find(d => String(d.id) === reporteOpValor)?.dl}`}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página 1 de 1</p>
                        <p className="text-sm font-black text-slate-900">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="p-0">
                       <table className="w-full border-collapse">
                          <thead>
                             <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100">Casilla</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100">Nombre del Representante</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100">Tipo</th>
                                <th className="px-6 py-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100">DL / DF</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-100">Celular</th>
                                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Correo Electrónico</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {representantesCasilla
                               .filter(rc => {
                                 if (reporteOpTipo === 'rg') return String((rc as any).rg_id) === reporteOpValor;
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
                                    <tr key={rc.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                      <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="text-[11px] font-black text-slate-900 whitespace-nowrap">{cas?.casilla || 'N/A'}</span>
                                      </td>
                                      <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="text-[11px] font-black text-slate-700 uppercase">{rc.nombre} {rc.apellido_paterno} {rc.apellido_materno || ''}</span>
                                      </td>
                                      <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{rc.tipo_nombramiento}</span>
                                      </td>
                                      <td className="px-6 py-4 text-center border-r border-slate-50">
                                        <span className="text-[10px] font-bold text-slate-500">{rc.dl_id} / {rc.df_id}</span>
                                      </td>
                                      <td className="px-6 py-4 border-r border-slate-50">
                                        <span className="text-[11px] font-bold text-blue-600 font-mono">{rc.telefono || '-'}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="text-[10px] font-medium text-slate-400 lowercase truncate max-w-[150px] inline-block">{rc.correo_electronico || '-'}</span>
                                      </td>
                                    </tr>
                                  );
                               })}
                             {representantesCasilla.filter(rc => {
                                 if (reporteOpTipo === 'rg') return String((rc as any).rg_id) === reporteOpValor;
                                 if (reporteOpTipo === 'df') return String(rc.df_id) === reporteOpValor;
                                 if (reporteOpTipo === 'dl') return String(rc.dl_id) === reporteOpValor;
                                 return false;
                             }).length === 0 && (
                               <tr>
                                 <td colSpan={6} className="px-8 py-20 text-center">
                                    <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">Sin registros que coincidan con la selección</p>
                                 </td>
                               </tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 py-32 flex flex-col items-center gap-6 text-center opacity-40">
                    <Printer className="w-20 h-20 text-slate-400" />
                    <div>
                      <p className="text-xl font-black text-slate-600 uppercase tracking-widest">Configuración del Reporte</p>
                      <p className="text-sm font-bold text-slate-400">Selecciona el tipo de filtro y el valor para generar el listado.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'listado_rg' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-2 duration-500">
                <header>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Listado de Representantes Generales</h2>
                  <p className="text-slate-400 mt-1 text-base">Administración y seguimiento de la estructura capturada.</p>
                </header>

                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                  <div className="p-8 border-b flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="bg-amber-100 p-3 rounded-2xl"><Users className="w-5 h-5 text-amber-600" /></div>
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs text-slate-400">Capturados</h3>
                    </div>
                    <span className="px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest">{representantesGenerales.length} Registros</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Nombre Completo</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Teléfono</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Correo</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Municipio / Sección</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Distritos</th>
                          <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
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
                              <tr key={rg.id} className="hover:bg-amber-50/30 transition-colors group">
                                <td className="px-8 py-5">
                                  <span className="font-bold text-slate-700 group-hover:text-amber-700 transition-colors uppercase">{rg.nombre} {rg.apellido_paterno} {rg.apellido_materno || ''}</span>
                                </td>
                                <td className="px-8 py-5">
                                  <span className="font-bold text-slate-500 text-xs">{rg.telefono || 'N/A'}</span>
                                </td>
                                <td className="px-8 py-5">
                                  <span className="text-xs text-slate-400 font-medium">{rg.correo_electronico || 'N/A'}</span>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-600 uppercase">{municipio}</span>
                                    <span className="text-[10px] text-slate-400 font-medium uppercase">Sección {seccionObj?.id || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-blue-100">DF {dfObj?.df || 'N/A'}</span>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-tighter border border-emerald-100">DL {dlObj?.dl || 'N/A'}</span>
                                  </div>
                                </td>
                              <td className="px-8 py-5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleEditRg(rg)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-xl transition-all active:scale-95" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteRg(rg.id)} className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-all active:scale-95" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {representantesGenerales.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-8 py-12 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-30">
                                <Users className="w-12 h-12 text-slate-400" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No hay representantes registrados</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'generales' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-2 duration-500">
                <header>
                  <p className="text-blue-600 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Estructura Electoral</p>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{editingRgId ? 'Editar' : 'Registro de'} <span className="text-slate-400">Representante General</span></h2>
                </header>

                <ValidadorCredencial 
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
                  setRgForm={setRgForm}
                />

                {rgForm.clave_elector && (
                  <form onSubmit={handleSaveRg} className="space-y-10 bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre(s)</label>
                        <input type="text" required className="premium-input uppercase" value={rgForm.nombre} onChange={e => setRgForm({...rgForm, nombre: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Paterno</label>
                        <input type="text" required className="premium-input uppercase" value={rgForm.apellido_paterno} onChange={e => setRgForm({...rgForm, apellido_paterno: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Materno</label>
                        <input type="text" className="premium-input uppercase" value={rgForm.apellido_materno} onChange={e => setRgForm({...rgForm, apellido_materno: e.target.value.toUpperCase()})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave de Elector</label>
                        <input type="text" readOnly className="premium-input bg-slate-50 text-slate-400 cursor-not-allowed font-mono" value={rgForm.clave_elector} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">No. Credencial</label>
                        <input type="text" className="premium-input" value={rgForm.numero_credencial} onChange={e => setRgForm({...rgForm, numero_credencial: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIC</label>
                        <input type="text" className="premium-input" value={rgForm.cic} onChange={e => setRgForm({...rgForm, cic: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                        <input type="tel" className="premium-input" value={rgForm.telefono} onChange={e => setRgForm({...rgForm, telefono: e.target.value})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Municipio</label>
                        <select required className="premium-input" value={rgForm.municipio_id} onChange={e => setRgForm({...rgForm, municipio_id: e.target.value, seccion_id: ''})}>
                          <option value="">Seleccionar...</option>
                          {municipios.map(m => <option key={m.id} value={m.id}>{m.municipio}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sección</label>
                        <select required className="premium-input" value={rgForm.seccion_id} onChange={e => setRgForm({...rgForm, seccion_id: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {secciones.filter(s => String(s.municipio_id) === rgForm.municipio_id).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Distrito Federal</label>
                        <select required className="premium-input" value={rgForm.df_id} onChange={e => setRgForm({...rgForm, df_id: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {distritosFederales.map(d => <option key={d.id} value={d.id}>DF {d.df}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Distrito Local</label>
                        <select required className="premium-input" value={rgForm.dl_id} onChange={e => setRgForm({...rgForm, dl_id: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {distritosLocales.map(d => <option key={d.id} value={d.id}>DL {d.dl}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-10 border-t border-slate-50">
                      <button type="button" onClick={() => handleTabClick('listado_rg')} className="px-10 py-5 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
                      <button type="submit" className="px-14 py-5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all outline-none">
                        {editingRgId ? 'Actualizar Registro' : 'Completar Registro'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'casilla' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-2 duration-500">
                <header>
                  <p className="text-amber-600 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Estructura Electoral</p>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{editingRcId ? 'Editar' : 'Registro de'} <span className="text-slate-400">Representante de Casilla</span></h2>
                </header>

                <ValidadorCredencial 
                  credencialValidacion={credencialValidacion}
                  setCredencialValidacion={setCredencialValidacion}
                  mensajeValidacion={mensajeValidacion}
                  setMensajeValidacion={setMensajeValidacion}
                  credencialEncontrada={credencialEncontrada}
                  setCredencialEncontrada={setCredencialEncontrada}
                  activeTab={activeTab}
                  representantesGenerales={representantesGenerales}
                  representantesCasilla={representantesCasilla}
                  editingRcId={editingRcId}
                  setRcForm={setRcForm}
                />

                {rcForm.clave_elector && (
                  <form onSubmit={handleSaveRc} className="space-y-10 bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre(s)</label>
                        <input type="text" required className="premium-input uppercase" value={rcForm.nombre} onChange={e => setRcForm({...rcForm, nombre: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Paterno</label>
                        <input type="text" required className="premium-input uppercase" value={rcForm.apellido_paterno} onChange={e => setRcForm({...rcForm, apellido_paterno: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido Materno</label>
                        <input type="text" className="premium-input uppercase" value={rcForm.apellido_materno} onChange={e => setRcForm({...rcForm, apellido_materno: e.target.value.toUpperCase()})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clave de Elector</label>
                        <input type="text" readOnly className="premium-input bg-slate-50 text-slate-400 cursor-not-allowed font-mono" value={rcForm.clave_elector} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono</label>
                        <input type="tel" className="premium-input" value={rcForm.telefono} onChange={e => setRcForm({...rcForm, telefono: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Registro</label>
                        <select className="premium-input" value={rcForm.tipo_nombramiento} onChange={e => setRcForm({...rcForm, tipo_nombramiento: e.target.value as any})}>
                          <option value="Propietario">Propietario</option>
                          <option value="Suplente">Suplente</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RG Responsable</label>
                        <select required className="premium-input" value={rcForm.rg_id} onChange={e => setRcForm({...rcForm, rg_id: e.target.value})}>
                          <option value="">Seleccionar...</option>
                          {representantesGenerales.map(rg => <option key={rg.id} value={rg.id}>{rg.nombre} {rg.apellido_paterno}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Casilla Asignada</label>
                         <select required className="premium-input" value={rcForm.casilla_id} onChange={e => {
                           const cas = casillas.find(c => String(c.casilla_id) === e.target.value);
                           setRcForm({
                             ...rcForm, 
                             casilla_id: e.target.value,
                             municipio_id: cas ? String(cas.municipio) : '',
                             df_id: cas ? String(cas.df) : '',
                             dl_id: cas ? String(cas.dl) : ''
                           });
                         }}>
                           <option value="">Seleccionar...</option>
                           {casillas.sort((a,b) => (a.casilla || '').localeCompare(b.casilla || '', undefined, {numeric: true})).map(c => <option key={c.casilla_id} value={c.casilla_id}>{c.casilla}</option>)}
                         </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-10 border-t border-slate-50">
                      <button type="button" onClick={() => handleTabClick('listado_rc')} className="px-10 py-5 text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-colors">Cancelar</button>
                      <button type="submit" className="px-14 py-5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all outline-none">
                        {editingRcId ? 'Actualizar Registro' : 'Completar Registro'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'listado_rc' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-2 duration-500">
                <header>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Listado de Representantes de Casilla</h2>
                  <p className="text-slate-400 mt-1 text-base">Seguimiento de la estructura en niveles de casilla.</p>
                </header>

                <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Nombre Completo</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Casilla</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">Tipo</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest">RG Responsable</th>
                          <th className="px-8 py-6 text-center text-[10px] font-black uppercase tracking-widest">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {representantesCasilla
                          .filter(rc => 
                            rc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (rc.telefono && rc.telefono.includes(searchTerm))
                          )
                          .map((rc) => {
                            const cas = casillas.find(c => String(c.casilla_id) === String(rc.casilla_id));
                            const rg = representantesGenerales.find(r => String(r.id) === String((rc as any).rg_id));
                            return (
                              <tr key={rc.id} className="hover:bg-slate-50">
                                <td className="px-8 py-5 font-bold text-slate-700 uppercase">{rc.nombre} {rc.apellido_paterno}</td>
                                <td className="px-8 py-5 font-black text-blue-600 text-xs">{cas?.casilla || 'N/A'}</td>
                                <td className="px-8 py-5 text-xs text-slate-400 font-bold uppercase">{rc.tipo_nombramiento}</td>
                                <td className="px-8 py-5 text-xs text-slate-500 font-medium">{rg ? `${rg.nombre} ${rg.apellido_paterno}` : 'Sin asignar'}</td>
                                <td className="px-8 py-5 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleEditRc(rc)} className="p-2 hover:bg-blue-100 text-blue-600 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteRc(rc.id)} className="p-2 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'rutas_form' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-right-2 duration-500">
                <header>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">{editingRutaId ? 'Editar' : 'Registro de'} <span className="text-slate-400">Ruta</span></h2>
                </header>

                <form onSubmit={handleSaveRuta} className="space-y-10 bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Ruta</label>
                      <input type="text" required className="premium-input uppercase" value={rutaForm.nombre_ruta} onChange={e => setRutaForm({...rutaForm, nombre_ruta: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">RG Responsable</label>
                      <select required className="premium-input" value={rutaForm.representante_general_id} onChange={e => setRutaForm({...rutaForm, representante_general_id: e.target.value})}>
                        <option value="">Seleccionar...</option>
                        {representantesGenerales.map(rg => <option key={rg.id} value={rg.id}>{rg.nombre} {rg.apellido_paterno}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-6 pt-10 border-t border-slate-50">
                    <button type="submit" className="px-14 py-5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all">
                      {editingRutaId ? 'Actualizar Ruta' : 'Crear Ruta'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'rutas_list' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-right-2 duration-500">
                <header>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Listado de Rutas</h2>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {rutas.map(ruta => {
                    const rg = representantesGenerales.find(r => String(r.id) === String(ruta.representante_general_id));
                    return (
                      <div key={ruta.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className="bg-indigo-50 p-4 rounded-2xl"><Route className="w-6 h-6 text-indigo-600" /></div>
                            <div className="flex gap-2">
                              <button onClick={() => handleEditRuta(ruta)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteRuta(ruta.id)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <h4 className="text-xl font-black text-slate-900 uppercase mb-2">{ruta.nombre_ruta}</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RG: {rg ? `${rg.nombre} ${rg.apellido_paterno}` : 'Sin asignar'}</p>
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
  credencialValidacion, 
  setCredencialValidacion, 
  mensajeValidacion, 
  setMensajeValidacion, 
  credencialEncontrada, 
  setCredencialEncontrada,
  activeTab, 
  representantesGenerales, 
  representantesCasilla, 
  editingRgId, 
  editingRcId, 
  setRgForm, 
  setRcForm 
}: any) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-blue-200 p-10 shadow-xl mb-12">
      <div className="flex items-center gap-6 mb-6">
        <div className="bg-blue-600 p-4 shadow-lg">
          <Search className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Validador de Credencial</h3>
          <p className="text-slate-500 font-medium">Verifica duplicidad antes de capturar un nuevo registro.</p>
        </div>
      </div>
      
      <div className="flex gap-4">
        <input
          type="text"
          value={credencialValidacion}
          onChange={(e) => {
            const val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 18);
            setCredencialValidacion(val);
            setMensajeValidacion(null);
            setCredencialEncontrada(null);
            if (activeTab === 'generales') setRgForm((prev: any) => ({ ...prev, clave_elector: '' }));
            else if (activeTab === 'casilla') setRcForm((prev: any) => ({ ...prev, clave_elector: '' }));
          }}
          placeholder="Ingresa la Clave de Elector (18 caracteres)"
          className="flex-1 bg-white border-2 border-blue-200 px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-lg font-mono tracking-widest text-blue-900 placeholder:text-slate-300 transition-all font-bold"
          maxLength={18}
        />
        <button
          onClick={() => {
            if (credencialValidacion.length === 0) {
              toast.error('Por favor ingresa la clave de elector');
              return;
            }
            if (credencialValidacion.length !== 18) {
              toast.error(`La clave incompleta: faltan ${18 - credencialValidacion.length} caracteres`);
              return;
            }
            if (!CLAVE_ELECTOR_REGEX.test(credencialValidacion)) {
              toast.error('Formato inválido. Debe ser: 6 letras, 8 números, H/M y 3 números');
              return;
            }
            const encontrada = [...representantesGenerales, ...representantesCasilla].find(r => 
              r.clave_elector === credencialValidacion && 
              r.id !== (activeTab === 'generales' ? editingRgId : editingRcId)
            );
            if (encontrada) {
              setCredencialEncontrada(encontrada);
              setMensajeValidacion('advertencia');
              toast.error('Esta clave ya está registrada en el sistema');
              if (activeTab === 'generales') setRgForm((prev: any) => ({ ...prev, clave_elector: '' }));
              else if (activeTab === 'casilla') setRcForm((prev: any) => ({ ...prev, clave_elector: '' }));
            } else {
              setCredencialEncontrada(null);
              setMensajeValidacion('exito');
              toast.success('Clave validada correctamente');
              if (activeTab === 'generales') setRgForm((prev: any) => ({ ...prev, clave_elector: credencialValidacion }));
              else if (activeTab === 'casilla') setRcForm((prev: any) => ({ ...prev, clave_elector: credencialValidacion }));
            }
          }}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black transition-all shadow-xl shadow-blue-500/30 active:scale-95 text-lg"
        >
          Validar
        </button>
      </div>

      {mensajeValidacion === 'exito' && (
        <div className="mt-6 p-6 bg-green-500/10 border-2 border-green-500/20 flex items-center gap-4 animate-in zoom-in-95 duration-300">
          <CheckCircle className="w-8 h-8 text-green-600" />
          <div>
            <p className="font-black text-green-700 uppercase tracking-wider text-xs">Clave Disponible</p>
            <p className="text-green-600 font-medium text-sm">Esta clave no se encuentra en el padrón actual. Puedes proceder.</p>
          </div>
        </div>
      )}

      {mensajeValidacion === 'advertencia' && credencialEncontrada && (
        <div className="mt-6 p-8 bg-rose-500/10 border-2 border-rose-500/20 flex items-center justify-between animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-6">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
            <div>
              <p className="font-black text-rose-700 uppercase tracking-wider text-xs">Clave Duplicada</p>
              <p className="text-rose-600 font-bold text-lg">{credencialEncontrada.nombre} {credencialEncontrada.apellido_paterno}</p>
              <p className="text-rose-500 text-sm font-medium">Registrado como: {credencialEncontrada.casilla_id ? 'Representante de Casilla' : 'Representante General'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Renderizado de Sidebar (Bento Theme) ---
function Sidebar({ 
  activeTab, 
  handleTabClick,
  currentUser,
  onLogout 
}: { 
  activeTab: string; 
  handleTabClick: (id: string) => void;
  currentUser: any;
  onLogout: () => void;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { 
      id: 'group_generales', 
      label: 'Generales', 
      Icon: Briefcase,
      isGroup: true,
      subItems: [
        { id: 'generales', label: 'Rep. General', Icon: UserCircle },
        { id: 'listado_rg', label: 'Listado RG', Icon: Users },
      ]
    },
    { 
      id: 'group_casillas', 
      label: 'Rep. Casillas', 
      Icon: ClipboardList,
      isGroup: true,
      subItems: [
        { id: 'casilla', label: 'Rep. Casilla', Icon: UserCircle },
        { id: 'listado_rc', label: 'Listado RC', Icon: Users },
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
    <div className="w-72 bg-white min-h-screen border-r border-slate-200 flex flex-col">
      <div className="p-10 border-b border-slate-50 flex flex-col items-center">
        <div className="w-14 h-14 bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/10 mb-5">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 5v6.5c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V5l-8-3zM12 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">SEEBC <span className="text-primary-600">2027</span></h1>
        <p className="text-[9px] text-slate-400 mt-1.5 uppercase tracking-[0.3em] font-bold">Plataforma Electoral</p>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 mt-4 overflow-y-auto">
        {navigationItems.map(item => (
          <div key={item.id} className="space-y-1">
            {item.isGroup ? (
              <>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 transition-all duration-300 group hover:bg-blue-50 text-slate-500 hover:text-blue-600`}
                >
                  <item.Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span className="font-bold tracking-tight text-sm">{item.label}</span>
                  <div className="ml-auto">
                    {openGroups[item.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                
                {openGroups[item.id] && (
                  <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1">
                    {item.subItems?.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => handleTabClick(sub.id)}
                        className={`nav-item text-xs ${
                          activeTab === sub.id 
                          ? 'nav-item-active' 
                          : 'nav-item-inactive'
                        }`}
                      >
                        <sub.Icon className="w-4 h-4" />
                        <span className="font-semibold tracking-tight">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`nav-item ${
                  activeTab === item.id 
                  ? 'nav-item-active' 
                  : 'nav-item-inactive'
                }`}
              >
                <item.Icon className="w-5 h-5" />
                <span className="font-semibold tracking-tight text-sm">{item.label}</span>
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 flex items-center justify-center font-bold text-slate-600 border border-slate-200">
            {currentUser?.usuario?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.usuario || 'Invitado'}</p>
            <p className="text-[9px] text-emerald-600 flex items-center gap-1.5 font-bold uppercase tracking-widest">
              <span className="w-1 h-1 rounded-full bg-emerald-500"></span> Online
            </p>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors" title="Cerrar Sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-white animate-in fade-in duration-1000">
      <div className="w-full max-w-sm space-y-12">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-600 flex items-center justify-center shadow-2xl shadow-primary-500/20 mb-8">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L4 5v6.5c0 5 3.5 9.5 8 10.5 4.5-1 8-5.5 8-10.5V5l-8-3zM12 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Acceso a Plataforma</h1>
            <p className="text-slate-400 text-sm">Ingresa tus credenciales para continuar</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="text"
                  required
                  placeholder="Nombre de usuario"
                  className="premium-input !pl-12 !py-4"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="premium-input !pl-12 !py-4 pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
              <div className="bg-rose-50 border border-rose-100 p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <p className="text-xs font-bold text-rose-600 uppercase tracking-tight">
                  {errorMsg}
                </p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="premium-button w-full uppercase tracking-widest text-sm py-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        <footer className="text-center pt-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
            SEEBC @2027 • Versión 2.0
          </p>
        </footer>
      </div>
    </div>
  );
}
