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
  { href: "/models", title: "Models in 3D", description: "A viewer for one model, glTF or Gaussian splats, with a poster, progress, keys and a still fallback." },
  { href: "/evidence", title: "Comparison and provenance", description: "A then-and-now slider, a legend of certainty classes, a label that says what a picture is." },
  { href: "/carousel", title: "Carousels and media rows", description: "A scroll-snap carousel with autoplay that can be paused, and reorderable rows of uploads." },
  { href: "/lists", title: "Lists of any length", description: "A windowed list and grid for thousands of rows of any height, with their place remembered." },
  { href: "/charts", title: "Charts", description: "Scatter, distributions, forecasts with intervals, hierarchies, flows, networks, calendars, plans and more." },
  { href: "/maps", title: "Maps", description: "GeoJSON maps in any projection: choropleth, markers, routes, hexagon bins, tiles, zoom and pan by keys." },
  { href: "/explainers", title: "Explainers", description: "A film from a JSON spec: charts, maps, models, comparisons and quotes with captions, narration and provenance." },
  { href: "/grid", title: "Data grid", description: "Sorting, filters, search, grouping, a pinned column, pages, thousands of rows and editing in place." },
  { href: "/entry", title: "Data entry", description: "A self-checking form, tags, a one-time code, a password, money, a colour picker and a rating." },
  { href: "/surfaces", title: "Surfaces and navigation", description: "Alert dialog, hover card, collapsible, menubar, navigation menu, toolbar, resizable panels, sidebar, skip link." },
  { href: "/stage", title: "Stage for timed scenes", description: "A sequence of timed scenes with a transport and a clock, and frames drawn on request for export." },
] as const;
