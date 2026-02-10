import React from 'react';

const Input = React.forwardRef(({ label, error, ...props }, ref) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="label-field">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`input-field ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
