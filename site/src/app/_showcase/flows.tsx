"use client";
// Showcase: steps, wizard, sortable list, combobox, skeletons that hold the final size.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup, ChipGroupItem } from "@/components/ui/chip";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { SortableHandle, SortableItem, SortableList, SortableMoveButtons } from "@/components/ui/sortable-list";
import { Step, Steps, StepsCount } from "@/components/ui/steps";
import { Wizard, WizardBack, WizardFooter, WizardHeader, WizardNext, WizardRail, WizardSkip, WizardStep, type WizardStepInfo } from "@/components/ui/wizard";
import { Demo } from "./demo";

const STOPS: Record<string, string> = { market: "Morning market", lunch: "Lunch", museum: "Museum", walk: "Harbour walk", concert: "Evening concert" };

const UNITS: Record<string, string> = { m: "Metres", km: "Kilometres", ft: "Feet", mi: "Miles" };

const CITIES = [
  { value: "ams", label: "Amsterdam" },
  { value: "ath", label: "Athens" },
  { value: "ber", label: "Berlin" },
  { value: "cph", label: "Copenhagen" },
  { value: "dub", label: "Dublin" },
  { value: "hel", label: "Helsinki" },
  { value: "lis", label: "Lisbon" },
  { value: "mad", label: "Madrid" },
  { value: "osl", label: "Oslo" },
  { value: "par", label: "Paris" },
  { value: "prg", label: "Prague" },
  { value: "rom", label: "Rome" },
  { value: "vie", label: "Vienna" },
];

function WizardDemo() {
  const [step, setStep] = useState("day");
  const [day, setDay] = useState("");
  const [people, setPeople] = useState(2);
  const [done, setDone] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Wizard
        steps={[
          { id: "day", label: "Day", canContinue: day !== "", blockedReason: "Choose a day to go on." },
          { id: "people", label: "People" },
          { id: "notes", label: "Notes", optional: true },
          { id: "review", label: "Review" },
        ]}
        step={step}
        onStepChange={(next) => {
          setStep(next);
          setDone(false);
        }}
        onComplete={() => setDone(true)}
      >
        <WizardHeader>Book a table</WizardHeader>
        <WizardRail navigable />
        <WizardStep id="day" title="Which day?">
          <ChipGroup type="single" value={day} onValueChange={setDay} aria-label="Day">
            <ChipGroupItem value="Friday">Friday</ChipGroupItem>
            <ChipGroupItem value="Saturday">Saturday</ChipGroupItem>
            <ChipGroupItem value="Sunday">Sunday</ChipGroupItem>
          </ChipGroup>
        </WizardStep>
        <WizardStep id="people" title="How many people?">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="wizard-people">People</Label>
            <NumberStepper id="wizard-people" value={people} onValueChange={setPeople} min={1} max={12} />
          </div>
          <p className="text-sm text-muted-foreground">Tables of more than eight are set in the back room, which is a little quieter and has its own door to the garden.</p>
        </WizardStep>
        <WizardStep id="notes" title="Anything we should know?">
          <p className="text-sm text-muted-foreground">Allergies, a high chair, a birthday. This step can be skipped.</p>
        </WizardStep>
        <WizardStep id="review" title="Check and confirm">
          <p className="text-sm" data-testid="wizard-summary">
            {day || "No day"}, {people} {people === 1 ? "person" : "people"}.
          </p>
        </WizardStep>
        <WizardFooter>
          <WizardBack>Back</WizardBack>
          <WizardSkip>Skip</WizardSkip>
          <WizardNext>{step === "review" ? "Confirm" : step === "day" ? "Choose people" : "Continue"}</WizardNext>
        </WizardFooter>
      </Wizard>
      <p className="text-sm text-muted-foreground">
        Step: <span data-testid="wizard-step">{step}</span>. Confirmed: <span data-testid="wizard-done">{done ? "yes" : "no"}</span>.
      </p>
    </div>
  );
}

const SERVER_STEPS: WizardStepInfo[] = [
  { id: "who", label: "Who" },
  { id: "extras", label: "Extras", optional: true },
  { id: "pay", label: "Pay" },
  { id: "done", label: "Done" },
];

