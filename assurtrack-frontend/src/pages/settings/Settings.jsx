import { useState } from 'react';
import toast from 'react-hot-toast';
import { Phone, MessageSquareText, Users, Save, UserPlus } from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';
import { WA_TEMPLATES } from '../../mock/data';
import styles from './Settings.module.css';

const TEMPLATE_LABELS = {
  'J-30': 'Rappel J-30',
  'J-7': 'Rappel J-7',
  'J-0': 'Rappel J-0 (jour J)',
  operation: 'Notification opération caisse',
};

const INITIAL_USERS = [
  { id: 'u-marie', nom: 'Marie Nkoa', email: 'marie@assurtrack.cm', actif: true },
  { id: 'u-aicha', nom: 'Aïcha Bello', email: 'aicha@assurtrack.cm', actif: true },
  { id: 'u-sandrine', nom: 'Sandrine Kana', email: 'sandrine@assurtrack.cm', actif: false },
];

export default function Settings() {
  const [templates, setTemplates] = useState(WA_TEMPLATES);
  const [users, setUsers] = useState(INITIAL_USERS);

  const toggleUser = (id) =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u)));

  return (
    <PageWrapper eyebrow="Configuration" title="Paramètres">
      <div className={styles.sections}>
        {/* --- Numéros WhatsApp --- */}
        <Card>
          <CardHeader
            eyebrow="Destinataires"
            title="Numéros WhatsApp"
            action={
              <Button size="sm" icon={Save} onClick={() => toast.success('Numéros enregistrés')}>
                Enregistrer
              </Button>
            }
          />
          <div className={styles.row2}>
            <Input label="Numéro de la patronne" icon={Phone} defaultValue="+237 699 11 22 33" />
            <Input label="Numéro du gérant" icon={Phone} defaultValue="+237 677 44 55 66" />
          </div>
        </Card>

        {/* --- Templates --- */}
        <Card>
          <CardHeader
            eyebrow="Messages automatiques"
            title="Templates WhatsApp"
            action={
              <Button size="sm" icon={Save} onClick={() => toast.success('Templates enregistrés')}>
                Enregistrer
              </Button>
            }
          />
          <div className={styles.templates}>
            {Object.entries(templates).map(([key, value]) => (
              <Textarea
                key={key}
                label={
                  <>
                    <MessageSquareText size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                    {TEMPLATE_LABELS[key]}
                  </>
                }
                value={value}
                onChange={(e) => setTemplates((t) => ({ ...t, [key]: e.target.value }))}
                rows={key === 'operation' ? 6 : 4}
                hint="Variables disponibles : {prenom}, {type}, {police}, {date}"
              />
            ))}
          </div>
        </Card>

        {/* --- Utilisateurs --- */}
        <Card>
          <CardHeader
            eyebrow="Équipe"
            title="Gestion des secrétaires"
            action={
              <Button size="sm" variant="outline" icon={UserPlus} onClick={() => toast('Invitation à venir')}>
                Ajouter
              </Button>
            }
          />
          <ul className={styles.users}>
            {users.map((u) => (
              <li key={u.id} className={styles.user}>
                <span className={styles.userAvatar}>
                  <Users size={16} />
                </span>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{u.nom}</span>
                  <span className={styles.userEmail}>{u.email}</span>
                </div>
                <Badge tone={u.actif ? 'success' : 'neutral'} dot>
                  {u.actif ? 'Active' : 'Désactivée'}
                </Badge>
                <Button size="sm" variant={u.actif ? 'ghost' : 'outline'} onClick={() => toggleUser(u.id)}>
                  {u.actif ? 'Désactiver' : 'Réactiver'}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageWrapper>
  );
}
