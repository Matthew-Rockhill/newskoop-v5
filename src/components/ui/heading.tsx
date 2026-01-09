import { twMerge } from 'tailwind-merge'
import clsx from 'clsx'

type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
>

// Level-based typography scale for consistent hierarchy
const headingStyles = {
  1: 'text-3xl/9 font-bold tracking-tight sm:text-2xl/8',     // Page titles
  2: 'text-2xl/8 font-semibold sm:text-xl/7',                 // Section titles
  3: 'text-xl/7 font-semibold sm:text-lg/6',                  // Subsection titles
  4: 'text-lg/6 font-semibold sm:text-base/6',                // Card titles
  5: 'text-base/6 font-medium sm:text-sm/5',                  // Minor headings
  6: 'text-sm/5 font-medium',                                  // Label-like headings
} as const

export function Heading({ className, level = 1, ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`

  return (
    <Element
      {...props}
      className={twMerge(clsx(headingStyles[level], 'text-zinc-950 dark:text-white', className))}
    />
  )
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
  const Element: `h${typeof level}` = `h${level}`

  return (
    <Element
      {...props}
      className={twMerge(clsx('text-base/7 font-semibold text-zinc-950 sm:text-sm/6 dark:text-white', className))}
    />
  )
}
