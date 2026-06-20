import React, { useState } from 'react';
import { ColumnDefinition } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedKeys: string[]) => void;
  title: string;
  columns: ColumnDefinition[];
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, columns }) => {
  const [tempSelection, setTempSelection] = useState<string[]>(
    columns.filter(c => c.visible).map(c => c.key as string)
  );

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    setTempSelection(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500 mb-6 font-medium">
          Sélectionnez les colonnes à inclure dans le document généré.
        </p>
        
        <div className="space-y-1 max-h-64 overflow-y-auto mb-6 pr-2">
          {columns.map((col) => (
            <label 
              key={col.key as string} 
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
            >
              <input
                type="checkbox"
                className="w-5 h-5 text-slate-900 rounded focus:ring-slate-900 border-slate-300"
                checked={tempSelection.includes(col.key as string)}
                onChange={() => toggleColumn(col.key as string)}
              />
              <span className="text-slate-700 font-medium">{col.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(tempSelection)}
            className="px-5 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg font-medium transition-colors shadow-sm"
          >
            Générer
          </button>
        </div>
      </div>
    </div>
  );
};