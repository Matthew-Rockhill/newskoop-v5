'use client';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MicrophoneIcon } from '@heroicons/react/24/outline';
import type { Task } from '@/types';

interface ShowWorkInterfaceProps {
  task: Task;
}

export function ShowWorkInterface({ task }: ShowWorkInterfaceProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
          <MicrophoneIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Heading level={3}>Show Work Interface</Heading>
            <Badge color="purple">{task.type.replace('_', ' ')}</Badge>
          </div>
          <Text className="text-gray-600 mb-4">
            This is a placeholder for the show creation and editing interface. 
            The show workflow will include script creation, recording, editing, and publishing.
          </Text>
          
          {/* Placeholder content */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm text-gray-600">
              <strong>Show Workflow:</strong><br />
              1. Create show script and outline<br />
              2. Record audio segments<br />
              3. Edit and master audio<br />
              4. Add show metadata and descriptions<br />
              5. Review and approve final show<br />
              6. Publish show
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