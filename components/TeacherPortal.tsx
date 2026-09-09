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

  const filteredStudents = students.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    return (s.lastName || '').toLowerCase().includes(searchLower) ||
           (s.firstName || '').toLowerCase().includes(searchLower) ||
           (s.classGroup || '').toLowerCase().includes(searchLower);
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="relative w-full md:w-96">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                <input 
                  type="text" 
                  placeholder="Rechercher un élève, une classe..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
