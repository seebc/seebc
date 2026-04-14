import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  MapPin, 
  Search, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Download, 
  Settings,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  FileText,
  UserCheck,
  Map as MapIcon,
  ChevronDown,
  Mail,
  Lock,
  Smartphone,
  Check,
  Eye,
  Trash2,
  Printer,
  Grid
} from 'lucide-react';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

type RC = Database['public']['Tables']['rc']['Row'];
type RG = Database['public']['Tables']['rg']['Row'];
type Ruta = Database['public']['Tables']['rutas']['Row'];
type Casilla = Database['public']['Tables']['casillas']['Row'];
type Municipio = Database['public']['Tables']['municipios']['Row'];
type DF = Database['public']['Tables']['df']['Row'];
type DL = Database['public']['Tables']['dl']['Row'];

type View = 'dashboard' | 'rc-registration' | 'rg-registration' | 'rutas' | 'reportes' | 'config';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Auth State
  const [loginData, setLoginData] = useState({ usuario: '', contrasena: '' });
  const [loginError, setLoginError] = useState('');

  // Data State
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [distritosFederales, setDistritosFederales] = useState<DF[]>([]);
  const [distritosLocales, setDistritosLocales] = useState<DL[]>([]);
  const [rgs, setRgs] = useState<RG[]>([]);
  const [rcs, setRcs] = useState<RC[]>([]);
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [casillas, setCasillas] = useState<Casilla[]>([]);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (session) {
      loadInitialData();
    }
  }, [session]);

  const checkSession = async () => {
    const savedSession = localStorage.getItem('seebc_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
    setLoading(false);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [
        { data: munData },
        { data: dfData },
        { data: dlData },
        { data: rgData },
        { data: rcData },
        { data: rutaData },
        { data: casillaData }
      ] = await Promise.all([
        supabase.from('municipios').select('*'),
        supabase.from('df').select('*'),
        supabase.from('dl').select('*'),
        supabase.from('rg').select('*'),
        supabase.from('rc').select('*'),
        supabase.from('rutas').select('*'),
        supabase.from('casillas').select('*')
      ]);

      setMunicipios(munData || []);
      setDistritosFederales(dfData || []);
      setDistritosLocales(dlData || []);
      setRgs(rgData || []);
      setRcs(rcData || []);
      setRutas(rutaData || []);
      setCasillas(casillaData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      // Normalize username to lowercase for comparison
      const normalizedUser = loginData.usuario.toLowerCase();
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('usuario', normalizedUser)
        .eq('contrasena', loginData.contrasena)
        .single();

      if (error || !data) {
        setLoginError('Credenciales incorrectas');
        return;
      }

      const newSession = { user: data };
      localStorage.setItem('seebc_session', JSON.stringify(newSession));
      setSession(newSession);
    } catch (err) {
      setLoginError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('seebc_session');
    setSession(null);
  };

  if (loading && !session) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-surface-50\">
        <div className=\"flex flex-col items-center gap-4\">
          <div className=\"w-12 h-12 border-4 border-inst-600 border-t-transparent rounded-full animate-spin\"></div>
          <p className=\"text-surface-600 font-medium animate-pulse\">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className=\"min-h-screen flex items-center justify-center bg-surface-50 p-6\">
        <div className=\"w-full max-w-md\">
          <div className=\"text-center mb-10\">
            <div className=\"inline-flex items-center justify-center w-20 h-20 bg-inst-600 rounded-2xl mb-6 shadow-xl shadow-inst-600/20\">
              <CheckCircle2 className=\"w-10 h-10 text-white\" />
            </div>
            <h1 className=\"text-3xl font-extrabold text-surface-900 tracking-tight\">SEEBC</h1>
            <p className=\"text-surface-500 mt-2 font-medium\">Gestión Electoral Institucional</p>
          </div>

          <div className=\"card p-8 animate-scale-in\">
            <h2 className=\"text-xl font-bold text-surface-800 mb-6\">Iniciar Sesión</h2>
            
            <form onSubmit={handleLogin} className=\"space-y-5\">
              <div className=\"space-y-2\">
                <label className=\"input-label\">Usuario</label>
                <div className=\"relative group\">
                  <div className=\"absolute inset-y-0 left-0 pl-11 flex items-center pointer-events-none text-surface-400 group-focus-within:text-inst-600 transition-colors\">
                    <Users size={18} />
                  </div>
                  <input
                    type=\"text\"
                    className=\"input-field pl-11\"
                    placeholder=\"nombre.apellido\"
                    value={loginData.usuario}
                    onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className=\"space-y-2\">
                <label className=\"input-label\">Contraseña</label>
                <div className=\"relative group\">
                  <div className=\"absolute inset-y-0 left-0 pl-11 flex items-center pointer-events-none text-surface-400 group-focus-within:text-inst-600 transition-colors\">
                    <Lock size={18} />
                  </div>
                  <input
                    type=\"password\"
                    className=\"input-field pl-11\"
                    placeholder=\"••••••••\"
                    value={loginData.contrasena}
                    onChange={(e) => setLoginData({ ...loginData, contrasena: e.target.value })}
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className=\"flex items-center gap-2 p-3 bg-danger-50 text-danger-700 text-sm font-semibold rounded-lg border border-danger-100 animate-pulse\">
                  <AlertCircle size={16} />
                  {loginError}
                </div>
              )}

              <button
                type=\"submit\"
                disabled={loading}
                className=\"btn-primary w-full py-3.5 text-base shadow-lg shadow-inst-600/25\"
              >
                {loading ? (
                  <div className=\"w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin\"></div>
                ) : (
                  'Ingresar al Sistema'
                )}
              </button>
            </form>
          </div>
          
          <p className=\"text-center mt-8 text-surface-400 text-sm font-medium\">
            © 2026 SEEBC • Sistema de Estructura Electoral
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen flex bg-surface-50\">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-surface-200 transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className=\"flex flex-col h-full\">
          <div className=\"p-6 flex items-center justify-between\">
            <div className=\"flex items-center gap-3\">
              <div className=\"w-10 h-10 bg-inst-600 rounded-xl flex items-center justify-center shadow-lg shadow-inst-600/20\">
                <CheckCircle2 className=\"text-white w-6 h-6\" />
              </div>
              <div>
                <span className=\"text-xl font-black text-surface-900 tracking-tighter\">SEEBC</span>
                <p className=\"text-[10px] font-bold text-surface-400 uppercase tracking-widest leading-none\">Admin Panel</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className=\"lg:hidden btn-icon\">
              <X size={20} />
            </button>
          </div>

          <nav className=\"flex-1 px-4 space-y-1 overflow-y-auto mt-4\">
            <SidebarLink 
              active={currentView === 'dashboard'} 
              onClick={() => setCurrentView('dashboard')}
              icon={<LayoutDashboard size={20} />}
              label=\"Dashboard\"
            />
            
            <div className=\"pt-4 pb-2\">
              <p className=\"px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest\">Registro</p>
            </div>
            <SidebarLink 
              active={currentView === 'rg-registration'} 
              onClick={() => setCurrentView('rg-registration')}
              icon={<Users size={20} />}
              label=\"Rep. Generales (RG)\"
            />
            <SidebarLink 
              active={currentView === 'rc-registration'} 
              onClick={() => setCurrentView('rc-registration')}
              icon={<UserCheck size={20} />}
              label=\"Rep. de Casilla (RC)\"
            />

            <div className=\"pt-4 pb-2\">
              <p className=\"px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest\">Operación</p>
            </div>
            <SidebarLink 
              active={currentView === 'rutas'} 
              onClick={() => setCurrentView('rutas')}
              icon={<MapIcon size={20} />}
              label=\"Gestión de Rutas\"
            />
            <SidebarLink 
              active={currentView === 'reportes'} 
              onClick={() => setCurrentView('reportes')}
              icon={<FileText size={20} />}
              label=\"Reportes Operativos\"
            />

            <div className=\"pt-4 pb-2\">
              <p className=\"px-4 text-[10px] font-bold text-surface-400 uppercase tracking-widest\">Sistema</p>
            </div>
            <SidebarLink 
              active={currentView === 'config'} 
              onClick={() => setCurrentView('config')}
              icon={<Settings size={20} />}
              label=\"Configuración\"
            />
          </nav>

          <div className=\"p-4 border-t border-surface-200\">
            <div className=\"flex items-center gap-3 px-4 py-3 bg-surface-50 rounded-xl mb-3\">
              <div className=\"w-9 h-9 bg-inst-100 text-inst-700 rounded-lg flex items-center justify-center font-bold\">
                {session?.user?.usuario?.charAt(0).toUpperCase()}
              </div>
              <div className=\"flex-1 min-w-0\">
                <p className=\"text-sm font-bold text-surface-800 truncate\">{session?.user?.usuario}</p>
                <p className=\"text-xs font-medium text-surface-500 truncate lowercase\">Administrador</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className=\"w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-danger-600 hover:bg-danger-50 rounded-xl transition-colors\"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className=\"flex-1 flex flex-col min-w-0 overflow-hidden\">
        <header className=\"h-20 bg-white border-bottom border-surface-200 px-8 flex items-center justify-between sticky top-0 z-40 no-print\">
          <div className=\"flex items-center gap-4\">
            <button onClick={() => setIsSidebarOpen(true)} className=\"lg:hidden btn-icon\">
              <Menu size={22} />
            </button>
            <h2 className=\"text-xl font-extrabold text-surface-900 tracking-tight\">
              {currentView === 'dashboard' && 'Dashboard Principal'}
              {currentView === 'rg-registration' && 'Registro de Representantes Generales'}
              {currentView === 'rc-registration' && 'Registro de Representantes de Casilla'}
              {currentView === 'rutas' && 'Planificación de Rutas'}
              {currentView === 'reportes' && 'Centro de Reportes'}
              {currentView === 'config' && 'Configuración del Sistema'}
            </h2>
          </div>
          
          <div className=\"flex items-center gap-3\">
            <div className=\"hidden md:flex flex-col items-end mr-3 px-4 py-1.5 border-r border-surface-200\">
              <span className=\"text-[10px] font-bold text-surface-400 uppercase tracking-widest\">Fecha de Hoy</span>
              <span className=\"text-sm font-bold text-surface-700\">{new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <button className=\"btn-icon relative\">
              <div className=\"absolute top-2 right-2 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white\"></div>
              <Mail size={20} />
            </button>
          </div>
        </header>

        <div className=\"flex-1 overflow-y-auto p-8 scroll-smooth\">
          {currentView === 'dashboard' && <Dashboard rgs={rgs} rcs={rcs} rutas={rutas} />}
          {currentView === 'rg-registration' && <RGRegistration rgs={rgs} distritosFederales={distritosFederales} distritosLocales={distritosLocales} refreshData={loadInitialData} />}
          {currentView === 'rc-registration' && <RCRegistration rcs={rcs} distritosFederales={distritosFederales} distritosLocales={distritosLocales} casillas={casillas} refreshData={loadInitialData} />}
          {currentView === 'rutas' && <RutasManager rgs={rgs} distritosLocales={distritosLocales} rutas={rutas} casillas={casillas} refreshData={loadInitialData} />}
          {currentView === 'reportes' && <Reportes rgs={rgs} rcs={rcs} rutas={rutas} distritosFederales={distritosFederales} distritosLocales={distritosLocales} />}
          {currentView === 'config' && <Configuracion />}
        </div>
      </main>
    </div>
  );
}

