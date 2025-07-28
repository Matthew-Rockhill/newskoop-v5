import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';