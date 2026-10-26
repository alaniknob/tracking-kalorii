/** Wiek w pełnych latach na dzień `referenceDate` (porównanie dat w UTC). */
export function ageInYears(birthDate: Date, referenceDate: Date): number {
  let age = referenceDate.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}
