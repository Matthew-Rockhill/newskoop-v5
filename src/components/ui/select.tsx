import { ChevronDownIcon } from '@heroicons/react/16/solid';
import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { label: string; value: string }[];
  error?: string;
  label?: string;
  helpText?: string;
  invalid?: boolean;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, error, label, helpText, className = '', invalid, children, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={props.id} className="block text-sm/6 font-medium leading-6 text-zinc-900">
            {label}
          </label>
        )}
        <div className="mt-2 grid grid-cols-1">
          <select
            ref={ref}
            {...props}
            className={`col-start-1 row-start-1 w-full appearance-none rounded-md border-0 py-1.5 pl-3 pr-10 text-zinc-900 shadow-sm ring-1 ring-inset ${
              invalid || error ? 'ring-red-300 focus:ring-red-500' : 'ring-zinc-300 focus:ring-kelly-green'
            } focus:ring-2 focus:ring-inset sm:text-sm/6 ${className}`}
          >
            {/* Render children if provided, otherwise use options */}
            {children ? (
              children
            ) : (
              options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-zinc-500 sm:size-4"
          />
        </div>
        {helpText && <p className="mt-3 text-sm/6 text-zinc-600">{helpText}</p>}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';