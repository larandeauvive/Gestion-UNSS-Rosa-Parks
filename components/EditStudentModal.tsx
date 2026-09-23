import { updateStudent, deleteStudent } from '../lib/db';
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { X, Save, FileEdit, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSuccess
}) => {
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDel, setShowConfirmDel] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData(student);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateStudent(student.id, {
        gender: formData.gender || 'M',
        paid: formData.paid || 'NON',
        paymentMethod: formData.paymentMethod || '',
        checkNumber: formData.checkNumber || '',
        amount: formData.amount || '',
        parentalAuth: formData.parentalAuth || 'NON',
        imageRights: formData.imageRights || 'NON',
        swimmingCertificate: formData.swimmingCertificate || 'NON',
        tshirt: formData.tshirt || 'NON',
        size: formData.size || '',
        licenseNumber: formData.licenseNumber || '',
        classGroup: formData.classGroup || '',
        birthDate: formData.birthDate || '',
        opussChecked: formData.opussChecked || false
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await deleteStudent(student.id);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {student.lastName} {student.firstName}
                </h3>
                <p className="text-xs text-slate-400 font-medium">{student.classGroup} &bull; {student.schoolYear}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Genre / Sexe
                </label>
                <select
                  value={formData.gender || 'M'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="M">Garçon (M)</option>
                  <option value="F">Fille (F)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Classe
                </label>
                <input
                  type="text"
                  value={formData.classGroup || ''}
                  onChange={(e) => setFormData({ ...formData, classGroup: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Date de naissance
                </label>
                <input
                  type="text"
                  value={formData.birthDate || ''}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  placeholder="JJ/MM/AAAA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  N° Licence
                </label>
                <input
                  type="text"
                  value={formData.licenseNumber || ''}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  N° de Chèque
                </label>
                <input
                  type="text"
                  value={formData.checkNumber || ''}
                  onChange={(e) => setFormData({ ...formData, checkNumber: e.target.value })}
                  placeholder="Ex: 8492041"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Payé (€)
                </label>
                <select
                  value={formData.paid || 'NON'}
                  onChange={(e) => setFormData({ ...formData, paid: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Montant
                </label>
                <input
                  type="text"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Ex: 20"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Mode
                </label>
                <select
                  value={formData.paymentMethod || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">--</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Pass'Sport">Pass'Sport</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Aut. Parentale
                </label>
                <select
                  value={formData.parentalAuth || 'NON'}
                  onChange={(e) => setFormData({ ...formData, parentalAuth: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Droit à l'image
                </label>
                <select
                  value={formData.imageRights || 'NON'}
                  onChange={(e) => setFormData({ ...formData, imageRights: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Savoir Nager
                </label>
                <select
                  value={formData.swimmingCertificate || 'NON'}
                  onChange={(e) => setFormData({ ...formData, swimmingCertificate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  T-shirt
                </label>
                <select
                  value={formData.tshirt || 'NON'}
                  onChange={(e) => setFormData({ ...formData, tshirt: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="OUI">OUI</option>
                  <option value="NON">NON</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Taille
                </label>
                <input
                  type="text"
                  value={formData.size || ''}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="Ex: M, L, 14 ans"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="opussChecked"
                checked={!!formData.opussChecked}
                onChange={(e) => setFormData({ ...formData, opussChecked: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <label htmlFor="opussChecked" className="text-sm font-medium text-slate-700">
                Saisi / Validé sur OPUSS
              </label>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmDel(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> Supprimer
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDel}
        title="Supprimer l'élève"
        message={`Êtes-vous sûr de vouloir supprimer définitivement ${student.firstName} ${student.lastName} de la base de données ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmDel(false)}
      />
    </>
  );
};
