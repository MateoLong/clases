---
name: Mis clases
description: "A tutor's week as a board of school labels, in the Biblioteca world: every student keeps one forro ink and every class is an etiqueta stuck on its day."
colors:
  moña: "#2347b5"
  moña-deep: "#172f7a"
  moña-soft: "#dfe7fb"
  girasol: "#ffc53d"
  girasol-hover: "#ffb81a"
  girasol-soft: "#fff4d6"
  tomate: "#e2483d"
  tomate-ink: "#a8241b"
  tomate-soft: "#fde8e5"
  pasto: "#2f9e5b"
  pasto-ink: "#1c6f3e"
  pasto-soft: "#e2f4e8"
  f-cobalto: "#2f5bd3"
  f-tomate: "#d23f2d"
  f-girasol: "#f4b400"
  f-pasto: "#21804a"
  f-violeta: "#6a4bc8"
  f-turquesa: "#0b7e82"
  f-rosa: "#c23d7b"
  f-naranja: "#f08a24"
  ground: "#f1f4fb"
  paper: "#ffffff"
  ink: "#1b2340"
  ink-2: "#47527a"
  line: "#d6ddee"
  line-strong: "#b9c4e0"
  chart-agendado: "#6d8cf0"
typography:
  display:
    fontFamily: "Baloo 2, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Baloo 2, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "Baloo 2, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 800
    lineHeight: 1.12
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Baloo 2, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1
  hand:
    fontFamily: "Patrick Hand, Comic Sans MS, cursive"
    fontSize: "1.3125rem"
    fontWeight: 400
    lineHeight: 1.1
  hand-input:
    fontFamily: "Patrick Hand, Comic Sans MS, cursive"
    fontSize: "1.625rem"
    fontWeight: 400
    lineHeight: 1.2
  lead-figure:
    fontFamily: "Baloo 2, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.05
  clase-time:
    fontFamily: "Baloo 2, Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 800
    lineHeight: 1
rounded:
  sm: "10px"
  md: "16px"
  lg: "22px"
  etiqueta: "12px"
  forro: "6px 12px 12px 6px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "24px"
  xl: "40px"
components:
  button-go:
    backgroundColor: "{colors.girasol}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    height: "44px"
  button-go-hover:
    backgroundColor: "{colors.girasol-hover}"
  button-go-big:
    backgroundColor: "{colors.girasol}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 28px"
    height: "56px"
  button-line:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    height: "44px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.moña-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.moña-soft}"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
    height: "36px"
  chip-pressed:
    backgroundColor: "{colors.moña}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
    height: "48px"
  line-input:
    backgroundColor: "transparent"
    textColor: "{colors.moña-deep}"
    typography: "{typography.hand-input}"
    padding: "6px 4px 4px"
    height: "46px"
  line-input-focus:
    backgroundColor: "{colors.moña-soft}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
  tab-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.moña-deep}"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "24px"
  forro:
    backgroundColor: "{colors.f-cobalto}"
    textColor: "{colors.paper}"
    rounded: "{rounded.forro}"
  loan-tile:
    backgroundColor: "{colors.f-cobalto}"
    textColor: "{colors.paper}"
    rounded: "{rounded.forro}"
    padding: "16px 14px 14px 20px"
    height: "220px"
  etiqueta:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.etiqueta}"
    padding: "10px 14px 12px"
  pill-ok:
    backgroundColor: "{colors.pasto-soft}"
    textColor: "{colors.pasto-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  pill-out:
    backgroundColor: "{colors.moña-soft}"
    textColor: "{colors.moña-deep}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  pill-late:
    backgroundColor: "{colors.tomate-soft}"
    textColor: "{colors.tomate-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px 12px 12px 18px"
  toast-error:
    backgroundColor: "{colors.tomate-ink}"
  clase-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 9px 8px"
  clase-label-cancelled:
    backgroundColor: "#f6f7fb"
    textColor: "{colors.ink-2}"
  debtor-label:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.tomate-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  day-column:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "10px 8px 12px"
  day-column-today:
    backgroundColor: "{colors.moña-soft}"
  currency-switch:
    backgroundColor: "rgba(255,255,255,.14)"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "4px"
  currency-switch-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.moña-deep}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
    height: "36px"
  segmented:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmented-current:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.moña-deep}"
    rounded: "{rounded.pill}"
    padding: "9px 14px"
  avatar:
    backgroundColor: "{colors.f-cobalto}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    size: "92px"
  range-thumb:
    backgroundColor: "{colors.girasol}"
    rounded: "{rounded.pill}"
    size: "32px"
