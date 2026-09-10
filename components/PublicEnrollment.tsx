import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, Session } from '../types';
import { CheckCircle2, Search, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PublicEnrollmentProps {
  sessionId: string;
}

export function PublicEnrollment({ sessionId }: PublicEnrollmentProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (!sessionDoc.exists()) {
          setError('Séance introuvable.');
          setLoading(false);
          return;
        }
        const sessionData = { id: sessionDoc.id, ...sessionDoc.data() } as Session;
        setSession(sessionData);

        const studentsQuery = query(collection(db, 'students'), where('schoolYear', '==', sessionData.schoolYear));
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList: Student[] = [];
        studentsSnapshot.forEach(doc => {
          studentsList.push({ id: doc.id, ...doc.data() } as Student);
        });
        setStudents(studentsList);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Erreur de chargement.');
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  const filteredStudents = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    return students.filter(student => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (student.lastName || '').toLowerCase().includes(searchLower) ||
                            (student.firstName || '').toLowerCase().includes(searchLower);
                            
      if (!matchesSearch) return false;
      
      if (session?.targetAudience === 'students' && student.isAdult) return false;
      if (session?.targetAudience === 'adults' && !student.isAdult) return false;
      
      return true;
    });
  }, [students, searchTerm, session]);

  const handleEnroll = async (student: Student) => {
    if (!session) return;
    
    if (session.requireLicense && !student.licenseNumber) {
      alert(`Désolé ${student.firstName}, vous ne pouvez pas vous inscrire car vous n'êtes pas à jour de votre licence.`);
      return;
    }

    setEnrollingId(student.id);
    try {
      const currentEnrolled = new Set(session.enrolledStudentIds || []);
      currentEnrolled.add(student.id);
      
      const newEnrolledIds = Array.from(currentEnrolled);
      await updateDoc(doc(db, 'sessions', session.id), {
        enrolledStudentIds: newEnrolledIds
      });
      
      if (session.convocationId) {
        await updateDoc(doc(db, 'convocations', session.convocationId), {
          studentIds: newEnrolledIds
        });
      }
      
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center items-start pt-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Inscription</h1>
          <h2 className="text-xl font-semibold opacity-90">{session.name}</h2>
          <p className="opacity-80 mt-2 font-medium">
            {new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} à {session.time}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {session.requireLicense && (
              <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-sm font-medium">
                <ShieldCheck className="w-4 h-4" /> Licence obligatoire
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
            const isFull = session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants;
            const isPast = new Date(session.date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
            
            if (isFull || isPast) {
              return (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Inscriptions closes</h3>
                  <p className="text-slate-500">
                    {isFull ? "Le nombre maximum de participants a été atteint pour cette séance." : "Cette séance est déjà passée."}
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
                    const cannotEnroll = session.requireLicense && !student.licenseNumber;
                    
                    return (
                      <div key={student.id} className={`p-4 rounded-xl border ${isEnrolled ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'} flex items-center justify-between`}>
                        <div>
                          <div className="font-bold text-slate-800 text-lg flex items-center gap-1.5 flex-wrap">
                            {String(student.parentalAuth).toUpperCase() !== 'OUI' && <span title="Autorisation parentale manquante" className="text-base text-rose-500 leading-none mb-0.5">AP🚫</span>}
                            {String(student.swimmingCertificate).toUpperCase() !== 'OUI' && <span title="Savoir nager non validé" className="text-base">🏊‍♂️🚫</span>}
                            {String(student.imageRights).toUpperCase() !== 'OUI' && <span title="Droit à l'image non validé" className="text-base">📷🚫</span>}
                            {String(student.paid).toUpperCase() !== 'OUI' && <span title="Paiement manquant" className="text-base text-rose-500 leading-none mb-0.5">€🚫</span>}
                            <span>{student.lastName} {student.firstName}</span>
                          </div>
                          <div className="text-sm text-slate-500 mt-1">Classe : {student.classGroup}</div>
                          {cannotEnroll && !isEnrolled && (
                            <div className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" /> Pas de licence enregistrée
                            </div>
                          )}
                        </div>
                        {isEnrolled ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-100 px-3 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-5 h-5" /> Inscrit
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleEnroll(student)}
                            disabled={cannotEnroll || enrollingId === student.id || (session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants)}
                            className={`px-4 py-2 rounded-lg font-bold transition-colors ${cannotEnroll || (session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                          >
                            {enrollingId === student.id ? '...' : (session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants ? 'Complet' : 'S\'inscrire')}
                          </button>
                        )}
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
