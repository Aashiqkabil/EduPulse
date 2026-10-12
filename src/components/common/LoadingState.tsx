import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading student records and analytics...',
  subMessage = 'Fetching synthetic benchmark dataset'
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200/80 shadow-sm min-h-[300px]">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
        <Loader2 className="w-5 h-5 text-indigo-600 absolute animate-pulse" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-slate-800">{message}</h4>
      <p className="mt-1 text-sm text-slate-500">{subMessage}</p>
    </div>
  );
};
