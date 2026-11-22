"use client";
/**
 * @name password-input
 * @category ui
 * @description A password field with a button that shows and hides what was typed, a note when Caps Lock is on, and an optional list of the project's rules, each marked met or not met in words as the person types.
 * @when Signing in (current-password) or choosing a password (new-password, with `rules`). For a one-time code use otp-input; for other secrets that must never be shown, a plain input of type password.
 * @example
 * <PasswordInput
 *   aria-label="New password"
 *   autoComplete="new-password"
 *   rules={[
 *     { label: "At least 12 characters", test: (v) => v.length >= 12 },
 *     { label: "A number", test: (v) => /\d/.test(v) },
 *   ]}
 * />
 */
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";
import { inputVariants } from "@/components/ui/input";

export type PasswordRule = { label: string; test: (value: string) => boolean };

export type PasswordInputLabels = { show: string; hide: string; capsLock: string; met: string; notMet: string };

const LABELS: PasswordInputLabels = { show: "Show password", hide: "Hide password", capsLock: "Caps Lock is on", met: "done", notMet: "not yet" };

export type PasswordInputProps = Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "size"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Rules shown under the field, each marked as it is met. */
  rules?: readonly PasswordRule[];
  /** Shown: controlled. */
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  labels?: Partial<PasswordInputLabels>;
  invalid?: boolean;
};

export function PasswordInput({
  value,
  defaultValue = "",
  onValueChange,
  rules,
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  labels: given,
  invalid,
  className,
  onChange,
  onKeyDown,
  onKeyUp,
  disabled,
  "aria-describedby": describedBy,
  ...props
}: PasswordInputProps) {
  const labels = { ...LABELS, ...given };
  const [text, setText] = useControllableState<string>({ value, defaultValue, onChange: onValueChange });
  const [visible, setVisible] = useControllableState<boolean>({ value: visibleProp, defaultValue: defaultVisible, onChange: onVisibleChange });
  const [caps, setCaps] = useState(false);
  const rulesId = useId();
  const capsId = useId();
  const described = [describedBy, rules && rules.length > 0 ? rulesId : undefined, caps ? capsId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div data-slot="password-input" className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={text}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={described}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(event) => {
            setText(event.target.value);
            onChange?.(event);
          }}
          onKeyDown={(event) => {
            setCaps(event.getModifierState("CapsLock"));
            onKeyDown?.(event);
          }}
          onKeyUp={(event) => {
            setCaps(event.getModifierState("CapsLock"));
            onKeyUp?.(event);
          }}
          className={cn(inputVariants(), "pe-12")}
          {...props}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-label={visible ? labels.hide : labels.show}
          disabled={disabled}
          onClick={() => setVisible(!visible)}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-control text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
      {caps ? (
        <p id={capsId} data-slot="password-input-caps" className="text-sm">
          <span className="rounded-control bg-warning px-1.5 py-0.5 text-warning-foreground">{labels.capsLock}</span>
        </p>
      ) : null}
      {rules && rules.length > 0 ? (
        <ul id={rulesId} data-slot="password-input-rules" className="flex flex-col gap-1 text-sm">
          {rules.map((rule) => {
            const met = rule.test(text);
            return (
              <li key={rule.label} data-met={met ? "" : undefined} className={cn("flex items-center gap-2", met ? "text-foreground" : "text-muted-foreground")}>
                {met ? <Check aria-hidden="true" className="size-4 text-success" /> : <X aria-hidden="true" className="size-4" />}
                <span>
                  {rule.label}
                  <span className="sr-only">: {met ? labels.met : labels.notMet}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
