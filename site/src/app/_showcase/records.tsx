"use client";
// Showcase: compare table, fact rows, consent, language switcher, price breakdown, countdown, undo line, timeline.

import { FileText, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CompareCell, CompareColumn, CompareColumnTitle, CompareGroup, CompareHeader, CompareRow, CompareTable } from "@/components/ui/compare-table";
import {
  ConsentAccept,
  ConsentContent,
  ConsentDecline,
  ConsentDescription,
  ConsentDetails,
  ConsentFooter,
  ConsentHeader,
  ConsentNotNow,
  ConsentPanel,
  ConsentScope,
  ConsentScopes,
  ConsentSheet,
  ConsentTitle,
  ConsentTrigger,
} from "@/components/ui/consent";
import { Countdown } from "@/components/ui/countdown";
import { FactAction, FactActions, FactEditTrigger, FactEditor, FactLabel, FactList, FactRemoved, FactRow, FactSource, FactUndo, FactValue, SourceChip } from "@/components/ui/fact-row";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher, LanguageSwitcherContent, LanguageSwitcherItem, LanguageSwitcherTrigger } from "@/components/ui/language-switcher";
import { NumberStepper } from "@/components/ui/number-stepper";
import { PriceBreakdown, PriceLine, PriceTotal } from "@/components/ui/price-breakdown";
import { Switch } from "@/components/ui/switch";
import { Timeline, TimelineContent, TimelineItem, TimelineTime, TimelineTitle } from "@/components/ui/timeline";
import { UndoLine, UndoLineAction, UndoLineDismiss, UndoLineMessage } from "@/components/ui/undo-line";
import { Demo } from "./demo";

const STOPS = ["Market walk", "Lunch", "Pottery class"];

