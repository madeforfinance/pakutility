/* Shared grade data for the student module. */

export interface GradeOption {
  grade: string;
  points: number;
}

/** Standard 4.0 scale used across Pakistani universities. */
export const GRADE_SCALE: GradeOption[] = [
  { grade: 'A+', points: 4.0 },
  { grade: 'A', points: 4.0 },
  { grade: 'A-', points: 3.7 },
  { grade: 'B+', points: 3.3 },
  { grade: 'B', points: 3.0 },
  { grade: 'B-', points: 2.7 },
  { grade: 'C+', points: 2.3 },
  { grade: 'C', points: 2.0 },
  { grade: 'C-', points: 1.7 },
  { grade: 'D+', points: 1.3 },
  { grade: 'D', points: 1.0 },
  { grade: 'F', points: 0.0 },
];

export interface GradeBand {
  grade: string;
  points: number;
  min: number; // inclusive percentage
  remarks: string;
}

/** Pakistani board/university percentage scheme. */
export const GRADE_BANDS: GradeBand[] = [
  { grade: 'A+', points: 4.0, min: 85, remarks: 'Outstanding' },
  { grade: 'A', points: 4.0, min: 80, remarks: 'Excellent' },
  { grade: 'B+', points: 3.5, min: 75, remarks: 'Very good' },
  { grade: 'B', points: 3.0, min: 70, remarks: 'Good' },
  { grade: 'C+', points: 2.5, min: 65, remarks: 'Above average' },
  { grade: 'C', points: 2.0, min: 60, remarks: 'Average' },
  { grade: 'D', points: 1.0, min: 50, remarks: 'Pass' },
  { grade: 'F', points: 0.0, min: 0, remarks: 'Fail' },
];

export function gradeForPercentage(pct: number): GradeBand {
  for (const b of GRADE_BANDS) {
    if (pct >= b.min) return b;
  }
  return GRADE_BANDS[GRADE_BANDS.length - 1];
}

export const SUBJECT_COLORS = [
  '#0B1F3A',
  '#D4AF37',
  '#12805c',
  '#175cd3',
  '#d92d20',
  '#7c3aed',
  '#0e7490',
  '#be185d',
];
