import React from "react";

interface FormFieldProps {
  label: string;
  id: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export default function FormField({
  label,
  id,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  disabled,
}: FormFieldProps) {
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="block text-xs font-light text-gray-500 mb-2 uppercase tracking-wider"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full px-4 py-3 rounded-2xl bg-white border ${
          error
            ? "border-red-400 focus:border-red-500"
            : "border-gray-200 focus:border-gray-300"
        } text-gray-700 placeholder-gray-400 focus:outline-none transition-all font-light shadow-sm focus:shadow-md`}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className="h-4 relative">
        {error && (
          <p className="absolute top-0.5 left-0 text-xs text-red-500 font-light animate-in fade-in duration-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

