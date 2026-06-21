import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { X, ChevronRight, Loader2, Play } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onComplete: () => void;
}

export const YearRolloverWizard: React.FC<Props> = ({ isOpen, onClose, students, onComplete }) => {
  const [targetYear, setTargetYear] = useState('');
  const [classMappings, setClassMappings] = useState<Record<string, string>>({});
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
    }
  }, [isOpen, students]);

  if (!isOpen || students.length === 0) return null;

  const handleApply = async () => {
    setIsSaving(true);
    try {
      let batch = writeBatch(db);
      let count = 0;
      
      for (const student of students) {
        const docRef = doc(db, "students", student.id);
        
        batch.update(docRef, {
          schoolYear: targetYear,
          classGroup: classMappings[student.classGroup] || student.classGroup || '',
          licenseNumber: '',
          paid: 'NON',
          amount: '',
          paymentMethod: '',
          checkNumber: '',
          tshirt: 'NON',
          size: '',
          swimmingCertificate: 'NON',
          parentalAuth: 'NON',
          imageRights: 'NON'
        });
        
        count++;
        
        if (count % 499 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }
      
      if (count % 499 !== 0) {
        await batch.commit();
      }
      
      onComplete();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour");
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col my-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 animate-in fade-in zoom-in-95 max-h-[80vh] overflow-y-auto">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Transition classe supérieure</h2>
          <p className="text-sm text-slate-500 mb-6 font-medium">L'année, la classe seront modifiées, et les informations UNSS (licence, paiement, t-shirt) seront réinitialisées pour les {students.length} élève(s) sélectionné(s).</p>
          
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
                <h3 className="block text-sm font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-2">Classes de destination</h3>
                <p className="text-xs text-slate-500 mb-4">Saisissez la nouvelle classe pour chaque groupe d'élèves.</p>
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
              onClick={handleApply}
              disabled={isSaving}
              className="px-6 py-2.5 text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl font-medium transition-all shadow-sm flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Appliquer la transition
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