/** A wizard whose every move is decided elsewhere: the page only shows the step it is told, after a wait. */
function ServerWizard() {
  const [step, setStep] = useState("who");
  const [pending, setPending] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  // The pretend server: it answers after a moment, and it, not the wizard, says which step is next.
  const ask = (what: string, next: string): void => {
    setAsked((all) => [...all, what]);
    setPending(true);
    window.setTimeout(() => {
      setStep(next);
      setPending(false);
    }, 500);
  };
  const after: Record<string, string> = { who: "extras", extras: "pay", pay: "done", done: "done" };
  const before: Record<string, string> = { who: "who", extras: "who", pay: "who", done: "pay" };

  return (
    <div className="flex flex-col gap-3">
      <Wizard
        steps={SERVER_STEPS.map((item) => (skipped.includes(item.id) ? { ...item, state: "skipped" as const } : item))}
        step={step}
        pending={pending}
        onNext={(current) => ask(`next:${current.id}`, after[current.id] ?? current.id)}
        onBack={(current) => ask(`back:${current.id}`, before[current.id] ?? current.id)}
        onSkip={(current) => {
          setSkipped((all) => [...all, current.id]);
          ask(`skip:${current.id}`, "pay");
        }}
      >
        <WizardHeader>Join the walk</WizardHeader>
        <WizardRail />
        <WizardStep id="who" title="Who is coming?">
          <p className="text-sm text-muted-foreground">The answer is sent away, and the reply says which step comes next.</p>
        </WizardStep>
        <WizardStep id="extras" title="Anything to add?">
          <p className="text-sm text-muted-foreground">This step can be skipped.</p>
        </WizardStep>
        <WizardStep id="pay" title="How will you pay?">
          <p className="text-sm text-muted-foreground">Back from here goes to the first step, because the reply says so.</p>
        </WizardStep>
        <WizardStep id="done" title="You are on the list">
          <p className="text-sm text-muted-foreground">The last step.</p>
        </WizardStep>
        <WizardFooter>
          <WizardBack>Back</WizardBack>
          <WizardSkip>Skip</WizardSkip>
          <WizardNext>Continue</WizardNext>
        </WizardFooter>
      </Wizard>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep("pay")}>
          The reply says: pay
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStep("who")}>
          The reply says: start again
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Step: <span data-testid="server-step">{step}</span>. Waiting: <span data-testid="server-pending">{pending ? "yes" : "no"}</span>. Asked: <span data-testid="server-asked">{asked.join(", ")}</span>
      </p>
    </div>
  );
}

