import React from 'react';
import styles from './Button.module.css';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', // primary, secondary, success, danger, outline
  size = 'medium', // small, medium, large
  disabled = false,
  fullWidth = false,
  className = ''
}) => {
  const buttonClass = `${styles.btn} ${styles[variant]} ${styles[size]} ${fullWidth ? styles.fullWidth : ''} ${className}`;
  
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
