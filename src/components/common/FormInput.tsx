import React, { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { Mail, Lock, User, BookOpen, CreditCard } from 'lucide-react';

// Define props for standard input elements
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  as?: 'input';
}

// Define props for select elements
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select';
  children: ReactNode; // Select requires children for its options
}

// Use a union type for all possible props
type FormInputProps = {
  label: string;
  error?: string;
  icon?: string;
} & (InputProps | SelectProps);

const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  className = '',
  id,
  icon,
  ...props
}) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  
  const getIcon = () => {
    switch (icon) {
      case 'mail':
        return <Mail size={20} />;
      case 'lock':
        return <Lock size={20} />;
      case 'user':
        return <User size={20} />;
      case 'book':
        return <BookOpen size={20} />;
      case 'id-card':
        return <CreditCard size={20} />;
      default:
        return null;
    }
  };

  const commonClasses = `
    w-full rounded-md border-gray-300 shadow-sm
    hover:border-indigo-600 focus:border-blue-500 focus:ring-blue-500
    ${icon ? 'pl-10' : 'pl-3'}
    ${error ? 'border-red-500' : 'border-gray-300'}
    ${className}
  `;

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            {getIcon()}
          </div>
        )}
        {props.as === 'select' ? (
          <select
            id={inputId}
            className={commonClasses}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            {...(props as SelectProps)}
          >
            {props.children}
          </select>
        ) : (
          <input
            id={inputId}
            className={commonClasses}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            {...(props as InputProps)}
          />
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormInput;