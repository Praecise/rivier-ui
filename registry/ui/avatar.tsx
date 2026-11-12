"use client";
/**
 * @name avatar
 * @category ui
 * @description A round picture of a person or a team, with initials shown until the image loads or when it fails, and a group that overlaps.
 * @when Showing who something belongs to. Always give AvatarFallback initials; give AvatarImage an alt (the name), or alt="" when the name is printed next to it.
 * @example
 * <Avatar size="lg">
 *   <AvatarImage src="/people/hana.jpg" alt="Hana Ito" />
 *   <AvatarFallback>HI</AvatarFallback>
 * </Avatar>
 * <AvatarGroup aria-label="Team">
 *   <Avatar><AvatarFallback>AK</AvatarFallback></Avatar>
 *   <Avatar><AvatarFallback>BL</AvatarFallback></Avatar>
 *   <Avatar><AvatarFallback>+3</AvatarFallback></Avatar>
 * </AvatarGroup>
 */
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const avatarVariants = cva("relative inline-flex shrink-0 overflow-hidden rounded-full bg-muted align-middle select-none", {
  variants: {
    size: {
      sm: "size-8 text-xs",
      md: "size-10 text-sm",
      lg: "size-12 text-base",
      xl: "size-16 text-lg",
    },
  },
  defaultVariants: { size: "md" },
});

export type AvatarProps = ComponentProps<typeof AvatarPrimitive.Root> & VariantProps<typeof avatarVariants>;

export function Avatar({ className, size, ...props }: AvatarProps) {
  return <AvatarPrimitive.Root data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props} />;
}

export function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full object-cover", className)} {...props} />;
}

/** Initials (one or two letters) or an icon. Shown while the image loads and when there is none. */
export function AvatarFallback({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center bg-muted font-medium text-foreground uppercase [&_svg]:size-1/2", className)}
      {...props}
    />
  );
}

/** Avatars in a row, each overlapping the one before it. Give it an aria-label that says what the group is. */
export function AvatarGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      role="group"
      className={cn(
        "flex items-center *:data-[slot=avatar]:border-2 *:data-[slot=avatar]:border-background [&>*+*]:-ms-2",
        className,
      )}
      {...props}
    />
  );
}
