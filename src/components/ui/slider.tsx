import * as React from 'react'
import { cn } from 'cn'
import { Slider as SliderPrimitive } from 'radix-ui'

// Styled after the Figma price slider: 4px rounded track, 15px primary thumbs with an ink ring.
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabels,
  formatValueText,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Accessible name for each thumb, e.g. ["Preço mínimo", "Preço máximo"]. */
  thumbLabels?: string[]
  /** Spoken value for each thumb, e.g. 119 -> "1.19 ETH". */
  formatValueText?: (value: number) => string
}) {
  const _values = React.useMemo(
    () => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]),
    [value, defaultValue, min, max],
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        'relative flex h-5 w-full touch-none items-center select-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-1 w-full grow overflow-hidden rounded-full bg-primary/30"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabels?.[index]}
          aria-valuetext={formatValueText?.(_values[index])}
          className="block size-[18px] shrink-0 rounded-full border-[3px] border-ink bg-primary transition-shadow hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
