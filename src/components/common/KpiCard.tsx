import React, { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: ReactNode;
  variant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  changeText?: string;
  changeType?: 'positive' | 'negative' | 'neutral' | 'warning';
  note?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subValue,
  icon,
  variant = 'blue',
  changeText,
  changeType = 'neutral',
  note
}) => {
  const variantStyles = {
    blue: {
      bg: 'bg-blue-50/50',
      border: 'border-blue-100',
      iconBg: 'bg-blue-600',
      accentText: 'text-blue-700'
    },
    indigo: {
      bg: 'bg-indigo-50/50',
      border: 'border-indigo-100',
      iconBg: 'bg-indigo-600',
      accentText: 'text-indigo-700'
    },
    emerald: {
      bg: 'bg-emerald-50/50',
      border: 'border-emerald-100',
      iconBg: 'bg-emerald-600',
      accentText: 'text-emerald-700'
    },
    amber: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-600',
      accentText: 'text-amber-700'
    },
    rose: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-100',
      iconBg: 'bg-rose-600',
      accentText: 'text-rose-700'
    }
  };

  const changeStyles = {
    positive: 'text-emerald-700 bg-emerald-100/70',
    negative: 'text-rose-700 bg-rose-100/70',
    warning: 'text-amber-700 bg-amber-100/70',
    neutral: 'text-slate-600 bg-slate-100'
  };

  const style = variantStyles[variant];

  return (
    <div className={`relative overflow-hidden bg-white rounded-xl border ${style.border} p-5 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
            {subValue && (
              <span className="text-sm font-medium text-slate-500">{subValue}</span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${style.iconBg} text-white shadow-md shadow-slate-200`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        {changeText && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${changeStyles[changeType]}`}>
            {changeText}
          </span>
        )}
        {note && (
          <span className="text-slate-400 font-medium ml-auto">{note}</span>
        )}
      </div>
    </div>
  );
};
