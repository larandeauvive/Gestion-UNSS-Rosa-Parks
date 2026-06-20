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
  students: Student[];
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

export const ImportWizard: React.FC<ImportWizardProps> = ({ isOpen, onClose, activeYear, onSuccess, students }) => {
  const [mode, setMode] = useState<'pronote' | 'unss'>('pronote');
  const [step, setStep] = useState<1 | 2>(1);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewAddData, setPreviewAddData] = useState<Omit<Student, 'id'>[]>([]);
  const [previewUpdateData, setPreviewUpdateData] = useState<{ id: string, licenseNumber: string, originalStudent: Student }[]>([]);

  const [targetClass, setTargetClass] = useState('');

  if (!isOpen) return null;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
      }
    });
  };

  const processPronote = () => {
    setIsProcessing(true);
    
    const parsedStudents: Omit<Student, 'id'>[] = parsedData.map(row => {
      const el = row['Élèves'] || row['Eleves'] || row['Nom Prénom'] || '';
      
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

    setPreviewAddData(parsedStudents);
    setStep(2);
    setIsProcessing(false);
  };

  const processUnss = () => {
    setIsProcessing(true);

    const updates: { id: string, licenseNumber: string, originalStudent: Student }[] = [];

    parsedData.forEach(row => {
      const license = row['Numéro de licence'];
      const origLastName = row['Nom'] || '';
      const origFirstName = row['Prénom'] || '';
      const dob = row['Date de naissance'] || row['Né(e) le'] || '';

      if (!license || !dob) return;

      const potentialMatches = students.filter(s => s.schoolYear === activeYear && s.birthDate === dob);

      if (potentialMatches.length > 0) {
        let bestMatch = null;
        let bestScore = Infinity;

        const uFirstName = normalizeStr(origFirstName);
        const uLastName = normalizeStr(origLastName);

        for (const student of potentialMatches) {
          const sFirstName = normalizeStr(student.firstName);
          const score = levenshtein(sFirstName, uFirstName);
          
          if (score < bestScore) {
            bestScore = score;
            bestMatch = student;
          }
        }

        if (bestMatch && bestScore <= 4 && !bestMatch.licenseNumber) {
           updates.push({
             id: bestMatch.id,
             licenseNumber: license,
             originalStudent: bestMatch
           });
        }
      }
    });

    setPreviewUpdateData(updates);
    setStep(2);
    setIsProcessing(false);
  };

  const handleSaveAdd = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      for (const student of previewAddData) {
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

  const handleSaveUpdate = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      
      for (const update of previewUpdateData) {
        const docRef = doc(db, "students", update.id);
        batch.update(docRef, { licenseNumber: update.licenseNumber });
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
      alert("Erreur lors de la mise à jour.");
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col my-auto max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Importer des données</h2>
            <p className="text-sm text-slate-500 font-medium">Pour l'année {activeYear}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="flex border-b border-slate-200">
            <button 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mode === 'pronote' ? 'border-slate-900 text-slate-900 bg-slate-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              onClick={() => { setMode('pronote'); setParsedData([]); }}
            >
              1. Ajouter des élèves (Pronote)
            </button>
            <button 
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${mode === 'unss' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              onClick={() => { setMode('unss'); setParsedData([]); }}
            >
              2. Mettre à jour Licences (UNSS)
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && mode === 'pronote' && (
            <div className="space-y-6 animate-in fade-in">
              <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${parsedData.length > 0 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${parsedData.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                  {parsedData.length > 0 ? <Check className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Fichier Élèves (Pronote)</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">Importez un fichier CSV pour ajouter de nouveaux élèves à la base de données de l'année <b>{activeYear}</b>.</p>
                
                <label className="cursor-pointer bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors">
                  Sélectionner le fichier CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
                </label>
                
                {parsedData.length > 0 && <p className="text-sm text-emerald-600 font-semibold mt-4">{parsedData.length} lignes détectées</p>}
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm">Classe de rattachement (Optionnel)</h3>
                  <p className="text-xs text-slate-500 mt-1">Si vous importez une classe complète, renseignez-la ici pour forcer son affectation à l'ensemble du fichier.</p>
                </div>
                <input 
                  type="text" 
                  value={targetClass}
                  onChange={e => setTargetClass(e.target.value.toUpperCase())}
                  placeholder="ex: 3EME A"
                  className="px-4 py-2 w-full sm:w-48 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500 uppercase font-medium"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  disabled={parsedData.length === 0 || isProcessing}
                  onClick={processPronote}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Étape Suivante
                </button>
              </div>
            </div>
          )}

          {step === 1 && mode === 'unss' && (
            <div className="space-y-6 animate-in fade-in">
               <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${parsedData.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
                 <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${parsedData.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                  {parsedData.length > 0 ? <Check className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Fichier Licenciés (UNSS)</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm">Importez le CSV OPUSS pour attribuer automatiquement les numéros de licence aux élèves de <b>{activeYear}</b> déjà enregistrés.</p>
                
                <label className="cursor-pointer bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors">
                  Sélectionner le fichier CSV
                  <input type="file" accept=".csv" className="hidden" onChange={handleUpload} />
                </label>
                {parsedData.length > 0 && <p className="text-sm text-blue-600 font-semibold mt-4">{parsedData.length} lignes détectées</p>}
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  disabled={parsedData.length === 0 || isProcessing}
                  onClick={processUnss}
                  className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Croiser et prévisualiser
                </button>
              </div>
            </div>
          )}

          {step === 2 && mode === 'pronote' && (
             <div className="space-y-4 animate-in fade-in zoom-in-95">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Prêt à importer {previewAddData.length} élèves.</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto bg-white shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nom</th>
                        <th className="px-4 py-3">Prénom</th>
                        <th className="px-4 py-3">Date de Naissance</th>
                        <th className="px-4 py-3">Classe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewAddData.slice(0, 50).map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-medium text-slate-900">{s.lastName}</td>
                          <td className="px-4 py-2">{s.firstName}</td>
                          <td className="px-4 py-2 text-slate-500">{s.birthDate}</td>
                          <td className="px-4 py-2 font-medium">{s.classGroup}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewAddData.length > 50 && (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                      Affichage des 50 premiers résultats sur {previewAddData.length}.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                    Retour
                  </button>
                  <button 
                    onClick={handleSaveAdd} 
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-medium hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    Ajouter à la base
                  </button>
                </div>
             </div>
          )}

          {step === 2 && mode === 'unss' && (
             <div className="space-y-4 animate-in fade-in zoom-in-95">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">{previewUpdateData.length} élèves trouvés (sans licence).</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto bg-white shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Élève</th>
                        <th className="px-4 py-3">Date de Naissance</th>
                        <th className="px-4 py-3">N° Licence UNSS Attribué</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewUpdateData.slice(0, 50).map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">{u.originalStudent.lastName} {u.originalStudent.firstName}</td>
                          <td className="px-4 py-3 text-slate-500">{u.originalStudent.birthDate}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 font-mono text-xs font-semibold">
                              {u.licenseNumber}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {previewUpdateData.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                            Aucun élève correspondant sans licence trouvé.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {previewUpdateData.length > 50 && (
                    <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100">
                      Affichage des 50 premiers résultats sur {previewUpdateData.length}.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setStep(1)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                    Retour
                  </button>
                  <button 
                    onClick={handleSaveUpdate} 
                    disabled={isProcessing || previewUpdateData.length === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    Mettre à jour les profils
                  </button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};
