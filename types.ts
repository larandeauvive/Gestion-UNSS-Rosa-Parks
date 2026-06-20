export interface Student {
  id: string; // Generated unique ID
  lastName: string; // Nom
  firstName: string; // Prénom
  classGroup: string; // Classe
  schoolYear: string; // Année scolaire
  licenseNumber: string; // N° Licence
  paid: string; // Payé (OUI/NON)
  amount: string; // Montant
  paymentMethod: string; // Mode de Paiement
  parentalAuth: string; // Autorisation Parentale
  imageRights: string; // Droit à l'image
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

export interface ColumnDefinition {
  key: keyof Student;
  label: string;
  visible: boolean;
}