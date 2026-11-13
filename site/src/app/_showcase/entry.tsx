"use client";
// Showcase: data entry. Everything typed here stays on the page.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Form, FormControl, FormDescription, FormErrorSummary, FormField, FormLabel, FormMessage, FormSubmit } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { PasswordInput } from "@/components/ui/password-input";
import { Rating } from "@/components/ui/rating";
import { TagsInput } from "@/components/ui/tags-input";
import { Demo } from "./demo";

export function Entry() {
  const [sent, setSent] = useState("");
  const [tags, setTags] = useState<readonly string[]>(["urgent"]);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState<number | null>(1250.5);
  const [color, setColor] = useState("oklch(0.620 0.170 250.0)");
  const [stars, setStars] = useState(3);
  return (
    <div className="grid gap-6 @3xl:grid-cols-2">
      <Demo title="Form">
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setSent(`${String(data.get("name"))} <${String(data.get("email"))}>`);
          }}
        >
          <FormErrorSummary title="There is a problem" />
          <FormField name="name">
            <FormLabel>Name</FormLabel>
            <FormControl asChild>
              <Input required />
            </FormControl>
            <FormMessage match="valueMissing">Enter your name.</FormMessage>
          </FormField>
          <FormField name="email">
            <FormLabel>Email</FormLabel>
            <FormDescription>We send the receipt here.</FormDescription>
            <FormControl asChild>
              <Input type="email" required />
            </FormControl>
            <FormMessage match="valueMissing">Enter your email address.</FormMessage>
            <FormMessage match="typeMismatch">Enter an email address like name@example.com.</FormMessage>
          </FormField>
          <FormField name="guests">
            <FormLabel>Guests</FormLabel>
            <FormControl asChild>
              <Input type="number" min={1} max={8} defaultValue={2} />
            </FormControl>
            <FormMessage match="rangeOverflow">At most 8 guests.</FormMessage>
            <FormMessage match="rangeUnderflow">At least 1 guest.</FormMessage>
          </FormField>
          <FormSubmit asChild>
            <Button className="self-start">Send</Button>
          </FormSubmit>
        </Form>
        <p className="mt-3 text-sm text-muted-foreground" data-testid="form-sent">
          {sent || "Not sent"}
        </p>
      </Demo>
      <Demo title="Tags">
        <label htmlFor="labels" className="mb-2 block text-sm font-medium">
          Labels
        </label>
        <TagsInput id="labels" aria-label="Labels" value={tags} onValueChange={setTags} suggestions={["design", "bug", "later", "docs", "research"]} max={6} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="tags">
          {tags.join(", ")}
        </p>
      </Demo>
      <Demo title="One-time code">
        <OtpInput aria-label="Code from the message" value={code} onValueChange={setCode} />
        <p className="mt-2 text-sm text-muted-foreground" data-testid="otp">
          {code || "empty"}
        </p>
      </Demo>
      <Demo title="Password">
        <label htmlFor="new-password" className="mb-2 block text-sm font-medium">
          New password
        </label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          rules={[
            { label: "At least 12 characters", test: (v) => v.length >= 12 },
            { label: "A number", test: (v) => /\d/.test(v) },
            { label: "A capital letter", test: (v) => /\p{Lu}/u.test(v) },
          ]}
        />
      </Demo>
      <Demo title="Money">
        <div className="flex flex-col gap-3">
          <label htmlFor="budget" className="text-sm font-medium">
            Budget (German format)
          </label>
          <CurrencyInput id="budget" currency="EUR" locale="de-DE" value={amount} onValueChange={setAmount} min={0} />
          <p className="text-sm text-muted-foreground" data-testid="amount">
            {amount === null ? "empty" : String(amount)}
          </p>
          <label htmlFor="price" className="text-sm font-medium">
            Price (US format)
          </label>
          <CurrencyInput id="price" currency="USD" defaultValue={19.99} step={0.5} />
        </div>
      </Demo>
      <Demo title="Colour">
        <ColorPicker aria-label="Label colour" value={color} onValueChange={setColor} swatches={["oklch(0.62 0.17 250)", "oklch(0.7 0.15 150)", "#d95926", "#e87ba4"]} />
        <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="color">
          {color}
        </p>
      </Demo>
      <Demo title="Rating">
        <div className="flex flex-col gap-3">
          <Rating aria-label="Your rating" value={stars} onValueChange={setStars} />
          <p className="text-sm text-muted-foreground" data-testid="stars">
            {stars}
          </p>
          <Rating readOnly value={4.3} aria-label="Average of 128 ratings" />
        </div>
      </Demo>
    </div>
  );
}
