import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchBackup, restoreBackup } from '../lib/db';

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const backupData = await fetchBackup();

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_as_rosa_parks_postgresql_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert('Erreur lors de la sauvegarde: ' + (e.message || ''));
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
        
        await restoreBackup(data);

        setImportStatus('success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        console.error(err);
        setImportStatus('error');
        setErrorMessage(err.message || "Erreur lors de la restauration du fichier.");
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Sauvegarde & Restauration (PostgreSQL)</h3>
            <p className="text-xs text-slate-500 mt-1">Exportez ou restaurez l'intégralité de la base de données relationnelle.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-indigo-600" /> Exporter les données
            </h4>
            <p className="text-sm text-slate-600 mb-4">
              Téléchargez un fichier JSON contenant toutes les données (élèves, créneaux, séances, convocations, personnels).
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Export en cours...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Exporter en JSON
                </>
              )}
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-amber-600" /> Restaurer une sauvegarde
            </h4>
            <p className="text-sm text-slate-600 mb-4">
              Importez un fichier JSON préalablement sauvegardé pour réécrire ou compléter les données.
            </p>

            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-4 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                La restauration mettra à jour et ajoutera les documents du fichier dans la base PostgreSQL.
              </p>
            </div>

            <label className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Restauration en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-500" /> Choisir un fichier JSON
                </>
              )}
              <input 
                type="file" 
                accept=".json,application/json" 
                onChange={handleImport}
                disabled={isImporting}
                className="hidden" 
              />
            </label>

            {importStatus === 'success' && (
              <p className="mt-2 text-sm text-emerald-600 font-semibold text-center animate-in fade-in">
                Restauration réussie ! Rechargement...
              </p>
            )}

            {importStatus === 'error' && (
              <p className="mt-2 text-sm text-rose-600 font-medium text-center animate-in fade-in">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
