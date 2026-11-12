/**
 * @name cn
 * @category lib
 * @description Joins class names and resolves Tailwind conflicts, so a class passed in wins over a component's own.
 * @when Every component uses it. Use it wherever classes are combined conditionally.
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", className)
 */
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme adds utilities Tailwind does not have by default. Naming them here lets a class passed in
// ("h-12", "rounded-none", "duration-500") replace a component's own ("h-control", "rounded-control").
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      h: [{ h: ["control", "control-sm", "control-lg"] }],
      rounded: [{ rounded: ["control", "surface"] }],
      duration: [{ duration: ["instant", "base", "slow"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
