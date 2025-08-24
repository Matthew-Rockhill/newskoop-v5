'use client';

import { TranslationReviewForm } from '@/components/newsroom/TranslationReviewFormNew';
import { use } from 'react';

interface TranslationReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TranslationReviewPage({ params }: TranslationReviewPageProps) {
  const { id } = use(params);
  return <TranslationReviewForm translationId={id} />;
}