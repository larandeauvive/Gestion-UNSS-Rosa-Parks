import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, UserX, Clock, Calendar, CheckCircle2, XCircle, AlertCircle, 
  Search, Filter, Plus, Edit2, Trash2, Printer, Download, Moon, 
  Activity, Check, X, ShieldCheck, Dumbbell, FileText, ChevronRight, 
  CheckSquare, Square, RefreshCw, BarChart2, CalendarDays
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, setDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StaffMember, EveningSlot, StaffAttendanceRecord } from '../types';

interface Props {
  activeYear: string;
}

const DEFAULT_SLOTS: Omit<EveningSlot, 'id'>[] = [
  {
    name: 'Badminton & Sports de Raquette',
    dayOfWeek: 'Lundi',
    startTime: '17:30',
    endTime: '19:00',
    location: 'Gymnase Rosa Parks',
    description: 'Pratique libre et matchs en double / simple pour les personnels.',
    coachOrSupervisor: 'Enseignants EPS',
    schoolYear: '2025-2026',
    active: true
  },
  {
    name: 'Musculation & Préparation Physique',
    dayOfWeek: 'Mardi',
    startTime: '18:00',
    endTime: '19:30',
    location: 'Salle de Musculation du Lycée',
    description: 'Renforcement musculaire, cardio-training, circuit forme encadré.',
    coachOrSupervisor: 'Enseignants EPS',
    schoolYear: '2025-2026',
    active: true
  },
  {
    name: 'Volley-Ball & Sports Collectifs',
    dayOfWeek: 'Jeudi',
    startTime: '17:30',
    endTime: '19:00',
    location: 'Gymnase Rosa Parks',
    description: 'Détente, tournois amicaux et jeux collectifs entre collègues.',
    coachOrSupervisor: 'Enseignants EPS',
    schoolYear: '2025-2026',
    active: true
  }
];

const ROLES = [
  'Enseignant',
  'AED / Vie scolaire',
  'Agent technique / Entretien',
  'Administration / Direction',
  'Médico-social (Infirmier, PsyEN...)',
  'Autre personnel'
];