---

# Design System: Mis clases

<!-- Inherited world: this file began as the sister app Biblioteca's DESIGN.md and the owner pinned "same UI as Biblioteca". The Biblioteca system below is kept intact; Mis clases additions are marked where they extend it. In this app a student plays the book's part (one forro ink for good) and a class is the etiqueta. -->

## Overview

**Creative North Star: "Forro y etiqueta"**

Every book in this library wears its school contact-paper forro, and every loan is an etiqueta escolar filled in by hand. The system is built from those two school objects: saturated colour fields with a faint repeating print stand for books, and white name labels with a rounded double frame stand for loans. Everything else (tables, fields, panels) recedes onto a cool túnica-white ground so the books carry the colour.

It is an operating tool for one librarian at a counter with a queue of children, so density is moderate and every target is large (44px minimum, 56px for the lend action). The children watching see a cheerful wall of covered books; the librarian sees exact dates, codes and states in a hyperlegible face. Cuteness comes from the materials (forros, labels, handwriting), never from emoji or pastel cards.

The cobalt "moña" forro runs across the top as the app's own band, with the same star print the books use. Sunflower yellow is the one action colour.

Mis clases carries the same world to one tutor on an iPad. Her week is a board of school labels: each class is a small etiqueta stuck on its day, framed in its student's forro ink, with the student's name written in handwriting, the time big in Baloo and the amount in tabular Atkinson. Money sits in a rail beside the week: what she has earned, what is still to come, and who owes her, each debtor written on a label of their own that gets stamped PAGADO when she is paid.

**Key Characteristics:**
- Book identity is a forro colour plus a print, stable for that book on every screen.
- Loans render as an etiqueta stuck on the book's forro; names and dates on it are in handwriting.
- One action colour (sunflower), used only where something can be pressed.
- Soft, navy-tinted, blurred shadows; pill-shaped controls; a spine-side corner on every forro.
- Spanish (UY) throughout; dates read dd/mm.
- Mis clases: each student keeps one stored forro ink everywhere (labels, avatars, debtor labels, chart legends); classes are etiquetas on a week board, money is a rail beside it.
- Mis clases: one lead figure per page; charts are hand-built SVG in the shell's cobalt family.

## Colors

A cool school-uniform shell (moña blue on túnica white) carrying eight saturated contact-paper forros and one sunflower action colour.

### Primary
- **Moña Blue** (`moña`): the shell. The sticky top band, focus outlines, pressed chips, the current tab's text, link colour and caret. Moña Deep is its pressed/hover and text-on-soft shade; Moña Soft is the selected-row, focus-halo and "Prestado" pill tint.

### Secondary
- **Girasol** (`girasol`): the single action colour. Primary buttons (Prestar, Prestarle un libro, Prestar igual), the toast's undo button, the brand mark in the home link, and the focus outline on band tabs. Girasol Hover deepens it on hover. Girasol Soft is a different job: the warning tint for the demo strip and `notice-warn`, never a button.

### Tertiary
- **Forros** (`f-cobalto`, `f-tomate`, `f-girasol`, `f-pasto`, `f-violeta`, `f-turquesa`, `f-rosa`, `f-naranja`): book covers in Biblioteca. In Biblioteca, avatars use only the six dark inks because their initials are white. A book's forro is picked deterministically from its id along with one of six prints (dots, stripes, stars, checks, waves, plain), so the same book looks the same in the tile wall, the lend form's picked line, listbox options, table swatches and its detail page. Titles on forros are white, except on Girasol and Naranja forros, which take ink.
- **Student inks (Mis clases):** the same eight forros are the students' identity colours. Each student is given one ink when added, least-used first among active students (order cobalto, tomate, pasto, violeta, turquesa, rosa, naranja, girasol), and it is stored with the student, never re-derived. That one ink frames the student's class labels and debtor label, fills their avatar and their swatch dot in lists and chart rows. All eight are used for avatars here: initials are white on the six dark inks and Ink on Girasol and Naranja.

