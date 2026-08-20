export const getGradeFromPoints = (points) => {
  if (points >= 10) return 'A';
  if (points >= 7) return 'B';
  if (points >= 4) return 'C';
  if (points >= 1) return 'D';
  return 'F';
};