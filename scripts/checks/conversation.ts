// Checks: thread, message, streaming-text, status-line, composer, part-frame (site/src/app/conversation).
//
// The contract these prove: the thread is a silent log (role="log", aria-live="off"), so streamed words are
// not announced as they arrive; one polite status region says what is happening; the finished reply is
// announced once; an arriving message never moves focus.

import type { Kit } from "../smoke-kit.ts";

export const route = "/conversation";

const SHORT = "Three places are open at one on Saturday. The nearest is a ten minute walk, has a garden at the back, and takes a table of four without booking ahead.";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, focusIs, page, sleep } = kit;
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";

  /** Waits until the page function is true, or gives up. */
  const until = async (test: () => Promise<boolean>, timeout = 8000): Promise<boolean> => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await test()) return true;
      await sleep(100);
    }
    return false;
  };
  const value = (selector: string): Promise<string> => page.$eval(selector, (node) => (node as HTMLTextAreaElement).value);
  const type = async (selector: string, words: string): Promise<void> => {
    await kit.focus(selector);
    await page.keyboard.type(words);
    await sleep(100);
  };

  // ---- Thread: a named, silent, focusable log of turns.
  const demo = await kit.demo("Thread, messages and composer");
  const log = `${demo} [data-slot=thread-content]`;
  const input = `${demo} [data-slot=composer-input]`;
  check((await attr(log, "role")) === "log", "the thread is a log");
  check((await attr(log, "aria-live")) === "off", "the log is silent (aria-live off): streamed words are not read out");
  check((await attr(log, "aria-label")) === "Conversation with the assistant", "the log has a name");
  check((await attr(log, "tabindex")) === "0", "the scrolling log can take keyboard focus");
  check((await count(`${demo} [role=status]`)) === 1 && (await attr(`${demo} [role=status]`, "aria-live")) === "polite", "there is exactly one polite status region");
  check((await text(`${demo} [role=status]`)) === "", "the status region is in the page before it has anything to say");
  check((await count(`${log} [role=status], ${log} [aria-live=polite], ${log} [aria-live=assertive]`)) === 0, "nothing inside the log is a live region");
  const turns = await page.evaluate(
    (s) => [...document.querySelectorAll(`${s} [data-slot=thread-turn]`)].map((turn) => `${turn.getAttribute("role")}:${document.getElementById(turn.getAttribute("aria-labelledby") ?? "")?.textContent}:${turn.querySelector("h3")?.className.includes("sr-only")}`),
    log,
  );
  check(turns.join(" ") === "group:Note:true group:You:true group:Assistant:true group:You:true", `each turn is a group named by a hidden heading (${turns.join(" ")})`);
  const scrolled = (): Promise<{ gap: number; top: number }> =>
    page.evaluate((s) => {
      const node = document.querySelector(s) as HTMLElement;
      return { gap: Math.round(node.scrollHeight - node.scrollTop - node.clientHeight), top: Math.round(node.scrollTop) };
    }, log);
  check((await scrolled()).gap <= 32, `the thread opens at the newest message (${(await scrolled()).gap}px from the end)`);

  // ---- Message: sides, words, meta, actions, suggestions.
  const sides = await page.evaluate((s) => {
    const box = (document.querySelector(s) as HTMLElement).getBoundingClientRect();
    const edge = (from: string): { start: number; end: number } => {
      const rect = (document.querySelector(`${s} [data-from=${from}] [data-slot=message-content]`) as HTMLElement).getBoundingClientRect();
      return { start: Math.round(rect.left - box.left), end: Math.round(box.right - rect.right) };
    };
    return { user: edge("user"), assistant: edge("assistant") };
  }, log);
  const userNearEnd = kit.dir === "rtl" ? sides.user.start < sides.user.end : sides.user.end < sides.user.start;
  const assistantNearStart = kit.dir === "rtl" ? sides.assistant.end < 80 : sides.assistant.start < 80;
  check(userNearEnd && assistantNearStart, `the person's messages are at the end side, the assistant's at the start (${JSON.stringify(sides)})`);
  check((await attr(`${log} [data-from=user] [data-slot=message-content]`, "dir")) === "auto", "a person's own words take their direction from the text (dir auto)");
  check((await attr(`${log} [data-from=assistant] [data-slot=message-content]`, "dir")) === null, "the assistant's words follow the page");
  check((await text(`${log} [data-status=failed] [data-slot=message-status]`)) === "Not sent", "a message that was not sent says so in words");
  check((await text(`${log} [data-slot=message-meta] time`)) === "11:05" && ((await attr(`${log} [data-slot=message-meta] time`, "datetime")) ?? "").startsWith("2026-11-14T11:05"), "the time is a time element, formatted for the locale");
  check(await kit.clickText(`${log} [data-slot=message-meta] button`, "Try again"), "a failed message offers a retry");
  check((await count(`${log} [data-status=failed]`)) === 0, "the retry acts");

  const actions = `${log} [data-slot=message-actions]`;
  check((await attr(actions, "role")) === "toolbar" && (await attr(actions, "aria-label")) === "Actions for this reply", "message actions are a named toolbar");
  check((await count(`${actions} [data-slot=message-action]:not([aria-label])`)) === 0, "every action has a name");
  const opacity = (): Promise<string> => page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).opacity, actions);
  await page.mouse.move(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await sleep(250);
  // The only reply so far is the latest one, which keeps its actions in view; an older reply is checked further down.
  check((await opacity()) === "1", "the latest reply keeps its actions in view");
  check(await kit.focus(`${actions} [aria-label="Copy"]`), "an action takes focus");
  await keys(forward);
  check((await kit.focused()) === "Good reply", `the arrow key towards the end moves along the toolbar (${await kit.focused()})`);
  await keys("End");
  check((await kit.focused()) === "Try again", "End goes to the last action");
  await keys("Home", "Enter");
  check((await text("[data-testid=copied]")) === "reply 3", "an action works from the keyboard");
  await keys("Tab");
  check(!(await focusIs(`${actions} *`)), "the toolbar is one Tab stop");
  const actionSize = await page.evaluate((s) => Math.round((document.querySelector(`${s} [data-slot=message-action]`) as HTMLElement).getBoundingClientRect().height), actions);
  check(actionSize >= (kit.phone ? 40 : 24), `an action is large enough to press (${actionSize}px)`);
  check((await attr(`${log} [data-slot=message-suggestions]`, "role")) === "group" && (await attr(`${log} [data-slot=message-suggestions]`, "aria-label")) === "Suggested replies", "suggested replies are a named group");

  // ---- Composer keys: Shift+Enter, input methods, growth.
  const sendButton = `${demo} [data-slot=composer-submit]`;
  check((await attr(input, "aria-label")) === "Message to the assistant", "the field has a name");
  check((await attr(input, "dir")) === "auto", "the field takes its direction from what is typed");
  check((await attr(sendButton, "aria-label")) === "Send" && (await attr(sendButton, "disabled")) !== null, "send is named, and disabled while there is nothing to send");
  const before = await count(`${log} [data-slot=message]`);
  const oneLine = await page.evaluate((s) => (document.querySelector(s) as HTMLElement).getBoundingClientRect().height, input);
  await type(input, "first line");
  await page.keyboard.down("Shift");
  await page.keyboard.press("Enter");
  await page.keyboard.up("Shift");
  await page.keyboard.type("second line");
  await sleep(150);
  check((await value(input)) === "first line\nsecond line" && (await count(`${log} [data-slot=message]`)) === before, "Shift+Enter makes a new line and does not send");
  const twoLines = await page.evaluate((s) => (document.querySelector(s) as HTMLElement).getBoundingClientRect().height, input);
  check(twoLines > oneLine, `the field grows with the text (${oneLine}px to ${twoLines}px)`);
  await page.evaluate((s) => {
    document.querySelector(s)?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, isComposing: true }));
  }, input);
  await sleep(150);
  check((await count(`${log} [data-slot=message]`)) === before && (await value(input)) !== "", "Enter while an input method is composing does not send");

  // ---- A reply streams: silent log, one status, one announcement, focus stays put.
  await keys("Enter");
  check((await count(`${log} [data-slot=message]`)) === before + 1, "Enter sends");
  check((await value(input)) === "" && (await focusIs(input)), "after sending, the field is empty and still has focus");
  check((await text(`${log} [data-slot=thread-turn]:last-child [data-slot=message-content]`)) === "first line\nsecond line", "the message keeps its line break");
  check((await text(`${demo} [role=status]`)) === "Searching", `the status line says what is happening (${await text(`${demo} [role=status]`)})`);
  check((await attr(`${demo} [data-slot=status-line-indicator]`, "aria-hidden")) === "true", "the moving mark is hidden from assistive technology");
  check((await attr(sendButton, "aria-label")) === "Stop" && (await attr(sendButton, "disabled")) === null, "while a reply is on its way, send becomes stop");
  const streaming = `${log} [data-slot=streaming-text][aria-busy=true]`;
  check(await until(async () => (await count(streaming)) === 1), "the arriving reply marks itself busy");
  check((await text(`${demo} [role=status]`)) === "Writing a reply", "the status changes to writing");
  await sleep(500);
  const partial = await text(streaming);
  check(partial.length > 0 && partial.length < SHORT.length && SHORT.startsWith(partial), `the words so far are real text in the page (${partial.length} characters)`);
  check((await attr(`${streaming} [data-slot=streaming-text-caret]`, "aria-hidden")) === "true", "the caret is decoration");
  const liveAncestor = await page.evaluate((s) => document.querySelector(s)?.closest("[aria-live]")?.getAttribute("aria-live") ?? "none", streaming);
  check(liveAncestor === "off", `the streaming text is not inside a live region (nearest aria-live: ${liveAncestor})`);
  check(!(await kit.announced()).some((message) => message.includes("Three places")), "nothing of the reply is announced while it streams");
  check(await focusIs(input), "the arriving reply did not move focus");
  await type(input, "typing while it streams");
  await keys("Enter");
  check((await value(input)) === "typing while it streams", "the person can keep typing during a reply, and Enter does not send then");
  check(await until(async () => (await count(streaming)) === 0), "the reply finishes");
  await sleep(200);
  check((await text(`${log} [data-slot=thread-turn]:last-child [data-slot=streaming-text]`)) === SHORT, "the finished text is whole");
  check((await kit.announced()).filter((message) => message === SHORT).length === 1, "the finished reply is announced once");
  check((await text(`${demo} [role=status]`)) === "Done", "the status line says it is done");
  check((await attr(sendButton, "aria-label")) === "Send", "stop becomes send again");
  check(await focusIs(input), "focus is still in the field");
  check((await scrolled()).gap <= 32, "the thread followed the reply to the end");
  await kit.axe(demo, "the conversation after a reply");

  // An older reply shows its actions on hover and on focus; on touch, always.
  const older = `${log} [data-slot=thread-turn]:nth-child(3) [data-slot=message-actions]`;
  const olderOpacity = (): Promise<string> => page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).opacity, older);
  if (kit.phone) {
    check((await olderOpacity()) === "1", "on a touch screen the actions of every reply are in view");
  } else {
    check((await olderOpacity()) === "0", "an older reply's actions are faint until wanted");
    await kit.focus(`${older} [data-slot=message-action]`);
    await sleep(250);
    check((await olderOpacity()) === "1", "they show when the keyboard reaches them");
    await kit.focus(input);
    await page.hover(`${log} [data-slot=thread-turn]:nth-child(3) [data-slot=message]`);
    await sleep(250);
    check((await olderOpacity()) === "1", "and on hover");
    await page.mouse.move(2, 2);
  }

  // ---- Following: scroll up during a long reply, and come back.
  await page.evaluate((s) => {
    const field = document.querySelector(s) as HTMLTextAreaElement;
    field.focus();
    field.select();
  }, input);
  await page.keyboard.type("the long version please");
  await keys("Enter");
  check(await until(async () => (await count(streaming)) === 1), "a long reply starts");
  await sleep(700);
  check((await scrolled()).gap <= 32, `the thread follows the newest words (${(await scrolled()).gap}px from the end)`);
  // The person scrolls up: by wheel on the desktop, by keyboard on the phone, by touch in the right-to-left pass.
  if (!kit.phone) {
    const box = await page.$eval(log, (node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.mouse.move(box.x, box.y);
    await page.mouse.wheel({ deltaY: -600 });
  } else if (kit.dir === "ltr") {
    await kit.focus(log);
    await keys("PageUp", "PageUp");
  } else {
    await page.evaluate((s) => {
      const node = document.querySelector(s) as HTMLElement;
      node.dispatchEvent(new Event("touchmove", { bubbles: true }));
      node.scrollTop -= 500;
    }, log);
  }
  await sleep(300);
  const away = await scrolled();
  await until(async () => (await scrolled()).gap > away.gap + 20, 6000);
  const later = await scrolled();
  check(later.gap > away.gap && Math.abs(later.top - away.top) <= 2, `scrolling up stops the following at once (stayed at ${later.top}px while ${later.gap - away.gap}px arrived)`);
  const jump = `${demo} [data-slot=thread-jump]`;
  check((await until(async () => (await count(jump)) === 1, 3000)) && (await text(jump)) === "Jump to latest", "a way back appears when there is something new below");
  check((await count(`${log} [data-slot=thread-jump]`)) === 0, "it is outside the log");
  await kit.screenshot("scrolled-up");
  await kit.axe(demo, "the conversation while scrolled up during a reply");
  check(await kit.focus(jump), "the jump button takes focus");
  await keys("Enter");
  check(await until(async () => (await scrolled()).gap <= 32 && (await count(jump)) === 0, 4000), "pressing it goes to the newest words, and it goes away");
  check(await focusIs(log), `focus is handed to the log, not lost (${await kit.focused()})`);
  await sleep(600);
  check((await scrolled()).gap <= 32, "the thread follows again");
  // Stop.
  check(await kit.click(sendButton), "stop can be pressed");
  check((await count(streaming)) === 0 && (await text(`${demo} [role=status]`)) === "Stopped", "stop ends the reply and the status says so");
  check(!(await kit.announced()).some((message) => message.includes("old mill")) && (await kit.announced()).filter((message) => message === "The long reply is ready.").length === 1, "a long reply is announced by its short spoken form, once");
  // Suggestions send.
  const total = await count(`${log} [data-slot=message]`);
  await page.evaluate((s) => (document.querySelector(`${s} [data-slot=message-suggestion]`) as HTMLElement).click(), log);
  await sleep(200);
  check((await count(`${log} [data-slot=message]`)) === total + 1, "pressing a suggested reply sends it");
  check(await until(async () => (await text(`${demo} [role=status]`)) === "Done", 10000), "that reply finishes too");

  // ---- Streaming text on its own.
  const stream = await kit.demo("Streaming text");
  const streamed = `${stream} [data-slot=streaming-text]`;
  check((await attr(streamed, "aria-busy")) === null && (await count(`${stream} [data-slot=streaming-text-caret]`)) === 0, "text that is not streaming is not busy and has no caret");
  check(await kit.clickText(`${stream} button`, "Stream a reply"), "streaming starts");
  await sleep(600);
  check((await attr(streamed, "aria-busy")) === "true", "it is busy while streaming");
  const caret = await page.evaluate((s) => {
    const node = document.querySelector(`${s} [data-slot=streaming-text-caret]`);
    return node ? getComputedStyle(node).animationName : "missing";
  }, stream);
  check(caret !== "missing" && caret !== "none", `the caret blinks (${caret})`);
  const soFar = await text(streamed);
  check(soFar.length > 0 && SHORT.startsWith(soFar), "revealed word by word, the words are still plain text for assistive technology");
  check((await text("[data-testid=done]")) === "0", "onDone has not been called yet");
  check(await until(async () => (await attr(streamed, "aria-busy")) === null), "it finishes");
  await sleep(150);
  check((await text("[data-testid=done]")) === "1", "onDone is called once");
  check((await text(streamed)) === SHORT, "the text is whole");
  const spoken = await kit.announced();
  check(spoken.filter((message) => message === "Three places found.").length === 1, "the short spoken form is announced once");
  check(spoken.filter((message) => message === SHORT).length === 1, "and the full text of this one is not announced as well");

  // ---- Status line on its own.
  const status = await kit.demo("Status line");
  const region = `${status} [data-testid=status-box] [role=status]`;
  const boxHeight = (): Promise<number> => page.$eval(`${status} [data-testid=status-box] [data-slot=status-line]`, (node) => node.getBoundingClientRect().height);
  const empty = await boxHeight();
  check((await text(region)) === "" && empty >= 24, `empty, the line is in the page and keeps its height (${empty}px)`);
  check((await attr(region, "aria-atomic")) === "true", "the status is read whole");
  await kit.clickText(`${status} button`, "Next status");
  check((await text(region)) === "Searching three sources", "the words change in place");
  check((await boxHeight()) === empty, "the height does not change when words and a button arrive");
  check((await count(`${region} button`)) === 0 && (await count(`${status} [data-testid=status-box] [data-slot=status-line-action]`)) === 1, "the stop button is beside the live region, not inside it");
  check(await kit.clickText(`${status} [data-slot=status-line-action]`, "Stop"), "the stop button can be pressed");
  check((await text(region)) === "Stopped" && (await count(`${status} [data-testid=status-box] [data-slot=status-line-indicator]`)) === 0, "stopping changes the words and removes the mark");
  check((await boxHeight()) === empty, "and the height still holds");

  // ---- Composer on its own: controlled, attachments, voice, busy.
  const composer = await kit.demo("Composer");
  const field = `${composer} [data-slot=composer-input]`;
  const submit = `${composer} [data-slot=composer-submit]`;
  check((await attr(`${composer} [data-slot=composer]`, "data-busy")) === null && (await page.$eval(`${composer} [data-slot=composer]`, (node) => node.tagName)) === "FORM", "the composer is a form");
  const list = `${composer} [data-slot=composer-attachments]`;
  check((await page.$eval(list, (node) => node.tagName)) === "UL" && (await attr(list, "aria-label")) === "Attachments" && (await count(`${list} > li`)) === 1, "attachments are a named list");
  check((await attr(submit, "disabled")) === null, "with an attachment, send is allowed without text");
  check(await kit.click(`${composer} [aria-label="Attach a sample file"]`), "the attach button is a named button");
  check((await count(`${list} > li`)) === 2, "the project adds the file");
  check(await kit.focus(`${list} [aria-label="Remove plan.pdf"]`), "a remove button says which file it removes");
  await keys("Enter");
  check((await count(`${list} > li`)) === 1 && (await focusIs(field)), "removing a file keeps focus in the composer");
  await type(field, "hello");
  check((await text("[data-testid=typed]")) === '"hello"', "controlled: the project sees every change");
  const voice = `${composer} [data-slot=composer-voice-button]`;
  const voiceState = `${composer} [data-slot=composer-voice-state]`;
  check((await attr(voice, "aria-label")) === "Voice input" && (await attr(voice, "aria-pressed")) === "false", "the voice button is a named toggle");
  check((await text(voiceState)) === "Not listening" && (await attr(voice, "aria-describedby")) === (await attr(voiceState, "id")), "its state is said in words");
  await kit.focus(voice);
  await keys("Space");
  check((await attr(voice, "aria-pressed")) === "true" && (await text(voiceState)) === "Listening", "Space switches it on, and the words follow");
  const shown = await page.$eval(voiceState, (node) => node.getBoundingClientRect().width > 1);
  check(shown, "while listening the word is shown, not only a colour");
  await keys("Space");
  check((await attr(voice, "aria-pressed")) === "false", "and off again");
  // Many lines: the field stops growing and scrolls inside.
  await kit.focus(field);
  for (let line = 0; line < 7; line += 1) {
    await page.keyboard.down("Shift");
    await page.keyboard.press("Enter");
    await page.keyboard.up("Shift");
    await page.keyboard.type(`line ${line}`);
  }
  await sleep(150);
  const grown = await page.$eval(field, (node) => {
    const style = getComputedStyle(node);
    return { lines: (node.getBoundingClientRect().height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)) / parseFloat(style.lineHeight), overflow: style.overflowY };
  });
  check(Math.abs(grown.lines - 4) < 0.2 && grown.overflow === "auto", `it grows to the most lines allowed, then scrolls (${grown.lines.toFixed(1)} lines, overflow ${grown.overflow})`);
  await kit.screenshot("composer");
  // Busy: stop.
  await kit.clickText(`${composer} button`, "A reply is on its way");
  check((await attr(submit, "aria-label")) === "Stop" && (await attr(`${composer} [data-slot=composer]`, "aria-busy")) === "true", "busy: the form says so and send becomes stop");
  await kit.focus(submit);
  await keys("Enter");
  check((await text("[data-testid=stops]")) === "1" && (await attr(submit, "aria-label")) === "Send", "stop calls the project, once");
  check(await focusIs(submit), "the button keeps focus through the change");
  await keys("Enter");
  check((await text("[data-testid=sent]")).startsWith("hello") && (await text("[data-testid=sent]")).endsWith("+ photo-2.jpg"), `the send button sends the trimmed text (${(await text("[data-testid=sent]")).replace(/\n/g, " / ")})`);
  check((await text("[data-testid=typed]")) === '""' && (await focusIs(field)), "the field is cleared and takes focus again");
  check((await count(list)) === 0 && (await attr(submit, "disabled")) !== null, "with nothing to send, send is disabled");
  const target = await page.$eval(submit, (node) => Math.round(Math.min(node.getBoundingClientRect().width, node.getBoundingClientRect().height)));
  check(target >= 40, `the send button is at least 40px (${target}px)`);

  // ---- Part frame.
  const frames = await kit.demo("Part frame");
  const frame = `${frames} [data-testid=frame-a]`;
  const named = await page.evaluate((s) => {
    const node = document.querySelector(s);
    const title = document.getElementById(node?.getAttribute("aria-labelledby") ?? "");
    return `${node?.getAttribute("role")}:${title?.tagName}:${title?.textContent}`;
  }, frame);
  check(named === "group:H3:Plan for Saturday", `the frame is a group named by its heading (${named})`);
  const contentHeight = (): Promise<number> => page.$eval(`${frame} [data-slot=part-frame-content]`, (node) => Math.round(node.getBoundingClientRect().height));
  const live = await contentHeight();
  const choose = async (state: string): Promise<void> => {
    await page.evaluate((s, label) => ([...document.querySelectorAll(`${s} [role=radio]`)].find((node) => node.textContent?.trim().toLowerCase() === label) as HTMLElement).click(), frames, state);
    await sleep(250);
  };
  await choose("loading");
  check((await attr(frame, "aria-busy")) === "true" && (await count(`${frame} [data-slot=skeleton]`)) > 0, "loading: the frame is busy and shows a skeleton");
  check((await contentHeight()) === live, `the skeleton holds the final size (${await contentHeight()}px, ${live}px live)`);
  check((await text(`${frame} [data-slot=part-frame-status]`)) === "Loading" && (await count(`${frame} [data-slot=part-frame-expand], ${frame} [data-slot=part-frame-footer]`)) === 0, "loading is said to screen readers, and there are no controls yet");
  await choose("pending");
  check((await text(`${frame} [data-slot=part-frame-status]`)) === "Saving" && (await attr(frame, "aria-busy")) === "true", "pending: it says Saving in words");
  check((await kit.announced()).filter((message) => message === "Saving").length === 1, "and announces it once");
  await choose("final");
  check((await text(`${frame} [data-slot=part-frame-status]`)) === "Confirmed" && (await attr(frame, "data-state")) === "final", "final: the project's word for it is shown");
  await choose("live");
  check((await count(`${frame} [data-slot=part-frame-status]`)) === 0 && (await attr(frame, "aria-busy")) === null, "live: nothing extra is said");

  // Full screen and back.
  const expand = `${frame} [data-slot=part-frame-expand]`;
  check((await attr(expand, "aria-label")) === "Open full screen", "the expand button has a name");
  await kit.focus(expand);
  await keys("Enter");
  await sleep(400);
  check((await count("[role=dialog]")) === 1 && (await text("[role=dialog] [data-slot=dialog-title]")) === "Plan for Saturday", "it opens the content in a named window");
  check(await page.evaluate(() => document.querySelector("[role=dialog]")?.contains(document.activeElement) ?? false), "focus moves into the window");
  const filled = await page.evaluate(() => {
    const rect = (document.querySelector("[role=dialog]") as HTMLElement).getBoundingClientRect();
    return rect.width >= window.innerWidth - 40 && rect.height >= window.innerHeight - 40;
  });
  check(filled, "the window fills the screen");
  await kit.axe("[role=dialog]", "the full-screen window");
  await kit.screenshot("expanded");
  await keys("Escape");
  await sleep(400);
  check((await count("[role=dialog]")) === 0 && (await focusIs(expand)), "Escape closes it and focus returns to the button");

  // Superseded: focus that was inside passes to the replacement.
  await kit.focus(`${frame} [data-slot=part-frame-footer] button`);
  await keys("Enter");
  await sleep(300);
  check((await attr(frame, "data-state")) === "superseded" && (await count(`${frame} [data-slot=part-frame-content], ${frame} [data-slot=part-frame-footer], ${frame} [data-slot=part-frame-expand]`)) === 0, "a superseded frame shrinks to a stub");
  check((await text(`${frame} [data-slot=part-frame-status]`)) === "Replaced" && (await text(`${frame} [data-slot=part-frame-superseded-by] a`)) === "See the new plan", "the stub says it was replaced and points to what replaced it");
  check(await focusIs("[data-testid=frame-b]"), `focus that was inside passes to the replacement (${await kit.focused()})`);
  const stub = await page.$eval(frame, (node) => Math.round(node.getBoundingClientRect().height));
  check(stub < live, `the stub is small (${stub}px)`);
  await kit.axe(frames, "the frames, one superseded");

  await kit.axe("main", "after the checks");
}
