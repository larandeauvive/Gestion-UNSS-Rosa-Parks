import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Convocation, Student, Session } from '../types';
import { 
  PlusCircle, Trash2, Printer, Search, X, Save, Edit3, 
  ChevronRight, CheckSquare, Square, Filter, Users, 
  ShieldCheck, Check, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  getConvocationsList, saveConvocationApi, deleteConvocationApi, 
  getTeachersList, saveSessionApi, getSessionsList 
} from '../lib/db';
import { AVAILABLE_CONVOCATION_CRITERIA, getStudentCategory } from '../lib/categoryUtils';

interface Props {
  students: Student[];
  activeYear: string;
  autoCreateNew?: boolean;
  onAutoCreateConsumed?: () => void;
}

const DEFAULT_CRITERIA_IDS = ['classGroup', 'licenseNumber', 'category', 'parentalAuth', 'swimmingCertificate', 'signature'];

export const ConvocationManager: React.FC<Props> = ({ students, activeYear, autoCreateNew, onAutoCreateConsumed }) => {
  const [convocations, setConvocations] = useState<Convocation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [convToDel, setConvToDel] = useState<string | null>(null);

  const [activeConvocation, setActiveConvocation] = useState<Convocation | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Convocation>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filtres avancés de sélection des élèves
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [onlyLicensed, setOnlyLicensed] = useState(false);
  const [onlyPaid, setOnlyPaid] = useState(false);
  const [onlyAP, setOnlyAP] = useState(false);
  const [onlySwimming, setOnlySwimming] = useState(false);

  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);

  const fetchConvocationsData = useCallback(async () => {
    try {
      const [tList, cList, sList] = await Promise.all([
        getTeachersList(),
        getConvocationsList(activeYear),
        getSessionsList(activeYear)
      ]);
      setTeachers(tList.map(t => ({ id: t.id, name: t.name })));
      setSessions(sList);

      // Synchronisation bidirectionnelle : si une séance liée possède des élèves inscrits, les inclure dans la convocation
      const enrichedConvocations = cList.map(conv => {
        const linkedSession = sList.find(s => s.convocationId === conv.id || s.id === conv.sessionId);
        if (linkedSession && linkedSession.enrolledStudentIds?.length) {
          const merged = Array.from(new Set([...(conv.studentIds || []), ...(linkedSession.enrolledStudentIds || [])]));
          return { ...conv, studentIds: merged };
        }
        return conv;
      });

      enrichedConvocations.sort((a, b) => new Date(b.departureDate).getTime() - new Date(a.departureDate).getTime());
      setConvocations(enrichedConvocations);
    } catch (err) {
      console.warn("Erreur chargement convocations:", err);
    } finally {
      setLoading(false);
    }
  }, [activeYear]);

  useEffect(() => {
    fetchConvocationsData();
  }, [fetchConvocationsData]);

  useEffect(() => {
    if (autoCreateNew) {
      handleCreateNew();
      if (onAutoCreateConsumed) onAutoCreateConsumed();
    }
  }, [autoCreateNew, onAutoCreateConsumed]);

  const handleCreateNew = () => {
    setActiveConvocation(null);
    setFormData({
      competitionName: '',
      departureDate: new Date().toISOString().slice(0, 16),
      returnDate: new Date().toISOString().slice(0, 16),
      guides: '',
      needSnack: 'NON',
      needPicnic: 'NON',
      schoolYear: activeYear,
      teacherIds: [],
      selectedCriteria: DEFAULT_CRITERIA_IDS
    });
    setSelectedStudentIds(new Set());
    setIsEditing(true);
  };

  const handleEdit = (conv: Convocation) => {
    // Vérifier les inscrits de la séance liée pour s'assurer que les élèves inscrits y soient
    const linkedSession = sessions.find(s => s.convocationId === conv.id || s.id === conv.sessionId);
    const initialStudentIds = Array.from(new Set([
      ...(conv.studentIds || []),
      ...(linkedSession?.enrolledStudentIds || [])
    ]));

    setActiveConvocation(conv);
    setFormData({
      ...conv,
      studentIds: initialStudentIds,
      selectedCriteria: conv.selectedCriteria && conv.selectedCriteria.length > 0 
        ? conv.selectedCriteria 
        : DEFAULT_CRITERIA_IDS
    });
    setSelectedStudentIds(new Set(initialStudentIds));
    setIsEditing(true);
  };

  const handleView = (conv: Convocation) => {
    const linkedSession = sessions.find(s => s.convocationId === conv.id || s.id === conv.sessionId);
    const mergedIds = Array.from(new Set([
      ...(conv.studentIds || []),
      ...(linkedSession?.enrolledStudentIds || [])
    ]));
    setActiveConvocation({ ...conv, studentIds: mergedIds });
    setIsEditing(false);
  };

  const confirmDelete = async () => {
    if (!convToDel) return;
    try {
      const conv = convocations.find(c => c.id === convToDel);
      await deleteConvocationApi(convToDel);
      if (conv?.sessionId) {
        try {
          await saveSessionApi({ id: conv.sessionId, convocationId: undefined });
        } catch (e) {
          console.warn('Could not unlink session', e);
        }
      }
      if (activeConvocation?.id === convToDel) {
        setActiveConvocation(null);
        setIsEditing(false);
      }
      await fetchConvocationsData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression de la convocation.');
    }
    setConvToDel(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let tshirtManagerId = formData.tshirtManagerId || null;
      if (tshirtManagerId && !selectedStudentIds.has(tshirtManagerId)) {
        tshirtManagerId = null;
      }
      const snackManagerIds = (formData.snackManagerIds || []).filter(id => selectedStudentIds.has(id));

      const finalStudentIds: string[] = Array.from(selectedStudentIds);
      const dataToSave: any = {
        ...formData,
        tshirtManagerId,
        snackManagerIds,
        studentIds: finalStudentIds,
        selectedCriteria: formData.selectedCriteria && formData.selectedCriteria.length > 0 
          ? formData.selectedCriteria 
          : DEFAULT_CRITERIA_IDS,
        schoolYear: activeYear
      };

      if (activeConvocation) {
        await saveConvocationApi({ ...dataToSave, id: activeConvocation.id });
        if (dataToSave.sessionId) {
          await saveSessionApi({
            id: dataToSave.sessionId,
            enrolledStudentIds: finalStudentIds
          });
        }
      } else {
        await saveConvocationApi(dataToSave);
      }
      setIsEditing(false);
      setActiveConvocation(null);
      await fetchConvocationsData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde.");
    }
  };

  // Synchronisation explicite avec les inscrits de la séance
  const syncWithLinkedSession = (sessionId?: string) => {
    if (!sessionId) return;
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession || !targetSession.enrolledStudentIds) return;

    const merged = new Set([...selectedStudentIds, ...targetSession.enrolledStudentIds]);
    setSelectedStudentIds(merged);
    alert(`${targetSession.enrolledStudentIds.length} élève(s) inscrit(s) à la séance ont été ajoutés à la convocation.`);
  };

  // Liste des classes uniques pour le filtre
  const uniqueClasses = useMemo(() => {
    const classes = new Set<string>();
    students.forEach(s => {
      if (s.classGroup && s.classGroup.trim()) classes.add(s.classGroup.trim());
    });
    return Array.from(classes).sort();
  }, [students]);

  // Filtrage combiné des élèves
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Recherche texte (Nom, Prénom, Classe, Licence)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const last = (s.lastName || '').toLowerCase();
        const first = (s.firstName || '').toLowerCase();
        const cl = (s.classGroup || '').toLowerCase();
        const lic = (s.licenseNumber || '').toLowerCase();
        const full = `${last} ${first}`;
        const match = full.includes(q) || first.includes(q) || cl.includes(q) || lic.includes(q);
        if (!match) return false;
      }

      // 2. Filtre par Catégorie sportive
      if (selectedCategoryFilter !== 'ALL') {
        const cat = getStudentCategory(s, activeYear);
        if (selectedCategoryFilter === 'BENJ' && !cat.startsWith('B')) return false;
        if (selectedCategoryFilter === 'MIN' && !cat.startsWith('M')) return false;
        if (selectedCategoryFilter === 'CAD' && !cat.startsWith('C')) return false;
        if (selectedCategoryFilter === 'JUN' && !cat.startsWith('J')) return false;
        if (selectedCategoryFilter === 'SEN' && !cat.startsWith('S')) return false;
      }

      // 3. Filtre par Classe
      if (selectedClassFilter !== 'ALL') {
        if ((s.classGroup || '').trim() !== selectedClassFilter) return false;
      }

      // 4. Critères stricts
      if (onlyLicensed) {
        const hasLic = !!(s.licenseNumber && s.licenseNumber.trim().length > 0) || s.opussChecked === true;
        if (!hasLic) return false;
      }
      if (onlyPaid && String(s.paid).toUpperCase() !== 'OUI') {
        return false;
      }
      if (onlyAP && String(s.parentalAuth).toUpperCase() !== 'OUI') {
        return false;
      }
      if (onlySwimming && String(s.swimmingCertificate).toUpperCase() !== 'OUI') {
        return false;
      }

      return true;
    });
  }, [students, searchTerm, selectedCategoryFilter, selectedClassFilter, onlyLicensed, onlyPaid, onlyAP, onlySwimming, activeYear]);

  // Sélectionner tous les élèves visibles
  const selectAllFiltered = () => {
    const updated = new Set(selectedStudentIds);
    filteredStudents.forEach(s => updated.add(s.id));
    setSelectedStudentIds(updated);
  };

  // Désélectionner tous les élèves visibles
  const deselectAllFiltered = () => {
    const updated = new Set(selectedStudentIds);
    filteredStudents.forEach(s => updated.delete(s.id));
    setSelectedStudentIds(updated);
  };

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  // Gestion des critères d'affichage de la convocation
  const toggleCriterion = (critId: string) => {
    const current = new Set(formData.selectedCriteria || DEFAULT_CRITERIA_IDS);
    if (current.has(critId)) {
      current.delete(critId);
    } else {
      current.add(critId);
    }
    setFormData({ ...formData, selectedCriteria: Array.from(current) });
  };

  // Responsabilités comptages
  const managerCounts = useMemo(() => {
    const counts: Record<string, { tshirt: number; snack: number }> = {};
    students.forEach(s => {
      counts[s.id] = { tshirt: 0, snack: 0 };
    });
    convocations.forEach(c => {
      if (c.tshirtManagerId && counts[c.tshirtManagerId]) counts[c.tshirtManagerId].tshirt++;
      c.snackManagerIds?.forEach(id => {
        if (counts[id]) counts[id].snack++;
      });
    });
    return counts;
  }, [students, convocations]);

  const toggleSnackManager = (id: string) => {
    const current = new Set(formData.snackManagerIds || []);
    if (current.has(id)) {
      current.delete(id);
    } else {
      if (current.size >= 2) return;
      current.add(id);
    }
    setFormData({ ...formData, snackManagerIds: Array.from(current) });
  };

  // Impression Responsable / Prof avec colonnes dynamiques
  const handlePrint = (conv: Convocation) => {
    const convStudents = students.filter(s => conv.studentIds?.includes(s.id));
    convStudents.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    const teacherNames = conv.teacherIds?.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(', ');
    const accompagnateursStr = [teacherNames, conv.guides].filter(Boolean).join(', ') || 'Aucun';

    const activeCriteria = (conv.selectedCriteria && conv.selectedCriteria.length > 0)
      ? conv.selectedCriteria
      : DEFAULT_CRITERIA_IDS;

    const visibleCols = AVAILABLE_CONVOCATION_CRITERIA.filter(c => activeCriteria.includes(c.id));

    const printWindow = window.open('', '', 'height=850,width=1100');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Convocation UNSS - ${conv.competitionName}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0 0 6px 0; font-size: 22px; color: #0f172a; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-item strong { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
          .meta-item span { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px 9px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8fafc; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .mono { font-family: monospace; }
        </style></head><body>
        <div class="header">
          <h1>Convocation Officielle UNSS</h1>
          <p style="margin:0; font-weight: bold; color: #334155; font-size: 16px;">${conv.competitionName}</p>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Lieu du RDV</strong><span>${conv.meetingLocation || 'Non spécifié'}</span></div>
          <div class="meta-item"><strong>Heure du RDV</strong><span>${conv.meetingTime || new Date(conv.departureDate).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'})}</span></div>
          <div class="meta-item"><strong>Heure de retour</strong><span>${conv.returnTime || new Date(conv.returnDate).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'})}</span></div>
          ${conv.cafeteriaTime ? `<div class="meta-item"><strong>Passage au self</strong><span>${conv.cafeteriaTime}</span></div>` : ''}
          <div class="meta-item"><strong>Accompagnateurs</strong><span>${accompagnateursStr}</span></div>
          <div class="meta-item">
             <strong>À prévoir</strong>
             <span style="font-size: 13px; font-weight: normal;">
               ${conv.needSnack === 'OUI' ? 'Goûter : OUI<br>' : ''}
               ${conv.needPicnic === 'OUI' ? 'Pique-nique : OUI' : ''}
             </span>
          </div>
        </div>

        ${(conv.tshirtManagerId || (conv.snackManagerIds?.length || 0) > 0) ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: bold; color: #166534; text-transform: uppercase; margin-bottom: 4px;">Responsabilités Élèves Désignées</div>
            <div style="display: flex; gap: 20px; font-size: 13px;">
              ${conv.tshirtManagerId ? `<div><strong>👕 Responsable Maillots :</strong> ${students.find(s => s.id === conv.tshirtManagerId)?.lastName || ''} ${students.find(s => s.id === conv.tshirtManagerId)?.firstName || ''}</div>` : ''}
              ${(conv.snackManagerIds?.length || 0) > 0 ? `<div><strong>🥪 Goûter/Pique-Nique :</strong> ${conv.snackManagerIds!.map(id => students.find(s => s.id === id)?.lastName).join(', ')}</div>` : ''}
            </div>
          </div>
        ` : ''}
        
        <h3 style="margin: 0 0 8px 0; font-size: 15px;">Élèves Convoqués (${convStudents.length})</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th>Nom & Prénom</th>
              ${visibleCols.map(col => `<th class="center">${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${convStudents.map((s, idx) => `
              <tr>
                <td class="center" style="color: #64748b;">${idx + 1}</td>
                <td class="bold">${s.lastName} ${s.firstName}</td>
                ${visibleCols.map(col => {
                  switch (col.id) {
                    case 'classGroup':
                      return `<td class="center bold">${s.classGroup || '-'}</td>`;
                    case 'licenseNumber':
                      return `<td class="center mono">${s.licenseNumber || '<span style="color:#dc2626;">Non licencié</span>'}</td>`;
                    case 'category':
                      return `<td class="center bold">${getStudentCategory(s, activeYear)}</td>`;
                    case 'birthDate':
                      return `<td class="center">${s.birthDate || '-'}</td>`;
                    case 'gender':
                      return `<td class="center">${s.gender || '-'}</td>`;
                    case 'parentalAuth':
                      return `<td class="center bold">${s.parentalAuth === 'OUI' ? '✓' : '<span style="color:#dc2626;">✗</span>'}</td>`;
                    case 'swimmingCertificate':
                      return `<td class="center">${s.swimmingCertificate === 'OUI' ? '✓' : '✗'}</td>`;
                    case 'paid':
                      return `<td class="center">${s.paid === 'OUI' ? '✓' : '<span style="color:#dc2626;">Non</span>'}</td>`;
                    case 'size':
                      return `<td class="center">${s.size || '-'}</td>`;
                    case 'imageRights':
                      return `<td class="center">${s.imageRights === 'OUI' ? '✓' : '✗'}</td>`;
                    case 'signature':
                      return `<td style="min-width: 80px;"></td>`;
                    default:
                      return `<td class="center">-</td>`;
                  }
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: center; font-size: 11px; color: #64748b;">
           Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} - Association Sportive Rosa Parks
        </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Impression version simplifiée pour affichage ou distribution aux élèves
  const handlePrintEleves = (conv: Convocation) => {
    const convStudents = students.filter(s => conv.studentIds?.includes(s.id));
    convStudents.sort((a, b) => {
      const classCmp = (a.classGroup || '').localeCompare(b.classGroup || '');
      if (classCmp !== 0) return classCmp;
      return (a.lastName || '').localeCompare(b.lastName || '');
    });

    const teacherNames = conv.teacherIds?.map(id => teachers.find(t => t.id === id)?.name).filter(Boolean).join(', ');
    const accompagnateursStr = [teacherNames, conv.guides].filter(Boolean).join(', ') || 'Aucun';

    const printWindow = window.open('', '', 'height=800,width=850');
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Convocation Élèves - ${conv.competitionName}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 25px; color: #0f172a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          h1 { margin: 0 0 6px 0; font-size: 22px; color: #0f172a; }
          .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-item strong { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
          .meta-item span { font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 11px; }
          tr:nth-child(even) { background-color: #f8fafc; }
        </style></head><body>
        <div class="header">
          <h1>AS Rosa Parks - Liste des Élèves Convoqués</h1>
          <p style="margin:0; font-weight: bold; color: #334155; font-size: 16px;">${conv.competitionName}</p>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><strong>Lieu du RDV</strong><span>${conv.meetingLocation || 'Non spécifié'}</span></div>
          <div class="meta-item"><strong>Heure du RDV</strong><span>${conv.meetingTime || new Date(conv.departureDate).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'})}</span></div>
          <div class="meta-item"><strong>Heure de retour</strong><span>${conv.returnTime || new Date(conv.returnDate).toLocaleString('fr-FR', {dateStyle:'short', timeStyle:'short'})}</span></div>
          ${conv.cafeteriaTime ? `<div class="meta-item"><strong>Passage au self</strong><span>${conv.cafeteriaTime}</span></div>` : ''}
          <div class="meta-item"><strong>Enseignants</strong><span>${accompagnateursStr}</span></div>
          <div class="meta-item">
             <strong>À prévoir</strong>
             <span style="font-size: 13px; font-weight: normal;">
               ${conv.needSnack === 'OUI' ? 'Goûter : OUI<br>' : ''}
               ${conv.needPicnic === 'OUI' ? 'Pique-nique : OUI' : ''}
             </span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Nom</th>
              <th style="width: 35%;">Prénom</th>
              <th style="width: 15%; text-align: center;">Classe</th>
              <th style="width: 15%; text-align: center;">Catégorie</th>
            </tr>
          </thead>
          <tbody>
            ${convStudents.map(s => `
              <tr>
                <td style="font-weight: bold;">${s.lastName}</td>
                <td>${s.firstName}</td>
                <td style="font-weight: bold; text-align: center;">${s.classGroup || '-'}</td>
                <td style="font-weight: bold; text-align: center;">${getStudentCategory(s, activeYear)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; font-size: 11px; color: #64748b; text-align: center;">
           Généré le ${new Date().toLocaleDateString('fr-FR')} - AS Rosa Parks
        </div>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Séance liée pour la convocation active
  const linkedSessionForActive = useMemo(() => {
    if (!activeConvocation) return null;
    return sessions.find(s => s.convocationId === activeConvocation.id || s.id === activeConvocation.sessionId);
  }, [activeConvocation, sessions]);

  const linkedSessionForForm = useMemo(() => {
    if (!formData.sessionId && !activeConvocation) return null;
    return sessions.find(s => s.id === formData.sessionId || s.convocationId === activeConvocation?.id);
  }, [formData.sessionId, activeConvocation, sessions]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] h-full">
      {/* Left sidebar: List of convocations */}
      <div className="w-full lg:w-80 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <span>Convocations</span>
            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {convocations.length}
            </span>
          </h2>
          <button 
            onClick={handleCreateNew}
            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            title="Créer une nouvelle convocation"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="text-center py-10 text-slate-400">Chargement...</div>
          ) : convocations.length === 0 ? (
            <div className="text-center py-10 text-slate-400 font-medium bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4">
              Aucune convocation créée pour {activeYear}
            </div>
          ) : (
            convocations.map(conv => {
              const isSelected = activeConvocation?.id === conv.id && !isEditing;
              const hasLinkedSes = sessions.some(s => s.convocationId === conv.id || s.id === conv.sessionId);

              return (
                <div 
                  key={conv.id} 
                  onClick={() => handleView(conv)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-400 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-400' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 text-sm truncate flex-1">{conv.competitionName || 'Sans titre'}</h3>
                    {hasLinkedSes && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded shrink-0">
                        Séance
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex justify-between items-center">
                    <span>{new Date(conv.departureDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold text-[11px]">
                      {(conv.studentIds || []).length} élèves
                    </span>
                  </p>
                  <div className="flex justify-end gap-1.5 mt-2.5 pt-2 border-t border-slate-100">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePrint(conv); }} 
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" 
                      title="Imprimer convocation prof"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEdit(conv); }} 
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" 
                      title="Modifier la convocation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConvToDel(conv.id); }} 
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                      title="Supprimer la convocation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content: Editor or Viewer */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-w-0">
        {!isEditing && !activeConvocation && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-slate-50/50">
            <span className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </span>
            <p className="font-semibold text-slate-600 text-sm">Sélectionnez une convocation pour voir les détails</p>
            <p className="text-xs text-slate-400 mt-1">Ou cliquez sur « + » pour créer une nouvelle convocation</p>
          </div>
        )}

        {/* Viewer */}
        {!isEditing && activeConvocation && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/90 shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  {activeConvocation.competitionName}
                </h2>
                <div className="text-xs sm:text-sm font-medium text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                  <span>📅 Départ : {new Date(activeConvocation.departureDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span>•</span>
                  <span>🏁 Retour : {new Date(activeConvocation.returnDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleEdit(activeConvocation)} 
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Modifier
                </button>
                <button 
                  onClick={() => handlePrintEleves(activeConvocation)} 
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Fiche Élèves
                </button>
                <button 
                  onClick={() => handlePrint(activeConvocation)} 
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Convocation Complète
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-6">
              {/* Alerte séance liée si présente */}
              {linkedSessionForActive && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-700 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-purple-900">
                        Liée à la séance « {linkedSessionForActive.name} » ({new Date(linkedSessionForActive.date).toLocaleDateString('fr-FR')})
                      </p>
                      <p className="text-[11px] text-purple-700">
                        {linkedSessionForActive.enrolledStudentIds?.length || 0} élève(s) inscrit(s) dans la séance calendrier
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => syncWithLinkedSession(linkedSessionForActive.id)}
                    className="flex items-center gap-1 text-xs font-bold text-purple-800 bg-white border border-purple-300 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Synchroniser les élèves
                  </button>
                </div>
              )}

              {/* Détails Logistiques */}
              <div>
                <h3 className="font-bold text-slate-900 text-sm mb-3 uppercase tracking-wider text-slate-500">
                  Détails Logistiques & RDV
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Lieu du RDV</span>
                    <span className="text-sm font-bold text-slate-900">{activeConvocation.meetingLocation || 'Non spécifié'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Heure du RDV</span>
                    <span className="text-sm font-bold text-slate-900">{activeConvocation.meetingTime || 'Non spécifiée'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Heure de retour</span>
                    <span className="text-sm font-bold text-slate-900">{activeConvocation.returnTime || 'Non spécifiée'}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Passage au self</span>
                    <span className="text-sm font-bold text-slate-900">{activeConvocation.cafeteriaTime || 'Non'}</span>
                  </div>
                </div>
              </div>

              {/* Responsabilités élèves */}
              {(activeConvocation.tshirtManagerId || (activeConvocation.snackManagerIds?.length || 0) > 0) && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Responsabilités Élèves</h4>
                  <div className="flex flex-wrap gap-4 text-sm">
                    {activeConvocation.tshirtManagerId && (
                      <span className="font-medium text-emerald-950">
                        👕 <strong>Maillots :</strong> {students.find(s => s.id === activeConvocation.tshirtManagerId)?.lastName} {students.find(s => s.id === activeConvocation.tshirtManagerId)?.firstName}
                      </span>
                    )}
                    {(activeConvocation.snackManagerIds?.length || 0) > 0 && (
                      <span className="font-medium text-emerald-950">
                        🥪 <strong>Pique-nique/Goûter :</strong> {activeConvocation.snackManagerIds!.map(id => students.find(s => s.id === id)?.lastName).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tableau détaillé des élèves convoqués */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider text-slate-500">
                    Liste des Élèves Convoqués ({(activeConvocation.studentIds || []).length})
                  </h3>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Élève</th>
                        <th className="p-2.5 text-center">Classe</th>
                        <th className="p-2.5 text-center">N° Licence</th>
                        <th className="p-2.5 text-center">Catégorie</th>
                        <th className="p-2.5 text-center">AP</th>
                        <th className="p-2.5 text-center">Nage</th>
                        <th className="p-2.5 text-center">Cotisation</th>
                        <th className="p-2.5 text-center">Taille</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.filter(s => activeConvocation.studentIds?.includes(s.id)).map(s => {
                        const hasLic = !!(s.licenseNumber && s.licenseNumber.trim().length > 0) || s.opussChecked === true;
                        const cat = getStudentCategory(s, activeYear);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-bold text-slate-900">
                              {s.lastName} {s.firstName}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-700">
                              {s.classGroup || '-'}
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              {hasLic ? (
                                <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-bold text-[11px]">
                                  {s.licenseNumber || 'Licencié'}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold text-[11px]">Non licencié</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-bold text-indigo-700">
                              {cat}
                            </td>
                            <td className="p-2.5 text-center">
                              {s.parentalAuth === 'OUI' ? (
                                <span className="text-emerald-700 font-bold">✓</span>
                              ) : (
                                <span className="text-rose-500 font-bold">✗</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {s.swimmingCertificate === 'OUI' ? (
                                <span className="text-emerald-700 font-bold">✓</span>
                              ) : (
                                <span className="text-slate-400">✗</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {s.paid === 'OUI' ? (
                                <span className="text-emerald-700 font-bold">✓</span>
                              ) : (
                                <span className="text-rose-500 font-bold">Non</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {s.size ? <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold">{s.size}</span> : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editor Form */}
        {isEditing && (
          <form onSubmit={handleSave} className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                  <Edit3 className="w-4 h-4" />
                </span>
                {activeConvocation ? 'Modifier la Convocation' : 'Nouvelle Convocation'}
              </h2>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => { setIsEditing(false); setActiveConvocation(null); }} 
                  className="px-4 py-2 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Enregistrer la convocation
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Informations Générales */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Titre de la convocation / compétition</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-sm" 
                    value={formData.competitionName || ''} 
                    onChange={e => setFormData({ ...formData, competitionName: e.target.value })} 
                    placeholder="ex: Championnat de District Futsal" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lieu du RDV</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.meetingLocation || ''} 
                      onChange={e => setFormData({ ...formData, meetingLocation: e.target.value })} 
                      placeholder="ex: Devant le gymnase" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Heure du RDV</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.meetingTime || ''} 
                      onChange={e => setFormData({ ...formData, meetingTime: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Passage au self</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.cafeteriaTime || ''} 
                      onChange={e => setFormData({ ...formData, cafeteriaTime: e.target.value })} 
                      placeholder="Optionnel" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Heure de retour</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.returnTime || ''} 
                      onChange={e => setFormData({ ...formData, returnTime: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date & Heure de départ</label>
                    <input 
                      type="datetime-local" 
                      required 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.departureDate || ''} 
                      onChange={e => setFormData({ ...formData, departureDate: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date & Heure de retour estimée</label>
                    <input 
                      type="datetime-local" 
                      required 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.returnDate || ''} 
                      onChange={e => setFormData({ ...formData, returnDate: e.target.value })} 
                    />
                  </div>
                </div>

                {/* Enseignants Responsables */}
                {teachers.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Enseignants Responsables</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {teachers.map(t => (
                        <label key={t.id} className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                          <input 
                            type="checkbox" 
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                            checked={(formData.teacherIds || []).includes(t.id)}
                            onChange={e => {
                              const current = new Set(formData.teacherIds || []);
                              if (e.target.checked) current.add(t.id);
                              else current.delete(t.id);
                              setFormData({ ...formData, teacherIds: Array.from(current) });
                            }}
                          />
                          <span className="text-xs font-medium text-slate-700">{t.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Accompagnateurs supplémentaires</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs" 
                      value={formData.guides || ''} 
                      onChange={e => setFormData({ ...formData, guides: e.target.value })} 
                      placeholder="ex: M. Dupont" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Goûter à prévoir ?</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white" 
                      value={formData.needSnack || 'NON'} 
                      onChange={e => setFormData({ ...formData, needSnack: e.target.value })}
                    >
                      <option value="NON">NON</option>
                      <option value="OUI">OUI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pique-nique à prévoir ?</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white" 
                      value={formData.needPicnic || 'NON'} 
                      onChange={e => setFormData({ ...formData, needPicnic: e.target.value })}
                    >
                      <option value="NON">NON</option>
                      <option value="OUI">OUI</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION: CRITÈRES À AFFICHER SUR LA CONVOCATION IMPRIMÉE */}
              <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                      Critères à faire figurer sur la convocation imprimée
                    </h3>
                  </div>
                  <span className="text-[11px] text-indigo-700 font-semibold">
                    {(formData.selectedCriteria || DEFAULT_CRITERIA_IDS).length} critère(s) sélectionné(s)
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Cochez les critères et colonnes qui apparaîtront sur le listing officiel de convocation lors de l'impression :
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                  {AVAILABLE_CONVOCATION_CRITERIA.map(crit => {
                    const isChecked = (formData.selectedCriteria || DEFAULT_CRITERIA_IDS).includes(crit.id);
                    return (
                      <label 
                        key={crit.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-white border-indigo-400 font-bold text-indigo-900 shadow-2xs' 
                            : 'bg-white/60 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCriterion(crit.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{crit.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: SÉLECTION DES ÉLÈVES AVEC FILTRES CRITÈRES & CATÉGORIES */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Sélection des élèves convoqués ({selectedStudentIds.size} convoqué(s))
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Visualisez leur N° de licence, catégorie sportive UNSS et critères d'adhésion.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={selectAllFiltered}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Tout sélectionner ({filteredStudents.length})
                    </button>
                    <button 
                      type="button" 
                      onClick={deselectAllFiltered}
                      className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                {/* Barre de filtres par critères et catégories */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input 
                        type="text" 
                        placeholder="Rechercher nom, classe, licence..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <select 
                        value={selectedCategoryFilter}
                        onChange={e => setSelectedCategoryFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                      >
                        <option value="ALL">Toutes les catégories sportives</option>
                        <option value="BENJ">Benjamins / Benjamines (BF / BG)</option>
                        <option value="MIN">Minimes (MF / MG)</option>
                        <option value="CAD">Cadets / Cadettes (CF / CG)</option>
                        <option value="JUN">Juniors (JF / JG)</option>
                        <option value="SEN">Séniors (SF / SG)</option>
                      </select>
                    </div>

                    <div>
                      <select 
                        value={selectedClassFilter}
                        onChange={e => setSelectedClassFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                      >
                        <option value="ALL">Toutes les classes</option>
                        {uniqueClasses.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Filtres rapides par cases à cocher */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60 text-xs">
                    <span className="font-bold text-slate-500 text-[11px] uppercase">Filtres rapides :</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input 
                        type="checkbox" 
                        checked={onlyLicensed} 
                        onChange={e => setOnlyLicensed(e.target.checked)} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Licenciés uniquement</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input 
                        type="checkbox" 
                        checked={onlyPaid} 
                        onChange={e => setOnlyPaid(e.target.checked)} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Cotisation à jour</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input 
                        type="checkbox" 
                        checked={onlyAP} 
                        onChange={e => setOnlyAP(e.target.checked)} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>AP validée</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                      <input 
                        type="checkbox" 
                        checked={onlySwimming} 
                        onChange={e => setOnlySwimming(e.target.checked)} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Savoir nager</span>
                    </label>
                  </div>
                </div>

                {/* Tableau de sélection des élèves */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs h-[360px] flex flex-col">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex text-[11px] font-bold text-slate-600 uppercase tracking-wider shrink-0">
                    <div className="w-8 text-center">✓</div>
                    <div className="flex-1">Élève</div>
                    <div className="w-16 text-center">Classe</div>
                    <div className="w-28 text-center">N° Licence</div>
                    <div className="w-24 text-center">Catégorie</div>
                    <div className="w-14 text-center">AP</div>
                    <div className="w-14 text-center">Cotis.</div>
                    <div className="w-14 text-center">Taille</div>
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-medium text-xs">
                        Aucun élève ne correspond aux critères sélectionnés
                      </div>
                    ) : (
                      filteredStudents.map(s => {
                        const isSelected = selectedStudentIds.has(s.id);
                        const hasLic = !!(s.licenseNumber && s.licenseNumber.trim().length > 0) || s.opussChecked === true;
                        const cat = getStudentCategory(s, activeYear);

                        return (
                          <div 
                            key={s.id} 
                            onClick={() => toggleStudent(s.id)}
                            className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                              isSelected 
                                ? 'bg-indigo-50/80 border border-indigo-200' 
                                : 'hover:bg-slate-50 border border-transparent'
                            }`}
                          >
                            <div className="w-8 flex justify-center">
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                readOnly 
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300" 
                              />
                            </div>
                            <div className="flex-1 font-bold text-slate-900 truncate">
                              {s.lastName} {s.firstName}
                            </div>
                            <div className="w-16 text-center font-bold text-slate-600">
                              {s.classGroup || '-'}
                            </div>
                            <div className="w-28 text-center font-mono text-[11px]">
                              {hasLic ? (
                                <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold truncate block">
                                  {s.licenseNumber || 'Licencié'}
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold">Sans licence</span>
                              )}
                            </div>
                            <div className="w-24 text-center font-bold text-indigo-700">
                              {cat}
                            </div>
                            <div className="w-14 text-center font-bold">
                              {s.parentalAuth === 'OUI' ? (
                                <span className="text-emerald-700">✓</span>
                              ) : (
                                <span className="text-rose-500">✗</span>
                              )}
                            </div>
                            <div className="w-14 text-center font-bold">
                              {s.paid === 'OUI' ? (
                                <span className="text-emerald-700">✓</span>
                              ) : (
                                <span className="text-rose-500">✗</span>
                              )}
                            </div>
                            <div className="w-14 text-center">
                              {s.size ? <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">{s.size}</span> : '-'}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Responsabilités élèves */}
              {selectedStudentIds.size > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                    Désignation des responsabilités
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border border-slate-200 rounded-xl p-3 bg-emerald-50/30">
                      <label className="block text-xs font-bold text-emerald-800 mb-1.5">👕 Responsable Maillots</label>
                      <select 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs font-medium"
                        value={formData.tshirtManagerId || ''}
                        onChange={e => setFormData({ ...formData, tshirtManagerId: e.target.value })}
                      >
                        <option value="">Aucun</option>
                        {students.filter(s => selectedStudentIds.has(s.id)).map(s => (
                          <option key={`tshirt_${s.id}`} value={s.id}>
                            {s.lastName} {s.firstName} {managerCounts[s.id]?.tshirt > 0 ? `(Désigné ${managerCounts[s.id].tshirt} fois)` : '(Jamais)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3 bg-amber-50/30">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-amber-800">🥪 Resp. Pique-Nique/Goûter</label>
                        <span className="text-[10px] text-amber-600 font-bold">Max 2</span>
                      </div>
                      <div className="h-[100px] overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 text-xs space-y-1">
                        {students.filter(s => selectedStudentIds.has(s.id)).map(s => {
                          const isSelected = (formData.snackManagerIds || []).includes(s.id);
                          const maxReached = !isSelected && (formData.snackManagerIds || []).length >= 2;
                          return (
                            <label key={`snack_${s.id}`} className={`flex items-center gap-2 p-1 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-amber-100 font-bold text-amber-900' : 'hover:bg-slate-50 text-slate-700'} ${maxReached ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <input 
                                type="checkbox" 
                                checked={isSelected} 
                                disabled={maxReached}
                                onChange={() => toggleSnackManager(s.id)} 
                                className="rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                              />
                              <span className="truncate flex-1">{s.lastName} {s.firstName}</span>
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1 rounded shrink-0">
                                {managerCounts[s.id]?.snack > 0 ? `${managerCounts[s.id].snack} fois` : 'Jamais'}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog 
        isOpen={!!convToDel}
        title="Supprimer la convocation"
        message="Êtes-vous sûr de vouloir supprimer cette convocation ? Cette action est irréversible."
        onConfirm={confirmDelete}
        onCancel={() => setConvToDel(null)}
      />
    </div>
  );
};
