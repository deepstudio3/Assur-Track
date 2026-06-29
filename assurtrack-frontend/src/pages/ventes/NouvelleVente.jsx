import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Minus, ShoppingCart, Check, Trash2, ShieldCheck } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import Loader from '../../components/ui/Loader';
import { useProduits } from '../../hooks/useProduits';
import { useCreateVente } from '../../hooks/useVentes';
import { formatCurrency } from '../../utils/formatCurrency';
import styles from './NouvelleVente.module.css';

const CAT_LABEL = { boisson: 'Boissons', service: 'Services' };

export default function NouvelleVente() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({}); // { produitId: quantite }
  const [mode, setMode] = useState('comptant');
  const [client, setClient] = useState({ nom: '', prenom: '' });
  const [confirm, setConfirm] = useState(false);
  const { data: produitsActifs = [], isLoading } = useProduits({ actifsOnly: true });
  const createVente = useCreateVente();

  const categories = useMemo(
    () => [...new Set(produitsActifs.map((p) => p.categorie))],
    [produitsActifs],
  );

  const lignes = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qte]) => {
          const p = produitsActifs.find((x) => x.id === id);
          return p ? { ...p, quantite: qte, sous_total: p.prix_unitaire * qte } : null;
        })
        .filter(Boolean),
    [cart, produitsActifs],
  );
  const total = lignes.reduce((s, l) => s + l.sous_total, 0);

  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id) =>
    setCart((c) => {
      const q = (c[id] || 0) - 1;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  const removeItem = (id) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });

  const creditValide = mode !== 'credit' || (client.nom.trim() && client.prenom.trim());
  const canValidate = lignes.length > 0 && creditValide;

  const valider = async () => {
    try {
      await createVente.mutateAsync({
        mode_paiement: mode,
        lignes: Object.entries(cart).map(([produit_id, quantite]) => ({ produit_id, quantite })),
        client: mode === 'credit' ? client : undefined,
      });
      setConfirm(false);
      toast.success('Vente enregistrée — la patronne a été notifiée');
      setCart({});
      setClient({ nom: '', prenom: '' });
      setMode('comptant');
      navigate('/ventes');
    } catch {
      /* toast géré par le hook */
    }
  };

  return (
    <PageWrapper
      eyebrow="Caisse ventes"
      title="Nouvelle vente"
      actions={
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/ventes')}>
          Annuler
        </Button>
      }
    >
      <div className={styles.pos}>
        {/* --- Produits --- */}
        <div className={styles.products}>
          {isLoading && <Loader center />}
          {categories.map((cat) => (
            <div key={cat} className={styles.catBlock}>
              <p className={styles.catTitle}>{CAT_LABEL[cat] || cat}</p>
              <div className={styles.grid}>
                {produitsActifs
                  .filter((p) => p.categorie === cat)
                  .map((p) => (
                    <button key={p.id} className={styles.product} onClick={() => add(p.id)}>
                      <span className={styles.productName}>{p.nom}</span>
                      <span className={`${styles.productPrice} tabular`}>{formatCurrency(p.prix_unitaire)}</span>
                      {cart[p.id] > 0 && <span className={styles.productQty}>{cart[p.id]}</span>}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* --- Panier --- */}
        <Card className={styles.cart} pad={false}>
          <div className={styles.cartHead}>
            <ShoppingCart size={18} />
            <h2 className={styles.cartTitle}>Panier</h2>
            {lignes.length > 0 && <Badge tone="info">{lignes.length}</Badge>}
          </div>

          <div className={styles.cartBody}>
            {lignes.length === 0 ? (
              <p className={styles.cartEmpty}>Touchez un produit pour l'ajouter au panier.</p>
            ) : (
              <ul className={styles.cartList}>
                {lignes.map((l) => (
                  <li key={l.id} className={styles.cartItem}>
                    <div className={styles.cartItemInfo}>
                      <span className={styles.cartItemName}>{l.nom}</span>
                      <span className={`${styles.cartItemUnit} tabular`}>{formatCurrency(l.prix_unitaire)}</span>
                    </div>
                    <div className={styles.stepper}>
                      <button onClick={() => dec(l.id)} aria-label="Retirer un">
                        <Minus size={14} />
                      </button>
                      <span className={`${styles.qty} tabular`}>{l.quantite}</span>
                      <button onClick={() => add(l.id)} aria-label="Ajouter un">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className={`${styles.cartItemTotal} tabular`}>{formatCurrency(l.sous_total)}</span>
                    <button className={styles.cartItemDel} onClick={() => removeItem(l.id)} aria-label="Supprimer">
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.cartFoot}>
            <div className={styles.totalRow}>
              <span>Total</span>
              <span className={`${styles.totalValue} tabular`}>{formatCurrency(total)}</span>
            </div>

            <div className={styles.modes}>
              <button
                className={`${styles.mode} ${mode === 'comptant' ? styles.modeActive : ''}`}
                onClick={() => setMode('comptant')}
              >
                <span className={styles.radio} data-on={mode === 'comptant'} />
                Comptant
              </button>
              <button
                className={`${styles.mode} ${mode === 'credit' ? styles.modeActive : ''}`}
                onClick={() => setMode('credit')}
              >
                <span className={styles.radio} data-on={mode === 'credit'} />À crédit
              </button>
            </div>

            {mode === 'credit' && (
              <div className={styles.clientFields}>
                <Input
                  label="Prénom du client"
                  value={client.prenom}
                  onChange={(e) => setClient((c) => ({ ...c, prenom: e.target.value }))}
                  placeholder="Jean"
                />
                <Input
                  label="Nom du client"
                  value={client.nom}
                  onChange={(e) => setClient((c) => ({ ...c, nom: e.target.value }))}
                  placeholder="Mballa"
                />
              </div>
            )}

            <Button full disabled={!canValidate} icon={Check} onClick={() => setConfirm(true)}>
              Valider la vente
            </Button>
          </div>
        </Card>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        eyebrow={mode === 'credit' ? 'Vente à crédit' : 'Vente comptant'}
        title="Valider cette vente ?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Modifier
            </Button>
            <Button icon={Check} loading={createVente.isPending} onClick={valider}>
              Confirmer
            </Button>
          </>
        }
      >
        <p>{lignes.map((l) => `${l.nom} ×${l.quantite}`).join(' · ')}</p>
        <p style={{ marginTop: 10 }}>
          Total : <strong className="tabular">{formatCurrency(total)}</strong> ·{' '}
          {mode === 'credit' ? (
            <>
              à crédit pour <strong>{client.prenom} {client.nom}</strong>
            </>
          ) : (
            'paiement comptant'
          )}
          .
        </p>
        <p className={styles.confirmNote}>
          <ShieldCheck size={13} /> La patronne sera notifiée immédiatement sur WhatsApp. Une vente
          enregistrée ne peut plus être supprimée.
        </p>
      </Modal>
    </PageWrapper>
  );
}
