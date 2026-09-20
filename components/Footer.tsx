import React, { useState } from 'react';
import { ShieldCheck, Cloud, GitBranch, Cookie, Lock, FileText, ChevronRight } from 'lucide-react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface FooterProps {
  onOpenPrivacy?: () => void;
  className?: string;
}

export function Footer({ onOpenPrivacy, className = '' }: FooterProps) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  const handleOpenPrivacy = () => {
    if (onOpenPrivacy) {
      onOpenPrivacy();
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <>
      <footer 
        id="app-footer" 
        className={`w-full bg-slate-900 text-slate-300 border-t border-slate-800 text-xs mt-auto ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            
            {/* Colonne 1 : Identité & Établissement */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                <span>AS Lycée Rosa Parks — Rostrenen</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Association Sportive affiliée à l'UNSS. Organisation des activités sportives, entraînements et compétitions du mercredi pour les lycéens de Rostrenen.
              </p>
              <div className="pt-1 text-[11px] text-slate-500">
                Lycée Polyvalent Rosa Parks • 47 rue René Le Magorec, 22110 Rostrenen
              </div>
            </div>

            {/* Colonne 2 : Engagements RGPD & CNIL */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protection des Données & Vie Privée</span>
              </div>
              <ul className="space-y-2 text-slate-400 text-xs">
                <li className="flex items-start gap-2">
                  <Cookie className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-slate-200">Zéro cookie traceur :</strong> Aucun cookie publicitaire, outil d'analyse intrusif ni tracker tiers (exemption stricte CNIL).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span>
                    <strong className="text-slate-200">Données protégées :</strong> Aucune photo d'élève en accès public, suppression annuelle systématique des listes.
                  </span>
                </li>
              </ul>
            </div>

            {/* Colonne 3 : Hébergement souverain & Liens */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-semibold text-xs uppercase tracking-wider">
                <Cloud className="w-4 h-4 text-indigo-400" />
                <span>Infrastructure & Hébergement</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-slate-400 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-200 font-medium">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Nuage (Apps Éducation) & GitLab</span>
                </div>
                <p className="text-[11px] leading-tight text-slate-400">
                  Déploiement sur services institutionnels souverains garantissant l'intégrité et la souveraineté des données scolaires.
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenPrivacy}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Consulter la Politique de Confidentialité complète</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

          </div>

          {/* Ligne inférieure */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div>
              © {new Date().getFullYear()} Association Sportive Rosa Parks — Conforme RGPD (Règlement UE 2016/679) & Loi Informatique et Libertés.
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleOpenPrivacy} 
                className="hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
              >
                Politique de confidentialité
              </button>
              <span>•</span>
              <span>Académie de Rennes</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">CNIL : Exempté de consentement</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal politique de confidentialité */}
      <PrivacyPolicyModal 
        isOpen={internalModalOpen} 
        onClose={() => setInternalModalOpen(false)} 
      />
    </>
  );
}
