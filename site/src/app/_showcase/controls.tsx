"use client";
// Showcase: buttons and form controls.

import { ArrowRight, Bold, Italic, Mail, Search, Underline } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Demo } from "./demo";

export function Controls() {
  const [email, setEmail] = useState("not-an-email");
  const [volume, setVolume] = useState([40]);
  const invalid = email.length > 0 && !/^\S+@\S+\.\S+$/.test(email);

  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <Demo title="Button" className="@3xl:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Solid</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="soft">Soft</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">Link</Button>
          <Button loading>Saving</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">
            Large <ArrowRight strokeWidth={1.5} />
          </Button>
          <Button size="icon" variant="outline" aria-label="Search">
            <Search strokeWidth={1.5} />
          </Button>
        </div>
      </Demo>

      <Demo title="Field, input, textarea">
        <div className="grid gap-4">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <FieldControl>
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </FieldControl>
            <FieldDescription>Used for sign-in only.</FieldDescription>
            <FieldError>{invalid ? "Enter an email address, like you@example.com." : null}</FieldError>
          </Field>
          <Field>
            <FieldLabel>Search</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Mail strokeWidth={1.5} />
              </InputGroupAddon>
              <FieldControl>
                <InputGroupInput placeholder="Find a message" />
              </FieldControl>
              <InputGroupButton variant="ghost">Go</InputGroupButton>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <FieldControl>
              <Textarea placeholder="It grows as you type." />
            </FieldControl>
          </Field>
        </div>
      </Demo>

      <Demo title="Select, slider, choices">
        <div className="grid gap-5">
          <Field>
            <FieldLabel>Plan</FieldLabel>
            <Select defaultValue="team">
              <FieldControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
              </FieldControl>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Plans</SelectLabel>
                  <SelectItem value="solo">Solo</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Volume: {volume[0]}</FieldLabel>
            <FieldControl group>
              <Slider value={volume} onValueChange={setVolume} max={100} step={1} />
            </FieldControl>
          </Field>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Label className="flex items-center gap-2">
              <Checkbox defaultChecked /> Remember me
            </Label>
            <Label className="flex items-center gap-2">
              <Switch defaultChecked /> Notifications
            </Label>
          </div>
          <RadioGroup defaultValue="monthly" aria-label="Billing" className="flex flex-wrap gap-x-6 gap-y-3">
            <Label className="flex items-center gap-2">
              <RadioGroupItem value="monthly" /> Monthly
            </Label>
            <Label className="flex items-center gap-2">
              <RadioGroupItem value="yearly" /> Yearly
            </Label>
          </RadioGroup>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup type="multiple" variant="outline" aria-label="Text style">
              <ToggleGroupItem value="bold" aria-label="Bold">
                <Bold strokeWidth={1.5} />
              </ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic">
                <Italic strokeWidth={1.5} />
              </ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline">
                <Underline strokeWidth={1.5} />
              </ToggleGroupItem>
            </ToggleGroup>
            <Toggle variant="outline">Pin</Toggle>
          </div>
        </div>
      </Demo>
    </div>
  );
}
