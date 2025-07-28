'use client';

import { StationList } from './StationList';
import { Container } from '@/components/ui/Container';

export function StationsContent() {
  return (
    <Container>
      <div className="py-8">
        <StationList />
      </div>
    </Container>
  );
} 