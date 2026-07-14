import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, Clock, User, Monitor, Bot } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LoginLog {
  id: number;
  usuario_id: number | null;
  nombre_usuario: string | null;
  fuente: string | null;
  fecha_hora: string;
}

export default function LoginLogs() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('login_logs')
        .select('*')
        .order('fecha_hora', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Error al cargar los logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  };

  const FuenteBadge = ({ fuente }: { fuente: string | null }) => {
    const isWeb = !fuente || fuente === 'web';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isWeb
            ? 'bg-blue-100 text-blue-700'
            : 'bg-purple-100 text-purple-700'
        }`}
      >
        {isWeb ? (
          <><Monitor className="w-3 h-3" /> Web</>
        ) : (
          <><Bot className="w-3 h-3" /> Telegram</>
        )}
      </span>
    );
  };

  const webCount = logs.filter(l => !l.fuente || l.fuente === 'web').length;
  const telegramCount = logs.filter(l => l.fuente === 'telegram').length;

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">Logs de Acceso</h2>
          <p className="text-surface-500 text-sm mt-1">Historial de inicios de sesión — Últimos 100 registros</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 px-4 py-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center">
            <User className="w-5 h-5 text-surface-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-surface-900">{logs.length}</p>
            <p className="text-xs text-surface-400">Total accesos</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-700">{webCount}</p>
            <p className="text-xs text-surface-400">Desde Web</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Bot className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-700">{telegramCount}</p>
            <p className="text-xs text-surface-400">Desde Telegram</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-50 text-surface-500 border-b border-surface-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Usuario</th>
                <th className="px-6 py-4 font-semibold text-center">Fuente</th>
                <th className="px-6 py-4 font-semibold text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-surface-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-inst-500" />
                    Cargando registros...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-surface-400">
                    No hay registros de acceso todavía.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-inst-100 flex items-center justify-center text-inst-600 font-bold text-xs">
                          {(log.nombre_usuario || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-surface-900">{log.nombre_usuario || 'Desconocido'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <FuenteBadge fuente={log.fuente} />
                    </td>
                    <td className="px-6 py-4 text-right text-surface-500 font-medium whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        {formatDate(log.fecha_hora)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
