
import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, size = 'md' }) => {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4" role="status" aria-live="polite">
      <div 
        className={`animate-spin rounded-full ${sizeClasses[size]} ${isDarkMode ? 'border-accent-light border-t-transparent' : 'border-accent-DEFAULT border-t-transparent'}`}
      >
        <span className="sr-only">Loading...</span>
      </div>
      {message && <p className={`mt-3 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
