import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Session, PublicStudent } from '../types';
import { 
  X, Search, Check, CheckCircle2, Calendar, Clock, 
  MapPin, Users, Trophy, AlertCircle, ArrowLeft, Loader2,
  Sparkles, UserCheck
} from 'lucide-react';
import { getPublicDirectory, enrollInSession, enrollTeamInSession, addStudent } from '../lib/db';

interface SimplifiedEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  onSuccess?: () => void;
}

export const SimplifiedEnrollmentModal: React.FC<SimplifiedEnrollmentModalProps> = ({
  isOpen,
  onClose,
  session,
  onSuccess
}) => {
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [successStudent, setSuccessStudent] = useState<PublicStudent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);

  // Pour mode équipe si activé sur la séance
  const [teamName, setTeamName] = useState('');
  const [teamMembers, setTeamMembers] = useState<PublicStudent[]>([]);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [teamSuccessMessage, setTeamSuccessMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Charger la liste publique des élèves dès l'ouverture
  useEffect(() => {
    if (!isOpen || !session) return;
    
    setEnrolledIds(session.enrolledStudentIds || []);
    setSearchTerm('');
    setSuccessStudent(null);
    setErrorMessage(null);
    setTeamName('');
    setTeamMembers([]);
    setTeamSuccessMessage(null);

    const loadDirectory = async () => {
      setLoading(true);
      try {
        const dir = await getPublicDirectory(session.schoolYear);
        setStudents(dir);
      } catch (err) {
        console.warn('Erreur chargement répertoire élèves:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDirectory();

    // Focus automatique sur le champ de recherche pour l'accessibilité smartphone et desktop
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [isOpen, session]);

  // Filtrage ultra-rapide des élèves
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];

    return students
      .filter(s => {
        const last = (s.lastName || '').toLowerCase();
        const first = (s.firstName || '').toLowerCase();
        const full = `${last} ${first}`;
        const reverse = `${first} ${last}`;
        const classe = (s.classGroup || '').toLowerCase();
        return full.includes(q) || reverse.includes(q) || classe === q;
      })
      .slice(0, 12);
  }, [students, searchTerm]);

  if (!isOpen || !session) return null;

  const isFull = session.maxParticipants !== undefined && enrolledIds.length >= session.maxParticipants;
  const isPast = new Date(session.date).setHours(23, 59, 59, 999) < new Date().getTime();
  const isTeamMode = !!session.isTeamRegistration;
  const requiredTeamSize = session.teamSize || 4;

  const handleEnroll = async (student: PublicStudent) => {
    if (!session || isFull || isPast) return;

    setEnrollingId(student.id);
    setErrorMessage(null);

    try {
      await enrollInSession(session.id, student.id);
      
      const updated = Array.from(new Set([...enrolledIds, student.id]));
      setEnrolledIds(updated);
      setSuccessStudent(student);
      setSearchTerm('');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Erreur inscription:', err);
      setErrorMessage(err?.message || "Impossible d'enregistrer l'inscription. Réessayez.");
    } finally {
      setEnrollingId(null);
    }
  };

  // Inscription rapide si l'élève n'est pas encore dans la liste officielle
  const handleEnrollCustomStudent = async () => {
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
      setEnrolledIds(prev => [...prev, createdId]);
      setSuccessStudent(newPublic);
      setSearchTerm('');

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage("Erreur lors de la création de l'élève.");
    } finally {
      setEnrollingId(null);
    }
  };

  // Validation d'une équipe
  const handleValidateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || teamMembers.length !== requiredTeamSize) return;

    setIsSubmittingTeam(true);
    setErrorMessage(null);
    try {
      await enrollTeamInSession(
        session.id,
        teamName.trim(),
        teamMembers.map(m => m.id)
      );

      const updatedEnrolled = Array.from(new Set([...enrolledIds, ...teamMembers.map(m => m.id)]));
      setEnrolledIds(updatedEnrolled);
      setTeamSuccessMessage(teamName.trim());
      setTeamMembers([]);
      setTeamName('');
      setSearchTerm('');

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || "Erreur lors de l'enregistrement de l'équipe.");
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const formattedDate = new Date(session.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE ÉPURÉ SANS SURCHARGE D'INFORMATIONS */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                  {isTeamMode ? '🏆 Inscription Tournoi Équipe' : 'Inscription à la séance'}
                </span>
                {isFull ? (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Complet
                  </span>
                ) : isPast ? (
                  <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Séance passée
                  </span>
                ) : (
                  <span className="bg-emerald-500 text-emerald-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Ouvert
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight truncate">
                {session.name}
              </h2>

              {/* Ligne unique récapitulative : Date • Heure • Lieu */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-100/90 font-medium mt-1.5">
                <span className="flex items-center gap-1 capitalize font-bold text-white">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  {formattedDate}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                  {session.time}{session.endTime ? ` - ${session.endTime}` : ''}
                </span>
                {session.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-none">{session.location}</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 -mt-1 text-indigo-200 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              title="Fermer la fenêtre"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* CORPS DE LA FENÊTRE D'INSCRIPTION */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4 overscroll-contain">
          {/* Alerte si complète ou passée */}
          {isFull ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
              <p className="font-bold text-rose-900 text-sm">Cette séance est actuellement complète.</p>
              <p className="text-xs text-rose-700">Toutes les places disponibles ont été réservées.</p>
            </div>
          ) : isPast ? (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-center space-y-2">
              <p className="font-bold text-slate-800 text-sm">Cette séance est déjà passée.</p>
              <p className="text-xs text-slate-500">Les inscriptions sont fermées pour cette date.</p>
            </div>
          ) : null}

          {/* MESSAGE DE SUCCÈS CONFIRMÉ */}
          {successStudent && (
            <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-emerald-950 font-black text-base sm:text-lg">
                  Inscription confirmée !
                </h3>
                <p className="text-emerald-800 text-xs sm:text-sm font-semibold mt-0.5">
                  <strong>{successStudent.firstName} {successStudent.lastName}</strong> est bien inscrit(e) pour <strong>{session.name}</strong> le {formattedDate} à {session.time}.
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Terminer & Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessStudent(null);
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
                  type="button"
                  onClick={onClose}
                  className="mt-2.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* GESTION D'ERREUR */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE ÉQUIPE : SI ACTIVÉ */}
          {isTeamMode && !teamSuccessMessage && !isPast && !isFull && (
            <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-purple-950">
                1. Nom de l'équipe :
              </label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="Ex: Les Aigles, Team 3B..."
                className="w-full px-3.5 py-2.5 bg-white border border-purple-300 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex items-center justify-between text-xs font-bold text-purple-900 pt-1">
                <span>2. Membres ({teamMembers.length} / {requiredTeamSize}) :</span>
                {teamMembers.length < requiredTeamSize && (
                  <span className="text-purple-600">Ajoutez encore {requiredTeamSize - teamMembers.length} élève(s) ci-dessous</span>
                )}
              </div>

              {teamMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {teamMembers.map(m => (
                    <span 
                      key={m.id}
                      className="inline-flex items-center gap-1.5 bg-white border border-purple-200 text-purple-950 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs"
                    >
                      <span>{m.lastName} {m.firstName}</span>
                      <button 
                        type="button" 
                        onClick={() => setTeamMembers(teamMembers.filter(t => t.id !== m.id))}
                        className="text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {teamMembers.length === requiredTeamSize && teamName.trim() && (
                <button
                  type="button"
                  onClick={handleValidateTeam}
                  disabled={isSubmittingTeam}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  {isSubmittingTeam ? "Validation..." : `Valider l'équipe "${teamName}"`}
                </button>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION CENTRALE : CASE ULTRA-VISIBLE POUR COMPLÉTER LE NOM DE L'ÉLÈVE   */}
          {/* ========================================================================= */}
          {!isPast && !isFull && (
            <div className="space-y-3">
              <div className="bg-indigo-50/70 p-4 sm:p-5 rounded-2xl border-2 border-indigo-400 shadow-sm focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
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
                      const isEnrolled = enrolledIds.includes(student.id);
                      const isTeamSelected = teamMembers.some(t => t.id === student.id);

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
                                  disabled={teamMembers.length >= requiredTeamSize}
                                  onClick={() => setTeamMembers([...teamMembers, student])}
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
          )}
        </div>

        {/* PIED DE FENÊTRE */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
          >
            ← Retour au calendrier
          </button>
          
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            AS Rosa Parks
          </span>
        </div>
      </div>
    </div>
  );
};
