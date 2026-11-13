"use client";
/**
 * @name combobox
 * @category ui
 * @description A select with a search field: a button that shows the choice and opens a list that narrows as one types.
 * @when Choosing one value from a list too long to scan: a country, a city, a person, a product. Under about eight options use select (or radio-group, or segmented-control for two to five); for running actions rather than choosing a value use command; for several values use chip or checkboxes. Name the trigger with a Label (`htmlFor` its `id`) or `aria-label`. Each item's `value` is what is stored; what is typed is matched against the item's text.
 * @example
 * const CITIES = [{ value: "lis", label: "Lisbon" }, { value: "opo", label: "Porto" }];
 * const [city, setCity] = useState("");
 *
 * <Combobox value={city} onValueChange={setCity} name="city">
 *   <ComboboxTrigger aria-label="City" className="w-56">
 *     <ComboboxValue placeholder="Choose a city">{CITIES.find((item) => item.value === city)?.label}</ComboboxValue>
 *   </ComboboxTrigger>
 *   <ComboboxContent aria-label="Cities">
 *     <ComboboxInput placeholder="Search cities" />
 *     <ComboboxList>
 *       <ComboboxEmpty>No city found.</ComboboxEmpty>
 *       {CITIES.map((item) => (
 *         <ComboboxItem key={item.value} value={item.value}>{item.label}</ComboboxItem>
 *       ))}
 *     </ComboboxList>
 *   </ComboboxContent>
 * </Combobox>
 */
import { Check, ChevronsUpDown } from "lucide-react";
import { createContext, use, useId, type ComponentProps, type ReactNode } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { useControllableState } from "@/lib/use-controllable-state";

type ComboboxContextValue = {
  value: string;
  /** Chooses a value and closes the list. */
  choose: (value: string) => void;
  open: boolean;
  disabled: boolean;
  selectedLabel: string;
  /** The id of the floating panel, which the trigger says it controls. */
  contentId: string;
};

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useCombobox(part: string): ComboboxContextValue {
  const context = use(ComboboxContext);
  if (!context) throw new Error(`<${part}> must be used inside <Combobox>.`);
  return context;
}

export type ComboboxProps = {
  /** The chosen item's value, controlled. "" means nothing is chosen. */
  value?: string;
  /** The starting value when uncontrolled. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Whether the list is open, controlled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The field's name in a form: the value is submitted with it. */
  name?: string;
  disabled?: boolean;
  /** Choosing the chosen item again clears the choice. Default false: a choice stays until another is made. */
  clearable?: boolean;
  /** Read after the chosen item's text in the list ("Lisbon, selected"). Translate it with the interface. */
  selectedLabel?: string;
  children?: ReactNode;
};

/** Holds the value and whether the list is open; both work controlled or not. */
export function Combobox({ value, defaultValue = "", onValueChange, open, defaultOpen = false, onOpenChange, name, disabled = false, clearable = false, selectedLabel = "selected", children }: ComboboxProps) {
  const [current, setCurrent] = useControllableState({ value, defaultValue, onChange: onValueChange });
  const [isOpen, setIsOpen] = useControllableState({ value: open, defaultValue: defaultOpen, onChange: onOpenChange });
  const contentId = useId();

  const choose = (next: string): void => {
    setCurrent(next === current ? (clearable ? "" : current) : next);
    setIsOpen(false);
  };

  return (
    <ComboboxContext value={{ value: current, choose, open: isOpen, disabled, selectedLabel, contentId }}>
      <Popover open={isOpen} onOpenChange={(next) => setIsOpen(disabled ? false : next)}>
        {children}
      </Popover>
      {name ? <input type="hidden" name={name} value={current} disabled={disabled} /> : null}
    </ComboboxContext>
  );
}

export type ComboboxTriggerProps = ComponentProps<"button">;

/**
 * The button that shows the choice. It is a `combobox` that says whether its list is open and which element
 * it controls; Enter, Space or a press opens the list, and focus comes back here when the list closes.
 */
