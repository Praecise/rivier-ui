// Checks: scrubber, video-player, captions (with transcript), audio-player (site/src/app/players).

import type { Kit } from "../smoke-kit.ts";

export const route = "/players";

export async function run(kit: Kit): Promise<void> {
  const { check, keys, text, attr, count, page, sleep } = kit;
  const now = async (selector: string): Promise<number> => Number(await attr(selector, "aria-valuenow"));
  /** The current time of the media element inside a player, in seconds. */
  const clock = (player: string): Promise<number> => page.evaluate((s) => document.querySelector<HTMLMediaElement>(`${s} video, ${s} audio`)?.currentTime ?? -1, player);
  const near = (value: number, target: number, within = 1.5): boolean => Math.abs(value - target) <= within;
  /** A point along an element, as a fraction of its width from the left. */
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

  // ---- Scrubber: a slider over time, drawn left to right in every language.
  const scrubber = await kit.demo("Scrubber");
  const thumb = `${scrubber} [data-slot=scrubber]:first-of-type [role=slider]`;
  const first = `${scrubber} [data-slot=scrubber]`;
  check((await attr(thumb, "aria-label")) === "Seek", "the scrubber's thumb is a slider with a name");
  check((await attr(thumb, "aria-valuemin")) === "0" && (await attr(thumb, "aria-valuemax")) === "200" && (await now(thumb)) === 65, "it states its range and its value (uncontrolled start)");
  check((await attr(thumb, "aria-valuetext")) === "1 minute 5 seconds of 3 minutes 20 seconds, The climb", `it says the time and the chapter in words (${await attr(thumb, "aria-valuetext")})`);
  check((await attr(first, "dir")) === "ltr", "time runs left to right whatever the page's direction");
  check((await count(`${scrubber} [data-slot=scrubber-mark]`)) === 2 && (await count(`${scrubber} [data-slot=scrubber-buffered]`)) === 1, "chapters and the loaded range are drawn");
  check(await kit.focus(thumb), "the thumb takes focus");
  await keys("ArrowRight");
  check((await now(thumb)) === 70 && (await text("[data-testid=scrub-committed]")) === "70", `Right goes forward five seconds and commits, also in a right-to-left page (${await now(thumb)})`);
  await keys("ArrowLeft", "ArrowLeft");
  check((await now(thumb)) === 60, "Left goes back");
  await keys("PageUp");
  check((await now(thumb)) === 90, "Page Up goes forward thirty seconds");
  await keys("Home");
  check((await now(thumb)) === 0 && (await text("[data-testid=scrub-committed]")) === "0", "Home goes to the start");
  await keys("ArrowLeft");
  check((await now(thumb)) === 0, "it stops at the start");
  await keys("End");
  check((await now(thumb)) === 200 && (await text("[data-testid=scrub-changed]")) === "200", "End goes to the end");
  check((await count(`${scrubber} [data-slot=scrubber-preview]`)) === 1 && (await attr(`${scrubber} [data-slot=scrubber-preview]`, "aria-hidden")) === "true", "with keyboard focus the preview shows, hidden from assistive technology");
  const inside = await page.evaluate((s) => {
    const bar = document.querySelector(`${s} [data-slot=scrubber]`)?.getBoundingClientRect();
    const preview = document.querySelector(`${s} [data-slot=scrubber-preview]`)?.getBoundingClientRect();
    return bar && preview ? preview.left >= bar.left - 1 && preview.right <= bar.right + 1 : false;
  }, scrubber);
  check(inside, "at the end of the bar the preview stays inside its ends");
  check((await attr(`${scrubber} [data-slot=scrubber-sprite]`, "data-frame")) === "9", "the preview picture is the still for that moment");
  await kit.screenshot("scrubber-preview");

  await press(first, 0.5);
  check(near(await now(thumb), 100, 4) && near(Number(await text("[data-testid=scrub-committed]")), 100, 4), `pressing the bar seeks there once (${await now(thumb)})`);
  if (!kit.phone) {
    const point = await pointAt(first, 0.25);
    await page.mouse.move(point.x, point.y);
    await sleep(150);
    check((await text(`${scrubber} [data-slot=scrubber-preview-label]`)).includes("0:5"), `the preview follows the pointer (${await text(`${scrubber} [data-slot=scrubber-preview-label]`)})`);
    check((await attr(`${scrubber} [data-slot=scrubber-sprite]`, "data-frame")) === "2", "and shows the still under the pointer");
    await page.mouse.move(2, 2);
  }

  const controlled = `${scrubber} [aria-label="Position in the recording"]`;
  await kit.focus(controlled);
  await keys("ArrowRight", "ArrowRight");
  check((await text("[data-testid=scrub-clock]")) === "50" && (await now(controlled)) === 50, "a controlled scrubber follows its value");
  check((await attr(`${scrubber} [data-slot=scrubber][data-disabled]`, "data-disabled")) !== null, "with no length yet the bar is disabled");

  // ---- Audio player.
  const audio = await kit.demo("Audio player");
  const player = `${audio} [aria-label="A quiet tone, twenty seconds"]`;
  const wave = `${player} [data-slot=audio-player-waveform]`;
  check((await attr(player, "role")) === "group" && (await attr(player, "aria-label")) === "A quiet tone, twenty seconds", "the sound player is a named group");
  await page.waitForFunction((s) => document.querySelector(s)?.hasAttribute("data-peaks"), { timeout: 10_000 }, wave).catch(() => {});
  check((await count(`${wave} rect`)) === 64, `the waveform draws the peaks computed in the browser (${await count(`${wave} rect`)} bars)`);
  const sizes = await page.evaluate((s) => [...document.querySelectorAll(`${s} [data-slot=audio-player-waveform]`)].map((node) => Math.round(node.getBoundingClientRect().height)), audio);
  check(sizes.length === 2 && sizes[0] === sizes[1], `the flat placeholder holds the same height (${sizes.join(", ")})`);
  check((await attr(wave, "role")) === "slider" && (await attr(wave, "aria-label")) === "Seek" && (await attr(wave, "aria-valuemax")) === "20", "the waveform is the time slider");
  check((await attr(wave, "aria-valuetext")) === "0 seconds of 20 seconds", `it says the time in words (${await attr(wave, "aria-valuetext")})`);
  check((await attr(`${audio} [aria-label="A sound with no source yet"] [role=slider]`, "aria-disabled")) === "true", "without a sound the slider is disabled");
  check(await kit.focus(wave), "the waveform takes focus");
  await keys("ArrowRight", "ArrowRight");
  check(near(await clock(player), 10, 0.2), `Right goes forward five seconds, also in a right-to-left page (${await clock(player)})`);
  await keys("ArrowLeft");
  check(near(await clock(player), 5, 0.2), "Left goes back");
  await keys("End");
  check(near(await clock(player), 20, 0.2), "End goes to the end");
  await keys("Home");
  check((await clock(player)) === 0, "Home goes to the start");
  await press(wave, 0.5);
  check(near(await clock(player), 10, 1), `pressing the waveform seeks there (${await clock(player)})`);
  check((await text(`${player} [data-slot=captions-text]`)) === "Captions are drawn by the page." && (await attr(`${player} [data-slot=captions-text]`, "lang")) === "en", "inline captions show the line for that moment, with its language");
  check((await count(`${player} [aria-live]`)) === 0, "captions are not a live region");

  // Transcript.
  const cue = `${player} [data-slot=transcript-cue]`;
  check((await count(cue)) === 5 && (await attr(`${player} [data-slot=transcript]`, "aria-label")) === "Transcript", "the transcript lists every line as a button");
  check((await text(`${cue}[aria-current=true]`)).includes("Captions are drawn by the page."), "the line being said is marked as current");
  check(await kit.clickText(`${cue} span[dir=auto]`, "The last line."), "a line can be pressed");
  check(near(await clock(player), 16, 0.2), `pressing a line goes to its moment (${await clock(player)})`);
  check((await text(`${cue}[aria-current=true]`)).includes("The last line."), "and the current line follows");
  await kit.focus(`${cue}`);
  await keys("Enter");
  check((await clock(player)) === 0, "a line works from the keyboard");

  // Play, speed, mute.
  const play = `${player} [data-slot=audio-player-play]`;
  check((await attr(play, "aria-label")) === "Play", "the play button says what it will do");
  check((await page.evaluate((s) => document.querySelector<HTMLMediaElement>(`${s} audio`)?.paused, player)) === true, "nothing plays by itself");
  await kit.click(play);
  await sleep(1200);
  check((await attr(play, "aria-label")) === "Pause" && (await clock(player)) > 0.3, `pressing it plays, and its name becomes Pause (${await clock(player)}s)`);
  check((await text(`${player} [data-slot=audio-player-elapsed]`)) === "0:01", `the time is shown as a clock (${await text(`${player} [data-slot=audio-player-elapsed]`)})`);
  await kit.focus(wave);
  await keys("k");
  check((await attr(play, "aria-label")) === "Play", "K pauses while focus is in the player");
  await kit.click(`${player} [data-slot=audio-player-rate]`);
  check((await attr(`${player} [data-slot=audio-player-rate]`, "aria-label")) === "Playback speed: 1.25×", "the speed button goes to the next speed and names it");
  check((await kit.announced()).includes("Playback speed: 1.25×"), "the new speed is announced");
  await kit.click(`${player} [data-slot=audio-player-mute]`);
  check((await attr(`${player} [data-slot=audio-player-mute]`, "aria-pressed")) === "true", "mute is a toggle that says it is on");
  if (kit.phone) {
    const height = await page.evaluate((s) => document.querySelector(`${s} [data-slot=audio-player-rate]`)?.getBoundingClientRect().height ?? 0, player);
    check(height >= 40, `on a touch screen the controls are at least 40px (${height}px)`);
  }

  // ---- Video player.
  const demo = await kit.demo("Video player");
  const video = `${demo} [data-slot=video-player]`;
  const vplay = `${video} [data-slot=video-player-play]`;
  const elapsed = `${video} [data-slot=video-player-elapsed]`;
  check((await attr(video, "role")) === "group" && (await attr(video, "aria-label")) === "A quiet tone with a still picture", "the video player is a named group");
  check((await attr(`${video} [data-slot=video-player-controls]`, "aria-label")) === "Video controls", "its controls are a named group");
  check((await page.evaluate((s) => document.querySelector<HTMLVideoElement>(`${s} video`)?.paused, video)) === true && (await attr(`${video} video`, "playsinline")) !== null, "the video does not play by itself and plays inline");
  const shape = await page.evaluate((s) => {
    const rect = document.querySelector(s)?.getBoundingClientRect();
    return rect ? rect.width / rect.height : 0;
  }, video);
  check(near(shape, 16 / 9, 0.05), `the frame holds its shape (${shape.toFixed(2)})`);

  // Keyboard, with focus on the frame.
  check(await kit.focus(video), "the player takes focus");
  await keys("ArrowRight");
  check(near(await clock(video), 5, 0.2), `Right goes forward five seconds (${await clock(video)})`);
  check((await text(`${video} [data-slot=captions-text]`)).includes("It was made in the browser"), "captions show the track's line for that moment");
  check((await attr(`${video} [data-slot=captions-text]`, "lang")) === "en" && (await attr(`${video} [data-slot=captions-text]`, "dir")) === "auto", "the caption carries its language and finds its own direction");
  const lifted = await page.evaluate((s) => {
    const captions = document.querySelector(`${s} [data-slot=captions-text]`)?.getBoundingClientRect();
    const controls = document.querySelector(`${s} [data-slot=video-player-controls]`)?.getBoundingClientRect();
    return captions && controls ? captions.bottom <= controls.top + 1 : false;
  }, video);
  check(lifted, "captions sit above the controls while they show");
  await kit.screenshot("video-captions");
  await keys("End");
  check(near(await clock(video), 20, 0.2), "End goes to the end");
  await keys("Home");
  check((await clock(video)) === 0, "Home goes to the start");
  await keys("m");
  check((await attr(`${video} [data-slot=video-player-mute]`, "aria-pressed")) === "true" && (await kit.announced()).includes("Muted"), "M mutes, and says so");
  await keys("m");
  check((await attr(`${video} [data-slot=video-player-mute]`, "aria-pressed")) === "false", "M again unmutes");
  await keys("ArrowDown");
  const volume = await page.evaluate((s) => document.querySelector<HTMLVideoElement>(`${s} video`)?.volume ?? -1, video);
  check(near(volume, 0.9, 0.01), `Down lowers the volume (${volume})`);
  await keys("c");
  check((await text("[data-testid=video-captions]")) === "off" && (await count(`${video} [data-slot=captions-text]`)) === 0, "C switches captions off (controlled by the page)");
  check((await kit.announced()).includes("Captions off"), "and says so");
  await keys("c");
  check((await text("[data-testid=video-captions]")) === "on", "C switches them on again");
  await keys("k");
  await sleep(900);
  check((await attr(vplay, "aria-label")) === "Pause" && (await clock(video)) > 0.2, "K plays");
  check((await text(elapsed)) !== "", "the elapsed time is shown");
  await keys("Space");
  check((await attr(vplay, "aria-label")) === "Play", "Space pauses");

  // A slider inside keeps its own arrows; a button keeps its own Space.
  const before = await clock(video);
  if (!kit.phone) {
    await kit.focus(`${video} [data-slot=video-player-volume] [role=slider]`);
    await keys("ArrowRight");
    check(near(await clock(video), before, 0.05), "an arrow key on the volume slider does not seek");
  }
  await kit.focus(`${video} [data-slot=video-player-rate]`);
  await keys("Space");
  check((await attr(vplay, "aria-label")) === "Play" && (await attr(`${video} [data-slot=video-player-rate]`, "aria-label")) === "Playback speed: 1.25×", "Space on a button presses that button only");

  // The bound scrubber.
  const seek = `${video} [data-slot=scrubber] [role=slider]`;
  check((await attr(seek, "aria-label")) === "Seek" && (await attr(seek, "aria-valuemax")) === "20", "the player's scrubber knows the length");
  await kit.focus(seek);
  await keys("Home", "ArrowRight", "ArrowRight", "ArrowRight");
  check(near(await clock(video), 15, 0.2) && (await attr(seek, "aria-valuetext")) === "15 seconds of 20 seconds, Second half", `the scrubber seeks the video and names the chapter (${await attr(seek, "aria-valuetext")})`);
  check((await text(`${video} [data-slot=captions-text]`)).length > 0 && (await page.evaluate((s) => getComputedStyle(document.querySelector(`${s} [data-slot=captions-text]`) as Element).direction, video)) === "rtl", "a caption in a right-to-left script is laid out right to left");

  // Captions menu: several tracks.
  const cc = `${video} [data-slot=video-player-captions-button]`;
  check(await kit.click(cc), "the captions button opens");
  check((await count(`${video} [role=menu] [role=menuitemradio]`)) === 3, "with several tracks it lists them, inside the frame");
  check((await text(`${video} [role=menuitemradio][aria-checked=true]`)) === "English", "the track in use is checked");
  await kit.axe(video, "the video player with the captions menu open");
  await kit.screenshot("video-menu");
  await kit.clickText(`${video} [role=menuitemradio]`, "Deutsch");
  check((await text(`${video} [data-slot=captions-text]`)) === "Ein Satz auf Deutsch." && (await attr(`${video} [data-slot=captions-text]`, "lang")) === "de", "choosing a track shows its lines in its language");
  check(await kit.focusIs(cc), "focus returns to the captions button");
  await keys("Enter", "ArrowUp", "ArrowUp");
  await keys("Home", "Enter");
  check((await text("[data-testid=video-captions]")) === "off", "the menu works from the keyboard: Off switches captions off");
  await kit.click(cc);
  await kit.clickText(`${video} [role=menuitemradio]`, "English");

  // Controls step back while playing, and come back for the keyboard.
  await kit.focus(video);
  await keys("Home");
  await kit.click(vplay);
  if (!kit.phone) await page.mouse.move(2, 2);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await sleep(1800);
  check((await attr(video, "data-controls")) === "hidden", "while playing with the pointer still, the controls step back");
  check((await page.evaluate((s) => document.querySelector<HTMLVideoElement>(`${s} video`)?.paused, video)) === false, "and it keeps playing");
  await kit.focus(vplay);
  await keys("Tab");
  check((await attr(video, "data-controls")) === "shown", "keyboard focus brings them back");
  await keys("Shift");
  await sleep(1800);
  check((await attr(video, "data-controls")) === "shown", "and they stay while focus is inside");
  if (kit.phone) {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await sleep(1800);
    // Away from the middle, where a hotspot may be at this moment.
    const point = await pointAt(`${video} video`, 0.85);
    await page.touchscreen.tap(point.x, point.y - 40);
    await sleep(300);
    check((await attr(video, "data-controls")) === "shown" && (await attr(vplay, "aria-label")) === "Pause", "on a touch screen the first tap only brings the controls back");
    await page.touchscreen.tap(point.x, point.y - 40);
    await sleep(300);
    check((await attr(vplay, "aria-label")) === "Play", "the next tap pauses");
    const height = await page.evaluate((s) => document.querySelector(`${s} [data-slot=video-player-play]`)?.getBoundingClientRect().height ?? 0, video);
    check(height >= 40, `on a touch screen the controls are at least 40px (${height}px)`);
  } else {
    await kit.click(`${video} video`);
    check((await attr(vplay, "aria-label")) === "Play", "pressing the picture pauses");
  }

  // Full screen.
  const full = `${video} [data-slot=video-player-fullscreen]`;
  check((await attr(full, "aria-label")) === "Full screen", "the full screen button says what it will do");
  await kit.click(full);
  await sleep(500);
  check((await attr(video, "data-fullscreen")) !== null && (await attr(full, "aria-label")) === "Exit full screen", "it fills the screen, and its name becomes Exit full screen");
  await kit.focus(video);
  await keys("f");
  await sleep(500);
  check((await attr(video, "data-fullscreen")) === null, "F leaves full screen");

  // ---- Scene strip and hotspots, sharing the video's player through VideoPlayerProvider.
  const forward = kit.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
  const setClock = async (seconds: number): Promise<void> => {
    await page.evaluate((s, t) => ((document.querySelector(`${s} video`) as HTMLVideoElement).currentTime = t), video, seconds);
    await sleep(400);
  };
  const strip = `${demo} [data-slot=scene-strip]`;
  const scene = `${strip} [data-slot=scene-strip-item]`;
  await setClock(0);
  check((await attr(strip, "role")) === "toolbar" && (await attr(strip, "aria-label")) === "Scenes" && (await count(scene)) === 5, "the scene strip is a named toolbar of buttons");
  check((await text(`${scene}[aria-current=true] [data-slot=scene-strip-label]`)) === "Opening, playing", "the playing scene is marked as current, in words too");
  check((await text(`${scene} [data-slot=scene-strip-length]`)) === "0:04", "each scene shows its length");
  check((await count(`${scene}[tabindex="0"]`)) === 1, "the strip is one Tab stop");
  await kit.focus(`${scene}[tabindex="0"]`);
  await keys(forward);
  check((await kit.focused()).startsWith("In the browser") && (await clock(video)) === 0, `the arrow key towards the end moves to the next scene and does not seek (${await kit.focused()})`);
  await keys("End", "Enter");
  check(near(await clock(video), 16, 0.2) && (await text(`${scene}[aria-current=true] [data-slot=scene-strip-label]`)).startsWith("The end"), "End goes to the last scene and Enter plays from it");
  const kept = await page.evaluate((s) => {
    const box = document.querySelector(s)?.getBoundingClientRect();
    const item = document.querySelector(`${s} [aria-current=true]`)?.getBoundingClientRect();
    return box && item ? item.left >= box.left - 1 && item.right <= box.right + 1 : false;
  }, strip);
  check(kept, "the playing scene is kept in view");
  await keys("Home", "Space");
  check((await clock(video)) === 0 && (await attr(vplay, "aria-label")) === "Play", "Home goes to the first scene; Space goes there without playing or pausing");

  const spot = `${video} [data-slot=hotspot]`;
  check((await count(spot)) === 0 && (await text(`${demo} [data-slot=hotspot-list]`)) === "Nothing to choose at this moment.", "a hotspot is absent outside its moments, and the list says so");
  await setClock(3);
  check((await count(spot)) === 1 && (await attr(spot, "aria-label")) === "The ring", "a hotspot appears at its moment, as a named button");
  check((await kit.announced()).includes("The ring"), "its arrival is announced");
  await setClock(7);
  const order = await page.evaluate((s) => [...document.querySelectorAll(s)].map((node) => node.getAttribute("aria-label")), spot);
  check(order.join(", ") === "The ring, The corner", `hotspots are in time order for Tab (${order.join(", ")})`);
  const placed = await page.evaluate((s) => {
    const frame = document.querySelector(s)?.getBoundingClientRect();
    const corner = document.querySelector(`${s} [data-hotspot=corner]`)?.getBoundingClientRect();
    return frame && corner ? { from: (corner.left + corner.width / 2 - frame.left) / frame.width, size: Math.min(corner.width, corner.height) } : { from: -1, size: 0 };
  }, video);
  check(near(placed.from, 0.12, 0.02), `a hotspot is placed from the left of the picture in every language (${placed.from.toFixed(2)})`);
  check(placed.size >= 44, `a hotspot is at least 44px across (${placed.size}px)`);
  await kit.screenshot("hotspots");
  await kit.click(`${video} [data-hotspot=corner]`);
  check((await text("[data-testid=spot-chosen]")) === "The corner" && (await attr(vplay, "aria-label")) === "Play", "pressing a hotspot chooses it and does not play or pause");
  check(await kit.clickText(`${demo} [data-slot=hotspot-list-item]`, "The ring"), "the same choices are a list after the frame");
  check((await text("[data-testid=spot-chosen]")) === "The ring", "choosing from the list does the same");
  await kit.axe(demo, "the video player with hotspots, their list and the scene strip");

  // ---- A clip that fails, and cues from the project.
  const failing = await kit.demo("Video player: a clip that fails");
  check((await attr(`${failing} [data-slot=video-player-error]`, "role")) === "alert" && (await text(`${failing} [data-slot=video-player-error] p`)) === "This video could not be played.", "a clip that fails says so in words, as an alert");
  check((await text(`${failing} [data-slot=video-player-retry]`)) === "Try again", "with a way to try again");
  const toggle = `${failing} [data-slot=video-player-captions-button]`;
  check((await attr(toggle, "aria-pressed")) === "true" && (await text(`${failing} [data-slot=captions-text]`)) === "Cues passed in by the project.", "with one set of captions the button is a toggle (uncontrolled, on by default)");
  await kit.focus(toggle);
  await keys("Enter");
  check((await attr(toggle, "aria-pressed")) === "false" && (await count(`${failing} [data-slot=captions-text]`)) === 0, "pressing it switches the captions off");

  await kit.axe("main", "after the checks");
}