// Components
function SidebarLink({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`sidebar-link ${active ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
    >
      <span className={active ? 'text-inst-600' : 'text-surface-400'}>{icon}</span>
      <span className=\"font-bold\">{label}</span>
      {active && <ChevronRight size={14} className=\"ml-auto opacity-50\" />}
    </button>
  );
}

function Dashboard({ rgs, rcs, rutas }: { rgs: RG[], rcs: RC[], rutas: Ruta[] }) {
  return (
    <div className=\"space-y-10 animate-fade-in-up\">
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">
        <MetricCard label=\"Total RG\" value={rgs.length} icon={<Users className=\"text-inst-600\" />} trend=\"Estructura Base\" />
        <MetricCard label=\"Total RC\" value={rcs.length} icon={<UserCheck className=\"text-success-600\" />} trend=\"En proceso\" />
        <MetricCard label=\"Rutas Activas\" value={rutas.length} icon={<MapIcon className=\"text-warning-600\" />} trend=\"Logística\" />
        <MetricCard label=\"Cobertura\" value=\"84%\" icon={<CheckCircle2 className=\"text-inst-500\" />} trend=\"+5% vs ayer\" />
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-3 gap-8\">
        <div className=\"lg:col-span-2 card p-8\">
          <div className=\"flex items-center justify-between mb-8 pb-4 border-b border-surface-100\">
            <h3 className=\"text-lg font-black text-surface-900\">Actividad Reciente</h3>
            <button className=\"btn-ghost text-xs uppercase tracking-widest\">Ver Todo</button>
          </div>
          <div className=\"space-y-6\">
            {[1, 2, 3].map(i => (
              <div key={i} className=\"flex items-center gap-4 group cursor-pointer\">
                <div className=\"w-12 h-12 bg-surface-50 rounded-2xl flex items-center justify-center group-hover:bg-inst-50 transition-colors\">
                  <Plus className=\"text-surface-400 group-hover:text-inst-600\" size={20} />
                </div>
                <div className=\"flex-1\">
                  <p className=\"text-sm font-bold text-surface-800\">Nuevo registro de RC</p>
                  <p className=\"text-xs font-semibold text-surface-400\">Elias Alejandro ha sido asignado a la Casilla 45B</p>
                </div>
                <span className=\"text-[10px] font-bold text-surface-400 uppercase\">Hace 12 min</span>
              </div>
            ))}
          </div>
        </div>

        <div className=\"card p-8\">
          <h3 className=\"text-lg font-black text-surface-900 mb-8 pb-4 border-b border-surface-100\">Estado de Metas</h3>
          <div className=\"space-y-8\">
            <StatusProgress label=\"REPRESENTANTES GENERALES\" current={rgs.length} goal={50} color=\"bg-inst-600\" />
            <StatusProgress label=\"REPRESENTANTES DE CASILLA\" current={rcs.length} goal={250} color=\"bg-success-500\" />
            <StatusProgress label=\"RUTAS LOGÍSTICAS\" current={rutas.length} goal={30} color=\"bg-warning-500\" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, trend }: { label: string, value: string | number, icon: React.ReactNode, trend: string }) {
  return (
    <div className=\"card-metric group\">
      <div className=\"flex justify-between items-start mb-4 relative z-10\">
        <div className=\"p-3 bg-surface-50 rounded-xl group-hover:bg-white group-hover:shadow-md transition-all\">
          {icon}
        </div>
        <span className=\"text-[10px] font-bold text-surface-400 uppercase tracking-widest bg-surface-50 px-2 py-1 rounded-md\">{trend}</span>
      </div>
      <div className=\"relative z-10\">
        <p className=\"text-3xl font-black text-surface-900 mb-1 tracking-tighter\">{value}</p>
        <p className=\"text-xs font-bold text-surface-400 uppercase tracking-widest\">{label}</p>
      </div>
    </div>
  );
}

function StatusProgress({ label, current, goal, color }: { label: string, current: number, goal: number, color: string }) {
  const percentage = Math.min(Math.round((current / goal) * 100), 100);
  return (
    <div className=\"space-y-3\">
      <div className=\"flex justify-between items-end\">
        <span className=\"text-[10px] font-bold text-surface-400 uppercase tracking-widest\">{label}</span>
        <span className=\"text-xs font-black text-surface-700\">{percentage}%</span>
      </div>
      <div className=\"progress-bar\">
        <div className={`progress-bar-fill ${color}`} style={{ width: `${percentage}%` }}></div>
      </div>
      <p className=\"text-[10px] font-semibold text-surface-400\">{current} de {goal} objetivos alcanzados</p>
    </div>
  );
}

function RGRegistration({ rgs, distritosFederales, distritosLocales, refreshData }: any) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    clave_elector: '',
    numero_credencial: '',
    telefono: '',
    correo_electronico: '',
    df_id: '',
    dl_id: '',
    seccion_id: '',
    calle: '',
    num_ext: '',
    num_int: '',
    colonia: '',
    codigo_postal: '',
    cic: '',
    credencial_vigente: true,
    es_militante: false,
    autoriza_propaganda: false,
    tipo_propaganda: 'Ninguno',
    firma_capturada: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: insertError } = await supabase
        .from('rg')
        .insert([{
          ...formData,
          df_id: parseInt(formData.df_id),
          dl_id: parseInt(formData.dl_id),
          seccion_id: parseInt(formData.seccion_id)
        }]);

      if (insertError) throw insertError;

      setSuccess('Representante General registrado exitosamente');
      setShowForm(false);
      refreshData();
      setFormData({
        nombre: '', apellido_paterno: '', apellido_materno: '', clave_elector: '',
        numero_credencial: '', telefono: '', correo_electronico: '', df_id: '',
        dl_id: '', seccion_id: '', calle: '', num_ext: '', num_int: '',
        colonia: '', codigo_postal: '', cic: '', credencial_vigente: true,
        es_militante: false, autoriza_propaganda: false, tipo_propaganda: 'Ninguno',
        firma_capturada: false
      });
    } catch (err: any) {
      setError(err.message || 'Error al registrar RG');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"space-y-8 animate-fade-in-up\">
      <div className=\"flex flex-col md:flex-row md:items-center justify-between gap-4\">
        <div>
          <h3 className=\"text-2xl font-black text-surface-900 tracking-tight\">Padrón de Representantes Generales</h3>
          <p className=\"text-surface-500 font-medium\">Gestión y seguimiento de estructura de nivel 1</p>
        </div>
        <div className=\"flex gap-3\">
          <button className=\"btn-secondary\">
            <Download size={18} />
            Exportar
          </button>
          <button onClick={() => setShowForm(true)} className=\"btn-primary\">
            <Plus size={18} />
            Nuevo Registro
          </button>
        </div>
      </div>

      {showForm && (
        <div className=\"fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/60 backdrop-blur-sm p-4\">
          <div className=\"bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in\">
            <div className=\"p-8 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10\">
              <div>
                <h3 className=\"text-xl font-black text-surface-900\">Formulario de Registro RG</h3>
                <p className=\"text-xs font-bold text-surface-400 uppercase tracking-widest mt-1\">Información del Representante</p>
              </div>
              <button onClick={() => setShowForm(false)} className=\"btn-icon\">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className=\"p-8 space-y-10\">
              <div className=\"space-y-6\">
                <div className=\"flex items-center gap-2 pb-2 border-b border-surface-100\">
                  <Users size={18} className=\"text-inst-600\" />
                  <h4 className=\"text-sm font-black text-surface-800 uppercase tracking-wider\">Datos Personales</h4>
                </div>
                <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
                  <div>
                    <label className=\"input-label\">Nombre(s)</label>
                    <input type=\"text\" className=\"input-field\" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                  </div>
                  <div>
                    <label className=\"input-label\">Apellido Paterno</label>
                    <input type=\"text\" className=\"input-field\" value={formData.apellido_paterno} onChange={e => setFormData({...formData, apellido_paterno: e.target.value})} required />
                  </div>
                  <div>
                    <label className=\"input-label\">Apellido Materno</label>
                    <input type=\"text\" className=\"input-field\" value={formData.apellido_materno} onChange={e => setFormData({...formData, apellido_materno: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className=\"space-y-6\">
                <div className=\"flex items-center gap-2 pb-2 border-b border-surface-100\">
                  <MapPin size={18} className=\"text-inst-600\" />
                  <h4 className=\"text-sm font-black text-surface-800 uppercase tracking-wider\">Ubicación Electoral</h4>
                </div>
                <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
                  <div>
                    <label className=\"input-label\">Distrito Federal</label>
                    <select className=\"select-field\" value={formData.df_id} onChange={e => setFormData({...formData, df_id: e.target.value})} required>
                      <option value=\"\">Seleccionar...</option>
                      {distritosFederales.map((df: any) => <option key={df.id} value={df.id}>Distrito {df.df}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className=\"input-label\">Distrito Local</label>
                    <select className=\"select-field\" value={formData.dl_id} onChange={e => setFormData({...formData, dl_id: e.target.value})} required>
                      <option value=\"\">Seleccionar...</option>
                      {distritosLocales.map((dl: any) => <option key={dl.id} value={dl.id}>Distrito {dl.dl}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className=\"input-label\">Sección</label>
                    <input type=\"number\" className=\"input-field\" value={formData.seccion_id} onChange={e => setFormData({...formData, seccion_id: e.target.value})} required />
                  </div>
                </div>
              </div>

              <div className=\"flex justify-end gap-3 pt-6\">
                <button type=\"button\" onClick={() => setShowForm(false)} className=\"btn-secondary px-8\">Cancelar</button>
                <button type=\"submit\" disabled={loading} className=\"btn-primary px-10\">
                  {loading ? 'Procesando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {success && (
        <div className=\"p-4 bg-success-50 text-success-700 font-bold rounded-xl border border-success-100 flex items-center gap-3 animate-scale-in\">
          <CheckCircle2 size={20} />
          {success}
        </div>
      )}

      <div className=\"table-wrapper\">
        <table className=\"data-table\">
          <thead>
            <tr>
              <th>Nombre Completo</th>
              <th>Clave Elector</th>
              <th>Distrito</th>
              <th>Sección</th>
              <th>Contacto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rgs.map((rg: RG) => (
              <tr key={rg.id}>
                <td className=\"font-bold\">{rg.nombre} {rg.apellido_paterno} {rg.apellido_materno}</td>
                <td className=\"text-xs font-mono font-semibold\">{rg.clave_elector}</td>
                <td>
                  <div className=\"flex flex-col\">
                    <span className=\"text-xs\">F: {rg.df_id}</span>
                    <span className=\"text-xs\">L: {rg.dl_id}</span>
                  </div>
                </td>
                <td className=\"font-bold\">{rg.seccion_id}</td>
                <td>
                  <div className=\"flex flex-col\">
                    <span className=\"text-xs\">{rg.telefono}</span>
                    <span className=\"text-[10px] text-surface-400\">{rg.correo_electronico}</span>
                  </div>
                </td>
                <td>
                  <div className=\"flex gap-2\">
                    <button className=\"btn-icon\"><Eye size={16} /></button>
                    <button className=\"btn-icon\"><Trash2 size={16} className=\"text-danger-500\" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RCRegistration({ rcs, distritosFederales, distritosLocales, casillas, refreshData }: any) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    clave_elector: '',
    numero_credencial: '',
    telefono: '',
    correo_electronico: '',
    df_id: '',
    dl_id: '',
    seccion_id: '',
    casilla_id: '',
    calle: '',
    num_ext: '',
    num_int: '',
    colonia: '',
    codigo_postal: '',
    cic: '',
    credencial_vigente: true,
    es_militante: false,
    autoriza_propaganda: false,
    tipo_nombramiento: 'Propietario',
    tipo_propaganda: 'Ninguno',
    firma_capturada: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('rc')
        .insert([{
          ...formData,
          df_id: parseInt(formData.df_id),
          dl_id: parseInt(formData.dl_id),
          seccion_id: parseInt(formData.seccion_id),
          casilla_id: formData.casilla_id ? parseInt(formData.casilla_id) : null
        }]);

      if (insertError) throw insertError;

      setSuccess('Representante registrado exitosamente');
      setShowForm(false);
      refreshData();
    } catch (err: any) {
      setError(err.message || 'Error al registrar RC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"space-y-8 animate-fade-in-up\">
      <div className=\"flex items-center justify-between\">
        <div>
          <h3 className=\"text-2xl font-black text-surface-900 tracking-tight\">Registro de RC</h3>
          <p className=\"text-surface-500 font-medium\">Representantes de Casilla para cobertura total</p>
        </div>
        <button onClick={() => setShowForm(true)} className=\"btn-primary px-6\">
          <Plus size={18} />
          Nuevo RC
        </button>
      </div>

      {showForm && (
        <div className=\"fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/60 backdrop-blur-sm p-4\">
          <div className=\"bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in\">
            <div className=\"p-8 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10\">
              <h3 className=\"text-xl font-black text-surface-900\">Registrar Representante de Casilla</h3>
              <button onClick={() => setShowForm(false)} className=\"btn-icon\"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className=\"p-8 space-y-8\">
              <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
                <div>
                  <label className=\"input-label\">Nombre(s)</label>
                  <input type=\"text\" className=\"input-field\" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                </div>
                <div>
                  <label className=\"input-label\">Apellido Paterno</label>
                  <input type=\"text\" className=\"input-field\" value={formData.apellido_paterno} onChange={e => setFormData({...formData, apellido_paterno: e.target.value})} required />
                </div>
                <div>
                  <label className=\"input-label\">Apellido Materno</label>
                  <input type=\"text\" className=\"input-field\" value={formData.apellido_materno} onChange={e => setFormData({...formData, apellido_materno: e.target.value})} />
                </div>
                <div>
                  <label className=\"input-label\">Clave de Elector</label>
                  <input type=\"text\" className=\"input-field font-mono uppercase\" value={formData.clave_elector} onChange={e => setFormData({...formData, clave_elector: e.target.value})} required />
                </div>
                <div>
                  <label className=\"input-label\">Distrito Local</label>
                  <select className=\"select-field\" value={formData.dl_id} onChange={e => setFormData({...formData, dl_id: e.target.value})} required>
                    <option value=\"\">Seleccionar...</option>
                    {distritosLocales.map((dl: any) => <option key={dl.id} value={dl.id}>Distrito {dl.dl}</option>)}
                  </select>
                </div>
                <div>
                  <label className=\"input-label\">Casilla</label>
                  <select className=\"select-field\" value={formData.casilla_id} onChange={e => setFormData({...formData, casilla_id: e.target.value})} required>
                    <option value=\"\">Seleccionar...</option>
                    {casillas.map((c: any) => <option key={c.casilla_id} value={c.casilla_id}>{c.casilla}</option>)}
                  </select>
                </div>
              </div>
              <div className=\"flex justify-end gap-3\">
                <button type=\"button\" onClick={() => setShowForm(false)} className=\"btn-secondary px-6\">Cancelar</button>
                <button type=\"submit\" disabled={loading} className=\"btn-primary px-8\">{loading ? 'Guardando...' : 'Guardar RC'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className=\"table-wrapper\">
        <table className=\"data-table\">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Clave Elector</th>
              <th>Casilla</th>
              <th>Nombramiento</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rcs.map((rc: RC) => (
              <tr key={rc.id}>
                <td className=\"font-bold text-surface-800\">{rc.nombre} {rc.apellido_paterno}</td>
                <td className=\"text-xs font-mono\">{rc.clave_elector}</td>
                <td><span className=\"font-bold\">{rc.casilla_id}</span></td>
                <td>
                  <span className={`badge ${rc.tipo_nombramiento === 'Propietario' ? 'badge-info' : 'badge-neutral'}`}>
                    {rc.tipo_nombramiento}
                  </span>
                </td>
                <td>
                  <span className=\"badge badge-success\">Activo</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RutasManager({ rgs, distritosLocales, rutas, casillas, refreshData }: any) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchCasilla, setSearchCasilla] = useState('');
  const [formData, setFormData] = useState({
    nombre_ruta: '',
    dl_id: '',
    representante_general_id: '',
    casillas_asignada: [] as number[]
  });

  const filteredCasillas = useMemo(() => {
    return casillas.filter((c: any) => 
      c.casilla.toLowerCase().includes(searchCasilla.toLowerCase())
    ).slice(0, 50); // Limit to performance
  }, [casillas, searchCasilla]);

  const toggleCasilla = (id: number) => {
    setFormData(prev => ({
      ...prev,
      casillas_asignada: prev.casillas_asignada.includes(id)
        ? prev.casillas_asignada.filter(cid => cid !== id)
        : [...prev.casillas_asignada, id]
    }));
  };

  const handleSaveRuta = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('rutas')
        .insert([{
          ...formData,
          dl_id: parseInt(formData.dl_id),
          representante_general_id: parseInt(formData.representante_general_id),
          casillas_asignada: formData.casillas_asignada
        }]);
      if (error) throw error;
      setShowForm(false);
      refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=\"space-y-8 animate-fade-in-up\">
      <div className=\"flex items-center justify-between\">
        <div>
          <h3 className=\"text-2xl font-black text-surface-900 tracking-tight\">Planificación de Rutas</h3>
          <p className=\"text-surface-500 font-medium\">Organización logística por sección y casilla</p>
        </div>
        <button onClick={() => setShowForm(true)} className=\"btn-primary px-6\">
          <Plus size={18} />
          Crear Nueva Ruta
        </button>
      </div>

      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
        {rutas.map((ruta: Ruta) => (
          <div key={ruta.id} className=\"card p-6 flex flex-col\">
            <div className=\"flex items-start justify-between mb-4\">
              <div className=\"p-2.5 bg-warning-50 text-warning-600 rounded-xl\">
                <MapIcon size={22} />
              </div>
              <span className=\"badge badge-neutral\">{Array.isArray(ruta.casillas_asignada) ? ruta.casillas_asignada.length : 0} Casillas</span>
            </div>
            <h4 className=\"text-lg font-black text-surface-900 mb-1\">{ruta.nombre_ruta}</h4>
            <p className=\"text-xs font-bold text-surface-400 uppercase tracking-widest mb-6\">Distrito Local {ruta.dl_id}</p>
            
            <div className=\"mt-auto pt-4 border-t border-surface-100 flex items-center justify-between\">
              <div className=\"flex -space-x-2\">
                {[1, 2, 3].map(i => (
                  <div key={i} className=\"w-7 h-7 rounded-full bg-surface-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-surface-600\">
                    RC
                  </div>
                ))}
              </div>
              <button className=\"text-xs font-bold text-inst-600 hover:text-inst-700\">Ver Detalles</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className=\"fixed inset-0 z-[100] flex items-center justify-center bg-surface-950/60 backdrop-blur-sm p-4\">
          <div className=\"bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in\">
            <div className=\"p-8 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10\">
              <h3 className=\"text-xl font-black text-surface-900\">Diseño de Ruta Operativa</h3>
              <button onClick={() => setShowForm(false)} className=\"btn-icon\"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveRuta} className=\"p-8 space-y-8\">
              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6\">
                <div className=\"md:col-span-1\">
                  <label className=\"input-label\">Nombre de la Ruta</label>
                  <input 
                    type=\"text\" 
                    className=\"input-field\" 
                    placeholder=\"Ej: Ruta Zona Centro\" 
                    value={formData.nombre_ruta}
                    onChange={e => setFormData({...formData, nombre_ruta: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <label className=\"input-label\">Distrito Local</label>
                  <select 
                    className=\"select-field\"
                    value={formData.dl_id}
                    onChange={e => setFormData({...formData, dl_id: e.target.value})}
                    required
                  >
                    <option value=\"\">Seleccionar...</option>
                    {distritosLocales.map((dl: any) => <option key={dl.id} value={dl.id}>Distrito {dl.dl}</option>)}
                  </select>
                </div>
                <div>
                  <label className=\"input-label\">RG Responsable</label>
                  <select 
                    className=\"select-field\"
                    value={formData.representante_general_id}
                    onChange={e => setFormData({...formData, representante_general_id: e.target.value})}
                    required
                  >
                    <option value=\"\">Seleccionar...</option>
                    {rgs.map((rg: any) => <option key={rg.id} value={rg.id}>{rg.nombre} {rg.apellido_paterno}</option>)}
                  </select>
                </div>
              </div>

              <div className=\"space-y-4\">
                <div className=\"flex items-center justify-between pb-2 border-b border-surface-100\">
                  <label className=\"input-label mb-0\">Seleccionar Casillas</label>
                  <span className=\"text-xs font-bold text-inst-600\">{formData.casillas_asignada.length} Casillas seleccionadas</span>
                </div>
                
                {/* Search Bar for Casillas */}
                <div className=\"relative group\">
                  <div className=\"absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-surface-400 group-focus-within:text-inst-600 transition-colors\">
                    <Search size={18} />
                  </div>
                  <input
                    type=\"text\"
                    className=\"input-field pl-11 bg-surface-50 border-transparent focus:bg-white\"
                    placeholder=\"Buscar casilla por nombre o sección...\"
                    value={searchCasilla}
                    onChange={(e) => setSearchCasilla(e.target.value)}
                  />
                </div>

                <div className=\"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-72 overflow-y-auto p-4 bg-surface-50 rounded-xl\">
                  {filteredCasillas.map((casilla: any) => (
                    <button
                      key={casilla.casilla_id}
                      type=\"button\"
                      onClick={() => toggleCasilla(casilla.casilla_id)}
                      className={`p-3 text-xs font-bold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                        formData.casillas_asignada.includes(casilla.casilla_id)
                          ? 'border-inst-600 bg-inst-50 text-inst-700'
                          : 'border-white bg-white text-surface-600 hover:border-surface-200 shadow-sm'
                      }`}
                    >
                      {formData.casillas_asignada.includes(casilla.casilla_id) && <Check size={12} className=\"mb-1\" />}
                      <span className=\"text-center truncate w-full\">{casilla.casilla}</span>
                    </button>
                  ))}
                  {filteredCasillas.length === 0 && (
                    <div className=\"col-span-full py-10 text-center flex flex-col items-center gap-2 opacity-60\">
                      <Search size={32} />
                      <p className=\"text-sm font-bold\">No se encontraron casillas</p>
                    </div>
                  )}
                </div>
              </div>

              <div className=\"pt-6 border-t border-surface-100 flex justify-end gap-3\">
                <button type=\"button\" onClick={() => setShowForm(false)} className=\"btn-secondary px-10\">Cerrar</button>
                <button type=\"submit\" disabled={loading} className=\"btn-primary px-12\">
                  {loading ? 'Generando Ruta...' : 'Confirmar Ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Reportes({ rgs, rcs, rutas, distritosFederales, distritosLocales }: any) {
  const [reportType, setReportType] = useState<'operativo' | 'cobertura' | 'incidencias'>('operativo');
  const [filterRG, setFilterRG] = useState('');
  const [filterDF, setFilterDF] = useState('');
  const [filterDL, setFilterDL] = useState('');

  // Lógica de filtrado para Listados Operativos
  const filteredReportData = useMemo(() => {
    let base = [...rcs];
    
    // Unir con datos de casilla para obtener el nombre
    base = base.map(rc => {
      const ruta = rutas.find((r: any) => r.representante_general_id.toString() === filterRG);
      return { ...rc, _ruta: ruta };
    });

    if (filterRG) {
      // Filtrar por RG (a través de la ruta asignada)
      const rgRutas = rutas.filter((r: any) => r.representante_general_id?.toString() === filterRG);
      const rgCasillasIds = rgRutas.flatMap((r: any) => Array.isArray(r.casillas_asignada) ? r.casillas_asignada : []);
      base = base.filter(rc => rc.casilla_id && rgCasillasIds.includes(rc.casilla_id));
    }

    if (filterDF) {
      base = base.filter(rc => rc.df_id?.toString() === filterDF);
    }

    if (filterDL) {
      base = base.filter(rc => rc.dl_id?.toString() === filterDL);
    }

    // Ordenar por Casilla ID (o nombre de casilla si estuviera disponible)
    return base.sort((a, b) => (a.casilla_id || 0) - (b.casilla_id || 0));
  }, [rcs, rutas, filterRG, filterDF, filterDL]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className=\"space-y-8 animate-fade-in-up no-print\">
      <div className=\"flex items-center justify-between no-print\">
        <div>
          <h3 className=\"text-2xl font-black text-surface-900 tracking-tight\">Centro de Inteligencia y Reportes</h3>
          <p className=\"text-surface-500 font-medium\">Análisis cuantitativo y cualitativo de la estructura</p>
        </div>
        <button onClick={handlePrint} className=\"btn-primary px-6\">
          <Printer size={18} />
          Imprimir Reporte
        </button>
      </div>

      <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-8\">
        <div className=\"lg:col-span-1 space-y-6\">
          <div className=\"card p-6\">
            <h4 className=\"text-xs font-black text-surface-400 uppercase tracking-widest mb-6 border-b border-surface-100 pb-2\">Tipo de Reporte</h4>
            <div className=\"space-y-2\">
              <ReportTypeBtn active={reportType === 'operativo'} onClick={() => setReportType('operativo')} icon={<Users size={18} />} label=\"Listados Operativos\" />
              <ReportTypeBtn active={reportType === 'cobertura'} onClick={() => setReportType('cobertura')} icon={<Grid size={18} />} label=\"Mapa de Cobertura\" />
              <ReportTypeBtn active={reportType === 'incidencias'} onClick={() => setReportType('incidencias')} icon={<AlertCircle size={18} />} label=\"Reporte de Incidencias\" />
            </div>
          </div>

          <div className=\"card p-6\">
            <h4 className=\"text-xs font-black text-surface-400 uppercase tracking-widest mb-6 border-b border-surface-100 pb-2\">Filtros Avanzados</h4>
            <div className=\"space-y-4\">
              <div>
                <label className=\"input-label\">Por Representante General</label>
                <select className=\"select-field\" value={filterRG} onChange={e => setFilterRG(e.target.value)}>
                  <option value=\"\">Todos los RG</option>
                  {rgs.map((rg: any) => <option key={rg.id} value={rg.id}>{rg.nombre} {rg.apellido_paterno}</option>)}
                </select>
              </div>
              <div>
                <label className=\"input-label\">Por Distrito Federal</label>
                <select className=\"select-field\" value={filterDF} onChange={e => setFilterDF(e.target.value)}>
                  <option value=\"\">Nivel Estado</option>
                  {distritosFederales.map((df: any) => <option key={df.id} value={df.id}>Federal {df.df}</option>)}
                </select>
              </div>
              <div>
                <label className=\"input-label\">Por Distrito Local</label>
                <select className=\"select-field\" value={filterDL} onChange={e => setFilterDL(e.target.value)}>
                  <option value=\"\">Ver Todos</option>
                  {distritosLocales.map((dl: any) => <option key={dl.id} value={dl.id}>Local {dl.dl}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className=\"lg:col-span-3 card p-10 min-h-[800px] flex flex-col printable-area\">
          <div className=\"flex flex-col items-center mb-12 border-b-2 border-surface-900 pb-8\">
            <h2 className=\"text-3xl font-black text-surface-900\">ESTRUCTURA ELECTORAL 2026</h2>
            <p className=\"text-sm font-bold text-surface-500 uppercase tracking-widest mt-2\">Listado Operativo de Representantes de Casilla</p>
            <div className=\"mt-6 flex gap-8\">
              <div className=\"text-center px-6 py-2 bg-surface-50 rounded-lg\">
                <p className=\"text-[10px] font-bold text-surface-400 uppercase tracking-widest\">Fecha</p>
                <p className=\"text-sm font-black\">{new Date().toLocaleDateString()}</p>
              </div>
              <div className=\"text-center px-6 py-2 bg-surface-50 rounded-lg\">
                <p className=\"text-[10px] font-bold text-surface-400 uppercase tracking-widest\">Total Registros</p>
                <p className=\"text-sm font-black\">{filteredReportData.length}</p>
              </div>
            </div>
          </div>

          <table className=\"w-full border-collapse border border-surface-200\">
            <thead>
              <tr className=\"bg-surface-50\">
                <th className=\"border border-surface-200 p-3 text-[10px] font-bold text-left uppercase\">Casilla</th>
                <th className=\"border border-surface-200 p-3 text-[10px] font-bold text-left uppercase\">Nombre Representante</th>
                <th className=\"border border-surface-200 p-3 text-[10px] font-bold text-left uppercase\">Teléfono</th>
                <th className=\"border border-surface-200 p-3 text-[10px] font-bold text-left uppercase\">Distrito (F/L)</th>
                <th className=\"border border-surface-200 p-3 text-[10px] font-bold text-left uppercase\">Firma / Asist.</th>
              </tr>
            </thead>
            <tbody>
              {filteredReportData.map((rc: any) => (
                <tr key={rc.id} className=\"hover:bg-surface-50/50\">
                  <td className=\"border border-surface-200 p-3 font-black text-sm\">#{rc.casilla_id}</td>
                  <td className=\"border border-surface-200 p-3\">
                    <p className=\"font-bold text-sm\">{rc.apellido_paterno} {rc.apellido_materno}, {rc.nombre}</p>
                    <p className=\"text-[10px] font-mono text-surface-400\">{rc.clave_elector}</p>
                  </td>
                  <td className=\"border border-surface-200 p-3 text-sm font-semibold\">{rc.telefono || '---'}</td>
                  <td className=\"border border-surface-200 p-3 text-xs\">{rc.df_id} / {rc.dl_id}</td>
                  <td className=\"border border-surface-200 p-3\">
                    <div className=\"w-full h-8 border border-dashed border-surface-300 rounded\"></div>
                  </td>
                </tr>
              ))}
              {filteredReportData.length === 0 && (
                <tr>
                  <td colSpan={5} className=\"p-20 text-center opacity-40\">
                    <Search size={40} className=\"mx-auto mb-4\" />
                    <p className=\"text-lg font-black\">No se encontraron registros para los filtros aplicados</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className=\"mt-auto pt-16 grid grid-cols-2 gap-20 text-center print:pt-24\">
            <div className=\"space-y-2\">
              <div className=\"border-t-2 border-surface-900 mx-auto w-48\"></div>
              <p className=\"text-[10px] font-black uppercase tracking-widest\">Firma Responsable RG</p>
            </div>
            <div className=\"space-y-2\">
              <div className=\"border-t-2 border-surface-900 mx-auto w-48\"></div>
              <p className=\"text-[10px] font-black uppercase tracking-widest\">Sello de Recepción</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportTypeBtn({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        active 
          ? 'bg-inst-600 text-white shadow-lg shadow-inst-600/20' 
          : 'text-surface-500 hover:bg-surface-50 border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Configuracion() {
  return (
    <div className=\"max-w-4xl animate-fade-in-up\">
      <div className=\"card p-8 mb-8\">
        <div className=\"flex items-center gap-4 mb-8 pb-4 border-b border-surface-100\">
          <div className=\"p-3 bg-inst-50 text-inst-600 rounded-xl\"><Settings size={22} /></div>
          <div>
            <h3 className=\"text-xl font-black text-surface-900\">Ajustes del Sistema</h3>
            <p className=\"text-xs font-bold text-surface-400 uppercase tracking-widest\">Personalización Institucional</p>
          </div>
        </div>

        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-10\">
          <div className=\"space-y-6\">
            <h4 className=\"text-sm font-black text-surface-800 uppercase tracking-wider mb-4\">Visualización</h4>
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-bold text-surface-700\">Tema del Tablero</p>
                <p className=\"text-xs text-surface-400\">Alternar entre modo claro y oscuro</p>
              </div>
              <div className=\"w-12 h-6 bg-surface-200 rounded-full relative cursor-pointer\">
                <div className=\"absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm\"></div>
              </div>
            </div>
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-bold text-surface-700\">Animaciones Modernas</p>
                <p className=\"text-xs text-surface-400\">Efectos de transición suaves</p>
              </div>
              <div className=\"w-12 h-6 bg-success-500 rounded-full relative cursor-pointer\">
                <div className=\"absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm\"></div>
              </div>
            </div>
          </div>

          <div className=\"space-y-6\">
            <h4 className=\"text-sm font-black text-surface-800 uppercase tracking-wider mb-4\">Seguridad</h4>
            <button className=\"btn-secondary w-full justify-between\">
              Cambiar Contraseña
              <ChevronRight size={16} />
            </button>
            <button className=\"btn-secondary w-full justify-between\">
              Factores de Autenticación
              <span className=\"badge badge-info\">Inactivo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
