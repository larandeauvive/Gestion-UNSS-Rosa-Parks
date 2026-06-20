import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, Check, FileSpreadsheet, Loader2, Play, Users, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { Student } from '../types';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  activeYear: string;
  onSuccess: () => void;
}

function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function normalizeStr(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export const ImportWizard: React.FC<ImportWizardProps> = ({ isOpen, onClose, activeYear, onSuccess }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [unssData, setUnssData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<Omit<Student, 'id'>[]>([]);

  const [targetClass, setTargetClass] = useState('');

  if (!isOpen) return null;

  const handleStudentsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setStudentsData(results.data);
      }
    });
  };

  const handleUnssUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setUnssData(results.data);
      }
    });
  };

  const processMapping = () => {
    setIsProcessing(true);
    
    // Parse Pronote/Student data
    const parsedStudents: Omit<Student, 'id'>[] = studentsData.map(row => {
      const el = row['Élèves'] || row['Eleves'] || row['Nom Prénom'] || '';
      
      // Extract LastName / FirstName based on Uppercase words
      const parts = el.trim().split(/\s+/);
      const lastNameParts = [];
      const firstNameParts = [];
      
      for (const part of parts) {
        if (part === part.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(part)) {
          lastNameParts.push(part);
        } else {
          firstNameParts.push(part);
        }
      }
      if (lastNameParts.length === 0) {
        lastNameParts.push(parts[0] || '');
        firstNameParts.push(...parts.slice(1));
      }

      const extractedClass = (row['Classe de rattachement'] || row['Classe'] || '').toUpperCase();

      return {
        lastName: lastNameParts.join(' ').toUpperCase(),
        firstName: firstNameParts.join(' '),
        birthDate: row['Né(e) le'] || row['Date de naissance'] || '',
        classGroup: targetClass || extractedClass,
        schoolYear: activeYear,
        licenseNumber: '',
        paid: 'NON',
        amount: '',
        paymentMethod: '',
        parentalAuth: '',
        imageRights: '',
        tshirt: '',
        size: ''
      };
    }).filter(s => s.lastName);

    // Cross-reference with UNSS data
    parsedStudents.forEach(student => {
      if (!student.birthDate) return;
      
      const potentialMatches = unssData.filter(unss => {
        return (unss['Date de naissance'] === student.birthDate) || (unss['Né(e) le'] === student.birthDate);
      });

      if (potentialMatches.length > 0) {
        // Find best match by first name
        let bestMatch = null;
        let bestScore = Infinity;

        const sFirstName = normalizeStr(student.firstName);
        
        for (const unss of potentialMatches) {
          const uFirstName = normalizeStr(unss['Prénom'] || '');
          const score = levenshtein(sFirstName, uFirstName);
          if (score < bestScore) {
            bestScore = score;
            bestMatch = unss;
          }
        }

        // Tolerance of max 5 edits or if lengths are short, proportional tolerance
        if (bestMatch && bestScore <= 4) {
          student.licenseNumber = bestMatch['Numéro de licence'] || '';
          if (!student.classGroup) {
            // Try to extract class from UNSS if missing
             student.classGroup = (bestMatch['Classe'] || bestMatch['Niveau Classe'] || '').toUpperCase();
          }
        }
      }
    });

    setPreviewData(parsedStudents);
    setStep(3);
    setIsProcessing(false);
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      for (const student of previewData) {
        const docRef = doc(collection(db, "students"));
        batch.set(docRef, student);
        count++;
        
        if (count % 499 === 0) {
          await batch.commit();
        }
      }
      
      if (count % 499 !== 0) {
        await batch.commit();
      }
      
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'enregistrement.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col my-auto max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Assistant d'Importation</h2>
            <p className="text-sm text-slate-500 font-medium">Validation et croisement pour l'année {activeYear}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Pronote File */}
                <div className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${studentsData.length > 0 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${studentsData.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                    {studentsData.length > 0 ? <Check className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">Fichier Élèves (Pronote)</h3>
                  <p className="text-xs text-slate-500 mb-4 max-w-[250px]">Fichier CSV contenant la liste des élèves (Nom/Prénom, Date de naissance, etc.)</p>
                  
                  <label className="cursor-pointer bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                    Sélectionner le fichier
                    <input type="file" accept=".csv" className="hidden" onChange={handleStudentsUpload} />
                  </label>
                  
                  {studentsData.length > 0 && <p className="text-xs text-emerald-600 font-semibold mt-3">{studentsData.length} lignes détectées</p>}
                </div>

                {/* UNSS File */}
                <div className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${unssData.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${unssData.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                    {unssData.length > 0 ? <Check className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">Fichier Licenciés (UNSS)</h3>
                  <p className="text-xs text-slate-500 mb-4 max-w-[250px]">Fichier CSV OPUSS contenant les numéros de licences UNSS.</p>
                  
                  <label className="cursor-pointer bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                    Sélectionner le fichier (Optionnel)
                    <input type="file" accept=".csv" className="hidden" onChange={handleUnssUpload} />
                  </label>
                  {unssData.length > 0 && <p className="text-xs text-blue-600 font-semibold mt-3">{unssData.length} lignes détectées</p>}
                </div>

              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm">Classe de rattachement (Optionnel)</h3>
                  <p className="text-xs text-slate-500 mt-1">Si vous importez une classe complète, renseignez-la ici pour forcer son affectation.</p>
                </div>
                <input 
                  type="text" 
                  value={targetClass}
                  onChange={e => setTargetClass(e.target.value.toUpperCase())}
                  placeholder="ex: 3EME A"
                  className="px-4 py-2 w-48 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500 uppercase font-medium"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  disabled={studentsData.length === 0 || isProcessing}
                  onClick={processMapping}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Lancer le croisement
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
             <div className="space-y-4 animate-in fade-in zoom-in-95">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Traitement réussi : {previewData.length} élèves identifiés.</span>
                  </div>
                  <div className="text-sm">
                    {previewData.filter(s => s.licenseNumber).length} licences trouvées
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto bg-white shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nom</th>
                        <th className="px-4 py-3">Prénom</th>
                        <th className="px-4 py-3">Date de Naissance</th>
                        <th className="px-4 py-3">N° Licence UNSS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.slice(0, 100).map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{s.lastName}</td>
                          <td className="px-4 py-2">{s.firstName}</td>
                          <td className="px-4 py-2 text-slate-500">{s.birthDate}</td>
                          <td className="px-4 py-2">
                            {s.licenseNumber ? (
                               <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 font-mono text-xs">
                                 {s.licenseNumber}
                               </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 100 && (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                      Affichage des 100 premiers résultats sur {previewData.length}.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                    Retour
                  </button>
                  <button 
                    onClick={handleSave} 
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-medium hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    Ajouter à la base {activeYear}
                  </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
