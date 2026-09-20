import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Modal } from './Modal';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetModal({ isOpen, onClose }: ResetModalProps) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetType, setResetType] = useState<'calendar' | 'all'>('calendar');

  const handleNext = () => {
    if (password !== 'EPS2026') {
      setError('Mot de passe incorrect');
      return;
    }
    setError('');
    setStep(2);
  };

  const deleteCollectionDocs = async (colName: string) => {
    const snap = await getDocs(collection(db, colName));
    let batch = writeBatch(db);
    let count = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      count++;
      if (count % 450 === 0) {
        await batch.commit();
        batch = writeBatch(db);
      }
    }
    if (count % 450 !== 0) {
      await batch.commit();
    }
  };

  const handleConfirm = async () => {
    try {
      if (resetType === 'calendar') {
        await deleteCollectionDocs('sessions');
        await deleteCollectionDocs('convocations');
      } else {
        await deleteCollectionDocs('sessions');
        await deleteCollectionDocs('convocations');
        await deleteCollectionDocs('students');
        await deleteCollectionDocs('teachers');
      }
      onClose();
      // Reset state on close
      setTimeout(() => {
        setStep(1);
        setPassword('');
        setError('');
      }, 300);
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la réinitialisation');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Réinitialiser les données">
      {step === 1 ? (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Zone de danger</p>
              <p>Cette action est irréversible. Vous pouvez choisir de vider uniquement le calendrier ou de supprimer toutes les données de l'application.</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input 
                type="radio" 
                name="resetType" 
                value="calendar" 
                checked={resetType === 'calendar'}
                onChange={(e) => setResetType(e.target.value as any)}
                className="w-4 h-4 text-red-600"
              />
              <div>
                <div className="font-medium text-slate-900">Vider le calendrier uniquement</div>
                <div className="text-xs text-slate-500">Supprime toutes les séances et convocations. Les élèves et enseignants sont conservés.</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100">
              <input 
                type="radio" 
                name="resetType" 
                value="all" 
                checked={resetType === 'all'}
                onChange={(e) => setResetType(e.target.value as any)}
                className="w-4 h-4 text-red-600"
              />
              <div>
                <div className="font-medium text-red-900">Tout réinitialiser</div>
                <div className="text-xs text-red-700">Supprime TOUTES les données (élèves, séances, profs...).</div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mot de passe de sécurité
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Entrez le mot de passe pour continuer"
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleNext}
              disabled={!password}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-900 mb-2">Confirmation finale</h3>
            <p className="text-red-700 text-sm">
              {resetType === 'calendar' 
                ? "Vous êtes sur le point de supprimer DÉFINITIVEMENT toutes les séances et convocations. Cette action ne peut pas être annulée."
                : "Vous êtes sur le point de supprimer DÉFINITIVEMENT TOUTE la base de données. L'application sera entièrement vide."}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Oui, je confirme la suppression
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
