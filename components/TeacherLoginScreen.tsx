import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface TeacherLoginScreenProps {
  onLogin: () => void;
  correctPassword: string;
}

export function TeacherLoginScreen({ onLogin, correctPassword }: TeacherLoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      onLogin();
    } else {
      setError('Mot de passe incorrect.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-indigo-900 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Espace Enseignant</h1>
          <p className="text-indigo-200">Veuillez saisir le mot de passe</p>
        </div>
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Mot de passe</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-900 transition-colors"
                placeholder="Mot de passe"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-indigo-900 text-white font-bold py-3 rounded-xl hover:bg-indigo-800 transition-colors mt-2"
            >
              Accéder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
