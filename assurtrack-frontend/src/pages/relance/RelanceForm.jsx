import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, MessageCircle } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { WA_TEMPLATES, fillTemplate } from '../../mock/data';
import { useCreateContrat } from '../../hooks/useContrats';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from './Relance.module.css';

const TYPES = ['Automobile', 'Habitation', 'Santé', 'Voyage', 'Responsabilité civile', 'Vie'];

/** Rendu léger du formatage WhatsApp (*gras*) dans la bulle d'aperçu. */
function waText(str) {
  return str.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? (
      <strong key={i}>{part.slice(1, -1)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function RelanceForm() {
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
  });
  const [confirm, setConfirm] = useState(false);
  const createContrat = useCreateContrat();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const preview = useMemo(
    () =>
      fillTemplate(WA_TEMPLATES['J-30'], {
        prenom: form.prenom || 'Étienne',
        type: form.type_assurance,
        police: form.numero_police || 'POL-0000',
        date: form.date_expiration ? formatDate(form.date_expiration) : '—',
      }),
    [form],
  );

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
      });
      setConfirm(false);
      navigate('/relance');
    } catch {
      /* toast géré par le hook */
    }
  };

  return (
    <PageWrapper
      eyebrow="Module relance"
      title="Nouveau contrat"
      actions={
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/relance')}>
          Retour
        </Button>
      }
    >
      <div className={styles.formGrid}>
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setConfirm(true);
            }}
          >
            <div className={styles.formCols}>
              <div className={styles.fieldset}>
                <p className={styles.legend}>Informations client</p>
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

              <div className={styles.fieldset}>
                <p className={styles.legend}>Informations contrat</p>
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
                <Input label="Date de souscription" type="date" value={form.date_souscription} onChange={set('date_souscription')} required />
                <Input label="Date d'expiration" type="date" value={form.date_expiration} onChange={set('date_expiration')} required />
                <Input
                  label="Montant de la prime"
                  type="number"
                  value={form.montant_prime}
                  onChange={set('montant_prime')}
                  placeholder="0"
                  suffix="FCFA"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <Button variant="outline" type="button" onClick={() => navigate('/relance')}>
                Annuler
              </Button>
              <Button type="submit" icon={Save}>
                Enregistrer le contrat
              </Button>
            </div>
          </form>
        </Card>

        {/* Aperçu WhatsApp en temps réel */}
        <div className={styles.preview}>
          <div className={styles.phone}>
            <div className={styles.phoneBar}>
              <span className={styles.phoneAvatar}>
                {(form.prenom?.[0] || 'É').toUpperCase()}
              </span>
              <div>
                <div className={styles.phoneName}>
                  {form.prenom || 'Étienne'} {form.nom || 'Mballa'}
                </div>
                <div className={styles.phoneStatus}>en ligne</div>
              </div>
            </div>
            <div className={styles.phoneBody}>
              <div className={styles.bubble}>
                {waText(preview)}
                <span className={styles.bubbleTime}>08:00 ✓✓</span>
              </div>
            </div>
          </div>
          <p className={styles.previewHint}>
            <MessageCircle size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Aperçu du
            rappel J-30 envoyé automatiquement
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
          Le contrat <strong>{form.numero_police || 'POL-0000'}</strong> ({form.type_assurance}) sera
          créé pour <strong>{form.prenom} {form.nom}</strong>.
        </p>
        <ul className={styles.summary} style={{ marginTop: 12, lineHeight: 1.9 }}>
          <li>Expiration : <strong>{form.date_expiration ? formatDate(form.date_expiration) : '—'}</strong></li>
          <li>
            Prime :{' '}
            <strong>{form.montant_prime ? formatCurrency(form.montant_prime) : '—'}</strong>
          </li>
          <li>Relances automatiques : J-30, J-7, J-0 sur WhatsApp</li>
        </ul>
      </Modal>
    </PageWrapper>
  );
}
