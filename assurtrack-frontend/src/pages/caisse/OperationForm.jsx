import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, ShieldCheck, CircleCheck } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';
import { useDeclarerDette } from '../../hooks/useCaisse';
import styles from './OperationForm.module.css';

export default function OperationForm() {
  const navigate = useNavigate();
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [certified, setCertified] = useState(false);
  const [done, setDone] = useState(false);
  const declarer = useDeclarerDette();

  const valid = Number(montant) > 0 && motif.trim() && certified;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    try {
      await declarer.mutateAsync({ montant: Number(montant), motif: motif.trim() });
      setDone(true);
    } catch {
      /* toast géré par le hook */
    }
  };

  if (done) {
    return (
      <PageWrapper>
        <div className={styles.successWrap}>
          <motion.div
            className={styles.success}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.span
              className={styles.successIcon}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.1 }}
            >
              <CircleCheck size={40} strokeWidth={2} />
            </motion.span>
            <h2 className={styles.successTitle}>Dette enregistrée</h2>
            <p className={styles.successAmount}>{formatCurrency(montant)}</p>
            <div className={styles.notified}>
              <ShieldCheck size={16} />
              La patronne a été notifiée sur WhatsApp
            </div>
            <div className={styles.successActions}>
              <Button
                variant="outline"
                onClick={() => {
                  setMontant('');
                  setMotif('');
                  setCertified(false);
                  setDone(false);
                }}
              >
                Nouvelle dette
              </Button>
              <Button variant="navy" onClick={() => navigate('/caisse')}>
                Retour à la caisse
              </Button>
            </div>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      eyebrow="Ma caisse"
      title="Déclarer une dette"
      actions={
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/caisse')}>
          Retour
        </Button>
      }
    >
      <div className={styles.center}>
        <Card>
          <form onSubmit={submit} className={styles.form}>
            <Input
              label="Montant pris par la patronne"
              type="number"
              inputMode="numeric"
              min="0"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="0"
              suffix="FCFA"
              required
            />
            <Textarea
              label="Motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex. La patronne a pris de l'argent pour ses fournitures"
              rows={3}
              required
            />

            <label className={styles.certify}>
              <input
                type="checkbox"
                checked={certified}
                onChange={(e) => setCertified(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxBox} aria-hidden>
                {certified && <Check size={13} strokeWidth={3} />}
              </span>
              <span>Je certifie que la patronne a pris ce montant dans ma caisse.</span>
            </label>

            <Button type="submit" full disabled={!valid} loading={declarer.isPending} icon={Check}>
              Déclarer la dette
            </Button>
            <p className={styles.note}>
              <ShieldCheck size={13} /> Une fois déclarée, cette dette ne pourra plus être modifiée ni
              supprimée.
            </p>
          </form>
        </Card>
      </div>
    </PageWrapper>
  );
}
