// Showcase: the component pages. Plain data, so both server and client files can read it.

/** The component pages: one per group of components, each with its own browser checks (scripts/checks/). */
export const PAGES = [
  { href: "/foundations", title: "Foundations", description: "Reading direction, announcements for screen readers, type that follows the script." },
  { href: "/choices", title: "Choices", description: "Chips, tiles, a segmented control, a number stepper." },
  { href: "/dates", title: "Dates and times", description: "A calendar, date and date-range pickers, offered time slots, a time field." },
  { href: "/flows", title: "Flows and lists", description: "Steps, a wizard, a sortable list, a combobox, skeletons that hold their size." },
  { href: "/panels", title: "Panels", description: "A bottom sheet with snap points, a dock beside the page, a frame for a map." },
  { href: "/conversation", title: "Conversation", description: "A thread, messages, streaming text, a status line, a composer." },
  { href: "/gallery", title: "Pictures and uploads", description: "A gallery, a lightbox with zoom, shared-element transitions, a dropzone with progress." },
  { href: "/players", title: "Video and sound", description: "A video player, an audio player with a waveform, a scrubber, captions." },
  { href: "/records", title: "Records and decisions", description: "A compare table, fact rows with their source, consent, a language switcher, prices, a countdown." },
] as const;
