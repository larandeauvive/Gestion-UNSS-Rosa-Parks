import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Convocation, Session, Student } from '../types';
import { 
  getConvocationsList, getSessionsList, saveSessionApi, 
  deleteSessionApi, saveConvocationApi, deleteConvocationApi,
  getAppSetting
} from '../lib/db';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, X, Printer, Users, FileText, 
  Calendar as CalendarIcon, PlusCircle, Loader2, Share2, 
  Trash2, Edit3, Download, FileUp, ShieldCheck, Clock, MapPin 
} from 'lucide-react';
import { RegistrationFormDoc } from '../types';
import { RegistrationFormModal } from './RegistrationFormModal';
import { SimplifiedEnrollmentModal } from './SimplifiedEnrollmentModal';
import { downloadRegistrationForm, formatFileSize } from '../lib/registrationFormHelper';

interface Props {
  students: Student[];
  activeYear: string;
  isPublic?: boolean;
  onOpenEnrollment?: (sessionId: string) => void;
}

type CalendarEvent = {
  id: string;
  type: 'session' | 'convocation';
  date: string;
  title: string;
  studentIds: string[];
  raw: Session | Convocation;
};

// Helper for exact date matching without UTC timezone shift
function isEventOnDay(eventDate: string, day: Date): boolean {
  if (!eventDate) return false;
  const dayStr = format(day, 'yyyy-MM-dd');
  const cleanDateStr = eventDate.slice(0, 10);
  return cleanDateStr === dayStr;
}

