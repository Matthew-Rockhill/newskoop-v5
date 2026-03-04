'use client'

import { useState, useRef, useEffect } from 'react'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Badge } from '../ui/badge'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export default function AnnouncementBell() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const { data: announcementsData } = useQuery({
    queryKey: ['staff-announcements'],
    queryFn: async () => {
      const response = await fetch('/api/newsroom/announcements?perPage=10')
      if (!response.ok) throw new Error('Failed to fetch announcements')
      return response.json()
    },
    enabled: !!session,
  })

  const announcements = announcementsData?.announcements || []

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/newsroom/announcements/${id}/dismiss`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to dismiss announcement')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-announcements'] })
    },
  })

  const handleDismiss = async (id: string) => {
    try {
      await dismissMutation.mutateAsync(id)
    } catch (error) {
      console.error('Error dismissing announcement:', error)
    }
  }

  if (!session?.user) return null

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        aria-label={`Notifications${announcements.length > 0 ? `, ${announcements.length} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <BellIcon className="h-6 w-6" />
        {announcements.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {announcements.length > 9 ? '9+' : announcements.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-zinc-200 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">Notifications</p>
            {announcements.length > 0 && (
              <Badge color="red" className="text-xs">
                {announcements.length}
              </Badge>
            )}
          </div>

          {/* Announcement List */}
          <div className="max-h-96 overflow-y-auto" role="list" aria-live="polite">
            {announcements.length > 0 ? (
              announcements.map((announcement: any) => (
                <div
                  key={announcement.id}
                  role="listitem"
                  className="px-4 py-3 border-b border-zinc-50 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        announcement.priority === 'HIGH'
                          ? 'bg-red-500'
                          : announcement.priority === 'MEDIUM'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {announcement.title}
                      </p>
                      <p className="text-xs text-zinc-600 line-clamp-2 mt-0.5">
                        {announcement.message}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {timeAgo(announcement.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDismiss(announcement.id)
                      }}
                      disabled={dismissMutation.isPending}
                      className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors flex-shrink-0"
                      aria-label={`Dismiss ${announcement.title}`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <BellIcon className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No new announcements</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
