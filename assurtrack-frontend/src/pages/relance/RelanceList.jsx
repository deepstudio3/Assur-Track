import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Send, Pencil, CalendarDays, Search } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';
import EcheanceSparkline from '../../components/signature/EcheanceSparkline';
import { useContrats, useEnvoyerRelance } from '../../hooks/useContrats';
import { daysUntil, formatDate } from '../../utils/formatDate';
import styles from './Relance.module.css';

const FILTERS = [
  { key: 'tous', label: 'Tous' },
  { key: 'actifs', label: 'Actifs' },
  { key: 'urgents', label: 'Échéance ≤ 30 j' },
  { key: 'expires', label: 'Expirés' },
];

const STATUT_TONE = { actif: 'success', expire: 'danger', renouvele: 'info', suspendu: 'neutral' };
const STATUT_LABEL = { actif: 'Actif', expire: 'Expiré', renouvele: 'Renouvelé', suspendu: 'Suspendu' };

export default function RelanceList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('tous');
  const [query, setQuery] = useState('');
  const { data, isLoading } = useContrats({ limit: 100 });
  const envoyer = useEnvoyerRelance();
  const contrats = data?.data || [];

  const rows = useMemo(() => {
    return contrats.filter((c) => {
      const d = daysUntil(c.date_expiration);
      if (filter === 'actifs' && c.statut !== 'actif') return false;
      if (filter === 'expires' && !(c.statut === 'expire' || d < 0)) return false;
      if (filter === 'urgents' && !(d >= 0 && d <= 30)) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${c.client.prenom} ${c.client.nom} ${c.numero_police} ${c.type_assurance}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => daysUntil(a.date_expiration) - daysUntil(b.date_expiration));
  }, [contrats, filter, query]);

  const sendReminder = (c, e) => {
    e.stopPropagation();
    envoyer.mutate(c.id);
  };

  const columns = [
    {
      key: 'client',
      header: 'Client',
      render: (c) => (
        <div className={styles.cellClient}>
          <span className={styles.clientName}>
            {c.client.prenom} {c.client.nom}
          </span>
          <span className={styles.clientPhone}>{c.client.telephone_wa}</span>
        </div>
      ),
    },
    { key: 'numero_police', header: 'N° Police', mono: true },
    { key: 'type_assurance', header: 'Type' },
    {
      key: 'expiration',
      header: 'Expiration',
      mono: true,
      render: (c) => formatDate(c.date_expiration, 'd MMM yyyy'),
    },
    {
      key: 'echeance',
      header: 'Échéance',
      width: 160,
      render: (c) => <EcheanceSparkline date={c.date_expiration} />,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (c) => <Badge tone={STATUT_TONE[c.statut]}>{STATUT_LABEL[c.statut]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (c) => (
        <div className={styles.rowActions}>
          <button
            className={styles.iconBtn}
            title="Envoyer un rappel"
            onClick={(e) => sendReminder(c, e)}
          >
            <Send size={16} />
          </button>
          <button
            className={styles.iconBtn}
            title="Modifier"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/assurance/nouveau');
            }}
          >
            <Pencil size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
      eyebrow="Module relance"
      title="Contrats & échéances"
      actions={
        <>
          <Button variant="outline" icon={CalendarDays} onClick={() => navigate('/relance/calendrier')}>
            Calendrier
          </Button>
          <Button icon={Plus} onClick={() => navigate('/assurance/nouveau')}>
            Nouveau contrat
          </Button>
        </>
      }
    >
      <Card>
        <div className={styles.toolbar}>
          <div className={styles.pills}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`${styles.pill} ${filter === f.key ? styles.pillActive : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className={styles.search}>
            <Search size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Rechercher un client, une police…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <Loader center />
        ) : (
        <Table
          columns={columns}
          data={rows}
          onRowClick={() => navigate('/assurance/nouveau')}
          empty={
            <EmptyState
              title="Aucun contrat trouvé"
              description="Modifiez vos filtres ou ajoutez un premier contrat pour commencer à suivre ses échéances."
              action={
                <Button icon={Plus} onClick={() => navigate('/assurance/nouveau')}>
                  Nouveau contrat
                </Button>
              }
            />
          }
        />
        )}

        {!isLoading && rows.length > 0 && (
          <div className={styles.tableFoot}>
            <span>
              {rows.length} contrat{rows.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
