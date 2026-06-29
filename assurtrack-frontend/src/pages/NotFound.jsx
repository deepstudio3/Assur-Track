import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import Button from '../components/ui/Button';
import styles from './NotFound.module.css';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className={styles.wrap}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Page introuvable</h1>
      <p className={styles.desc}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Button icon={Home} onClick={() => navigate('/')}>
        Retour au tableau de bord
      </Button>
    </div>
  );
}
