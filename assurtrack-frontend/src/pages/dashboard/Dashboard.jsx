import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, Send, AlarmClock, Wallet, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import PageWrapper from '../../components/layout/PageWrapper';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import EcheanceHorizon from '../../components/signature/EcheanceHorizon';
import Cachet from '../../components/signature/Cachet';
import { useAuthStore } from '../../store/authStore';
import { isPatronne } from '../../utils/roleGuard';
import { allocateCaisse } from '../../utils/caisse';
import { resumeProduits } from '../../mock/ventes';
import { formatCurrency } from '../../utils/formatCurrency';
import { daysUntil, jLabel, formatDateTime } from '../../utils/formatDate';
import { useDashboardStats, useVentesStats } from '../../hooks/useDashboard';
import { useContrats } from '../../hooks/useContrats';
import { useCaisse } from '../../hooks/useCaisse';
import { useVentes } from '../../hooks/useVentes';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const patronne = isPatronne(user);

  const statsQ = useDashboardStats();
  const ventesStatsQ = useVentesStats();
  const contratsQ = useContrats({ limit: 100 });
  const caisseQ = useCaisse();
  const ventesQ = useVentes();

  const contrats = contratsQ.data?.data || [];
  const caisse = caisseQ.data || { dettes: [], remboursements: [] };
  const ventes = ventesQ.data || [];
  const stats = statsQ.data;
  const vstats = ventesStatsQ.data;

  const serie = useMemo(
    () => (stats?.relances_serie || []).map((d) => ({ ...d, label: d.date.slice(8) })),
    [stats],
  );

  const urgents = useMemo(
    () =>
      contrats
        .filter((c) => {
          const d = daysUntil(c.date_expiration);
          return d !== null && d >= 0 && d <= 7;
        })
        .sort((a, b) => daysUntil(a.date_expiration) - daysUntil(b.date_expiration))
        .slice(0, 5),
    [contrats],
  );

  const allDebts = useMemo(
    () =>
      allocateCaisse(caisse.dettes, caisse.remboursements)
        .allDebts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3),
    [caisse],
  );

  const dernieresVentes = useMemo(
    () => [...ventes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
    [ventes],
  );

  if (statsQ.isLoading) {
    return (
      <PageWrapper eyebrow="Vue d'ensemble" title="Tableau de bord">
        <Loader center />
      </PageWrapper>
    );
  }

  const resteCaisse = stats?.caisse?.reste_du ?? 0;

  return (
    <PageWrapper eyebrow="Vue d'ensemble" title="Tableau de bord">
      <section className={styles.stats}>
        <StatCard index={0} label="Contrats actifs" value={stats?.contrats_actifs ?? 0} icon={FileCheck2} hint="portefeuille en cours" />
        <StatCard index={1} label="Relances · 30 jours" value={stats?.relances_30j ?? 0} icon={Send} />
        <StatCard index={2} label="Échéances ≤ 7 jours" value={stats?.echeances_7j ?? 0} icon={AlarmClock} accent="danger" hint="à relancer en priorité" />
        <StatCard
          index={3}
          label={patronne ? 'Ce que je dois' : 'Reste à me rembourser'}
          value={formatCurrency(resteCaisse, { suffix: '' })}
          unit="FCFA"
          icon={Wallet}
          accent="gold"
          hint={patronne ? 'à mes secrétaires' : 'la patronne vous doit'}
        />
      </section>

      {/* SIGNATURE — Horizon des échéances */}
      <Card className={styles.horizon}>
        <CardHeader
          eyebrow="Module relance"
          title="Horizon des échéances"
          action={
            <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/relance')}>
              Voir tous les contrats
            </Button>
          }
        />
        <EcheanceHorizon contrats={contrats} onSelect={() => navigate('/relance')} />
      </Card>

      <section className={styles.grid2}>
        <Card>
          <CardHeader eyebrow="À traiter" title="Relances urgentes" />
          {urgents.length === 0 ? (
            <p className={styles.calm}>Aucune échéance dans les 7 prochains jours. 👌</p>
          ) : (
            <ul className={styles.urgentList}>
              {urgents.map((c) => {
                const d = daysUntil(c.date_expiration);
                return (
                  <li key={c.id} className={styles.urgentItem}>
                    <div className={styles.urgentWho}>
                      <span className={styles.urgentName}>
                        {c.client.prenom} {c.client.nom}
                      </span>
                      <span className={styles.urgentMeta}>
                        {c.type_assurance} · {c.numero_police}
                      </span>
                    </div>
                    <Badge tone={d <= 3 ? 'danger' : 'warning'} className="tabular">
                      {jLabel(c.date_expiration)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="30 derniers jours" title="Relances envoyées" />
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={serie} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEnvoi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E89A0A" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#E89A0A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEF1F8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#959DB8' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 11, fill: '#959DB8' }} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #DDE2EE', fontSize: 13 }}
                  labelFormatter={(l) => `Jour ${l}`}
                  formatter={(v) => [v, 'Relances']}
                />
                <Area type="monotone" dataKey="envoyees" stroke="#C47A00" strokeWidth={2} fill="url(#gradEnvoi)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* Caisse : dettes (patronne = toutes ; secrétaire = les siennes) */}
      <Card className={styles.opsCard}>
        <CardHeader
          eyebrow={patronne ? 'Caisse patronne' : 'Ma caisse'}
          title={patronne ? 'Dernières dettes' : 'Mes prêts à la patronne'}
          action={
            <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/caisse')}>
              {patronne ? 'Ouvrir la caisse' : 'Ouvrir ma caisse'}
            </Button>
          }
        />
        {allDebts.length === 0 ? (
          <p className={styles.calm}>Aucune dette en cours.</p>
        ) : (
          <ul className={styles.ops}>
            {allDebts.map((o) => (
              <li key={o.id} className={styles.opItem}>
                <div className={styles.opSpine} aria-hidden />
                <div className={styles.opWho}>
                  <span className={styles.opSec}>{patronne ? o.secretaire : o.motif}</span>
                  <span className={styles.opMotif}>{patronne ? o.motif : ''}</span>
                  <span className={styles.opTime}>{formatDateTime(o.created_at)}</span>
                </div>
                <span className={`${styles.opAmount} tabular`}>{formatCurrency(o.montant)}</span>
                <div className={styles.opStatus}>
                  {o.statut === 'rembourse' ? (
                    <Cachet date={o.solde_at} by={o.solde_par} size="sm" />
                  ) : o.statut === 'partiel' ? (
                    <Badge tone="gold" dot>Partiel</Badge>
                  ) : (
                    <Badge tone={patronne ? 'danger' : 'warning'} dot>
                      {patronne ? 'Dû' : 'En attente'}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Dernières ventes */}
      <Card className={styles.opsCard}>
        <CardHeader
          eyebrow="Comptabilité"
          title="Dernières ventes"
          action={
            <div className={styles.ventesKpis}>
              <span className={styles.kpi}>
                CA du jour <strong className="tabular">{formatCurrency(vstats?.ca_jour ?? 0)}</strong>
              </span>
              <span className={styles.kpi} data-tone="gold">
                Dettes <strong className="tabular">{formatCurrency(vstats?.total_dettes ?? 0)}</strong>
              </span>
              <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => navigate('/ventes')}>
                Voir
              </Button>
            </div>
          }
        />
        {dernieresVentes.length === 0 ? (
          <p className={styles.calm}>Aucune vente enregistrée.</p>
        ) : (
          <ul className={styles.ops}>
            {dernieresVentes.map((v) => (
              <li key={v.id} className={styles.opItem}>
                <div className={styles.opSpine} aria-hidden />
                <div className={styles.opWho}>
                  <span className={styles.opSec}>{v.resume || resumeProduits(v.lignes)}</span>
                  <span className={styles.opTime}>
                    {formatDateTime(v.created_at)} · {v.secretaire}
                  </span>
                </div>
                <span className={`${styles.opAmount} tabular`}>{formatCurrency(v.montant_total)}</span>
                <div className={styles.opStatus}>
                  <Badge tone={v.mode_paiement === 'credit' ? 'gold' : 'neutral'}>
                    {v.mode_paiement === 'credit' ? 'À crédit' : 'Comptant'}
                  </Badge>
                  <Badge tone={v.statut === 'payee' ? 'success' : 'warning'} dot>
                    {v.statut === 'payee' ? 'Payée' : 'En attente'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageWrapper>
  );
}
