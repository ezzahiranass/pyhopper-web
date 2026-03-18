"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  labelSide?: "left" | "right";
  tickCount?: number;
  valueLabel?: string;
};

export function Slider({
  className = "",
  labelSide = "right",
  tickCount = 11,
  valueLabel,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={`slider slider--ruler ${className}`.trim()}
      {...props}
    >
      <SliderPrimitive.Track className="slider__track">
        <div className="slider__rail" aria-hidden="true" />
        <div className="slider__ticks" aria-hidden="true">
          {Array.from({ length: tickCount }, (_, index) => (
            <span className="slider__tick" key={index} />
          ))}
        </div>
        <SliderPrimitive.Range className="slider__range" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="slider__thumb">
        {valueLabel ? (
          <span className={`slider__value slider__value--${labelSide}`}>{valueLabel}</span>
        ) : null}
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  );
}
