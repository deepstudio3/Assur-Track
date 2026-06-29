import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Logo from '../../components/ui/Logo';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuth) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Connexion impossible. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const fill = (acc) => {
    setEmail(acc);
    setPassword('demo');
    setError('');
  };

  return (
    <div className={styles.screen}>
      {/* Horizon décoratif : la signature en filigrane sur l'écran d'accueil */}
      <div className={styles.horizonBg} aria-hidden>
        <span className={styles.tick} style={{ left: '18%', height: 40 }} />
        <span className={styles.tick} style={{ left: '34%', height: 64 }} />
        <span className={`${styles.tick} ${styles.tickGold}`} style={{ left: '52%', height: 92 }} />
        <span className={styles.tick} style={{ left: '68%', height: 54 }} />
        <span className={styles.tick} style={{ left: '83%', height: 30 }} />
      </div>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.brand}>
          <Logo variant="dark" size={38} />
          <p className={styles.tagline}>Gérez. Relancez. Protégez.</p>
        </div>

        <form onSubmit={onSubmit} className={styles.form} noValidate>
          <Input
            label="Adresse e-mail"
            type="email"
            icon={Mail}
            placeholder="vous@entreprise.cm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            icon={Lock}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <motion.p
              className={styles.error}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" full loading={loading} iconRight={ArrowRight}>
            Se connecter
          </Button>
        </form>

        <div className={styles.demo}>
          <span className={styles.demoLabel}>Comptes de démonstration</span>
          <div className={styles.demoRow}>
            <button type="button" className={styles.demoBtn} onClick={() => fill('patronne@assurtrack.cm')}>
              Patronne
            </button>
            <button type="button" className={styles.demoBtn} onClick={() => fill('marie@assurtrack.cm')}>
              Secrétaire
            </button>
          </div>
          <span className={styles.demoHint}>mot de passe : demo</span>
        </div>
      </motion.div>

      <p className={styles.footer}>AssurTrack · Plateforme d'assurance · Cameroun</p>
    </div>
  );
}
