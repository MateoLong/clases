// Example data so the app can be tried before her real students are loaded.
// Every student is marked as demo and can be removed from Ajustes. Names and amounts are invented.

export const WEEKS_BACK = 22;

// [name, rate per hour now, currency, weekly slots [weekday 1=Mon, start, minutes], rate before a raise 6 weeks ago (or null)]
export const STUDENTS = [
  ["Martina López", 800, "UYU", [[1, "17:00", 60], [4, "17:00", 60]], 700],
  ["Joaquín Pereira", 900, "UYU", [[1, "18:30", 90]], null],
  ["Sofía González", 850, "UYU", [[2, "16:00", 60]], null],
  ["Bruno Rodríguez", 750, "UYU", [[3, "17:00", 60], [5, "15:00", 60]], 650],
  ["Emma Acosta", 25, "USD", [[2, "18:00", 60]], null],
  ["Lucía Fernández", 800, "UYU", [[6, "10:00", 120]], null],
];
