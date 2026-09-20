import { RegistrationFormDoc } from '../types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function downloadRegistrationForm(form: RegistrationFormDoc | null) {
  if (form && form.fileData) {
    // Si c'est un fichier uploadé (Data URL)
    try {
      const link = document.createElement('a');
      link.href = form.fileData;
      link.download = form.fileName || 'Formulaire_Inscription_AS_Rosa_Parks.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    } catch (e) {
      console.error('Erreur téléchargement direct:', e);
    }
  }

  // Fallback si aucun fichier personnalisé n'a encore été téléversé :
  // Générer une fiche officielle d'adhésion imprimable / enregistrable au format PDF
  generateAndPrintDefaultForm();
}

export function generateAndPrintDefaultForm() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Veuillez autoriser l'ouverture de fenêtres pop-up pour télécharger la fiche d'inscription.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Formulaire d'Inscription - AS Lycée Rosa Parks</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 20px;
          line-height: 1.4;
          font-size: 13px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #1e1b4b;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .header h1 {
          font-size: 19px;
          color: #1e1b4b;
          margin: 0 0 4px 0;
          text-transform: uppercase;
        }
        .header .subtitle {
          font-size: 12px;
          color: #475569;
          font-weight: 500;
        }
        .badge {
          background: #4338ca;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 12px;
          text-align: right;
        }
        .section {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 14px;
          margin-bottom: 12px;
        }
        .section-title {
          font-size: 13px;
          font-weight: bold;
          color: #1e1b4b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .row {
          display: flex;
          gap: 15px;
          margin-bottom: 8px;
        }
        .field {
          flex: 1;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 2px;
        }
        .field-box {
          border-bottom: 1px dashed #94a3b8;
          height: 22px;
          font-size: 13px;
        }
        .checkbox-group {
          display: flex;
          gap: 20px;
          margin-top: 6px;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .box {
          width: 14px;
          height: 14px;
          border: 1.5px solid #475569;
          display: inline-block;
        }
        .footer-note {
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          margin-top: 15px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
        .print-banner {
          background: #312e81;
          color: white;
          padding: 10px 15px;
          border-radius: 6px;
          margin-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .print-btn {
          background: #ffffff;
          color: #312e81;
          border: none;
          padding: 8px 16px;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="print-banner no-print">
        <span>📄 Fiche d'inscription officielle — AS Lycée Rosa Parks (Rostrenen)</span>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
      </div>

      <div class="header">
        <div>
          <h1>Association Sportive — Lycée Rosa Parks</h1>
          <div class="subtitle">47 rue René Le Magorec, 22110 Rostrenen • Académie de Rennes • Affiliée UNSS</div>
        </div>
        <div class="badge">
          FICHE D'ADHÉSION<br>
          <span style="font-size: 10px; opacity: 0.9;">SAISON SPORTIVE</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">1. Renseignements concernant l'élève</div>
        <div class="row">
          <div class="field" style="flex: 2;">
            <div class="field-label">NOM DE L'ÉLÈVE :</div>
            <div class="field-box"></div>
          </div>
          <div class="field" style="flex: 2;">
            <div class="field-label">PRÉNOM :</div>
            <div class="field-box"></div>
          </div>
          <div class="field" style="flex: 1;">
            <div class="field-label">CLASSE :</div>
            <div class="field-box"></div>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label">DATE DE NAISSANCE :</div>
            <div class="field-box"></div>
          </div>
          <div class="field">
            <div class="field-label">SEXE :</div>
            <div class="checkbox-group" style="margin-top: 2px;">
              <span class="checkbox-item"><span class="box"></span> Fille</span>
              <span class="checkbox-item"><span class="box"></span> Garçon</span>
            </div>
          </div>
          <div class="field">
            <div class="field-label">TAILLE T-SHIRT :</div>
            <div class="checkbox-group" style="margin-top: 2px;">
              <span class="checkbox-item"><span class="box"></span> S</span>
              <span class="checkbox-item"><span class="box"></span> M</span>
              <span class="checkbox-item"><span class="box"></span> L</span>
              <span class="checkbox-item"><span class="box"></span> XL</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Coordonnées des Responsables Légaux</div>
        <div class="row">
          <div class="field">
            <div class="field-label">NOM & PRÉNOM DU RESPONSABLE 1 :</div>
            <div class="field-box"></div>
          </div>
          <div class="field">
            <div class="field-label">TÉLÉPHONE (PORTABLE D'URGENCE) :</div>
            <div class="field-box"></div>
          </div>
        </div>
        <div class="row">
          <div class="field">
            <div class="field-label">COURRIEL (POUR INFOS ET CONVOCATIONS) :</div>
            <div class="field-box"></div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">3. Autorisations Parentales & Engagements (Cocher obligatoirement)</div>
        <div style="margin-bottom: 8px;">
          <label class="checkbox-item">
            <span class="box"></span>
            <strong>Autorisation de participation & de déplacement :</strong> J'autorise mon enfant à participer aux activités, entraînements et déplacements organisés dans le cadre de l'AS et de l'UNSS.
          </label>
        </div>
        <div style="margin-bottom: 8px;">
          <label class="checkbox-item">
            <span class="box"></span>
            <strong>Urgence médicale :</strong> J'autorise les professeurs d'EPS responsables à prendre toute mesure d'urgence rendue nécessaire par l'état de santé de l'élève (recours au SAMU/Pompiers, hospitalisation).
          </label>
        </div>
        <div style="margin-bottom: 8px;">
          <label class="checkbox-item">
            <span class="box"></span>
            <strong>Droit à l'image interne AS :</strong> 
            <span style="margin-left: 10px;"><span class="box"></span> OUI</span>
            <span style="margin-left: 10px;"><span class="box"></span> NON</span>
            (photos d'équipes et palmarès sportif)
          </label>
        </div>
        <div>
          <label class="checkbox-item">
            <span class="box"></span>
            <strong>Attestation savoir-nager :</strong> 
            <span style="margin-left: 10px;"><span class="box"></span> OUI</span>
            <span style="margin-left: 10px;"><span class="box"></span> NON</span>
            (indispensable pour les activités nautiques / plein air)
          </label>
        </div>
      </div>

      <div class="section">
        <div class="section-title">4. Cotisation & Règlement</div>
        <div class="row">
          <div class="field">
            <div class="field-label">MONTANT DE LA COTISATION ANNUELLE :</div>
            <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">Cotisation UNSS fixée par l'AS</div>
          </div>
          <div class="field">
            <div class="field-label">MODE DE RÈGLEMENT :</div>
            <div class="checkbox-group" style="margin-top: 4px;">
              <span class="checkbox-item"><span class="box"></span> Chèque (à l'ordre de l'AS Rosa Parks)</span>
              <span class="checkbox-item"><span class="box"></span> Espèces</span>
              <span class="checkbox-item"><span class="box"></span> Chèques vacances / Pass Sport</span>
            </div>
          </div>
        </div>
      </div>

      <div class="row" style="margin-top: 15px;">
        <div class="field" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; min-height: 70px;">
          <div class="field-label">DATE & SIGNATURE DE L'ÉLÈVE :</div>
          <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">À Rostrenen, le .... / .... / 202...</div>
        </div>
        <div class="field" style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; min-height: 70px;">
          <div class="field-label">DATE & SIGNATURE DU RESPONSABLE LÉGAL :</div>
          <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">(Faire précéder de la mention manuscrite « Lu et approuvé »)</div>
        </div>
      </div>

      <div class="footer-note">
        <strong>Fiche à remettre complétée et signée aux professeurs d'EPS.</strong><br>
        Conformément au RGPD et à la loi Informatique et Libertés, les informations recueillies font l'objet d'un traitement informatique destiné à la gestion des licences UNSS et des convocations sportives. Aucun cookie traceur ni tracker tiers n'est utilisé sur le site de l'AS. Les données sont conservées pour la durée de l'année scolaire en cours.
      </div>

      <script>
        window.onload = function() {
          // Si l'utilisateur clique ou sur desktop, proposer directement l'impression
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
