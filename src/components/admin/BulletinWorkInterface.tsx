'use client';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NewspaperIcon } from '@heroicons/react/24/outline';
import type { Task } from '@/types';

interface BulletinWorkInterfaceProps {
  task: Task;
}

export function BulletinWorkInterface({ task }: BulletinWorkInterfaceProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
          <NewspaperIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Heading level={3}>Bulletin Work Interface</Heading>
            <Badge color="blue">{task.type.replace('_', ' ')}</Badge>
          </div>
          <Text className="text-gray-600 mb-4">
            This is a placeholder for the bulletin creation and editing interface. 
            The bulletin workflow will include story curation, ordering, and publishing.
          </Text>
          
          {/* Placeholder content */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm text-gray-600">
              <strong>Bulletin Workflow:</strong><br />
              1. Curate stories from published content<br />
              2. Order stories by priority and relevance<br />
              3. Add bulletin-specific introductions<br />
              4. Review and approve final bulletin<br />
              5. Publish bulletin
            </Text>
          </div>

          <div className="mt-4">
            <Button href={`/admin/newsroom/tasks/${task.id}`} color="white">
              Back to Task Details
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
} 