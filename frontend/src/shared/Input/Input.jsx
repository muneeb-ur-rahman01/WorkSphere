import React from 'react';

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
  options = [],
  className = '',
  rows = 4,
}) => {
  const fieldClassName = `
    w-full
    rounded-xl
    border
    bg-white
    px-3.5
    py-2.5
    text-sm
    text-slate-800
    shadow-sm
    outline-none
    transition-all
    duration-200

    placeholder:text-slate-400

    hover:border-slate-400

    focus:border-blue-500
    focus:ring-4
    focus:ring-blue-500/10

    disabled:cursor-not-allowed
    disabled:bg-slate-50
    disabled:text-slate-400

    ${
      error
        ? 'border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-red-500/10'
        : 'border-slate-300'
    }
  `;

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-semibold text-slate-700"
        >
          {label}

          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Textarea */}
      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          rows={rows}
          className={`${fieldClassName} min-h-[110px] resize-y leading-6`}
        />
      ) : type === 'select' ? (
        /* Select */
        <select
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          className={`${fieldClassName} cursor-pointer`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options.map((opt, index) => {
            const isObject = typeof opt === 'object' && opt !== null;

            return (
              <option
                key={isObject ? opt.value : `${opt}-${index}`}
                value={isObject ? opt.value : opt}
              >
                {isObject ? opt.label : opt}
              </option>
            );
          })}
        </select>
      ) : (
        /* Input */
        <input
          id={name}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={onChange}
          onBlur={onBlur}
          required={required}
          className={fieldClassName}
        />
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-600">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
            aria-hidden="true"
          />
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
