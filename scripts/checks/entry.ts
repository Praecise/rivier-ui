// Checks: form, tags-input, otp-input, password-input, currency-input, color-picker, rating
// (site/src/app/entry).

import type { Kit } from "../smoke-kit.ts";

export const route = "/entry";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page } = kit;
  const back = kit.dir === "rtl" ? "ArrowRight" : "ArrowLeft";
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const selectAll = async (): Promise<void> => {
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
  };

  // Form: a failed submit lists the faults as links, said once; a sound one is sent.
  const form = await kit.demo("Form");
  check(await kit.clickText(`${form} button`, "Send"), "form: the submit button can be pressed");
  await kit.sleep(300);
  check((await attr(`${form} [data-slot=form-error-summary]`, "role")) === "alert", "form: a failed submit shows a summary");
  check((await count(`${form} [data-slot=form-error-summary] a`)) === 2, `form: one link per fault (${await count(`${form} [data-slot=form-error-summary] a`)})`);
  check((await kit.announced()).includes("2 problems to fix"), "form: how many faults is said");
  check(
    (await text(`${form} [data-slot=form-error-summary] a`)) === "Name: Enter your name.",
    `form: a fault says the field and the project's message (${await text(`${form} [data-slot=form-error-summary] a`)})`,
  );
  check(await kit.click(`${form} [data-slot=form-error-summary] a`), "form: a fault is a link");
  check(await kit.focusIs(`${form} input[name=name]`), "form: the link takes focus to the field");
  check((await attr(`${form} input[name=name]`, "aria-describedby")) !== null, "form: the field is described by its message");
  await page.keyboard.type("Ada");
  await kit.focus(`${form} input[name=email]`);
  await page.keyboard.type("not-an-address");
  // A click right after editing: leaving the field shows its message and moves the button as it is pressed.
  await kit.clickText(`${form} button`, "Send");
  await kit.sleep(300);
  check((await text(`${form} [data-slot=form-error-summary]`)).includes("like name@example.com"), `form: a wrong kind of value has its own message (${await text(`${form} [data-slot=form-error-summary]`)})`);
  await kit.focus(`${form} input[name=email]`);
  await selectAll();
  await page.keyboard.type("ada@example.com");
  await kit.sleep(800);
  await kit.clickText(`${form} button`, "Send");
  await kit.sleep(300);
  check((await text("[data-testid=form-sent]")) === "Ada <ada@example.com>", "form: a sound form is sent");
  check((await count(`${form} [data-slot=form-error-summary]`)) === 0, "form: the summary goes once all is well");

  // Tags.
  const tags = await kit.demo("Tags");
  check(await kit.focus("#labels"), "tags-input: the field takes focus");
  await page.keyboard.type("bug");
  await keys("Enter");
  check((await text("[data-testid=tags]")) === "urgent, bug", "tags-input: Enter adds a tag");
  check((await kit.announced()).includes("bug added"), "tags-input: an added tag is said");
  await page.keyboard.type("docs,");
  check((await text("[data-testid=tags]")) === "urgent, bug, docs", "tags-input: a comma adds a tag");
  await keys("Backspace");
  check((await text("[data-testid=tags]")) === "urgent, bug", "tags-input: Backspace in an empty field removes the last tag");
  await page.keyboard.type("res");
  check((await attr("#labels", "aria-expanded")) === "true", "tags-input: suggestions open as one types");
  await keys("ArrowDown", "Enter");
  check((await text("[data-testid=tags]")) === "urgent, bug, research", "tags-input: a suggestion is chosen with the keys");
  check(await kit.click(`${tags} [aria-label="Remove urgent"]`), "tags-input: a tag's remove button is named");
  check((await text("[data-testid=tags]")) === "bug, research", "tags-input: the button removes it");

  // One-time code.
  const otp = await kit.demo("One-time code");
  check((await count(`${otp} [data-slot=otp-input] input`)) === 6, "otp-input: six boxes");
  check((await attr(`${otp} [data-slot=otp-input] input`, "autocomplete")) === "one-time-code", "otp-input: the first box takes the code from the system");
  await kit.focus(`${otp} [data-slot=otp-input] input`);
  await page.keyboard.type("123456");
  check((await text("[data-testid=otp]")) === "123456", `otp-input: typing fills the boxes (${await text("[data-testid=otp]")})`);
  await keys("Backspace");
  check((await text("[data-testid=otp]")) === "12345", "otp-input: Backspace clears the box");
  await keys(back);
  check((await kit.focused()) === "Character 5 of 6", `otp-input: the arrow key towards the start goes back a box (${await kit.focused()})`);
  await keys(forward);
  check((await kit.focused()) === "Character 6 of 6", "otp-input: the arrow key towards the end goes on");

  // Password.
  const password = await kit.demo("Password");
  check(await kit.focus("#new-password"), "password-input: the field takes focus");
  await page.keyboard.type("Abcdefghijk1");
  check((await count(`${password} [data-slot=password-input-rules] li[data-met]`)) === 3, "password-input: each rule is marked as it is met");
  check((await text(`${password} [data-slot=password-input-rules] li`)).includes("done"), "password-input: a met rule says so in words");
  check((await attr("#new-password", "type")) === "password", "password-input: hidden by default");
  check(await kit.click(`${password} [aria-label="Show password"]`), "password-input: the show button is named");
  check(
    (await attr("#new-password", "type")) === "text" && (await attr(`${password} [aria-pressed]`, "aria-pressed")) === "true",
    "password-input: the button shows the password and says it is pressed",
  );

  // Money.
  const money = await kit.demo("Money");
  check(await kit.focus("#budget"), "currency-input: the field takes focus");
  check((await page.$eval("#budget", (node) => (node as HTMLInputElement).value)) === "1250,50", "currency-input: while typing, the plain number in the locale's form");
  await selectAll();
  await page.keyboard.type("2.000,75");
  check((await text("[data-testid=amount]")) === "2000.75", `currency-input: the locale's marks are read (${await text("[data-testid=amount]")})`);
  await keys("ArrowUp");
  check((await text("[data-testid=amount]")) === "2001.75", "currency-input: Up adds a step");
  await keys("Tab");
  check((await page.$eval("#budget", (node) => (node as HTMLInputElement).value)) === "2.001,75", "currency-input: left, it is shown with grouping");
  check((await text(`${money} [data-slot=currency-input]`)).includes("€"), "currency-input: the currency's symbol is shown");

  // Colour.
  const colour = await kit.demo("Colour");
  const start = await text("[data-testid=color]");
  check(await kit.focus(`${colour} [role=slider][aria-label=Hue]`), "color-picker: the hue slider takes focus");
  await keys("ArrowRight", "ArrowRight");
  check((await text("[data-testid=color]")) !== start, "color-picker: the keys change the hue");
  check((await attr(`${colour} [role=slider][aria-label=Lightness]`, "aria-valuetext"))?.endsWith("%") ?? false, "color-picker: a slider says its value in words");
  check(await kit.click(`${colour} [aria-label="#d95926"]`), "color-picker: a swatch can be pressed");
  check((await attr(`${colour} [aria-label="#d95926"]`, "aria-pressed")) === "true", "color-picker: the swatch in use says so");
  await kit.focus(`${colour} [aria-label="Colour value"]`);
  await selectAll();
  await page.keyboard.type("#2a78d6");
  await keys("Enter");
  check((await text("[data-testid=color]")).startsWith("oklch(0.5"), `color-picker: a typed hex value is read (${await text("[data-testid=color]")})`);

  // Rating.
  const rating = await kit.demo("Rating");
  check((await attr(`${rating} [data-slot=rating][role=radiogroup]`, "aria-label")) === "Your rating", "rating: a named radio group");
  check(await kit.focus(`${rating} [role=radio][aria-checked=true]`), "rating: the chosen star takes focus");
  check((await kit.focused()) === "3 of 5", "rating: each star is named by its score");
  await keys(forward);
  check((await text("[data-testid=stars]")) === "4", `rating: the arrow key towards the end raises the score (${await text("[data-testid=stars]")})`);
  check((await attr(`${rating} [data-slot=rating][role=img]`, "aria-label")) === "Average of 128 ratings: 4.3 of 5", "rating: the read-only score says its number");

  await kit.axe("main", "after the checks");
}
