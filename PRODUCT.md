# Product

<!-- impeccable:product-schema 1 -->

> Source: the owner's brief (2026-10-03) for his mother, plus four answers he confirmed. Lines marked *(inferred)* were decided by Claude and not confirmed.

## Platform

web

## Stack

Same as the sister app Biblioteca: static web app (vanilla HTML/CSS/JS, no build step) installed to her iPad's Home Screen; data in IndexedDB on that iPad; service worker for offline use; backups as JSON files. Published on GitHub Pages at its own address.

## Users

The owner's mother, a school librarian who also gives private classes to a handful of students. She uses it on her iPad (Safari), at home, planning her week and checking what she has earned. Only she uses it.

## Product Purpose

Keep her private-class agenda and money in one place: who comes when, what each one pays per hour, what she has earned per week and month (with charts), who still owes her, and a playground to see how much more she would make by taking on more students. Success: she opens it, sees her week and her month at a glance, and enjoys playing with "¿y si sumo alumnos?".

## Positioning

A personal class book for one tutor, not a booking or invoicing system: no clients log in, nothing is sent anywhere.

## Operating Context

- Students mostly come at the **same weekly slot** (confirmed); she cancels, moves or adds an extra class when something changes.
- A class counts as **earned once its time passes** unless she suspends it; she **marks payments**, so the app knows who owes her and how much (confirmed).
- Students **pay at the start of the month for the whole month** (the Cuota), and **a Clase the student misses is still charged**. One she suspends is not (confirmed 2026-10-04, ADR 0006).
- Some students **have no fixed day** and book Clases one at a time (confirmed 2026-10-04).
- Amounts are in **UYU**, with a switch to **USD** using an exchange rate **she types** in Ajustes (confirmed).
- Rate changes apply from a date on; past classes keep the rate they had. *(inferred)*
- A suspended class can still be charged ("Cobrarla igual"). *(inferred)*
- Each student's rate can be in UYU or USD; totals convert to the chosen currency. *(inferred)*

## Capabilities and Constraints

- Week agenda; students with rates and weekly slots; cancel / move / extra class; payments and balances; earnings per week and per month with charts; projection simulator; currency switch; backup / restore; Excel export.
- Offline, single user, no login, Spanish (Uruguay), dates shown with the month name by default ("7 de octubre"; Ajustes can switch to "7 oct" or "7/10") and typed as day/month, 24-hour times, week starts Monday.
- Her income data never leaves the iPad.

## Brand Commitments

- "Same UI as Biblioteca, which is really nice" (owner, binding): the forro y etiqueta world recorded in DESIGN.md.

## Evidence on Hand

No real students or figures. Demo data is invented and clearly labelled; she can clear it.

## Product Principles

1. Her week first: the agenda opens on today.
2. Money she can trust: past earnings never change when rates or slots change.
3. Playing is the point of the projection: instant, no forms.
4. Same calm, warm world as Biblioteca.

## Accessibility & Inclusion

Touch-first iPad, large targets, WCAG AA contrast, numbers in tabular figures.
