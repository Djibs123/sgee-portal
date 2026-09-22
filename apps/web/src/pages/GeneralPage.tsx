import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { InfoItem, InfoList } from '../components/ui/InfoList'
import { StatusPill } from '../components/ui/StatusPill'
import { getStudentProfile } from '../lib/api'
import { toneOfStatus } from '../lib/status'
import { useApiResource } from '../lib/useApiResource'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export function GeneralPage() {
  useDocumentTitle('Mon dossier')

  const { data: student, loading, error } = useApiResource(getStudentProfile)

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Mon dossier" />
        <h1>Informations générales</h1>
        <p>Données personnelles et administratives de votre dossier</p>
      </div>

      <InlineState loading={loading} error={error} />

      {student && (
        <>
          <section className="card" style={{ marginBottom: '14px' }} aria-labelledby="identity-title">
            <h2 id="identity-title" className="info-section-title">Identité et scolarité</h2>
            <InfoList>
              <InfoItem label="Code étudiant" mono>{student.codeEtudiant}</InfoItem>
              <InfoItem label="N° matricule" mono>{student.matricule}</InfoItem>
              <InfoItem label="Nom">{student.nom}</InfoItem>
              <InfoItem label="Prénom(s)">{student.prenom}</InfoItem>
              <InfoItem label="Année universitaire">{student.anneeScolaire}</InfoItem>
              <InfoItem label="Niveau">{student.niveau}</InfoItem>
              <InfoItem label="Ville d’études">{student.academie}</InfoItem>
              <InfoItem label="Pays d’études">{student.pays}</InfoItem>
              <InfoItem label="Mode de paiement">{student.modePaiement}</InfoItem>
              <InfoItem label="Budget">{student.budget}</InfoItem>
            </InfoList>
          </section>

          <section className="card" style={{ marginBottom: '14px' }} aria-labelledby="civil-title">
            <h2 id="civil-title" className="info-section-title">État civil</h2>
            <InfoList>
              <InfoItem label="Date de naissance">{student.dateNaissance}</InfoItem>
              <InfoItem label="Ville de naissance">{student.villeNaissance}</InfoItem>
              <InfoItem label="Pays de naissance">{student.paysNaissance}</InfoItem>
              <InfoItem label="Sexe">{student.sexe}</InfoItem>
              <InfoItem label="Situation familiale">{student.situation}</InfoItem>
            </InfoList>
          </section>

          <section className="card" aria-labelledby="allocation-title">
            <h2 id="allocation-title" className="info-section-title">Allocation</h2>
            <InfoList>
              <InfoItem label="Montant de l’allocation">
                <strong className="amount-highlight">{student.allocationMensuelle}</strong>
              </InfoItem>
              <InfoItem label="État de la bourse">
                <StatusPill tone={toneOfStatus(student.scholarshipStatus)}>{student.statutBourse}</StatusPill>
              </InfoItem>
              <InfoItem label="Type d’allocation">{student.typeBourse}</InfoItem>
              <InfoItem label="Date de début">{student.dateDebut}</InfoItem>
              <InfoItem label="Date de fin">{student.dateFin}</InfoItem>
              <InfoItem label="Dernier traitement">{student.dernierTraitement}</InfoItem>
              <InfoItem label="Date d’arrivée">{student.dateArrivee}</InfoItem>
              <InfoItem label="N° d’attribution" mono>{student.numAttribution}</InfoItem>
            </InfoList>
          </section>
        </>
      )}
    </div>
  )
}
