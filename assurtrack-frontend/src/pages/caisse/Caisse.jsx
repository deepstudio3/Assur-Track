import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  TrendingDown,
  CheckCircle2,
  Coins,
  Hash,
  History,
  Lock,
  HandCoins,
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import { Input } from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Cachet from '../../components/signature/Cachet';
import { useAuthStore } from '../../store/authStore';
import { isPatronne } from '../../utils/roleGuard';
import { allocateCaisse } from '../../utils/caisse';
import { useCaisse, useRembourser } from '../../hooks/useCaisse';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import styles from './Caisse.module.css';

export default function Caisse() {
  const user = useAuthStore((s) => s.user);
  return isPatronne(user) ? <CaissePatronneView user={user} /> : <CaisseSecretaireView />;
}

function DebtEntry({ debt }) {
  return (
    <li className={styles.entry} data-statut={debt.statut}>
      <div className={styles.spine} aria-hidden />
      <div className={styles.when}>
        <span className={`${styles.date} tabular`}>{formatDateTime(debt.created_at)}</span>
        {debt.secretaire && <span className={styles.sec}>{debt.secretaire}</span>}
      </div>
      <div className={styles.motif}>{debt.motif}</div>
      <div className={`${styles.amount} tabular`}>{formatCurrency(debt.montant)}</div>
      <div className={styles.action}>
        {debt.statut === 'rembourse' ? (
          <Cachet date={debt.solde_at} by={debt.solde_par} size="sm" />
        ) : debt.statut === 'partiel' ? (
          <div className={styles.gaugeWrap}>
            <div className={styles.gauge}>
              <span className={styles.gaugeFill} style={{ width: `${Math.round((debt.montant_rembourse / debt.montant) * 100)}%` }} />
            </div>
            <span className={`${styles.gaugeLabel} tabular`}>
              {formatCurrency(debt.montant_rembourse, { suffix: '' })} / {formatCurrency(debt.montant)}
            </span>
          </div>
        ) : (
          <Badge tone="danger" dot>Dû</Badge>
        )}
      </div>
    </li>
  );
}

