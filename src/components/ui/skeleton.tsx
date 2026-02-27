import { Card } from '@/components/ui/card';

interface CardSkeletonProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Number of placeholder lines per card */
  lines?: number;
  className?: string;
}

export function CardSkeleton({ count = 5, lines = 2, className }: CardSkeletonProps) {
  return (
    <div className={className ?? 'space-y-4'}>
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="p-6 animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3" />
          {lines >= 2 && <div className="h-3 bg-zinc-200 rounded w-1/2" />}
          {lines >= 3 && <div className="h-20 bg-zinc-200 rounded mt-4" />}
        </Card>
      ))}
    </div>
  );
}
