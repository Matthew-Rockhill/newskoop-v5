import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { PlusIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      {Icon ? (
        <Icon className="mx-auto h-12 w-12 text-zinc-400" aria-hidden="true" />
      ) : (
        <div className="mx-auto h-12 w-12 text-zinc-400">
          {/* Default icon or placeholder */}
        </div>
      )}
      <Heading level={4} className="mt-3">
        {title}
      </Heading>
      <Text className="mt-2 text-zinc-500 dark:text-zinc-400">
        {description}
      </Text>
      {action && (
        <div className="mt-6">
          <Button
            onClick={action.onClick}
            color="primary"
            className="inline-flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" aria-hidden="true" />
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
} 