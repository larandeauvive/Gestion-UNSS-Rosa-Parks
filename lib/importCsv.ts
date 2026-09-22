import Papa from "papaparse";
import { Student } from "../types";
import { batchUpsertStudentsApi } from "./db";

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRr0ZrIyv9ug3eRGj0iTrbJj9J0rBuJy5UiPkAvF0W_8-mKx8eU33gjc3FXzbxWmIh1iiqTR5yaRCga/pub?output=csv';

export async function importFromCSV(schoolYear: string): Promise<number> {
  return new Promise((resolve, reject) => {
    Papa.parse<any>(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const forceString = (val: any): string => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val).trim();
          };

          const mappedData: Partial<Student>[] = results.data
            .filter((row: any) => row['Nom'] && String(row['Nom']).trim() !== '')
            .map((row: any) => ({
              lastName: forceString(row['Nom']).toUpperCase(),
              firstName: forceString(row['Prénom']),
              classGroup: forceString(row['Classe']).toUpperCase(),
              schoolYear,
              licenseNumber: forceString(row['N° Licence']),
              paid: forceString(row['Payé'] || 'NON'),
              amount: forceString(row['Montant']),
              paymentMethod: forceString(row['Mode de Paiement']),
              parentalAuth: forceString(row['Autorisation Parentale']),
              imageRights: forceString(row["Droit à l'image"]),
              tshirt: forceString(row['T-shirt']),
              size: forceString(row['Taille'])
            }));

          const insertedCount = await batchUpsertStudentsApi(mappedData, schoolYear);
          resolve(insertedCount || mappedData.length);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}
