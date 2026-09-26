import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PublicStudent, Session } from '../types';
import { 
  CheckCircle2, Search, AlertCircle, Users, 
  X, Trophy, Sparkles, Check, ArrowLeft,
  Calendar, Clock, MapPin, UserCheck, Loader2
} from 'lucide-react';
import { getSession, getPublicDirectory, enrollInSession, enrollTeamInSession, addStudent } from '../lib/db';

interface PublicEnrollmentProps {
  sessionId: string;
  onBack?: () => void;
}

export function PublicEnrollment({ sessionId, onBack }: PublicEnrollmentProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [lastEnrolledStudent, setLastEnrolledStudent] = useState<PublicStudent | null>(null);

  // Pour inscription en équipe
  const [teamName, setTeamName] = useState('');
  const [selectedTeamStudents, setSelectedTeamStudents] = useState<PublicStudent[]>([]);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [teamSuccessMessage, setTeamSuccessMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleGoBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('enroll');
    url.searchParams.set('public', 'calendar');
    window.location.href = url.pathname + url.search;
  };

  const fetchData = async () => {
    try {
      const sessionData = await getSession(sessionId);
      if (!sessionData) {
        setError('Séance introuvable.');
        setLoading(false);
        return;
      }
      setSession(sessionData);

      const studentsList = await getPublicDirectory(sessionData.schoolYear);
      setStudents(studentsList);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des informations.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  useEffect(() => {
    if (!loading && session) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [loading, session]);

  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    return students
      .filter(student => {
        const last = (student.lastName || '').toLowerCase();
        const first = (student.firstName || '').toLowerCase();
        const full = `${last} ${first}`;
        const reverse = `${first} ${last}`;
        const classe = (student.classGroup || '').toLowerCase();
        return full.includes(q) || reverse.includes(q) || classe === q;
      })
      .slice(0, 15);
  }, [students, searchTerm]);

  const handleEnroll = async (student: PublicStudent) => {
    if (!session) return;

    setEnrollingId(student.id);
    try {
      await enrollInSession(session.id, student.id);
      
      const currentEnrolled = new Set(session.enrolledStudentIds || []);
      currentEnrolled.add(student.id);
      const newEnrolledIds = Array.from(currentEnrolled);

      setSession({
        ...session,
        enrolledStudentIds: newEnrolledIds
      });

      setLastEnrolledStudent(student);
      setSearchTerm('');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleEnrollCustomStudent = async () => {
    if (!session) return;
    const cleanName = searchTerm.trim();
    if (cleanName.length < 2) return;

    const parts = cleanName.split(/\s+/);
    const lastName = (parts[0] || '').toUpperCase();
    const firstName = parts.slice(1).join(' ') || 'Élève';

    setEnrollingId('custom');
    try {
      const createdId = await addStudent({
        lastName,
        firstName,
        schoolYear: session.schoolYear,
        classGroup: 'Inconnue',
        paid: 'NON',
        parentalAuth: 'NON',
        imageRights: 'NON',
        licenseNumber: ''
      });

      const newPublic: PublicStudent = {
        id: createdId,
        lastName,
        firstName,
        schoolYear: session.schoolYear,
        classGroup: 'Inconnue'
      };

      await enrollInSession(session.id, createdId);
      
      setStudents(prev => [newPublic, ...prev]);
      const currentEnrolled = new Set(session.enrolledStudentIds || []);
      currentEnrolled.add(createdId);
      setSession({
        ...session,
        enrolledStudentIds: Array.from(currentEnrolled)
      });

      setLastEnrolledStudent(newPublic);
      setSearchTerm('');
    } catch (err: any) {
      alert("Erreur lors de la création de l'élève.");
    } finally {
      setEnrollingId(null);
    }
  };

  const handleValidateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !teamName.trim() || selectedTeamStudents.length !== (session.teamSize || 4)) return;

    setIsSubmittingTeam(true);
    try {
      await enrollTeamInSession(
        session.id,
        teamName.trim(),
        selectedTeamStudents.map(s => s.id)
      );

      const currentEnrolled = new Set(session.enrolledStudentIds || []);
      selectedTeamStudents.forEach(s => currentEnrolled.add(s.id));
      setSession({
        ...session,
        enrolledStudentIds: Array.from(currentEnrolled)
      });

      setTeamSuccessMessage(teamName.trim());
      setSelectedTeamStudents([]);
      setTeamName('');
    } catch (err: any) {
      alert(err?.message || "Erreur lors de la validation de l'équipe.");
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-bold text-sm">Chargement de la séance...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 text-center shadow-lg border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">{error || "Séance introuvable"}</h2>
          <button
            onClick={handleGoBack}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            ← Retour au calendrier
          </button>
        </div>
      </div>
    );
  }

  const enrolledCount = (session.enrolledStudentIds || []).length;
  const isFull = session.maxParticipants !== undefined && enrolledCount >= session.maxParticipants;
  const isPast = new Date(session.date).setHours(23, 59, 59, 999) < new Date().getTime();
  const isTeamMode = !!session.isTeamRegistration;
  const requiredTeamSize = session.teamSize || 4;

  const formattedDate = new Date(session.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col justify-between p-2 sm:p-6">
      <div className="w-full max-w-xl mx-auto space-y-3">
        {/* Navigation retour fluide */}
        <button
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-indigo-600 bg-white/80 hover:bg-white px-3.5 py-2 rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voir tout le calendrier AS Rosa Parks</span>
        </button>

        {/* CARTE PRINCIPALE SIMPLIFIÉE */}
        <div className="w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* EN-TÊTE COMPACT ET CLAIR SANS PARAMÈTRES SUPERFLUS */}
          <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                {isTeamMode ? '🏆 Tournoi par équipe' : 'Inscription à la séance'}
              </span>
              {isFull ? (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Complet
                </span>
              ) : isPast ? (
                <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Passé
                </span>
              ) : (
                <span className="bg-emerald-500 text-emerald-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Ouvert
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
              {session.name}
            </h1>

            {/* Récapitulatif simple et lisible en une ligne */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-indigo-100 font-medium">
              <span className="flex items-center gap-1 font-bold text-white capitalize">
                <Calendar className="w-4 h-4 text-indigo-300 shrink-0" />
                {formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-indigo-300 shrink-0" />
                {session.time}{session.endTime ? ` - ${session.endTime}` : ''}
              </span>
              {session.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-indigo-300 shrink-0" />
                    <span>{session.location}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CORPS DE L'INSCRIPTION */}
          <div className="p-4 sm:p-6 space-y-4">
            {/* Si séance passée ou complète */}
            {isFull ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="font-black text-slate-800 text-base">La séance est complète</p>
                <p className="text-xs text-slate-500">Toutes les places sont actuellement réservées.</p>
                <button 
                  onClick={handleGoBack}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
                >
                  ← Retour au calendrier
                </button>
              </div>
            ) : isPast ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <p className="font-black text-slate-800 text-base">Cette séance est passée</p>
                <button 
                  onClick={handleGoBack}
                  className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-colors"
                >
                  ← Retour au calendrier
                </button>
              </div>
            ) : (
              <>
                {/* MESSAGE DE SUCCÈS APRÈS VALIDATION */}
                {lastEnrolledStudent && (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-emerald-950 font-black text-base sm:text-lg">
                        Bravo {lastEnrolledStudent.firstName} !
                      </h3>
                      <p className="text-emerald-800 text-xs sm:text-sm font-semibold mt-0.5">
                        Ton inscription pour <strong>{session.name}</strong> est bien validée. Rendez-vous le <strong>{formattedDate}</strong> à <strong>{session.time}</strong> !
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={handleGoBack}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
                        >
                          ← Retour au planning complet
                        </button>
                        <button
                          onClick={() => {
                            setLastEnrolledStudent(null);
                            setTimeout(() => inputRef.current?.focus(), 100);
                          }}
                          className="px-3.5 py-2 bg-white text-emerald-800 hover:bg-emerald-100 text-xs font-bold rounded-xl border border-emerald-300 transition-colors cursor-pointer"
                        >
                          Inscrire un autre élève
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUCCÈS MODE ÉQUIPE */}
                {teamSuccessMessage && (
                  <div className="bg-purple-50 border-2 border-purple-300 rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-purple-950 text-sm">Équipe inscrite avec succès !</h4>
                      <p className="text-xs text-purple-800 mt-0.5">
                        L'équipe <strong>« {teamSuccessMessage} »</strong> est enregistrée.
                      </p>
                      <button
                        onClick={handleGoBack}
                        className="mt-2.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        ← Retour au calendrier
                      </button>
                    </div>
                  </div>
                )}

                {/* MODE ÉQUIPE : ENREGISTREMENT */}
                {isTeamMode && !teamSuccessMessage && (
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-purple-950">
                      1. Nom de votre équipe :
                    </label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="Ex: Les Panthères, Team 3B..."
                      className="w-full px-3.5 py-3 bg-white border border-purple-300 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <div className="flex items-center justify-between text-xs font-bold text-purple-900 pt-1">
                      <span>2. Membres ({selectedTeamStudents.length} / {requiredTeamSize}) :</span>
                      {selectedTeamStudents.length < requiredTeamSize && (
                        <span className="text-purple-600">Ajoutez les {requiredTeamSize - selectedTeamStudents.length} membres ci-dessous</span>
                      )}
                    </div>

                    {selectedTeamStudents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTeamStudents.map(m => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 bg-white border border-purple-200 text-purple-950 text-xs font-bold px-2.5 py-1 rounded-lg"
                          >
                            <span>{m.lastName} {m.firstName}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTeamStudents(selectedTeamStudents.filter(s => s.id !== m.id))}
                              className="text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedTeamStudents.length === requiredTeamSize && teamName.trim() && (
                      <button
                        type="button"
                        onClick={handleValidateTeam}
                        disabled={isSubmittingTeam}
                        className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        {isSubmittingTeam ? "Validation en cours..." : `Valider l'équipe "${teamName}"`}
                      </button>
                    )}
                  </div>
                )}

                {/* ========================================================================= */}
                {/* CASE ULTRA-VISIBLE POUR COMPLÉTER LE NOM DE L'ÉLÈVE                      */}
                {/* ========================================================================= */}
                <div className="space-y-3">
                  <div className="bg-indigo-50/80 p-4 sm:p-5 rounded-2xl border-2 border-indigo-400 shadow-sm focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                    <label
                      htmlFor="student-search-input"
                      className="block text-sm sm:text-base font-black text-slate-900 mb-2 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-indigo-600" />
                        <span>Nom ou prénom de l'élève à inscrire :</span>
                      </span>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                        Étape 1/1
                      </span>
                    </label>

                    {/* CHAMP DE SAISIE PRINCIPAL TRÈS VISIBLE */}
                    <div className="relative">
                      <input
                        ref={inputRef}
                        id="student-search-input"
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Tapez votre nom (ex: Martin, Dupont, Lucas...)"
                        className="w-full pl-11 pr-10 py-3.5 sm:py-4 bg-white border-2 border-indigo-300 focus:border-indigo-600 rounded-xl text-base sm:text-lg font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none shadow-inner"
                        autoComplete="off"
                        autoFocus
                      />
                      <Search className="w-5 h-5 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

                      {searchTerm.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm('');
                            inputRef.current?.focus();
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 rounded-full hover:bg-slate-100 cursor-pointer"
                          title="Effacer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {searchTerm.trim().length === 0 ? (
                      <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Tapez au moins 2 lettres de votre nom pour vous trouver instantanément.</span>
                      </p>
                    ) : searchTerm.trim().length === 1 ? (
                      <p className="text-xs text-slate-500 mt-2">Tapez une deuxième lettre...</p>
                    ) : (
                      <p className="text-xs text-indigo-900 font-bold mt-2">
                        {filteredStudents.length} élève(s) trouvé(s) :
                      </p>
                    )}
                  </div>

                  {/* RÉSULTATS DE RECHERCHE EN 1 CLIC */}
                  {searchTerm.trim().length >= 2 && (
                    <div className="space-y-2 animate-in fade-in duration-150">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                          <p className="font-bold text-slate-700 text-sm">
                            Aucun élève trouvé pour « {searchTerm} »
                          </p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Vérifiez l'orthographe du nom ou pré-inscrivez-vous directement :
                          </p>
                          <button
                            type="button"
                            onClick={handleEnrollCustomStudent}
                            disabled={enrollingId === 'custom'}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                          >
                            <span>M'inscrire avec le nom « {searchTerm.trim()} »</span>
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        filteredStudents.map(student => {
                          const isEnrolled = (session.enrolledStudentIds || []).includes(student.id);
                          const isTeamSelected = selectedTeamStudents.some(s => s.id === student.id);

                          return (
                            <div
                              key={student.id}
                              className={`p-3 sm:p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${
                                isEnrolled
                                  ? 'bg-emerald-50/60 border-emerald-300'
                                  : isTeamSelected
                                  ? 'bg-purple-50/60 border-purple-300'
                                  : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xs'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 text-sm sm:text-base">
                                    {student.lastName} {student.firstName}
                                  </span>
                                  {student.classGroup && (
                                    <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                      Classe : {student.classGroup}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isTeamMode ? (
                                  isTeamSelected ? (
                                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-lg">
                                      Sélectionné ✓
                                    </span>
                                  ) : isEnrolled ? (
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                      Déjà inscrit
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={selectedTeamStudents.length >= requiredTeamSize}
                                      onClick={() => setSelectedTeamStudents([...selectedTeamStudents, student])}
                                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg cursor-pointer"
                                    >
                                      + Ajouter à l'équipe
                                    </button>
                                  )
                                ) : isEnrolled ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200">
                                    <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                                    <span>Inscrit(e) ✓</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleEnroll(student)}
                                    disabled={enrollingId === student.id}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                                  >
                                    {enrollingId === student.id ? (
                                      <span>Inscription...</span>
                                    ) : (
                                      <>
                                        <span>M'inscrire</span>
                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
