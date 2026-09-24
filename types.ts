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
  isAdult?: boolean; // Si c'est un adulte
  [key: string]: string | boolean | undefined; // Index signature for dynamic access
}

/**
 * Répertoire public minimal d'inscription
 * Contient le nom, prénom et les statuts administratifs (€, AP, natation, image)
 * pour informer directement l'élève lors de sa démarche d'inscription
 */
export interface PublicStudent {
  id: string;
  lastName: string;
  firstName: string;
  classGroup?: string;
  schoolYear?: string;
  paid?: string; // OUI/NON pour affichage statut €
  parentalAuth?: string; // OUI/NON pour affichage statut AP
  swimmingCertificate?: string; // OUI/NON pour statut savoir nager
  imageRights?: string; // OUI/NON pour droit à l'image
  licenseNumber?: string;
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

export interface Teacher {
  id: string;
  name: string;
}

export interface Convocation {
  id: string;
  competitionName: string;
  departureDate: string;
  returnDate: string;
  guides: string; // accompagnateurs
  teacherIds?: string[]; // Enseignants responsables
  needSnack: string; // OUI/NON
  needPicnic: string; // OUI/NON
  schoolYear: string; 
  studentIds: string[]; // Liste des IDs des élèves
  tshirtManagerId?: string;
  snackManagerIds?: string[];
  sessionId?: string; // ID de la séance liée
  targetAudience?: 'students' | 'adults' | 'all';
  meetingTime?: string; // Heure de RDV
  meetingLocation?: string; // Lieu de RDV
  cafeteriaTime?: string; // Heure de passage au self
  returnTime?: string; // Heure de retour
}

export interface SessionTeam {
  id: string; // Identifiant unique de l'équipe
  name: string; // Nom de l'équipe (ex: "Les Éperviers", "Team 3B")
  studentIds: string[]; // Liste des IDs des élèves composant l'équipe
  createdAt: string; // Date de création
}

export interface Session {
  id: string;
  date: string; // ISO date string
  time: string; // Horaire de début (ex: "13:30")
  endTime?: string; // Horaire de fin (ex: "15:30")
  location?: string; // Lieu de la séance
  teacherIds?: string[]; // Enseignants responsables
  needSnack?: boolean; // Besoin d'un goûter (true/false)
  description?: string; // Informations supplémentaires
  requireLicense: boolean; // Obligation d'être à jour de sa licence
  name: string; // Nom de la séance (ex: "Entraînement Mercredi")
  schoolYear: string;
  enrolledStudentIds: string[]; // Élèves inscrits
  presentStudentIds: string[]; // Élèves pointés présents
  convocationId?: string; // ID de la convocation liée
  maxParticipants?: number; // Nombre maximum de participants
  targetAudience?: 'students' | 'adults' | 'all';
  meetingTime?: string; // Heure de RDV
  meetingLocation?: string; // Lieu de RDV
  cafeteriaTime?: string; // Heure de passage au self
  returnTime?: string; // Heure de retour
  registrationOpenDate?: string; // Date d'ouverture des inscriptions
  registrationCloseDate?: string; // Date de fermeture des inscriptions
  isTeamRegistration?: boolean; // Inscription en équipe activée
  teamSize?: number; // Nombre d'élèves requis par équipe pour valider l'inscription
  teams?: SessionTeam[]; // Liste des équipes enregistrées
}

export interface ColumnDefinition {
  key: keyof Student;
  label: string;
  visible: boolean;
}

export interface RegistrationFormDoc {
  fileName: string;
  fileType: string;
  fileSize: number; // Taille en octets
  fileData: string; // Base64 Data URL (data:application/pdf;base64,...)
  updatedAt: string; // Date ISO de mise à jour
  updatedBy?: string;
  instructions?: string;
}

export interface EveningSlot {
  id: string;
  name: string; // ex: "Badminton / Volley Loisir"
  dayOfWeek: string; // "Lundi", "Mardi", "Jeudi", etc.
  startTime: string; // ex: "17:30"
  endTime: string; // ex: "19:00"
  location: string; // ex: "Gymnase Rosa Parks"
  description?: string;
  coachOrSupervisor?: string;
  schoolYear: string;
  active: boolean;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string; // "Enseignant", "AED / Vie scolaire", "Agent technique", "Administration / Direction", "Médico-social", "Autre"
  discipline?: string; // Matière ou service (ex: "Maths", "Anglais", "Accueil", "Maintenance")
  email?: string;
  phone?: string;
  schoolYear: string;
  // Statut licence & adhésion
  isLicenseUpToDate: boolean; // À jour de sa licence
  licenseNumber?: string;
  paid: boolean; // Cotisation réglée
  paymentAmount?: number; // Montant de la cotisation (ex: 20€)
  paymentMethod?: string; // "Chèque", "Espèces", "Virement", etc.
  medicalCertOrQuiz: boolean; // Certificat médical / questionnaire de santé attesté
  parentalOrPersonalAuth: boolean; // Fiche adhésion signée
  // Inscriptions aux créneaux du soir
  eveningSlotIds: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffAttendanceRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  slotId: string; // ID of EveningSlot
  slotName: string;
  schoolYear: string;
  presentStaffIds: string[]; // Liste des IDs des personnels présents
  excusedStaffIds?: string[]; // Liste des excusés
  notes?: string;
  recordedBy?: string;
  createdAt: string;
}

