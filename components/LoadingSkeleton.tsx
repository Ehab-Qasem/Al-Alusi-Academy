import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'list' | 'dashboard' | 'exam' | 'certificate';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type = 'card', count = 3 }) => {
  const renderItem = (index: number) => {
    switch (type) {
      case 'dashboard':
        return (
          <div key={index} className="animate-pulse flex flex-col gap-4 w-full mb-8">
             <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded-md w-1/4 mb-4"></div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[1, 2, 3].map(i => (
                 <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 h-48 border border-gray-100 dark:border-slate-800">
                    <div className="h-10 w-10 bg-gray-200 dark:bg-slate-800 rounded-full mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
                 </div>
               ))}
             </div>
          </div>
        );
      case 'exam':
        return (
          <div key={index} className="animate-pulse bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-3xl mx-auto mt-10">
            <div className="flex justify-between items-center mb-8">
              <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/4"></div>
              <div className="h-10 w-24 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-6"></div>
            <div className="space-y-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="h-14 bg-gray-100 dark:bg-slate-700/50 rounded-2xl w-full"></div>
               ))}
            </div>
          </div>
        );
      case 'card':
      default:
        return (
          <div key={index} className="animate-pulse bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-4 h-64 flex flex-col justify-between">
            <div>
              <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-2xl mb-4 w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
            <div className="h-10 bg-gray-200 dark:bg-slate-800 rounded-xl w-full mt-4"></div>
          </div>
        );
    }
  };

  if (type === 'dashboard' || type === 'exam') return renderItem(0);

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(count, 4)} gap-6 w-full p-4`}>
      {Array.from({ length: count }).map((_, i) => renderItem(i))}
    </div>
  );
};
