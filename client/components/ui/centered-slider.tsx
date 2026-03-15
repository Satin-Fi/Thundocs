import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const CenteredSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  const value = props.value || [0];
  const min = props.min ?? -100;
  const max = props.max ?? 100;
  const val = value[0];

  // Calculate percentage from center
  const range = max - min;
  const center = (min + max) / 2; // Usually 0 if min=-100, max=100
  
  // Convert value to percentage [0, 1] relative to track
  const percentage = (val - min) / range;
  const centerPercentage = (center - min) / range;
  
  // Calculate left and width for the fill bar
  // If val > center: starts at center, width is val - center
  // If val < center: starts at val, width is center - val
  const left = Math.min(percentage, centerPercentage) * 100;
  const width = Math.abs(percentage - centerPercentage) * 100;

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-secondary/50">
        <div 
            className="absolute h-full bg-sky-500" 
            style={{ left: `${left}%`, width: `${width}%` }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-white bg-sky-500 ring-offset-background transition-all hover:scale-125 active:scale-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]" />
    </SliderPrimitive.Root>
  )
})
CenteredSlider.displayName = SliderPrimitive.Root.displayName

export { CenteredSlider }
