"use client";
// Showcase: calendar, date picker, slot picker, time picker. "Today" is fixed so the page reads the same every day.

import { useState } from "react";
import { Calendar, CalendarMonths, CalendarNext, CalendarPrevious, type CalendarRange } from "@/components/ui/calendar";
import { DatePicker, DatePickerCalendar, DatePickerTrigger, DateRangePicker } from "@/components/ui/date-picker";
import { SlotPicker, SlotPickerEmpty, SlotPickerGroup, SlotPickerItem } from "@/components/ui/slot-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Demo } from "./demo";

const TODAY = "2026-11-12";
const BUSY = new Set(["2026-11-17", "2026-11-18"]);

/** Sundays are closed; one day is simply not offered. */
function unavailable(day: string): boolean | string {
  if (new Date(`${day}T00:00:00Z`).getUTCDay() === 0) return "closed";
  return day === "2026-11-20";
}

export function Dates() {
  const [day, setDay] = useState<string | null>("2026-11-14");
  const [range, setRange] = useState<CalendarRange>({ start: null, end: null });
  const [days, setDays] = useState<string[]>(["2026-11-03", "2026-11-05"]);
  const [stay, setStay] = useState<CalendarRange>({ start: null, end: null });
  const [slot, setSlot] = useState("10:00");
  const [time, setTime] = useState<string | null>("09:30");
  const [afternoon, setAfternoon] = useState<string | null>("09:30");

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Calendar: one day">
        <div className="flex flex-col gap-3">
          <Calendar
            locale="en-GB"
            today={TODAY}
            value={day}
            onValueChange={setDay}
            min="2026-11-03"
            disabled={unavailable}
            marks={(date) => (BUSY.has(date) ? "busy" : undefined)}
            className="rounded-surface border"
          />
          <p className="text-sm text-muted-foreground">
            Chosen: <span data-testid="day">{day ?? "none"}</span>. Sundays are closed; a dot marks a busy day.
          </p>
        </div>
      </Demo>

      <Demo title="Calendar: several days, another language">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <Calendar mode="multiple" locale="en-US" today={TODAY} value={days} onValueChange={setDays} defaultMonth="2026-11" className="rounded-surface border">
              <CalendarPrevious />
              <CalendarNext />
              <CalendarMonths />
              <p className="px-1 pt-2 text-xs text-muted-foreground">Its own layout: this line is a part added under the grid.</p>
            </Calendar>
            <p className="text-sm text-muted-foreground">
              Chosen: <span data-testid="days">{days.join(", ") || "none"}</span>
            </p>
          </div>
          <div dir="rtl" lang="ar" data-testid="arabic">
            <Calendar
              locale="ar-EG"
              today={TODAY}
              defaultValue="2026-11-14"
              labels={{ previousMonth: "الشهر السابق", nextMonth: "الشهر التالي", today: "اليوم", selected: "محدد" }}
              className="rounded-surface border"
            />
          </div>
        </div>
      </Demo>

      <Demo title="Calendar: a range" className="@3xl:col-span-2">
        <div className="flex flex-col gap-3">
          <Calendar mode="range" locale="en-GB" today={TODAY} value={range} onValueChange={setRange} defaultMonth="2026-11" numberOfMonths={2} className="rounded-surface border" />
          <p className="text-sm text-muted-foreground">
            From <span data-testid="range-start">{range.start ?? "none"}</span> to <span data-testid="range-end">{range.end ?? "none"}</span>. Two months where there is room.
          </p>
        </div>
      </Demo>

      <Demo title="Date picker">
        <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
          <div className="flex flex-col gap-2">
            <p id="date-label" className="text-sm font-medium">
              Date
            </p>
            <DatePicker defaultValue="2026-11-14" name="date" locale="en-GB">
              <DatePickerTrigger aria-labelledby="date-label" className="w-56" />
              <DatePickerCalendar today={TODAY} />
            </DatePicker>
          </div>
          <div className="flex flex-col gap-2">
            <p id="stay-label" className="text-sm font-medium">
              Stay (a range, controlled)
            </p>
            <DateRangePicker value={stay} onValueChange={setStay} startName="from" endName="to" locale="en-GB">
              <DatePickerTrigger aria-labelledby="stay-label" placeholder="Arrival – departure" className="w-72" />
              <DatePickerCalendar today={TODAY} defaultMonth="2026-11" numberOfMonths={2} />
            </DateRangePicker>
            <p className="text-sm text-muted-foreground">
              Stay: <span data-testid="stay">{stay.start && stay.end ? `${stay.start} to ${stay.end}` : "not chosen"}</span>
            </p>
          </div>
        </form>
      </Demo>

      <Demo title="Slot picker">
        <div className="flex flex-col gap-5">
          <SlotPicker value={slot} onValueChange={setSlot} aria-label="Time" locale="en-GB">
            <SlotPickerGroup label="Morning">
              <SlotPickerItem value="09:30" />
              <SlotPickerItem value="10:00" note="2 places left" />
              <SlotPickerItem value="11:30" unavailable="Full" />
            </SlotPickerGroup>
            <SlotPickerGroup label="Afternoon">
              <SlotPickerItem value="14:00" />
              <SlotPickerItem value="15:30" note="Last one" />
            </SlotPickerGroup>
          </SlotPicker>
          <p className="text-sm text-muted-foreground">
            Chosen: <span data-testid="slot">{slot}</span>
          </p>
          <div data-testid="slots-us" className="flex flex-col gap-2">
            <p id="us-label" className="text-sm font-medium">
              Uncontrolled, written for another locale
            </p>
            <SlotPicker defaultValue="13:00" aria-labelledby="us-label" locale="en-US">
              <SlotPickerGroup>
                <SlotPickerItem value="09:30" />
                <SlotPickerItem value="13:00" />
                <SlotPickerItem value="evening">Any time after six</SlotPickerItem>
              </SlotPickerGroup>
            </SlotPicker>
          </div>
          <SlotPicker aria-label="Times on a closed day">
            <SlotPickerEmpty>Nothing is open on this day.</SlotPickerEmpty>
          </SlotPicker>
        </div>
      </Demo>

      <Demo title="Time picker">
        <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
          <div data-testid="time24" className="flex items-center justify-between gap-4">
            <p id="opens-label" className="text-sm font-medium">
              Opens at (24-hour, steps of 5)
            </p>
            <TimePicker aria-labelledby="opens-label" value={time} onValueChange={setTime} minuteStep={5} name="opens" locale="en-GB" />
          </div>
          <p className="text-sm text-muted-foreground">
            Value: <span data-testid="time">{time ?? "none"}</span>
          </p>
          <div data-testid="time12" className="flex items-center justify-between gap-4">
            <p id="pickup-label" className="text-sm font-medium">
              Pick-up (12-hour, 08:00 to 18:00)
            </p>
            <TimePicker aria-labelledby="pickup-label" value={afternoon} onValueChange={setAfternoon} min="08:00" max="18:00" locale="en-US" />
          </div>
          <p className="text-sm text-muted-foreground">
            Value: <span data-testid="pickup">{afternoon ?? "none"}</span>
          </p>
          <div className="flex items-center justify-between gap-4">
            <p id="empty-label" className="text-sm font-medium">
              Not set yet (uncontrolled)
            </p>
            <TimePicker aria-labelledby="empty-label" locale="en-GB" />
          </div>
        </form>
      </Demo>
    </div>
  );
}
