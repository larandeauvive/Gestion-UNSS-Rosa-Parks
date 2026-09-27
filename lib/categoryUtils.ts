import { Student } from '../types';

/**
 * Critère disponible pour la personnalisation des convocations
 */
export interface ConvocationCriterion {
  id: string;
  label: string;
  defaultChecked: boolean;
}

export const AVAILABLE_CONVOCATION_CRITERIA: ConvocationCriterion[] = [
  { id: 'classGroup', label: 'Classe', defaultChecked: true },
  { id: 'licenseNumber', label: 'N° Licence', defaultChecked: true },
  { id: 'category', label: 'Catégorie (BF/BG, MF/MG...)', defaultChecked: true },
  { id: 'birthDate', label: 'Date de naissance', defaultChecked: false },
  { id: 'gender', label: 'Sexe (F/G)', defaultChecked: false },
  { id: 'parentalAuth', label: 'Autorisation parentale (AP)', defaultChecked: true },
  { id: 'swimmingCertificate', label: 'Savoir nager', defaultChecked: false },
  { id: 'paid', label: 'Cotisation réglée (€)', defaultChecked: false },
  { id: 'size', label: 'Taille maillot', defaultChecked: false },
  { id: 'imageRights', label: 'Droit image', defaultChecked: false },
  { id: 'signature', label: 'Émargement / Signature', defaultChecked: true },
];

/**
 * Calcule la catégorie sportive UNSS (Benjamins, Minimes, Cadets, Juniors, Seniors)
 * selon la date de naissance et le sexe (F/G).
 */
export function getStudentCategory(
  student: { birthDate?: string; gender?: string },
  schoolYear?: string
): string {
  if (!student.birthDate) return '-';

  let birthYear: number | null = null;
  const str = String(student.birthDate).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    birthYear = parseInt(str.slice(0, 4), 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    birthYear = parseInt(parts[2], 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(str)) {
    const parts = str.split('/');
    const yy = parseInt(parts[2], 10);
    birthYear = yy < 50 ? 2000 + yy : 1900 + yy;
  } else {
    const match = str.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) birthYear = parseInt(match[1], 10);
  }

  if (!birthYear || isNaN(birthYear)) return '-';

  // Année de référence du début d'année scolaire (ex: "2026-2027" -> 2026)
  let refYear = new Date().getFullYear();
  if (schoolYear) {
    const match = schoolYear.match(/(\d{4})/);
    if (match) refYear = parseInt(match[1], 10);
  }

  const age = refYear - birthYear;
  const isFemale = (student.gender || '').toUpperCase().startsWith('F');
  const suffix = isFemale ? 'F' : 'G';

  if (age <= 12) return `B${suffix} (Benj.)`;
  if (age <= 14) return `M${suffix} (Minime)`;
  if (age <= 16) return `C${suffix} (Cadet)`;
  if (age <= 18) return `J${suffix} (Junior)`;
  return `S${suffix} (Sénior)`;
}
