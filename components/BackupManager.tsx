import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where, getDoc, getDocs, writeBatch, setDoc, orderBy } from '../lib/firestore-mock';
import { db } from '../lib/firebase';
import React, { useState } from 'react';
import { useDatabase } from '../hooks/useDatabase';

import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({ isOpen, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const COLLECTIONS = ['students', 'sessions', 'convocations', 'teachers'];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backupData: Record<string, any[]> = {};
      
      for (const colName of COLLECTIONS) {
        const querySnapshot = await getDocs(collection(db, colName));
        backupData[colName] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_as_rosa_parks_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('idle');
    setErrorMessage('');
    
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
       setErrorMessage("Le fichier doit être au format JSON.");
       return;
    }

    setIsImporting(true);
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);
        
        // Validate basic structure
        let isValid = false;
        for (const colName of COLLECTIONS) {
          if (data[colName] && Array.isArray(data[colName])) {
            isValid = true;
          }
        }

        if (!isValid) {
           throw new Error("Le fichier JSON ne contient pas de données compatibles.");
        }

        let batch = writeBatch(db);
        let count = 0;

        for (const colName of COLLECTIONS) {
          if (data[colName] && Array.isArray(data[colName])) {
            for (const item of data[colName]) {
              const { id, ...docData } = item;
              if (!id) continue;
              
              const docRef = doc(db, colName, id);
              batch.set(docRef, docData);
              count++;

              if (count % 499 === 0) {
                await batch.commit();
                batch = writeBatch(db);
              }
            }
          }
        }

        if (count % 499 !== 0) {
          await batch.commit();
        }

        setImportStatus('success');
        
        // Auto-close after success
        setTimeout(() => {
           onClose();
        }, 3000);
      } catch (e: any) {
        console.error(e);
        setErrorMessage(e.message || "Erreur lors de la lecture ou l'import du fichier.");
        setImportStatus('error');
      } finally {
        setIsImporting(false);
        if (e.target) {
            e.target.value = ''; // Reset input
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Sauvegarde et Restauration</h2>
          <p className="text-sm text-slate-500 mb-6">
            Exportez l'ensemble de la base de données de l'application (élèves, séances, convocations, encadrants) ou restaurez une sauvegarde précédente.
          </p>

          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">Sauvegarder les données</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Téléchargez un fichier JSON contenant l'intégralité de la base de données actuelle. Gardez ce fichier en lieu sûr.
                  </p>
                  <button 
                    onClick={handleExport}
                    disabled={isExporting || isImporting}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Télécharger la sauvegarde
                  </button>
                </div>
              </div>
            </div>

            {/* Import Section */}
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
              <div className="flex items-start gap-4">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">Restaurer les données</h3>
                  <p className="text-xs text-amber-700/80 mb-3">
                    Attention : L'importation d'un fichier écrasera les documents existants portant le même identifiant. Utilisez cette fonction uniquement si vous souhaitez restaurer vos données depuis une sauvegarde.
                  </p>
                  
                  {importStatus === 'error' && (
                    <div className="mb-3 text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-md">
                      <AlertTriangle className="w-4 h-4" />
                      {errorMessage}
                    </div>
                  )}

                  {importStatus === 'success' && (
                    <div className="mb-3 text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded-md font-medium">
                      ✓ Restauration terminée avec succès.
                    </div>
                  )}

                  <label className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer w-max ${isImporting ? 'opacity-50 cursor-not-allowed bg-white border-amber-200 text-amber-500' : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-100'}`}>
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Sélectionner un fichier JSON
                    <input 
                      type="file" 
                      accept=".json"
                      className="hidden" 
                      onChange={handleImport}
                      disabled={isImporting || isExporting}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
          <button 
            onClick={onClose}
            disabled={isExporting || isImporting}
            className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
