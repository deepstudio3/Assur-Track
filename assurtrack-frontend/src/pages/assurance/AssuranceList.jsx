import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, TrendingUp, CalendarRange, FileSignature, Paperclip } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import PageWrapper from '../../components/layout/PageWrapper';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';
import EcheanceSparkline from '../../components/signature/EcheanceSparkline';
import DocumentsModal from './DocumentsModal';
import { useContrats } from '../../hooks/useContrats';
import { useAssuranceStats } from '../../hooks/useDashboard';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import rel from '../relance/Relance.module.css';
import styles from './Assurance.module.css';

const STATUT_TONE = { actif: 'success', expire: 'danger', renouvele: 'info', suspendu: 'neutral' };
const STATUT_LABEL = { actif: 'Actif', expire: 'Expiré', renouvele: 'Renouvelé', suspendu: 'Suspendu' };

const moisLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');

export default function AssuranceList() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [docContrat, setDocContrat] = useState(null);
  const { data, isLoading } = useContrats({ limit: 100 });
  const fin = useAssuranceStats();
  const contrats = data?.data || [];
  const f = fin.data;

  const variation = f?.variation_mois ?? 0;
  const serie = useMemo(
    () =>
      (f?.serie || []).map((s, i, arr) => ({
        ...s,
        label: moisLabel(s.mois),
        current: i === arr.length - 1,
      })),
    [f],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contrats
      .filter((c) => {
        if (!q) return true;
        const hay = `${c.client.prenom} ${c.client.nom} ${c.numero_police} ${c.type_assurance}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.date_souscription) - new Date(a.date_souscription));
  }, [contrats, query]);

  const columns = [
    {
      key: 'client',
      header: 'Client',
      render: (c) => (
        <div className={rel.cellClient}>
          <span className={rel.clientName}>
            {c.client.prenom} {c.client.nom}
          </span>
          <span className={rel.clientPhone}>{c.numero_police}</span>
        </div>
      ),
    },
    { key: 'type_assurance', header: 'Type' },
    {
      key: 'montant',
      header: "Montant de l'assurance",
      align: 'right',
      render: (c) =>
        c.montant_prime ? (
          <span className={styles.montant}>{formatCurrency(c.montant_prime)}</span>
        ) : (
          <span className={styles.montantVide}>—</span>
        ),
    },
    {
      key: 'souscription',
      header: 'Souscrit le',
      mono: true,
      render: (c) => formatDate(c.date_souscription, 'd MMM yyyy'),
    },
    {
      key: 'echeance',
      header: 'Échéance',
      width: 150,
      render: (c) => <EcheanceSparkline date={c.date_expiration} />,
    },
    {
      key: 'documents',
      header: 'Docs',
      align: 'center',
      render: (c) => (
        <button
          type="button"
          className={`${styles.docBadge} ${c.documents_count ? '' : styles.docBadgeEmpty}`}
          title="Documents du contrat"
          onClick={(e) => {
            e.stopPropagation();
            setDocContrat(c);
          }}
        >
          <Paperclip size={13} />
          {c.documents_count || 0}
        </button>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (c) => <Badge tone={STATUT_TONE[c.statut]}>{STATUT_LABEL[c.statut]}</Badge>,
    },
  ];

  return (
    <PageWrapper
      eyebrow="Module assurance"
      title="Assurance"
      actions={
        <Button icon={Plus} onClick={() => navigate('/assurance/nouveau')}>
          Nouveau contrat
        </Button>
      }
    >
      {/* Hero finances */}
      <section className={styles.stats}>
        <StatCard
          index={0}
          label="Revenus ce mois"
          value={formatCurrency(f?.ca_mois ?? 0, { suffix: '' })}
          unit="FCFA"
          icon={TrendingUp}
          accent="gold"
          trend={{ value: `${variation >= 0 ? '+' : ''}${variation}%`, dir: variation >= 0 ? 'up' : 'down' }}
          hint="vs mois passé"
        />
        <StatCard
          index={1}
          label="Mois passé"
          value={formatCurrency(f?.ca_mois_prec ?? 0, { suffix: '' })}
          unit="FCFA"
          icon={CalendarRange}
        />
        <StatCard
          index={2}
          label="Il y a 2 mois"
          value={formatCurrency(f?.ca_mois_prec2 ?? 0, { suffix: '' })}
          unit="FCFA"
          icon={CalendarRange}
        />
        <StatCard
          index={3}
          label="Contrats ce mois"
          value={f?.nb_mois ?? 0}
          icon={FileSignature}
          hint={`${f?.nb_total ?? 0} au total`}
        />
      </section>

      {/* Chiffre d'affaires — 6 derniers mois */}
      <Card>
        <CardHeader
          eyebrow="Chiffre d'affaires"
          title="6 derniers mois"
          action={
            <span className="tabular" style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              Total portefeuille&nbsp;
              <strong style={{ color: 'var(--gray-800)' }}>{formatCurrency(f?.ca_total ?? 0)}</strong>
            </span>
          }
        />
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={serie} margin={{ top: 8, right: 6, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#EEF1F8" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#959DB8' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#959DB8' }}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(232,154,10,0.06)' }}
                contentStyle={{ borderRadius: 10, border: '1px solid #DDE2EE', fontSize: 13 }}
                formatter={(v) => [formatCurrency(v), 'Revenus']}
                labelFormatter={(l) => `Mois : ${l}`}
              />
              <Bar dataKey="ca" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {serie.map((d) => (
                  <Cell key={d.mois} fill={d.current ? '#C47A00' : '#FAD47A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Liste des contrats */}
      <Card style={{ marginTop: 'var(--space-6)' }}>
        <div className={rel.toolbar}>
          <span style={{ fontWeight: 700, color: 'var(--gray-800)' }}>Portefeuille de contrats</span>
          <div className={rel.search}>
            <Search size={16} className={rel.searchIcon} />
            <input
              className={rel.searchInput}
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
                title="Aucun contrat"
                description="Enregistrez un premier contrat d'assurance pour suivre vos revenus et programmer les relances."
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
          <div className={rel.tableFoot}>
            <span>
              {rows.length} contrat{rows.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </Card>

      <DocumentsModal contrat={docContrat} onClose={() => setDocContrat(null)} />
    </PageWrapper>
  );
}
