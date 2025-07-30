'use client'

import { useSession } from 'next-auth/react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { SuperAdminLayout } from '@/components/layout/SuperAdminLayout'

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()

  // Use SuperAdminLayout for SUPERADMIN, AdminLayout for regular ADMIN
  if (session?.user?.staffRole === 'SUPERADMIN') {
    return <SuperAdminLayout>{children}</SuperAdminLayout>
  }

  return <AdminLayout>{children}</AdminLayout>
} 