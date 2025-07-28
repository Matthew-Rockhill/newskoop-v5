import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input, InputGroup } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type BadgeColor = "red" | "blue" | "cyan" | "fuchsia" | "green" | "indigo" | "lime" | "orange" | "pink" | "purple" | "teal" | "violet" | "yellow" | "amber" | "emerald" | "sky" | "rose" | "zinc";

interface MetadataItem {
  label: string;
  value: React.ReactNode;
  type?: 'badge' | 'text' | 'avatar' | 'date';
  color?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  metadata?: {
    sections?: {
      title: string;
      items: MetadataItem[];
    }[];
  };
  searchProps?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  action?: {
    label: string;
    onClick: () => void;
  };
  actions?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description,
  metadata,
  searchProps, 
  action,
  actions
}: PageHeaderProps) {
  return (
    <div className="border-b border-zinc-200 pb-5">
      {/* Main Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold leading-6 text-zinc-900 dark:text-white">
            {title}
          </h3>
          {description && (
            typeof description === 'string' ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            ) : (
              <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </div>
            )
          )}
        </div>
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
            {actions}
          </div>
        </div>
      </div>

      {/* Metadata Sections */}
      {metadata?.sections && metadata.sections.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-6">
          {metadata.sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="flex items-center gap-4">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.label}:
                  </span>
                  {item.type === 'badge' ? (
                    <Badge color={item.color as BadgeColor}>
                      {item.value}
                    </Badge>
                  ) : item.type === 'avatar' ? (
                    <div className="flex items-center space-x-2">
                      {item.value}
                    </div>
                  ) : item.type === 'date' ? (
                    <span className="text-sm text-zinc-900 dark:text-white font-medium">
                      {item.value}
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-900 dark:text-white">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 