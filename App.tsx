import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Student, ColumnDefinition } from './types';
import { 
  Users, CheckCircle, Download, Printer, Search, Settings2, 
  Database, Trash2, ArrowRightLeft, CalendarDays, Loader2, 
  PlusCircle, LogOut, KeyRound, ShieldAlert, RefreshCw, Copy, 
  Check, CloudUpload, ExternalLink, FileText 
} from 'lucide-react';
import { StatCard } from './components/StatCard';
import { Modal } from './components/Modal';
import { BackupManager } from './components/BackupManager';
import { StudentTable } from './components/StudentTable';
import { ImportWizard } from './components/ImportWizard';
import { YearRolloverWizard } from './components/YearRolloverWizard';
import { ResetModal } from './components/ResetModal';
import { EditStudentModal } from './components/EditStudentModal';
import { ConvocationManager } from './components/ConvocationManager';
import { SessionManager } from './components/SessionManager';
import { PublicEnrollment } from './components/PublicEnrollment';
import { LoginScreen } from './components/LoginScreen';
import { TeacherLoginScreen } from './components/TeacherLoginScreen';
import { Dashboard } from './components/Dashboard';
import { CalendarView } from './components/CalendarView';
import { StaffManager } from './components/StaffManager';
import { importFromCSV } from './lib/importCsv';
import { 
  deleteMultipleStudents, updateMultipleStudents, addStudent, 
  getStudentsList, getAppSetting, saveAppSetting 
} from './lib/db';
import { TeacherPortal } from './components/TeacherPortal';
import { Footer } from './components/Footer';

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
  const [isOldOrInvalidTeacherLink, setIsOldOrInvalidTeacherLink] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string>('prof-2026-asrp');
  const [isCopiedTeacherLink, setIsCopiedTeacherLink] = useState(false);

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

  // Generate a random teacher token helper
  const generateNewToken = () => {
    return 'prof-' + Math.random().toString(36).substring(2, 8) + '-' + Date.now().toString(36).slice(-4);
  };

  // Load Settings from DB and evaluate public parameters
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getAppSetting('general');
        let currentToken = '';
        let currentPwd = 'ASRP2026';

        if (snap) {
          if (snap.teacherPassword) {
            currentPwd = snap.teacherPassword;
            setTeacherPassword(snap.teacherPassword);
          }
          if (snap.teacherToken) {
            currentToken = snap.teacherToken;
            setTeacherToken(snap.teacherToken);
          } else {
            currentToken = generateNewToken();
            await saveAppSetting('general', { ...snap, teacherToken: currentToken });
            setTeacherToken(currentToken);
          }
        } else {
          currentToken = generateNewToken();
          await saveAppSetting('general', { teacherPassword: currentPwd, teacherToken: currentToken });
          setTeacherToken(currentToken);
        }

        // Check URL parameters against active token
        const params = new URLSearchParams(window.location.search);
        const session = params.get('enroll');
        if (session) {
          setEnrollSessionId(session);
        }
        if (params.get('public') === 'calendar') {
          setIsPublicCalendar(true);
        }

        // Check teacher link
        const isOldTeacherParam = params.get('public') === 'teacher';
        const newTeacherToken = params.get('enseignant') || (params.get('public') === 'enseignant' ? params.get('token') : null);

        if (isOldTeacherParam) {
          // The old link `?public=teacher` is now explicitly obsolete
          setIsOldOrInvalidTeacherLink(true);
          setIsPublicTeacher(false);
          localStorage.removeItem('teacher_auth');
          localStorage.removeItem('teacher_token');
          setTeacherAuth(false);
        } else if (newTeacherToken) {
          if (newTeacherToken === currentToken) {
            setIsPublicTeacher(true);
            setIsOldOrInvalidTeacherLink(false);
            // Verify session token
            if (localStorage.getItem('teacher_token') !== currentToken) {
              localStorage.removeItem('teacher_auth');
              setTeacherAuth(false);
            }
          } else {
            // Provided token doesn't match active token (revoked / obsolete)
            setIsOldOrInvalidTeacherLink(true);
            setIsPublicTeacher(false);
          }
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    fetchSettings();
  }, []);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) return;
    try {
      const snap = await getAppSetting('general') || {};
      await saveAppSetting('general', { ...snap, teacherPassword: newPassword.trim() });
      setTeacherPassword(newPassword.trim());
      setIsPasswordModalOpen(false);
      setNewPassword('');
      alert("Le mot de passe enseignant a été mis à jour avec succès.");
    } catch (e) {
      alert("Erreur lors de la mise à jour du mot de passe.");
    }
  };

  const handleRegenerateTeacherToken = async () => {
    const confirmRegen = window.confirm(
      "Attention : Voulez-vous vraiment générer un nouveau lien d'accès enseignant ?\n\nLe lien actuel deviendra immédiatement OBSOLÈTE et l'ensemble des enseignants devra utiliser la nouvelle adresse."
    );
    if (!confirmRegen) return;

    const newToken = generateNewToken();
    try {
      const snap = await getAppSetting('general') || {};
      await saveAppSetting('general', { ...snap, teacherToken: newToken });
      setTeacherToken(newToken);
      localStorage.removeItem('teacher_auth');
      localStorage.removeItem('teacher_token');
      alert("Nouveau lien enseignant généré ! L'ancien lien est désormais obsolète.");
    } catch (e) {
      alert("Erreur lors de la génération du nouveau lien.");
    }
  };

  const getTeacherAccessUrl = () => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('enseignant', teacherToken);
    return url.toString();
  };
  
  // View State
  const [activeYear, setActiveYear] = useState<string>('2025-2026');
  
  const [currentTab, setCurrentTab] = useState<'eleves'|'convocations'|'dashboard'|'seances'|'calendrier'|'personnel'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [autoCreateConvocation, setAutoCreateConvocation] = useState(false);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals & Actions
  const [columns, setColumns] = useState<ColumnDefinition[]>(INITIAL_COLUMNS);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'csv'|'print'>('csv');
  const [isBackupManagerOpen, setIsBackupManagerOpen] = useState(false);
  
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMember, setNewMember] = useState<Partial<Student>>({});

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCopyingSql, setIsCopyingSql] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [syncSupabaseResult, setSyncSupabaseResult] = useState<{ success?: boolean; message?: string } | null>(null);
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

  const fetchStudents = useCallback(async () => {
    if (!isAuthenticated && !isPublicTeacher) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getStudentsList();
      data.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
      setStudents(data);
      if (data.length > 0) {
        const years = Array.from(new Set(data.map(s => s.schoolYear).filter(Boolean))).sort().reverse();
        if (years.length > 0 && !years.includes(activeYear)) {
          setActiveYear(years[0]);
        }
      }
    } catch (err) {
      console.error("Fetch students error:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isPublicTeacher, activeYear]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  

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
      await updateMultipleStudents([id], { opussChecked: checked });
      await fetchStudents();
    } catch (e) {
      console.error("Error updating OPUSS check", e);
    }
  };

  if (enrollSessionId) {
    return <PublicEnrollment sessionId={enrollSessionId} />;
  }
  
  if (isPublicCalendar) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <div className="max-w-7xl mx-auto w-full p-6 space-y-4">
          <CalendarView 
            students={[]}
            activeYear={activeYear}
            isPublic={true}
          />
        </div>
        <Footer />
      </div>
    );
  }

  if (isOldOrInvalidTeacherLink) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-amber-600 p-8 flex flex-col items-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Lien enseignant obsolète</h1>
            <p className="text-amber-100 text-sm mt-1">Accès sécurisé AS Rosa Parks</p>
          </div>
          <div className="p-8 space-y-4">
            <p className="text-slate-600 text-sm leading-relaxed">
              Ce lien d'accès à l'Espace Enseignant n'est plus actif. L'administrateur a remplacé ou régénéré le lien d'accès pour des raisons de sécurité.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 font-medium text-left flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Veuillez vous rapprocher du professeur référent ou de l'administrateur de l'AS pour obtenir le lien d'accès mis à jour.</span>
            </div>
            <button
              onClick={() => {
                window.location.href = window.location.pathname;
              }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors text-sm shadow-sm mt-2"
            >
              Retour à l'accueil
            </button>
          </div>
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
          localStorage.setItem('teacher_token', teacherToken);
          setTeacherAuth(true);
        }} 
      />;
    }
    return (
      <div className="min-h-screen bg-slate-50">
        <TeacherPortal 
          students={students.filter(s => s.schoolYear === activeYear)}
          activeYear={activeYear}
          onLogout={() => {
            localStorage.removeItem('teacher_auth');
            localStorage.removeItem('teacher_token');
            setTeacherAuth(false);
          }}
        />
      </div>
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
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold tracking-tight">AS Rosa Parks</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Supabase EU (RGPD)
                </span>
              </div>
              <p className="text-slate-400 font-medium mt-2">Plateforme de Gestion des Licenciés</p>
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
                        const url = getTeacherAccessUrl();
                        navigator.clipboard.writeText(url);
                        setIsCopiedTeacherLink(true);
                        setTimeout(() => setIsCopiedTeacherLink(false), 2500);
                        alert("Le nouveau lien de l'Espace Enseignant a été copié dans le presse-papiers :\n\n" + url);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors text-left mb-1"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-indigo-500" />
                        <span>Lien Espace Enseignant</span>
                      </div>
                      {isCopiedTeacherLink ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
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
                      Accès & Sécurité Enseignant
                    </button>
                    <button 
                      onClick={() => {
                        setIsSupabaseModalOpen(true);
                        setIsSettingsOpen(false);
                        setSyncSupabaseResult(null);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors text-left border border-emerald-200 mb-2"
                    >
                      <CloudUpload className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-semibold text-emerald-900">Transfert Supabase (RGPD)</div>
                        <div className="text-xs text-emerald-600 font-normal">414 élèves & séances prêts</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => {
                        setIsBackupManagerOpen(true);
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-colors text-left border-b border-slate-100 pb-3 mb-2"
                    >
                      <Database className="w-4 h-4 text-slate-500" />
                      Sauvegarde & Restauration
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
                    <button 
                      onClick={() => {
                        setIsResetModalOpen(true);
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors text-left mt-2 border-t border-slate-100 pt-3"
                    >
                      <Trash2 className="w-4 h-4" />
                      Réinitialiser les données
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-6 mt-8 flex gap-6 border-b border-slate-700 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setCurrentTab('dashboard')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 ${currentTab === 'dashboard' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Tableau de Bord
          </button>
          <button 
            onClick={() => setCurrentTab('eleves')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 ${currentTab === 'eleves' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Liste des Élèves
          </button>
          <button 
            onClick={() => setCurrentTab('personnel')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 ${currentTab === 'personnel' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Personnel de l'établissement
          </button>
          <button 
            onClick={() => setCurrentTab('convocations')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 ${currentTab === 'convocations' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Gestion des Convocations
          </button>
          <button 
            onClick={() => setCurrentTab('seances')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 ${currentTab === 'seances' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            Créneaux Hebdomadaires
          </button>
          <button 
            onClick={() => setCurrentTab('calendrier')}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap shrink-0 ${currentTab === 'calendrier' ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
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

        {currentTab === 'personnel' && (
          <StaffManager activeYear={activeYear} />
        )}
      </main>

      <Footer />

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

      <ResetModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
      />
      
      <BackupManager
        isOpen={isBackupManagerOpen}
        onClose={() => setIsBackupManagerOpen(false)}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Accès & Sécurité Enseignant</h2>
                  <p className="text-xs text-slate-500">Gestion du lien d'accès et du mot de passe</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Section 1: Lien d'accès */}
            <div className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Lien d'accès Enseignant actuel</label>
                <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Actif</span>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  readOnly
                  value={getTeacherAccessUrl()}
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-700 select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    const url = getTeacherAccessUrl();
                    navigator.clipboard.writeText(url);
                    setIsCopiedTeacherLink(true);
                    setTimeout(() => setIsCopiedTeacherLink(false), 2500);
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors shadow-sm"
                  title="Copier le lien"
                >
                  {isCopiedTeacherLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedTeacherLink ? "Copié !" : "Copier"}</span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 leading-tight">
                  Pour rendre le lien précédent obsolète et en créer un nouveau :
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateTeacherToken}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Régénérer le lien
                </button>
              </div>
            </div>

            {/* Section 2: Mot de passe */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Mot de passe de l'Espace Enseignant</label>
              <p className="text-xs text-slate-500">
                Protège l'accès une fois le lien ouvert. Modifiez-le ci-dessous si nécessaire.
              </p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  placeholder="Ex: ASRP2026"
                />
                <button 
                  onClick={handleUpdatePassword}
                  disabled={!newPassword.trim()}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0"
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>
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
                      await fetchStudents();
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

      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 md:p-8 my-auto max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CloudUpload className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">Transfert vers Supabase EU</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      RGPD Conforme
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Synchronisation des inscriptions, du calendrier et de la liste des élèves
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupabaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Résumé des données prêtes */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-900">414</div>
                  <div className="text-xs font-medium text-slate-500">Élèves licenciés</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-900">2</div>
                  <div className="text-xs font-medium text-slate-500">Séances calendrier</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-bold text-slate-900">3</div>
                  <div className="text-xs font-medium text-slate-500">Enseignants EPS</div>
                </div>
              </div>

              {/* Option 1 : Script SQL Tout-en-Un (Garanti) */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-bold">1</span>
                  Méthode Express : Import SQL Complet (30 secondes)
                </div>
                <p className="text-sm text-emerald-800 mb-4 leading-relaxed">
                  Ce script unique crée toutes les tables nécessaires dans votre base Supabase et injecte directement l'ensemble des <strong>414 élèves</strong>, séances et enseignants avec leurs autorisations et paiements.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <a
                    href="/api/migration/supabase-sql"
                    download="supabase-import-all.sql"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger supabase-import-all.sql
                  </a>

                  <button
                    onClick={async () => {
                      try {
                        setIsCopyingSql(true);
                        const res = await fetch('/api/migration/supabase-sql');
                        const text = await res.text();
                        await navigator.clipboard.writeText(text);
                        alert("Le script SQL complet (tables + 414 élèves) a été copié dans votre presse-papiers !");
                      } catch {
                        alert("Erreur lors de la copie.");
                      } finally {
                        setIsCopyingSql(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-100/50 text-emerald-800 border border-emerald-300 text-sm font-semibold rounded-lg transition-colors"
                  >
                    {isCopyingSql ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    Copier tout le SQL
                  </button>

                  <a
                    href="https://supabase.com/dashboard/project/jgzcznwurnqefcseougm/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors ml-auto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir Supabase SQL Editor
                  </a>
                </div>
              </div>

              {/* Option 2 : Synchronisation API en direct */}
              <div className="border border-slate-200 rounded-xl p-5">
                <div className="flex items-center gap-2 text-slate-900 font-semibold mb-1.5">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-white text-xs font-bold">2</span>
                  Synchronisation API directe
                </div>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Si les tables sont déjà créées dans votre Supabase, vous pouvez injecter les données directement via l'API.
                </p>

                <button
                  disabled={isSyncingSupabase}
                  onClick={async () => {
                    setIsSyncingSupabase(true);
                    setSyncSupabaseResult(null);
                    try {
                      const res = await fetch('/api/migration/sync-supabase', { method: 'POST' });
                      const data = await res.json();
                      if (data.success) {
                        setSyncSupabaseResult({ success: true, message: data.message });
                        await fetchStudents();
                      } else {
                        setSyncSupabaseResult({ success: false, message: data.error });
                      }
                    } catch (e: any) {
                      setSyncSupabaseResult({ success: false, message: e.message });
                    } finally {
                      setIsSyncingSupabase(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSyncingSupabase ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Synchronisation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 text-slate-600" />
                      Lancer la synchronisation API
                    </>
                  )}
                </button>

                {syncSupabaseResult && (
                  <div className={`mt-4 p-3.5 rounded-lg text-sm ${
                    syncSupabaseResult.success 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {syncSupabaseResult.message}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}