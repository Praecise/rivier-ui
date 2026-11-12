"use client";
/**
 * @name use-controllable-state
 * @category lib
 * @description State that a parent may control: it follows `value` when one is given and keeps its own from `defaultValue` when not, calling `onChange` either way.
 * @when Writing a component that should work both controlled (`value` + `onValueChange`) and uncontrolled (`defaultValue`), which every input-like component in the library does. Radix primitives already do this for their own state; use this for state the library adds on top.
 * @example
 * function Stepper({ value, defaultValue = 0, onValueChange }: { value?: number; defaultValue?: number; onValueChange?: (value: number) => void }) {
 *   const [count, setCount] = useControllableState({ value, defaultValue, onChange: onValueChange });
 *   return <button onClick={() => setCount(count + 1)}>{count}</button>;
 * }
 */
import { useState } from "react";

export type ControllableStateOptions<T> = {
  /** The controlled value. Leave undefined to let the component keep its own. */
  value?: T | undefined;
  /** The starting value when uncontrolled. */
  defaultValue: T;
  /** Called with the next value whenever it changes, controlled or not. */
  onChange?: ((value: T) => void) | undefined;
};

/**
 * Returns the current value and a setter. The setter takes a value or a function of the current value; it
 * calls `onChange` only when the value really changes, and updates its own state only when uncontrolled.
 * The mode is decided by whether `value` is undefined, so a controlled value of "nothing" is null, not undefined.
 */
export function useControllableState<T>({ value, defaultValue, onChange }: ControllableStateOptions<T>): [T, (next: T | ((current: T) => T)) => void] {
  const [own, setOwn] = useState<T>(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : own;

  const set = (next: T | ((current: T) => T)): void => {
    const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    if (Object.is(resolved, current)) return;
    if (!controlled) setOwn(resolved);
    onChange?.(resolved);
  };

  return [current, set];
}
