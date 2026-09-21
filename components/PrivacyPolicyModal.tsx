import React from 'react';
import { ShieldCheck, Lock, Trash2, UserCheck, Server, AlertCircle, X, School } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col my-auto border border-slate-200">
        
        {/* En-tête */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Politique de Confidentialité & Protection des Données (RGPD)
              </h2>
              <p className="text-xs text-slate-500">
                Association Sportive (AS) — Lycée Rosa Parks, Rostrenen (Académie de Rennes)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu textuel complet */}
        <div className="p-6 overflow-y-auto text-sm text-slate-600 space-y-6 leading-relaxed">
          
          {/* Note d'engagement */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block text-emerald-950 mb-1">
                Engagement éthique et conformité Éducation nationale
              </span>
              Le site de l'Association Sportive du Lycée Rosa Parks s'inscrit dans le respect strict du Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et de la loi Informatique et Libertés modifiée. Aucune exploitation commerciale, aucun profilage ni revente de données n'est opéré.
            </div>
          </div>

          {/* 1. Responsable du traitement */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <School className="w-4 h-4 text-indigo-600" />
              1. Responsable de Traitement
            </h3>
            <p>
              Le traitement des données est placé sous la responsabilité de :<br />
              <strong className="text-slate-800">Association Sportive du Lycée Polyvalent Rosa Parks</strong><br />
              47 rue René Le Magorec, 22110 Rostrenen.<br />
              Représentée légalement par le Chef d'Établissement (Président de droit de l'AS) et administrée par l'équipe des enseignants d'Éducation Physique et Sportive (EPS).
            </p>
          </section>

          {/* 2. Données collectées et finalités */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600" />
              2. Données collectées et Finalités
            </h3>
            <p>
              Dans le cadre des activités de l'Association Sportive (inscriptions UNSS, convocations aux compétitions, présences aux entraînements et formulaires de contact ou d'adhésion), seules les données strictement nécessaires (principe de minimisation) sont traitées :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong className="text-slate-700">Données de l'élève :</strong> Nom, prénom, date de naissance, classe, sexe, numéro de licence UNSS, statut de paiement de la cotisation, taille de t-shirt.</li>
              <li><strong className="text-slate-700">Autorisations administratives :</strong> Autorisation parentale de pratique et de transport, attestation de savoir-nager, droit à l'image.</li>
              <li><strong className="text-slate-700">Formulaire de contact / d'inscription :</strong> Identité du déclarant, coordonnées de contact (e-mail, téléphone) et message ou motif de demande.</li>
            </ul>
            <p className="text-xs text-slate-500 pt-1">
              <strong className="text-slate-700">Finalités exclusives :</strong> Gestion administrative des licences sportives UNSS, organisation logistique des déplacements et compétitions du mercredi, pointage des présences, et communication directe avec les élèves et leurs représentants légaux.
            </p>
          </section>

          {/* 3. Protection de l'image et respect de la vie privée */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              3. Absence totale de cookies publicitaires et droit à l'image
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong className="text-slate-700">Zéro cookie traceur (Règle CNIL) :</strong> Ce site ne dépose aucun cookie de pistage, cookie publicitaire ou outil de mesure d'audience invasif tiers. Conformément aux recommandations de la CNIL, aucun bandeau intrusif n'est requis car votre navigation n'est pas tracée.
              </li>
              <li>
                <strong className="text-slate-700">Droit à l'image des élèves :</strong> Aucune photo identifiante d'élève mineur n'est publiée sans autorisation parentale formelle préalable. Aucune photo d'élève n'est indexée publiquement par les moteurs de recherche.
              </li>
            </ul>
          </section>

          {/* 4. Durée de conservation et purge annuelle */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-indigo-600" />
              4. Durée de Conservation & Purge Annuelle
            </h3>
            <p>
              Les données sont conservées pour la durée stricte de l'année scolaire en cours :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong className="text-slate-700">Purge de rentrée :</strong> À l'issue de chaque année scolaire (au plus tard le 30 septembre suivant), les listes d'inscriptions, coordonnées et messages de contact font l'objet d'une purge ou d'un archivage comptable clos (ex: reçus de cotisation).
              </li>
              <li>
                Les données des élèves quittant le lycée ou ne renouvelant pas leur adhésion sont définitivement supprimées.
              </li>
            </ul>
          </section>

          {/* 5. Sécurité et hébergement */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              5. Sécurité et Confidentialité Technique
            </h3>
            <p>
              Les données sont protégées par des mesures techniques et organisationnelles adaptées :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong className="text-slate-700">Hébergement :</strong> Les services s'appuient sur les environnements sécurisés et souverains dédiés à la communauté éducative (services Nuage / Apps Éducation & forge GitLab académique).
              </li>
              <li>
                <strong className="text-slate-700">Contrôle d'accès et minimisation stricte (Éducation Nationale) :</strong> L'accès public extérieur est strictement circonscrit au Nom et Prénom uniquement pour la sélection lors de l'inscription aux séances. L'ensemble des autres données personnelles (dates de naissance, coordonnées, classes, suivi financier, attestations médicales et autorisations) est hermétiquement verrouillé et accessible exclusivement par l'administrateur coordonnateur de l'AS.
              </li>
              <li>
                <strong className="text-slate-700">Sécurité Firestore & Portes fermées :</strong> Les règles de sécurité (Firestore Security Rules) bloquent tout accès non autorisé par défaut. Aucune donnée sensible n'est transmise ni consultable de l'extérieur.
              </li>
              <li>
                Toutes les transmissions sont chiffrées de bout en bout via le protocole sécurisé HTTPS / TLS.
              </li>
            </ul>
          </section>

          {/* 6. Exercice des droits */}
          <section className="space-y-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600" />
              6. Exercice des Droits des Familles (Accès, Rectification, Suppression)
            </h3>
            <p>
              Conformément aux articles 15 à 21 du RGPD, les élèves majeurs ainsi que les responsables légaux des élèves mineurs disposent à tout moment des droits suivants :
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="font-semibold text-slate-800 block">Droit d'accès & rectification</span>
                Consulter les informations enregistrées et demander leur mise à jour immédiate.
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="font-semibold text-slate-800 block">Droit à l'effacement (« oubli »)</span>
                Demander la suppression anticipée des coordonnées et fiches de contact.
              </div>
            </div>
            <p className="pt-2 text-xs">
              Pour exercer vos droits, adressez votre demande à l'équipe pédagogique d'EPS :<br />
              📧 Courriel : <span className="font-mono text-indigo-600">ce.0220055c@ac-rennes.fr</span> (préciser en objet : <em>« AS Rosa Parks - Données Personnelles »</em>)<br />
              📮 Courrier : <em>Association Sportive, Lycée Rosa Parks, 47 rue René Le Magorec, 22110 Rostrenen</em>.<br />
              En cas de réponse insatisfaisante, vous avez le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés - <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">cnil.fr</a>).
            </p>
          </section>

        </div>

        {/* Pied de modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <span className="text-[11px] text-slate-400">
            Dernière mise à jour : Année scolaire 2025-2026 • AS Lycée Rosa Parks
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
