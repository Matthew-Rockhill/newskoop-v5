import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import Image from 'next/image'
import React, { forwardRef } from 'react'
import { TouchTarget } from './button'
import { Link } from './link'

const colors = [
  'bg-red-100 text-red-800',
  'bg-yellow-100 text-yellow-800',
  'bg-green-100 text-green-800',
  'bg-blue-100 text-blue-800',
  'bg-indigo-100 text-indigo-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
]

function getInitials(name: string) {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getColorFromString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

type AvatarProps = {
  src?: string | null
  square?: boolean
  name?: string
  initials?: string
  alt?: string
  className?: string
}

export function Avatar({
  src = null,
  square = false,
  name,
  initials: providedInitials,
  alt = '',
  className,
  ...props
}: AvatarProps & React.ComponentPropsWithoutRef<'span'>) {
  const initials = providedInitials || (name ? getInitials(name) : '')
  const colorClass = name ? getColorFromString(name) : colors[0]

  return (
    <span
      data-slot="avatar"
      {...props}
      className={clsx(
        className,
        // Basic layout
        'inline-grid shrink-0 place-items-center align-middle [--avatar-radius:20%] *:col-start-1 *:row-start-1',
        // Border radius
        square ? 'rounded-(--avatar-radius) *:rounded-(--avatar-radius)' : 'rounded-full *:rounded-full',
        // Add background color when showing initials
        !src && colorClass
      )}
    >
      {initials && !src && (
        <span
          className="text-sm font-medium uppercase select-none"
          aria-hidden={alt ? undefined : 'true'}
        >
          {initials}
        </span>
      )}
      {src && (
        <Image 
          className="size-full object-cover" 
          src={src} 
          alt={alt || name || 'Avatar'}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}
    </span>
  )
}

export const AvatarButton = forwardRef(function AvatarButton(
  {
    src,
    square = false,
    name,
    initials,
    alt,
    className,
    ...props
  }: AvatarProps &
    (Omit<Headless.ButtonProps, 'as' | 'className'> | Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>),
  ref: React.ForwardedRef<HTMLElement>
) {
  const classes = clsx(
    className,
    square ? 'rounded-[20%]' : 'rounded-full',
    'relative inline-grid focus:not-data-focus:outline-hidden data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-kelly-green'
  )

  return 'href' in props ? (
    <Link {...props} className={classes} ref={ref as React.ForwardedRef<HTMLAnchorElement>}>
      <TouchTarget>
        <Avatar src={src} square={square} name={name} initials={initials} alt={alt} />
      </TouchTarget>
    </Link>
  ) : (
    <Headless.Button {...props} className={classes} ref={ref}>
      <TouchTarget>
        <Avatar src={src} square={square} name={name} initials={initials} alt={alt} />
      </TouchTarget>
    </Headless.Button>
  )
})
