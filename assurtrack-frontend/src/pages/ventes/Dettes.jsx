import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';
import { dettesParClient, resumeProduits } from '../../mock/ventes';
import { useVentesDettes, usePayerDette } from '../../hooks/useVentes';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import styles from './Dettes.module.css';

export default function Dettes() {
  const { data: dettes = [], isLoading } = useVentesDettes();
  const payer = usePayerDette();
  const [openClient, setOpenClient] = useState(null); // clé client
  const [confirmVente, setConfirmVente] = useState(null);

  const groupes = useMemo(() => dettesParClient(dettes), [dettes]);
  const totalGlobal = groupes.reduce((s, g) => s + g.total, 0);

  const clientCourant = groupes.find((g) => g.client === openClient) || null;

  const marquerPaye = async () => {
    const id = confirmVente.id;
    const reste = (clientCourant?.ventes || []).filter((v) => v.id !== id).length;
    try {
      await payer.mutateAsync({ id });
      setConfirmVente(null);
      if (reste === 0) setOpenClient(null);
    } catch {
      /* toast géré par le hook */
    }
  };

  return (
    <PageWrapper
      eyebrow="Comptabilité"
      title="Dettes clients"
      actions={
        groupes.length > 0 && (
          <span className={styles.headTotal}>
            {groupes.length} client{groupes.length > 1 ? 's' : ''} ·{' '}
            <strong className="tabular">{formatCurrency(totalGlobal)}</strong>
          </span>
        )
      }
    >
      <Card>
        {isLoading ? (
          <Loader center />
        ) : groupes.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Aucune dette en cours"
            description="Toutes les ventes à crédit ont été soldées. Les nouveaux crédits apparaîtront ici."
          />
        ) : (
          <ul className={styles.clients}>
            {groupes.map((g) => (
              <li key={g.client}>
                <button className={styles.client} onClick={() => setOpenClient(g.client)}>
                  <span className={styles.avatar}>
                    {g.prenom[0]}
                    {g.nom[0]}
                  </span>
                  <div className={styles.clientInfo}>
                    <span className={styles.clientName}>
                      {g.prenom} {g.nom}
                    </span>
                    <span className={styles.clientMeta}>
                      {g.ventes.length} dette{g.ventes.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={`${styles.clientTotal} tabular`}>{formatCurrency(g.total)}</span>
                  <ChevronRight size={18} className={styles.chevron} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* --- Modal détail client --- */}
      <Modal
        open={!!clientCourant}
        onClose={() => setOpenClient(null)}
        size="lg"
        eyebrow="Dettes du client"
        title={clientCourant ? `${clientCourant.prenom} ${clientCourant.nom}` : ''}
      >
        {clientCourant && (
          <>
            <div className={styles.modalTotal}>
              <AlertCircle size={16} />
              Total dû : <strong className="tabular">{formatCurrency(clientCourant.total)}</strong>
            </div>
            <ul className={styles.dettes}>
              {clientCourant.ventes.map((v) => (
                <li key={v.id} className={styles.dette}>
                  <div className={styles.detteInfo}>
                    <span className={`${styles.detteDate} tabular`}>{formatDateTime(v.created_at)}</span>
                    <span className={styles.detteProduits}>{resumeProduits(v.lignes)}</span>
                  </div>
                  <span className={`${styles.detteMontant} tabular`}>{formatCurrency(v.montant_total)}</span>
                  <Button size="sm" variant="navy" onClick={() => setConfirmVente(v)}>
                    Marquer payé
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Modal>

      {/* --- Confirmation paiement --- */}
      <Modal
        open={!!confirmVente}
        onClose={() => setConfirmVente(null)}
        size="sm"
        eyebrow="Encaissement"
        title="Confirmer le paiement ?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmVente(null)}>
              Annuler
            </Button>
            <Button variant="navy" loading={payer.isPending} onClick={marquerPaye}>
              Confirmer le paiement
            </Button>
          </>
        }
      >
        {confirmVente && clientCourant && (
          <p>
            Confirmer le paiement de{' '}
            <strong className="tabular">{formatCurrency(confirmVente.montant_total)}</strong> par{' '}
            <strong>{clientCourant.prenom} {clientCourant.nom}</strong> ?
            <br />
            <br />
            La vente passera en « Payée » et la patronne sera notifiée sur WhatsApp.
          </p>
        )}
      </Modal>
    </PageWrapper>
  );
}
