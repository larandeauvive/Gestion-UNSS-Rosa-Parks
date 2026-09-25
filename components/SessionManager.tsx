import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Session } from '../types';
import { PlusCircle, Calendar, Trash2, CheckCircle2, Circle, Users, Save, Link2, Edit2, ShieldCheck, AlertCircle } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  getSessionsList, saveSessionApi, deleteSessionApi, 
  getTeachersList, saveConvocationApi, deleteTeamFromSession, 
  enrollTeamInSession 
} from '../lib/db';

interface SessionManagerProps {
  students: Student[];
  activeYear: string;
}

export function SessionManager({ students, activeYear }: SessionManagerProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSession = sessions.find(s => s.id === activeSessionId);

  const [searchTerm, setSearchTerm] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [formData, setFormData] = useState<Partial<Session>>({
    date: new Date().toISOString().split('T')[0],
    time: '13:30',
    requireLicense: false,
    teacherIds: []
  });

  const newSession = formData;
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const fetchSessionManagerData = useCallback(async () => {
    try {
      const [tList, sList] = await Promise.all([
        getTeachersList(),
        getSessionsList(activeYear)
      ]);
      setTeachers(tList);
      sList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(sList);
    } catch (err) {
      console.warn("Erreur chargement séances:", err);
    }
  }, [activeYear]);

  useEffect(() => {
    fetchSessionManagerData();
  }, [fetchSessionManagerData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return;
    try {
      if (formData.id) {
        // Mode modification
        await saveSessionApi({
          ...formData,
          schoolYear: activeYear,
          requireLicense: !!formData.requireLicense,
          requireParentalAuth: !!formData.requireParentalAuth,
          requireSwimmingCertificate: !!formData.requireSwimmingCertificate,
          isTeamRegistration: !!formData.isTeamRegistration,
          teamSize: formData.isTeamRegistration ? (Number(formData.teamSize) || 4) : undefined
        });
        setIsCreating(false);
        await fetchSessionManagerData();
        return;
      }

      let firstDocId: string | null = null;
      const count = isRecurring ? Math.max(1, recurrenceCount) : 1;
      
      for (let i = 0; i < count; i++) {
        let dateStr = formData.date;
        if (i > 0) {
          const parts = (formData.date || '').split('-');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            d.setDate(d.getDate() + (i * 7));
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateStr = `${y}-${m}-${day}`;
          }
        }
        
        const created = await saveSessionApi({
          ...formData,
          date: dateStr,
          schoolYear: activeYear,
          enrolledStudentIds: [],
          presentStudentIds: [],
          requireLicense: !!formData.requireLicense,
          requireParentalAuth: !!formData.requireParentalAuth,
          requireSwimmingCertificate: !!formData.requireSwimmingCertificate,
          isTeamRegistration: !!formData.isTeamRegistration,
          teamSize: formData.isTeamRegistration ? (Number(formData.teamSize) || 4) : undefined,
          teams: []
        });

        if (i === 0 && created?.id) firstDocId = created.id;
      }
      
      if (firstDocId) setActiveSessionId(firstDocId);
      setIsCreating(false);
      await fetchSessionManagerData();
    } catch (error: any) {
      console.error('Erreur enregistrement séance:', error);
      alert("Erreur lors de l'enregistrement de la séance : " + (error?.message || 'Erreur inattendue'));
    }
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteSessionApi(sessionToDelete);
      if (activeSessionId === sessionToDelete) setActiveSessionId(null);
      await fetchSessionManagerData();
    } catch (err) {
      console.error(err);
    }
    setSessionToDelete(null);
  };

  const toggleEnrollment = async (studentId: string) => {
    if (!activeSession) return;
    const enrolled = new Set<string>(activeSession.enrolledStudentIds || []);
    if (enrolled.has(studentId)) {
      enrolled.delete(studentId);
    } else {
      enrolled.add(studentId);
    }
    
    // Also remove from present if un-enrolled
    const present = new Set<string>(activeSession.presentStudentIds || []);
    if (!enrolled.has(studentId) && present.has(studentId)) {
      present.delete(studentId);
    }

    try {
      const newEnrolledIds = Array.from(enrolled);
      await saveSessionApi({
        id: activeSession.id,
        enrolledStudentIds: newEnrolledIds,
        presentStudentIds: Array.from(present)
      });
      
      if (activeSession.convocationId) {
         await saveConvocationApi({
           id: activeSession.convocationId,
           studentIds: newEnrolledIds
         });
      }
      await fetchSessionManagerData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAttendance = async (studentId: string) => {
    if (!activeSession) return;
    const present = new Set<string>(activeSession.presentStudentIds || []);
    if (present.has(studentId)) {
      present.delete(studentId);
    } else {
      present.add(studentId);
    }
    try {
      await saveSessionApi({
        id: activeSession.id,
        presentStudentIds: Array.from(present)
      });
      await fetchSessionManagerData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (student.lastName || '').toLowerCase().includes(searchLower) ||
                            (student.firstName || '').toLowerCase().includes(searchLower) ||
                            (student.classGroup || '').toLowerCase().includes(searchLower);
                            
      if (!matchesSearch) return false;
      
      const audience = formData.targetAudience || 'all';
      if (audience === 'students' && student.isAdult) return false;
      if (audience === 'adults' && !student.isAdult) return false;
      
      return true;
    });
  }, [students, searchTerm, formData.targetAudience]);

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
                      {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} • {s.time}{s.endTime ? ` - ${s.endTime}` : ''}
                    </div>
                    {s.teacherIds && s.teacherIds.length > 0 && (
                      <div className="text-xs text-indigo-600 font-medium mt-1">
                        Resp: {s.teacherIds.map(tid => teachers.find(t => t.id === tid)?.name).filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-medium bg-white px-2 py-1 rounded-md border border-slate-200 text-slate-600">
                      {(s.presentStudentIds || []).length} / {(s.enrolledStudentIds || []).length}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSessionToDelete(s.id); }} 
                      className="text-slate-400 hover:text-red-600 transition-colors" 
                      title="Supprimer la séance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          <form onSubmit={handleCreate} className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  {formData.id ? <Edit2 className="w-5 h-5 text-indigo-600" /> : <PlusCircle className="w-5 h-5 text-indigo-600" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {formData.id ? 'Modifier la séance' : 'Créer une nouvelle séance'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {formData.id ? 'Mise à jour des paramètres et options' : `Ajout d'un créneau dans l'année active (${activeYear})`}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCreating(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Fermer"
              >
                ✕
              </button>
            </div>
            
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Heure de RDV</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.meetingTime || ''}
                    onChange={e => setFormData({...formData, meetingTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Lieu de RDV</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.meetingLocation || ''}
                    onChange={e => setFormData({...formData, meetingLocation: e.target.value})}
                    placeholder="Ex: Gymnase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Passage au self</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.cafeteriaTime || ''}
                    onChange={e => setFormData({...formData, cafeteriaTime: e.target.value})}
                    title="Heure de passage au self (optionnelle)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Heure de retour</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.returnTime || ''}
                    onChange={e => setFormData({...formData, returnTime: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date de la séance</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.date || ''}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Début (Séance)</label>
                  <input 
                    type="time" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.time || ''}
                    onChange={e => setFormData({...formData, time: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fin (Séance)</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.endTime || ''}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Lieu de la séance</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.location || ''}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  placeholder="Ex: Stade municipal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Informations supplémentaires</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: N'oubliez pas les gourdes..."
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre maximum de participants (optionnel)</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.maxParticipants || ''}
                  onChange={e => setFormData({...formData, maxParticipants: e.target.value ? parseInt(e.target.value) : undefined})}
                  placeholder="Laisser vide pour illimité"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Public Cible</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.targetAudience || 'all'}
                  onChange={e => setFormData({...formData, targetAudience: e.target.value as any})}
                >
                  <option value="all">Tous (Élèves et Adultes)</option>
                  <option value="students">Élèves uniquement</option>
                  <option value="adults">Adultes/Encadrants uniquement</option>
                </select>
              </div>

              {teachers.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Enseignants Responsables</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {teachers.map(t => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer p-2 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                        <input 
                          type="checkbox" 
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                          checked={(formData.teacherIds || []).includes(t.id)}
                          onChange={e => {
                            const current = new Set(formData.teacherIds || []);
                            if (e.target.checked) current.add(t.id);
                            else current.delete(t.id);
                            setFormData({...formData, teacherIds: Array.from(current)});
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700">{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ouverture des inscriptions (optionnel)</label>
                  <input 
                    type="datetime-local" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.registrationOpenDate || ''}
                    onChange={e => setFormData({...formData, registrationOpenDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fermeture des inscriptions (optionnel)</label>
                  <input 
                    type="datetime-local" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.registrationCloseDate || ''}
                    onChange={e => setFormData({...formData, registrationCloseDate: e.target.value})}
                  />
                </div>
              </div>

              {/* Éléments nécessaires pour s'inscrire */}
              <div className="bg-slate-50/90 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Éléments nécessaires pour pouvoir s'inscrire
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">Contrôle à l'inscription</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${formData.requireLicense ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
                      checked={formData.requireLicense || false}
                      onChange={e => setFormData({...formData, requireLicense: e.target.checked})}
                    />
                    <div>
                      <span className="text-xs font-bold block">Numéro de licence</span>
                      <span className="text-[10px] text-slate-500 leading-tight block">Licence AS obligatoire</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${formData.requireParentalAuth ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
                      checked={formData.requireParentalAuth || false}
                      onChange={e => setFormData({...formData, requireParentalAuth: e.target.checked})}
                    />
                    <div>
                      <span className="text-xs font-bold block">Autorisation parentale</span>
                      <span className="text-[10px] text-slate-500 leading-tight block">AP validée exigée</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${formData.requireSwimmingCertificate ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                    <input 
                      type="checkbox" 
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 mt-0.5"
                      checked={formData.requireSwimmingCertificate || false}
                      onChange={e => setFormData({...formData, requireSwimmingCertificate: e.target.checked})}
                    />
                    <div>
                      <span className="text-xs font-bold block">Savoir nager</span>
                      <span className="text-[10px] text-slate-500 leading-tight block">Attestation requise</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <input 
                    type="checkbox" 
                    className="rounded text-amber-600 focus:ring-amber-500 w-5 h-5"
                    checked={formData.needSnack || false}
                    onChange={e => setFormData({...formData, needSnack: e.target.checked})}
                  />
                  <span className="text-sm font-semibold text-amber-800">Prévoir un goûter</span>
                </label>

                {/* Option Inscription en Équipe */}
                <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded text-purple-600 focus:ring-purple-500 w-5 h-5"
                      checked={formData.isTeamRegistration || false}
                      onChange={e => setFormData({
                        ...formData, 
                        isTeamRegistration: e.target.checked,
                        teamSize: e.target.checked ? (formData.teamSize || 4) : undefined
                      })}
                    />
                    <span className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-700" />
                      Inscription en équipe (Tournoi / Raid / Relais...)
                    </span>
                  </label>

                  {formData.isTeamRegistration && (
                    <div className="pl-7 pt-1 space-y-1.5 border-t border-purple-200/60 mt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-purple-900 whitespace-nowrap">
                          Nombre d'élèves requis par équipe :
                        </label>
                        <input 
                          type="number"
                          min="2"
                          max="20"
                          required={formData.isTeamRegistration}
                          className="w-20 px-2.5 py-1 text-xs font-bold text-purple-900 bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={formData.teamSize || 4}
                          onChange={e => setFormData({...formData, teamSize: parseInt(e.target.value) || 2})}
                        />
                      </div>
                      <p className="text-xs text-purple-700 leading-tight">
                        L'inscription de l'équipe ne pourra être validée que lorsque celle-ci comptera exactement <strong>{formData.teamSize || 4} élèves</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {!formData.id && (
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
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)} 
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="submit" 
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" /> {formData.id ? 'Enregistrer les modifications' : 'Enregistrer la séance'}
              </button>
            </div>
          </form>
        ) : activeSession ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold text-slate-900">{activeSession.name}</h2>
                  {activeSession.isTeamRegistration && (
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full border border-purple-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-700" />
                      Équipe ({activeSession.teamSize || 4} élèves / équipe)
                    </span>
                  )}
                  {activeSession.requireLicense && (
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-200">🪪 Licence requise</span>
                  )}
                  {activeSession.requireParentalAuth && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-200">📄 AP requise</span>
                  )}
                  {activeSession.requireSwimmingCertificate && (
                    <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-2 py-0.5 rounded-full border border-cyan-200">🏊 Savoir nager requis</span>
                  )}
                  {activeSession.needSnack && (
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-full border border-amber-200">Goûter à prévoir</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-slate-600 font-medium text-sm">
                    📅 {new Date(activeSession.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • 
                    🕒 {activeSession.time} {activeSession.endTime ? `- ${activeSession.endTime}` : ''}
                  </p>
                  {activeSession.location && (
                    <p className="text-slate-600 font-medium text-sm">📍 {activeSession.location}</p>
                  )}
                  {activeSession.description && (
                    <p className="text-slate-500 text-sm mt-1 bg-white p-2 rounded border border-slate-200 inline-block">
                      {activeSession.description}
                    </p>
                  )}
                </div>
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
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    setFormData({ ...activeSession });
                    setIsRecurring(false);
                    setIsCreating(true);
                  }}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                  title="Modifier les paramètres de la séance"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setSessionToDelete(activeSession.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Supprimer la séance"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
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

              {/* Section Équipes si la séance est en mode équipe */}
              {activeSession.isTeamRegistration && (
                <div className="mb-6 bg-purple-50/50 p-4 rounded-xl border border-purple-100 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      Équipes inscrites ({activeSession.teams?.length || 0})
                    </h3>
                    <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                      Règle : {activeSession.teamSize || 4} élèves par équipe
                    </span>
                  </div>

                  {(!activeSession.teams || activeSession.teams.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-1">
                      Aucune équipe n'est encore constituée pour cette séance.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeSession.teams.map((team, idx) => (
                        <div key={team.id} className="bg-white p-3 rounded-lg border border-purple-200/80 shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-black">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{team.name}</span>
                              </span>
                              <button
                                onClick={async () => {
                                  if (confirm(`Supprimer l'équipe "${team.name}" ?`)) {
                                    await deleteTeamFromSession(activeSession.id, team.id);
                                    await fetchSessionManagerData();
                                  }
                                }}
                                className="text-slate-400 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                title="Supprimer cette équipe"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              {team.studentIds.map(sid => {
                                const st = students.find(s => s.id === sid);
                                return (
                                  <div key={sid} className="text-[11px] text-slate-700 flex items-center justify-between bg-slate-50 px-2 py-0.5 rounded">
                                    <span className="truncate">{st ? `${st.lastName} ${st.firstName}` : sid}</span>
                                    {st?.classGroup && <span className="text-[9px] text-slate-400 font-bold ml-1">{st.classGroup}</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                            <span>{team.studentIds.length} / {activeSession.teamSize || 4} membres</span>
                            <span className="text-emerald-600 font-semibold">Équipe complète ✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                              <div className="font-semibold text-slate-800 flex items-center gap-1 flex-wrap">
                                {String(s.parentalAuth).toUpperCase() !== 'OUI' && <span title="Autorisation parentale manquante" className="text-sm text-rose-500 leading-none">AP🚫</span>}
                                {String(s.swimmingCertificate).toUpperCase() !== 'OUI' && <span title="Savoir nager non validé" className="text-sm">🏊‍♂️🚫</span>}
                                {String(s.imageRights).toUpperCase() !== 'OUI' && <span title="Droit à l'image non validé" className="text-sm">📷🚫</span>}
                                {String(s.paid).toUpperCase() !== 'OUI' && <span title="Paiement manquant" className="text-sm text-rose-500 font-bold leading-none">€🚫</span>}
                                <span>{s.lastName} {s.firstName}</span>
                              </div>
                              <span className="text-xs text-slate-500">{s.classGroup}</span>
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
                            <div className="font-medium text-slate-700 flex items-center gap-1 flex-wrap">
                                {String(s.parentalAuth).toUpperCase() !== 'OUI' && <span title="Autorisation parentale manquante" className="text-sm text-rose-500 leading-none">AP🚫</span>}
                                {String(s.swimmingCertificate).toUpperCase() !== 'OUI' && <span title="Savoir nager non validé" className="text-sm">🏊‍♂️🚫</span>}
                                {String(s.imageRights).toUpperCase() !== 'OUI' && <span title="Droit à l'image non validé" className="text-sm">📷🚫</span>}
                                {String(s.paid).toUpperCase() !== 'OUI' && <span title="Paiement manquant" className="text-sm text-rose-500 font-bold leading-none">€🚫</span>}
                                <span>{s.lastName} {s.firstName}</span>
                            </div>
                            <span className="text-xs text-slate-400">{s.classGroup}</span>
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

      <ConfirmDialog 
        isOpen={!!sessionToDelete}
        title="Supprimer la séance"
        message="Êtes-vous sûr de vouloir supprimer cette séance ? Cette action est irréversible et supprimera également les données de pointage associées."
        onConfirm={confirmDelete}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}
