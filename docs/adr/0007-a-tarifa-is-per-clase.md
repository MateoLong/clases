# A Tarifa is per Clase, whatever its length

The owner told us (2026-10-17) that she charges per class, not per hour: a Clase costs the student's Tarifa whether it lasts 50 minutes (most do) or an hour. Before this, a Clase cost its minutes ÷ 60 × an hourly Tarifa, so a 50-minute class came out at 5/6 of the figure she had in mind.

Now every Clase, Clase extra or Clase movida costs exactly the Tarifa of its date. Its length still matters for the agenda, the hours in Ganancias and Horas por día, but not for money. In ¿Y si…? the rate is per Clase and the length chips change only the hours. "Hoy cobrás en promedio" is the average per Clase of her current week.

Tarifas saved before this change were hourly, and ADR 0003 says money already made never moves. So a stored Tarifa without `per` is read as `per: "hour"` and keeps pricing its Clases by length. Every Tarifa created from now on, including a raise over an old one, is `per: "class"`. The student page shows "por hora" for an old one until she changes it. Backups stay compatible: an old backup restores with its hourly Tarifas.

Rejected: a Tarifa per class of a set length, pro-rated for longer or shorter Clases. The owner first picked it, then changed course: lengths barely vary, and she charges the same either way. Also rejected: rewriting old hourly Tarifas as per-class ones, because that would change what past Clases earned.
