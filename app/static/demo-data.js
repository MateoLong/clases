// Example data so the app can be tried before her real students are loaded.
// Every student is marked as demo and can be removed from Ajustes. Names and amounts are invented.

export const WEEKS_BACK = 22;

// [name, rate per class now, currency, weekly slots [weekday 1=Mon, start, minutes, "zoom" or nothing for Presencial], rate before a raise 6 weeks ago (or null)]
export const STUDENTS = [
  ["Martina López", 700, "UYU", [[1, "17:00", 50], [4, "17:00", 50]], 650],
  ["Joaquín Pereira", 900, "UYU", [[1, "18:30", 60]], null],
  ["Sofía González", 750, "UYU", [[2, "16:00", 50]], null],
  ["Bruno Rodríguez", 650, "UYU", [[3, "17:00", 50], [5, "15:00", 50]], 600],
  ["Emma Acosta", 20, "USD", [[2, "18:00", 60, "zoom"]], null],
  ["Lucía Fernández", 1400, "UYU", [[6, "10:00", 120]], null],
];