export const CalendarView: React.FC<Props> = ({ students, activeYear, isPublic, onOpenEnrollment }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Mode d'affichage : 'agenda' (Planning / Liste adapté smartphone) ou 'month' (Grille mensuelle)
  // Sur smartphone (< 768px) ou sur lien public partagé, privilégie immédiatement le mode planning fluide
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>(() => {
    if (typeof window !== 'undefined' && (window.innerWidth < 768 || isPublic)) {
      return 'agenda';
    }
    return 'month';
  });
  
  // Formulaire d'inscription téléchargeable
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormDoc | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  
  // Session en cours d'inscription (Fenêtre d'inscription simplifiée)
  const [enrollingSession, setEnrollingSession] = useState<Session | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  
  const [newEventName, setNewEventName] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventMeetingTime, setNewEventMeetingTime] = useState('');
  const [newEventMeetingLocation, setNewEventMeetingLocation] = useState('');
  const [newEventCafeteriaTime, setNewEventCafeteriaTime] = useState('');
  const [newEventReturnTime, setNewEventReturnTime] = useState('');
  const [newEventNeedSnack, setNewEventNeedSnack] = useState(false);
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventRequireLicense, setNewEventRequireLicense] = useState(false);
  const [newEventRequireParentalAuth, setNewEventRequireParentalAuth] = useState(false);
  const [newEventRequireSwimmingCertificate, setNewEventRequireSwimmingCertificate] = useState(false);
  const [newEventMaxParticipants, setNewEventMaxParticipants] = useState<number | ''>('');
  const [newEventRegistrationOpenDate, setNewEventRegistrationOpenDate] = useState('');
  const [newEventRegistrationCloseDate, setNewEventRegistrationCloseDate] = useState('');
  const [newEventIsTeamRegistration, setNewEventIsTeamRegistration] = useState(false);
  const [newEventTeamSize, setNewEventTeamSize] = useState<number | ''>(4);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [newEventGenerateConvocation, setNewEventGenerateConvocation] = useState(false);

  // Événements du mois affiché, triés chronologiquement pour le mode planning/mobile
  const currentMonthEvents = useMemo(() => {
    return events
      .filter(e => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return isSameMonth(d, currentMonth);
      })
      .sort((a, b) => {
        const dDiff = a.date.localeCompare(b.date);
        if (dDiff !== 0) return dDiff;
        const timeA = a.type === 'session' ? (a.raw as Session).time : (a.raw as Convocation).departureDate?.includes('T') ? (a.raw as Convocation).departureDate.split('T')[1] : '';
        const timeB = b.type === 'session' ? (b.raw as Session).time : (b.raw as Convocation).departureDate?.includes('T') ? (b.raw as Convocation).departureDate.split('T')[1] : '';
        return (timeA || '').localeCompare(timeB || '');
      });
  }, [events, currentMonth]);

  const openEditModal = (event: CalendarEvent) => {
    if (event.type !== 'session') return;
    const session = event.raw as Session;
    setNewEventName(session.name || '');
    setNewEventTime(session.time || '');
    setNewEventEndTime(session.endTime || '');
    setNewEventLocation(session.location || '');
    setNewEventMeetingTime(session.meetingTime || '');
    setNewEventMeetingLocation(session.meetingLocation || '');
    setNewEventCafeteriaTime(session.cafeteriaTime || '');
    setNewEventReturnTime(session.returnTime || '');
    setNewEventNeedSnack(session.needSnack || false);
    setNewEventDescription(session.description || '');
    setNewEventRequireLicense(session.requireLicense ?? false);
    setNewEventRequireParentalAuth(!!session.requireParentalAuth);
    setNewEventRequireSwimmingCertificate(!!session.requireSwimmingCertificate);
    setNewEventMaxParticipants(session.maxParticipants || '');
    setNewEventRegistrationOpenDate(session.registrationOpenDate || '');
    setNewEventRegistrationCloseDate(session.registrationCloseDate || '');
    setNewEventIsTeamRegistration(!!session.isTeamRegistration);
    setNewEventTeamSize(session.teamSize || 4);
    setNewEventGenerateConvocation(!!session.convocationId);
    setClickedDate(new Date(session.date));
    setEditingEventId(event.id);
    setIsCreatingEvent(true);
    setSelectedEvent(null);
  };

  const loadCalendarData = useCallback(async () => {
    try {
      const [convos, sessions] = await Promise.all([
        getConvocationsList(activeYear),
        getSessionsList(activeYear)
      ]);

      const convoEvents: CalendarEvent[] = convos
        .filter(c => c.departureDate && !isNaN(new Date(c.departureDate).getTime()) && !c.sessionId)
        .map(c => ({
          id: c.id,
          type: 'convocation' as const,
          date: c.departureDate,
          title: c.competitionName || 'Convocation',
          studentIds: c.studentIds || [],
          raw: c
        }));

      const sessionEvents: CalendarEvent[] = sessions
        .filter(s => s.date && !isNaN(new Date(s.date).getTime()))
        .map(s => ({
          id: s.id,
          type: 'session' as const,
          date: s.date,
          title: s.name || 'Séance',
          studentIds: s.presentStudentIds || [],
          raw: s
        }));

      setEvents([...convoEvents, ...sessionEvents]);
    } catch (err) {
      console.warn("Erreur chargement calendrier:", err);
    } finally {
      setLoading(false);
    }
  }, [activeYear]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Chargement du formulaire d'inscription officiel
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const form = await getAppSetting<RegistrationFormDoc>('registrationForm');
        setRegistrationForm(form);
      } catch (err) {
        console.warn("Erreur chargement formulaire inscription:", err);
      }
    };
    fetchForm();
  }, []);

  // Gestion de la touche Échap pour fermer immédiatement les fenêtres modales
  useEffect(() => {
    if (!isCreatingEvent && !selectedEvent) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreatingEvent(false);
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreatingEvent, selectedEvent]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const handleDayClick = (day: Date) => {
    if (isPublic) return;
    setClickedDate(day);
    setNewEventName('');
    setNewEventTime('13:30');
    setNewEventEndTime('');
    setNewEventLocation('');
    setNewEventMeetingTime('');
    setNewEventMeetingLocation('');
    setNewEventCafeteriaTime('');
    setNewEventReturnTime('');
    setNewEventNeedSnack(false);
    setNewEventDescription('');
    setNewEventRequireLicense(false);
    setNewEventRequireParentalAuth(false);
    setNewEventRequireSwimmingCertificate(false);
    setNewEventMaxParticipants('');
    setNewEventRegistrationOpenDate('');
    setNewEventRegistrationCloseDate('');
    setNewEventIsTeamRegistration(false);
    setNewEventTeamSize(4);
    setNewEventGenerateConvocation(false);
    setEditingEventId(null);
    setIsCreatingEvent(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickedDate) return;
    
    setIsSavingEvent(true);
    try {
      if (editingEventId) {
        const updateData = {
          name: newEventName || 'Séance',
          date: format(clickedDate, 'yyyy-MM-dd'),
          time: newEventTime || '13:30',
          endTime: newEventEndTime,
          location: newEventLocation,
          meetingTime: newEventMeetingTime,
          meetingLocation: newEventMeetingLocation,
          cafeteriaTime: newEventCafeteriaTime,
          returnTime: newEventReturnTime,
          needSnack: newEventNeedSnack,
          description: newEventDescription,
          requireLicense: newEventRequireLicense,
          requireParentalAuth: newEventRequireParentalAuth,
          requireSwimmingCertificate: newEventRequireSwimmingCertificate,
          maxParticipants: newEventMaxParticipants ? Number(newEventMaxParticipants) : null,
          registrationOpenDate: newEventRegistrationOpenDate || null,
          registrationCloseDate: newEventRegistrationCloseDate || null,
          isTeamRegistration: newEventIsTeamRegistration,
          teamSize: newEventIsTeamRegistration ? (Number(newEventTeamSize) || 4) : null
        };
        await saveSessionApi({ ...updateData, id: editingEventId });
        
        const sessionDoc = events.find(ev => ev.id === editingEventId)?.raw as Session;
        if (sessionDoc?.convocationId) {
          const convUpdateData = {
            id: sessionDoc.convocationId,
            competitionName: newEventName || 'Séance',
            departureDate: format(clickedDate, 'yyyy-MM-dd') + (newEventTime ? `T${newEventTime}` : 'T13:30'),
            returnDate: format(clickedDate, 'yyyy-MM-dd') + (newEventEndTime ? `T${newEventEndTime}` : 'T17:00'),
            needSnack: newEventNeedSnack ? 'OUI' : 'NON',
            meetingTime: newEventMeetingTime,
            meetingLocation: newEventMeetingLocation,
            cafeteriaTime: newEventCafeteriaTime,
            returnTime: newEventReturnTime
          };
          await saveConvocationApi(convUpdateData);
        }
      } else {
        const sessionData: Partial<Session> = {
          name: newEventName || 'Séance',
          date: format(clickedDate, 'yyyy-MM-dd'),
          time: newEventTime || '13:30',
          endTime: newEventEndTime,
          location: newEventLocation,
          meetingTime: newEventMeetingTime,
          meetingLocation: newEventMeetingLocation,
          cafeteriaTime: newEventCafeteriaTime,
          returnTime: newEventReturnTime,
          needSnack: newEventNeedSnack,
          description: newEventDescription,
          requireLicense: newEventRequireLicense,
          requireParentalAuth: newEventRequireParentalAuth,
          requireSwimmingCertificate: newEventRequireSwimmingCertificate,
          maxParticipants: newEventMaxParticipants ? Number(newEventMaxParticipants) : undefined,
          registrationOpenDate: newEventRegistrationOpenDate || undefined,
          registrationCloseDate: newEventRegistrationCloseDate || undefined,
          isTeamRegistration: newEventIsTeamRegistration,
          teamSize: newEventIsTeamRegistration ? (Number(newEventTeamSize) || 4) : undefined,
          teams: [],
          enrolledStudentIds: [],
          presentStudentIds: [],
          schoolYear: activeYear
        };
        const sessionResult = await saveSessionApi(sessionData);
        
        if (newEventGenerateConvocation && sessionResult?.id) {
           const convData: Partial<Convocation> = {
              competitionName: newEventName || 'Séance',
              departureDate: format(clickedDate, 'yyyy-MM-dd') + (newEventTime ? `T${newEventTime}` : 'T13:30'),
              returnDate: format(clickedDate, 'yyyy-MM-dd') + (newEventEndTime ? `T${newEventEndTime}` : 'T17:00'),
              guides: '',
              needSnack: newEventNeedSnack ? 'OUI' : 'NON',
              needPicnic: 'NON',
              schoolYear: activeYear,
              studentIds: [],
              sessionId: sessionResult.id,
              meetingTime: newEventMeetingTime,
              meetingLocation: newEventMeetingLocation,
              cafeteriaTime: newEventCafeteriaTime,
              returnTime: newEventReturnTime
           };
           try {
             const convResult = await saveConvocationApi(convData);
             if (convResult?.id) {
               await saveSessionApi({ id: sessionResult.id, convocationId: convResult.id });
             }
           } catch (convErr) {
             console.warn('Convocation creation warning (session was saved):', convErr);
           }
        }
      }
      setIsCreatingEvent(false);
      setEditingEventId(null);
      await loadCalendarData();
    } catch (err: any) {
      console.error('Erreur enregistrement séance calendrier:', err);
      alert('Erreur lors de l\'enregistrement de la séance : ' + (err?.message || 'Erreur inattendue'));
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cet événement (${event.title}) ? Cette action est irréversible.`)) {
      try {
        if (event.type === 'session') {
          await deleteSessionApi(event.id);
          if ((event.raw as Session).convocationId) {
            await deleteConvocationApi((event.raw as Session).convocationId!);
          }
        } else {
          await deleteConvocationApi(event.id);
        }
        
        setSelectedEvent(null);
        await loadCalendarData();
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de l\'événement.');
      }
    }
  };

  const printDocument = (type: 'liste' | 'convocation' | 'projet', eventOverride?: CalendarEvent) => {
    if (isPublic) return; // Sécurité absolue : les listings sont réservés exclusivement à l'administrateur
    const targetEvent = eventOverride || selectedEvent;
    if (!targetEvent) return;
    
    const eventStudents = students.filter(s => targetEvent.studentIds.includes(s.id));
    const dateStr = format(new Date(targetEvent.date), 'dd/MM/yyyy');
    
    let title = '';
    if (type === 'liste') title = `Liste d'appel - ${targetEvent.title}`;
    if (type === 'convocation') title = `Convocation UNSS`;
    if (type === 'projet') title = `Fiche Projet - ${targetEvent.title}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .meta { font-size: 16px; color: #64748b; margin-bottom: 32px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            .footer { margin-top: 50px; font-size: 14px; color: #64748b; text-align: center; }
            
            /* Specific layouts */
            .box { border: 1px solid #cbd5e1; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
            .signature { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 10px; width: 200px; text-align: center; float: right; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            Date : <strong>${dateStr}</strong><br/>
            Événement : <strong>${targetEvent.title}</strong><br/>
            Effectif : <strong>${eventStudents.length} élèves</strong>
          </div>
    `);

    if (type === 'convocation') {
      const isSession = targetEvent.type === 'session';
      const eventDetails = isSession ? targetEvent.raw as Session : null;
      const convoDetails = !isSession ? targetEvent.raw as Convocation : null;
      
      const meetingTime = (isSession ? eventDetails?.meetingTime : convoDetails?.meetingTime) || 'Non spécifiée';
      const meetingLocation = (isSession ? eventDetails?.meetingLocation : convoDetails?.meetingLocation) || 'Non spécifié';
      const returnTime = (isSession ? eventDetails?.returnTime : convoDetails?.returnTime) || (isSession ? eventDetails?.endTime : (convoDetails?.returnDate ? format(new Date(convoDetails.returnDate), 'HH:mm') : 'Non spécifiée'));
      const cafeteriaTime = (isSession ? eventDetails?.cafeteriaTime : convoDetails?.cafeteriaTime) || '';
      const snack = isSession ? (eventDetails?.needSnack ? 'Oui' : 'Non') : (convoDetails?.needSnack || 'Non');
      
      printWindow.document.write(`
        <div class="box">
          <p><strong>Lieu du RDV :</strong> ${meetingLocation}</p>
          <p><strong>Heure du RDV :</strong> ${meetingTime}</p>
          ${cafeteriaTime ? `<p><strong>Heure de passage au self :</strong> ${cafeteriaTime}</p>` : ''}
          <p><strong>Heure de retour :</strong> ${returnTime}</p>
          <p><strong>Goûter à prévoir :</strong> ${snack}</p>
        </div>
      `);
      
      if (!isPublic) {
        printWindow.document.write(`
          <p>Veuillez trouver ci-dessous la liste des élèves convoqués pour cet événement.</p>
        `);
      } else {
         printWindow.document.write(`
          <p>Veuillez vous présenter à l'heure indiquée.</p>
        `);
      }
    }

    if (type === 'projet') {
      printWindow.document.write(`
        <div class="box">
          <h3>Objectifs et Déroulement</h3>
          <p style="min-height: 150px; color: #94a3b8;">(À remplir...)</p>
        </div>
      `);
    }

    printWindow.document.write(`
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                ${!isPublic ? '<th>Classe</th>' : ''}
                ${type === 'liste' && !isPublic ? '<th>Présent</th><th>Observation</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${eventStudents.map(s => `
                <tr>
                  <td><strong>${s.lastName || ''}</strong></td>
                  <td>${s.firstName || ''}</td>
                  ${!isPublic ? `<td>${s.classGroup || ''}</td>` : ''}
                  ${type === 'liste' && !isPublic ? '<td></td><td></td>' : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="signature">Signature / Cachet</div>
          
          <div style="clear:both;"></div>
          <div class="footer">Généré le ${format(new Date(), 'dd/MM/yyyy')} - AS Rosa Parks</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    // Use a slight timeout to ensure styles load before printing
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('public', 'calendar');
    navigator.clipboard.writeText(url.toString());
    alert('Lien du calendrier public copié dans le presse-papiers !');
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-medium">Chargement du calendrier...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header adapté smartphone & desktop */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 capitalize tracking-tight truncate">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 truncate">
                {isPublic 
                  ? "Séances & compétitions — AS Lycée Rosa Parks" 
                  : "Gérez les séances et convocations"}
              </p>
            </div>
          </div>

          {/* Navigation Mois (Précédent / Aujourd'hui / Suivant) */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={prevMonth} 
              className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer" 
              title="Mois précédent"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="hidden md:inline-flex px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              Aujourd'hui
            </button>
            <button 
              onClick={nextMonth} 
              className="p-2 sm:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer" 
              title="Mois suivant"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barre d'outils mobile : Onglets Planning / Mois & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          {/* Sélecteur de vue tactile pour smartphone */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Planning ({currentMonthEvents.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Mois</span>
            </button>
          </div>

          {/* Boutons d'actions */}
          <div className="flex items-center gap-2">
            {isPublic && (
              <button
                type="button"
                onClick={() => downloadRegistrationForm(registrationForm)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
                title="Télécharger la fiche d'inscription"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Télécharger la fiche d'inscription</span>
                <span className="sm:hidden">Fiche d'adhésion</span>
              </button>
            )}

            {!isPublic && (
              <>
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition-colors"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Formulaire AS</span>
                </button>
                <button 
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-xs transition-colors"
                  title="Partager le calendrier"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Partager</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bannière de téléchargement du formulaire sur le calendrier partagé */}
      {isPublic && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-2xl p-4 sm:p-6 text-white border border-indigo-800/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Adhésion & Licence UNSS
                </span>
                <span className="text-[11px] text-slate-300 hidden sm:inline">
                  {registrationForm?.fileName ? "● Formulaire officiel actif" : "● Fiche d'adhésion officielle"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug tracking-tight">
                Fiche d'inscription & adhésion à l'AS
              </h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                À imprimer, faire signer et remettre aux professeurs d'EPS avec le règlement pour participer aux activités.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => downloadRegistrationForm(registrationForm)}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>
                {registrationForm?.fileName 
                  ? `Télécharger le document (${formatFileSize(registrationForm.fileSize)})` 
                  : "Télécharger la fiche d'inscription"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* En mode Enseignant/Admin : Récapitulatif du document en ligne */}
      {!isPublic && (
        <div className="bg-white px-5 py-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-800">Formulaire d'inscription sur le calendrier partagé : </span>
              {registrationForm ? (
                <span className="text-slate-600">
                  <strong className="text-slate-900">{registrationForm.fileName}</strong> ({formatFileSize(registrationForm.fileSize)}) — Mis en ligne le {new Date(registrationForm.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              ) : (
                <span className="text-amber-700">Aucun fichier personnalisé téléversé (modèle standard proposé par défaut).</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadRegistrationForm(registrationForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 rounded-lg font-semibold transition-colors"
              title="Tester le téléchargement du formulaire actuel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tester le téléchargement</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFormModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-xs"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{registrationForm ? "Remplacer le fichier" : "Charger le fichier"}</span>
            </button>
          </div>
        </div>
      )}

      {/* VUE 1 : VUE AGENDA / PLANNING (PARFAITEMENT ADAPTÉE AUX SMARTPHONES) */}
      {viewMode === 'agenda' ? (
        <div className="space-y-3 mb-6">
          {currentMonthEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Aucun événement ce mois-ci</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Il n'y a pas encore de séance ou de convocation enregistrée pour {format(currentMonth, 'MMMM yyyy', { locale: fr })}.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Revenir au mois en cours
                </button>
              </div>
            </div>
          ) : (
            currentMonthEvents.map(event => {
              const isSession = event.type === 'session';
              const rawSession = isSession ? (event.raw as Session) : null;
              const rawConv = !isSession ? (event.raw as Convocation) : null;
              const eventDateObj = new Date(event.date);
              const isPast = new Date(event.date).setHours(23, 59, 59, 999) < new Date().getTime();
              const isFull = rawSession?.maxParticipants !== undefined && ((rawSession.enrolledStudentIds || []).length >= rawSession.maxParticipants);

              return (
                <div
                  key={event.id}
                  onClick={() => {
                    if (isPublic && isSession && rawSession) {
                      setEnrollingSession(rawSession);
                    } else {
                      setSelectedEvent(event);
                    }
                  }}
                  className={`bg-white rounded-2xl border-2 transition-all p-3.5 sm:p-4 shadow-xs hover:shadow-md cursor-pointer active:scale-[0.99] ${
                    isSession ? 'border-indigo-100 hover:border-indigo-400' : 'border-emerald-100 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Badge Date bien visible pour le scroll sur smartphone */}
                    <div className="shrink-0 w-13 sm:w-16 py-2 bg-slate-100/90 rounded-xl text-center border border-slate-200/80 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {format(eventDateObj, 'EEE', { locale: fr })}
                      </span>
                      <span className="text-lg sm:text-xl font-black text-slate-900 leading-none my-0.5">
                        {format(eventDateObj, 'dd')}
                      </span>
                      <span className="text-[9px] font-bold text-indigo-700 uppercase">
                        {format(eventDateObj, 'MMM', { locale: fr })}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isSession ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isSession ? 'Séance' : 'Convocation'}
                        </span>
                        {rawSession?.isTeamRegistration && (
                          <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Users className="w-3 h-3" /> Tournoi ({rawSession.teamSize || 4})
                          </span>
                        )}
                        {isPast && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            Passé
                          </span>
                        )}
                        {isFull && !isPast && (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                            Complet
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {event.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{isSession ? `${rawSession?.time || ''}${rawSession?.endTime ? ` - ${rawSession.endTime}` : ''}` : (rawConv?.departureDate?.includes('T') ? rawConv.departureDate.split('T')[1] : '')}</span>
                        </span>
                        {(rawSession?.location || rawConv?.guides) && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px] sm:max-w-none">{rawSession?.location || rawConv?.guides}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end justify-between self-stretch">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        👥 {event.studentIds.length} {rawSession?.maxParticipants ? `/ ${rawSession.maxParticipants}` : ''}
                      </span>

                      {isPublic && isSession && !isPast && !isFull && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (rawSession) {
                              setEnrollingSession(rawSession);
                            }
                          }}
                          className="mt-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>M'inscrire</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* VUE 2 : GRILLE MENSUELLE CLASSIQUE (OPTIMISÉE MOBILE) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-200/50 overflow-hidden mb-6">
          <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/50">
            {weekDays.map(day => (
              <div key={day} className="py-2.5 sm:py-3.5 text-center text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.charAt(0)}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((day, dayIdx) => {
              const dayEvents = events.filter(e => isEventOnDay(e.date, day)).sort((a, b) => {
                const timeA = a.type === 'session' ? (a.raw as Session).time : (a.raw as Convocation).departureDate?.includes('T') ? (a.raw as Convocation).departureDate.split('T')[1] : '';
                const timeB = b.type === 'session' ? (b.raw as Session).time : (b.raw as Convocation).departureDate?.includes('T') ? (b.raw as Convocation).departureDate.split('T')[1] : '';
                return (timeA || '').localeCompare(timeB || '');
              });
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <div 
                  key={day.toString()} 
                  onClick={() => handleDayClick(day)}
                  className={`group min-h-[75px] sm:min-h-[140px] p-1 sm:p-2 border-b border-r border-slate-100/80 transition-all duration-200 ${!isPublic ? 'cursor-pointer hover:bg-slate-50/80' : 'cursor-pointer sm:cursor-default'}
                    ${!isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'bg-white'}
                    ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-0.5 sm:mb-1.5">
                    <div className={`text-xs sm:text-sm font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors duration-200
                      ${isSameDay(day, new Date()) 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2' 
                        : 'text-slate-600 group-hover:text-indigo-600 group-hover:bg-indigo-50'
                      }
                    `}>
                      {format(day, 'd')}
                    </div>
                    {!isPublic && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all rounded-lg cursor-pointer"
                        title="Ajouter un événement"
                      >
                        <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-1 mt-1 sm:mt-2">
                    {dayEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPublic && event.type === 'session') {
                            setEnrollingSession(event.raw as Session);
                          } else {
                            setSelectedEvent(event);
                          }
                        }}
                        className={`w-full text-left px-1.5 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold truncate transition-all duration-200 border cursor-pointer
                          ${event.type === 'session' 
                            ? 'bg-indigo-50/90 text-indigo-700 border-indigo-200/70 hover:bg-indigo-100 hover:border-indigo-300 shadow-2xs' 
                            : 'bg-emerald-50/90 text-emerald-700 border-emerald-200/70 hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs'
                          }
                        `}
                        title={event.title}
                      >
                        <span className="truncate block">{event.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 items-center text-sm font-semibold text-slate-600 px-4 py-3 bg-white rounded-xl border border-slate-200/80 shadow-sm inline-flex mb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-indigo-500 shadow-sm"></div>
          <span>Séances & Entraînements</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-sm"></div>
          <span>Convocations & Évènements</span>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEvent(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden border border-slate-200/50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 sm:p-8 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest
                    ${selectedEvent.type === 'session' ? 'bg-indigo-100/80 text-indigo-700' : 'bg-emerald-100/80 text-emerald-700'}
                  `}>
                    {selectedEvent.type === 'session' ? 'Séance' : 'Convocation'}
                  </span>
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).isTeamRegistration && (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest bg-purple-100 text-purple-800 border border-purple-200">
                      🏆 En équipe ({(selectedEvent.raw as Session).teamSize || 4} élèves)
                    </span>
                  )}
                  {(selectedEvent.raw as any).targetAudience === 'adults' && (
                    <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg bg-rose-100 text-rose-700">
                      Adultes uniquement
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-500">
                    {format(new Date(selectedEvent.date), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mt-3 mb-3 tracking-tight">{selectedEvent.title}</h2>
                {selectedEvent.type === 'session' && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {(selectedEvent.raw as Session).requireLicense && (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                        🪪 Licence requise
                      </span>
                    )}
                    {(selectedEvent.raw as Session).requireParentalAuth && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                        📄 AP requise
                      </span>
                    )}
                    {(selectedEvent.raw as Session).requireSwimmingCertificate && (
                      <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-cyan-200">
                        🏊 Savoir nager requis
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).time && (
                    <p className="text-slate-600 font-semibold text-sm flex items-center gap-2">
                      <span className="text-lg">🕒</span> {(selectedEvent.raw as Session).time} 
                      {(selectedEvent.raw as Session).endTime ? ` - ${(selectedEvent.raw as Session).endTime}` : ''}
                    </p>
                  )}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).location && (
                    <p className="text-slate-600 font-semibold text-sm flex items-center gap-2">
                      <span className="text-lg">📍</span> {(selectedEvent.raw as Session).location}
                    </p>
                  )}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).needSnack && (
                    <p className="text-amber-600 font-bold text-sm flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg w-fit mt-1">
                      <span className="text-lg">🍪</span> Goûter à prévoir
                    </p>
                  )}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).description && (
                    <p className="text-slate-600 font-medium text-sm mt-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-sm inline-block">
                      {(selectedEvent.raw as Session).description}
                    </p>
                  )}
                  
                  {selectedEvent.type === 'convocation' && (selectedEvent.raw as Convocation).needSnack === 'OUI' && (
                    <p className="text-amber-600 font-medium text-sm">🍪 Goûter à prévoir</p>
                  )}
                  {selectedEvent.type === 'convocation' && (selectedEvent.raw as Convocation).needPicnic === 'OUI' && (
                    <p className="text-orange-600 font-medium text-sm">🥪 Pique-nique à prévoir</p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-slate-50 overscroll-contain">
              {!isPublic && (
                <>
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6">
                    <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-slate-400" />
                      Générer des documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button 
                        onClick={() => printDocument('liste')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors border border-slate-200"
                      >
                        <Users className="w-4 h-4" />
                        Liste d'appel
                      </button>
                      <button 
                        onClick={() => printDocument('convocation')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors border border-emerald-200"
                      >
                        <FileText className="w-4 h-4" />
                        Convocation
                      </button>
                      <button 
                        onClick={() => printDocument('projet')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors border border-indigo-200"
                      >
                        <FileText className="w-4 h-4" />
                        Fiche Projet
                      </button>
                    </div>
                  </div>
                  
                  {/* Si séance par équipe : Affichage des équipes inscrites */}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).isTeamRegistration && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-800 mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          Équipes enregistrées ({((selectedEvent.raw as Session).teams || []).length})
                        </span>
                        <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
                          {(selectedEvent.raw as Session).teamSize || 4} élèves / équipe
                        </span>
                      </h3>

                      {((selectedEvent.raw as Session).teams || []).length === 0 ? (
                        <p className="text-sm text-slate-500 italic p-4 bg-white rounded-xl border border-slate-200 text-center">
                          Aucune équipe n'est encore inscrite pour cette séance.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {((selectedEvent.raw as Session).teams || []).map((team, tIdx) => (
                            <div key={team.id || tIdx} className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-xs">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center font-black">
                                    {tIdx + 1}
                                  </span>
                                  <span>{team.name}</span>
                                </h4>
                                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                                  {team.studentIds?.length || 0} / {(selectedEvent.raw as Session).teamSize || 4} élèves
                                </span>
                              </div>
                              <ul className="space-y-1 text-xs text-slate-600">
                                {(team.studentIds || []).map(sid => {
                                  const st = students.find(s => s.id === sid);
                                  return (
                                    <li key={sid} className="flex items-center justify-between py-0.5 border-b border-slate-50 last:border-b-0">
                                      <span className="font-medium text-slate-800">
                                        {st ? `${st.lastName} ${st.firstName}` : sid}
                                      </span>
                                      {st?.classGroup && (
                                        <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                                          {st.classGroup}
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Tous les élèves inscrits ({selectedEvent.studentIds.length})
                    </h3>
                    
                    {selectedEvent.studentIds.length === 0 ? (
                      <p className="text-sm text-slate-500 italic p-4 bg-white rounded-xl border border-slate-200 text-center">
                        Aucun élève enregistré pour cet événement.
                      </p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 font-semibold text-slate-600">Nom</th>
                              <th className="px-4 py-3 font-semibold text-slate-600">Prénom</th>
                              <th className="px-4 py-3 font-semibold text-slate-600">Classe</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {students
                              .filter(s => selectedEvent.studentIds.includes(s.id))
                              .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                              .map(student => (
                                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-2.5 font-bold text-slate-900">{student.lastName}</td>
                                  <td className="px-4 py-2.5 text-slate-600">{student.firstName}</td>
                                  <td className="px-4 py-2.5 text-slate-600">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                                      {student.classGroup}
                                    </span>
                                  </td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {isPublic && (
                <div className="text-center py-10">
                  <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium text-lg">Événement planifié</p>
                  <p className="text-slate-500 text-sm mb-6">Plus d'informations auprès de l'équipe encadrante.</p>
                  
                  {(() => {
                    const isSession = selectedEvent.type === 'session';
                    const isConvocation = selectedEvent.type === 'convocation';
                    
                    let isClosed = false;
                    let isFull = false;
                    
                    if (isSession) {
                      const session = selectedEvent.raw as Session;
                      isFull = session.maxParticipants !== undefined && (session.enrolledStudentIds || []).length >= session.maxParticipants;
                      const isPast = new Date(selectedEvent.date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                      isClosed = isFull || isPast;
                    }
                    
                    if (isSession && !isClosed) {
                      const sess = selectedEvent.raw as Session;
                      return (
                        <button 
                          onClick={() => {
                            setSelectedEvent(null);
                            setEnrollingSession(sess);
                          }}
                          className={`inline-flex items-center gap-2 px-6 py-3 ${sess.isTeamRegistration ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'} text-white rounded-xl font-bold transition-colors shadow-sm cursor-pointer`}
                        >
                          <Users className="w-5 h-5" />
                          {sess.isTeamRegistration ? `Inscrire une équipe (${sess.teamSize || 4} élèves)` : "Je m'inscris à cette séance"}
                        </button>
                      );
                    }
                    
                    if (isConvocation) {
                      return (
                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-sm max-w-md mx-auto">
                          <p className="font-bold mb-1">Rencontre / Compétition UNSS</p>
                          <p className="text-xs text-indigo-700 leading-relaxed">
                            Événement sur convocation nominative. Les convocations et listings officiels sont transmis directement par l'enseignant responsable.
                          </p>
                        </div>
                      );
                    }

                    if (isSession && isClosed) {
                      return (
                        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-sm max-w-md mx-auto font-medium">
                          {isFull 
                            ? "Les inscriptions en ligne sont closes (séance complète)." 
                            : "Les inscriptions en ligne pour cette séance sont closes."}
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-between items-center shrink-0 bg-white">
              {!isPublic ? (
                <div className="flex gap-2">
                  {selectedEvent.type === 'session' && (
                    <button
                      onClick={() => openEditModal(selectedEvent)}
                      className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors flex items-center gap-2"
                      title="Modifier l'événement"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Modifier</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteEvent(selectedEvent)}
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center gap-2"
                    title="Supprimer l'événement"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {isCreatingEvent && clickedDate && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreatingEvent(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header fixe toujours visible avec bouton de fermeture croix */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                  <PlusCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {editingEventId ? 'Modifier la Séance' : 'Créer une Séance'}
                  </h2>
                  <p className="text-xs text-indigo-600 font-semibold mt-0.5 capitalize">
                    {format(clickedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingEvent(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="Fermer la fenêtre (Échap)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50/60 rounded-lg text-indigo-950 text-xs font-semibold border border-indigo-100">
                  <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Date :</span>
                  <span className="capitalize text-indigo-700 font-bold">{format(clickedDate, 'EEEE d MMMM yyyy', { locale: fr })}</span>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de la séance</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    placeholder="Ex: Entraînement Futsal"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Heure de RDV</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventMeetingTime}
                      onChange={e => setNewEventMeetingTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu de RDV</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventMeetingLocation}
                      onChange={e => setNewEventMeetingLocation(e.target.value)}
                      placeholder="Ex: Gymnase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Passage au self</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventCafeteriaTime}
                      onChange={e => setNewEventCafeteriaTime(e.target.value)}
                      title="Heure de passage au self (optionnelle)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Heure de retour</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventReturnTime}
                      onChange={e => setNewEventReturnTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Début (Séance) *</label>
                    <input 
                      type="time" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventTime}
                      onChange={e => setNewEventTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fin (Séance)</label>
                    <input 
                      type="time" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventEndTime}
                      onChange={e => setNewEventEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu de la séance</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={newEventLocation}
                    onChange={e => setNewEventLocation(e.target.value)}
                    placeholder="Ex: Stade municipal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Informations (Optionnel)</label>
                  <textarea 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={newEventDescription}
                    onChange={e => setNewEventDescription(e.target.value)}
                    placeholder="Ex: Penser à prendre les maillots..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Max Inscrits</label>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      value={newEventMaxParticipants}
                      onChange={e => setNewEventMaxParticipants(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="Illimité"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ouverture inscript.</label>
                    <input 
                      type="datetime-local" 
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      value={newEventRegistrationOpenDate}
                      onChange={e => setNewEventRegistrationOpenDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fermeture inscript.</label>
                    <input 
                      type="datetime-local" 
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                      value={newEventRegistrationCloseDate}
                      onChange={e => setNewEventRegistrationCloseDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <input 
                      type="checkbox" 
                      id="needSnackCal"
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                      checked={newEventNeedSnack}
                      onChange={e => setNewEventNeedSnack(e.target.checked)}
                    />
                    <label htmlFor="needSnackCal" className="text-xs font-semibold text-amber-900 cursor-pointer">
                      Prévoir un goûter
                    </label>
                  </div>

                  {/* Éléments nécessaires pour pouvoir s'inscrire */}
                  <div className="bg-slate-50/90 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Éléments nécessaires pour pouvoir s'inscrire
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">Contrôle inscription</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${newEventRequireLicense ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox" 
                          id="requireLicenseCal"
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-0.5"
                          checked={newEventRequireLicense}
                          onChange={e => setNewEventRequireLicense(e.target.checked)}
                        />
                        <div>
                          <span className="text-xs font-bold block">Numéro de licence</span>
                          <span className="text-[10px] text-slate-500 leading-tight block">Licence AS obligatoire</span>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${newEventRequireParentalAuth ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox" 
                          id="requireParentalAuthCal"
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-0.5"
                          checked={newEventRequireParentalAuth}
                          onChange={e => setNewEventRequireParentalAuth(e.target.checked)}
                        />
                        <div>
                          <span className="text-xs font-bold block">Autorisation parentale</span>
                          <span className="text-[10px] text-slate-500 leading-tight block">AP validée exigée</span>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${newEventRequireSwimmingCertificate ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                        <input 
                          type="checkbox" 
                          id="requireSwimmingCal"
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 mt-0.5"
                          checked={newEventRequireSwimmingCertificate}
                          onChange={e => setNewEventRequireSwimmingCertificate(e.target.checked)}
                        />
                        <div>
                          <span className="text-xs font-bold block">Savoir nager</span>
                          <span className="text-[10px] text-slate-500 leading-tight block">Attestation exigée</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Section Inscription en équipe */}
                  <div className="bg-purple-50/80 p-3 rounded-xl border border-purple-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        id="isTeamRegCal"
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                        checked={newEventIsTeamRegistration}
                        onChange={e => setNewEventIsTeamRegistration(e.target.checked)}
                      />
                      <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        Inscription en équipe (Tournoi / Raid / Relais...)
                      </span>
                    </label>

                    {newEventIsTeamRegistration && (
                      <div className="pl-6 pt-1 space-y-1.5 border-t border-purple-200/60 mt-1">
                        <div className="flex items-center gap-2">
                          <label htmlFor="teamSizeCal" className="text-xs font-bold text-purple-900 whitespace-nowrap">
                            Nombre d'élèves requis par équipe :
                          </label>
                          <input 
                            type="number"
                            id="teamSizeCal"
                            min="2"
                            max="20"
                            required={newEventIsTeamRegistration}
                            className="w-20 px-2.5 py-1 text-xs font-bold text-purple-900 bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={newEventTeamSize}
                            onChange={e => setNewEventTeamSize(e.target.value ? parseInt(e.target.value) : '')}
                          />
                        </div>
                        <p className="text-[11px] text-purple-700 leading-tight">
                          L'inscription de l'équipe ne pourra être validée que lorsque celle-ci comptera exactement <strong>{newEventTeamSize || 4} élèves</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {!editingEventId && (
                    <div className="flex items-center gap-2 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                      <input 
                        type="checkbox" 
                        id="generateConvocation"
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        checked={newEventGenerateConvocation}
                        onChange={e => setNewEventGenerateConvocation(e.target.checked)}
                      />
                      <label htmlFor="generateConvocation" className="text-xs font-semibold text-indigo-900 cursor-pointer">
                        Intégrer dans la gestion des convocations
                      </label>
                    </div>
                  )}
                  {editingEventId && newEventGenerateConvocation && (
                    <div className="flex items-center gap-2 bg-indigo-50 p-2.5 rounded-lg border border-indigo-200">
                      <span className="text-xs font-semibold text-indigo-900">
                        Cette séance est liée à une convocation.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer fixe toujours visible et ancré avec les boutons d'action */}
              <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-slate-50/95 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreatingEvent(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200/80 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
                  disabled={isSavingEvent}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="flex items-center gap-2 px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-lg font-bold text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingEventId ? 'Enregistrer les modifications' : 'Créer la séance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de gestion du formulaire d'inscription pour les enseignants */}
      <RegistrationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        currentForm={registrationForm}
        onFormUpdated={(newDoc) => setRegistrationForm(newDoc)}
      />

      {/* Fenêtre d'inscription simplifiée ultra-lisible */}
      <SimplifiedEnrollmentModal
        isOpen={!!enrollingSession}
        onClose={() => setEnrollingSession(null)}
        session={enrollingSession}
        onSuccess={() => {
          loadCalendarData();
        }}
      />
    </div>
  );
};
