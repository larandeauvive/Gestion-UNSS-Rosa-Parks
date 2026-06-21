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
  [key: string]: string | undefined; // Index signature for dynamic access
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
}

export interface ColumnDefinition {
  key: keyof Student;
  label: string;
  visible: boolean;
}
