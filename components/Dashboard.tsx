import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Convocation, Student } from '../types';
import { Activity, Users, Trophy, TrendingUp } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
}

export const Dashboard: React.FC<Props> = ({ students, activeYear }) => {
  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'convocations'), where('schoolYear', '==', activeYear));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Convocation[] = [];
      snapshot.forEach(d => {
        data.push({ id: d.id, ...d.data() } as Convocation);
      });
      setConvocations(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeYear]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-medium">Chargement du tableau de bord...</div>;
  }

  // Analytics Computation
  const studentsThisYear = students.filter(s => s.schoolYear === activeYear);
  const totalConvocations = convocations.length;
  
  let totalPresences = 0;
  let femalePresences = 0;
  let malePresences = 0;
  
  // Calculate specific events frequencies
  const eventStats = convocations.map(conv => {
    const attendees = studentsThisYear.filter(s => conv.studentIds?.includes(s.id));
    const count = attendees.length;
    const filles = attendees.filter(s => s.gender === 'F').length;
    const garcons = count - filles; // Wait, some might have no gender, let's be precise
    const exactGarcons = attendees.filter(s => s.gender === 'G').length;
    
    totalPresences += count;
    femalePresences += filles;
    malePresences += exactGarcons;

    return {
      name: conv.competitionName,
      date: conv.departureDate,
      count,
      filles,
      garcons: exactGarcons
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Unique active students
  const uniqueAttendeesSet = new Set<string>();
  convocations.forEach(c => c.studentIds?.forEach(id => uniqueAttendeesSet.add(id)));
  const uniqueAttendees = uniqueAttendeesSet.size;

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Évènements</p>
            <p className="text-2xl font-bold text-slate-900">{totalConvocations}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Participations</p>
            <p className="text-2xl font-bold text-slate-900">{totalPresences}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Élèves Actifs (UNSS)</p>
            <p className="text-2xl font-bold text-slate-900">{uniqueAttendees}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div className="w-full">
            <p className="text-sm font-semibold text-slate-500 mb-1">Répartition Globale</p>
            <div className="flex w-full bg-slate-100 rounded-full h-2">
              <div style={{width: totalPresences ? `${(femalePresences/totalPresences)*100}%` : '0%'}} className="bg-rose-400 h-2 rounded-l-full"></div>
              <div style={{width: totalPresences ? `${(malePresences/totalPresences)*100}%` : '0%'}} className="bg-blue-400 h-2 rounded-r-full"></div>
            </div>
            <div className="flex justify-between text-[10px] mt-1 font-semibold text-slate-400">
               <span className="text-rose-500">{femalePresences} Filles</span>
               <span className="text-blue-500">{malePresences} Garçons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
         <div className="p-5 border-b border-slate-100 bg-slate-50">
           <h2 className="font-bold text-slate-900 items-center gap-2 flex">Fréquentation par évènement</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Nom de l'évènement</th>
                  <th className="px-6 py-4 text-center">Effectif Total</th>
                  <th className="px-6 py-4 text-center">Filles</th>
                  <th className="px-6 py-4 text-center">Garçons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                 {eventStats.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">Aucune donnée pour cette année scolaire.</td></tr>
                 ) : eventStats.map((stat, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(stat.date).toLocaleDateString('fr-FR')}
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
