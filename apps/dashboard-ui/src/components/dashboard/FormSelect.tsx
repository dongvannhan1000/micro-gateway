'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  accentColor?: 'blue' | 'violet';
  className?: string;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  error,
  helperText,
  required = false,
  accentColor = 'blue',
  className,
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get selected option label
  const selectedOption = options.find(opt => opt.value === value);

  // Dynamic accent color classes
  const accentColorClass = accentColor === 'violet' ? 'text-accent-violet' : 'text-accent-blue';
  const accentBgClass = accentColor === 'violet' ? 'bg-accent-violet/10' : 'bg-accent-blue/10';
  const accentRingClass = accentColor === 'violet' ? 'ring-accent-violet/30' : 'ring-accent-blue/30';
  const accentFocusRingClass = accentColor === 'violet' ? 'focus:border-accent-violet/50' : 'focus:border-accent-blue/50';
  const errorRingClass = error ? 'border-red-500/50 focus:border-red-500' : '';
  const errorTextClass = error ? 'text-red-500' : accentColorClass;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation for dropdown
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen || disabled) return;

      if (event.key === 'Escape') {
        setIsOpen(false);
        setFocusedIndex(-1);
        triggerRef.current?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        const enabledOptions = options.filter(opt => !opt.disabled);
        const currentEnabledIndex = enabledOptions.findIndex(opt => opt.value === options[focusedIndex]?.value);
        const nextIndex = (currentEnabledIndex + 1) % enabledOptions.length;
        const nextOption = enabledOptions[nextIndex];
        setFocusedIndex(options.findIndex(opt => opt.value === nextOption.value));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const enabledOptions = options.filter(opt => !opt.disabled);
        const currentEnabledIndex = enabledOptions.findIndex(opt => opt.value === options[focusedIndex]?.value);
        const prevIndex = (currentEnabledIndex - 1 + enabledOptions.length) % enabledOptions.length;
        const prevOption = enabledOptions[prevIndex];
        setFocusedIndex(options.findIndex(opt => opt.value === prevOption.value));
      } else if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault();
        const option = options[focusedIndex];
        if (!option.disabled) {
          handleSelect(option.value);
          setFocusedIndex(-1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, options, disabled]);

  // Reset focused index when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const displayValue = selectedOption?.label || placeholder;

  return (
    <div className={clsx('space-y-1.5', className)}>
      {label && (
        <label className="text-[10px] uppercase font-bold text-muted px-1 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div ref={containerRef} className="relative">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={clsx(
            "flex items-center justify-between gap-2 bg-glass-bg border rounded-xl px-3 py-2 text-sm w-full outline-none transition-all",
            "h-10",
            error ? "border-red-500/50" : "border-glass-border",
            error ? "focus:border-red-500" : accentFocusRingClass,
            isOpen ? `ring-2 ${error ? 'ring-red-500/30' : accentRingClass}` : "",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-glass-bg/80"
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${label}-error` : helperText ? `${label}-helper` : undefined}
        >
          <span className={clsx("truncate", !value && "text-muted")}>
            {displayValue}
          </span>
          <ChevronDown className={clsx("w-4 h-4 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <div
            className="absolute z-50 mt-1 w-full bg-background border border-glass-border rounded-xl shadow-lg animate-in slide-in-from-top-1 duration-150"
            role="listbox"
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted">
                  No options available
                </div>
              ) : (
                options.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    disabled={option.disabled}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-all duration-150",
                      "hover:bg-glass-bg/50",
                      option.value === value ? accentBgClass : "",
                      focusedIndex === index ? `bg-glass-bg/70 outline-none ring-1 ring-inset ${accentRingClass}` : "",
                      option.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    )}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {option.value === value && (
                      <Check className={clsx("w-4 h-4 flex-shrink-0", accentColorClass)} />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p id={`${label}-error`} className="text-xs text-red-500 flex items-center gap-1 px-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p id={`${label}-helper`} className="text-xs text-muted px-1">
          {helperText}
        </p>
      )}
    </div>
  );
}
