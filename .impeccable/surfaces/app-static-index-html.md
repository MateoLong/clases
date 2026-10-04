---
version: 1
slug: "app-static-index-html"
primary_target: "app/static/index.html"
related_targets: []
---

# Surface: Mis clases (all screens)

Scope: app/static/index.html and its routes: Agenda, Alumnos, Ganancias, ¿Y si…?, Ajustes. Mode: Operate.
Audience/job: one tutor on her iPad: see her week, handle a cancellation or a payment in seconds, check her month, play with "what if I add students".
World: inherited from Biblioteca (DESIGN.md), pinned by the owner ("same UI as Biblioteca"). Structure chosen by the owner from the surface roll (Week board).

## Direction contract

THESIS: Her week as a board of school labels. Every class is a small etiqueta stuck on its day, and the money sits in a rail beside it. This replaces the category default: a grey calendar grid with an invoices table.

OWN-WORLD: Inherited Biblioteca world: cobalt star-print band, túnica-white ground, sunflower only on things she can press. Each student keeps one forro colour everywhere. A class label is framed in its student's forro colour, with the name in Patrick Hand, the time big in Baloo, and the amount in Atkinson tabular figures. Given classes carry a check. Cancelled ones are struck and dimmed. "Se cobra" cancellations keep their amount.

STORY: She opens it on today's week. She sees what she has already earned this week, what is still to come, and who owes her. She taps a class to cancel, move or charge it. In Ganancias she sees her months grow. In ¿Y si…? she drags sliders and watches her month grow with new students.

FIRST VIEWPORT: Cobalt band with "Mis clases", the tabs, and a UYU/USD switch at the right. Week header: ‹ 6–12 oct › with "Hoy". Main area: day columns Lun–Sáb (Dom only when it has classes), today tinted. Class labels are stacked by time. Right rail (about 300px): ESTA SEMANA (dados / faltan / total), TE DEBEN with the students listed and a Cobrar action each, and the selected class's actions. The sunflower "Clase extra" button sits in the rail. In portrait the columns become a day list and the rail moves on top.

SIGNATURE MOVE: Marking a payment stamps "PAGADO" diagonally across the student's owed label, with a rubber-stamp press of about 400ms that honours reduced motion. Raise from the student-shelf card: each student's colour is their identity across agenda, charts and lists.

FORM: owner-chosen dealt structure "Week board" (my candidate 1 of 7), seed key 5382ceb5.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