export function Records() {
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const [diet, setDiet] = useState("Vegetarian");
  const [forgotten, setForgotten] = useState(false);
  const [airportEditing, setAirportEditing] = useState(false);
  const [airport, setAirport] = useState("Lisbon");
  const [decision, setDecision] = useState("nothing yet");
  const [panelGranted, setPanelGranted] = useState<string[]>([]);
  const [panelDecision, setPanelDecision] = useState("nothing yet");
  const [language, setLanguage] = useState("en");
  const [people, setPeople] = useState(2);
  const [holdUntil, setHoldUntil] = useState<number | null>(null);
  const [expired, setExpired] = useState(0);
  const [stops, setStops] = useState(STOPS);
  const [lastRemoved, setLastRemoved] = useState<{ name: string; index: number } | null>(null);
  // Removing a row, and undoing it, take away the button that had focus: it is handed to what replaces it.
  const undoDemo = useRef<HTMLDivElement>(null);
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (focusNext.current === null) return;
    undoDemo.current?.querySelector<HTMLElement>(focusNext.current)?.focus();
    focusNext.current = null;
  });

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Compare table" className="@3xl:col-span-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch id="only-differences" checked={onlyDifferences} onCheckedChange={setOnlyDifferences} />
            <Label htmlFor="only-differences">Only show differences</Label>
          </div>
          <CompareTable label="Compare the three plans" columns={3} onlyDifferences={onlyDifferences}>
            <CompareHeader corner="Plan">
              {["Starter", "Team", "Studio"].map((plan) => (
                <CompareColumn key={plan}>
                  <CompareColumnTitle>{plan}</CompareColumnTitle>
                  <Button size="sm" variant="outline" aria-label={`Choose ${plan}`}>
                    Choose
                  </Button>
                </CompareColumn>
              ))}
            </CompareHeader>
            <CompareGroup title="Basics">
              <CompareRow label="Price a month" hint="Billed yearly">
                <CompareCell value={12} best>
                  €12
                </CompareCell>
                <CompareCell value={29}>€29</CompareCell>
                <CompareCell value={59}>€59</CompareCell>
              </CompareRow>
              <CompareRow label="Projects">
                <CompareCell value={3}>3</CompareCell>
                <CompareCell value={20}>20</CompareCell>
                <CompareCell value={-1} best>
                  No limit
                </CompareCell>
              </CompareRow>
              <CompareRow label="Export">
                <CompareCell value="yes">Yes</CompareCell>
                <CompareCell value="yes">Yes</CompareCell>
                <CompareCell value="yes">Yes</CompareCell>
              </CompareRow>
            </CompareGroup>
            <CompareGroup title="Support">
              <CompareRow label="Help by email">
                <CompareCell value="2 days">Within 2 days</CompareCell>
                <CompareCell value="2 days">Within 2 days</CompareCell>
                <CompareCell value="2 days">Within 2 days</CompareCell>
              </CompareRow>
            </CompareGroup>
            <CompareGroup title="Team">
              <CompareRow label="Members">
                <CompareCell value={1}>1</CompareCell>
                <CompareCell value={10}>10</CompareCell>
                <CompareCell value={50}>50</CompareCell>
              </CompareRow>
            </CompareGroup>
          </CompareTable>
        </div>
      </Demo>

      <Demo title="Fact rows">
        <FactList aria-label="What is remembered about you">
          <FactRow removed={forgotten} removedMessage="Diet was forgotten" restoredMessage="Diet was restored">
            <FactLabel>Diet</FactLabel>
            <FactValue data-testid="diet">{diet}</FactValue>
            <FactSource>
              <SourceChip icon={<MessageSquare />}>You said this on 3 May</SourceChip>
            </FactSource>
            <FactActions aria-label="Diet">
              <FactEditTrigger>Edit</FactEditTrigger>
              <FactAction onClick={() => setDiet("No longer set")}>Not true any more</FactAction>
              <FactAction variant="destructive" onClick={() => setForgotten(true)}>
                Forget this
              </FactAction>
            </FactActions>
            <FactEditor aria-label="Diet" defaultValue={diet} onSave={setDiet} savedMessage="Diet was changed" />
            <FactRemoved>
              Diet was forgotten. <FactUndo onClick={() => setForgotten(false)}>Undo</FactUndo>
            </FactRemoved>
          </FactRow>
          <FactRow editing={airportEditing} onEditingChange={setAirportEditing}>
            <FactLabel>Home airport (editing is controlled)</FactLabel>
            <FactValue data-testid="airport">{airport}</FactValue>
            <FactSource>
              <SourceChip icon={<FileText />} asChild>
                <a href="#source">From your booking in June</a>
              </SourceChip>
              <SourceChip icon={<Sparkles />} asChild>
                <button type="button">Guessed from two trips</button>
              </SourceChip>
            </FactSource>
            <FactActions aria-label="Home airport">
              <FactEditTrigger>Edit</FactEditTrigger>
            </FactActions>
            <FactEditor aria-label="Home airport" defaultValue={airport} onSave={setAirport} />
          </FactRow>
        </FactList>
        <p className="mt-3 text-sm text-muted-foreground">
          Editing the airport: <span data-testid="airport-editing">{airportEditing ? "yes" : "no"}</span>
        </p>
      </Demo>

      <Demo title="Consent sheet">
        <div className="flex flex-col gap-4">
          <ConsentSheet
            onAccept={(granted) => setDecision(`allowed: ${granted.join(", ") || "only what is needed"}`)}
            onDecline={() => setDecision("declined")}
            onDismiss={() => setDecision("dismissed")}
          >
            <ConsentTrigger asChild>
              <Button variant="outline">Connect calendar</Button>
            </ConsentTrigger>
            <ConsentContent>
              <ConsentHeader>
                <ConsentTitle>Let the planner see your calendar?</ConsentTitle>
                <ConsentDescription>It is used to avoid times when you are busy. You can stop this in Settings at any time.</ConsentDescription>
              </ConsentHeader>
              <ConsentScopes>
                <ConsentScope value="busy" title="Busy times" description="When you are busy, without what the events are." required requiredLabel="Always needed" />
                <ConsentScope value="titles" title="Event names" description="So that suggestions can mention what you have planned." />
                <ConsentScope value="places" title="Event places" description="So that travel time between plans is counted." />
              </ConsentScopes>
              <ConsentDetails summary="How this is stored">Kept for 30 days, never sold, and deleted when you disconnect.</ConsentDetails>
              <ConsentFooter>
                <ConsentDecline>Do not allow</ConsentDecline>
                <ConsentAccept>Allow</ConsentAccept>
                <ConsentNotNow>Not now</ConsentNotNow>
              </ConsentFooter>
            </ConsentContent>
          </ConsentSheet>
          <p className="text-sm text-muted-foreground">
            Decision: <span data-testid="decision">{decision}</span>
          </p>
        </div>
      </Demo>

      <Demo title="Consent panel">
        <ConsentPanel
          aria-labelledby="panel-title"
          value={panelGranted}
          onValueChange={setPanelGranted}
          onAccept={(granted) => setPanelDecision(`allowed: ${granted.join(", ") || "only what is needed"}`)}
          onDecline={() => setPanelDecision("declined")}
        >
          <ConsentHeader>
            <ConsentTitle id="panel-title">Share your trip with the guide?</ConsentTitle>
            <ConsentDescription>The guide sees it until the day after the trip.</ConsentDescription>
          </ConsentHeader>
          <ConsentScopes>
            <ConsentScope value="name" title="Your first name" required />
            <ConsentScope value="needs" title="Access needs" description="So that the route can be adapted." />
          </ConsentScopes>
          <ConsentFooter>
            <ConsentDecline>Do not share</ConsentDecline>
            <ConsentAccept>Share</ConsentAccept>
          </ConsentFooter>
        </ConsentPanel>
        <p className="mt-3 text-sm text-muted-foreground">
          Switched on: <span data-testid="panel-granted">{panelGranted.join(", ") || "none"}</span>. Decision: <span data-testid="panel-decision">{panelDecision}</span>
        </p>
      </Demo>

      <Demo title="Language switcher">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher value={language} onValueChange={setLanguage} label="Language" displayLocale="en">
              <LanguageSwitcherTrigger />
              <LanguageSwitcherContent align="start">
                <LanguageSwitcherItem value="en" />
                <LanguageSwitcherItem value="fr" />
                <LanguageSwitcherItem value="ar" />
                <LanguageSwitcherItem value="ja" />
                <LanguageSwitcherItem value="dv" name="ދިވެހި" />
              </LanguageSwitcherContent>
            </LanguageSwitcher>
            <span data-testid="uncontrolled-language">
              <LanguageSwitcher defaultValue="pt-BR" label="Language" languages={["pt-BR", "es", "de"]} />
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Chosen: <span data-testid="language">{language}</span>
          </p>
        </div>
      </Demo>

      <Demo title="Price breakdown and countdown">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="people">People</Label>
            <NumberStepper id="people" value={people} onValueChange={setPeople} min={1} max={8} />
          </div>
          <PriceBreakdown currency="EUR" locale="en-IE" announceTotal={(total) => `Total is now ${total} for ${people}`}>
            <PriceLine label={`${people} × day ticket`} note="€46.00 each" amount={people * 46} />
            <PriceLine label="Service fee" amount={6} />
            <PriceLine label="Early booking" amount={-10} discount />
            <PriceLine label="Audio guide">Included</PriceLine>
            <PriceTotal label="Total" note="Taxes included" amount={people * 46 - 4} />
          </PriceBreakdown>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setHoldUntil(Date.now() + 63_000)}>
              Hold for 63 seconds
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHoldUntil(Date.now() + 3_000)}>
              Hold for 3 seconds
            </Button>
          </div>
          <p className="text-sm">
            The price is held for{" "}
            {holdUntil === null ? (
              <span data-testid="no-hold">no time yet</span>
            ) : (
              <Countdown
                to={holdUntil}
                locale="en"
                thresholds={[60]}
                announceAt={(_, left) => `${left} left at this price`}
                onExpire={() => setExpired((count) => count + 1)}
                expiredLabel="no longer: the hold has ended"
                className="font-medium"
              />
            )}
            . Ended <span data-testid="expired">{expired}</span> times.
          </p>
        </div>
      </Demo>

      <Demo title="Undo line">
        <div ref={undoDemo} className="flex flex-col gap-3">
          <ul aria-label="Saturday" className="flex flex-col divide-y divide-border rounded-surface border">
            {stops.map((stop, index) => (
              <li key={stop} className="flex items-center justify-between gap-3 py-1.5 ps-4 pe-1.5 text-sm">
                {stop}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${stop}`}
                  onClick={() => {
                    setStops((current) => current.filter((item) => item !== stop));
                    setLastRemoved({ name: stop, index });
                    focusNext.current = "[data-slot=undo-line-action]";
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {lastRemoved ? (
            <UndoLine>
              <UndoLineMessage>{lastRemoved.name} was removed from Saturday.</UndoLineMessage>
              <UndoLineAction
                onClick={() => {
                  setStops((current) => [...current.slice(0, lastRemoved.index), lastRemoved.name, ...current.slice(lastRemoved.index)]);
                  setLastRemoved(null);
                  focusNext.current = `[aria-label="Remove ${lastRemoved.name}"]`;
                }}
              >
                Undo
              </UndoLineAction>
              <UndoLineDismiss aria-label="Dismiss" onClick={() => setLastRemoved(null)} />
            </UndoLine>
          ) : null}
        </div>
      </Demo>

      <Demo title="Timeline">
        <Timeline aria-label="Order 1042">
          <TimelineItem state="done">
            <TimelineTime dateTime="2026-03-12T09:30">12 March, 09:30</TimelineTime>
            <TimelineTitle>Order placed</TimelineTitle>
          </TimelineItem>
          <TimelineItem state="done">
            <TimelineTime dateTime="2026-03-13T16:05">13 March, 16:05</TimelineTime>
            <TimelineTitle>Packed</TimelineTitle>
            <TimelineContent>Two parcels.</TimelineContent>
          </TimelineItem>
          <TimelineItem state="current">
            <TimelineTitle>On its way</TimelineTitle>
            <TimelineContent>With the carrier since this morning.</TimelineContent>
          </TimelineItem>
          <TimelineItem>
            <TimelineTitle>Delivered</TimelineTitle>
            <TimelineContent>Expected on 15 March.</TimelineContent>
          </TimelineItem>
        </Timeline>
      </Demo>
    </div>
  );
}
