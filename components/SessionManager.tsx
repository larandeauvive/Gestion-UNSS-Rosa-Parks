import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, Session } from '../types';
import { PlusCircle, Calendar, Trash2, CheckCircle2, Circle, Users, Save, Link2 } from 'lucide-react';

interface SessionManagerProps {
  students: Student[];
  activeYear: string;
}

export function SessionManager({ students, activeYear }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [formData, setFormData] = useState<Partial<Session>>({
    name: 'Entraînement',
    date: new Date().toISOString().slice(0, 10),
    time: '13:30',
    requireLicense: false,
    enrolledStudentIds: [],
    presentStudentIds: []
  });

  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('schoolYear', '==', activeYear));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Session[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Session);
      });
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(data);
      if (!activeSessionId && data.length > 0) {
        setActiveSessionId(data[0].id);
      }
    });
    return () => unsubscribe();
  }, [activeYear]);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return;
    try {
      let firstDocId = null;
      const count = isRecurring ? Math.max(1, recurrenceCount) : 1;
      
      for (let i = 0; i < count; i++) {
        const d = new Date(formData.date);
        d.setDate(d.getDate() + (i * 7));
        const dateStr = d.toISOString().slice(0, 10);
        
        const docRef = await addDoc(collection(db, 'sessions'), {
          ...formData,
          date: dateStr,
          schoolYear: activeYear
        });
        if (i === 0) firstDocId = docRef.id;
      }
      
      if (firstDocId) setActiveSessionId(firstDocId);
      setIsCreating(false);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création de la séance.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette séance ?")) {
      try {
        await deleteDoc(doc(db, 'sessions', id));
        if (activeSessionId === id) setActiveSessionId(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleEnrollment = async (studentId: string) => {
    if (!activeSession) return;
    const enrolled = new Set(activeSession.enrolledStudentIds || []);
    if (enrolled.has(studentId)) {
      enrolled.delete(studentId);
    } else {
      enrolled.add(studentId);
    }
    
    // Also remove from present if un-enrolled
    const present = new Set(activeSession.presentStudentIds || []);
    if (!enrolled.has(studentId) && present.has(studentId)) {
      present.delete(studentId);
    }

    try {
      await updateDoc(doc(db, 'sessions', activeSession.id), {
        enrolledStudentIds: Array.from(enrolled),
        presentStudentIds: Array.from(present)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAttendance = async (studentId: string) => {
    if (!activeSession) return;
    const present = new Set(activeSession.presentStudentIds || []);
    if (present.has(studentId)) {
      present.delete(studentId);
    } else {
      present.add(studentId);
    }
    try {
      await updateDoc(doc(db, 'sessions', activeSession.id), {
        presentStudentIds: Array.from(present)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      return (student.lastName || '').toLowerCase().includes(searchLower) ||
             (student.firstName || '').toLowerCase().includes(searchLower) ||
             (student.classGroup || '').toLowerCase().includes(searchLower);
    });
  }, [students, searchTerm]);

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[600px] h-full">
      {/* Left Sidebar: Session List */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <button 
            onClick={() => {
              setFormData({
                name: 'Entraînement',
                date: new Date().toISOString().slice(0, 10),
                time: '13:30',
                requireLicense: false,
                enrolledStudentIds: [],
                presentStudentIds: []
              });
              setIsRecurring(false);
              setRecurrenceCount(4);
              setIsCreating(true);
            }}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2 px-4 rounded-lg font-semibold hover:bg-slate-800 transition"
          >
            <PlusCircle className="w-5 h-5" /> Nouvelle Séance
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Séances ({sessions.length})
            </h2>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => { setActiveSessionId(s.id); setIsCreating(false); }}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${activeSessionId === s.id && !isCreating ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className={`font-bold ${activeSessionId === s.id && !isCreating ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {s.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {s.time}
                    </div>
                  </div>
                  <div className="text-xs font-medium bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-600">
                    {(s.presentStudentIds || []).length} / {(s.enrolledStudentIds || []).length}
                  </div>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Aucune séance pour cette année.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {isCreating ? (
          <form onSubmit={handleCreate} className="p-6 max-w-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Créer une nouvelle séance</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la séance</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.name || ''}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Entraînement Futsal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.date || ''}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Horaire</label>
                  <input 
                    type="time" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.time || ''}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <input 
                    type="checkbox" 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                    checked={formData.requireLicense || false}
                    onChange={e => setFormData({...formData, requireLicense: e.target.checked})}
                  />
                  <span className="text-sm font-semibold text-slate-700">Obligation d'être à jour de sa licence</span>
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <input 
                    type="checkbox" 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-5 h-5"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                  />
                  <span className="text-sm font-semibold text-slate-700">Répéter cette séance (toutes les semaines)</span>
                </label>
                
                {isRecurring && (
                  <div className="mt-4 ml-2 pl-4 border-l-2 border-indigo-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre d'occurrences au total</label>
                    <input 
                      type="number" 
                      min="2"
                      max="40"
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={recurrenceCount}
                      onChange={e => setRecurrenceCount(parseInt(e.target.value) || 2)}
                    />
                    <p className="text-xs text-slate-500 mt-1">Ex: 4 pour créer la séance sur 4 semaines consécutives.</p>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                  <Save className="w-4 h-4" /> Enregistrer
                </button>
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          </form>
        ) : activeSession ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-slate-900">{activeSession.name}</h2>
                  {activeSession.requireLicense && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-200">Licence Obligatoire</span>
                  )}
                </div>
                <p className="text-slate-500 font-medium mt-1">
                  {new Date(activeSession.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {activeSession.time}
                </p>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}?enroll=${activeSession.id}`;
                    navigator.clipboard.writeText(url);
                    alert('Lien copié : ' + url);
                  }}
                  className="mt-3 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <Link2 className="w-4 h-4" /> Copier le lien d'inscription
                </button>
              </div>
              <button 
                onClick={() => handleDelete(activeSession.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Supprimer la séance"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
              <div className="flex gap-4 mb-4">
                <input 
                  type="text" 
                  placeholder="Rechercher un élève..." 
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                
                {/* List of enrolled students */}
                <div className="flex flex-col overflow-hidden border border-slate-200 rounded-xl">
                  <div className="bg-slate-100 p-3 border-b border-slate-200 font-semibold text-slate-700 flex justify-between">
                    <span>Pointage des présents</span>
                    <span className="bg-white px-2 py-0.5 rounded text-xs border border-slate-200">
                      {(activeSession.presentStudentIds || []).length} / {(activeSession.enrolledStudentIds || []).length} présents
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {filteredStudents.filter(s => (activeSession.enrolledStudentIds || []).includes(s.id)).map(s => {
                      const isPresent = (activeSession.presentStudentIds || []).includes(s.id);
                      return (
                        <div key={`enrolled_${s.id}`} className={`flex items-center justify-between p-2 rounded-lg border ${isPresent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'} hover:border-slate-300 transition-colors`}>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => toggleAttendance(s.id)}
                              className={`p-1 rounded-full transition-colors ${isPresent ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}
                            >
                              {isPresent ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </button>
                            <div>
                              <span className="font-semibold text-slate-800">{s.lastName} {s.firstName}</span>
                              <span className="ml-2 text-xs text-slate-500">{s.classGroup}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => toggleEnrollment(s.id)}
                            className="text-xs text-slate-400 hover:text-red-500 px-2 py-1"
                            title="Désinscrire"
                          >
                            Retirer
                          </button>
                        </div>
                      );
                    })}
                    {(activeSession.enrolledStudentIds || []).length === 0 && (
                      <p className="text-center text-slate-500 py-8 text-sm">Aucun élève inscrit pour cette séance. Sélectionnez-les dans la liste de droite.</p>
                    )}
                  </div>
                </div>

                {/* List of non-enrolled students (Database) */}
                <div className="flex flex-col overflow-hidden border border-slate-200 rounded-xl">
                  <div className="bg-slate-50 p-3 border-b border-slate-200 font-semibold text-slate-700">
                    Tous les élèves ({filteredStudents.length})
                  </div>
                  <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {filteredStudents.map(s => {
                      const isEnrolled = (activeSession.enrolledStudentIds || []).includes(s.id);
                      return (
                        <div key={`all_${s.id}`} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                          <div>
                            <span className="font-medium text-slate-700">{s.lastName} {s.firstName}</span>
                            <span className="ml-2 text-xs text-slate-400">{s.classGroup}</span>
                          </div>
                          <button 
                            onClick={() => toggleEnrollment(s.id)}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${isEnrolled ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {isEnrolled ? 'Inscrit' : 'Inscrire'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            <p>Sélectionnez ou créez une séance</p>
          </div>
        )}
      </div>
    </div>
  );
}
