import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  format,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useContrats } from '../../hooks/useContrats';
import { echeanceLevel } from '../../utils/formatDate';
import styles from './RelanceCalendar.module.css';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function RelanceCalendar() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());
  const { data } = useContrats({ limit: 200 });
  const CONTRATS = data?.data || [];

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const c of CONTRATS) {
      const key = String(c.date_expiration).slice(0, 10); // ISO → yyyy-MM-dd
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <PageWrapper
      eyebrow="Module relance"
      title="Calendrier des échéances"
      actions={
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/relance')}>
          Liste des contrats
        </Button>
      }
    >
      <Card>
        <div className={styles.head}>
          <h2 className={styles.month}>{format(cursor, 'MMMM yyyy', { locale: fr })}</h2>
          <div className={styles.nav}>
            <button className={styles.navBtn} onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Mois précédent">
              <ChevronLeft size={18} />
            </button>
            <button className={styles.today} onClick={() => setCursor(new Date())}>
              Aujourd'hui
            </button>
            <button className={styles.navBtn} onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Mois suivant">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className={styles.weekdays}>
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        <div className={styles.grid}>
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const items = byDay.get(key) || [];
            const muted = !isSameMonth(day, cursor);
            return (
              <div key={key} className={`${styles.cell} ${muted ? styles.muted : ''}`}>
                <span className={`${styles.dayNum} ${isToday(day) ? styles.todayNum : ''}`}>
                  {format(day, 'd')}
                </span>
                <div className={styles.events}>
                  {items.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      className={styles.event}
                      data-level={echeanceLevel(c.date_expiration)}
                      onClick={() => navigate('/relance/nouveau')}
                      title={`${c.client.prenom} ${c.client.nom} — ${c.type_assurance}`}
                    >
                      {c.client.nom} · {c.type_assurance}
                    </button>
                  ))}
                  {items.length > 3 && <span className={styles.more}>+{items.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}><i data-level="critical" /> ≤ 7 jours</span>
          <span className={styles.legendItem}><i data-level="soon" /> ≤ 30 jours</span>
          <span className={styles.legendItem}><i data-level="safe" /> au-delà</span>
          <span className={styles.legendItem}><i data-level="expired" /> expiré</span>
        </div>
      </Card>
    </PageWrapper>
  );
}
