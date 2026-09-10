import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Convocation, Session, Student } from '../types';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Printer, Users, FileText, Calendar as CalendarIcon, PlusCircle, Loader2, Share2, Trash2, Edit3 } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
  isPublic?: boolean;
}

type CalendarEvent = {
  id: string;
  type: 'session' | 'convocation';
  date: string;
  title: string;
  studentIds: string[];
  raw: Session | Convocation;
};

export const CalendarView: React.FC<Props> = ({ students, activeYear, isPublic }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [clickedDate, setClickedDate] = useState<Date | null>(null);
  
  const [newEventName, setNewEventName] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventEndTime, setNewEventEndTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventNeedSnack, setNewEventNeedSnack] = useState(false);
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventRequireLicense, setNewEventRequireLicense] = useState(true);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [newEventGenerateConvocation, setNewEventGenerateConvocation] = useState(false);

  const openEditModal = (event: CalendarEvent) => {
    if (event.type !== 'session') return;
    const session = event.raw as Session;
    setNewEventName(session.name || '');
    setNewEventTime(session.time || '');
    setNewEventEndTime(session.endTime || '');
    setNewEventLocation(session.location || '');
    setNewEventNeedSnack(session.needSnack || false);
    setNewEventDescription(session.description || '');
    setNewEventRequireLicense(session.requireLicense ?? true);
    setNewEventGenerateConvocation(!!session.convocationId);
    setClickedDate(new Date(session.date));
    setEditingEventId(event.id);
    setIsCreatingEvent(true);
    setSelectedEvent(null);
  };

  useEffect(() => {
    let convosLoaded = false;
    let sessionsLoaded = false;

    const qConvo = query(collection(db, 'convocations'), where('schoolYear', '==', activeYear));
    const unsubConvo = onSnapshot(qConvo, (snapshot) => {
      const data: Convocation[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Convocation));
      
      setEvents(prev => {
        const filtered = prev.filter(e => e.type !== 'convocation');
        const newEvents = data
          .filter(c => c.departureDate && !isNaN(new Date(c.departureDate).getTime()))
          .map(c => ({
            id: c.id,
            type: 'convocation' as const,
            date: c.departureDate,
            title: c.competitionName || 'Convocation',
            studentIds: c.studentIds || [],
            raw: c
          }));
        return [...filtered, ...newEvents];
      });
      convosLoaded = true;
      if (convosLoaded && sessionsLoaded) setLoading(false);
    });

    const qSession = query(collection(db, 'sessions'), where('schoolYear', '==', activeYear));
    const unsubSession = onSnapshot(qSession, (snapshot) => {
      const data: Session[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Session));
      
      setEvents(prev => {
        const filtered = prev.filter(e => e.type !== 'session');
        const newEvents = data
          .filter(s => s.date && !isNaN(new Date(s.date).getTime()))
          .map(s => ({
            id: s.id,
            type: 'session' as const,
            date: s.date,
            title: s.name || 'Séance',
            studentIds: s.presentStudentIds || [],
            raw: s
          }));
        return [...filtered, ...newEvents];
      });
      sessionsLoaded = true;
      if (convosLoaded && sessionsLoaded) setLoading(false);
    });

    return () => {
      unsubConvo();
      unsubSession();
    };
  }, [activeYear]);

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
    setNewEventNeedSnack(false);
    setNewEventDescription('');
    setNewEventRequireLicense(true);
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
          time: newEventTime,
          endTime: newEventEndTime,
          location: newEventLocation,
          needSnack: newEventNeedSnack,
          description: newEventDescription,
          requireLicense: newEventRequireLicense
        };
        await updateDoc(doc(db, 'sessions', editingEventId), updateData);
        
        const sessionDoc = events.find(ev => ev.id === editingEventId)?.raw as Session;
        if (sessionDoc?.convocationId) {
          const convUpdateData = {
            competitionName: newEventName || 'Séance',
            departureDate: format(clickedDate, 'yyyy-MM-dd') + (newEventTime ? `T${newEventTime}` : 'T00:00'),
            returnDate: format(clickedDate, 'yyyy-MM-dd') + (newEventEndTime ? `T${newEventEndTime}` : 'T23:59'),
            needSnack: newEventNeedSnack ? 'OUI' : 'NON'
          };
          await updateDoc(doc(db, 'convocations', sessionDoc.convocationId), convUpdateData);
        }
      } else {
        const sessionData: Partial<Session> = {
          name: newEventName || 'Séance',
          date: format(clickedDate, 'yyyy-MM-dd'),
          time: newEventTime,
          endTime: newEventEndTime,
          location: newEventLocation,
          needSnack: newEventNeedSnack,
          description: newEventDescription,
          requireLicense: newEventRequireLicense,
          enrolledStudentIds: [],
          presentStudentIds: [],
          schoolYear: activeYear
        };
        const sessionRef = await addDoc(collection(db, 'sessions'), sessionData);
        
        if (newEventGenerateConvocation) {
           const convData: Partial<Convocation> = {
              competitionName: newEventName || 'Séance',
              departureDate: format(clickedDate, 'yyyy-MM-dd') + (newEventTime ? `T${newEventTime}` : 'T00:00'),
              returnDate: format(clickedDate, 'yyyy-MM-dd') + (newEventEndTime ? `T${newEventEndTime}` : 'T23:59'),
              guides: '',
              needSnack: newEventNeedSnack ? 'OUI' : 'NON',
              needPicnic: 'NON',
              schoolYear: activeYear,
              studentIds: [],
              sessionId: sessionRef.id
           };
           const convRef = await addDoc(collection(db, 'convocations'), convData);
           await updateDoc(doc(db, 'sessions', sessionRef.id), { convocationId: convRef.id });
        }
      }
      setIsCreatingEvent(false);
      setEditingEventId(null);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement de la séance.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer cet événement (${event.title}) ? Cette action est irréversible.`)) {
      try {
        const collectionName = event.type === 'session' ? 'sessions' : 'convocations';
        await deleteDoc(doc(db, collectionName, event.id));
        
        if (event.type === 'session' && (event.raw as Session).convocationId) {
          await deleteDoc(doc(db, 'convocations', (event.raw as Session).convocationId!));
        }
        
        setSelectedEvent(null);
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression de l\'événement.');
      }
    }
  };

  const printDocument = (type: 'liste' | 'convocation' | 'projet', eventOverride?: CalendarEvent) => {
    const targetEvent = eventOverride || selectedEvent;
    if (!targetEvent) return;
    
    const eventStudents = students.filter(s => targetEvent.studentIds.includes(s.id));
    const dateStr = format(new Date(targetEvent.date), 'dd/MM/yyyy');
    
    let title = '';
    if (type === 'liste') title = `Liste d'appel - ${targetEvent.title}`;
    if (type === 'convocation') title = `Convocation - ${targetEvent.title}`;
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
      
      const location = isSession ? eventDetails?.location : 'Non spécifié';
      const startTime = isSession ? eventDetails?.time : (convoDetails?.departureDate ? format(new Date(convoDetails.departureDate), 'HH:mm') : 'Non spécifiée');
      const endTime = isSession ? eventDetails?.endTime : (convoDetails?.returnDate ? format(new Date(convoDetails.returnDate), 'HH:mm') : 'Non spécifiée');
      const snack = isSession ? (eventDetails?.needSnack ? 'Oui' : 'Non') : (convoDetails?.needSnack || 'Non');
      
      printWindow.document.write(`
        <div class="box">
          <p><strong>Lieu :</strong> ${location || 'Non spécifié'}</p>
          <p><strong>Heure de début/départ :</strong> ${startTime}</p>
          <p><strong>Heure de fin/retour :</strong> ${endTime || 'Non spécifiée'}</p>
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
                <th>Classe</th>
                ${type === 'liste' ? '<th>Présent</th><th>Observation</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${eventStudents.map(s => `
                <tr>
                  <td><strong>${s.lastName || ''}</strong></td>
                  <td>${s.firstName || ''}</td>
                  <td>${s.classGroup || ''}</td>
                  ${type === 'liste' ? '<td></td><td></td>' : ''}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {!isPublic && (
            <button 
              onClick={handleShare}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors mr-2"
              title="Partager le calendrier en lecture seule"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-sm">Partager</span>
            </button>
          )}
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, dayIdx) => {
            const dayEvents = events.filter(e => isSameDay(new Date(e.date), day)).sort((a, b) => {
              const timeA = a.type === 'session' ? (a.raw as Session).time : (a.raw as Convocation).departureDate?.includes('T') ? (a.raw as Convocation).departureDate.split('T')[1] : '';
              const timeB = b.type === 'session' ? (b.raw as Session).time : (b.raw as Convocation).departureDate?.includes('T') ? (b.raw as Convocation).departureDate.split('T')[1] : '';
              return (timeA || '').localeCompare(timeB || '');
            });
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={`group min-h-[120px] p-2 border-b border-r border-slate-100 transition-colors ${!isPublic ? 'cursor-pointer hover:bg-slate-50' : ''}
                  ${!isCurrentMonth ? 'bg-slate-50 opacity-50' : 'bg-white'}
                  ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white' : 'text-slate-600'}
                  `}>
                    {format(day, 'd')}
                  </div>
                  {!isPublic && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity rounded"
                      title="Ajouter un événement"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs font-semibold truncate transition-colors border
                        ${event.type === 'session' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }
                      `}
                      title={event.title}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 items-center text-sm font-medium text-slate-500 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-400"></div>
          Séances & Entraînements
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-400"></div>
          Convocations & Évènements
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                    ${selectedEvent.type === 'session' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}
                  `}>
                    {selectedEvent.type === 'session' ? 'Séance' : 'Convocation'}
                  </span>
                  {(selectedEvent.raw as any).targetAudience === 'adults' && (
                    <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-rose-100 text-rose-700">
                      Adultes uniquement
                    </span>
                  )}
                  <span className="text-sm font-medium text-slate-500">
                    {format(new Date(selectedEvent.date), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mt-2 mb-2">{selectedEvent.title}</h2>
                <div className="flex flex-col gap-1">
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).time && (
                    <p className="text-slate-600 font-medium text-sm">
                      🕒 {(selectedEvent.raw as Session).time} 
                      {(selectedEvent.raw as Session).endTime ? ` - ${(selectedEvent.raw as Session).endTime}` : ''}
                    </p>
                  )}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).location && (
                    <p className="text-slate-600 font-medium text-sm">📍 {(selectedEvent.raw as Session).location}</p>
                  )}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).needSnack && (
                    <p className="text-amber-600 font-medium text-sm">🍪 Goûter à prévoir</p>
                  )}
                  {selectedEvent.type === 'session' && (selectedEvent.raw as Session).description && (
                    <p className="text-slate-500 text-sm mt-1 bg-white p-2 rounded border border-slate-200 inline-block">
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
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
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
                  
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      Élèves concernés ({selectedEvent.studentIds.length})
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
                      return (
                        <button 
                          onClick={() => window.location.href = `?enroll=${selectedEvent.id}`}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                        >
                          <Users className="w-5 h-5" />
                          Je m'inscris à cette séance
                        </button>
                      );
                    }
                    
                    if (isConvocation || (isSession && isClosed)) {
                      return (
                        <div className="flex flex-col items-center gap-3">
                          {isFull && !isConvocation && <p className="text-amber-600 font-semibold mb-2">Les inscriptions sont closes (complet).</p>}
                          {isClosed && !isFull && !isConvocation && <p className="text-amber-600 font-semibold mb-2">Les inscriptions sont closes (date passée).</p>}
                          <button 
                            onClick={() => printDocument('convocation')}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                          >
                            <FileText className="w-5 h-5" />
                            Télécharger la convocation
                          </button>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-between items-center">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              {editingEventId ? 'Modifier la Séance' : 'Créer une Séance'}
            </h2>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium border border-slate-200">
                  {format(clickedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Heure de début</label>
                  <input 
                    type="time" 
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Heure de fin</label>
                  <input 
                    type="time" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newEventEndTime}
                    onChange={e => setNewEventEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Lieu</label>
                <input 
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newEventLocation}
                  onChange={e => setNewEventLocation(e.target.value)}
                  placeholder="Ex: Gymnase"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Informations (Optionnel)</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newEventDescription}
                  onChange={e => setNewEventDescription(e.target.value)}
                  placeholder="Ex: Penser à prendre les maillots..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <input 
                  type="checkbox" 
                  id="needSnackCal"
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                  checked={newEventNeedSnack}
                  onChange={e => setNewEventNeedSnack(e.target.checked)}
                />
                <label htmlFor="needSnackCal" className="text-sm font-semibold text-amber-800">
                  Prévoir un goûter
                </label>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input 
                  type="checkbox" 
                  id="requireLicenseCal"
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  checked={newEventRequireLicense}
                  onChange={e => setNewEventRequireLicense(e.target.checked)}
                />
                <label htmlFor="requireLicenseCal" className="text-sm font-semibold text-slate-700">
                  Les élèves doivent être à jour de leur licence pour s'inscrire
                </label>
              </div>
              
              {!editingEventId && (
                <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <input 
                    type="checkbox" 
                    id="generateConvocation"
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    checked={newEventGenerateConvocation}
                    onChange={e => setNewEventGenerateConvocation(e.target.checked)}
                  />
                  <label htmlFor="generateConvocation" className="text-sm font-semibold text-indigo-900">
                    Intégrer dans la gestion des convocations
                  </label>
                </div>
              )}
              {editingEventId && newEventGenerateConvocation && (
                 <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                   <span className="text-sm font-semibold text-indigo-900">
                     Cette séance est liée à une convocation.
                   </span>
                 </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreatingEvent(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                  disabled={isSavingEvent}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="flex items-center gap-2 px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingEvent && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingEventId ? 'Enregistrer les modifications' : 'Créer la séance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
