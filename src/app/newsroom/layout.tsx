import { AdminLayout } from '@/components/layout/AdminLayout'

export default function NewsroomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayout>{children}</AdminLayout>
}