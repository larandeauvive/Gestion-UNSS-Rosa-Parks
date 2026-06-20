import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { X, Save, FileEdit } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
      const docRef = doc(db, 'students', student.id);
      await updateDoc(docRef, {
        paid: formData.paid || 'NON',
        paymentMethod: formData.paymentMethod || '',
        amount: formData.amount || '',
        checkNumber: formData.checkNumber || '',
        tshirt: formData.tshirt || 'NON',
        size: formData.size || '',
        swimmingCertificate: formData.swimmingCertificate || 'NON',
        parentalAuth: formData.parentalAuth || 'NON',
        imageRights: formData.imageRights || 'NON',
      });
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la mise à jour.');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center">
                <FileEdit className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-900">{student.firstName} {student.lastName}</h2>
                <p className="text-sm font-medium text-slate-500">Edition du profil • {student.classGroup}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
           <div className="space-y-6">
              
              {/* Payment Info */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                 <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Paiement</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">A payé ?</label>
                      <select 
                        value={formData.paid || 'NON'}
                        onChange={e => setFormData({...formData, paid: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                      >
                        <option value="OUI">OUI</option>
                        <option value="NON">NON</option>
                      </select>
                    </div>
                    {formData.paid === 'OUI' && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Montant</label>
                          <input 
                            type="text" 
                            placeholder="ex: 15€"
                            value={formData.amount || ''}
                            onChange={e => setFormData({...formData, amount: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
                          <select 
                            value={formData.paymentMethod || ''}
                            onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                          >
                            <option value="">Sélectionner</option>
                            <option value="Espèces">Espèces</option>
                            <option value="Chèque">Chèque</option>
                            <option value="Pass'Sport">Pass'Sport</option>
                            <option value="Autre">Autre</option>
                          </select>
                        </div>
                        {formData.paymentMethod === 'Chèque' && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">N° Chèque</label>
                            <input 
                              type="text" 
                              placeholder="Numéro"
                              value={formData.checkNumber || ''}
                              onChange={e => setFormData({...formData, checkNumber: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                            />
                          </div>
                        )}
                      </>
                    )}
                 </div>
              </div>

              {/* T-Shirt */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                 <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">T-Shirt</h3>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Prend un T-shirt ?</label>
                      <select 
                        value={formData.tshirt || 'NON'}
                        onChange={e => setFormData({...formData, tshirt: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                      >
                        <option value="OUI">OUI</option>
                        <option value="NON">NON</option>
                      </select>
                    </div>
                    {formData.tshirt === 'OUI' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Taille</label>
                        <select 
                          value={formData.size || ''}
                          onChange={e => setFormData({...formData, size: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                        >
                          <option value="">Sélectionner</option>
                          <option value="S">S</option>
                          <option value="M">M</option>
                          <option value="L">L</option>
                          <option value="XL">XL</option>
                        </select>
                      </div>
                    )}
                 </div>
              </div>

              {/* Admin Info / Authorizations */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                 <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Autorisations & Documents</h3>
                 <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Savoir Nager</label>
                      <select 
                        value={formData.swimmingCertificate || 'NON'}
                        onChange={e => setFormData({...formData, swimmingCertificate: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                      >
                        <option value="OUI">OUI</option>
                        <option value="NON">NON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Autorisation Parentale</label>
                      <select 
                        value={formData.parentalAuth || 'NON'}
                        onChange={e => setFormData({...formData, parentalAuth: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                      >
                        <option value="OUI">OUI</option>
                        <option value="NON">NON</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Droit à l'image</label>
                      <select 
                        value={formData.imageRights || 'NON'}
                        onChange={e => setFormData({...formData, imageRights: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium bg-white"
                      >
                        <option value="OUI">OUI</option>
                        <option value="NON">NON</option>
                      </select>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
             <button
               type="button"
               onClick={onClose}
               className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
             >
               Annuler
             </button>
             <button
               type="submit"
               disabled={isSaving}
               className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white font-medium hover:bg-slate-800 rounded-xl transition-all disabled:opacity-50"
             >
               {isSaving ? 'Enregistrement...' : <><Save className="w-4 h-4" /> Enregistrer</>}
             </button>
           </div>
        </form>
      </div>
    </div>
  );
};