export function ComboboxTrigger({ className, children, type = "button", disabled, ...props }: ComboboxTriggerProps) {
  const context = useCombobox("ComboboxTrigger");
  return (
    <PopoverTrigger asChild>
      <button
        type={type}
        role="combobox"
        // Stated here, not left to the popover to add: a combobox must say whether it is open and what it controls.
        aria-expanded={context.open}
        aria-controls={context.open ? context.contentId : undefined}
        aria-haspopup="dialog"
        data-slot="combobox-trigger"
        data-placeholder={context.value === "" ? "" : undefined}
        disabled={disabled ?? context.disabled}
        className={cn(
          "inline-flex h-control w-full max-w-full min-w-0 items-center justify-between gap-2 rounded-control border border-input bg-background px-3 text-start text-sm text-foreground transition-[background-color,border-color] duration-instant ease-out hover:bg-accent disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive motion-reduce:transition-none",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronsUpDown aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </PopoverTrigger>
  );
}

export type ComboboxValueProps = Omit<ComponentProps<"span">, "children"> & {
  /** Shown while nothing is chosen. */
  placeholder?: ReactNode;
  /** The chosen item's text, or a function that is given the value and returns it (for an uncontrolled combobox). */
  children?: ReactNode | ((value: string) => ReactNode);
};

/** The chosen item's text inside the trigger (its children), or the placeholder while nothing is chosen. */
export function ComboboxValue({ className, placeholder, children, ...props }: ComboboxValueProps) {
  const { value } = useCombobox("ComboboxValue");
  const content = typeof children === "function" ? children(value) : children;
  const empty = value === "" || content === undefined || content === null;
  return (
    <span data-slot="combobox-value" className={cn("min-w-0 flex-1 truncate", empty && "text-muted-foreground", className)} {...props}>
      {empty ? placeholder : content}
    </span>
  );
}

export type ComboboxContentProps = ComponentProps<typeof PopoverContent> & {
  /** Props for the list engine inside: `filter`, `shouldFilter` (false when the options come filtered from a server), `loop`. */
  commandProps?: ComponentProps<typeof Command>;
};

/**
 * The floating panel: as wide as the trigger, never wider than the screen. It is a small dialog, so give it
 * a name with `aria-label` ("Cities"). The chosen item is the one marked when it opens.
 */
export function ComboboxContent({ className, children, align = "start", commandProps, "aria-label": ariaLabel = "Options", ...props }: ComboboxContentProps) {
  const { value, contentId } = useCombobox("ComboboxContent");
  return (
    <PopoverContent id={contentId} data-slot="combobox-content" align={align} aria-label={ariaLabel} className={cn("w-(--radix-popover-trigger-width) min-w-56 overflow-hidden p-0", className)} {...props}>
      <Command label={ariaLabel} defaultValue={value || undefined} {...commandProps}>
        {children}
      </Command>
    </PopoverContent>
  );
}

/** The search field. Focus stays here while the arrow keys move through the list. Give it a `placeholder`. */
export function ComboboxInput(props: ComponentProps<typeof CommandInput>) {
  return <CommandInput data-slot="combobox-input" {...props} />;
}

/** The list (a `listbox`). Its `label` names it for screen readers: translate it with the interface. */
export function ComboboxList({ className, ...props }: ComponentProps<typeof CommandList>) {
  return <CommandList data-slot="combobox-list" className={cn("max-h-64", className)} {...props} />;
}

/** Shown when nothing matches what was typed. */
export function ComboboxEmpty(props: ComponentProps<typeof CommandEmpty>) {
  return <CommandEmpty data-slot="combobox-empty" {...props} />;
}

/** A titled group of items: pass `heading`. */
export function ComboboxGroup(props: ComponentProps<typeof CommandGroup>) {
  return <CommandGroup data-slot="combobox-group" {...props} />;
}

export function ComboboxSeparator(props: ComponentProps<typeof CommandSeparator>) {
  return <CommandSeparator data-slot="combobox-separator" {...props} />;
}

export type ComboboxItemProps = Omit<ComponentProps<typeof CommandItem>, "value" | "onSelect"> & {
  /** What is stored when this item is chosen. */
  value: string;
  /** More words to match typing against, besides the item's own text (which is matched when it is a plain string). */
  keywords?: string[];
  /** Called with the value as the item is chosen, before the list closes. */
  onSelect?: (value: string) => void;
};

/** One option. The chosen one carries a tick, and ", selected" for screen readers. */
export function ComboboxItem({ className, value, keywords, onSelect, children, ...props }: ComboboxItemProps) {
  const context = useCombobox("ComboboxItem");
  const chosen = context.value === value;
  const words = [...(typeof children === "string" ? [children] : []), ...(keywords ?? [])];
  return (
    <CommandItem
      data-slot="combobox-item"
      data-chosen={chosen ? "" : undefined}
      value={value}
      keywords={words}
      onSelect={() => {
        onSelect?.(value);
        context.choose(value);
      }}
      className={cn(chosen && "font-medium", className)}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {chosen ? (
        <>
          <Check aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
          <span className="sr-only">, {context.selectedLabel}</span>
        </>
      ) : null}
    </CommandItem>
  );
}
