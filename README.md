# Linear Calendar

An [Obsidian](https://obsidian.md) plugin that renders a horizontal, year-at-a-glance timeline from your notes' frontmatter — each note becomes a bar spanning its start/end date, grouped and colored by tag.

## Features

- **Year timeline view.**
  All twelve months laid out as rows, each note rendered as a bar from its start date property to its end date property (single-day notes get a point marker). Switch column alignment between calendar date and weekday.

- **Drag to reschedule.**
  Drag a bar to a new date, or resize its edges to change duration — writes the new dates back to the note's frontmatter. For notes created via the Create event command, the filename's date prefix is renamed to match.

- **Tag-based color and icon coding.**
  Notes are grouped by `linear-calendar/*` subtags. Auto-assigns colors from a palette, or pin your own color and a Lucide icon per tag from the settings tab.

- **Hover tooltips.**
  Shows title, date range, and an optional description property on hover.

- **Recurring anniversaries.**
  Flag a note with a boolean frontmatter property and it repeats on the same date every year, shown with a dashed border.

- **Daily note indicators.**
  Days with an existing daily note are tinted or underlined, configurable by color and style.

- **Create event command + modal.**
  Command palette entry and right-click-on-date modal for creating a new event note, with configurable target folder, filename date format, and an optional Templater template.

- **Configurable frontmatter mapping.**
  Every property name (title, start/end date, icon, anniversary, description) is remappable in settings, so it works with existing frontmatter schemas instead of forcing one.

- **Embeddable single-month strip.**
  `mountMonthStrip()` renders a single-month calendar (with all the same bars, drag, tooltips, and colors) into any host container — used by [obsidian-lhak-dashboard](https://github.com/lhak1341/obsidian-lhak-dashboard) to embed a live month view outside the plugin's own leaf.

## Installation

Not on the community plugin store. Either:

- **Manual:** download `main.js`, `styles.css`, and `manifest.json` from a [release](https://github.com/lhak1341/obsidian-linear-calendar/releases) into `<vault>/.obsidian/plugins/obsidian-linear-calendar/`, then enable it in Obsidian's Community Plugins settings.
- **BRAT:** add this repo to [Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat) as a beta plugin.

Desktop only.

## Usage

Add frontmatter to any note:

```yaml
---
tags: [linear-calendar/work]
datestart: 2026-03-10
dateend: 2026-03-14
icon: briefcase
description: Conference week
---
```

Then run the **Open** command (or the ribbon icon) to open the year timeline. Property names, the tag prefix, and colors/icons are all configurable in the plugin's settings tab.

## Development

```bash
npm install
npm test    # vitest, pure-logic modules in src/utils/ only
npm run build   # production bundle to main.js
npm run deploy  # build + copy into the configured vaults
```

See [CLAUDE.md](./CLAUDE.md) for architecture notes, the public API surface shared with `obsidian-lhak-dashboard`, and other gotchas if you're working on this plugin.

## License

MIT
