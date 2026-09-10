import React, { useState } from 'react';
import { Student } from '../types';
import { SessionManager } from './SessionManager';
import { CalendarView } from './CalendarView';
import { StudentTable } from './StudentTable';
import { ConvocationManager } from './ConvocationManager';
import { CalendarDays, Users, Search, Activity, Printer, ClipboardList } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
}

export const TeacherPortal: React.FC<Props> = ({ students, activeYear }) => {
  const [currentTab, setCurrentTab] = useState<'seances' | 'calendrier' | 'licences' | 'convocations'>('seances');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handlePrint = () => {
    const dataToProcess = students.filter(s => selectedIds.has(s.id));
    const activeColumns = [
      { key: 'lastName', label: 'Nom' },
      { key: 'firstName', label: 'Prénom' },
      { key: 'birthDate', label: 'Né(e) le' },
      { key: 'classGroup', label: 'Classe' },
      { key: 'licenseNumber', label: 'N° Licence' },
      { key: 'paid', label: 'Payé' },
      { key: 'parentalAuth', label: 'Auto. Parentale' },
    ];

    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Impression Licenciés - Espace Enseignant</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #1e293b; }
          h1 { text-align: center; margin-bottom: 5px; }
          h2 { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; }
          @media print {
            @page { margin: 1cm; }
            body { padding: 0; }
          }
        </style>
        </head><body>
          <h1>Liste des Licenciés - ${activeYear}</h1>
          <h2>Document généré le ${new Date().toLocaleDateString('fr-FR')}</h2>
          <table>
            <thead>
              <tr>${activeColumns.map(c => `<th>${c.label}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${dataToProcess.map(s => `
                <tr>
                  ${activeColumns.map(c => `<td>${s[c.key] || ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

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
            { id: 'convocations', label: 'Convocations', icon: ClipboardList },
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

        {currentTab === 'convocations' && (
          <ConvocationManager 
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
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

              <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                <div className="text-sm font-medium text-slate-500">
                   {selectedIds.size} sélectionné(s)
                </div>
                <button 
                  disabled={selectedIds.size === 0}
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" /> Imprimer
                </button>
              </div>
            </div>
            
            <StudentTable 
              students={filteredStudents}
              columns={[
                { key: 'lastName', label: 'Nom', visible: true },
                { key: 'firstName', label: 'Prénom', visible: true },
                { key: 'birthDate', label: 'Né(e) le', visible: true },
                { key: 'classGroup', label: 'Classe', visible: true },
                { key: 'licenseNumber', label: 'N° Licence', visible: true },
                { key: 'paid', label: 'Payé', visible: true },
                { key: 'parentalAuth', label: 'Auto. Parentale', visible: true },
              ]}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectRow={handleSelectRow}
            />
          </div>
        )}
      </main>
    </div>
  );
};
