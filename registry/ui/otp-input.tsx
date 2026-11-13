"use client";
/**
 * @name otp-input
 * @category ui
 * @description A one-time code typed into a row of single-character boxes: typing moves on, Backspace goes back, arrow keys move between boxes, a pasted or autofilled code fills them all, and the whole code is one value.
 * @when A short code sent by message or shown by an app: sign-in, confirming an email or a phone. For a password use password-input; for any other short text use input.
 * @example
 * <OtpInput aria-label="Code from the message" length={6} onComplete={(code) => verify(code)} name="code" />
 */
import { useId, useRef, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { inlineStep } from "@/lib/direction";

export type OtpInputProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** How many characters. Default 6. */
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once every box is filled. */
  onComplete?: (value: string) => void;
  /** "numeric" accepts digits only and opens the number pad; "alphanumeric" accepts letters too. */
  mode?: "numeric" | "alphanumeric";
  /** The name of the hidden field that carries the code in a form. */
  name?: string;
  disabled?: boolean;
  /** Marks every box invalid, for a code that was refused. */
  invalid?: boolean;
  /** The name of each box: "Character 2 of 6". */
  boxLabel?: (position: number, length: number) => string;
};

export function OtpInput({
  length = 6,
  value,
  defaultValue = "",
  onValueChange,
  onComplete,
  mode = "numeric",
  name,
  disabled,
  invalid,
  boxLabel = (position, total) => `Character ${position} of ${total}`,
  className,
  ...props
}: OtpInputProps) {
  const [code, setCode] = useControllableState<string>({ value, defaultValue, onChange: onValueChange });
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const id = useId();
  const allowed = mode === "numeric" ? /[0-9]/ : /[0-9a-zA-Z]/;
  const clean = (text: string): string =>
    [...text]
      .filter((ch) => allowed.test(ch))
      .join("")
      .slice(0, length);
  const chars = Array.from({ length }, (_, i) => code[i] ?? "");
  const focusBox = (index: number): void => {
    const box = boxes.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  };
  const write = (next: string): void => {
    setCode(next);
    if (next.length === length && !next.includes(" ")) onComplete?.(next);
  };
  const putAt = (index: number, text: string): void => {
    const typed = clean(text);
    if (!typed) return;
    const next = [...chars];
    [...typed].forEach((ch, offset) => {
      if (index + offset < length) next[index + offset] = ch;
    });
    write(next.join("").trimEnd());
    focusBox(index + typed.length);
  };
  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>): void => {
    const step = inlineStep(event.key, event.currentTarget);
    if (step !== 0) {
      event.preventDefault();
      focusBox(index + step);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      const next = [...chars];
      if (next[index]) next[index] = "";
      else if (index > 0) {
        next[index - 1] = "";
        focusBox(index - 1);
      }
      setCode(next.join("").trimEnd());
    } else if (event.key === "Home") {
      event.preventDefault();
      focusBox(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusBox(length - 1);
    }
  };

  return (
    <div data-slot="otp-input" role="group" className={cn("flex gap-2", className)} {...props}>
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          id={`${id}-${index}`}
          aria-label={boxLabel(index + 1, length)}
          aria-invalid={invalid || undefined}
          inputMode={mode === "numeric" ? "numeric" : "text"}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // Room for a whole pasted or autofilled code in any box.
          maxLength={length}
          value={char}
          disabled={disabled}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => putAt(index, event.target.value.replace(char, "") || event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            putAt(0, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => onKeyDown(index, event)}
          className="aspect-square h-auto w-full max-w-11 min-w-0 flex-1 rounded-control border border-input bg-background text-center text-lg font-medium tabular-nums aria-invalid:border-destructive disabled:opacity-50"
        />
      ))}
      {name ? <input type="hidden" name={name} value={code} /> : null}
    </div>
  );
}
