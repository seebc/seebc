
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  UserCircle, 
  Users, 
  ClipboardList, 
  Route, 
  Search, 
  Vote, 
  BarChart2, 
  Settings, 
  LogOut, 
  ChevronDown, 
  X 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  handleTabClick: (id: string) => void;
  currentUser: any;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  handleTabClick, 
  currentUser, 
  onLogout, 
  isOpen, 
  onClose 
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    group_generales: true,
    group_casillas: true,
    group_rutas: true,
    group_casillas_cat: true
  });

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
        { id: 'listado_rg', label: 'Listado RG', Icon: Users },
      ]
    },
    { 
      id: 'group_casillas', 
      label: 'Rep. Casillas', 
      Icon: ClipboardList,
      isGroup: true,
      subItems: [
        { id: 'casilla', label: 'Nuevo RC', Icon: UserCircle },
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
    { 
      id: 'group_casillas_cat', 
      label: 'Casillas', 
      Icon: Vote,
      isGroup: true,
      subItems: [
        { id: 'casillas_form', label: 'Capturar', Icon: Search },
        { id: 'casillas_list', label: 'Consultar', Icon: Vote },
      ]
    },
    { 
      id: 'group_reportes', 
      label: 'Reportes', 
      Icon: BarChart2,
      isGroup: true,
      subItems: [
        { id: 'reporte_rutas', label: 'Listados Op.', Icon: BarChart2 },
      ]
    },
  ];

  if (currentUser?.rol === 'ADMIN') {
    navigationItems.push({
      id: 'group_admin',
      label: 'Configuración',
      Icon: Settings,
      isGroup: true,
      subItems: [
        { id: 'usuarios_mgmt', label: 'Usuarios', Icon: Users },
      ]
    } as any);
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-surface-900 text-white z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-surface-800">
            <div className="flex items-center justify-between lg:justify-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-inst-500 to-inst-700 rounded-xl flex items-center justify-center shadow-lg shadow-inst-500/20">
                  <span className="text-xl font-black text-white italic">S</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">SEEBC</h1>
                  <p className="text-[10px] font-bold text-inst-400 uppercase tracking-widest leading-none">Plataforma 2027</p>
                </div>
              </div>
              <button onClick={onClose} className="lg:hidden p-2 text-surface-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
            {navigationItems.map((item) => {
              if (item.isGroup) {
                const isOpen = openGroups[item.id];
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => toggleGroup(item.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-surface-400 uppercase tracking-wider hover:text-white transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <item.Icon className="w-4 h-4 text-surface-500 group-hover:text-inst-400 transition-colors" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-1 pl-4 border-l border-surface-800 ml-5 mt-1">
                        {item.subItems?.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              handleTabClick(sub.id);
                              onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                              activeTab === sub.id 
                                ? 'bg-inst-600 text-white shadow-lg shadow-inst-600/20 font-medium' 
                                : 'text-surface-400 hover:bg-surface-800 hover:text-white'
                            }`}
                          >
                            <sub.Icon className={`w-4 h-4 ${activeTab === sub.id ? 'text-white' : 'text-surface-500'}`} />
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleTabClick(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeTab === item.id 
                      ? 'bg-inst-600 text-white shadow-lg shadow-inst-600/20 font-medium' 
                      : 'text-surface-400 hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <item.Icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-surface-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-surface-800 bg-surface-900/50">
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-danger-500/10 hover:bg-danger-500 text-danger-500 hover:text-white rounded-xl transition-all group font-semibold text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
