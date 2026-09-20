import React, { useState, useRef } from 'react';
import { 
  FileUp, FileText, Download, Trash2, CheckCircle2, AlertTriangle, 
  X, Loader2, Sparkles, HelpCircle 
} from 'lucide-react';
import { RegistrationFormDoc } from '../types';
import { formatFileSize, downloadRegistrationForm, generateAndPrintDefaultForm } from '../lib/registrationFormHelper';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

    // Vérification de taille (Firestore limite par document ~ 1 Mo, donc 900 Ko max en base64 pour être totalement sécurisé)
    const MAX_SIZE = 950 * 1024; // ~950 Ko
    if (file.size > MAX_SIZE) {
      setError(`Le fichier est trop volumineux (${formatFileSize(file.size)}). Pour garantir un chargement instantané sans saturation de la base, veuillez déposer un document de moins de 900 Ko (utilisez un PDF compressé).`);
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

      await setDoc(doc(db, 'settings', 'registrationForm'), formDoc, { merge: true });
      
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
      setError("Impossible d'enregistrer le fichier sur Firestore. Vérifiez votre connexion.");
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
      await deleteDoc(doc(db, 'settings', 'registrationForm'));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Gestion du Formulaire d'Inscription</h3>
              <p className="text-xs text-slate-400">Document téléchargeable sur le calendrier public partagé</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Uploaded Document Status */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Fichier actuellement en ligne</span>
              {currentForm ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Actif & Téléchargeable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Modèle standard par défaut
                </span>
              )}
            </div>

            {currentForm ? (
              <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate" title={currentForm.fileName}>
                      {currentForm.fileName}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{formatFileSize(currentForm.fileSize)}</span>
                      <span>•</span>
                      <span>Mis à jour le {new Date(currentForm.updatedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadRegistrationForm(currentForm)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Tester le téléchargement"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Supprimer le fichier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 space-y-2">
                <p>
                  Aucun fichier personnalisé n'a encore été téléversé. Par défaut, le calendrier propose le modèle d'adhésion officiel de l'AS Rosa Parks.
                </p>
                <button
                  type="button"
                  onClick={() => generateAndPrintDefaultForm()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Apercevoir le modèle par défaut</span>
                </button>
              </div>
            )}
          </div>

          {/* Upload Zone (Drag and Drop + Click) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {currentForm ? "Remplacer le formulaire par un nouveau fichier" : "Téléverser votre formulaire (PDF, Scan, Document)"}
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-indigo-600 bg-indigo-50/50' 
                  : selectedFile 
                    ? 'border-emerald-500 bg-emerald-50/20' 
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">{formatFileSize(selectedFile.size)} • Prêt à être mis en ligne</div>
                  <div className="pt-2">
                    <span className="text-xs font-medium text-indigo-600 hover:underline">Cliquez pour choisir un autre fichier</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    Glissez votre fichier ici ou <span className="text-indigo-600 underline">parcourez</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    PDF conseillé (ou Word, image). Taille maximale recommandée : 900 Ko.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Explanatory Info Card */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Synchronisation instantanée :</strong> Dès que vous cliquez sur <em>Enregistrer</em>, ce formulaire apparaîtra en haut du calendrier que vous partagez avec les élèves et familles.
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Fermer
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedFile || saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              selectedFile && !saving
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                <span>Mettre en ligne sur le calendrier</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
