import React, { useState, useEffect, useMemo } from 'react';
import { PublicStudent, Session } from '../types';
import { CheckCircle2, Search, AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import { getSession, getPublicDirectory, enrollInSession } from '../lib/db';

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-500 font-medium">Chargement...</div></div>;
  }

  if (error || !session) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">{error}</div></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col justify-center items-center pt-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Inscription</h1>
          <h2 className="text-xl font-semibold opacity-90">{session.name}</h2>
          <p className="opacity-80 mt-2 font-medium">
            {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à {session.time}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {session.requireLicense && (
              <div className="inline-flex items-center gap-2 bg-amber-500/80 px-3 py-1.5 rounded-full text-sm font-medium">
                <ShieldCheck className="w-4 h-4" /> Licence recommandée
              </div>
            )}
            {session.targetAudience === 'adults' && (
              <div className="inline-flex items-center gap-2 bg-rose-500/80 px-3 py-1.5 rounded-full text-sm font-medium">
                <Users className="w-4 h-4" /> Réservé aux adultes
              </div>
            )}
          </div>
          {session.maxParticipants !== undefined && (
            <div className="mt-4 text-sm font-medium opacity-90">
              {(session.enrolledStudentIds || []).length} / {session.maxParticipants} inscrits
            </div>
          )}
        </div>
        
        <div className="p-6">
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
                  <p className="text-slate-500">
                    {isTooEarly ? `Les inscriptions ouvriront le ${openDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}.` 
                    : isTooLate ? `Les inscriptions sont fermées depuis le ${closeDate?.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}.`
                    : isFull ? "Le nombre maximum de participants a été atteint pour cette séance." 
                    : "Cette séance est déjà passée."}
                  </p>
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="mt-6 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    Retour au calendrier
                  </button>
                </div>
              );
            }

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
