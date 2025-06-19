import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';

interface PageHeaderProps {
  title: string;
  searchProps?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({ 
  title, 
  searchProps, 
  action 
}: PageHeaderProps) {
  return (
    <div className="border-b border-zinc-200 pb-5 sm:flex sm:items-center sm:justify-between">
      <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
        {title}
      </h3>
      <div className="mt-3 sm:ml-4 sm:mt-0">
        <div className="flex items-center gap-x-3">
          {searchProps && (
            <InputGroup>
              <MagnifyingGlassIcon 
                className="h-5 w-5 text-zinc-400" 
                data-slot="icon" 
              />
              <Input
                type="search"
                placeholder={searchProps.placeholder || "Search..."}
                value={searchProps.value}
                onChange={(e) => searchProps.onChange(e.target.value)}
              />
            </InputGroup>
          )}
          {action && (
            <Button
              onClick={action.onClick}
              color="primary"
              className="inline-flex items-center"
            >
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 