import React from 'react';
import styles from './Input.module.css';

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  name,
  required = false,
  error,
  options = [], // Used for 'select' type
  className = '',
  rows = 4 // Used for 'textarea' type
}) => {
  const containerClass = `${styles.inputContainer} ${className}`;
  const inputClass = `${styles.field} ${error ? styles.fieldError : ''}`;

  return (
    <div className={containerClass}>
      {label && (
        <label className={styles.label}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
      )}
      
      {type === 'textarea' ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          rows={rows}
          className={inputClass}
        />
      ) : type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          className={inputClass}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt, idx) => (
            <option key={idx} value={typeof opt === 'object' ? opt.value : opt}>
              {typeof opt === 'object' ? opt.label : opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          className={inputClass}
        />
      )}
      
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default Input;
