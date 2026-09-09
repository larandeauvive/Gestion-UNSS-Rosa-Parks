import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Convocation, Session, Student } from '../types';
import { Activity, Users, Trophy, TrendingUp, Percent, UserCheck, PieChart, Settings } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
  onNewConvocation: () => void;
}

export const Dashboard: React.FC<Props> = ({ students, activeYear, onNewConvocation }) => {
  const isAdmin = true;
  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolTotal, setSchoolTotal] = useState(() => {
    return parseInt(localStorage.getItem('as_school_total') || '500');
  });
  const [isEditingSchoolTotal, setIsEditingSchoolTotal] = useState(false);

  useEffect(() => {
    let convosLoaded = false;
    let sessionsLoaded = false;

    const qConvo = query(collection(db, 'convocations'), where('schoolYear', '==', activeYear));
    const unsubConvo = onSnapshot(qConvo, (snapshot) => {
      const data: Convocation[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Convocation);
      });
      setConvocations(data);
      convosLoaded = true;
      if (convosLoaded && sessionsLoaded) setLoading(false);
    });

    const qSession = query(collection(db, 'sessions'), where('schoolYear', '==', activeYear));
    const unsubSession = onSnapshot(qSession, (snapshot) => {
      const data: Session[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Session);
      });
      setSessions(data);
      sessionsLoaded = true;
      if (convosLoaded && sessionsLoaded) setLoading(false);
    });

    return () => {
      unsubConvo();
      unsubSession();
    };
  }, [activeYear]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-medium">Chargement des statistiques...</div>;
  }

  const handleSchoolTotalChange = (val: string) => {
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      setSchoolTotal(num);
      localStorage.setItem('as_school_total', num.toString());
    }
  };

  // Base Data
  const studentsThisYear = students.filter(s => s.schoolYear === activeYear);
  
  const licensedStudents = studentsThisYear.filter(s => !!s.licenseNumber && s.licenseNumber.trim() !== '');
  const totalLicencies = licensedStudents.length;
  
  const fillesLicenciees = licensedStudents.filter(s => s.gender === 'F').length;
  const garconsLicencies = licensedStudents.filter(s => s.gender === 'G').length;

  const tauxLicencies = schoolTotal > 0 ? ((totalLicencies / schoolTotal) * 100).toFixed(1) : '0';

  // Participations Tracking (Sessions + Convocations)
  let totalPresences = 0;
  let femalePresences = 0;
  let malePresences = 0;

  const participationMap = new Map<string, number>();

  const processAttendees = (attendeeIds: string[]) => {
    const attendees = studentsThisYear.filter(s => attendeeIds.includes(s.id));
    const count = attendees.length;
    const filles = attendees.filter(s => s.gender === 'F').length;
    const garcons = attendees.filter(s => s.gender === 'G').length;

    totalPresences += count;
    femalePresences += filles;
    malePresences += garcons;

    attendees.forEach(s => {
      participationMap.set(s.id, (participationMap.get(s.id) || 0) + 1);
    });

    return { count, filles, garcons };
  };

  // Processing Convocations & Sessions for timeline and totals
  const eventStats = [
    ...convocations.map(conv => {
      const stats = processAttendees(conv.studentIds || []);
      return {
        type: 'Convocation',
        name: conv.competitionName,
        date: conv.departureDate,
        ...stats
      };
    }),
    ...sessions.map(session => {
      const stats = processAttendees(session.presentStudentIds || []);
      return {
        type: 'Séance',
        name: session.name,
        date: session.date,
        ...stats
      };
    })
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics
  const activeStudentsCount = participationMap.size;
  const tauxParticipationLicencies = totalLicencies > 0 ? ((activeStudentsCount / totalLicencies) * 100).toFixed(1) : '0';
  const moyenneParticipations = totalLicencies > 0 ? (totalPresences / totalLicencies).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Taux de Licenciés */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <Percent className="w-5 h-5" />
            </div>
            {isEditingSchoolTotal && isAdmin ? (
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  className="w-20 px-2 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={schoolTotal}
                  onChange={(e) => handleSchoolTotalChange(e.target.value)}
                  onBlur={() => setIsEditingSchoolTotal(false)}
                  autoFocus
                />
              </div>
            ) : (
              <button 
                onClick={() => isAdmin && setIsEditingSchoolTotal(true)}
                className={`text-slate-400 hover:text-slate-600 transition flex items-center gap-1 text-xs ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                title={isAdmin ? "Modifier l'effectif total du collège" : "Effectif total du collège"}
                disabled={!isAdmin}
              >
                / {schoolTotal} élèves {isAdmin && <Settings className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Taux de licenciés UNSS</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{tauxLicencies}%</span>
              <span className="text-sm text-slate-400">({totalLicencies} inscrits)</span>
            </div>
            <div className="flex justify-between text-xs mt-3 pt-3 border-t border-slate-100 font-medium text-slate-500">
              <span className="text-rose-500">{fillesLicenciees} Filles</span>
              <span className="text-blue-500">{garconsLicencies} Garçons</span>
            </div>
          </div>
        </div>

        {/* Taux de Participation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Taux de participation</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{tauxParticipationLicencies}%</span>
            </div>
            <p className="text-xs mt-3 pt-3 border-t border-slate-100 font-medium text-slate-500">
              {activeStudentsCount} licenciés ont participé à au moins 1 événement.
            </p>
          </div>
        </div>

        {/* Moyenne de Participations */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Moyenne de participations</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-slate-900">{moyenneParticipations}</span>
              <span className="text-sm text-slate-400">/ élève</span>
            </div>
            <p className="text-xs mt-3 pt-3 border-t border-slate-100 font-medium text-slate-500">
              Total cumulé : {totalPresences} présences.
            </p>
          </div>
        </div>

        {/* Répartition des présences (F/G) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
            <PieChart className="w-5 h-5" />
          </div>
          <div className="w-full">
            <p className="text-sm font-semibold text-slate-500 mb-2">Répartition des présences</p>
            <div className="flex w-full bg-slate-100 rounded-full h-3">
              <div style={{width: totalPresences ? `${(femalePresences/totalPresences)*100}%` : '0%'}} className="bg-rose-400 h-3 rounded-l-full"></div>
              <div style={{width: totalPresences ? `${(malePresences/totalPresences)*100}%` : '0%'}} className="bg-blue-400 h-3 rounded-r-full"></div>
            </div>
            <div className="flex justify-between text-xs mt-3 pt-3 border-t border-slate-100 font-semibold text-slate-500">
               <span className="text-rose-500">{totalPresences ? ((femalePresences/totalPresences)*100).toFixed(0) : 0}% Filles</span>
               <span className="text-blue-500">{totalPresences ? ((malePresences/totalPresences)*100).toFixed(0) : 0}% Garçons</span>
            </div>
          </div>
        </div>

      </div>

      {/* Detailed Stats Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
         <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
           <h2 className="font-bold text-slate-900 items-center gap-2 flex">Historique des présences</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Nom de l'évènement</th>
                  <th className="px-6 py-4 text-center">Effectif</th>
                  <th className="px-6 py-4 text-center">Filles</th>
                  <th className="px-6 py-4 text-center">Garçons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {eventStats.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">Aucune donnée pour cette année scolaire.</td></tr>
                 ) : eventStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(stat.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${stat.type === 'Séance' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {stat.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {stat.name || 'Sans titre'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-full text-xs">{stat.count}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-rose-600 font-semibold">{stat.filles}</td>
                      <td className="px-6 py-4 text-center text-blue-600 font-semibold">{stat.garcons}</td>
                    </tr>
                 ))}
              </tbody>
            </table>
         </div>
      </div>

    </div>
  );
};

