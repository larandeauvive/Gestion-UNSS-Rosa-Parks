import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, colorClass = "bg-white text-slate-800 border-slate-200" }) => {
  return (
    <div className={`rounded-xl shadow-sm p-5 border flex items-center space-x-4 ${colorClass}`}>
      <div className="p-3 rounded-xl bg-slate-100/50 backdrop-blur-sm shadow-inner">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      </div>
    </div>
  );
};
