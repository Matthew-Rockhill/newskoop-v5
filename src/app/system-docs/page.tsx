'use client'

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SystemDocsContent } from '@/components/newsroom/system-docs/SystemDocsContent'

const ALLOWED_ROLES = ['EDITOR', 'ADMIN', 'SUPERADMIN']

export default function SystemDocsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.staffRole || !ALLOWED_ROLES.includes(session.user.staffRole)) {
      router.replace('/newsroom')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
      </div>
    )
  }

  if (!session?.user?.staffRole || !ALLOWED_ROLES.includes(session.user.staffRole)) {
    return null
  }

  return <SystemDocsContent />
}
