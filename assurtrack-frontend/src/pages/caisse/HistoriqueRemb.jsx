import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import { useCaisse } from '../../hooks/useCaisse';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';

export default function HistoriqueRemb() {
  const navigate = useNavigate();
  const { data, isLoading } = useCaisse();

  const rows = useMemo(
    () => [...(data?.remboursements || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [data],
  );
  const total = rows.reduce((s, r) => s + r.montant, 0);

  const columns = [
    { key: 'created_at', header: 'Versé le', mono: true, render: (r) => formatDateTime(r.created_at) },
    { key: 'secretaire', header: 'À la secrétaire', render: (r) => <strong>{r.secretaire}</strong> },
    {
      key: 'montant',
      header: 'Montant versé',
      mono: true,
      align: 'right',
      render: (r) => <Badge tone="success" dot>{formatCurrency(r.montant)}</Badge>,
    },
    { key: 'par', header: 'Validé par', render: (r) => r.par || '—' },
  ];

  return (
    <PageWrapper
      eyebrow="Caisse patronne"
      title="Journal des remboursements"
      actions={
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/caisse')}>
          Retour à la caisse
        </Button>
      }
    >
      <Card>
        <CardHeader
          eyebrow={`${rows.length} tranche${rows.length > 1 ? 's' : ''} versée${rows.length > 1 ? 's' : ''}`}
          title="Tranches versées aux secrétaires"
          action={<span className="tabular" style={{ fontWeight: 700, color: 'var(--success-500)' }}>{formatCurrency(total)}</span>}
        />
        {isLoading ? (
          <Loader center />
        ) : (
          <Table
            columns={columns}
            data={rows}
            empty={<EmptyState title="Aucun remboursement" description="Les tranches versées aux secrétaires apparaîtront ici." />}
          />
        )}
      </Card>
    </PageWrapper>
  );
}
