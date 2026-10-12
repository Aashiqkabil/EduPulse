import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'EduPulse encountered an unexpected error while retrieving student records.',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-rose-50/60 border border-rose-200 rounded-xl text-center min-h-[300px]">
      <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-rose-900">{title}</h3>
      <p className="mt-1 text-sm text-rose-700 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
        >
          <RotateCcw className="w-4 h-4" />
          Retry Operation
        </button>
      )}
    </div>
  );
};
