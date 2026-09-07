import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Convocation, Session, Student } from '../types';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, eachDayOfInterval 
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, Printer, Users, FileText, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  students: Student[];
  activeYear: string;
}

type CalendarEvent = {
  id: string;
  type: 'session' | 'convocation';
  date: string;
  title: string;
  studentIds: string[];
  raw: Session | Convocation;
};

export const CalendarView: React.FC<Props> = ({ students, activeYear }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    let convosLoaded = false;
    let sessionsLoaded = false;

    const qConvo = query(collection(db, 'convocations'), where('schoolYear', '==', activeYear));
    const unsubConvo = onSnapshot(qConvo, (snapshot) => {
      const data: Convocation[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Convocation));
      
      setEvents(prev => {
        const filtered = prev.filter(e => e.type !== 'convocation');
        const newEvents = data.map(c => ({
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
        const newEvents = data.map(s => ({
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

  const printDocument = (type: 'liste' | 'convocation' | 'projet') => {
    if (!selectedEvent) return;
    
    const eventStudents = students.filter(s => selectedEvent.studentIds.includes(s.id));
    const dateStr = format(new Date(selectedEvent.date), 'dd/MM/yyyy');
    
    let title = '';
    if (type === 'liste') title = `Liste d'appel - ${selectedEvent.title}`;
    if (type === 'convocation') title = `Convocation - ${selectedEvent.title}`;
    if (type === 'projet') title = `Fiche Projet - ${selectedEvent.title}`;

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
            Événement : <strong>${selectedEvent.title}</strong><br/>
            Effectif : <strong>${eventStudents.length} élèves</strong>
          </div>
    `);

    if (type === 'convocation') {
      const conv = selectedEvent.raw as Convocation;
      printWindow.document.write(`
        <div class="box">
          <p><strong>Lieu :</strong> ${conv.location || 'Non spécifié'}</p>
          <p><strong>Heure de départ :</strong> ${conv.departureTime || 'Non spécifiée'}</p>
          <p><strong>Heure de retour :</strong> ${conv.returnTime || 'Non spécifiée'}</p>
          <p><strong>Transport :</strong> ${conv.transportType || 'Non spécifié'}</p>
        </div>
        <p>Veuillez trouver ci-dessous la liste des élèves convoqués pour cet événement.</p>
      `);
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
            const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            return (
              <div 
                key={day.toString()} 
                className={`min-h-[120px] p-2 border-b border-r border-slate-100 transition-colors
                  ${!isCurrentMonth ? 'bg-slate-50 opacity-50' : 'bg-white hover:bg-slate-50'}
                  ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1
                  ${isSameDay(day, new Date()) ? 'bg-indigo-600 text-white' : 'text-slate-600'}
                `}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 mt-1">
                  {dayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
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
                <div className="flex items-center gap-3 mb-1">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                    ${selectedEvent.type === 'session' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}
                  `}>
                    {selectedEvent.type === 'session' ? 'Séance' : 'Convocation'}
                  </span>
                  <span className="text-sm font-medium text-slate-500">
                    {format(new Date(selectedEvent.date), 'dd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedEvent.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
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
                  {selectedEvent.type === 'convocation' && (
                    <button 
                      onClick={() => printDocument('convocation')}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-medium transition-colors border border-emerald-200"
                    >
                      <FileText className="w-4 h-4" />
                      Convocation
                    </button>
                  )}
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
            </div>
            
            <div className="p-4 border-t border-slate-100 flex justify-end">
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
    </div>
  );
};
