import React, { useState, useEffect, useMemo } from 'react';
import { PublicStudent, Session, SessionTeam } from '../types';
import { 
  CheckCircle2, Search, AlertTriangle, ShieldCheck, 
  Users, UserPlus, X, Trophy, Sparkles, Check, ChevronRight 
} from 'lucide-react';
import { getSession, getPublicDirectory, enrollInSession, enrollTeamInSession } from '../lib/db';

interface PublicEnrollmentProps {
  sessionId: string;
}

export function PublicEnrollment({ sessionId }: PublicEnrollmentProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<PublicStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  // États pour l'inscription en équipe
  const [teamName, setTeamName] = useState('');
  const [selectedTeamStudents, setSelectedTeamStudents] = useState<PublicStudent[]>([]);
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [teamSuccessMessage, setTeamSuccessMessage] = useState<string | null>(null);
  const [teamTab, setTeamTab] = useState<'create' | 'list'>('create');

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
      setError('Erreur de chargement.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  const filteredStudents = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    return students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (student.lastName || '').toLowerCase().includes(searchLower) ||
                            (student.firstName || '').toLowerCase().includes(searchLower);
      return matchesSearch;
    });
  }, [students, searchTerm]);

  // Recherche des élèves pour composer son équipe
  const filteredTeamCandidates = useMemo(() => {
    if (teamSearchTerm.trim().length < 2) return [];
    const query = teamSearchTerm.toLowerCase();
    const alreadySelectedIds = new Set(selectedTeamStudents.map(s => s.id));

    return students
      .filter(s => !alreadySelectedIds.has(s.id))
      .filter(s => {
        const matches = (s.lastName || '').toLowerCase().includes(query) ||
                        (s.firstName || '').toLowerCase().includes(query);
        return matches;
      })
      .slice(0, 10);
  }, [students, teamSearchTerm, selectedTeamStudents]);

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
      
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'inscription.');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleAddTeammate = (student: PublicStudent) => {
    const requiredSize = session?.teamSize || 4;
    if (selectedTeamStudents.length >= requiredSize) {
      alert(`Votre équipe est déjà complète (${requiredSize} élèves).`);
      return;
    }
    setSelectedTeamStudents(prev => [...prev, student]);
    setTeamSearchTerm('');
  };

  const handleRemoveTeammate = (studentId: string) => {
    setSelectedTeamStudents(prev => prev.filter(s => s.id !== studentId));
  };

  const handleValidateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const requiredSize = session.teamSize || 4;

    if (!teamName.trim()) {
      alert("Veuillez choisir un nom pour votre équipe.");
      return;
    }

    if (selectedTeamStudents.length !== requiredSize) {
      alert(`Il faut exactement ${requiredSize} élèves pour valider l'équipe (actuellement ${selectedTeamStudents.length}).`);
      return;
    }

    setIsSubmittingTeam(true);
    try {
      const studentIds = selectedTeamStudents.map(s => s.id);
      const createdTeam = await enrollTeamInSession(session.id, teamName.trim(), studentIds);

      // Mettre à jour l'état local
      const currentEnrolled = new Set(session.enrolledStudentIds || []);
      studentIds.forEach(id => currentEnrolled.add(id));
      const updatedTeams = [...(session.teams || []), createdTeam];

      setSession({
        ...session,
        enrolledStudentIds: Array.from(currentEnrolled),
        teams: updatedTeams
      });

      setTeamSuccessMessage(teamName.trim());
      setTeamName('');
      setSelectedTeamStudents([]);
      setTeamTab('list');
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement de l'équipe.");
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-500 font-medium">Chargement...</div></div>;
  }

  if (error || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">{error}</div></div>;
  }

  const isTeamMode = !!session.isTeamRegistration;
  const requiredTeamSize = session.teamSize || 4;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col justify-center items-center pt-8">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-md border border-slate-200/80 overflow-hidden">
        {/* Header de la séance */}
        <div className={`p-6 sm:p-8 text-white text-center ${isTeamMode ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-indigo-950' : 'bg-indigo-600'}`}>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 text-white">
            {isTeamMode ? (
              <span className="flex items-center gap-1.5 text-purple-200">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                Tournoi / Événement par équipe
              </span>
            ) : (
              <span>Séance d'activité AS</span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mb-1.5 tracking-tight">{session.name}</h1>
          <p className="text-sm opacity-90 font-medium">
            📅 {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à {session.time}
            {session.endTime ? ` - ${session.endTime}` : ''}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {isTeamMode && (
              <div className="inline-flex items-center gap-2 bg-purple-500/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-bold shadow-sm">
                <Users className="w-4 h-4" /> Équipe requise : {requiredTeamSize} élèves
              </div>
            )}
            {session.requireLicense && (
              <div className="inline-flex items-center gap-2 bg-amber-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                <ShieldCheck className="w-4 h-4" /> Licence recommandée
              </div>
            )}
            {session.targetAudience === 'adults' && (
              <div className="inline-flex items-center gap-2 bg-rose-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium">
                <Users className="w-4 h-4" /> Réservé aux adultes
              </div>
            )}
          </div>

          <div className="mt-4 text-xs font-semibold opacity-90 flex items-center justify-center gap-4">
            <span>
              👥 {(session.enrolledStudentIds || []).length} {session.maxParticipants ? `/ ${session.maxParticipants}` : ''} inscrits
            </span>
            {isTeamMode && (
              <span>
                🏆 {(session.teams || []).length} équipe(s) complète(s)
              </span>
            )}
          </div>
        </div>
        
        <div className="p-6 sm:p-8">
          {(() => {
            const now = new Date();
            const openDate = session.registrationOpenDate ? new Date(session.registrationOpenDate) : null;
            const closeDate = session.registrationCloseDate ? new Date(session.registrationCloseDate) : null;
            
            const isTooEarly = openDate && now < openDate;
            const isTooLate = closeDate && now > closeDate;
            
            const isFull = session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants;
            const isPast = new Date(session.date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
            
            if (isFull || isPast || isTooEarly || isTooLate) {
              return (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Inscriptions closes</h3>
                  <p className="text-slate-500 text-sm">
                    {isTooEarly ? `Les inscriptions ouvriront le ${openDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}.` 
                    : isTooLate ? `Les inscriptions sont fermées depuis le ${closeDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}.`
                    : isFull ? "Le nombre maximum de participants a été atteint pour cette séance." 
                    : "Cette séance est déjà passée."}
                  </p>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Retour au calendrier
                  </button>
                </div>
              );
            }

            // ================================================================
            // MODE INSCRIPTION EN ÉQUIPE
            // ================================================================
            if (isTeamMode) {
              const enrolledTeams = session.teams || [];

              return (
                <div className="space-y-6">
                  {/* Bannière de confirmation après enregistrement */}
                  {teamSuccessMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in zoom-in-95">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-emerald-900 text-sm">Inscription validée avec succès !</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          L'équipe <strong>« {teamSuccessMessage} »</strong> et ses {requiredTeamSize} membres sont officiellement enregistrés.
                        </p>
                        <button
                          onClick={() => setTeamSuccessMessage(null)}
                          className="mt-2 text-xs font-bold text-emerald-800 hover:underline"
                        >
                          Fermer ce message
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Onglets : Créer mon équipe / Voir les équipes */}
                  <div className="flex border-b border-slate-200 gap-2">
                    <button
                      type="button"
                      onClick={() => setTeamTab('create')}
                      className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${teamTab === 'create' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4" />
                        Inscrire une équipe
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamTab('list')}
                      className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${teamTab === 'list' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        Équipes déjà inscrites ({enrolledTeams.length})
                      </span>
                    </button>
                  </div>

                  {teamTab === 'create' ? (
                    <form onSubmit={handleValidateTeam} className="space-y-5">
                      <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          Règle de validation de l'équipe :
                        </div>
                        <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                          Pour être validée, chaque équipe doit être composée d'exactement <strong>{requiredTeamSize} élèves</strong> de l'AS.
                        </p>
                      </div>

                      {/* Étape 1: Nom de l'équipe */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          1. Nom de l'équipe *
                        </label>
                        <input
                          type="text"
                          required
                          value={teamName}
                          onChange={e => setTeamName(e.target.value)}
                          placeholder="Ex: Les Aigles de Rosa Parks, Team 4A..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-semibold text-sm"
                        />
                      </div>

                      {/* Étape 2: Roster des élèves */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            2. Membres de l'équipe ({selectedTeamStudents.length} / {requiredTeamSize})
                          </label>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selectedTeamStudents.length === requiredTeamSize ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-purple-100 text-purple-800'}`}>
                            {selectedTeamStudents.length === requiredTeamSize 
                              ? "Équipe complète ✓" 
                              : `Encore ${requiredTeamSize - selectedTeamStudents.length} élève(s) requis`}
                          </span>
                        </div>

                        {/* Liste des membres déjà sélectionnés */}
                        <div className="space-y-2 mb-3">
                          {selectedTeamStudents.map((st, idx) => (
                            <div key={st.id} className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between gap-3 animate-in fade-in">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900 text-sm">
                                    {st.lastName} {st.firstName}
                                    {st.classGroup && (
                                      <span className="text-xs text-slate-500 font-normal ml-2">({st.classGroup})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {String(st.paid).toUpperCase() === 'OUI' ? (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">€ Réglé</span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/70 px-1.5 py-0.2 rounded">€ Manquant</span>
                                    )}
                                    {String(st.parentalAuth).toUpperCase() === 'OUI' && (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">AP Validée</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveTeammate(st.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Retirer de l'équipe"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}

                          {selectedTeamStudents.length === 0 && (
                            <div className="p-4 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 text-xs">
                              Aucun élève sélectionné. Recherchez le nom de vos coéquipiers ci-dessous.
                            </div>
                          )}
                        </div>

                        {/* Recherche et ajout de coéquipiers si équipe incomplète */}
                        {selectedTeamStudents.length < requiredTeamSize && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="block text-xs font-semibold text-slate-600">
                              Ajouter un coéquipier (recherche par nom ou prénom) :
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Tapez le nom d'un élève..."
                                value={teamSearchTerm}
                                onChange={e => setTeamSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                              />
                              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                            </div>

                            {/* Suggestions */}
                            {teamSearchTerm.trim().length >= 2 && (
                              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                                {filteredTeamCandidates.map(candidate => {
                                  // Vérifier si déjà dans une autre équipe
                                  const alreadyInAnotherTeam = enrolledTeams.some(t => (t.studentIds || []).includes(candidate.id));

                                  return (
                                    <div key={candidate.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 gap-2">
                                      <div>
                                        <span className="font-semibold text-slate-800 text-xs">
                                          {candidate.lastName} {candidate.firstName}
                                        </span>
                                        {candidate.classGroup && (
                                          <span className="text-[11px] text-slate-500 ml-1.5 font-medium">({candidate.classGroup})</span>
                                        )}
                                      </div>

                                      {alreadyInAnotherTeam ? (
                                        <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200">
                                          Déjà inscrit dans une autre équipe
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleAddTeammate(candidate)}
                                          className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                        >
                                          <UserPlus className="w-3.5 h-3.5" />
                                          Ajouter
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}

                                {filteredTeamCandidates.length === 0 && (
                                  <div className="p-3 text-xs text-slate-500 text-center">
                                    Aucun élève trouvé pour cette recherche.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bouton de validation conditionnel */}
                      <div className="pt-2">
                        {selectedTeamStudents.length === requiredTeamSize ? (
                          <button
                            type="submit"
                            disabled={isSubmittingTeam || !teamName.trim()}
                            className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black rounded-xl text-sm transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <Trophy className="w-4 h-4 text-amber-300" />
                            <span>
                              {isSubmittingTeam 
                                ? "Validation en cours..." 
                                : `Valider l'inscription de l'équipe (${requiredTeamSize}/${requiredTeamSize} élèves)`}
                            </span>
                          </button>
                        ) : (
                          <div className="p-3.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-center text-xs font-semibold">
                            ⚠️ Inscription bloquée : l'équipe doit compter exactement <strong>{requiredTeamSize} élèves</strong> pour être validée ({selectedTeamStudents.length}/{requiredTeamSize} actuellement).
                          </div>
                        )}
                      </div>
                    </form>
                  ) : (
                    /* Liste des équipes inscrites */
                    <div className="space-y-4">
                      {enrolledTeams.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-semibold text-slate-700">Aucune équipe inscrite pour l'instant</p>
                          <p className="text-xs text-slate-500 mt-1">Soyez les premiers à inscrire votre équipe !</p>
                          <button
                            type="button"
                            onClick={() => setTeamTab('create')}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
                          >
                            Inscrire mon équipe
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {enrolledTeams.map((team, idx) => (
                            <div key={team.id || idx} className="p-4 bg-white border border-purple-200/80 rounded-2xl shadow-xs">
                              <div className="flex items-center justify-between mb-2.5">
                                <h4 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-black">
                                    {idx + 1}
                                  </span>
                                  <span>{team.name}</span>
                                </h4>
                                <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                                  {team.studentIds?.length || 0} / {requiredTeamSize} élèves
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                                {(team.studentIds || []).map(sid => {
                                  const st = students.find(s => s.id === sid);
                                  return (
                                    <div key={sid} className="text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
                                      <span className="font-medium text-slate-800">
                                        {st ? `${st.lastName} ${st.firstName}` : sid}
                                      </span>
                                      {st?.classGroup && (
                                        <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                          {st.classGroup}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // ================================================================
            // MODE INSCRIPTION INDIVIDUELLE (STANDARD)
            // ================================================================
            return (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Recherchez votre nom</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Entrez votre nom ou prénom..." 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                  {searchTerm.length > 0 && searchTerm.length < 2 && (
                    <p className="text-xs text-slate-500 mt-2">Tapez au moins 2 caractères...</p>
                  )}
                </div>

                <div className="space-y-3">
                  {filteredStudents.map(student => {
                    const isEnrolled = (session.enrolledStudentIds || []).includes(student.id);
                    
                    return (
                      <div key={student.id} className={`p-4 rounded-xl border ${isEnrolled ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} flex items-center justify-between gap-4`}>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2 flex-wrap">
                            <span>{student.lastName} {student.firstName}</span>
                            {student.classGroup && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                {student.classGroup}
                              </span>
                            )}
                          </div>

                          {/* Statuts administratifs pour l'information de l'élève */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {String(student.paid).toUpperCase() === 'OUI' ? (
                              <span title="Cotisation réglée" className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                € Cotisation réglée
                              </span>
                            ) : (
                              <span title="Cotisation non réglée" className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                €🚫 Cotisation manquante
                              </span>
                            )}

                            {String(student.parentalAuth).toUpperCase() === 'OUI' ? (
                              <span title="Autorisation parentale validée" className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                AP validée
                              </span>
                            ) : (
                              <span title="Autorisation parentale manquante" className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                                AP🚫 Autorisation manquante
                              </span>
                            )}

                            {String(student.swimmingCertificate).toUpperCase() !== 'OUI' && (
                              <span title="Attestation savoir nager non validée" className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                                🏊‍♂️🚫 Savoir nager non validé
                              </span>
                            )}

                            {String(student.imageRights).toUpperCase() !== 'OUI' && (
                              <span title="Droit à l'image non validé" className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                📷🚫 Droit à l'image non validé
                              </span>
                            )}
                          </div>

                          {session.requireLicense && !student.licenseNumber && !isEnrolled && (
                            <div className="text-xs text-amber-700 font-medium flex items-center gap-1 mt-2">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Pas de licence enregistrée (l'inscription reste possible)</span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {isEnrolled ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-100 px-3 py-1.5 rounded-lg text-sm">
                              <CheckCircle2 className="w-4 h-4" /> Inscrit
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleEnroll(student)}
                              disabled={enrollingId === student.id || (session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants)}
                              className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${(session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                              {enrollingId === student.id ? '...' : (session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants ? 'Complet' : 'S\'inscrire')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {searchTerm.length >= 2 && filteredStudents.length === 0 && (
                    <div className="text-center text-slate-500 py-8">
                      Aucun élève trouvé avec ce nom.
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
