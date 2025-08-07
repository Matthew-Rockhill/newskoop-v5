"use client";

import { TranslationReviewForm } from '@/components/newsroom/TranslationReviewForm';

interface TranslationReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TranslationReviewPage({ params }: TranslationReviewPageProps) {
  const { id } = await params;
  return <TranslationReviewForm translationId={id} />;
}