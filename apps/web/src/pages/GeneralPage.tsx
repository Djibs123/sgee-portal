import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { getStudentProfile } from '../lib/api'
import { useApiResource } from '../lib/useApiResource'

export function GeneralPage() {
  const { data: student, loading, error } = useApiResource(getStudentProfile)

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Mon Dossier" />
        <h1>Informations Generales</h1>
        <p>Donnees personnelles et administratives de votre dossier</p>
      </div>

      <InlineState loading={loading} error={error} />

      {student && (
        <>
          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="info-section-title">Identite &amp; Scolarite</div>
            <div className="info-grid">
              <div className="info-field"><label>Code Etudiant</label><p className="mono">{student.codeEtudiant}</p></div>
              <div className="info-field"><label>N Matricule</label><p className="mono">{student.matricule}</p></div>
              <div className="info-field"><label>Nom</label><p>{student.nom}</p></div>
              <div className="info-field"><label>Prenom(s)</label><p>{student.prenom}</p></div>
              <div className="info-field"><label>Annee Scolaire</label><p>{student.anneeScolaire}</p></div>
              <div className="info-field"><label>Ville d'Etudes</label><p>{student.academie}</p></div>
              <div className="info-field"><label>Pays d'Etudes</label><p>{student.pays}</p></div>
              <div className="info-field"><label>Mode de Paiement</label><p>{student.modePaiement}</p></div>
              <div className="info-field"><label>Budget</label><p>{student.budget}</p></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="info-section-title">Etat Civil</div>
            <div className="info-grid">
              <div className="info-field"><label>Date de Naissance</label><p>{student.dateNaissance}</p></div>
              <div className="info-field"><label>Ville de Naissance</label><p>{student.villeNaissance}</p></div>
              <div className="info-field"><label>Pays de Naissance</label><p>{student.paysNaissance}</p></div>
              <div className="info-field"><label>Sexe</label><p>{student.sexe}</p></div>
              <div className="info-field"><label>Situation Familiale</label><p>{student.situation}</p></div>
            </div>
          </div>

          <div className="card">
            <div className="info-section-title">Allocation</div>
            <div className="info-grid">
              <div className="info-field">
                <label>Montant Allocation</label>
                <p style={{ fontWeight: 700, fontSize: '15px', color: 'var(--green)' }}>
                  {student.allocationMensuelle}
                </p>
              </div>
              <div className="info-field">
                <label>Etat Allocation</label>
                <p><span className="status-pill repris">{student.statutBourse}</span></p>
              </div>
              <div className="info-field"><label>Type Allocation</label><p>{student.typeBourse}</p></div>
              <div className="info-field"><label>Date Debut</label><p>{student.dateDebut}</p></div>
              <div className="info-field"><label>Date Fin</label><p>{student.dateFin}</p></div>
              <div className="info-field"><label>Dernier Traitement</label><p>{student.dernierTraitement}</p></div>
              <div className="info-field"><label>Date d'Arrivee</label><p>{student.dateArrivee}</p></div>
              <div className="info-field">
                <label>N d'Attribution</label>
                <p className="mono" style={{ fontSize: '12.5px' }}>{student.numAttribution}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
