import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { updateStudent, deleteStudent } from '../lib/db';
import { X, ChevronRight, Loader2, Trash2, SkipForward } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onComplete: () => void;
}

export const YearRolloverWizard: React.FC<Props> = ({ isOpen, onClose, students, onComplete }) => {
  const [step, setStep] = useState<'year' | 'profiles'>('year');
  const [targetYear, setTargetYear] = useState('');
  const [classMappings, setClassMappings] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);

  const uniqueClasses = Array.from(new Set(students.map(s => s.classGroup).filter(Boolean)));

  useEffect(() => {
    if (isOpen && students.length > 0) {
      const year = students[0].schoolYear;
      let nextYearStr = '2026-2027';
      if (year) {
        const parts = year.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[0]))) {
          nextYearStr = `${Number(parts[0]) + 1}-${Number(parts[1]) + 1}`;
        }
      }
      setTargetYear(nextYearStr);
      setClassMappings({});
      setStep('year');
      setCurrentIndex(0);
    }
  }, [isOpen, students]);

  useEffect(() => {
    if (step === 'profiles' && students[currentIndex]) {
      const student = students[currentIndex];
      setFormData({
        ...student,
        schoolYear: targetYear,
        classGroup: classMappings[student.classGroup] || student.classGroup || '',
        paid: 'NON',
        amount: '',
        paymentMethod: ''
      });
    }
  }, [step, currentIndex, students, targetYear, classMappings]);

  if (!isOpen || students.length === 0) return null;

  const handleNextProfile = async () => {
    setIsSaving(true);
    try {
      await updateStudent(students[currentIndex].id, formData);
      advance();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (confirm("Supprimer cet élève définitivement ?")) {
      setIsSaving(true);
      try {
        await deleteStudent(students[currentIndex].id);
        advance();
      } catch (e) {
        console.error(e);
      }
      setIsSaving(false);
    }
  };

  const advance = () => {
    if (currentIndex < students.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col my-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        {step === 'year' && (
          <div className="p-6 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Changer d'année scolaire</h2>
            <p className="text-sm text-slate-500 mb-6 font-medium">Configurez la nouvelle année pour {students.length} élève(s) sélectionné(s).</p>
            
            <div className="mb-6 bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nouvelle année scolaire</label>
              <input 
                type="text" 
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                value={targetYear}
                onChange={e => setTargetYear(e.target.value)}
                autoFocus
              />
            </div>

            {uniqueClasses.length > 0 && (
               <div className="mb-8">
                 <h3 className="block text-sm font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2">Affectation des classes</h3>
                 <p className="text-xs text-slate-500 mb-4">Saisissez la nouvelle classe pour chaque groupe d'élèves. Cette valeur sera pré-remplie lors de la révision des profils.</p>
                 <div className="space-y-3">
                   {uniqueClasses.map((cls) => (
                      <div key={cls} className="flex items-center gap-3">
                        <div className="w-1/2 flex items-center justify-between bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                          <span className="text-sm font-semibold text-slate-700 truncate">{cls}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                           type="text"
                           placeholder="Nouvelle classe"
                           value={classMappings[cls] || ''}
                           onChange={e => setClassMappings({...classMappings, [cls as string]: e.target.value.toUpperCase()})}
                           className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 text-sm font-medium uppercase"
                        />
                      </div>
                   ))}
                 </div>
               </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep('profiles')}
                className="px-6 py-2.5 text-white bg-slate-900 hover:bg-slate-800 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 'profiles' && students[currentIndex] && (
          <div className="flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 shrink-0">
               <div className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-wider">
                 Élève {currentIndex + 1} sur {students.length}
               </div>
               <h2 className="text-xl font-bold text-slate-900 truncate">
                 {students[currentIndex].firstName} {students[currentIndex].lastName}
               </h2>
               <p className="text-slate-500 text-sm mt-1">Mise à jour du profil vers l'année {targetYear}</p>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
               <div className="grid grid-cols-2 gap-5">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Nom</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900" value={formData.lastName || ''} onChange={e => setFormData({...formData, lastName: e.target.value.toUpperCase()})} />
                 </div>
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Prénom</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900" value={formData.firstName || ''} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-5">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Né(e) le</label>
                   <input type="text" placeholder="JJ/MM/AAAA" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900" value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                 </div>
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Classe</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 font-medium" value={formData.classGroup || ''} onChange={e => setFormData({...formData, classGroup: e.target.value.toUpperCase()})} />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                 <div className="col-span-2 sm:col-span-1">
                   <label className="block font-semibold text-slate-700 mb-1.5">N° Licence UNSS</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 font-mono" value={formData.licenseNumber || ''} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
                 </div>
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Payé</label>
                   <select className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white" value={formData.paid || 'NON'} onChange={e => setFormData({...formData, paid: e.target.value})}>
                     <option value="OUI">OUI</option>
                     <option value="NON">NON</option>
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-5">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Montant</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="ex: 30€" />
                 </div>
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Moyen de paiement</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white" value={formData.paymentMethod || ''} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} placeholder="ex: Espèces, Chèque..." />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">T-shirt fourni</label>
                   <select className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white" value={formData.tshirt || 'NON'} onChange={e => setFormData({...formData, tshirt: e.target.value})}>
                     <option value="OUI">OUI</option>
                     <option value="NON">NON</option>
                   </select>
                 </div>
                 <div>
                   <label className="block font-semibold text-slate-700 mb-1.5">Taille T-shirt</label>
                   <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white" value={formData.size || ''} onChange={e => setFormData({...formData, size: e.target.value.toUpperCase()})} placeholder="ex: M, L..." />
                 </div>
               </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-b-2xl">
              <button 
                onClick={handleDelete}
                disabled={isSaving}
                className="text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition-colors flex items-center gap-2 font-medium"
                title="Supprimer définitivement"
              >
                <Trash2 className="w-5 h-5" />
                <span className="hidden sm:inline">Supprimer</span>
              </button>

              <div className="flex gap-2.5">
                <button
                  onClick={advance}
                  disabled={isSaving}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" /> 
                  <span className="hidden sm:inline">Passer</span>
                </button>
                <button
                  onClick={handleNextProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (currentIndex < students.length - 1 ? 'Enregistrer & Suivant' : 'Terminer')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