/* ===================== Vue patronne ===================== */
function CaissePatronneView() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCaisse();
  const rembourser = useRembourser();
  const [filter, setFilter] = useState('tout');
  const [target, setTarget] = useState(null);
  const [montant, setMontant] = useState('');

  const { groups, totals } = useMemo(
    () => allocateCaisse(data?.dettes || [], data?.remboursements || []),
    [data],
  );
  const secretaires = useMemo(() => Object.values(groups).sort((a, b) => b.reste - a.reste), [groups]);

  const matchFilter = (d) =>
    filter === 'tout' ||
    (filter === 'du' && d.statut !== 'rembourse') ||
    (filter === 'rembourse' && d.statut === 'rembourse');

  const openRembours = (group) => {
    setTarget(group);
    setMontant(String(group.reste));
  };

  const confirmRembours = async () => {
    const value = Number(montant);
    if (!value || value <= 0 || value > target.reste) return;
    await rembourser.mutateAsync({ secretaire_id: target.secretaire_id, montant: value });
    setTarget(null);
  };

  if (isLoading) return <PageWrapper eyebrow="Caisse patronne" title="Ce que je dois à mes secrétaires"><Loader center /></PageWrapper>;
  if (isError) return <PageWrapper eyebrow="Caisse patronne" title="Ce que je dois à mes secrétaires"><EmptyState title="Erreur de chargement" description="Impossible de charger la caisse." /></PageWrapper>;

  return (
    <PageWrapper
      eyebrow="Caisse patronne"
      title="Ce que je dois à mes secrétaires"
      actions={
        <Button variant="outline" icon={History} onClick={() => navigate('/caisse/historique')}>
          Historique
        </Button>
      }
    >
      <div className={styles.banner}>
        <ShieldCheck size={18} />
        <span>
          Vous remboursez par tranches, secrétaire par secrétaire. Chaque tranche notifie la
          secrétaire sur WhatsApp et solde ses dettes les plus anciennes d'abord.
        </span>
      </div>

      <section className={styles.stats}>
        <StatCard index={0} label="Total emprunté" value={formatCurrency(totals.total, { suffix: '' })} unit="FCFA" icon={Coins} />
        <StatCard index={1} label="Total remboursé" value={formatCurrency(totals.rembourse, { suffix: '' })} unit="FCFA" icon={CheckCircle2} accent="success" />
        <StatCard index={2} label="Reste à rembourser" value={formatCurrency(totals.reste, { suffix: '' })} unit="FCFA" icon={TrendingDown} accent="gold" />
        <StatCard index={3} label="Dettes" value={totals.nbDettes} icon={Hash} />
      </section>

      <div className={styles.filterRow}>
        {[{ k: 'tout', l: 'Toutes' }, { k: 'du', l: 'En cours' }, { k: 'rembourse', l: 'Soldées' }].map((f) => (
          <button key={f.k} className={`${styles.pill} ${filter === f.k ? styles.pillActive : ''}`} onClick={() => setFilter(f.k)}>
            {f.l}
          </button>
        ))}
      </div>

      {secretaires.length === 0 && (
        <Card><EmptyState icon={CheckCircle2} title="Aucune dette" description="La patronne ne doit rien à ses secrétaires pour le moment." /></Card>
      )}

      {secretaires.map((g) => {
        const debts = g.debts.filter(matchFilter);
        if (!debts.length) return null;
        const pct = g.total ? Math.round((g.rembourse / g.total) * 100) : 0;
        return (
          <Card key={g.secretaire} className={styles.group}>
            <div className={styles.groupHead}>
              <div className={styles.groupWho}>
                <span className={styles.groupAvatar}>
                  {g.secretaire.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                </span>
                <div>
                  <h3 className={styles.groupName}>{g.secretaire}</h3>
                  <span className={styles.groupMeta}>
                    {g.debts.length} dette{g.debts.length > 1 ? 's' : ''} · remboursé {pct}%
                  </span>
                </div>
              </div>
              <div className={styles.groupRight}>
                <div className={styles.groupBalance}>
                  <span className={styles.groupBalanceLabel}>Reste dû</span>
                  <span className={`${styles.groupBalanceValue} tabular`} data-zero={g.reste === 0}>
                    {formatCurrency(g.reste)}
                  </span>
                </div>
                <Button size="sm" variant="navy" icon={HandCoins} disabled={g.reste === 0} onClick={() => openRembours(g)}>
                  Rembourser
                </Button>
              </div>
            </div>
            <div className={styles.groupGauge} aria-hidden>
              <span className={styles.groupGaugeFill} style={{ width: `${pct}%` }} />
            </div>
            <ul className={styles.ledger}>
              {debts.map((d) => <DebtEntry key={d.id} debt={d} />)}
            </ul>
          </Card>
        );
      })}

      <p className={styles.immutable}>
        <Lock size={13} /> Registre immuable — dettes et remboursements s'ajoutent mais ne s'effacent
        jamais. Le statut de chaque dette est recalculé à partir des tranches versées.
      </p>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        eyebrow="Validation patronne"
        title={target ? `Rembourser ${target.secretaire}` : ''}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)}>Annuler</Button>
            <Button
              variant="navy"
              icon={HandCoins}
              loading={rembourser.isPending}
              disabled={!montant || Number(montant) <= 0 || (target && Number(montant) > target.reste)}
              onClick={confirmRembours}
            >
              Confirmer le versement
            </Button>
          </>
        }
      >
        {target && (
          <>
            <p style={{ marginBottom: 16 }}>
              Reste dû à <strong>{target.secretaire}</strong> :{' '}
              <strong className="tabular">{formatCurrency(target.reste)}</strong>. Les dettes les plus
              anciennes seront soldées en premier.
            </p>
            <Input
              label="Montant à verser"
              type="number"
              inputMode="numeric"
              min="0"
              max={target.reste}
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              suffix="FCFA"
              error={Number(montant) > target.reste ? 'Le montant dépasse le reste dû' : undefined}
            />
            <div className={styles.quickAmounts}>
              {[0.25, 0.5, 1].map((f) => {
                const v = Math.round(target.reste * f);
                return (
                  <button key={f} type="button" className={styles.quickBtn} onClick={() => setMontant(String(v))}>
                    {f === 1 ? 'Tout' : `${f * 100}%`} · {formatCurrency(v)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </PageWrapper>
  );
}

/* ===================== Vue secrétaire ===================== */
function CaisseSecretaireView() {
  const navigate = useNavigate();
  const { data, isLoading } = useCaisse();
  const [filter, setFilter] = useState('tout');

  const { groups, totals } = useMemo(
    () => allocateCaisse(data?.dettes || [], data?.remboursements || []),
    [data],
  );
  const debts = (Object.values(groups)[0]?.debts || []).filter(
    (d) =>
      filter === 'tout' ||
      (filter === 'du' && d.statut !== 'rembourse') ||
      (filter === 'rembourse' && d.statut === 'rembourse'),
  );

  if (isLoading) return <PageWrapper eyebrow="Ma caisse" title="Ce que la patronne me doit"><Loader center /></PageWrapper>;

  return (
    <PageWrapper
      eyebrow="Ma caisse"
      title="Ce que la patronne me doit"
      actions={
        <Button icon={Plus} onClick={() => navigate('/caisse/nouvelle-operation')}>
          Déclarer une dette
        </Button>
      }
    >
      <div className={styles.banner}>
        <ShieldCheck size={18} />
        <span>
          Déclarez chaque fois que la patronne prend de l'argent dans votre caisse. Elle est notifiée
          aussitôt sur WhatsApp, et vous suivez ici chaque remboursement (même partiel).
        </span>
      </div>

      <section className={styles.stats}>
        <StatCard index={0} label="Total prêté" value={formatCurrency(totals.total, { suffix: '' })} unit="FCFA" icon={Coins} />
        <StatCard index={1} label="Déjà remboursé" value={formatCurrency(totals.rembourse, { suffix: '' })} unit="FCFA" icon={CheckCircle2} accent="success" />
        <StatCard index={2} label="Reste à me rembourser" value={formatCurrency(totals.reste, { suffix: '' })} unit="FCFA" icon={TrendingDown} accent="gold" />
      </section>

      <Card>
        <div className={styles.filterRow}>
          {[{ k: 'tout', l: 'Tout' }, { k: 'du', l: 'En cours' }, { k: 'rembourse', l: 'Soldé' }].map((f) => (
            <button key={f.k} className={`${styles.pill} ${filter === f.k ? styles.pillActive : ''}`} onClick={() => setFilter(f.k)}>
              {f.l}
            </button>
          ))}
        </div>

        {debts.length === 0 ? (
          <EmptyState
            title="Aucune dette déclarée"
            description="Déclarez une dette dès que la patronne prend de l'argent dans votre caisse."
            action={<Button icon={Plus} onClick={() => navigate('/caisse/nouvelle-operation')}>Déclarer une dette</Button>}
          />
        ) : (
          <ul className={styles.ledger}>
            {debts.map((d) => <DebtEntry key={d.id} debt={d} />)}
          </ul>
        )}
        <p className={styles.immutable}>
          <Lock size={13} /> Vous ne voyez que vos propres dettes. Une fois déclarée, une dette ne
          peut plus être modifiée ni supprimée.
        </p>
      </Card>
    </PageWrapper>
  );
}
