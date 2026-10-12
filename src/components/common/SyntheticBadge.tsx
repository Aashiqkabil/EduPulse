import React from 'react';
import { Info } from 'lucide-react';

interface SyntheticBadgeProps {
  size?: 'sm' | 'md';
  showDetails?: boolean;
}

export const SyntheticBadge: React.FC<SyntheticBadgeProps> = ({ size = 'sm', showDetails = false }) => {
  if (showDetails) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span>
          <strong className="font-semibold">Synthetic Benchmark Data:</strong> Illustrative prototype dataset. Scores are unvalidated mock values, not clinical or AI predictions.
        </span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-100/80 text-amber-900 border border-amber-300/80 ${
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
      Synthetic Demo
    </span>
  );
};
