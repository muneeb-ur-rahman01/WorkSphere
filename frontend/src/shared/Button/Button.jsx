
import React from 'react';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  className = '',
}) => {
  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-200',
    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-200',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-200',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-200',
    outline:
      'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus:ring-slate-200',
  };

  const sizes = {
    small: 'px-3 py-1.5 text-xs rounded-lg',
    medium: 'px-4 py-2.5 text-sm rounded-xl',
    large: 'px-5 py-3 text-base rounded-xl',
  };

  const buttonClass = [
    'inline-flex items-center justify-center gap-2',
    'font-semibold',
    'shadow-sm',
    'transition-all duration-200',
    'focus:outline-none focus:ring-4',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none',
    variants[variant] || variants.primary,
    sizes[size] || sizes.medium,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClass}
    >
      {children}
    </button>
  );
};

export default Button;
