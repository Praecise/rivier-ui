// Checks: model-viewer, alone and as two viewers sharing one camera inside compare-slider (site/src/app/models).
//
// The browser the checks run in draws WebGL in software, so these prove that both kinds of file load and
// draw, not how fast.

import type { Kit } from "../smoke-kit.ts";

export const route = "/models";

type View = { azimuth: number; polar: number; zoom: number; state: string | null; turning: boolean };

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const near = (value: number, target: number, within = 1): boolean => Math.abs(value - target) <= within;
  const viewOf = (viewer: string): Promise<View> =>
    page.evaluate((s) => {
      const node = document.querySelector<HTMLElement>(s);
      return {
        azimuth: Number(node?.dataset["azimuth"]),
        polar: Number(node?.dataset["polar"]),
        zoom: Number(node?.dataset["zoom"]),
        state: node?.dataset["state"] ?? null,
        turning: node?.hasAttribute("data-turning") ?? false,
      };
    }, viewer);
  const is = async (viewer: string, azimuth: number, polar: number, zoom: number): Promise<boolean> => {
    const view = await viewOf(viewer);
    return near(view.azimuth, azimuth, 0.01) && near(view.polar, polar, 0.01) && near(view.zoom, zoom, 0.011);
  };
  const said = async (viewer: string): Promise<string> => {
    const view = await viewOf(viewer);
    return `${view.azimuth} ${view.polar} ${view.zoom}`;
  };
  /** Waits for a viewer to reach a state; software WebGL and a first compile can take a while. */
  const reaches = (viewer: string, state: string, timeout = 45_000): Promise<boolean> =>
    page.waitForFunction((s, wanted) => document.querySelector(s)?.getAttribute("data-state") === wanted, { timeout }, viewer, state).then(
      () => true,
      () => false,
    );
  const rect = (selector: string): Promise<{ left: number; top: number; width: number; height: number }> =>
    page.evaluate((s) => {
      const element = document.querySelector(s) as HTMLElement;
      element.scrollIntoView({ block: "center", behavior: "instant" });
      const box = element.getBoundingClientRect();
      return { left: box.left, top: box.top, width: box.width, height: box.height };
    }, selector);
  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
    const steps = 8;
    const at = (step: number): { x: number; y: number } => ({ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps });
    if (kit.phone) {
      await page.touchscreen.touchStart(from.x, from.y);
      for (let step = 1; step <= steps; step += 1) await page.touchscreen.touchMove(at(step).x, at(step).y);
      await page.touchscreen.touchEnd();
    } else {
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= steps; step += 1) await page.mouse.move(at(step).x, at(step).y);
      await page.mouse.up();
    }
    await sleep(250);
  };
  /** How much of a still is drawn, and in how many colours: an empty or one-colour picture means nothing was rendered. */
  const drawn = (selector: string): Promise<{ covered: number; colours: number }> =>
    page.evaluate(async (s) => {
      const image = document.querySelector<HTMLImageElement>(s);
      if (!image) return { covered: 0, colours: 0 };
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 72;
      const context = canvas.getContext("2d");
      if (!context) return { covered: 0, colours: 0 };
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const colours = new Set<number>();
      let covered = 0;
      for (let index = 0; index < data.length; index += 4) {
        if ((data[index + 3] ?? 0) < 128) continue;
        covered += 1;
        colours.add((((data[index] ?? 0) >> 4) << 8) | (((data[index + 1] ?? 0) >> 4) << 4) | ((data[index + 2] ?? 0) >> 4));
      }
      return { covered: covered / (canvas.width * canvas.height), colours: colours.size };
    }, selector);
  const scrollY = (): Promise<number> => page.evaluate(() => window.scrollY);
  const opacity = (selector: string): Promise<string> => page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).opacity, selector);

  // ---- Lazy: a viewer far below the screen has fetched nothing and made no canvas.
  const failing = `[data-demo="When it cannot be shown"] [data-slot=model-viewer]`;
  check((await attr(failing, "data-state")) === "idle" && (await count(`${failing} canvas`)) === 0, "a viewer far below the screen waits: no canvas, nothing loaded");
  check((await count("[data-slot=model-viewer-ar]")) === 0, "on a device with no AR viewer the hand-off is not offered");

  // ---- A glTF model.
  const demo = await kit.demo("Model viewer");
  const viewer = `${demo} [data-slot=model-viewer]`;
  const surface = `${viewer} [data-slot=model-viewer-surface]`;
  check((await attr(surface, "aria-label")) === "A clay vase with a painted belt", "the viewer has a text alternative from the start");
  check(await reaches(viewer, "ready"), `the glTF file loads and draws (${(await viewOf(viewer)).state})`);
  check((await attr(viewer, "data-kind")) === "gltf" && (await count(`${viewer} canvas[aria-hidden=true]`)) === 1, "it draws on one canvas, hidden from assistive technology");
  check((await text("[data-testid=model-loads]")) === "1" && (await text("[data-testid=model-bounds]")) === "0.00 0.00 0.00 / 1.26", `the project is told once that it loaded, and what was fitted to the frame (${await text("[data-testid=model-bounds]")})`);
  check(
    (await attr(surface, "role")) === "application" && (await attr(surface, "aria-roledescription")) === "3D model" && (await attr(surface, "tabindex")) === "0",
    "once ready the surface is one Tab stop: a widget with its own keys, described as a 3D model",
  );
  const described = await page.evaluate((s) => document.getElementById(document.querySelector(s)?.getAttribute("aria-describedby") ?? "")?.textContent ?? "", surface);
  check(described === "Arrow keys turn the model, plus and minus zoom, Home resets the view.", "its description says how to use it from the keyboard");
  await sleep(700);
  check((await opacity(`${viewer} [data-slot=model-viewer-poster]`)) === "0", "the poster gives way to the model");
  const frame = await rect(viewer);
  check(near(frame.width / frame.height, 4 / 3, 0.03), `the frame holds its aspect ratio (${(frame.width / frame.height).toFixed(2)})`);

  check(await kit.focus(surface), "the surface takes focus");
  await keys("ArrowRight");
  check(await is(viewer, 15, 15, 1), `Right turns the model to the right, also in a right-to-left page (${await said(viewer)})`);
  check((await kit.announced()).some((message) => message === "Turned 15 degrees to the right, from 15 degrees above, zoom 100%"), `the new view is announced (${(await kit.announced()).at(-1)})`);
  await keys("ArrowLeft", "ArrowLeft");
  check(await is(viewer, -15, 15, 1), "Left turns it to the left");
  await keys("ArrowUp");
  check(await is(viewer, -15, 25, 1), "Up raises the viewpoint");
  await keys("ArrowDown", "ArrowDown");
  check(await is(viewer, -15, 5, 1), "Down lowers it");
  await keys("+");
  check(await is(viewer, -15, 5, 1.25), "plus zooms in");
  await keys("-", "-");
  check(await is(viewer, -15, 5, 0.8), "minus zooms out");
  await keys("Home");
  check(await is(viewer, 0, 15, 1), "Home resets the view");
  await keys("ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp");
  check(await is(viewer, 0, 85, 1), `the viewpoint stops before going over the top (${await said(viewer)})`);
  await keys("-", "-", "-", "-", "-");
  check(await is(viewer, 0, 85, 0.5), "and the zoom stops at its limit");
  await keys("Home");
  check(await kit.focusIs(surface), "focus stays on the surface throughout");
  check((await text("[data-testid=model-view]")) === "0 15 1.00", "the project is told the view");

  // The buttons: everything a drag does, without one.
  const controls = `${viewer} [data-slot=model-viewer-controls]`;
  check((await attr(controls, "role")) === "group" && (await attr(controls, "aria-label")) === "View", "the buttons are a named group");
  const names = await page.evaluate((s) => [...document.querySelectorAll(`${s} button`)].map((button) => button.getAttribute("aria-label")), controls);
  check(names.join(", ") === "Turn left, Turn right, Zoom out, Zoom in, Reset the view", `each button has a name (${names.join(", ")})`);
  const sizes = await page.evaluate((s) => [...document.querySelectorAll(`${s} button`)].map((button) => Math.round(Math.min(button.getBoundingClientRect().width, button.getBoundingClientRect().height))), controls);
  check(sizes.every((size) => size >= 40), `each is at least 40px (${sizes.join(", ")})`);
  await kit.click(`${controls} [data-action=turn-right]`);
  check(await is(viewer, 15, 15, 1), "Turn right turns it");
  await kit.click(`${controls} [data-action=turn-left]`);
  await kit.click(`${controls} [data-action=zoom-in]`);
  check(await is(viewer, 0, 15, 1.25), "Turn left and Zoom in work");
  await kit.click(`${controls} [data-action=zoom-out]`);
  await kit.click(`${controls} [data-action=zoom-out]`);
  check(await is(viewer, 0, 15, 0.8), "Zoom out works");
  await kit.click(`${controls} [data-action=reset]`);
  check(await is(viewer, 0, 15, 1), "Reset returns to the start");

  // Dragging: the mouse, or a finger.
  check((await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).touchAction, surface)) === "pan-y", "a touch moving up or down on the model still scrolls the page");
  const area = await rect(surface);
  const middle = { x: area.left + area.width / 2, y: area.top + area.height * 0.4 };
  const before = await scrollY();
  await drag(middle, { x: middle.x + 100, y: middle.y });
  check(near((await viewOf(viewer)).azimuth, 40, 3) && (await scrollY()) === before, `dragging sideways turns the model and does not move the page (${await said(viewer)})`);
  if (!kit.phone) {
    await drag(middle, { x: middle.x, y: middle.y + 50 });
    check(near((await viewOf(viewer)).polar, 30, 3), `dragging down shows it from above (${await said(viewer)})`);
    // The wheel: plain, it belongs to the page; with Ctrl, it zooms.
    await page.mouse.move(middle.x, middle.y);
    const zoom = (await viewOf(viewer)).zoom;
    await page.mouse.wheel({ deltaY: 120 });
    await sleep(300);
    check((await viewOf(viewer)).zoom === zoom && (await scrollY()) > before, "a plain wheel over the model scrolls the page and leaves the zoom alone");
    const again = await rect(surface);
    const held = await scrollY();
    await page.mouse.move(again.left + again.width / 2, again.top + again.height * 0.4);
    await page.keyboard.down("Control");
    await page.mouse.wheel({ deltaY: -40 });
    await page.keyboard.up("Control");
    await sleep(300);
    check((await viewOf(viewer)).zoom > zoom && (await scrollY()) === held, `Ctrl with the wheel zooms and the page stays (${await said(viewer)})`);
  }
  await kit.click("[data-testid=reset-handle]");
  check(await is(viewer, 0, 15, 1), "the project can reset the view from outside");

  await kit.click("[data-testid=take-still]");
  await page.waitForSelector("[data-testid=still]", { timeout: 10_000 }).catch(() => {});
  const still = await drawn("[data-testid=still]");
  check(still.covered > 0.05 && still.colours >= 4, `a still taken from the viewer shows the model (${Math.round(still.covered * 100)}% drawn, ${still.colours} colours)`);
  await kit.screenshot("model-viewer");
  await kit.axe(demo, "the model viewer");

  // ---- Gaussian splats, in three formats, turning by itself.
  const splats = await kit.demo("Gaussian splats");
  const cloud = `${splats} [data-slot=model-viewer]`;
  const toggle = `${cloud} [data-action=turning]`;
  check(await reaches(cloud, "ready"), `the .spz file loads and draws (${(await viewOf(cloud)).state})`);
  check((await attr(cloud, "data-kind")) === "splat" && (await text("[data-testid=splat-loads]")) === "/models/vase.spz", "it is drawn as splats");
  const moves = async (): Promise<boolean> => {
    const first = (await viewOf(cloud)).azimuth;
    await sleep(500);
    return (await viewOf(cloud)).azimuth !== first;
  };
  check((await viewOf(cloud)).turning && (await moves()), "it turns by itself while on screen");
  check((await attr(toggle, "aria-label")) === "Stop turning", "and a button stops it");
  await kit.click("[data-testid=take-splat-still]");
  await page.waitForSelector("[data-testid=splat-still]", { timeout: 10_000 }).catch(() => {});
  const spz = await drawn("[data-testid=splat-still]");
  check(spz.covered > 0.05 && spz.colours >= 4, `the splats are drawn (${Math.round(spz.covered * 100)}% drawn, ${spz.colours} colours)`);

  // Off screen it stops; back on screen it goes on.
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await sleep(500);
  check(!(await viewOf(cloud)).turning && !(await moves()), "off screen it stops turning");
  await kit.demo("Gaussian splats");
  await sleep(500);
  check((await viewOf(cloud)).turning && (await moves()), "back on screen it goes on");

  // Reduced motion: it never turns by itself, and there is nothing to stop.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await sleep(300);
  check(!(await viewOf(cloud)).turning && !(await moves()) && (await count(toggle)) === 0, "under reduced motion it does not turn by itself");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await sleep(300);
  check(await moves(), "with motion allowed again it turns");
  await kit.click(toggle);
  check((await attr(toggle, "aria-label")) === "Start turning" && !(await moves()), "the button stops it, and then offers to start it");
  await kit.click(toggle);
  check(await moves(), "and starts it again");
  await kit.focus(`${cloud} [data-slot=model-viewer-surface]`);
  await keys("ArrowRight");
  check(!(await moves()) && (await attr(toggle, "aria-label")) === "Start turning", "turning it by hand stops it too");

  for (const format of [".ply", ".splat"]) {
    await kit.clickText(`${splats} button`, format);
    check(await reaches(cloud, "ready"), `the ${format} file loads and draws (${(await viewOf(cloud)).state})`);
    check((await text("[data-testid=splat-loads]")).endsWith(`/models/vase${format}`), `the viewer follows a change of file (${await text("[data-testid=splat-loads]")})`);
    check((await count(`${cloud} canvas`)) === 1, "and still has one canvas");
    await kit.click("[data-testid=take-splat-still]");
    await sleep(400);
    const picture = await drawn("[data-testid=splat-still]");
    check(picture.covered > 0.05 && picture.colours >= 4, `its splats are drawn (${Math.round(picture.covered * 100)}% drawn, ${picture.colours} colours)`);
  }
  await kit.screenshot("splats");
  await kit.axe(splats, "the splat viewer");

  // ---- Two viewers, one camera, inside a compare slider.
  const pair = await kit.demo("Two viewers, one camera");
  const made = `${pair} [data-slot=compare-slider-first] [data-slot=model-viewer]`;
  const found = `${pair} [data-slot=compare-slider-second] [data-slot=model-viewer]`;
  check((await reaches(made, "ready")) && (await reaches(found, "ready")), "both models load");
  const together = async (azimuth: number, within = 0.01): Promise<boolean> => near((await viewOf(made)).azimuth, azimuth, within) && near((await viewOf(found)).azimuth, azimuth, within);
  await kit.clickText(`${pair} button`, "Turn both right");
  check(await together(15), "a button of the project's own turns both");
  await kit.focus(`${found} [data-slot=model-viewer-surface]`);
  await keys("ArrowRight");
  check((await together(30)) && (await text("[data-testid=shared-view]")) === "30 15 1.00", "turning one from the keyboard turns the other");
  const stage = await rect(`${pair} [data-slot=compare-slider]`);
  const height = stage.top + stage.height * 0.6;
  const under = (x: number, selector: string): Promise<boolean> => page.evaluate((px, py, s) => document.elementFromPoint(px, py)?.closest(s) !== null, x, height, selector);
  check((await under(stage.left + stage.width * 0.2, made)) && (await under(stage.left + stage.width * 0.8, found)), "the pointer reaches each viewer on its own side of the divider");
  await drag({ x: stage.left + stage.width * 0.8, y: height }, { x: stage.left + stage.width * 0.8 - 50, y: height });
  check(await together(10, 3), `dragging one drags both (${await said(made)} and ${await said(found)})`);
  check((await viewOf(made)).azimuth === (await viewOf(found)).azimuth, "the two views are the same");
  const grip = `${pair} [role=slider]`;
  await kit.focus(grip);
  await keys("ArrowRight");
  check((await attr(grip, "aria-valuenow")) === "51" && (await attr(grip, "aria-valuetext")) === "51% As made, 49% As found", `the divider still works from the keyboard (${await attr(grip, "aria-valuetext")})`);
  await kit.clickText(`${pair} button`, "Reset both");
  check(await together(0), "and both reset together");
  await kit.screenshot("compare");
  await kit.axe(pair, "two viewers in a compare slider");

  // ---- A file that cannot be read.
  const broken = await kit.demo("When it cannot be shown");
  check(await reaches(failing, "error"), `a file that is not a model ends in an error, not a blank frame (${(await viewOf(failing)).state})`);
  const dead = `${failing} [data-slot=model-viewer-surface]`;
  check((await attr(dead, "role")) === "img" && (await attr(dead, "aria-label")) === "A model whose file cannot be read" && (await attr(dead, "tabindex")) === null, "it stays a named picture, and is not a Tab stop");
  check((await text(`${failing} [data-slot=model-viewer-message]`)) === "The 3D model could not be loaded.", "a sentence says what happened");
  check((await opacity(`${failing} [data-slot=model-viewer-poster]`)) === "1", "the poster stays");
  check((await count(`${failing} [data-slot=model-viewer-controls]`)) === 0 && (await count(`${failing} canvas`)) === 0, "there are no controls and no canvas left behind");
  check((await text("[data-testid=model-failure]")) === "the project was told", "the project is told");
  await kit.axe(broken, "the viewer that failed");

  // ---- A browser without WebGL, on an Android phone: the still and a sentence, and the hand-off to Scene Viewer.
  const stub = await page.evaluateOnNewDocument(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type === "webgl2" || type === "webgl" ? null : (original as (...values: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  const agent = await page.browser().userAgent();
  await page.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-lab-ready]", { timeout: 60_000 });
  await sleep(600);
  const states = await page.evaluate(() => [...document.querySelectorAll("[data-slot=model-viewer]")].map((node) => node.getAttribute("data-state")));
  check(states.length === 5 && states.every((state) => state === "unsupported"), `without WebGL every viewer says so (${states.join(", ")})`);
  check((await text(`${viewer} [data-slot=model-viewer-message]`)) === "This browser cannot show 3D here.", "in a sentence, on the poster");
  check((await attr(surface, "role")) === "img" && (await attr(surface, "aria-label")) === "A clay vase with a painted belt" && (await count("[data-slot=model-viewer] canvas")) === 0, "the viewer is a named picture and makes no canvas");
  const link = `${viewer} [data-slot=model-viewer-ar]`;
  const intent = (await attr(link, "href")) ?? "";
  const origin = await page.evaluate(() => window.location.origin);
  check((await attr(link, "data-platform")) === "sceneviewer" && (await text(link)) === "View in your space", "on Android the hand-off to AR is offered, by name");
  check(
    intent.startsWith(`intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(`${origin}/models/vase.glb`)}&mode=ar_preferred&title=A+clay+vase#Intent;scheme=https;`) && intent.includes("S.browser_fallback_url=") && intent.endsWith(";end;"),
    `it is a Scene Viewer intent for the glTF file at its absolute address (${intent.slice(0, 90)})`,
  );
  check((await count(`${cloud} [data-slot=model-viewer-ar]`)) === 0, "a viewer that was not given an AR file offers nothing");
  await kit.axe("main", "the page without WebGL");
  await page.removeScriptToEvaluateOnNewDocument(stub.identifier);

  // ---- An iPhone: AR Quick Look, opened from a link whose one child is a picture.
  await page.setUserAgent(agent);
  const quick = await page.evaluateOnNewDocument(() => {
    const supports = DOMTokenList.prototype.supports;
    DOMTokenList.prototype.supports = function (this: DOMTokenList, token: string) {
      return token === "ar" ? true : supports.call(this, token);
    };
    const opened: string[] = [];
    (window as unknown as { __opened: string[] }).__opened = opened;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      opened.push(`${this.rel} ${new URL(this.href).pathname} ${this.children.length} ${this.firstElementChild?.tagName ?? ""}`);
    };
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-lab-ready]", { timeout: 60_000 });
  await sleep(600);
  check((await attr(link, "data-platform")) === "quicklook" && (await attr(link, "rel")) === "ar" && ((await attr(link, "href")) ?? "").endsWith("/models/vase.usdz"), "where the browser has AR Quick Look the link goes to the USDZ file");
  const address = await page.evaluate(() => window.location.href);
  await kit.click(link);
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  check(opened.length === 1 && opened[0] === "ar /models/vase.usdz 1 IMG", `pressing it opens Quick Look in place, through a link that holds one picture (${opened.join(" | ")})`);
  check((await page.evaluate(() => window.location.href)) === address, "and the page does not navigate away");
  await page.removeScriptToEvaluateOnNewDocument(quick.identifier);
}
