import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Coins, BellRing } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useCreateContrat } from '../../hooks/useContrats';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import rel from '../relance/Relance.module.css';
import styles from './Assurance.module.css';

const TYPES = ['Automobile', 'Habitation', 'Santé', 'Voyage', 'Responsabilité civile', 'Vie'];

export default function ContratForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    numero_police: '',
    type_assurance: 'Automobile',
    date_souscription: '',
    date_expiration: '',
    montant_prime: '',
    numero_chassis: '',
  });
  const isAuto = form.type_assurance === 'Automobile';
  const [confirm, setConfirm] = useState(false);
  const createContrat = useCreateContrat();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSave = async () => {
    try {
      await createContrat.mutateAsync({
        client: {
          nom: form.nom,
          prenom: form.prenom,
          telephone_wa: form.telephone,
          email: form.email || null,
        },
        numero_police: form.numero_police,
        type_assurance: form.type_assurance,
        date_souscription: form.date_souscription,
        date_expiration: form.date_expiration,
        montant_prime: form.montant_prime ? Number(form.montant_prime) : null,
        numero_chassis: isAuto && form.numero_chassis ? form.numero_chassis.trim() : null,
      });
      setConfirm(false);
      navigate('/assurance');
    } catch {
      /* toast géré par le hook */
    }
  };

  const montant = form.montant_prime ? formatCurrency(form.montant_prime, { suffix: '' }) : '—';

  return (
    <PageWrapper
      eyebrow="Module assurance"
      title="Nouveau contrat"
      actions={
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/assurance')}>
          Retour
        </Button>
      }
    >
      <div className={rel.formGrid}>
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <div className={rel.formCols}>
              <div className={rel.fieldset}>
                <p className={rel.legend}>Informations client</p>
                <Input label="Prénom" value={form.prenom} onChange={set('prenom')} placeholder="Étienne" required />
                <Input label="Nom" value={form.nom} onChange={set('nom')} placeholder="Mballa" required />
                <Input
                  label="Téléphone WhatsApp"
                  value={form.telephone}
                  onChange={set('telephone')}
                  placeholder="6XX XXX XXX"
                  hint="Format camerounais — normalisé en +237 à l'envoi"
                  required
                />
                <Input
                  label="E-mail (optionnel)"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="client@email.cm"
                />
              </div>

              <div className={rel.fieldset}>
                <p className={rel.legend}>Informations contrat</p>
                <Input
                  label="N° de police"
                  value={form.numero_police}
                  onChange={set('numero_police')}
                  placeholder="POL-2291"
                  required
                />
                <Select label="Type d'assurance" value={form.type_assurance} onChange={set('type_assurance')}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                {isAuto && (
                  <Input
                    label="Numéro de châssis"
                    value={form.numero_chassis}
                    onChange={set('numero_chassis')}
                    placeholder="VF1 XXXXX XXXXXXX"
                    hint="Identifie le véhicule — rappelé au client dans la relance WhatsApp"
                  />
                )}
                <Input label="Date de souscription" type="date" value={form.date_souscription} onChange={set('date_souscription')} required />
                <Input label="Date d'expiration" type="date" value={form.date_expiration} onChange={set('date_expiration')} required />
                <Input
                  label="Montant de l'assurance"
                  type="number"
                  value={form.montant_prime}
                  onChange={set('montant_prime')}
                  placeholder="0"
                  suffix="FCFA"
                  hint="Montant payé par le client — alimente le chiffre d'affaires"
                />
              </div>
            </div>

            <div className={rel.formActions}>
              <Button variant="outline" type="button" onClick={() => navigate('/assurance')}>
                Annuler
              </Button>
              <Button type="submit" icon={Save}>
                Enregistrer le contrat
              </Button>
            </div>
          </form>
        </Card>

        {/* Récap financier */}
        <div className={styles.recap}>
          <div>
            <span className={styles.recapLabel}>Montant de l'assurance</span>
            <div className={styles.recapAmount}>
              {montant}
              <span>FCFA</span>
            </div>
          </div>
          <div className={styles.recapRows}>
            <div className={styles.recapRow}>
              <span>Client</span>
              <span>{form.prenom || form.nom ? `${form.prenom} ${form.nom}`.trim() : '—'}</span>
            </div>
            <div className={styles.recapRow}>
              <span>Type</span>
              <span>{form.type_assurance}</span>
            </div>
            {isAuto && (
              <div className={styles.recapRow}>
                <span>N° de châssis</span>
                <span>{form.numero_chassis || '—'}</span>
              </div>
            )}
            <div className={styles.recapRow}>
              <span>Souscription</span>
              <span>{form.date_souscription ? formatDate(form.date_souscription) : '—'}</span>
            </div>
            <div className={styles.recapRow}>
              <span>Expiration</span>
              <span>{form.date_expiration ? formatDate(form.date_expiration) : '—'}</span>
            </div>
          </div>
          <p className={styles.recapNote}>
            <BellRing size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Relances automatiques J-30, J-7 et J-0 programmées sur WhatsApp à l'enregistrement.
          </p>
        </div>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        eyebrow="Confirmation"
        title="Enregistrer ce contrat ?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Modifier
            </Button>
            <Button icon={Save} loading={createContrat.isPending} onClick={onSave}>
              Confirmer
            </Button>
          </>
        }
      >
        <p>
          Le contrat <strong>{form.numero_police || 'POL-0000'}</strong> ({form.type_assurance}) sera créé
          pour <strong>{form.prenom} {form.nom}</strong>.
        </p>
        <ul className={rel.summary} style={{ marginTop: 12, lineHeight: 1.9 }}>
          <li>
            <Coins size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Montant de l'assurance :{' '}
            <strong>{form.montant_prime ? formatCurrency(form.montant_prime) : '—'}</strong>
          </li>
          <li>Expiration : <strong>{form.date_expiration ? formatDate(form.date_expiration) : '—'}</strong></li>
          <li>Relances automatiques : J-30, J-7, J-0 sur WhatsApp</li>
        </ul>
      </Modal>
    </PageWrapper>
  );
}
