import React from 'react';
import { Student, ColumnDefinition } from '../types';
import { Trash2, ArrowRightLeft, CalendarDays } from 'lucide-react';

export interface StudentTableProps {
  students: Student[];
  columns: ColumnDefinition[];
  selectedIds: Set<string>;
  onSelectAll: () => void;
  onSelectRow: (id: string) => void;
  onRowClick?: (student: Student) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  columns,
  selectedIds,
  onSelectAll,
  onSelectRow,
  onRowClick
}) => {
  const allSelected = students.length > 0 && selectedIds.size === students.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < students.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-slate-900 rounded border-gray-300 focus:ring-slate-900 cursor-pointer"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={onSelectAll}
                />
              </th>
              {columns.filter(c => c.visible).map(col => (
                <th key={col.key as string} className="p-4 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700 bg-white">
            {students.length > 0 ? (
              students.map((student) => {
                const isSelected = selectedIds.has(student.id);
                return (
                  <tr 
                    key={student.id} 
                    onClick={() => onRowClick?.(student)}
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-slate-50' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-slate-900 rounded border-gray-300 focus:ring-slate-900 cursor-pointer"
                        checked={isSelected}
                        onChange={() => onSelectRow(student.id)}
                      />
                    </td>
                    {columns.filter(c => c.visible).map(col => (
                      <td key={`${student.id}-${col.key as string}`} className="p-4 whitespace-nowrap">
                        {col.key === 'paid' ? (
                           <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                             String(student.paid).toUpperCase() === 'OUI' 
                             ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                             : 'bg-rose-100 text-rose-700 border border-rose-200'
                           }`}>
                             {student[col.key as string]}
                           </span>
                        ) : col.key === 'classGroup' ? (
                          <span className="font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                             {student[col.key as string]}
                          </span>
                        ) : col.key === 'lastName' ? (
                           <div className="flex items-center gap-1.5">
                             {String(student.swimmingCertificate).toUpperCase() === 'NON' && <span title="Savoir nager non validé" className="text-base">🏊‍♂️🚫</span>}
                             {String(student.imageRights).toUpperCase() === 'NON' && <span title="Droit à l'image non validé" className="text-base">📷🚫</span>}
                             <span className="font-semibold text-slate-900">{student[col.key as string]}</span>
                           </div>
                        ) : col.key === 'firstName' ? (
                           <span className="font-semibold text-slate-900">{student[col.key as string]}</span>
                        ) : (
                          student[col.key as string]
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.filter(c => c.visible).length + 1} className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <CalendarDays className="w-10 h-10 text-slate-300" />
                    <span>Aucun élève trouvé.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
