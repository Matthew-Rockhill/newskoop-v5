import clsx from 'clsx';

interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export function LoadingSpinner({ className, label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center py-12', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-kelly-green" />
      <span className="ml-3 text-zinc-500">{label}</span>
    </div>
  );
}
