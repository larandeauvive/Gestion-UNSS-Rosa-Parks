import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { resetDatabaseApi } from '../lib/db';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResetModal({ isOpen, onClose }: ResetModalProps) {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetType, setResetType] = useState<'calendar' | 'all'>('calendar');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (password !== 'EPS2026') {
      setError('Mot de passe incorrect');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await resetDatabaseApi(resetType);
      onClose();
      setTimeout(() => {
        setStep(1);
        setPassword('');
        setError('');
      }, 300);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
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
                <div className="font-medium text-red-900">Réinitialiser toute l'application</div>
                <div className="text-xs text-red-700">Supprime TOUTES les données : élèves, séances, convocations, enseignants, personnels.</div>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe de confirmation</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Entrez le mot de passe"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Annuler
            </button>
            <button 
              type="button" 
              onClick={handleNext}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
            >
              Continuer
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
            <Trash2 className="w-12 h-12 text-red-600 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-red-900 mb-1">Êtes-vous absolument sûr ?</h3>
            <p className="text-sm text-red-700">
              {resetType === 'calendar' 
                ? 'Toutes les séances et convocations seront définitivement supprimées.' 
                : 'TOUTES les données de la base PostgreSQL seront définitivement supprimées.'}
            </p>
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => setStep(1)}
              disabled={loading}
              className="px-4 py-2 border rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
            >
              Retour
            </button>
            <button 
              type="button" 
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
            >
              {loading ? 'Réinitialisation...' : 'Oui, supprimer définitivement'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