### Data (Mis clases)
Chart colours were validated as pairs with the dataviz script; keep them paired as recorded.
- **Ganado** (`moña`) over **Agendado** (`chart-agendado`): the Ganancias stacked columns, the legend and the tooltip keys. Earned sits at the base; booked future money stacks above it in the lighter cobalt.
- **Hoy** (`moña`) beside **Nuevos** (`f-pasto`): the ¿Y si…? projection bars, today's classes then the new students' share, joined with a 2px gap.
- **Per-student bars** are one hue (`moña`) for every student; the student's own ink appears only as the swatch dot beside the name, never as the bar.

### Neutral
- **Túnica Ground** (`ground`): page background, the Prestar/Devolver switch track, sample code blocks.
- **Paper** (`paper`): panels, tables, etiquetas, inputs, the current tab, line buttons.
- **Ink** (`ink`): all primary text and the toast surface. **Ink 2** (`ink-2`): secondary text, table headers, etiqueta field names, the weekday.
- **Line** (`line`) and **Line Strong** (`line-strong`): input and chip strokes, row dividers, the dotted writing lines on etiquetas, the dashed empty-state border.

### State
- **Tomate** (`tomate`, `tomate-ink`, `tomate-soft`): overdue. The late flag on tiles, the overdue count badge, late due dates written in tomato on the etiqueta, overdue rows, error notices and error toasts. Overdue holds this state until it is resolved.
- **Pasto** (`pasto-ink`, `pasto-soft`): "En la biblioteca" / returned confirmations.

### Named Rules
**The Pressable Sunflower Rule.** Full-strength Girasol (`#ffc53d`) appears only on things that can be pressed. If it is not a button, link or focus ring, it is not Girasol. In Mis clases that means the Clase extra button (and the other Go buttons), the toast's Deshacer after Cobrar, and the rate slider's thumb. The Girasol forro (`f-girasol`) is a book colour, and Girasol Soft is a warning tint; neither is the action colour.

**The Forro Is Identity Rule.** A book's forro colour and print are derived from its id and never change between screens. Never colour a book by state; state goes on the etiqueta, the late flag or a pill.

**The One Ink Per Student Rule.** (Mis clases) A student's forro ink is chosen once (least used first) and stored; every surface that shows that student uses it. Never pick a student's colour by state, amount or position.

**The Quiet Print Rule.** Forro prints are white at no more than .14 alpha so white titles keep at least 3:1 against every forro. Light forros (Girasol, Naranja) switch their title to ink rather than raising the print.

## Typography

**Display Font:** Baloo 2 (variable 400–800, with Atkinson Hyperlegible, system-ui)
**Body Font:** Atkinson Hyperlegible (400/700, with system-ui)
**Label/Mono Font:** Patrick Hand (with Comic Sans MS, cursive) for handwriting only

**Character:** Baloo 2 is round and schoolbook-friendly for headings, tabs and buttons; Atkinson Hyperlegible keeps names, codes and dates unambiguous for the librarian; Patrick Hand is the pen that writes on the label. All three are self-hosted woff2. Body numerals are tabular.

