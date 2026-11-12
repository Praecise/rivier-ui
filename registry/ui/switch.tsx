"use client";
/**
 * @name switch
 * @category ui
 * @description An on/off switch.
 * @when A setting that takes effect as soon as it is flipped. For a choice that is submitted with a form use checkbox; for a pressed/unpressed toolbar button use toggle.
 * @example
 * <Label><Switch defaultChecked /> Weekly summary</Label>
 * <Switch aria-label="Dark mode" checked={dark} onCheckedChange={setDark} />
 */
import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** The track is 44 by 24px; an invisible margin makes the touch target 40px tall. */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-input transition-[background-color,border-color,opacity] duration-instant ease-out after:absolute after:-inset-x-px after:-inset-y-2 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:bg-primary motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 translate-x-px rounded-full bg-background transition-transform duration-base ease-out data-[state=checked]:translate-x-[calc(100%+1px)] data-[state=checked]:bg-primary-foreground motion-reduce:transition-none rtl:-translate-x-px rtl:data-[state=checked]:-translate-x-[calc(100%+1px)]"
      />
    </SwitchPrimitive.Root>
  );
}
