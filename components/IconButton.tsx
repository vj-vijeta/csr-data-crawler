
import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghostDanger';
  size?: 'sm' | 'md' | 'lg';
}

const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  tooltip, 
  className, 
  variant = 'ghost', 
  size = 'md', 
  disabled,
  ...props 
}) => {
  const isDarkMode = document.documentElement.classList.contains('dark');

  const baseClasses = `relative inline-flex items-center justify-center rounded-lg font-medium 
                       focus:outline-none focus:ring-2 
                       transition-all duration-150 ease-in-out group disabled:opacity-50 disabled:cursor-not-allowed`;
  
  const sizeStyles = {
    sm: 'p-1.5 text-sm',
    md: 'p-2 text-base',
    lg: 'p-2.5 text-lg',
  };

  const variantStyles = {
    primary: isDarkMode 
      ? 'bg-accent-600 hover:bg-accent-700 focus:ring-accent-500 text-white focus:ring-offset-neutral-900' 
      : 'bg-accent-500 hover:bg-accent-600 focus:ring-accent-600 text-white focus:ring-offset-white',
    secondary: isDarkMode 
      ? 'bg-neutral-700 hover:bg-neutral-600 focus:ring-accent-500 text-neutral-200 border border-neutral-600 focus:ring-offset-neutral-900' 
      : 'bg-neutral-100 hover:bg-neutral-200 focus:ring-accent-500 text-neutral-700 border border-neutral-300 focus:ring-offset-white',
    danger: isDarkMode 
      ? 'bg-danger-dark hover:bg-danger-dark/80 focus:ring-danger-base text-white focus:ring-offset-neutral-900' 
      : 'bg-danger-base hover:bg-danger-hover focus:ring-danger-base text-white focus:ring-offset-white',
    ghost: isDarkMode 
      ? 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100 focus:ring-neutral-500 focus:ring-offset-neutral-800' // Adjusted offset for ghost
      : 'text-neutral-500 hover:bg-neutral-200 hover:text-neutral-800 focus:ring-neutral-500 focus:ring-offset-white',
    ghostDanger: isDarkMode
      ? 'text-danger-light/80 hover:bg-danger-dark/30 hover:text-danger-light focus:ring-danger-base focus:ring-offset-neutral-800' // Adjusted offset
      : 'text-danger-dark/80 hover:bg-danger-base/20 hover:text-danger-dark focus:ring-danger-base focus:ring-offset-white'
  };

  const currentSizeClass = sizeStyles[size];
  const currentVariantClass = variantStyles[variant];

  return (
    <button
      type="button"
      className={`${baseClasses} ${currentVariantClass} ${currentSizeClass} ${className || ''}`}
      title={tooltip}
      disabled={disabled}
      aria-label={tooltip || 'icon button'}
      {...props}
    >
      {icon}
      {tooltip && <span className="sr-only">{tooltip}</span>}
    </button>
  );
};

export default IconButton;
