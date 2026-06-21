import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Convocation, Student } from '../types';
import { PlusCircle, Trash2, Printer, Search, X, Save, Edit3, ChevronRight } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
}

export const ConvocationManager: React.FC<Props> = ({ students, activeYear }) => {
  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeConvocation, setActiveConvocation] = useState<Convocation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Convocation>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'convocations'), where('schoolYear', '==', activeYear));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Convocation[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Convocation);
      });
      data.sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
      setConvocations(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeYear]);

  const handleCreateNew = () => {
    setActiveConvocation(null);
    setFormData({
      competitionName: '',
      departureDate: new Date().toISOString().slice(0,16),
      returnDate: new Date().toISOString().slice(0,16),
      guides: '',
      needSnack: 'NON',
      needPicnic: 'NON',
      schoolYear: activeYear
    });
    setSelectedStudentIds(new Set());
    setIsEditing(true);
  };

  const handleEdit = (conv: Convocation) => {
    setActiveConvocation(conv);
    setFormData(conv);
    setSelectedStudentIds(new Set(conv.studentIds || []));
    setIsEditing(true);
  };

  const handleView = (conv: Convocation) => {
    setActiveConvocation(conv);
    setIsEditing(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Supprimer cette convocation ?")) {
      await deleteDoc(doc(db, 'convocations', id));
      if (activeConvocation?.id === id) {
        setActiveConvocation(null);
        setIsEditing(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        studentIds: Array.from(selectedStudentIds),
        schoolYear: activeYear
      };

      if (activeConvocation) {
        await updateDoc(doc(db, 'convocations', activeConvocation.id), dataToSave);
      } else {
        await addDoc(collection(db, 'convocations'), dataToSave);
      }
      setIsEditing(false);
      setActiveConvocation(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  const handlePrint = (conv: Convocation) => {
    const convStudents = students.filter(s => conv.studentIds?.includes(s.id));
    // Sort students
    convStudents.sort((a,b) => (a.lastName || '').localeCompare(b.lastName || ''));

    const printWindow = window.open('', '', 'height=800,width=1000');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Convocation - ${conv.competitionName}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #1e293b; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #slate-900; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { margin: 0 0 10px 0; font-size: 24px; color: #0f172a; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px;}
          .meta-item strong { display: block; font-size: 12px; color: #64748b; text-transform: uppercase; }
          .meta-item span { font-size: 16px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px;}
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 12px; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style></head><body>
        <div class="header">
          <h1>AS Rosa Parks - Convocation Sportive</h1>
          <p style="margin:0; font-weight: bold; color: #475569; font-size: 18px;">${conv.competitionName}</p>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Départ</strong><span>${new Date(conv.departureDate).toLocaleString('fr-FR', {dateStyle:'full', timeStyle:'short'})}</span></div>
          <div class="meta-item"><strong>Retour</strong><span>${new Date(conv.returnDate).toLocaleString('fr-FR', {dateStyle:'full', timeStyle:'short'})}</span></div>
          <div class="meta-item"><strong>Accompagnateurs</strong><span>${conv.guides || 'Aucun'}</span></div>
          <div class="meta-item">
             <strong>À prévoir</strong>
             <span style="font-size: 14px; font-weight: normal;">
               ${conv.needSnack === 'OUI' ? 'Goûter : OUI<br>' : ''}
               ${conv.needPicnic === 'OUI' ? 'Pique-nique : OUI' : ''}
             </span>
          </div>
        </div>
        
        <h3 style="margin-bottom: 10px;">Liste des ${convStudents.length} élèves convoqués</h3>
        <table>
          <thead>
            <tr>
              <th>Nom / Prénom</th>
              <th>Classe</th>
              <th>Taille Maillot</th>
              <th>Savoir Nager</th>
              <th>Autorisations.</th>
              <th>Droit Image</th>
              <th>Sign. Parents</th>
            </tr>
          </thead>
          <tbody>
            ${convStudents.map(s => `
              <tr>
                <td style="font-weight: bold;">${s.lastName} ${s.firstName}</td>
                <td>${s.classGroup}</td>
                <td style="text-align: center;">${s.size || '-'}</td>
                <td style="text-align: center;">${s.swimmingCertificate === 'OUI' ? '✓' : '✗'}</td>
                <td style="text-align: center;">${s.parentalAuth === 'OUI' ? '✓' : '✗'}</td>
                <td style="text-align: center;">${s.imageRights === 'OUI' ? '✓' : '✗'}</td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #64748b;">
           Généré le ${new Date().toLocaleDateString('fr-FR')} - AS Rosa Parks
        </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (s.lastName || '').toLowerCase().includes(searchLower) ||
           (s.firstName || '').toLowerCase().includes(searchLower) ||
           (s.classGroup || '').toLowerCase().includes(searchLower);
  });

  return (
    <div className="flex gap-6 min-h-[600px] h-full">
      {/* Left sidebar: List of convocations */}
      <div className="w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-900">Convocations</h2>
          <button 
            onClick={handleCreateNew}
            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            title="Nouvelle"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
           {loading ? (
             <div className="text-center py-10 text-slate-400">Chargement...</div>
           ) : convocations.length === 0 ? (
             <div className="text-center py-10 text-slate-400 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl">Aucune convocation</div>
           ) : (
             convocations.map(conv => (
               <div 
                 key={conv.id} 
                 onClick={() => handleView(conv)}
                 className={`p-4 rounded-xl border transition-all cursor-pointer ${activeConvocation?.id === conv.id && !isEditing ? 'border-slate-400 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
               >
                 <h3 className="font-bold text-slate-900 truncate mb-1">{conv.competitionName || 'Sans titre'}</h3>
                 <p className="text-xs text-slate-500 flex justify-between items-center">
                   <span>{new Date(conv.departureDate).toLocaleDateString('fr-FR')}</span>
                   <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-medium">{(conv.studentIds || []).length} élèves</span>
                 </p>
                 <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); handlePrint(conv); }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Imprimer">
                      <Printer className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(conv); }} className="text-slate-400 hover:text-slate-900 transition-colors" title="Modifier">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => handleDelete(conv.id, e)} className="text-slate-400 hover:text-rose-600 transition-colors" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

      {/* Right Content: Editor or Viewer */}
      <div className="w-2/3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
         {!isEditing && !activeConvocation && (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <span className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-300" />
              </span>
              <p className="font-medium">Sélectionnez une convocation pour voir les détails</p>
           </div>
         )}

         {/* Viewer */}
         {!isEditing && activeConvocation && (
           <div className="flex-1 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-end bg-slate-50">
                 <div>
                   <h2 className="text-2xl font-bold text-slate-900 mb-2">{activeConvocation.competitionName}</h2>
                   <div className="text-sm font-medium text-slate-500 space-y-1">
                     <p>Départ : {new Date(activeConvocation.departureDate).toLocaleString('fr-FR')}</p>
                     <p>Retour : {new Date(activeConvocation.returnDate).toLocaleString('fr-FR')}</p>
                   </div>
                 </div>
                 <div className="flex gap-3">
                   <button onClick={() => handleEdit(activeConvocation)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"><Edit3 className="w-4 h-4" /> Modifier</button>
                   <button onClick={() => handlePrint(activeConvocation)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"><Printer className="w-4 h-4" /> Imprimer</button>
                 </div>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                 <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Détails Logistiques</h3>
                 <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Accompagnateurs</span>
                      <p className="font-bold text-slate-900 mt-1">{activeConvocation.guides || 'Aucun'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Goûter</span>
                      <p className="font-bold text-slate-900 mt-1">{activeConvocation.needSnack}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-xs font-semibold text-slate-500 uppercase">Pique-Nique</span>
                      <p className="font-bold text-slate-900 mt-1">{activeConvocation.needPicnic}</p>
                    </div>
                 </div>

                 <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex justify-between">
                   <span>Élèves Convoqués ({(activeConvocation.studentIds || []).length})</span>
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {students.filter(s => activeConvocation.studentIds?.includes(s.id)).map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{s.lastName} {s.firstName}</p>
                          <p className="text-xs text-slate-500">Classe {s.classGroup}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded">Taile: {s.size || '-'}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
         )}

         {/* Editor Form */}
         {isEditing && (
           <form onSubmit={handleSave} className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600"><Edit3 className="w-4 h-4"/></span>
                  {activeConvocation ? 'Modifier la Convocation' : 'Nouvelle Convocation'}
                </h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setIsEditing(false); setActiveConvocation(null); }} className="px-4 py-2 hover:bg-slate-200 font-medium rounded-xl transition-colors">Annuler</button>
                  <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"><Save className="w-4 h-4" /> Enregistrer</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la compétition</label>
                  <input type="text" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" value={formData.competitionName || ''} onChange={e => setFormData({...formData, competitionName: e.target.value})} placeholder="ex: Championnat Académique Futsal" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Date et Heure de départ</label>
                    <input type="datetime-local" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" value={formData.departureDate || ''} onChange={e => setFormData({...formData, departureDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Date et Heure de retour</label>
                    <input type="datetime-local" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" value={formData.returnDate || ''} onChange={e => setFormData({...formData, returnDate: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6">
                  <div className="col-span-3 lg:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Accompagnateurs</label>
                    <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" value={formData.guides || ''} onChange={e => setFormData({...formData, guides: e.target.value})} placeholder="ex: M. Dupont" />
                  </div>
                  <div className="col-span-3 lg:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Besoin d'un Goûter ?</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" value={formData.needSnack || 'NON'} onChange={e => setFormData({...formData, needSnack: e.target.value})}>
                      <option value="OUI">OUI</option>
                      <option value="NON">NON</option>
                    </select>
                  </div>
                  <div className="col-span-3 lg:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Besoin d'un Pique-nique ?</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white" value={formData.needPicnic || 'NON'} onChange={e => setFormData({...formData, needPicnic: e.target.value})}>
                      <option value="OUI">OUI</option>
                      <option value="NON">NON</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="block text-sm font-semibold text-slate-700">Sélection des Élèves ({selectedStudentIds.size} convoqués)</h3>
                     <div className="relative w-64">
                       <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                       <input 
                         type="text" 
                         placeholder="Rechercher..." 
                         value={searchTerm} 
                         onChange={e => setSearchTerm(e.target.value)} 
                         className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                       />
                     </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm h-[300px] flex flex-col">
                     <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex text-xs font-bold text-slate-500 uppercase tracking-wider">
                       <div className="w-10"></div>
                       <div className="flex-1">Élève</div>
                       <div className="w-24">Classe</div>
                       <div className="w-24 text-center">Taille</div>
                     </div>
                     <div className="overflow-y-auto flex-1 p-2 space-y-1">
                        {filteredStudents.map(s => {
                          const isSelected = selectedStudentIds.has(s.id);
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => toggleStudent(s.id)}
                              className={`flex items-center px-2 py-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent border-b-slate-100'}`}
                            >
                              <div className="w-8 flex justify-center">
                                <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 border-slate-300 rounded text-slate-900 focus:ring-slate-900" />
                              </div>
                              <div className="flex-1 font-medium text-slate-900 text-sm">{s.lastName} {s.firstName}</div>
                              <div className="w-24 text-sm text-slate-500">{s.classGroup}</div>
                              <div className="w-24 text-center text-xs font-semibold">
                                 {s.size ? <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{s.size}</span> : '-'}
                              </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
                </div>

              </div>
           </form>
         )}
      </div>
    </div>
  );
};