### Hierarchy
- **Display** (800, 2rem, 1.15, -0.01em; 1.625rem under 860px; 2.125rem on detail heads): page titles.
- **Headline** (700, 1.375rem, 1.15): section titles such as "Prestados ahora", with a 0.9375rem Atkinson count beside it in Ink 2.
- **Title** (800, 1.1875rem, 1.12, max three lines): book titles on forro tiles. h3 is 700 at 1.125rem.
- **Body** (400, 1rem, 1.5, tabular numerals): data, sentences, answers.
- **Label** (Baloo 2 600–700, 0.9375–1.25rem, line-height 1): buttons, tabs, chips, field names, table headers.
- **Hand** (Patrick Hand 400, 1.3125rem on etiquetas, 1.625rem on the lend form's writing lines): student name, grade, due date, weekday. In Mis clases: the student's name on class labels (1.1875rem, Moña Deep) and debtor labels (1.25rem), "libre" on an empty day, and "nuevo" on blank labels.
- **Lead figure** (Mis clases; Baloo 800, 2.5rem, 1.05; 3rem on Ganancias, 3.5rem for the ¿Y si…? result, 2.75rem under 860px): the one big money figure a page leads with. Ink by default, Tomate Ink when it is money owed, Pasto Ink for projected growth.
- **Class time** (Mis clases; Baloo 800, 1.1875rem, line-height 1): the time on a class label; duration beside it in Atkinson 700 at 0.8125rem Ink 2.

### Named Rules
**The Written On The Label Rule.** Patrick Hand is used only for what is written onto an etiqueta or its form lines (names, grade, dates, weekday). Headings, buttons and data never use it.

**The Calendar Speech Rule.** Dates read dd/mm (dd/mm/yyyy only outside the current year), with "hoy", "mañana" or "ayer" for the nearest days. When a date is being set, its weekday is spelled out beside it in handwriting ("17/10 sábado"), and it is typed the same way.

## Layout

A single centred column, max 1280px, padded 28px 24px 96px (20px 16px under 860px). The Mostrador splits 7fr / 5fr: the counter on the left, the "Preguntá" panel on the right, and the "Prestados ahora" tile wall full-width below. Loan tiles flow in an auto-fill grid (min 196px, gaps 22px by 18px; min 150px under 860px). Settings use two equal columns.

Breakpoints: at 1080px the desk and settings collapse to one column. At 860px the band wraps, tabs become a five-column icon-over-label grid, label-form rows stack field name above line, and tables marked for stacking turn each row into a wrapped card-row with its own `data-label` captions so every action stays on screen. Etiquetas use a container query: under 190px their field names sit above the line, like a stacked school label.

Mis clases: the Agenda is a two-column grid, the week board then a 300px money rail (gap 22px). The board has one equal column per day, Lun–Sáb, plus Dom only when it has classes (gap 10px, columns at least 260px tall). ¿Y si…? splits 5fr controls / 7fr result. Ganancias is one column: the lead panel, the chart panel, the per-student panel. At 1080px the week comes first and the rail stacks under it: day columns turn into rows (a 92px day stub with a dotted right rule, labels flowing at min 170px), the rail's week panel is replaced by one line of money above the board (ganados · faltan · total · te deben), and the selected class's actions move right under its day. At 860px the currency switch shares the band's first row with the brand.

**The Week First Rule.** (Mis clases) In portrait the week comes first and the week's money is one line above it, never a stack of panels pushing the classes below the fold.

**The One Lead Figure Rule.** (Mis clases) Each page leads with exactly one large figure (week earned, month earned, the student's balance, the projected gain); every other number sits in a sentence, a stats list or a chart. No rows of stat tiles.

Spacing is a loose rhythm rather than a strict scale: 6px inside fields, 8–10px between chips and inline items, 14px between form parts, 24px for panel padding and desk gaps, 40px between sections.

## Elevation & Depth

Depth is soft and tinted with Moña Deep, never grey and never hard. Surfaces rest on the ground with a low ambient shadow; things that respond (hovered tiles, the lend form, toasts, listboxes) lift to a deeper one.

### Shadow Vocabulary
- **Rest** (`shadow-1`: `0 1px 2px rgba(23,47,122,.08), 0 2px 6px rgba(23,47,122,.06)`): panels, table wraps, forros at rest, the selected switch segment.
- **Lift** (`shadow-2`: `0 2px 4px rgba(23,47,122,.08), 0 10px 24px rgba(23,47,122,.12)`): the counter's lend form, hovered loan tiles, listboxes, toasts.
- **Band** (`0 2px 10px rgba(23,47,122,.25)`): the sticky top band only.
- **Class label** (Mis clases; `inset 0 0 0 2px paper, inset 0 0 0 3.5px <ink 45% with white>, 0 1px 3px rgba(23,47,122,.14)`): a slimmer etiqueta frame for small labels; hover and selection swap the drop for Lift.
- **Today column** (Mis clases; `0 0 0 2px moña` ring over Rest): marks today's column on the board.
- **Coloured glows**: the Go button carries a warm `0 2px 6px rgba(201,138,0,.35)`, the late flag a tomato `0 2px 6px rgba(168,36,27,.35)`.

### Named Rules
**The Soft Lift Rule.** Every shadow is blurred and tinted. No hard zero-blur offset shadows anywhere. (The etiqueta's inset rings are zero-offset spread rings that draw its double frame, not shadows.)

## Shapes

Pills for everything pressable (buttons, chips, tabs, the switch, status pills, the overdue count). Inputs take a gentle 10px corner, notices and toasts 16px, panels and tables 22px. Forros have a tight 6px corner on the spine side and 12px on the open side, like a covered book seen face-on; the lend form uses the same shape at 10px/16px. Etiquetas are 12px rounded labels with a 2px stroke in the forro's colour, a 3px white gap, and a thin inner ring of the same colour mixed 55% with white. Writing lines are dotted 2px rules; empty states use a 2px dashed border. The brand mark is a sunflower tile turned -4deg.

Mis clases adds smaller etiquetas: class labels and debtor labels take 10px corners, a 2px ink stroke, a 2px white gap and an inner ring of the ink mixed 45% with white. Day columns use 16px corners; the day head sits over a 2px dotted rule (dotted right rule in portrait). Cancelled class labels switch to a dashed stroke. Blank "nuevo" labels on ¿Y si…? are 8px, 2px dashed Pasto. The PAGADO stamp is an 8px-cornered 3px Pasto Ink frame turned -12deg. Bars end in a 4px corner on their value end only.

## Components

### Buttons
Chunky, rounded and obvious.
- **Shape:** full pill, 2px border, minimum 44px tall (36px small, 56px big).
- **Go:** Girasol with ink text and a warm glow; the one primary action per context (Prestar, Prestarle un libro). Hover deepens to Girasol Hover.
- **Line:** Paper with a Line Strong stroke; hover turns the stroke Moña and the text Moña Deep. Secondary actions (Devolver, Editar, Imprimir lista).
- **Quiet:** transparent with Moña Deep text; hover fills Moña Soft. Tertiary and inline actions (Renovar, change-selection "x"). The danger variant takes Tomate Ink text and a Tomate Soft hover.
- **Press / disabled / busy:** press nudges down 1px and scales to .98; disabled drops to .45 opacity; busy to .7 and ignores input.

### Chips
- **Style:** Paper pills with a 2px Line stroke, Baloo 600 at 0.9375rem; hover turns the stroke Moña.
- **State:** pressed chips fill Moña with white text. Used for question shortcuts and the 1/2/3-week due picks (a smaller 32px size). In Mis clases they pick the class duration on ¿Y si…?.
- **Instant press (Mis clases):** the pressed state switches at once; only the border colour transitions. A cross-fade would pass through ink on cobalt and hide the label.

### Cards / Containers
- **Panel:** Paper, 22px corners, Rest shadow, 24px padding (18px under 860px).
- **Table wrap:** the same surface with horizontal overflow; header row in Baloo 700 Ink 2 over a 2px Line rule, rows divided by 1px Line, overdue rows tinted `#fff7f6`.
- **Notice:** 16px corners, 2px tinted border on a soft fill: warn (Girasol Soft), error (Tomate Soft), ok (Pasto Soft). Actions sit in a wrapped row inside.

### Inputs / Fields
- **Box input:** Paper, 2px Line stroke, 10px corners, 48px tall; hover Line Strong; focus is a Moña stroke with a 4px Moña Soft halo; invalid turns the stroke Tomate. Search fields carry a leading icon.
- **Writing line:** used on the lend form's etiqueta. No box: a 2px dotted bottom rule, Patrick Hand at 1.625rem in Moña Deep. Focus fills Moña Soft with a solid Moña rule; invalid turns Tomate.
- **Listbox:** Paper, 16px corners, Lift shadow, options with a forro swatch, the selected option on Moña Soft.

### Navigation
The band is a cobalt forro: Moña with the star print, sticky, holding the brand and five tabs. Tabs are white Baloo 600 pills with an icon; hover lays a 14% white wash; the current tab is a Paper pill with Moña Deep text. Atrasados carries a Tomate count badge. Under 860px tabs become an equal five-column grid with the icon above a 0.8125rem label.

### Status Pills
Small rounded pills with a leading dot in the text colour: En la biblioteca (Pasto), Prestado (Moña), Atrasado (Tomate), Dado de baja (grey).

### Segmented control and currency switch (Mis clases)
- **Segmented:** a Ground pill track (4px padding) with Baloo 700 Ink 2 segments; the current one is a Paper pill in Moña Deep with Rest. Used for the student's currency and Ganancias' Por mes / Por semana.
- **Currency switch:** the same shape inside the band: a 14% white track, white UYU / USD segments 36px tall, the current one a Paper pill in Moña Deep. Its focus ring is Girasol, like the band's tabs.

### Toasts
Ink pills of 16px corners, bottom-centre, max 560px, with a Girasol undo button. Errors turn Tomate Ink. Routine actions confirm here and offer undo instead of asking first.

### Forro loan tile (signature)
A book on loan: the book's forro (colour and print) at least 220px tall, its title in Baloo 800 (white, or ink on light forros), the copy code on a 90% white pill, and the etiqueta stuck to the bottom with Nombre / Grado / Vuelve lines in handwriting. Overdue tiles get a Tomate "N días tarde" flag hanging off the top-right edge and write the due date in Tomate Ink. Hover lifts 3px with a half-degree tilt. On lend, the tile drops in with a -5deg turn (550ms), the etiqueta slides on (500ms, 200ms delay) and the handwriting writes itself left to right (700ms, 18 steps). All easing is `cubic-bezier(.16,1,.3,1)`, and reduced motion collapses it.

### Lend form (the counter)
The counter is itself a cobalt starred forro with a blank etiqueta on it: Nombre, Libro and Vuelve writing lines, the weekday beside the date, week chips, and the big Go button below the label. A Prestar / Devolver switch (a ground-coloured pill track with a raised Paper segment) sits above it.

### Class label (Mis clases signature)
A class is a small etiqueta in its student's ink: the time in Baloo 800 with the duration at the right, the student's name in Patrick Hand Moña Deep, and a foot with the amount in tabular Atkinson 700 and a state with a 14px icon. Given classes carry a check and "dada" in Pasto Ink. Cancelled classes go dashed on a `#f6f7fb` fill with time and name struck through (2px) in Ink 2 and the state in Tomate Ink; their amount shows "—", unless the cancellation is charged ("se cobra"), which keeps the amount in Ink. Moved and extra classes say so in the foot. The label is a button: hover lifts 1px with Lift, the selected label tints with 9% of its ink and its inner ring goes full ink.

### Week board (Mis clases)
Day columns on Paper (16px, Rest), each headed by the short weekday in Ink 2, the day number in Baloo 800 and, for today, a Moña "hoy" pill; today's column is Moña Soft with a 2px Moña ring. Above: ‹ week range › in Baloo and the Clase extra Go button at the right, which opens the extra-class form as a panel over the board.

### Money rail (Mis clases)
Paper panels at 18px padding. Esta semana: one lead figure (earned), a sub line, a 10px Moña meter on Moña Soft, and a stats list (term in Ink 2, value bold tabular, 1px Line rules). The selected-class panel shows the student's avatar, name and when, the money line ("Agendada · $ 750"), then line buttons (Cancelar, Cancelar y cobrar igual, Mover) and a link to the student's page.

### Debtor label and the PAGADO stamp (Mis clases signature)
Te deben lists each debtor as a class-label-sized etiqueta in their ink: swatch dot, name in Patrick Hand, the owed amount in Tomate Ink (with the original currency small in Ink 2 when it differs) and a line Cobrar button. Paying stamps "PAGADO" across the label: Baloo 800 uppercase, 0.06em tracking, Pasto Ink in a 3px Pasto Ink frame, turned -12deg, pressed in over 420ms (scale 1.8 to .94 to 1 on the shared ease-out), and the amount is struck through; then the list settles and the toast offers Deshacer. Reduced motion shows the stamp without the press.

### Charts (Mis clases)
Hand-built SVG, never a chart library. Ganancias: stacked columns (Ganado below, Agendado above) on 1px Line gridlines with a Line Strong axis, ticks and month labels in Atkinson 12px Ink 2, the current month bold Ink; hover or focus washes the column with 6% Moña and shows an Ink tooltip (10px corners, Lift) with the total and keyed rows. A "Ver como tabla" disclosure gives the same numbers as a table. Per-student horizontal bars are 20px, one Moña hue, name with ink dot at the left and value at the right. ¿Y si…? projection bars are 24px: Hoy alone, then Con N más as Hoy plus Nuevos.

### Projection controls (Mis clases)
Steppers are two 44px round line icon buttons around a 2.25rem Moña Deep count. The rate slider has a 10px pill track filled Moña up to the value over Moña Soft and a 32px Girasol thumb with a 3px white rim; its focus is a Moña Soft halo with a Moña ring. Blank dashed "nuevo" labels preview the students being added, and the result leads with "+ $" in Pasto Ink.

### Named Rules
**The Agendado Word Rule.** (Mis clases) Future money is called "Agendado" everywhere it is shown (legends, tooltips, tables, sentences). Never "previsto", "pendiente" or "esperado".

**The Matching Frame Rule.** An etiqueta's frame always takes the colour of the forro it sits on.

**The Counter Is The Forro Rule.** No nested cards. The forro is the container and the etiqueta is the only thing stuck on it; never put a forro or an etiqueta inside a panel to frame it again.

## Do's and Don'ts

### Do:
- **Do** derive a book's forro colour and print from its id and reuse them on every surface that shows that book.
- **Do** frame each etiqueta in the colour of the forro it sits on.
- **Do** keep forro prints at white .14 alpha or less, and switch titles to ink on Girasol and Naranja forros.
- **Do** keep Girasol for things that can be pressed: one Go button per context, the toast's undo, the home mark.
- **Do** write names, grades and dates on etiquetas in Patrick Hand; keep everything else in Baloo 2 or Atkinson Hyperlegible.
- **Do** show dates as dd/mm, with the weekday spelled out wherever a date is being set.
- **Do** use blurred, Moña-tinted shadows: Rest for surfaces, Lift for what responds.
- **Do** keep touch targets at 44px or more and the lend action at 56px.
- **Do** give each student one forro ink when added (least used first), store it, and frame their class and debtor labels and fill their avatar with it; switch initials to Ink on Girasol and Naranja.
- **Do** lead each page with one figure and put the rest in sentences, stats lists or charts.
- **Do** put the week first in portrait, with the week's money as one line above it.
- **Do** use the validated chart pairs: Ganado `#2347b5` with Agendado `#6d8cf0`; Hoy `#2347b5` with Nuevos `#21804a`; per-student bars in one hue.
- **Do** call future money "Agendado".
- **Do** switch pressed states (chips, segments, the currency switch) instantly.

### Don't:
- **Don't** use hard zero-blur offset shadows.
- **Don't** put an inset side stripe on a forro; the forro's colour and print are the whole identity.
- **Don't** use Girasol on non-pressable surfaces, labels, headings or decoration.
- **Don't** nest cards: the counter is the forro itself, not a panel holding one.
- **Don't** colour a book by its state; state lives on the etiqueta, the late flag and pills.
- **Don't** use Patrick Hand for headings, buttons or table data.
- **Don't** build rows of stat tiles.
- **Don't** colour per-student bars by the student's ink; the dot carries identity.
- **Don't** use bounce or elastic easing; everything uses `cubic-bezier(.16,1,.3,1)`.
- **Don't** transition `width`; bars, meters and projections jump to their new length.
