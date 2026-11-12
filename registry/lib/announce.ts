/**
 * @name announce
 * @category lib
 * @description Says a message to screen-reader users through one shared live region, politely or at once, without moving focus.
 * @when Something changed that a sighted person can see but no focus change will read out: an item was moved, a filter applied, a total changed, a reply finished. Not for content the person is about to read anyway, and not for errors on a field (use the field's own message). A component that is already a live region (status-line, toaster) does not need it.
 * @example
 * announce("Lunch moved to position 2 of 5");
 * announce("The connection was lost", "assertive");
 */

export type Politeness = "polite" | "assertive";

const REGION_ID = "rui-announcer";
/** How long a message stays in the region, in milliseconds: long enough to be read, short enough not to be found again by browsing. */
const LIFETIME = 7000;

function region(politeness: Politeness): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let root = document.getElementById(REGION_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = REGION_ID;
    root.dataset["slot"] = "announcer";
    // Visually hidden, still read. Inline because the region lives outside any component's markup.
    Object.assign(root.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      margin: "-1px",
      padding: "0",
      border: "0",
      overflow: "hidden",
      clipPath: "inset(50%)",
      whiteSpace: "nowrap",
    });
    for (const level of ["polite", "assertive"] as const) {
      const log = document.createElement("div");
      // role="log" appends: a second message does not cut off the first.
      log.setAttribute("role", "log");
      log.setAttribute("aria-live", level);
      log.setAttribute("aria-relevant", "additions");
      log.dataset["politeness"] = level;
      root.append(log);
    }
    document.body.append(root);
  }
  return root.querySelector<HTMLElement>(`[data-politeness="${politeness}"]`);
}

/**
 * Adds `message` to the page's live region. "polite" (default) waits for the screen reader to finish what
 * it is saying; "assertive" interrupts, so keep it for what cannot wait. Safe to call on the server (it does
 * nothing there). Call it from an event handler or an effect, never during render.
 */
export function announce(message: string, politeness: Politeness = "polite"): void {
  const log = region(politeness);
  if (!log || message.trim() === "") return;
  const node = document.createElement("div");
  node.textContent = message;
  log.append(node);
  window.setTimeout(() => node.remove(), LIFETIME);
}

/** Prepares the live region ahead of the first message: some screen readers ignore a region's first change if the region itself is new. */
export function prepareAnnouncer(): void {
  region("polite");
}

/** Removes every message that has not been read yet. */
export function clearAnnouncements(): void {
  if (typeof document === "undefined") return;
  for (const log of document.querySelectorAll(`#${REGION_ID} [role="log"]`)) log.replaceChildren();
}
