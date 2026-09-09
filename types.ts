export interface Student {
  id: string; // Generated unique ID
  lastName: string; // Nom
  firstName: string; // Prénom
  classGroup: string; // Classe
  gender?: string; // Sexe (F/G)
  schoolYear: string; // Année scolaire
  licenseNumber: string; // N° Licence
  paid: string; // Payé (OUI/NON)
  amount: string; // Montant
  paymentMethod: string; // Mode de Paiement
  checkNumber?: string; // Numéro de chèque
  parentalAuth: string; // Autorisation Parentale
  imageRights: string; // Droit à l'image
  swimmingCertificate?: string; // Savoir nager
  tshirt: string; // T-shirt
  size: string; // Taille
  birthDate?: string; // Date de naissance
  opussChecked?: boolean; // Case à cocher pour suivi OPUSS
  [key: string]: string | boolean | undefined; // Index signature for dynamic access
}

export interface CsvRow {
  "Nom": string;
  "Prénom": string;
  "Classe": string;
  "N° Licence": string;
  "Payé": string;
  "Montant": string;
  "Mode de Paiement": string;
  "Autorisation Parentale": string;
  "Droit à l'image": string;
  "T-shirt": string;
  "Taille": string;
}

export interface Convocation {
  id: string;
  competitionName: string;
  departureDate: string;
  returnDate: string;
  guides: string; // accompagnateurs
  needSnack: string; // OUI/NON
  needPicnic: string; // OUI/NON
  schoolYear: string; 
  studentIds: string[]; // Liste des IDs des élèves
  tshirtManagerId?: string;
  snackManagerIds?: string[];
  sessionId?: string; // ID de la séance liée
}

export interface Session {
  id: string;
  date: string; // ISO date string
  time: string; // Horaire de début (ex: "13:30")
  endTime?: string; // Horaire de fin (ex: "15:30")
  location?: string; // Lieu de la séance
  needSnack?: boolean; // Besoin d'un goûter (true/false)
  description?: string; // Informations supplémentaires
  requireLicense: boolean; // Obligation d'être à jour de sa licence
  name: string; // Nom de la séance (ex: "Entraînement Mercredi")
  schoolYear: string;
  enrolledStudentIds: string[]; // Élèves inscrits
  presentStudentIds: string[]; // Élèves pointés présents
  convocationId?: string; // ID de la convocation liée
}

export interface ColumnDefinition {
  key: keyof Student;
  label: string;
  visible: boolean;
}
