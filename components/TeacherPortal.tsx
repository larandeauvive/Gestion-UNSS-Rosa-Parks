import React, { useState } from 'react';
import { Student } from '../types';
import { SessionManager } from './SessionManager';
import { CalendarView } from './CalendarView';
import { StudentTable } from './StudentTable';
import { CalendarDays, Users, Search, Activity } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
}

export const TeacherPortal: React.FC<Props> = ({ students, activeYear }) => {
  const [currentTab, setCurrentTab] = useState<'seances' | 'calendrier' | 'licences'>('seances');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const uniqueClasses = Array.from(new Set(students.map(s => s.classGroup).filter(Boolean))).sort();

  const filteredStudents = students.filter(s => {
    // 1. Text Search
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (s.lastName || '').toLowerCase().includes(searchLower) ||
                          (s.firstName || '').toLowerCase().includes(searchLower) ||
                          (s.classGroup || '').toLowerCase().includes(searchLower);
    
    // 2. Class Filter
    const matchesClass = classFilter ? s.classGroup === classFilter : true;

    // 3. Status Filter
    let matchesStatus = true;
    const isPaid = String(s.paid).toUpperCase() === 'OUI';
    const isAuth = String(s.parentalAuth).toUpperCase() === 'OUI';
    const hasLicense = !!s.licenseNumber;
    // We consider it "à enregistrer" if it's paid and auth is OUI, but no license number or OPUSS unchecked
    const isComplete = isPaid && isAuth;

    if (statusFilter === 'valid') {
      matchesStatus = isComplete && hasLicense;
    } else if (statusFilter === 'toregister') {
      matchesStatus = isComplete && !hasLicense;
    } else if (statusFilter === 'invalid') {
      matchesStatus = !isComplete;
    }

    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-indigo-900 text-white pt-8 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Espace Enseignant</h1>
              <p className="text-indigo-200 mt-2 font-medium">AS Rosa Parks - {activeYear}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-24">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-sm">
          {[
            { id: 'seances', label: 'Appel / Séances', icon: Activity },
            { id: 'calendrier', label: 'Calendrier', icon: CalendarDays },
            { id: 'licences', label: 'État des Licences', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-200 ${
                currentTab === tab.id
                  ? 'bg-white text-indigo-900 shadow-md transform scale-[1.02]'
                  : 'text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${currentTab === tab.id ? 'text-indigo-600' : 'opacity-70'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {currentTab === 'seances' && (
          <SessionManager 
            students={students}
            activeYear={activeYear}
          />
        )}
        
        {currentTab === 'calendrier' && (
          <CalendarView 
            students={students}
            activeYear={activeYear}
            isPublic={true}
          />
        )}

        {currentTab === 'licences' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:w-96">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="text" 
                  placeholder="Rechercher un élève, une classe..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select 
                className="w-full md:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-slate-700"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="">Toutes les classes</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <select 
                className="w-full md:w-64 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-slate-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                <option value="valid">Licence à jour</option>
                <option value="toregister">Dossier complet (à enregistrer)</option>
                <option value="invalid">Dossier incomplet (non à jour)</option>
              </select>
            </div>
            
            <StudentTable 
              students={filteredStudents}
              columns={[
                { key: 'lastName', label: 'Nom', visible: true },
                { key: 'firstName', label: 'Prénom', visible: true },
                { key: 'classGroup', label: 'Classe', visible: true },
                { key: 'licenseNumber', label: 'N° Licence', visible: true },
                { key: 'paid', label: 'Payé', visible: true },
                { key: 'parentalAuth', label: 'Auto. Parentale', visible: true },
              ]}
              selectedIds={new Set()}
              onSelectAll={() => {}}
              onSelectRow={() => {}}
            />
          </div>
        )}
      </main>
    </div>
  );
};