export function Flows() {
  const [stops, setStops] = useState(Object.keys(STOPS));
  const [drops, setDrops] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Steps">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <StepsCount current={3} total={6} />
            <Steps aria-label="Progress, as segments">
              <Step state="done" onClick={() => undefined}>
                Dates
              </Step>
              <Step state="assumed" note="Two adults, from your last visit">
                People
              </Step>
              <Step state="current">Place</Step>
              <Step state="skipped">Extras</Step>
              <Step state="blocked" note="Payment is not connected yet">
                Payment
              </Step>
              <Step state="upcoming">Review</Step>
            </Steps>
          </div>
          <Steps variant="labelled" aria-label="Progress, with titles">
            <Step state="done" onClick={() => undefined}>
              Choose a file
            </Step>
            <Step state="assumed" note="Taken from the first row">
              Match the columns
            </Step>
            <Step state="current" description="About a minute">
              Check the rows
            </Step>
            <Step state="skipped">Add notes</Step>
            <Step state="upcoming">Import</Step>
          </Steps>
        </div>
      </Demo>

      <Demo title="Wizard">
        <WizardDemo />
      </Demo>

      <Demo title="Wizard: driven from outside">
        <ServerWizard />
      </Demo>

      <Demo title="Wizard: uncontrolled">
        <Wizard steps={[{ id: "one", label: "One" }, { id: "two", label: "Two" }]}>
          <WizardHeader>Two questions</WizardHeader>
          <WizardRail />
          <WizardStep id="one" title="The first question">
            <p className="text-sm text-muted-foreground">Nothing outside holds the step.</p>
          </WizardStep>
          <WizardStep id="two" title="The second question">
            <p className="text-sm text-muted-foreground">The wizard kept it.</p>
          </WizardStep>
          <WizardFooter>
            <WizardBack>Back</WizardBack>
            <WizardNext>Continue</WizardNext>
          </WizardFooter>
        </Wizard>
      </Demo>

      <Demo title="Sortable list">
        <div className="flex flex-col gap-3">
          <SortableList
            values={stops}
            onValuesChange={setStops}
            onDropped={(drop) => setDrops((all) => [...all, `${drop.value}:${drop.from}>${drop.to}=${drop.values.join("/")}`])}
            aria-label="Stops, in order"
          >
            {stops.map((id) => (
              <SortableItem key={id} value={id} label={STOPS[id] ?? id} disabled={id === "concert"}>
                <SortableHandle />
                <span className="min-w-0 flex-1 truncate">{STOPS[id]}</span>
                <SortableMoveButtons />
              </SortableItem>
            ))}
          </SortableList>
          <p className="text-sm text-muted-foreground">
            Order: <span data-testid="order">{stops.join(", ")}</span>
            <br />
            Let go: <span data-testid="dropped">{drops.map((drop) => drop.split("=")[0]).join(", ")}</span> (<span data-testid="dropped-count">{drops.length}</span>). Order then:{" "}
            <span data-testid="dropped-order">{drops.at(-1)?.split("=")[1] ?? ""}</span>
          </p>
        </div>
      </Demo>

      <Demo title="Sortable list: whole row, uncontrolled">
        <SortableList defaultValues={["one", "two", "three"]} aria-label="Priorities" data-testid="rows">
          {(order) =>
            order.map((id) => (
              <SortableItem key={id} value={id} label={`Priority ${id}`} dragBy="row">
                <span className="min-w-0 flex-1 truncate ps-2 capitalize">Priority {id}</span>
                <SortableMoveButtons />
              </SortableItem>
            ))
          }
        </SortableList>
      </Demo>

      <Demo title="Combobox">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">City (controlled)</Label>
            <Combobox value={city} onValueChange={setCity} name="city" clearable>
              <ComboboxTrigger id="city" className="sm:w-64">
                <ComboboxValue placeholder="Choose a city">{CITIES.find((item) => item.value === city)?.label}</ComboboxValue>
              </ComboboxTrigger>
              <ComboboxContent aria-label="Cities">
                <ComboboxInput placeholder="Search cities" />
                <ComboboxList label="Cities">
                  <ComboboxEmpty>No city found.</ComboboxEmpty>
                  {CITIES.map((item) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <p className="text-sm text-muted-foreground">
              Value: <span data-testid="city">{city || "none"}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit">Unit (uncontrolled, grouped)</Label>
            <Combobox defaultValue="km" name="unit">
              <ComboboxTrigger id="unit" className="sm:w-64">
                <ComboboxValue placeholder="Choose a unit">{(value) => UNITS[value]}</ComboboxValue>
              </ComboboxTrigger>
              <ComboboxContent aria-label="Units">
                <ComboboxInput placeholder="Search units" />
                <ComboboxList label="Units">
                  <ComboboxEmpty>No unit found.</ComboboxEmpty>
                  <ComboboxGroup heading="Metric">
                    <ComboboxItem value="m">Metres</ComboboxItem>
                    <ComboboxItem value="km">Kilometres</ComboboxItem>
                  </ComboboxGroup>
                  <ComboboxGroup heading="Imperial">
                    <ComboboxItem value="ft">Feet</ComboboxItem>
                    <ComboboxItem value="mi">Miles</ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>
      </Demo>

      <Demo title="Skeleton">
        <div className="flex flex-col gap-5">
          <Button variant="outline" size="sm" className="w-fit" onClick={() => setLoading((value) => !value)}>
            {loading ? "Finish loading" : "Load again"}
          </Button>
          <div data-testid="skeleton-region" aria-busy={loading} className="flex flex-col gap-4">
            <Skeleton loading={loading}>
              <div data-testid="skeleton-card" className="flex flex-col gap-2 rounded-surface border p-4">
                <p className="text-base font-medium">Harbour walk with a local guide</p>
                <p className="text-sm text-muted-foreground">Two hours, starting at the old customs house. Bring shoes you can walk in.</p>
                <Button size="sm" className="w-fit">
                  See times
                </Button>
              </div>
            </Skeleton>
            {loading ? <SkeletonText lines={3} /> : <p className="text-sm">Loaded: three lines of text would sit here once they arrive.</p>}
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <SkeletonText lines={2} className="flex-1" />
            </div>
          </div>
        </div>
      </Demo>
    </div>
  );
}
