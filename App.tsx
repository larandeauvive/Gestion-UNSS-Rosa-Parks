import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Student, ColumnDefinition } from './types';
import { Users, CheckCircle, Download, Printer, Search, Settings2, Database, Trash2, ArrowRightLeft, CalendarDays, Loader2, PlusCircle } from 'lucide-react';
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';
import { StudentTable } from './components/StudentTable';
import { ImportWizard } from './components/ImportWizard';
import { YearRolloverWizard } from './components/YearRolloverWizard';
import { importFromCSV } from './lib/importCsv';
import { deleteMultipleStudents, updateMultipleStudents, addStudent } from './lib/db';

const INITIAL_COLUMNS: ColumnDefinition[] = [
  { key: 'lastName', label: 'Nom', visible: true },
  { key: 'firstName', label: 'Prénom', visible: true },
  { key: 'birthDate', label: 'Né(e) le', visible: true },
  { key: 'classGroup', label: 'Classe', visible: true },
  { key: 'schoolYear', label: 'Année', visible: true },
  { key: 'licenseNumber', label: 'N° Licence', visible: true },
  { key: 'paid', label: 'Payé', visible: true },
  { key: 'amount', label: 'Montant', visible: true },
  { key: 'paymentMethod', label: 'Paiement', visible: true },
  { key: 'parentalAuth', label: 'Auto. Parentale', visible: false },
  { key: 'imageRights', label: 'Droit Image', visible: false },
  { key: 'tshirt', label: 'T-shirt', visible: true },
  { key: 'size', label: 'Taille', visible: true },
];

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View State
  const [activeYear, setActiveYear] = useState<string>('2025-2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals & Actions
  const [columns, setColumns] = useState<ColumnDefinition[]>(INITIAL_COLUMNS);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'csv'|'print'>('csv');
  
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Data from Firebase
  useEffect(() => {
    const q = query(collection(db, 'students')); // Maybe order in memory to allow full text search across years
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Student[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as Student);
      });
      // Sort alphabetically by Last Name
      data.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
      setStudents(data);
      setLoading(false);
      
      // Auto-update active year if none and data exists
      if (data.length > 0) {
        const years = Array.from(new Set(data.map(s => s.schoolYear).filter(Boolean))).sort().reverse();
        if (years.length > 0 && !years.includes(activeYear)) {
          setActiveYear(years[0]);
        }
      }
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter Logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Must match active year unless user clears it (we can enforce it always matches)
      const matchesYear = student.schoolYear === activeYear;
      
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        (student.lastName || '').toLowerCase().includes(searchLower) ||
        (student.firstName || '').toLowerCase().includes(searchLower);
      
      const matchesClass = classFilter === '' || student.classGroup === classFilter;
      
      return matchesYear && matchesSearch && matchesClass;
    });
  }, [students, searchTerm, classFilter, activeYear]);

  // Derived
  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.filter(s => s.schoolYear === activeYear).map(s => s.classGroup).filter(Boolean));
    return Array.from(classes).sort();
  }, [students, activeYear]);
  
  const allYears = useMemo(() => {
    const years = new Set(students.map(s => s.schoolYear).filter(Boolean));
    years.add('2023-2024'); // Ensure default exists
    years.add('2024-2025');
    years.add('2025-2026');
    years.add('2026-2027');
    return Array.from(years).sort().reverse();
  }, [students]);

  // Handlers
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

  const handleImport = async () => {
    setIsImportModalOpen(true);
  };

  const executeExport = (selectedColumnKeys: string[]) => {
    const dataToProcess = students.filter(s => selectedIds.has(s.id));
    const activeColumns = columns.filter(c => selectedColumnKeys.includes(c.key as string));

    if (exportType === 'csv') {
      const headers = activeColumns.map(c => c.label);
      const rows = dataToProcess.map(s => activeColumns.map(c => s[c.key as string] || ''));
      const csvContent = "\uFEFF" + [
        headers.join(';'),
        ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `export_${activeYear}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (exportType === 'print') {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>Impression Licenciés</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h1 { text-align: center; margin-bottom: 5px; }
            h2 { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style></head><body>
          <h1>Liste des Licenciés - AS Rosa Parks</h1>
          <h2>Année Scolaire : ${activeYear}</h2>
          <table><thead><tr>${activeColumns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead><tbody>
        `);
        dataToProcess.forEach(s => {
          printWindow.document.write('<tr>');
          activeColumns.forEach(c => {
            printWindow.document.write(`<td>${s[c.key as string] || ''}</td>`);
          });
          printWindow.document.write('</tr>');
        });
        printWindow.document.write('</tbody></table></body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
    setIsExportModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">Chargement de la base de données...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-slate-900 text-white pt-8 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">AS Rosa Parks</h1>
              <p className="text-slate-400 mt-2 font-medium">Plateforme Cloud de Gestion des Licenciés</p>
            </div>
            
            <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700 relative" ref={settingsRef}>
              <CalendarDays className="w-5 h-5 text-slate-400 ml-2" />
              <select 
                className="bg-transparent text-white font-semibold py-1 pr-4 pl-1 outline-none appearance-none cursor-pointer"
                value={activeYear}
                onChange={(e) => {
                  setActiveYear(e.target.value);
                  setSelectedIds(new Set());
                }}
              >
                {allYears.map(year => (
                  <option key={year} value={year} className="text-slate-900">{year}</option>
                ))}
              </select>

              <div className="h-5 w-px bg-slate-700 mx-1"></div>

              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors focus:outline-none"
              >
                 <Settings2 className="w-4 h-4" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    disabled={selectedIds.size === 0}
                    onClick={() => {
                      setIsRolloverOpen(true);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                    Transition classe supérieure
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 -mt-20 space-y-6">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard 
            title="Total Inscrits" 
            value={students.filter(s => s.schoolYear === activeYear).length} 
            icon={<Users className="w-6 h-6 text-slate-900" />}
            colorClass="bg-white text-slate-900 border-slate-200"
          />
          <StatCard 
            title="Cotisations Validées" 
            value={students.filter(s => s.schoolYear === activeYear && String(s.paid).toUpperCase() === 'OUI').length} 
            icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
            colorClass="bg-white text-emerald-600 border-slate-200"
          />
          <StatCard 
            title="Résultats de Recherche" 
            value={filteredStudents.length} 
            icon={<Search className="w-6 h-6 text-indigo-600" />}
            colorClass="bg-white text-indigo-600 border-slate-200"
          />
          
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center items-center gap-2">
             <button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg font-medium transition-colors border border-slate-300 disabled:opacity-50"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Assistant d'Importation
              </button>
             <p className="text-xs text-slate-400 text-center">Ajouter ou croiser des données CSV</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Chercher un nom..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-colors"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <select 
              className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Toutes les classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <div className="text-sm font-medium text-slate-500 mr-2">
               {selectedIds.size} sélectionné(s)
            </div>
            
            <button 
              disabled={selectedIds.size === 0}
              onClick={() => { setExportType('csv'); setIsExportModalOpen(true); }}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <button 
              disabled={selectedIds.size === 0}
              onClick={() => { setExportType('print'); setIsExportModalOpen(true); }}
              className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
        </div>

        {/* Data Table */}
        <StudentTable 
          students={filteredStudents}
          columns={columns}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
        />
        
        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 pb-8">
           <span>Affichage de {filteredStudents.length} élèves / Total de l'année : {students.filter(s => s.schoolYear === activeYear).length}</span>
           <span>Base de données synchronisée</span>
        </div>

      </main>

      {/* Modals */}
      <ImportWizard 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeYear={activeYear}
        students={students}
        onSuccess={() => {
          // Success handled in the component (alerts or just closes)
        }}
      />

      <Modal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={executeExport}
        title={exportType === 'csv' ? "Configuration de l'Export CSV" : "Configuration de l'Impression"}
        columns={columns}
      />
      
      <YearRolloverWizard 
        isOpen={isRolloverOpen}
        onClose={() => setIsRolloverOpen(false)}
        students={students.filter(s => selectedIds.has(s.id))}
        onComplete={() => {
          setSelectedIds(new Set());
          setIsRolloverOpen(false);
        }}
      />
    </div>
  );
}