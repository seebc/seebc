
import React from 'react';
import { 
  Users, 
  ClipboardList, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  MapPin 
} from 'lucide-react';

interface DashboardStatsProps {
  rgCount: number;
  rcCount: number;
  casillasCount: number;
  casillasSinCobertura: number;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({
  rgCount,
  rcCount,
  casillasCount,
  casillasSinCobertura
}) => {
  const coberturaPercentage = casillasCount > 0 
    ? Math.round((rcCount / casillasCount) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
      {/* RG Count */}
      <div className="card-metric hover-lift group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-inst-50 rounded-lg flex items-center justify-center group-hover:bg-inst-100 transition-colors">
            <Users className="w-5 h-5 text-inst-600" />
          </div>
          <span className="badge-info">
            <TrendingUp className="w-3 h-3" />+12%
          </span>
        </div>
        <p className="text-3xl font-bold text-surface-900">{rgCount}</p>
        <p className="text-xs text-surface-500 mt-1 font-medium">Representantes Generales</p>
      </div>

      {/* RC Count */}
      <div className="card-metric hover-lift group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center group-hover:bg-warning-100 transition-colors">
            <ClipboardList className="w-5 h-5 text-warning-600" />
          </div>
          <span className="badge-warning">Meta: 90%</span>
        </div>
        <p className="text-3xl font-bold text-surface-900">{rcCount}</p>
        <p className="text-xs text-surface-500 mt-1 font-medium">Representantes de Casilla</p>
      </div>

      {/* Cobertura */}
      <div className="card-metric hover-lift group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-success-50 rounded-lg flex items-center justify-center group-hover:bg-success-100 transition-colors">
            <CheckCircle className="w-5 h-5 text-success-600" />
          </div>
          <span className="badge-success">{coberturaPercentage}%</span>
        </div>
        <p className="text-3xl font-bold text-surface-900">{coberturaPercentage}%</p>
        <div className="w-full bg-surface-100 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-success-500 h-full rounded-full transition-all duration-1000" 
            style={{ width: `${coberturaPercentage}%` }}
          />
        </div>
        <p className="text-xs text-surface-500 mt-2 font-medium">Cobertura Total</p>
      </div>

      {/* Casillas sin Cobertura */}
      <div className="card-metric hover-lift group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-danger-50 rounded-lg flex items-center justify-center group-hover:bg-danger-100 transition-colors">
            <AlertTriangle className="w-5 h-5 text-danger-600" />
          </div>
          {casillasSinCobertura > 0 && (
            <span className="badge-danger">Crítico</span>
          )}
        </div>
        <p className="text-3xl font-bold text-surface-900">{casillasSinCobertura}</p>
        <p className="text-xs text-surface-500 mt-1 font-medium">Casillas sin Representante</p>
      </div>
    </div>
  );
};

export default DashboardStats;
