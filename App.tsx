import React, { useEffect, useState, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { Student, ColumnDefinition } from './types';
import { Users, CheckCircle, Download, Printer, Search, Settings2, Database, Trash2, ArrowRightLeft, CalendarDays, Loader2, PlusCircle, LogOut, KeyRound } from 'lucide-react';
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';
import { StudentTable } from './components/StudentTable';
import { ImportWizard } from './components/ImportWizard';
import { YearRolloverWizard } from './components/YearRolloverWizard';
import { EditStudentModal } from './components/EditStudentModal';
import { ConvocationManager } from './components/ConvocationManager';
import { SessionManager } from './components/SessionManager';
import { PublicEnrollment } from './components/PublicEnrollment';
import { LoginScreen } from './components/LoginScreen';
import { TeacherLoginScreen } from './components/TeacherLoginScreen';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { importFromCSV } from './lib/importCsv';
import { deleteMultipleStudents, updateMultipleStudents, addStudent } from './lib/db';
import { TeacherPortal } from './components/TeacherPortal';

const INITIAL_COLUMNS: ColumnDefinition[] = [
  { key: 'lastName', label: 'Nom', visible: true },
  { key: 'firstName', label: 'Prénom', visible: true },
  { key: 'birthDate', label: 'Né(e) le', visible: true },
  { key: 'classGroup', label: 'Classe', visible: true },
  { key: 'schoolYear', label: 'Année', visible: true },
  { key: 'gender', label: 'Sexe', visible: true },
  { key: 'licenseNumber', label: 'N° Licence', visible: true },
  { key: 'paid', label: 'Payé', visible: true },
  { key: 'amount', label: 'Montant', visible: true },
  { key: 'paymentMethod', label: 'Paiement', visible: true },
  { key: 'checkNumber', label: 'N° Chèque', visible: false },
  { key: 'swimmingCertificate', label: 'Savoir Nager', visible: false },
  { key: 'parentalAuth', label: 'Auto. Parentale', visible: false },
  { key: 'imageRights', label: 'Droit Image', visible: false },
  { key: 'opussChecked', label: 'Ajout OPUSS', visible: true },
  { key: 'tshirt', label: 'Maillot', visible: true },
  { key: 'size', label: 'Taille Maillot', visible: true },
];

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Public Route state
  const [enrollSessionId, setEnrollSessionId] = useState<string | null>(null);
  const [isPublicCalendar, setIsPublicCalendar] = useState(false);
  const [isPublicTeacher, setIsPublicTeacher] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('as_auth') === 'true';
  });
  const isAdmin = isAuthenticated;

  const [teacherAuth, setTeacherAuth] = useState(() => {
    return localStorage.getItem('teacher_auth') === 'true';
  });
  const [teacherPassword, setTeacherPassword] = useState('ASRP2026');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTeacherPassword(docSnap.data().teacherPassword || 'ASRP2026');
        } else {
          await setDoc(docRef, { teacherPassword: 'ASRP2026' });
        }
      } catch(e) {
        // ignore for now
      }
    };
    fetchSettings();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) return;
    try {
      await updateDoc(doc(db, 'settings', 'general'), { teacherPassword: newPassword.trim() });
      setTeacherPassword(newPassword.trim());
      setIsPasswordModalOpen(false);
      setNewPassword('');
    } catch (e) {
      alert("Erreur lors de la mise à jour du mot de passe.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('enroll');
    if (session) {
      setEnrollSessionId(session);
    }
    if (params.get('public') === 'calendar') {
      setIsPublicCalendar(true);
    }
    if (params.get('public') === 'teacher') {
      setIsPublicTeacher(true);
    }
  }, []);
  
  // View State
  const [activeYear, setActiveYear] = useState<string>('2025-2026');
  const [currentTab, setCurrentTab] = useState<'eleves'|'convocations'|'dashboard'|'seances'|'calendrier'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [autoCreateConvocation, setAutoCreateConvocation] = useState(false);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals & Actions
  const [columns, setColumns] = useState<ColumnDefinition[]>(INITIAL_COLUMNS);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'csv'|'print'>('csv');
  
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Student>>({});

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
    if (!isAuthenticated) return;
    
    setLoading(true);
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
  }, [isAuthenticated, activeYear]);

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

  const handleOpussCheck = async (id: string, checked: boolean) => {
    try {
      const docRef = doc(db, 'students', id);
      await updateDoc(docRef, { opussChecked: checked });
    } catch (e) {
      console.error("Error updating OPUSS check", e);
    }
  };

  if (enrollSessionId) {
    return <PublicEnrollment sessionId={enrollSessionId} />;
  }
  
  if (isPublicCalendar) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <CalendarView 
            students={students.filter(s => s.schoolYear === activeYear)}
            activeYear={activeYear}
            isPublic={true}
          />
        </div>
      </div>
    );
  }

  if (isPublicTeacher) {
    if (!teacherAuth && !isAdmin) {
      return <TeacherLoginScreen 
        correctPassword={teacherPassword}
        onLogin={() => {
          localStorage.setItem('teacher_auth', 'true');
          setTeacherAuth(true);
        }} 
      />;
    }
    return (
      <TeacherPortal 
        students={students.filter(s => s.schoolYear === activeYear)}
        activeYear={activeYear}
      />
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => {
      localStorage.setItem('as_auth', 'true');
      setIsAuthenticated(true);
    }} />;
  }

  const handleImport = async () => {
    setIsImportModalOpen(true);
  };

  const exportFiltered = (filterType: 'valid' | 'incomplete') => {
    let ids: string[] = [];
    if (filterType === 'valid') {
       ids = filteredStudents
         .filter(s => s.licenseNumber && String(s.paid).toUpperCase() === 'OUI' && String(s.parentalAuth).toUpperCase() === 'OUI')
         .map(s => s.id);
    } else {
       ids = filteredStudents
         .filter(s => {
            const isPaid = String(s.paid).toUpperCase() === 'OUI';
            const isAuth = String(s.parentalAuth).toUpperCase() === 'OUI';
            const isValid = !!s.licenseNumber && isPaid && isAuth;
            return (isPaid || isAuth) && !isValid;
         })
         .map(s => s.id);
    }
    
    if (ids.length === 0) {
      alert("Aucun élève ne correspond à ce filtre.");
      return;
    }
    
    setSelectedIds(new Set(ids));
    setExportType('csv');
    setIsExportModalOpen(true);
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
            
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
              <div className="text-right sm:mr-2">
                <div className="text-sm font-medium text-white">Administrateur</div>
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
                  title="Paramètres"
                >
                   <Settings2 className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => {
                    localStorage.removeItem('as_auth');
                    setIsAuthenticated(false);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700 transition-colors focus:outline-none"
                  title="Déconnexion"
                >
                   <LogOut className="w-4 h-4" />
                </button>

                {isSettingsOpen && isAdmin && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('public', 'teacher');
                        navigator.clipboard.writeText(url.toString());
                        alert("Le lien de l'espace enseignant a été copié dans le presse-papiers.");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors text-left mb-1"
                    >
                      <Users className="w-4 h-4 text-indigo-500" />
                      Lien Espace Enseignant
                    </button>
                    <button 
                      onClick={() => {
                        setNewPassword(teacherPassword);
                        setIsPasswordModalOpen(true);
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors text-left border-b border-slate-100 pb-3 mb-2"
                    >
                      <KeyRound className="w-4 h-4 text-slate-500" />
                      Mot de passe enseignant
                    </button>
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
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 mt-8 flex gap-6 border-b border-slate-700">
          <button 
            onClick={() => setCurrentTab('dashboard')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${currentTab === 'dashboard' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Tableau de Bord
          </button>
          <button 
            onClick={() => setCurrentTab('eleves')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${currentTab === 'eleves' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Liste des Élèves
          </button>
          <button 
            onClick={() => setCurrentTab('convocations')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${currentTab === 'convocations' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Gestion des Convocations
          </button>
          <button 
            onClick={() => setCurrentTab('seances')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${currentTab === 'seances' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Créneaux Hebdomadaires
          </button>
          <button 
            onClick={() => setCurrentTab('calendrier')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${currentTab === 'calendrier' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Calendrier
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 -mt-10 space-y-6">
        
        {currentTab === 'eleves' && (
          <>
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
              
              {isAdmin ? (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center items-stretch gap-2">
                   <button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="flex justify-center items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg font-medium transition-colors border border-slate-300 disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                      Importer (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setNewMember({ isAdult: true, schoolYear: activeYear, paid: 'NON', parentalAuth: 'NON', imageRights: 'NON', swimmingCertificate: 'NON' });
                        setIsAddMemberModalOpen(true);
                      }}
                      className="flex justify-center items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 px-3 rounded-lg font-medium transition-colors border border-indigo-200"
                    >
                      <Users className="w-4 h-4" />
                      Ajouter un membre
                    </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex flex-col justify-center items-center gap-2">
                   <p className="text-sm font-medium text-slate-500 text-center">Mode consultation</p>
                   <p className="text-xs text-slate-400 text-center">Contactez l'administrateur pour ajouter des licences.</p>
                </div>
              )}
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

                <div className="flex gap-2 mr-2 border-r border-slate-200 pr-4">
                  <button 
                    onClick={() => exportFiltered('valid')}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 transition shadow-sm font-medium text-xs sm:text-sm"
                  >
                    Valides (CSV)
                  </button>
                  <button 
                    onClick={() => exportFiltered('incomplete')}
                    className="flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-100 transition shadow-sm font-medium text-xs sm:text-sm"
                  >
                    Incomplètes (CSV)
                  </button>
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
              onRowClick={isAdmin ? (student) => setEditStudent(student) : undefined}
              onOpussCheck={isAdmin ? handleOpussCheck : undefined}
            />
            
            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 pb-8">
               <span>Affichage de {filteredStudents.length} élèves / Total de l'année : {students.filter(s => s.schoolYear === activeYear).length}</span>
               <span>Base de données synchronisée</span>
            </div>
          </>
        )}

        {currentTab === 'convocations' && (
          <ConvocationManager 
            students={students.filter(s => s.schoolYear === activeYear)} 
            activeYear={activeYear} 
            autoCreateNew={autoCreateConvocation}
            onAutoCreateConsumed={() => setAutoCreateConvocation(false)}
          />
        )}

        {currentTab === 'dashboard' && (
          <Dashboard 
            students={students} 
            activeYear={activeYear} 
            onNewConvocation={() => {
              setCurrentTab('convocations');
              setAutoCreateConvocation(true);
            }}
          />
        )}

        {currentTab === 'seances' && (
          <SessionManager 
            students={students.filter(s => s.schoolYear === activeYear)}
            activeYear={activeYear}
          />
        )}

        {currentTab === 'calendrier' && (
          <CalendarView 
            students={students.filter(s => s.schoolYear === activeYear)}
            activeYear={activeYear}
          />
        )}
      </main>

      {/* Modals */}
      <EditStudentModal
        isOpen={!!editStudent}
        student={editStudent}
        onClose={() => setEditStudent(null)}
        onSuccess={() => setEditStudent(null)}
      />

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

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Modifier le mot de passe enseignant</h2>
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Ce mot de passe permet de protéger l'accès à l'Espace Enseignant. Partagez-le avec vos collègues avec le lien.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nouveau mot de passe</label>
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: ASRP2026"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button 
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={!newPassword.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Ajouter un membre</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="isAdult" 
                  checked={newMember.isAdult || false} 
                  onChange={e => setNewMember({...newMember, isAdult: e.target.checked, classGroup: e.target.checked ? 'Adulte' : ''})} 
                />
                <label htmlFor="isAdult" className="text-sm font-medium text-slate-700">Ce membre est un adulte / encadrant</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Prénom</label>
                  <input type="text" value={newMember.firstName || ''} onChange={e => setNewMember({...newMember, firstName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nom</label>
                  <input type="text" value={newMember.lastName || ''} onChange={e => setNewMember({...newMember, lastName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Classe</label>
                  <input type="text" value={newMember.classGroup || ''} onChange={e => setNewMember({...newMember, classGroup: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: 6A, Adulte..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Date de naissance</label>
                  <input type="text" value={newMember.birthDate || ''} onChange={e => setNewMember({...newMember, birthDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="JJ/MM/AAAA" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setIsAddMemberModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200">Annuler</button>
                <button 
                  onClick={async () => {
                    if (!newMember.firstName || !newMember.lastName) return alert("Le nom et le prénom sont requis.");
                    try {
                      await addStudent(newMember as any);
                      setIsAddMemberModalOpen(false);
                      setNewMember({});
                    } catch (e) {
                      alert("Erreur lors de l'ajout.");
                    }
                  }} 
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}