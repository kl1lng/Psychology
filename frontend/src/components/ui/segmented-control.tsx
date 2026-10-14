'use client';

import React from 'react';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
  fullWidth = true,
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'py-1 px-3 text-xs',
    md: 'py-2 px-4 text-sm',
    lg: 'py-2.5 px-5 text-sm sm:text-base',
  };

  return (
    <div
      className={`inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80 ${
        fullWidth ? 'w-full flex' : ''
      } ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-in-out select-none ${
              sizeClasses[size]
            } ${
              isActive
                ? 'bg-white text-gray-900 font-semibold shadow-sm border border-gray-200/60'
                : 'bg-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {option.icon && (
              <span className={`shrink-0 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.badge && <span className="ml-1">{option.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
