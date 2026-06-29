import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, CalendarRange, AlertCircle, Receipt } from 'lucide-react';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';
import { useVentes } from '../../hooks/useVentes';
import { useVentesStats } from '../../hooks/useDashboard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import styles from './VentesList.module.css';

const PERIODES = [
  { k: 'jour', l: "Aujourd'hui" },
  { k: 'semaine', l: 'Cette semaine' },
  { k: 'mois', l: 'Ce mois' },
  { k: 'tout', l: 'Toutes' },
];
const MODES = [
  { k: 'tout', l: 'Toutes' },
  { k: 'comptant', l: 'Comptant' },
  { k: 'credit', l: 'À crédit' },
];

export default function VentesList() {
  const navigate = useNavigate();
  const [periode, setPeriode] = useState('jour');
  const [mode, setMode] = useState('tout');
  const [detail, setDetail] = useState(null);

  const { data: ventes = [], isLoading } = useVentes();
  const { data: vstats } = useVentesStats();

  const rows = useMemo(() => {
    return ventes.filter((v) => {
      const d = new Date(v.created_at);
      if (periode === 'jour' && !isToday(d)) return false;
      if (periode === 'semaine' && !isThisWeek(d, { weekStartsOn: 1 })) return false;
      if (periode === 'mois' && !isThisMonth(d)) return false;
      if (mode !== 'tout' && v.mode_paiement !== mode) return false;
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [ventes, periode, mode]);

  const columns = [
    { key: 'created_at', header: 'Date', mono: true, render: (v) => formatDateTime(v.created_at) },
    { key: 'secretaire', header: 'Secrétaire' },
    {
      key: 'produits',
      header: 'Produits',
      render: (v) => <span className={styles.resume}>{v.resume}</span>,
    },
    {
      key: 'montant_total',
      header: 'Total',
      mono: true,
      align: 'right',
      render: (v) => formatCurrency(v.montant_total),
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (v) => (
        <Badge tone={v.mode_paiement === 'credit' ? 'gold' : 'neutral'}>
          {v.mode_paiement === 'credit' ? 'À crédit' : 'Comptant'}
        </Badge>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (v) => (
        <Badge tone={v.statut === 'payee' ? 'success' : 'warning'} dot>
          {v.statut === 'payee' ? 'Payée' : 'En attente'}
        </Badge>
      ),
    },
  ];

  return (
    <PageWrapper
      eyebrow="Comptabilité"
      title="Caisse ventes"
      actions={
        <Button icon={Plus} onClick={() => navigate('/ventes/nouvelle')}>
          Nouvelle vente
        </Button>
      }
    >
      <section className={styles.stats}>
        <StatCard index={0} label="CA aujourd'hui" value={formatCurrency(vstats?.ca_jour ?? 0, { suffix: '' })} unit="FCFA" icon={TrendingUp} accent="success" />
        <StatCard index={1} label="CA ce mois" value={formatCurrency(vstats?.ca_mois ?? 0, { suffix: '' })} unit="FCFA" icon={CalendarRange} />
        <StatCard index={2} label="Dettes en cours" value={formatCurrency(vstats?.total_dettes ?? 0, { suffix: '' })} unit="FCFA" icon={AlertCircle} accent="gold" />
        <StatCard index={3} label="Ventes aujourd'hui" value={vstats?.nb_ventes_jour ?? 0} icon={Receipt} />
      </section>

      <Card>
        <div className={styles.toolbar}>
          <div className={styles.pills}>
            {PERIODES.map((p) => (
              <button
                key={p.k}
                className={`${styles.pill} ${periode === p.k ? styles.pillActive : ''}`}
                onClick={() => setPeriode(p.k)}
              >
                {p.l}
              </button>
            ))}
          </div>
          <div className={styles.segmented}>
            {MODES.map((m) => (
              <button
                key={m.k}
                className={`${styles.seg} ${mode === m.k ? styles.segActive : ''}`}
                onClick={() => setMode(m.k)}
              >
                {m.l}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Loader center />
        ) : (
        <Table
          columns={columns}
          data={rows}
          onRowClick={(v) => setDetail(v)}
          empty={
            <EmptyState
              title="Aucune vente sur cette période"
              description="Changez de période ou enregistrez une nouvelle vente."
              action={
                <Button icon={Plus} onClick={() => navigate('/ventes/nouvelle')}>
                  Nouvelle vente
                </Button>
              }
            />
          }
        />
        )}
      </Card>

      {/* --- Modal détail --- */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        eyebrow={detail ? formatDateTime(detail.created_at) : ''}
        title="Détail de la vente"
      >
        {detail && (
          <div className={styles.detail}>
            <div className={styles.detailMeta}>
              <Badge tone={detail.mode_paiement === 'credit' ? 'gold' : 'neutral'}>
                {detail.mode_paiement === 'credit' ? 'À crédit' : 'Comptant'}
              </Badge>
              <Badge tone={detail.statut === 'payee' ? 'success' : 'warning'} dot>
                {detail.statut === 'payee' ? 'Payée' : 'En attente'}
              </Badge>
            </div>
            {detail.mode_paiement === 'credit' && (
              <p className={styles.detailClient}>
                Client : <strong>{detail.client_prenom} {detail.client_nom}</strong>
              </p>
            )}
            <ul className={styles.lignes}>
              {detail.lignes.map((l, i) => (
                <li key={i} className={styles.ligne}>
                  <span>
                    {l.produit_nom} <span className={styles.x}>×{l.quantite}</span>
                  </span>
                  <span className="tabular">{formatCurrency(l.sous_total)}</span>
                </li>
              ))}
            </ul>
            <div className={styles.detailTotal}>
              <span>Total</span>
              <span className="tabular">{formatCurrency(detail.montant_total)}</span>
            </div>
            <p className={styles.detailSec}>Enregistrée par {detail.secretaire}</p>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
