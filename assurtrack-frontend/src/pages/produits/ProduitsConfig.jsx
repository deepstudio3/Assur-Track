import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Package, Power } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import Loader from '../../components/ui/Loader';
import { useProduits, useCreateProduit, useUpdateProduit } from '../../hooks/useProduits';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from './ProduitsConfig.module.css';

const CAT_LABEL = { boisson: 'Boisson', service: 'Service' };

export default function ProduitsConfig() {
  const { data: produits = [], isLoading } = useProduits();
  const createProduit = useCreateProduit();
  const updateProduit = useUpdateProduit();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ nom: '', prix_unitaire: '', categorie: 'boisson' });

  const toggle = (p) => updateProduit.mutate({ id: p.id, actif: !p.actif });

  const ajouter = async () => {
    if (!form.nom.trim() || !(Number(form.prix_unitaire) >= 0)) return;
    try {
      await createProduit.mutateAsync({
        nom: form.nom.trim(),
        prix_unitaire: Number(form.prix_unitaire),
        categorie: form.categorie,
      });
      setForm({ nom: '', prix_unitaire: '', categorie: 'boisson' });
      setAdding(false);
    } catch {
      /* toast géré par le hook */
    }
  };

  return (
    <PageWrapper
      eyebrow="Comptabilité"
      title="Catalogue produits"
      actions={
        <Button icon={Plus} onClick={() => setAdding(true)}>
          Ajouter un produit
        </Button>
      }
    >
      <Card>
        {isLoading && <Loader center />}
        <ul className={styles.list}>
          {produits.map((p) => (
            <li key={p.id} className={styles.row} data-off={!p.actif}>
              <span className={styles.icon}>
                <Package size={18} />
              </span>
              <div className={styles.info}>
                <span className={styles.name}>{p.nom}</span>
                <Badge tone={p.categorie === 'service' ? 'info' : 'neutral'}>
                  {CAT_LABEL[p.categorie] || p.categorie}
                </Badge>
              </div>
              <span className={`${styles.price} tabular`}>{formatCurrency(p.prix_unitaire)}</span>
              <Badge tone={p.actif ? 'success' : 'neutral'} dot>
                {p.actif ? 'Actif' : 'Inactif'}
              </Badge>
              <Button
                size="sm"
                variant={p.actif ? 'ghost' : 'outline'}
                icon={Power}
                onClick={() => toggle(p)}
              >
                {p.actif ? 'Désactiver' : 'Activer'}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        eyebrow="Catalogue"
        title="Nouveau produit"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Annuler
            </Button>
            <Button
              icon={Plus}
              loading={createProduit.isPending}
              disabled={!form.nom.trim() || !(Number(form.prix_unitaire) >= 0)}
              onClick={ajouter}
            >
              Ajouter
            </Button>
          </>
        }
      >
        <div className={styles.formFields}>
          <Input
            label="Nom du produit"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            placeholder="Ex. Jus de bissap"
          />
          <Input
            label="Prix unitaire"
            type="number"
            min="0"
            value={form.prix_unitaire}
            onChange={(e) => setForm((f) => ({ ...f, prix_unitaire: e.target.value }))}
            placeholder="0"
            suffix="FCFA"
          />
          <Select
            label="Catégorie"
            value={form.categorie}
            onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value }))}
          >
            <option value="boisson">Boisson</option>
            <option value="service">Service</option>
          </Select>
        </div>
      </Modal>
    </PageWrapper>
  );
}
