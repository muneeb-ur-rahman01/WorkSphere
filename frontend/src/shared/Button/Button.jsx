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
      'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 focus:ring-indigo-200',

    secondary:
      'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 focus:ring-indigo-200',

    success:
      'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 focus:ring-indigo-200',

    danger:
      'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white hover:from-indigo-700 hover:via-indigo-600 hover:to-purple-700 focus:ring-indigo-200',

    outline:
      'border border-indigo-500 bg-white text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-200',
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