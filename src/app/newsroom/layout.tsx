import { NewsroomLayout } from '@/components/layout/NewsroomLayout'

export default function NewsroomLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <NewsroomLayout>{children}</NewsroomLayout>
}