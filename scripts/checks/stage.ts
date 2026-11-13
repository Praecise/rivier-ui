// Checks: film-stage, with the scrubber, scene strip, captions and hotspots it composes (site/src/app/stage).

import type { Kit } from "../smoke-kit.ts";

export const route = "/stage";

type Frame = { time: string; html: string; layers: { id: string | null; opacity: string; inert: boolean }[]; caption: string };
type StageWindow = { __filmStage?: Record<string, { renderAt: (time: number) => Promise<number>; play: () => void; scenes: () => { id: string; start: number; duration: number }[]; clock: { now: () => number; running: () => boolean } } | undefined> };

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const number = async (selector: string): Promise<number> => Number(await text(selector));
  const near = (value: number, target: number, within = 0.05): boolean => Math.abs(value - target) <= within;
  const pointAt = async (selector: string, fraction: number): Promise<{ x: number; y: number }> =>
    page.evaluate(
      (s, f) => {
        const element = document.querySelector(s) as HTMLElement;
        element.scrollIntoView({ block: "center", behavior: "instant" });
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width * f, y: rect.top + rect.height / 2 };
      },
      selector,
      fraction,
    );
  const press = async (selector: string, fraction: number): Promise<void> => {
    const point = await pointAt(selector, fraction);
    if (kit.phone) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await sleep(250);
  };
  const shape = (selector: string): Promise<number> =>
    page.evaluate((s) => {
      const rect = document.querySelector(s)?.getBoundingClientRect();
      return rect && rect.height > 0 ? rect.width / rect.height : 0;
    }, selector);
  /** The scenes on stage, bottom first: which, how opaque, and whether it is the held one. */
  const layers = (stage: string): Promise<{ id: string | null; opacity: number; inert: boolean }[]> =>
    page.evaluate(
      (s) => [...document.querySelectorAll<HTMLElement>(`${s} [data-slot=film-stage-scene]`)].map((node) => ({ id: node.getAttribute("data-scene"), opacity: Number(getComputedStyle(node).opacity), inert: node.inert })),
      stage,
    );
  /** The sound element: where it is, whether it plays, whether it is muted. */
  const sound = (stage: string): Promise<{ time: number; paused: boolean; muted: boolean; rate: number }> =>
    page.evaluate((s) => {
      const audio = document.querySelector<HTMLAudioElement>(`${s} audio`);
      return { time: audio?.currentTime ?? -1, paused: audio?.paused ?? true, muted: audio?.muted ?? false, rate: audio?.playbackRate ?? 0 };
    }, stage);

  // ---- The stage: a named group with a transport.
  const demo = await kit.demo("Film stage");
  const stage = `${demo} [data-slot=film-stage]`;
  const frame = `${stage} [data-slot=film-stage-frame]`;
  const play = `${stage} [data-slot=film-stage-play]`;
  const clock = "[data-testid=film-time]";
  const running = "[data-testid=film-running]";
  const caption = `${frame} [data-slot=captions-text]`;
  check((await attr(stage, "role")) === "group" && (await attr(stage, "aria-label")) === "A film made of markup" && (await attr(stage, "tabindex")) === "0", "the stage is a named group that takes focus");
  check((await attr(`${stage} [data-slot=film-stage-controls]`, "role")) === "group" && (await attr(`${stage} [data-slot=film-stage-controls]`, "aria-label")) === "Playback controls", "its controls are a named group");
  check((await attr(play, "aria-label")) === "Play" && (await text(running)) === "still" && (await number(clock)) === 0 && (await attr(stage, "data-state")) === "paused", "nothing plays by itself, and the play button says what it will do");
  check(near(await shape(frame), 16 / 9, 0.03), `the frame holds its shape (${(await shape(frame)).toFixed(3)})`);
  check(JSON.stringify(await layers(stage)) === JSON.stringify([{ id: "title", opacity: 1, inert: false }]), "only the scene for the moment is mounted");
  check((await text(`${stage} [data-slot=film-stage-time]`)) === "0:00 / 0:20", `the time is shown as a clock, with the sum of the scenes as the length (${await text(`${stage} [data-slot=film-stage-time]`)})`);
  check((await text(caption)) === "A film made of markup." && (await attr(caption, "lang")) === "en", "captions inside the frame follow the stage's clock");
  await page.waitForFunction((s) => (document.querySelector<HTMLAudioElement>(`${s} audio`)?.readyState ?? 0) >= 1, { timeout: 10_000 }, stage).catch(() => {});
  check((await sound(stage)).paused && (await attr(`${stage} [data-slot=film-stage-mute]`, "disabled")) === null, "narration is attached, silent until the film plays, and mute is offered");

  // The bound scrubber.
  const seek = `${stage} [data-slot=scrubber] [role=slider]`;
  check((await attr(seek, "aria-label")) === "Seek" && (await attr(seek, "aria-valuemax")) === "20", "the scrubber is a named slider over the whole film");
  check((await attr(seek, "aria-valuetext")) === "0 seconds of 20 seconds, Title" && (await count(`${stage} [data-slot=scrubber-mark]`)) === 3, `the scenes are its marks, by name (${await attr(seek, "aria-valuetext")})`);

  // Keyboard, with focus on the stage.
  check(await kit.focus(stage), "the stage takes focus");
  await keys("ArrowRight");
  check((await number(clock)) === 5, `Right goes forward five seconds, also in a right-to-left page (${await text(clock)})`);
  check(JSON.stringify((await layers(stage)).map((layer) => layer.id)) === '["circle"]' && (await attr(`${frame} [data-testid=circle]`, "data-x")) === "40.00", "the scene for that moment is on stage, drawn from its own time");
  check((await text(caption)) === "Each scene draws itself from its own time.", "the caption is the line for that moment");
  check((await count(`${frame} [data-slot=hotspot]`)) === 1 && (await attr(`${frame} [data-slot=hotspot]`, "aria-label")) === "The circle" && (await kit.announced()).includes("The circle"), "a hotspot appears at its moment and is announced");
  check((await text(`${stage} [data-slot=hotspot-list-item]`)) === "The circle", "the same choice is in the list");
  check(near((await sound(stage)).time, 5, 0.03), `the narration is at the same moment (${(await sound(stage)).time})`);
  await kit.screenshot("stage-scene");
  await keys("ArrowLeft");
  check((await number(clock)) === 0, "Left goes back");
  await keys("ArrowLeft");
  check((await number(clock)) === 0, "it stops at the start");
  await keys("End");
  check((await number(clock)) === 20 && JSON.stringify((await layers(stage)).map((layer) => layer.id)) === '["end"]' && (await text(`${stage} [data-slot=film-stage-elapsed]`)) === "0:20", "End goes to the end: the last frame of the last scene");
  await keys("Home");
  check((await number(clock)) === 0, "Home goes to the start");
  await keys("n");
  check((await number(clock)) === 4 && (await kit.announced()).includes("A circle crosses, scene 2 of 4"), `N goes to the start of the next scene and says which it is (${await text(clock)})`);
  await keys("ArrowRight", "p");
  check((await number(clock)) === 4, "P, more than a second into a scene, goes back to that scene's start");
  await keys("p");
  check((await number(clock)) === 0 && (await kit.announced()).includes("Title, scene 1 of 4"), "and pressed again at once, to the scene before");

  // Play and pause: the clock runs at the speed asked for, and the narration with it.
  await keys("Space");
  await sleep(400);
  const first = await page.evaluate((s) => ({ at: performance.now(), time: Number(document.querySelector(s)?.textContent) }), clock);
  await sleep(1000);
  const second = await page.evaluate((s) => ({ at: performance.now(), time: Number(document.querySelector(s)?.textContent) }), clock);
  const speed = (second.time - first.time) / ((second.at - first.at) / 1000);
  check((await attr(play, "aria-label")) === "Pause" && (await text(running)) === "running" && (await attr(stage, "data-state")) === "playing", "Space plays, and the button's name becomes Pause");
  check(speed > 0.8 && speed < 1.2, `the clock advances in real time (${speed.toFixed(2)} seconds a second)`);
  const together = await page.evaluate((s, c) => ({ audio: document.querySelector<HTMLAudioElement>(`${s} audio`)?.currentTime ?? -1, paused: document.querySelector<HTMLAudioElement>(`${s} audio`)?.paused ?? true, clock: Number(document.querySelector(c)?.textContent) }), stage, clock);
  check(!together.paused && near(together.audio, together.clock, 0.4), `the narration plays in step with the clock (sound ${together.audio.toFixed(2)}, clock ${together.clock.toFixed(2)})`);

  // Hidden tab: the clock holds, and goes on when the tab is back.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await sleep(200);
  const held = await number(clock);
  await sleep(500);
  check((await text(running)) === "still" && (await number(clock)) === held && (await attr(stage, "data-held")) !== null, `while the tab is hidden the clock holds (${held})`);
  check((await attr(play, "aria-label")) === "Pause" && (await sound(stage)).paused, "it is still asked to play, and the narration waits too");
  await page.evaluate(() => {
    delete (document as unknown as Record<string, unknown>)["visibilityState"];
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await sleep(500);
  check((await text(running)) === "running" && (await number(clock)) > held, "back in view of the tab it goes on from there");

  // Off screen: the same.
  await page.evaluate(() => {
    document.body.style.paddingBottom = "4000px";
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await sleep(400);
  const away = await number(clock);
  await sleep(400);
  check((await text(running)) === "still" && (await number(clock)) === away, "scrolled off screen the clock holds");
  await page.evaluate(() => {
    document.body.style.paddingBottom = "";
  });
  await kit.demo("Film stage");
  await sleep(400);
  check((await text(running)) === "running", "and goes on when the stage is back on screen");
  await kit.focus(stage);
  await keys("k");
  const stopped = await number(clock);
  await sleep(300);
  check((await attr(play, "aria-label")) === "Play" && (await number(clock)) === stopped && (await sound(stage)).paused, "K pauses the clock and the narration");

  // Speed and sound.
  const rate = `${stage} [data-slot=film-stage-rate]`;
  await kit.focus(rate);
  await keys("Space");
  check((await attr(play, "aria-label")) === "Play" && (await attr(rate, "aria-label")) === "Playback speed: 1.25×" && (await kit.announced()).includes("Playback speed: 1.25×"), "Space on a button presses that button only: the speed goes to the next and is announced");
  await kit.click(play);
  await sleep(600);
  check((await sound(stage)).rate === 1.25, "the narration plays at the clock's speed");
  await kit.click(play);
  await kit.click(rate);
  await kit.click(rate);
  await kit.click(rate);
  await kit.click(rate);
  check((await attr(rate, "aria-label")) === "Playback speed: 1×", "the speeds go round");
  const mute = `${stage} [data-slot=film-stage-mute]`;
  await kit.focus(stage);
  await keys("m");
  check((await attr(mute, "aria-pressed")) === "true" && (await sound(stage)).muted && (await kit.announced()).includes("Muted"), "with sound attached M mutes, and says so");
  await keys("m");
  check((await attr(mute, "aria-pressed")) === "false" && !(await sound(stage)).muted, "M again unmutes");

  // Seeking with the scrubber.
  await kit.focus(seek);
  await keys("Home", "ArrowRight", "ArrowRight");
  check((await number(clock)) === 10 && (await attr(seek, "aria-valuetext")) === "10 seconds of 20 seconds, Bars rise", `the scrubber seeks once for a key and names the scene (${await attr(seek, "aria-valuetext")})`);
  check((await text(caption)).length > 0 && (await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).direction, caption)) === "rtl", "a caption in a right-to-left script is laid out right to left");
  await press(`${stage} [data-slot=scrubber]`, 0.25);
  check(near(await number(clock), 5, 0.6), `pressing the bar goes there (${await text(clock)})`);
  check(near((await sound(stage)).time, await number(clock), 0.03), "and the narration goes with it");

  // The scene strip.
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const strip = `${stage} [data-slot=scene-strip]`;
  const item = `${strip} [data-slot=scene-strip-item]`;
  check((await attr(strip, "role")) === "toolbar" && (await attr(strip, "aria-label")) === "Scenes" && (await count(item)) === 4, "the scene strip lists the stage's scenes");
  check((await text(`${item}[aria-current=true] [data-slot=scene-strip-label]`)) === "A circle crosses, playing" && (await text(`${item} [data-slot=scene-strip-length]`)) === "0:04", "it marks the scene on stage and shows each length");
  const before = await number(clock);
  await kit.focus(`${item}[tabindex="0"]`);
  await keys(forward);
  check((await kit.focused()).startsWith("Bars rise") && (await number(clock)) === before, "an arrow key in the strip moves between scenes and does not seek");
  await keys("End", "Enter");
  check((await number(clock)) === 15 && (await text(`${item}[aria-current=true] [data-slot=scene-strip-label]`)) === "The end, playing", "pressing a scene goes to its start");
  check(near((await sound(stage)).time, 15, 0.03) && (await text(caption)) === "The last line.", "the narration and the captions go with it");
  await keys("Home", "Enter");
  check((await number(clock)) === 0, "Home and Enter go back to the first scene");

  // Captions switch, hotspots.
  const cc = `${stage} [data-slot=film-stage-captions-button]`;
  check((await attr(cc, "aria-label")) === "Captions" && (await attr(cc, "aria-pressed")) === "true", "the captions button is a toggle, on by default");
  await kit.click(cc);
  check((await attr(cc, "aria-pressed")) === "false" && (await count(caption)) === 0, "pressing it hides the captions");
  await kit.click(cc);
  check((await count(caption)) === 1, "and shows them again");
  check((await count(`${frame} [data-slot=hotspot]`)) === 0 && (await text(`${stage} [data-slot=hotspot-list]`)) === "Nothing to choose at this moment.", "outside its moments a hotspot is absent, and the list says so");
  await kit.focus(stage);
  await keys("ArrowRight");
  await kit.click(`${frame} [data-slot=hotspot]`);
  check((await text("[data-testid=film-chosen]")) === "The circle" && (await attr(play, "aria-label")) === "Play", "pressing a hotspot chooses it and does not play");
  if (kit.phone) {
    const height = await page.evaluate((s) => document.querySelector(s)?.getBoundingClientRect().height ?? 0, play);
    check(height >= 40, `on a touch screen the controls are at least 40px (${height}px)`);
  }
  await kit.axe(demo, "the film stage with its scrubber, captions, hotspots and scene strip");

  // ---- Controlled by the page.
  const controlled = await kit.demo("Controlled");
  const cstage = `${controlled} [data-slot=film-stage]`;
  const cseek = `${cstage} [role=slider]`;
  const cplay = `${cstage} [data-slot=film-stage-play]`;
  const ctime = "[data-testid=controlled-time]";
  check((await number(ctime)) === 2 && Number(await attr(cseek, "aria-valuenow")) === 2, "a controlled stage shows the page's time");
  check(near(await shape(`${cstage} [data-slot=film-stage-frame]`), 4 / 3, 0.03), `the frame holds the shape it was given (${(await shape(`${cstage} [data-slot=film-stage-frame]`)).toFixed(3)})`);
  await kit.clickText(`${controlled} button`, "Go to 0:07");
  check(Number(await attr(cseek, "aria-valuenow")) === 7 && JSON.stringify((await layers(cstage)).map((layer) => layer.id)) === '["circle"]', "it follows when the page changes the time");
  await kit.focus(cstage);
  await keys("ArrowRight");
  check((await number(ctime)) === 8, "its keys ask the page for the change, by the step it was given");
  check((await attr(`${cstage} [data-slot=film-stage-mute]`, "disabled")) !== null, "with no sound attached mute is disabled");
  await keys("m");
  check((await attr(`${cstage} [data-slot=film-stage-mute]`, "aria-pressed")) === "false", "and M does nothing");
  await kit.clickText(`${controlled} button`, "Start it");
  await sleep(700);
  check((await text("[data-testid=controlled-playing]")) === "yes" && (await attr(cplay, "aria-label")) === "Pause" && (await number(ctime)) > 8.2, `the page can start it (${await text(ctime)})`);
  await kit.click(cplay);
  const cheld = await number(ctime);
  await sleep(300);
  check((await text("[data-testid=controlled-playing]")) === "no" && (await number(ctime)) === cheld, "and its own button asks the page to stop it");

  // A crossfade is worked out from the time: seeking into the middle of one shows the middle of it.
  await press(`${cstage} [data-slot=scrubber]`, 4.25 / 20);
  const into = await number(ctime);
  const fading = await layers(cstage);
  if (into > 4.04 && into < 4.46) {
    check(fading.length === 2 && fading[0]?.id === "title" && fading[0].inert && fading[0].opacity === 1 && fading[1]?.id === "circle" && near(fading[1].opacity, (into - 4) / 0.5, 0.03), `in a crossfade the scene before is held underneath, inert, and the new one is as opaque as the time says (${into}: ${fading[1]?.opacity})`);
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await sleep(200);
    check(JSON.stringify(await layers(cstage)) === JSON.stringify([{ id: "circle", opacity: 1, inert: false }]), "under reduced motion a crossfade is a cut");
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await sleep(200);
  } else {
    check(false, `the press landed inside the crossfade (${into})`);
  }
  await kit.axe(controlled, "the controlled stage");

  // ---- Drawn on request: the export path.
  const drawn = await kit.demo("Drawn on request");
  const dstage = `${drawn} [data-slot=film-stage]`;
  const dframe = `${dstage} [data-slot=film-stage-frame]`;
  const dclock = "[data-testid=drawn-time]";
  check((await attr(dstage, "data-deterministic")) !== null && (await attr(`${dstage} [data-slot=film-stage-play]`, "disabled")) !== null, "in this mode the stage says so, and play is disabled");
  check(await page.evaluate(() => typeof (window as unknown as StageWindow).__filmStage?.["demo"]?.renderAt === "function"), "the page exposes the stage it was asked to, by name");
  check(await page.evaluate(() => Object.keys((window as unknown as StageWindow).__filmStage ?? {}).join(",") === "demo"), "and no other stage");
  await page.evaluate(() => (window as unknown as StageWindow).__filmStage?.["demo"]?.play());
  await sleep(600);
  check((await number(dclock)) === 0 && (await text("[data-testid=drawn-running]")) === "still" && (await page.evaluate(() => (window as unknown as StageWindow).__filmStage?.["demo"]?.clock.running())) === false, "the clock does not advance by itself, even when asked to play");
  check((await page.evaluate((s) => getComputedStyle(document.querySelector(s) as Element).transitionProperty, `${dstage} [data-slot=film-stage-play]`)) === "none", "transitions inside the stage are off");

  const capture = (order: number[]): Promise<Record<string, Frame>> =>
    page.evaluate(
      async (s, times) => {
        const out: Record<string, Frame> = {};
        // The frame as text, with attributes in a fixed order and styles as the browser parsed them: the order
        // of attributes depends on when each was added, and a style written by the server is spelled
        // differently from the same style set in the browser. Neither is something anyone can see.
        const write = (node: Node): string => {
          if (!(node instanceof Element)) return node.textContent ?? "";
          const attributes = [...node.attributes].map((attribute) => `${attribute.name}="${attribute.name === "style" ? (node as HTMLElement).style.cssText : attribute.value}"`).sort().join(" ");
          return `<${node.tagName.toLowerCase()} ${attributes}>${[...node.childNodes].map(write).join("")}</${node.tagName.toLowerCase()}>`;
        };
        const stageHandle = (window as unknown as StageWindow).__filmStage?.["demo"];
        if (!stageHandle) return out;
        for (const time of times) {
          const at = await stageHandle.renderAt(time);
          // Read at once, in the same task: the frame must already be in the page.
          const box = document.querySelector(s) as HTMLElement;
          out[String(time)] = {
            time: `${at} ${stageHandle.clock.now()}`,
            html: write(box),
            layers: [...box.querySelectorAll<HTMLElement>("[data-slot=film-stage-scene]")].map((node) => ({ id: node.getAttribute("data-scene"), opacity: getComputedStyle(node).opacity, inert: node.inert })),
            caption: box.querySelector("[data-slot=captions-text]")?.textContent ?? "",
          };
        }
        return out;
      },
      dframe,
      order,
    );
  const one = await capture([4.25, 12.3, 0, 19.99, 4, 7.5, 14.999, 15.1, 20, 99, -3]);
  const two = await capture([15.1, -3, 7.5, 20, 4.25, 99, 0, 14.999, 12.3, 4, 19.99]);
  const keysOf = Object.keys(one).sort();
  const differing = keysOf.filter((key) => JSON.stringify(one[key]) !== JSON.stringify(two[key]));
  check(keysOf.length === 11 && differing.length === 0, `a moment is drawn the same whatever was drawn before it: eleven moments, twice, in two orders${differing.length > 0 ? ` (differs at ${differing.join(", ")})` : ""}`);
  check(one["4.25"]?.time === "4.25 4.25" && one["99"]?.time === "20 20" && one["-3"]?.time === "0 0", "renderAt resolves with the moment drawn, kept inside the film, and the clock is there when it resolves");
  check(JSON.stringify(one["4.25"]?.layers) === JSON.stringify([{ id: "title", opacity: "1", inert: true }, { id: "circle", opacity: "0.5", inert: false }]), `halfway through a crossfade the new scene is half opaque (${JSON.stringify(one["4.25"]?.layers)})`);
  check(JSON.stringify(one["15.1"]?.layers.map((layer) => `${layer.id} ${layer.opacity}`)) === '["bars 1","end 0.2"]' && one["14.999"]?.layers.length === 1 && one["4"]?.layers[1]?.opacity === "0", "each scene's crossfade starts at its own start");
  check(one["7.5"]?.caption === "Each scene draws itself from its own time." && (one["12.3"]?.caption ?? "").length > 0 && one["20"]?.caption === "", "captions are part of the frame for a moment");
  check((one["7.5"]?.html ?? "").includes('data-x="90.00"'), "the scene's content is drawn from the moment asked for");
  const listed = await page.evaluate(() => (window as unknown as StageWindow).__filmStage?.["demo"]?.scenes() ?? []);
  check(listed.map((scene) => `${scene.id}@${scene.start}+${scene.duration}`).join(" ") === "title@0+4 circle@4+6 bars@10+5 end@15+5", "the handle lists where each scene starts, for an exporter");
  await sleep(400);
  check((await number(dclock)) === 19.99, "and the clock is still where the last request put it");
  await kit.clickText(`${drawn} button`, "Draw it");
  check((await text("[data-testid=drawn-at]")) === "7.00" && (await number(dclock)) === 7, "the project's own code draws a moment through the handle");
  check(near(await shape(dframe), 16 / 9, 0.03), "the frame holds its shape here too");
  await kit.screenshot("stage-drawn");
  await kit.axe(drawn, "the stage drawn on request");

  // ---- One clock for a stage and for parts outside it; several sounds; a loop; the scene buttons.
  const round = await kit.demo("One clock, parts outside, several sounds, a loop");
  const rstage = `${round} [data-slot=film-stage]`;
  const beside = "[data-testid=round-beside]";
  const rclock = "[data-testid=round-time]";
  const rplay = `${rstage} [data-slot=film-stage-play]`;
  const rnext = `${rstage} [data-slot=film-stage-next-scene]`;
  const rprevious = `${rstage} [data-slot=film-stage-previous-scene]`;
  const changes = (): Promise<string> => text("[data-testid=round-changes]");
  type Sound = { time: number; paused: boolean; muted: boolean; volume: number };
  const sounds = (): Promise<Record<string, Sound>> =>
    page.evaluate(
      (s) => Object.fromEntries([...document.querySelectorAll<HTMLAudioElement>(`${s} audio`)].map((audio) => [audio.dataset["sound"] ?? "", { time: audio.currentTime, paused: audio.paused, muted: audio.muted, volume: audio.volume }])),
      rstage,
    );
  const silent: Sound = { time: -1, paused: true, muted: false, volume: -1 };
  const rstrip = `${beside} [data-slot=scene-strip-item]`;
  check((await page.evaluate((s, b) => !(document.querySelector(s) as Element).contains(document.querySelector(b)), rstage, beside)) && (await count(rstrip)) === 3, "a scene rstrip outside the stage element lists the scenes of the provider it shares");
  check((await number(rclock)) === 0 && (await text("[data-testid=round-scene]")) === "1" && (await text(`${rstage} [data-slot=film-stage-time]`)) === "0:00 / 0:06", "the clock is read outside the stage as well as inside it");
  check((await changes()) === "", "the scene the stage starts on is not reported as a change");
  await page.waitForFunction((s) => [...document.querySelectorAll<HTMLAudioElement>(`${s} audio`)].every((audio) => audio.readyState >= 1), { timeout: 10_000 }, rstage).catch(() => {});
  let heard = await sounds();
  check((await count(`${rstage} audio`)) === 4 && (await attr(`${rstage} [data-slot=film-stage-mute]`, "disabled")) === null, "four sounds are attached at once, and mute is offered");
  check(heard["bed"]?.volume === 0.3 && heard["one"]?.volume === 1, `a sound has the loudness it was given (${heard["bed"]?.volume})`);
  check(Object.values(heard).every((sound) => sound.paused), "all are silent until the film plays");

  // The scene keys and the event.
  await kit.focus(rstage);
  await keys("n");
  check((await number(rclock)) === 2 && (await text("[data-testid=round-scene]")) === "2" && (await changes()) === "first>second#1", `a change of scene is reported, with the scene before it and its place (${await changes()})`);
  check((await kit.announced()).includes("Second, scene 2 of 3") && (await text(`${rstrip}[aria-current=true] [data-slot=scene-strip-label]`)).startsWith("Second"), "it is read out, and the rstrip outside the stage marks it");

  // Each sound has its own start and length.
  await keys("ArrowRight", "ArrowRight");
  heard = await sounds();
  check((await number(rclock)) === 3 && near(heard["bed"]?.time ?? -1, 3, 0.03) && near(heard["two"]?.time ?? -1, 0.5, 0.03), `a seek moves every sound to its own moment: the bed to the clock's, a clip to the clock's less its start (bed ${heard["bed"]?.time}, clip ${heard["two"]?.time})`);
  check(heard["one"]?.time === 0 && heard["three"]?.time === 0, "a clip whose moment is not now is left alone");
  await kit.click(rplay);
  await sleep(600);
  heard = await sounds();
  const at = await number(rclock);
  check(!(heard["bed"] ?? silent).paused && !(heard["two"] ?? silent).paused && near(heard["two"]?.time ?? -1, at - 2.5, 0.4) && near(heard["bed"]?.time ?? -1, at, 0.4), `playing, the bed and the clip whose moment it is play in step with the clock (clock ${at}, bed ${heard["bed"]?.time.toFixed(2)}, clip ${heard["two"]?.time.toFixed(2)})`);
  check((heard["one"] ?? silent).paused && (heard["three"] ?? silent).paused, "and the other clips wait");
  await kit.focus(rstage);
  await keys("m");
  check(Object.values(await sounds()).every((sound) => sound.muted) && (await attr(`${rstage} [data-slot=film-stage-mute]`, "aria-pressed")) === "true", "M mutes every sound");
  await keys("m");
  check(Object.values(await sounds()).every((sound) => !sound.muted), "and unmutes them all");
  await page.waitForFunction((s) => Number(document.querySelector(s)?.textContent) > 4.25 && Number(document.querySelector(s)?.textContent) < 5, { timeout: 6000 }, rclock).catch(() => {});
  heard = await sounds();
  const later = await number(rclock);
  check((heard["two"] ?? silent).paused && !(heard["three"] ?? silent).paused && near(heard["three"]?.time ?? -1, later - 4, 0.4), `a clip stops at the end of its length, and the next starts at its own start (clock ${later}, clip ${heard["three"]?.time.toFixed(2)})`);
  check((await changes()).endsWith("second>third#2"), "a change of scene made by playing is reported too");

  // Loop: at the end it starts again, still playing.
  await page.waitForFunction((s) => Number(document.querySelector(s)?.textContent) < 1.5, { timeout: 6000 }, rclock).catch(() => {});
  await sleep(300);
  heard = await sounds();
  const again = await number(rclock);
  check(again < 2.5 && (await text("[data-testid=round-running]")) === "running" && (await attr(rplay, "aria-label")) === "Pause", `with loop the film starts again at its end and goes on playing (${again})`);
  check((await changes()).endsWith("third>first#0") && (await text("[data-testid=round-scene]")) === "1", `going round is a change of scene (${await changes()})`);
  check(!(heard["bed"] ?? silent).paused && near(heard["bed"]?.time ?? -1, again, 0.4) && (heard["three"] ?? silent).paused, `and the sounds go round with it (clock ${again}, bed ${heard["bed"]?.time.toFixed(2)})`);
  await kit.click(rplay);
  check((await attr(rplay, "aria-label")) === "Play" && Object.values(await sounds()).every((sound) => sound.paused), "pausing pauses every sound");

  // The scene buttons.
  await kit.focus(rstage);
  await keys("Home");
  check((await attr(rprevious, "aria-label")) === "Previous scene" && (await attr(rnext, "aria-label")) === "Next scene", "there are buttons for the scene before and the scene after");
  check((await attr(rprevious, "aria-disabled")) === "true" && (await attr(rnext, "aria-disabled")) === null, "at the very start the first says it is unavailable");
  await kit.focus(rnext);
  await keys("Enter");
  check((await number(rclock)) === 2 && (await kit.focusIs(rnext)), "Next scene goes to the start of the next scene and keeps focus");
  await keys("Enter");
  check((await number(rclock)) === 4 && (await kit.announced()).includes("Scene 3 of 3"), "a scene with no name is read out by its place");
  check((await attr(rnext, "aria-disabled")) === "true" && (await kit.focusIs(rnext)), "on the last scene it says it is unavailable, and still has focus");
  await keys("Enter");
  check((await number(rclock)) === 4, "and a press does nothing");
  await kit.click(rprevious);
  check((await number(rclock)) === 2, "Previous scene, at the start of a scene, goes to the scene before");
  await kit.focus(rstage);
  await keys("ArrowRight", "ArrowRight", "ArrowRight");
  await kit.click(rprevious);
  check((await number(rclock)) === 2, "more than a second in, it goes to the start of the scene on stage");
  await kit.click(rprevious);
  check((await number(rclock)) === 0 && (await attr(rprevious, "aria-disabled")) === "true", "and from there to the scene before");
  if (kit.phone) {
    const size = await page.evaluate((s) => document.querySelector(s)?.getBoundingClientRect().height ?? 0, rnext);
    check(size >= 40, `on a touch screen the scene buttons are at least 40px (${size}px)`);
  }

  // A part outside the stage drives it.
  await kit.click(`${rstrip}:nth-child(3)`);
  check((await number(rclock)) === 4 && (await page.evaluate((s) => document.querySelector(`${s} [data-slot=film-stage-scene]`)?.getAttribute("data-scene"), rstage)) === "third", "pressing a scene in the rstrip outside the stage puts that scene on stage");
  await kit.axe(round, "the stage with parts outside it");
  await kit.screenshot("stage-round");

  // ---- Drawn on request, with pictures that are lazy, hidden, broken, or never arrive.
  const pictures = await kit.demo("Drawn on request: pictures that load late or never");
  const result = "[data-testid=pictures-result]";
  const loaded = (): Promise<string> =>
    page.evaluate(() =>
      ["far", "hidden"]
        .map((name) => {
          const picture = document.querySelector<HTMLImageElement>(`[data-testid=pictures-${name}]`);
          return picture ? `${name}: ${picture.complete && picture.naturalWidth > 0 ? "loaded" : "not loaded"}, ${picture.loading}` : `${name}: absent`;
        })
        .join("; "),
    );
  await sleep(1200);
  check((await loaded()) === "far: not loaded, lazy; hidden: not loaded, lazy", `a lazy picture that is clipped out of view, and one inside something not displayed, do not load by themselves (${await loaded()})`);
  await kit.clickText(`${pictures} button`, "Draw the late pictures");
  await page.waitForFunction((s) => document.querySelector(s)?.textContent !== "drawing", { timeout: 15_000 }, result).catch(() => {});
  check((await text(result)) === "drawn 1", `renderAt resolves all the same (${await text(result)})`);
  check((await loaded()) === "far: loaded, eager; hidden: loaded, eager", `having made them load: by the time it resolves they are in (${await loaded()})`);
  check((await page.evaluate(() => (document.querySelector("[data-testid=pictures-missing]") as HTMLImageElement).naturalWidth)) === 0, "a picture whose file is broken does not hold it up");
  await kit.clickText(`${pictures} button`, "Draw the one that never arrives");
  await page.waitForFunction((s) => document.querySelector(s)?.textContent !== "drawing", { timeout: 15_000 }, result).catch(() => {});
  const failure = await text(result);
  const took = Number(/^failed after ([\d.]+)s/.exec(failure)?.[1] ?? "99");
  check(/: FilmStage renderAt\(5\): a picture was not ready after 700 ms: <img src="[^"]*\/stall\?picture" alt="Never arrives"> in scene "stalled"$/.test(failure), `a picture that never arrives makes renderAt reject with an error that names it and its scene (${failure})`);
  check(took >= 0.6 && took <= 3, `after the time it was given, not for ever (${took}s)`);
  await kit.clickText(`${pictures} button`, "Draw the late pictures");
  await page.waitForFunction((s) => document.querySelector(s)?.textContent !== "drawing", { timeout: 15_000 }, result).catch(() => {});
  check((await text(result)) === "drawn 1" && (await count("[data-testid=pictures-stalled]")) === 0, "and the stage can go on to draw other moments");
  await kit.axe(pictures, "the stage with late pictures");

  await kit.axe("main", "after the checks");
}
