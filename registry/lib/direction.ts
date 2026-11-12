/**
 * @name direction
 * @category lib
 * @description Tells whether an element reads right to left, and turns "start" and "end" arrow keys and offsets the right way round for it.
 * @when A component handles Left and Right arrow keys, or moves something sideways with a transform, and must work in right-to-left pages. Layout itself needs no code: use logical utilities (ps-, ms-, start-, text-start). To set a direction for part of a page use direction-provider.
 * @example
 * function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
 *   const step = inlineStep(event.key, event.currentTarget); // +1 towards the end, -1 towards the start, 0 otherwise
 *   if (step !== 0) move(step);
 * }
 */

/** Whether the element's computed writing direction is right to left. Call it in a handler or an effect. */
export function isRtl(element: Element): boolean {
  return getComputedStyle(element).direction === "rtl";
}

/**
 * For "ArrowLeft" and "ArrowRight": +1 when the key points towards the end of the line for this element,
 * -1 when it points towards the start, 0 for any other key. In a right-to-left page ArrowLeft is +1.
 */
export function inlineStep(key: string, element: Element): -1 | 0 | 1 {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return 0;
  const towardsRight = key === "ArrowRight";
  return towardsRight !== isRtl(element) ? 1 : -1;
}

/** The sign that turns a distance "towards the end" into a horizontal pixel offset for this element: 1, or -1 right to left. */
export function inlineSign(element: Element): -1 | 1 {
  return isRtl(element) ? -1 : 1;
}