export const StaffManager: React.FC<Props> = ({ activeYear }) => {
  // Navigation interne
  const [subTab, setSubTab] = useState<'members' | 'attendance' | 'slots'>('members');

  // Données Firestore
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [slots, setSlots] = useState<EveningSlot[]>([]);
  const [attendances, setAttendances] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres & Recherche de la liste des membres
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'uptodate' | 'pending' | 'unpaid'>('all');
  const [slotFilter, setSlotFilter] = useState('');

  // Modale Membre (Ajout / Édition)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [memberForm, setMemberForm] = useState<Omit<StaffMember, 'id'>>({
    firstName: '',
    lastName: '',
    role: 'Enseignant',
    discipline: '',
    email: '',
    phone: '',
    schoolYear: activeYear,
    isLicenseUpToDate: false,
    licenseNumber: '',
    paid: false,
    paymentAmount: 25,
    paymentMethod: 'Chèque',
    medicalCertOrQuiz: false,
    parentalOrPersonalAuth: true,
    eveningSlotIds: [],
    notes: ''
  });

  // Modale Créneau (Ajout / Édition)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<EveningSlot | null>(null);
  const [slotForm, setSlotForm] = useState<Omit<EveningSlot, 'id'>>({
    name: '',
    dayOfWeek: 'Lundi',
    startTime: '17:30',
    endTime: '19:00',
    location: 'Gymnase Rosa Parks',
    description: '',
    coachOrSupervisor: 'Enseignants EPS',
    schoolYear: activeYear,
    active: true
  });

  // Gestion du Pointage (SubTab Attendance)
  const [selectedSlotIdForAttendance, setSelectedSlotIdForAttendance] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [currentAttendanceRecord, setCurrentAttendanceRecord] = useState<StaffAttendanceRecord | null>(null);
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [attendanceSaving, setAttendanceSaving] = useState(false);

  // Écoute temps réel des membres du personnel
  useEffect(() => {
    const q = query(
      collection(db, 'staff_members'),
      where('schoolYear', '==', activeYear)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: StaffMember[] = [];
      snapshot.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as StaffMember);
      });
      // Tri alphabétique par Nom
      docs.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
      setStaffMembers(docs);
      setLoading(false);
    }, (err) => {
      console.warn("Erreur chargement personnel:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [activeYear]);

  // Écoute temps réel des créneaux du soir
  useEffect(() => {
    const q = query(
      collection(db, 'evening_slots'),
      where('schoolYear', '==', activeYear)
    );
    const unsub = onSnapshot(q, async (snapshot) => {
      const docs: EveningSlot[] = [];
      snapshot.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as EveningSlot);
      });

      // Si aucun créneau n'existe encore pour l'année, initialiser les 3 créneaux standards
      if (docs.length === 0 && !snapshot.metadata.fromCache) {
        for (const defaultSlot of DEFAULT_SLOTS) {
          try {
            await addDoc(collection(db, 'evening_slots'), {
              ...defaultSlot,
              schoolYear: activeYear
            });
          } catch (e) {
            console.error("Erreur init slot:", e);
          }
        }
      } else {
        setSlots(docs);
        if (!selectedSlotIdForAttendance && docs.length > 0) {
          setSelectedSlotIdForAttendance(docs[0].id);
        }
      }
    }, (err) => {
      console.warn("Erreur chargement créneaux du soir:", err);
    });
    return () => unsub();
  }, [activeYear]);

  // Écoute temps réel des pointages / présences
  useEffect(() => {
    const q = query(
      collection(db, 'staff_attendance'),
      where('schoolYear', '==', activeYear)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const docs: StaffAttendanceRecord[] = [];
      snapshot.forEach(d => {
        docs.push({ id: d.id, ...d.data() } as StaffAttendanceRecord);
      });
      docs.sort((a, b) => b.date.localeCompare(a.date));
      setAttendances(docs);
    }, (err) => {
      console.warn("Erreur chargement pointages:", err);
    });
    return () => unsub();
  }, [activeYear]);

  // Synchronisation du pointage sélectionné en fonction du créneau et de la date
  useEffect(() => {
    if (!selectedSlotIdForAttendance || !attendanceDate) {
      setCurrentAttendanceRecord(null);
      setPresentIds(new Set());
      setAttendanceNotes('');
      return;
    }

    const found = attendances.find(
      a => a.slotId === selectedSlotIdForAttendance && a.date === attendanceDate
    );

    if (found) {
      setCurrentAttendanceRecord(found);
      setPresentIds(new Set(found.presentStaffIds || []));
      setAttendanceNotes(found.notes || '');
    } else {
      setCurrentAttendanceRecord(null);
      // Par défaut pour une nouvelle séance : on peut pré-cocher ceux qui sont inscrits au créneau
      setPresentIds(new Set());
      setAttendanceNotes('');
    }
  }, [selectedSlotIdForAttendance, attendanceDate, attendances]);

  // Calcul des statistiques de fréquentation globale et individuelle
  const staffAttendanceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    attendances.forEach(att => {
      (att.presentStaffIds || []).forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [attendances]);

  // Total des séances passées pointées
  const totalSessionsCount = attendances.length;

  // Filtrage des personnels pour la liste principale
  const filteredStaff = useMemo(() => {
    return staffMembers.filter(m => {
      // 1. Recherche texte
      const q = searchTerm.toLowerCase();
      const matchText = (m.firstName || '').toLowerCase().includes(q) ||
                        (m.lastName || '').toLowerCase().includes(q) ||
                        (m.discipline || '').toLowerCase().includes(q) ||
                        (m.role || '').toLowerCase().includes(q) ||
                        (m.licenseNumber || '').toLowerCase().includes(q);

      if (!matchText) return false;

      // 2. Filtre Rôle
      if (roleFilter && m.role !== roleFilter) return false;

      // 3. Filtre Licence
      if (licenseFilter === 'uptodate' && !m.isLicenseUpToDate) return false;
      if (licenseFilter === 'pending' && m.isLicenseUpToDate) return false;
      if (licenseFilter === 'unpaid' && m.paid) return false;

      // 4. Filtre Créneau
      if (slotFilter && !(m.eveningSlotIds || []).includes(slotFilter)) return false;

      return true;
    });
  }, [staffMembers, searchTerm, roleFilter, licenseFilter, slotFilter]);

  // Statistiques rapides
  const stats = useMemo(() => {
    const total = staffMembers.length;
    const upToDate = staffMembers.filter(m => m.isLicenseUpToDate).length;
    const paidCount = staffMembers.filter(m => m.paid).length;
    const enrolledInEvening = staffMembers.filter(m => (m.eveningSlotIds || []).length > 0).length;
    return {
      total,
      upToDate,
      upToDatePct: total > 0 ? Math.round((upToDate / total) * 100) : 0,
      paidCount,
      enrolledInEvening
    };
  }, [staffMembers]);

  // Actions Membre
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberForm({
      firstName: '',
      lastName: '',
      role: 'Enseignant',
      discipline: '',
      email: '',
      phone: '',
      schoolYear: activeYear,
      isLicenseUpToDate: false,
      licenseNumber: '',
      paid: false,
      paymentAmount: 25,
      paymentMethod: 'Chèque',
      medicalCertOrQuiz: false,
      parentalOrPersonalAuth: true,
      eveningSlotIds: slots.map(s => s.id), // Inscrire à tous par défaut ou non
      notes: ''
    });
    setIsMemberModalOpen(true);
  };

  const handleEditMember = (m: StaffMember) => {
    setEditingMember(m);
    setMemberForm({
      firstName: m.firstName || '',
      lastName: m.lastName || '',
      role: m.role || 'Enseignant',
      discipline: m.discipline || '',
      email: m.email || '',
      phone: m.phone || '',
      schoolYear: m.schoolYear || activeYear,
      isLicenseUpToDate: !!m.isLicenseUpToDate,
      licenseNumber: m.licenseNumber || '',
      paid: !!m.paid,
      paymentAmount: m.paymentAmount ?? 25,
      paymentMethod: m.paymentMethod || 'Chèque',
      medicalCertOrQuiz: !!m.medicalCertOrQuiz,
      parentalOrPersonalAuth: !!m.parentalOrPersonalAuth,
      eveningSlotIds: m.eveningSlotIds || [],
      notes: m.notes || ''
    });
    setIsMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.lastName.trim() || !memberForm.firstName.trim()) {
      alert("Veuillez renseigner le nom et le prénom.");
      return;
    }

    try {
      const dataToSave = {
        ...memberForm,
        lastName: memberForm.lastName.trim().toUpperCase(),
        firstName: memberForm.firstName.trim(),
        schoolYear: activeYear,
        updatedAt: new Date().toISOString()
      };

      if (editingMember) {
        await updateDoc(doc(db, 'staff_members', editingMember.id), dataToSave);
      } else {
        await addDoc(collection(db, 'staff_members'), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
      }
      setIsMemberModalOpen(false);
    } catch (err) {
      console.error("Erreur sauvegarde membre:", err);
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const handleDeleteMember = async (m: StaffMember) => {
    if (!window.confirm(`Supprimer ${m.firstName} ${m.lastName} de la liste du personnel ?`)) return;
    try {
      await deleteDoc(doc(db, 'staff_members', m.id));
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Impossible de supprimer ce membre.");
    }
  };

  const handleToggleLicense = async (m: StaffMember) => {
    try {
      const nextState = !m.isLicenseUpToDate;
      await updateDoc(doc(db, 'staff_members', m.id), {
        isLicenseUpToDate: nextState,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Erreur bascule licence:", err);
    }
  };

  const handleTogglePaid = async (m: StaffMember) => {
    try {
      const nextState = !m.paid;
      await updateDoc(doc(db, 'staff_members', m.id), {
        paid: nextState,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Erreur bascule paiement:", err);
    }
  };

  // Actions Créneaux
  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setSlotForm({
      name: '',
      dayOfWeek: 'Lundi',
      startTime: '17:30',
      endTime: '19:00',
      location: 'Gymnase Rosa Parks',
      description: '',
      coachOrSupervisor: 'Enseignants EPS',
      schoolYear: activeYear,
      active: true
    });
    setIsSlotModalOpen(true);
  };

  const handleEditSlot = (s: EveningSlot) => {
    setEditingSlot(s);
    setSlotForm({
      name: s.name,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      description: s.description || '',
      coachOrSupervisor: s.coachOrSupervisor || '',
      schoolYear: s.schoolYear || activeYear,
      active: s.active ?? true
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.name.trim()) return;

    try {
      if (editingSlot) {
        await updateDoc(doc(db, 'evening_slots', editingSlot.id), slotForm);
      } else {
        await addDoc(collection(db, 'evening_slots'), slotForm);
      }
      setIsSlotModalOpen(false);
    } catch (err) {
      console.error("Erreur créneau:", err);
      alert("Erreur lors de l'enregistrement du créneau.");
    }
  };

  const handleDeleteSlot = async (s: EveningSlot) => {
    if (!window.confirm(`Supprimer le créneau "${s.name}" ?`)) return;
    try {
      await deleteDoc(doc(db, 'evening_slots', s.id));
    } catch (err) {
      console.error("Erreur suppression créneau:", err);
    }
  };

  // Actions Pointage Présence
  const toggleAttendancePresence = (staffId: string) => {
    const next = new Set(presentIds);
    if (next.has(staffId)) {
      next.delete(staffId);
    } else {
      next.add(staffId);
    }
    setPresentIds(next);
  };

  const markAllEnrolledPresent = () => {
    const enrolledIds = staffMembers
      .filter(m => (m.eveningSlotIds || []).includes(selectedSlotIdForAttendance))
      .map(m => m.id);
    setPresentIds(new Set(enrolledIds));
  };

  const clearAllPresent = () => {
    setPresentIds(new Set());
  };

  const handleSaveAttendance = async () => {
    if (!selectedSlotIdForAttendance || !attendanceDate) return;
    setAttendanceSaving(true);

    const slot = slots.find(s => s.id === selectedSlotIdForAttendance);
    const slotName = slot ? `${slot.name} (${slot.dayOfWeek} ${slot.startTime}-${slot.endTime})` : 'Créneau du soir';

    const payload: Omit<StaffAttendanceRecord, 'id'> = {
      date: attendanceDate,
      slotId: selectedSlotIdForAttendance,
      slotName,
      schoolYear: activeYear,
      presentStaffIds: Array.from(presentIds),
      notes: attendanceNotes.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      if (currentAttendanceRecord) {
        await updateDoc(doc(db, 'staff_attendance', currentAttendanceRecord.id), payload);
      } else {
        await addDoc(collection(db, 'staff_attendance'), payload);
      }
      alert("Pointage des présences enregistré avec succès !");
    } catch (err) {
      console.error("Erreur pointage:", err);
      alert("Impossible d'enregistrer le pointage.");
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Impression de la liste ou feuille d'émargement
  const handlePrintMembers = () => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Personnel de l'Établissement - AS Lycée Rosa Parks</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 15px; }
          h1 { margin: 0 0 4px 0; font-size: 16px; color: #1e1b4b; text-transform: uppercase; }
          .sub { color: #64748b; font-size: 11px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; font-size: 10px; text-transform: uppercase; }
          .badge-ok { background: #dcfce7; color: #166534; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
          .badge-no { background: #fee2e2; color: #991b1b; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>Association Sportive — Personnel de l'Établissement (${activeYear})</h1>
        <div class="sub">Lycée Rosa Parks Rostrenen • Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
        <table>
          <thead>
            <tr>
              <th>Nom & Prénom</th>
              <th>Fonction / Discipline</th>
              <th>Licence UNSS</th>
              <th>N° Licence</th>
              <th>Cotisation</th>
              <th>Créneaux du Soir Inscrits</th>
              <th>Fréquentation</th>
            </tr>
          </thead>
          <tbody>
            ${filteredStaff.map(m => {
              const enrolledSlotNames = slots
                .filter(s => (m.eveningSlotIds || []).includes(s.id))
                .map(s => `${s.dayOfWeek} (${s.name})`)
                .join(', ') || 'Aucun';
              const presenceCount = staffAttendanceCounts[m.id] || 0;
              return `
                <tr>
                  <td><strong>${m.lastName}</strong> ${m.firstName}</td>
                  <td>${m.role} ${m.discipline ? `(${m.discipline})` : ''}</td>
                  <td><span class="${m.isLicenseUpToDate ? 'badge-ok' : 'badge-no'}">${m.isLicenseUpToDate ? 'À JOUR' : 'EN ATTENTE'}</span></td>
                  <td>${m.licenseNumber || '-'}</td>
                  <td>${m.paid ? 'RÉGLÉE' : 'NON PAYÉE'}</td>
                  <td>${enrolledSlotNames}</td>
                  <td><strong>${presenceCount}</strong> présence(s)</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nom', 'Prénom', 'Rôle / Fonction', 'Discipline', 'Email', 'Téléphone',
      'Licence à jour', 'Numéro de licence', 'Cotisation payée', 'Montant',
      'Créneaux du soir', 'Nombre de présences', 'Année scolaire'
    ];

    const rows = filteredStaff.map(m => {
      const slotNames = slots
        .filter(s => (m.eveningSlotIds || []).includes(s.id))
        .map(s => `${s.dayOfWeek} ${s.name}`)
        .join(' | ');

      return [
        m.lastName,
        m.firstName,
        m.role,
        m.discipline || '',
        m.email || '',
        m.phone || '',
        m.isLicenseUpToDate ? 'OUI' : 'NON',
        m.licenseNumber || '',
        m.paid ? 'OUI' : 'NON',
        m.paymentAmount || '',
        slotNames,
        staffAttendanceCounts[m.id] || 0,
        m.schoolYear
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `personnel_etablissement_as_rosa_parks_${activeYear}.csv`;
    link.click();
  };

  const selectedSlot = slots.find(s => s.id === selectedSlotIdForAttendance);

  // Personnels inscrits au créneau sélectionné pour le pointage
  const enrolledInSelectedSlot = useMemo(() => {
    if (!selectedSlotIdForAttendance) return [];
    return staffMembers.filter(m => (m.eveningSlotIds || []).includes(selectedSlotIdForAttendance));
  }, [staffMembers, selectedSlotIdForAttendance]);

  // Autres personnels non encore inscrits (pour ajout rapide ou participation ponctuelle)
  const notEnrolledInSelectedSlot = useMemo(() => {
    if (!selectedSlotIdForAttendance) return [];
    return staffMembers.filter(m => !(m.eveningSlotIds || []).includes(selectedSlotIdForAttendance));
  }, [staffMembers, selectedSlotIdForAttendance]);

  return (
    <div className="space-y-6">
      
      {/* Header & Sub-Navigation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                Personnel & Adultes
              </span>
              <span className="text-xs text-slate-500 font-medium">Saison {activeYear}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Personnel de l'Établissement
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestion des licences, des créneaux sportifs du soir et suivi des présences / fréquentation
            </p>
          </div>
        </div>

        {/* Onglets internes */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'members'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Membres & Licences</span>
            <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {staffMembers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'attendance'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Pointage & Fréquentation</span>
            <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {attendances.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('slots')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'slots'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Moon className="w-4 h-4 text-amber-600" />
            <span>Créneaux du Soir</span>
            <span className="ml-1 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {slots.length}
            </span>
          </button>
        </div>
      </div>

      {/* Cartes KPI / Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Personnels inscrits</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">
              {stats.upToDate} <span className="text-xs font-normal text-slate-400">({stats.upToDatePct}%)</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Licences à jour</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-800">{slots.length}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Créneaux du soir</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-violet-800">{totalSessionsCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Séances pointées</div>
          </div>
        </div>
      </div>

      {/* ========================================================================================= */}
      {/* SUB-TAB 1: LISTE DES MEMBRES & LICENCES */}
      {/* ========================================================================================= */}
      {subTab === 'members' && (
        <div className="space-y-4">
          
          {/* Actions & Barre de filtres */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Barre de recherche */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, discipline, n° licence..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                  title="Exporter en fichier CSV / Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exporter CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintMembers}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                  title="Imprimer la liste"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddMember}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un membre</span>
                </button>
              </div>
            </div>

            {/* Ligne de filtres avancés */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtres :
              </span>

              {/* Filtre Licence */}
              <select
                value={licenseFilter}
                onChange={e => setLicenseFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Toutes les licences</option>
                <option value="uptodate">Licences À JOUR uniquement</option>
                <option value="pending">Licences EN ATTENTE</option>
                <option value="unpaid">Cotisations NON RÉGLÉES</option>
              </select>

              {/* Filtre Rôle */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Toutes les fonctions</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Filtre Créneau */}
              <select
                value={slotFilter}
                onChange={e => setSlotFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tous les créneaux du soir</option>
                {slots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.dayOfWeek} — {s.name}
                  </option>
                ))}
              </select>

              {(searchTerm || roleFilter || licenseFilter !== 'all' || slotFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('');
                    setLicenseFilter('all');
                    setSlotFilter('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline ml-auto"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          </div>

          {/* Tableau des membres */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Membre du Personnel</th>
                    <th className="py-3 px-3">Fonction / Service</th>
                    <th className="py-3 px-3">Licence UNSS</th>
                    <th className="py-3 px-3">Cotisation</th>
                    <th className="py-3 px-3">Créneaux du Soir</th>
                    <th className="py-3 px-3 text-center">Fréquentation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                        <div className="font-semibold text-slate-600">Aucun membre du personnel trouvé</div>
                        <p className="text-xs text-slate-400 mt-1">
                          {searchTerm || roleFilter || licenseFilter !== 'all' || slotFilter
                            ? "Essayez d'ajuster vos critères de recherche ou filtres."
                            : "Commencez par ajouter les premiers membres du personnel adhérents à l'AS."}
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAddMember}
                          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-indigo-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter un personnel
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(m => {
                      const enrolledSlots = slots.filter(s => (m.eveningSlotIds || []).includes(s.id));
                      const presenceCount = staffAttendanceCounts[m.id] || 0;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          
                          {/* Nom / Prénom / Contact */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">
                              {m.lastName} {m.firstName}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {m.email && <span className="truncate max-w-[150px]">{m.email}</span>}
                              {m.email && m.phone && <span>•</span>}
                              {m.phone && <span>{m.phone}</span>}
                            </div>
                          </td>

                          {/* Rôle & Matière */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">{m.role}</div>
                            {m.discipline && (
                              <div className="text-[11px] text-slate-500">{m.discipline}</div>
                            )}
                          </td>

                          {/* Statut Licence */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleLicense(m)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                                m.isLicenseUpToDate
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                              title="Cliquer pour basculer le statut"
                            >
                              {m.isLicenseUpToDate ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>À JOUR</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>EN ATTENTE</span>
                                </>
                              )}
                            </button>
                            {m.licenseNumber && (
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                N° {m.licenseNumber}
                              </div>
                            )}
                          </td>

                          {/* Cotisation */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleTogglePaid(m)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                m.paid
                                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                              title="Cliquer pour basculer le paiement"
                            >
                              {m.paid ? (
                                <span>{m.paymentAmount ? `${m.paymentAmount}€ Réglé` : 'Payé'}</span>
                              ) : (
                                <span>À régler</span>
                              )}
                            </button>
                            {m.paymentMethod && m.paid && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {m.paymentMethod}
                              </div>
                            )}
                          </td>

                          {/* Créneaux du Soir inscrits */}
                          <td className="py-3 px-3">
                            {enrolledSlots.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[240px]">
                                {enrolledSlots.map(s => (
                                  <span
                                    key={s.id}
                                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-medium"
                                    title={`${s.name} (${s.startTime} - ${s.endTime})`}
                                  >
                                    <Moon className="w-2.5 h-2.5" />
                                    <span>{s.dayOfWeek}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Non inscrit</span>
                            )}
                          </td>

                          {/* Fréquentation (Présences) */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                              <Activity className="w-3 h-3 text-emerald-600" />
                              <span>{presenceCount}</span>
                              <span className="text-[10px] text-slate-400 font-normal">séance(s)</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditMember(m)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Modifier les informations"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(m)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Supprimer ce membre"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* SUB-TAB 2: POINTAGE & FRÉQUENTATION DES CRÉNEAUX DU SOIR */}
      {/* ========================================================================================= */}
      {subTab === 'attendance' && (
        <div className="space-y-6">

          {/* Sélecteur de créneau & date */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              
              {/* Choix du créneau */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Créneau du soir à pointer
                </label>
                <select
                  value={selectedSlotIdForAttendance}
                  onChange={e => setSelectedSlotIdForAttendance(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {slots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.dayOfWeek} ({s.startTime} - {s.endTime}) — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Choix de la date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Date de la séance
                </label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Bouton d'enregistrement */}
              <div>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={attendanceSaving || !selectedSlotIdForAttendance}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {currentAttendanceRecord 
                      ? "Mettre à jour le pointage" 
                      : "Valider les présences du jour"}
                  </span>
                </button>
              </div>

            </div>

            {/* Indicateur de statut du pointage */}
            {selectedSlot && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>
                    <strong>{selectedSlot.name}</strong> • {selectedSlot.location} • {selectedSlot.dayOfWeek} {selectedSlot.startTime}-{selectedSlot.endTime}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">
                    Présents : {presentIds.size} / {enrolledInSelectedSlot.length} inscrits
                  </span>
                  <button
                    type="button"
                    onClick={markAllEnrolledPresent}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                  >
                    Tout cocher
                  </button>
                  <button
                    type="button"
                    onClick={clearAllPresent}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Grille de pointage rapide des présents */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Feuille d'appel & pointage en direct</span>
              </h3>
              <span className="text-xs text-slate-500">
                Cliquez sur un personnel pour basculer son statut (Vert = Présent, Blanc = Absent)
              </span>
            </div>

            {/* Inscrits au créneau */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Membres inscrits à ce créneau ({enrolledInSelectedSlot.length})
              </div>

              {enrolledInSelectedSlot.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Aucun membre du personnel n'est actuellement inscrit à ce créneau.
                  Vous pouvez les inscrire depuis l'onglet "Membres & Licences" ou pointer les personnels ci-dessous.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {enrolledInSelectedSlot.map(m => {
                    const isPresent = presentIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleAttendancePresence(m.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isPresent
                            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">
                            {m.lastName} {m.firstName}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {m.role} {m.discipline ? `(${m.discipline})` : ''}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                              m.isLicenseUpToDate ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {m.isLicenseUpToDate ? 'Licence OK' : 'Licence ?'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Assiduité : {staffAttendanceCounts[m.id] || 0}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isPresent ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-5 h-5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-300">
                              <Square className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Autres personnels de l'établissement (présences ponctuelles ou essais) */}
            {notEnrolledInSelectedSlot.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Autres personnels (participants ponctuels / découvertes)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {notEnrolledInSelectedSlot.map(m => {
                    const isPresent = presentIds.has(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleAttendancePresence(m.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer text-xs flex items-center justify-between gap-2 transition-colors ${
                          isPresent
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="truncate">{m.lastName} {m.firstName}</span>
                        {isPresent ? (
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">Présent</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">+ Pointer</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Zone de notes de la séance */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Remarques / Bilan de la séance (optionnel)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Belle affluence pour le tournoi amical, séance écourtée à 18h45..."
                value={attendanceNotes}
                onChange={e => setAttendanceNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>

          {/* Historique des séances déjà pointées */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Historique des séances du soir ({attendances.length})</span>
            </h3>

            {attendances.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">Aucun pointage n'a encore été enregistré.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {attendances.map(att => {
                  const isCurrent = att.id === currentAttendanceRecord?.id;
                  return (
                    <div
                      key={att.id}
                      onClick={() => {
                        setSelectedSlotIdForAttendance(att.slotId);
                        setAttendanceDate(att.date);
                      }}
                      className={`py-3 px-2 flex items-center justify-between gap-4 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-indigo-50/70 text-indigo-900 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {new Date(att.date).getDate()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {new Date(att.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {att.slotName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                          <UserCheck className="w-3.5 h-3.5" />
                          {att.presentStaffIds?.length || 0} présent(s)
                        </span>
                        <span className="text-xs text-indigo-600 font-bold">Modifier</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================================= */}
      {/* SUB-TAB 3: GESTION DES CRÉNEAUX DU SOIR */}
      {/* ========================================================================================= */}
      {subTab === 'slots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Créneaux Sportifs Hebdomadaires pour le Personnel
              </h3>
              <p className="text-xs text-slate-500">
                Horaires, lieux et activités du soir proposés aux agents et enseignants du lycée
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddSlot}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau créneau</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map(s => {
              const enrolledCount = staffMembers.filter(m => (m.eveningSlotIds || []).includes(s.id)).length;
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between gap-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg font-black text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {s.dayOfWeek}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {s.startTime} - {s.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditSlot(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Modifier le créneau"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-base text-slate-900 leading-tight">
                        {s.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        📍 {s.location}
                      </p>
                    </div>

                    {s.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                        {s.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      {enrolledCount} inscrit(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSlotIdForAttendance(s.id);
                        setSubTab('attendance');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>Faire l'appel</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODALE MEMBRE (AJOUT / ÉDITION) */}
      {/* ========================================================================================= */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editingMember ? "Modifier le personnel" : "Ajouter un membre du personnel"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Nom & Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DUPONT"
                    value={memberForm.lastName}
                    onChange={e => setMemberForm({ ...memberForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Marie"
                    value={memberForm.firstName}
                    onChange={e => setMemberForm({ ...memberForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Rôle & Discipline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fonction / Catégorie
                  </label>
                  <select
                    value={memberForm.role}
                    onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Discipline / Service
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Histoire-Géo, Entretien..."
                    value={memberForm.discipline}
                    onChange={e => setMemberForm({ ...memberForm, discipline: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Courriel académique / personnel
                  </label>
                  <input
                    type="email"
                    placeholder="prenom.nom@ac-rennes.fr"
                    value={memberForm.email}
                    onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={memberForm.phone}
                    onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Section Statut Licence & Cotisation */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Statut Licence & Adhésion</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memberForm.isLicenseUpToDate}
                      onChange={e => setMemberForm({ ...memberForm, isLicenseUpToDate: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">Licence À JOUR</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memberForm.paid}
                      onChange={e => setMemberForm({ ...memberForm, paid: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-800">Cotisation réglée</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      N° Licence UNSS
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 22110-XXXX"
                      value={memberForm.licenseNumber}
                      onChange={e => setMemberForm({ ...memberForm, licenseNumber: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Mode de règlement
                    </label>
                    <select
                      value={memberForm.paymentMethod}
                      onChange={e => setMemberForm({ ...memberForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="Chèque">Chèque</option>
                      <option value="Espèces">Espèces</option>
                      <option value="Virement">Virement</option>
                      <option value="Pass Sport / Autre">Autre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Inscription aux Créneaux du Soir */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Inscriptions aux créneaux du soir
                </label>
                <div className="space-y-2">
                  {slots.map(s => {
                    const isChecked = memberForm.eveningSlotIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...memberForm.eveningSlotIds, s.id]
                                : memberForm.eveningSlotIds.filter(id => id !== s.id);
                              setMemberForm({ ...memberForm, eveningSlotIds: next });
                            }}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          <div>
                            <div className="text-xs font-bold">{s.name}</div>
                            <div className="text-[11px] text-slate-500">{s.dayOfWeek} ({s.startTime} - {s.endTime})</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">{s.location}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes & Observations
                </label>
                <input
                  type="text"
                  placeholder="Ex: Disponibilité à partir de 18h..."
                  value={memberForm.notes}
                  onChange={e => setMemberForm({ ...memberForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              {/* Boutons validation */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  {editingMember ? "Enregistrer les modifications" : "Ajouter le membre"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODALE CRÉNEAU (AJOUT / ÉDITION) */}
      {/* ========================================================================================= */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Moon className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">
                  {editingSlot ? "Modifier le créneau du soir" : "Nouveau créneau du soir"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Intitulé de l'activité *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Badminton & Volley loisir"
                  value={slotForm.name}
                  onChange={e => setSlotForm({ ...slotForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jour
                  </label>
                  <select
                    value={slotForm.dayOfWeek}
                    onChange={e => setSlotForm({ ...slotForm, dayOfWeek: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Début
                  </label>
                  <input
                    type="time"
                    value={slotForm.startTime}
                    onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fin
                  </label>
                  <input
                    type="time"
                    value={slotForm.endTime}
                    onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lieu
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gymnase Rosa Parks, Salle de muscu..."
                  value={slotForm.location}
                  onChange={e => setSlotForm({ ...slotForm, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Consignes
                </label>
                <textarea
                  rows={2}
                  placeholder="Informations sur le matériel, le niveau, etc."
                  value={slotForm.description}
                  onChange={e => setSlotForm({ ...slotForm, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  {editingSlot ? "Enregistrer" : "Créer le créneau"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
