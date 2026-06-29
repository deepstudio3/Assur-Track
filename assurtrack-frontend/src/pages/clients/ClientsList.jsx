import { useMemo, useState } from 'react';
import { Plus, Search, Phone, Mail, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Loader from '../../components/ui/Loader';
import { useContrats } from '../../hooks/useContrats';
import styles from './ClientsList.module.css';

export default function ClientsList() {
  const [query, setQuery] = useState('');
  const { data, isLoading } = useContrats({ limit: 200 });

  // Dérive la liste des clients (uniques) à partir des contrats.
  const clients = useMemo(() => {
    const map = new Map();
    for (const c of data?.data || []) {
      const cl = c.client;
      if (!cl) continue;
      const key = cl.id || `${cl.prenom} ${cl.nom}`;
      if (!map.has(key)) map.set(key, { ...cl, contrats: 0 });
      map.get(key).contrats += 1;
    }
    return [...map.values()];
  }, [data]);

  const rows = useMemo(() => {
    if (!query) return clients;
    const q = query.toLowerCase();
    return clients.filter((c) =>
      `${c.prenom} ${c.nom} ${c.telephone_wa} ${c.email || ''}`.toLowerCase().includes(q),
    );
  }, [clients, query]);

  return (
    <PageWrapper
      eyebrow="Portefeuille"
      title="Clients assurés"
      actions={
        <Button icon={Plus} onClick={() => toast.success('Formulaire client à venir')}>
          Nouveau client
        </Button>
      }
    >
      <div className={styles.searchBar}>
        <Search size={17} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Rechercher un client par nom, téléphone ou e-mail…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Card>
          <Loader center />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="Aucun client trouvé" description="Essayez un autre terme de recherche." />
        </Card>
      ) : (
        <div className={styles.grid}>
          {rows.map((c) => (
            <Card key={c.id} className={styles.clientCard}>
              <div className={styles.cardTop}>
                <span className={styles.avatar}>
                  {c.prenom[0]}
                  {c.nom[0]}
                </span>
                <Badge tone="info">
                  {c.contrats} contrat{c.contrats > 1 ? 's' : ''}
                </Badge>
              </div>
              <h3 className={styles.name}>
                {c.prenom} {c.nom}
              </h3>
              <ul className={styles.meta}>
                <li>
                  <Phone size={14} /> <span className="tabular">{c.telephone_wa}</span>
                </li>
                <li>
                  <Mail size={14} /> {c.email || <span className={styles.muted}>—</span>}
                </li>
              </ul>
              <button className={styles.cardLink} onClick={() => toast('Fiche client à venir')}>
                <FileText size={14} /> Voir les contrats
              </button>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
