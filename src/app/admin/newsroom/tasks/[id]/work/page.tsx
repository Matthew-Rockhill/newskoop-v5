import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Container } from '@/components/ui/container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { TaskWorkInterface } from '@/components/admin/TaskWorkInterface';

interface TaskWorkPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskWorkPage({ params }: TaskWorkPageProps) {
  const { id } = await params;

  return (
    <Container className="space-y-6">
      <PageHeader>
        <div className="flex items-center gap-4">
          <Button href={`/admin/newsroom/tasks/${id}`} plain>
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Task
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Work on Task</h1>
            <p className="text-gray-600">Complete your assigned work</p>
          </div>
        </div>
      </PageHeader>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      }>
        <TaskWorkInterface taskId={id} />
      </Suspense>
    </Container>
  );
} 