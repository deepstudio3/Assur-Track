import { useMemo } from 'react';
import { Phone, Mail } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import styles from './ClientsList.module.css';

const STATUT_TONE = { actif: 'success', expire: 'danger', renouvele: 'info', suspendu: 'neutral' };
const STATUT_LABEL = { actif: 'Actif', expire: 'Expiré', renouvele: 'Renouvelé', suspendu: 'Suspendu' };

const keyOf = (cl) => cl?.id || `${cl?.prenom} ${cl?.nom}`;

/** Fiche client : coordonnées + contrats liés (dérivés de la liste des contrats). */
export default function ClientModal({ client, contrats, onClose }) {
  const open = Boolean(client);

  const list = useMemo(() => {
    if (!client) return [];
    const k = keyOf(client);
    return (contrats || [])
      .filter((c) => keyOf(c.client) === k)
      .sort((a, b) => new Date(a.date_expiration) - new Date(b.date_expiration));
  }, [client, contrats]);

  const total = list.reduce((s, c) => s + (Number(c.montant_prime) || 0), 0);
  const actifs = list.filter((c) => c.statut === 'actif').length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Fiche client"
      title={client ? `${client.prenom} ${client.nom}` : ''}
    >
      <div className={styles.fmeta}>
        <span className={styles.fmetaItem}>
          <Phone size={14} /> <span className="tabular">{client?.telephone_wa}</span>
        </span>
        {client?.email && (
          <span className={styles.fmetaItem}>
            <Mail size={14} /> {client.email}
          </span>
        )}
      </div>

      <div className={styles.fstats}>
        <div className={styles.fstat}>
          <div className={styles.fstatVal}>{list.length}</div>
          <div className={styles.fstatLabel}>Contrats</div>
        </div>
        <div className={styles.fstat}>
          <div className={styles.fstatVal}>{actifs}</div>
          <div className={styles.fstatLabel}>Actifs</div>
        </div>
        <div className={styles.fstat}>
          <div className={styles.fstatVal}>{formatCurrency(total, { suffix: '' })}</div>
          <div className={styles.fstatLabel}>Total assurance (FCFA)</div>
        </div>
      </div>

      <p className={styles.fsectionTitle}>Contrats du client</p>
      {list.length === 0 ? (
        <EmptyState title="Aucun contrat" description="Ce client n'a pas encore de contrat enregistré." />
      ) : (
        <div className={styles.contratList}>
          {list.map((c) => (
            <div key={c.id} className={styles.contratRow}>
              <div className={styles.contratMain}>
                <span className={styles.contratType}>{c.type_assurance}</span>
                <span className={styles.contratSub}>
                  {c.numero_police} · expire le {formatDate(c.date_expiration)}
                </span>
              </div>
              <div className={styles.contratRight}>
                <span className={styles.contratMontant}>
                  {c.montant_prime ? formatCurrency(c.montant_prime) : '—'}
                </span>
                <Badge tone={STATUT_TONE[c.statut]}>{STATUT_LABEL[c.statut]}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
