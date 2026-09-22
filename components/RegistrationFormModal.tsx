import React, { useState, useRef } from 'react';
import { 
  FileUp, FileText, Download, Trash2, CheckCircle2, AlertTriangle, 
  X, Loader2, Sparkles, HelpCircle 
} from 'lucide-react';
import { RegistrationFormDoc } from '../types';
import { formatFileSize, downloadRegistrationForm, generateAndPrintDefaultForm } from '../lib/registrationFormHelper';
import { saveAppSetting, deleteAppSetting } from '../lib/db';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentForm: RegistrationFormDoc | null;
  onFormUpdated?: (form: RegistrationFormDoc | null) => void;
}

export const RegistrationFormModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  currentForm,
  onFormUpdated 
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setSuccessMessage(null);

    const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo en PostgreSQL
    if (file.size > MAX_SIZE) {
      setError(`Le fichier est trop volumineux (${formatFileSize(file.size)}). Veuillez déposer un document de moins de 5 Mo.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedFile(file);
      setPreviewDataUrl(result);
    };
    reader.onerror = () => {
      setError("Une erreur est survenue lors de la lecture du fichier.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !previewDataUrl) return;

    setSaving(true);
    setError(null);

    try {
      const formDoc: RegistrationFormDoc = {
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/pdf',
        fileSize: selectedFile.size,
        fileData: previewDataUrl,
        updatedAt: new Date().toISOString(),
        updatedBy: 'Enseignant AS Rosa Parks'
      };

      await saveAppSetting('registrationForm', formDoc);
      
      setSuccessMessage("Le formulaire a été enregistré avec succès ! Il est immédiatement téléchargeable sur le calendrier partagé.");
      setSelectedFile(null);
      setPreviewDataUrl(null);
      if (onFormUpdated) {
        onFormUpdated(formDoc);
      }
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Erreur enregistrement formulaire:", err);
      setError("Impossible d'enregistrer le fichier sur la base de données.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce formulaire ? Les familles ne pourront plus le télécharger directement.")) {
      return;
    }

    setSaving(true);
    try {
      await deleteAppSetting('registrationForm');
      if (onFormUpdated) {
        onFormUpdated(null);
      }
      setSelectedFile(null);
      setPreviewDataUrl(null);
      setSuccessMessage("Le formulaire a été supprimé.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Erreur suppression:", err);
      setError("Erreur lors de la suppression du formulaire.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-200">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Formulaire d'adhésion officiel</h3>
              <p className="text-xs text-slate-500 font-medium">Document téléchargeable par les parents et élèves sur le calendrier public</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Attention</p>
                <p className="text-xs text-rose-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Succès</p>
                <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Formulaire existant */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Document actuellement en ligne</h4>
            {currentForm ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{currentForm.fileName}</p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(currentForm.fileSize)} • Mis à jour le {new Date(currentForm.updatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => downloadRegistrationForm(currentForm)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Tester
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Aucun document personnalisé n'est actuellement en ligne.</span>
                  <p className="mt-0.5 text-amber-700">Par défaut, le bouton public génère une fiche type d'adhésion officielle imprimable.</p>
                </div>
              </div>
            )}
          </div>

          {/* Zone de drop / upload */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Déposer votre nouveau document (PDF recommandé)</h4>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]' 
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                  <span className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:underline">
                    Cliquer pour changer de fichier
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    Glissez-déposez votre formulaire ici, ou <span className="text-indigo-600">parcourez</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Format PDF ou Image (JPEG, PNG). Poids maximum : 5 Mo.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Générateur alternatif intégré */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-indigo-900">Besoin d'un modèle prêt à l'emploi ?</p>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Vous pouvez générer et imprimer instantanément le formulaire type officiel de l'AS Rosa Parks (prêt pour signature parentale).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => generateAndPrintDefaultForm()}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold whitespace-nowrap shadow-xs transition-colors shrink-0"
            >
              Générer modèle
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFile || saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" /> Mettre en ligne
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
