import React from 'react';
import { LayoutDashboard, Users, MapPin, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

export const EmptyState = ({ message, icon: Icon = Users }: { message: string, icon?: any }) => (
  <div className="flex flex-col items-center justify-center py-20 px-10 text-center space-y-6 opacity-30 group">
    <div className="bg-slate-100 p-8 rounded-full group-hover:scale-110 transition-transform duration-500">
      <Icon className="w-16 h-16 text-slate-400" />
    </div>
    <p className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">{message}</p>
  </div>
);

export const StatCard = ({ title, value, icon: Icon, colorClass, trend }: { title: string, value: string | number, icon: any, colorClass: string, trend?: string }) => (
  <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-slate-500/5 border border-slate-100 hover:border-slate-200 transition-all hover:-translate-y-2 group">
    <div className="flex justify-between items-center mb-10">
      <div className={cn("p-4 rounded-2xl group-hover:scale-110 transition-transform", colorClass.replace('text-', 'bg-').replace('600', '50'))}>
        <Icon className={cn("w-6 h-6", colorClass)} />
      </div>
      {trend && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full">{trend}</span>}
    </div>
    <div className="space-y-1">
      <p className="text-4xl font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="space-y-8 animate-pulse">
    <div className="h-10 bg-slate-200 w-1/4 rounded-xl" />
    <div className="bg-white border border-slate-100 shadow-xl">
      <div className="h-16 bg-slate-50 border-b border-slate-100" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-20 border-b border-slate-50 flex items-center px-8 gap-6">
          <div className="w-10 h-10 bg-slate-100 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 w-1/3 rounded-md" />
            <div className="h-3 bg-slate-50 w-1/4 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-12 animate-pulse">
    <div className="flex justify-between items-end">
      <div className="space-y-4">
        <div className="h-3 bg-slate-200 w-24" />
        <div className="h-12 bg-slate-300 w-96" />
      </div>
      <div className="h-14 bg-white border border-slate-100 w-64 rounded-2xl shadow-sm" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="h-[500px] bg-white border border-slate-100 rounded-[2.5rem] shadow-xl" />
      <div className="h-[500px] bg-white border border-slate-100 rounded-[2.5rem] shadow-xl" />
    </div>
  </div>
);
