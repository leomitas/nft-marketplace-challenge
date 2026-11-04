import { cn } from 'cn'

// Shimmer: a translucent band sweeps across the block. Users who prefer reduced motion
// get a static placeholder instead.
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-dark/70',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
        'before:bg-linear-to-r before:from-transparent before:via-text-secondary/10 before:to-transparent',
        'motion-reduce:before:hidden',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
