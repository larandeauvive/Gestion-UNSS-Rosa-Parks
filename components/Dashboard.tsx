import React, { useState, useEffect, useMemo } from 'react';
import { Convocation, Session, Student } from '../types';
import { Activity, Users, Trophy, TrendingUp, Percent, UserCheck, PieChart, Settings } from 'lucide-react';
import { getConvocationsList, getSessionsList } from '../lib/db';
import { normalizeGender } from '../lib/utils';

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
    const fetchData = async () => {
      setLoading(true);
      try {
        const [convos, sess] = await Promise.all([
          getConvocationsList(activeYear),
          getSessionsList(activeYear)
        ]);
        setConvocations(convos);
        setSessions(sess);
      } catch (err) {
        console.error("Erreur Dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeYear]);

  // Filtrer les élèves de l'année active (toujours appelé avant tout return conditionnel)
  const yearStudents = useMemo(() => {
    return students.filter(s => !s.schoolYear || s.schoolYear === activeYear);
  }, [students, activeYear]);

  // Élèves licenciés (avec un numéro de licence renseigné)
  const licensedStudentsList = useMemo(() => {
    return yearStudents.filter(s => !!(s.licenseNumber && s.licenseNumber.trim() !== ''));
  }, [yearStudents]);

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

  // Statistiques Générales
  const totalStudents = yearStudents.length;
  const licensedStudents = licensedStudentsList.length;
  const paidStudents = yearStudents.filter(s => s.paid === 'OUI').length;
  
  // Taux de pénétration (% d'élèves du lycée licenciés à l'AS)
  const penetrationRate = schoolTotal > 0 ? ((licensedStudents / schoolTotal) * 100).toFixed(1) : '0';

  // Répartition Filles / Garçons normalisée UNIQUEMENT sur les élèves licenciés
  const femaleLicensedStudents = licensedStudentsList.filter(s => normalizeGender(s.gender) === 'F').length;
  const maleLicensedStudents = licensedStudentsList.filter(s => normalizeGender(s.gender) === 'M').length;
  const specifiedGenderLicensedTotal = femaleLicensedStudents + maleLicensedStudents;
  const unassignedGenderLicensed = licensedStudents - specifiedGenderLicensedTotal;

  // Pourcentages basés sur le total des licenciés
  const baseLicensedTotal = specifiedGenderLicensedTotal > 0 ? specifiedGenderLicensedTotal : licensedStudents;
  const femalePercentage = baseLicensedTotal > 0 ? Math.round((femaleLicensedStudents / baseLicensedTotal) * 100) : 0;
  const malePercentage = baseLicensedTotal > 0 ? 100 - femalePercentage : 0;

  // Répartition par Niveau / Classe
  const levelCounts: Record<string, number> = {};
  yearStudents.forEach(s => {
    let level = 'Autre';
    const c = (s.classGroup || '').toUpperCase();
    if (c.includes('2') || c.includes('SECONDE')) level = '2nde';
    else if (c.includes('1') || c.includes('PREMIERE')) level = '1ère';
    else if (c.includes('T') || c.includes('TERM')) level = 'Terminale';
    else if (c.includes('BTS')) level = 'BTS / Sup';
    else if (c.includes('CAP')) level = 'CAP';
    else if (c) level = c;

    levelCounts[level] = (levelCounts[level] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inscrits AS</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{totalStudents}</span>
              <span className="text-xs font-semibold text-emerald-600">({paidStudents} cotisations)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Licenciés UNSS</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{licensedStudents}</span>
              <span className="text-xs font-semibold text-slate-500">
                sur {totalStudents} ({totalStudents > 0 ? Math.round((licensedStudents/totalStudents)*100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taux pénétration</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{penetrationRate}%</span>
                <span className="text-xs text-slate-400">du lycée</span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsEditingSchoolTotal(!isEditingSchoolTotal)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              title="Modifier l'effectif total de l'établissement"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Compétitions</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{convocations.length}</span>
                <span className="text-xs font-semibold text-slate-500">({sessions.length} séances)</span>
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={onNewConvocation}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              + Convoc
            </button>
          )}
        </div>
      </div>

      {/* Réglage rapide effectif global */}
      {isEditingSchoolTotal && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-wrap items-center gap-4 animate-in fade-in">
          <p className="text-sm font-semibold text-amber-900">
            Effectif global des élèves dans le lycée pour le calcul du pourcentage de licenciés :
          </p>
          <input 
            type="number" 
            value={schoolTotal}
            onChange={e => handleSchoolTotalChange(e.target.value)}
            className="w-24 px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-slate-900 text-center"
          />
          <button 
            onClick={() => setIsEditingSchoolTotal(false)}
            className="text-xs font-bold px-3 py-1.5 bg-amber-200 text-amber-900 rounded-lg hover:bg-amber-300"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Deux Colonnes : Genre / Mixité & Niveaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mixité Filles / Garçons (Licenciés) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-indigo-600" /> Mixité des Licenciés
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              {licensedStudents} licencié{licensedStudents > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-bold mb-1.5">
                <span className="text-rose-600">Filles : {femaleLicensedStudents} ({femalePercentage}%)</span>
                <span className="text-blue-600">Garçons : {maleLicensedStudents} ({malePercentage}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                  className="bg-rose-500 h-full transition-all duration-500" 
                  style={{ width: `${femalePercentage}%` }} 
                />
                <div 
                  className="bg-blue-600 h-full transition-all duration-500" 
                  style={{ width: `${malePercentage}%` }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <p className="text-xs text-rose-700 font-semibold">Licenciées Filles</p>
                <p className="text-lg font-black text-rose-900 mt-0.5">
                  {femaleLicensedStudents}
                </p>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 font-semibold">Licenciés Garçons</p>
                <p className="text-lg font-black text-blue-900 mt-0.5">
                  {maleLicensedStudents}
                </p>
              </div>
            </div>

            {unassignedGenderLicensed > 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                ⚠️ Genre non renseigné pour {unassignedGenderLicensed} élève{unassignedGenderLicensed > 1 ? 's' : ''} licencié{unassignedGenderLicensed > 1 ? 's' : ''}.
              </p>
            )}
          </div>
        </div>

        {/* Répartition par Niveaux */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Répartition par niveau scolaire
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(levelCounts).map(([lvl, cnt]) => (
              <div key={lvl} className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase">{lvl}</p>
                <p className="text-xl font-black text-slate-900 mt-1">{cnt}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {totalStudents > 0 ? Math.round((cnt / totalStudents) * 100) : 0}% de l'AS
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
