import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Phone,
  MessageSquareText,
  Users,
  Save,
  UserPlus,
  QrCode,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Link2Off,
} from 'lucide-react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import { Input, Textarea } from '../../components/ui/Input';
import {
  useWaStatus,
  useWaQr,
  useWaConnect,
  useWaRestart,
  useWaDisconnect,
} from '../../hooks/useWhatsApp';
import { useTemplates, useSaveTemplates } from '../../hooks/useTemplates';
import styles from './Settings.module.css';

const TEMPLATE_HINTS = {
  'J-30': 'Variables : {prenom}, {type}, {police}, {date}',
  'J-7': 'Variables : {prenom}, {type}, {police}, {date}',
  'J-0': 'Variables : {prenom}, {type}, {police}, {date}',
  operation: 'Variables : {secretaire}, {montant}, {motif}, {heure}',
};

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

function WhatsAppConnection() {
  const { data: status, isLoading } = useWaStatus(/* poll while connecting */ false);
  const phase = status?.status || 'disconnected';
  const connecting = phase === 'connecting';

  // Sonde l'état (toutes les 4 s) + récupère le QR uniquement en phase de connexion
  useWaStatus(connecting);
  const { data: qr } = useWaQr(connecting);

  const connect = useWaConnect();
  const restart = useWaRestart();
  const disconnect = useWaDisconnect();

  const configured = status?.configured !== false;

  return (
    <Card>
      <CardHeader
        eyebrow="Canal d'envoi"
        title="Connexion WhatsApp"
        action={
          phase === 'connected' ? (
            <span className={`${styles.state} ${styles.stateConnected}`}>
              <CheckCircle2 size={14} /> Connecté
            </span>
          ) : connecting ? (
            <span className={`${styles.state} ${styles.stateConnecting}`}>
              <QrCode size={14} /> En attente du scan
            </span>
          ) : (
            <span className={`${styles.state} ${styles.stateOff}`}>Déconnecté</span>
          )
        }
      />

      {isLoading ? (
        <Loader center />
      ) : !configured ? (
        <div className={styles.notice}>
          <Smartphone size={18} style={{ flexShrink: 0 }} />
          <span>
            WhatsApp n'est pas encore configuré sur le serveur. Renseignez{' '}
            <strong>WHATSFLOW_URL</strong>, <strong>WHATSFLOW_API_KEY</strong> et{' '}
            <strong>WHATSFLOW_CLIENT_ID</strong>, puis redémarrez l'API.
          </span>
        </div>
      ) : (
        <div className={styles.conn}>
          <div className={styles.connMain}>
            {phase === 'connected' ? (
              <>
                <p className={styles.connLead}>
                  Les relances et notifications partent depuis ce numéro WhatsApp.
                </p>
                <span className={`${styles.state} ${styles.stateConnected}`}>
                  <CheckCircle2 size={14} /> Appareil lié
                </span>
                {status?.phone && <div className={styles.statePhone}>+{status.phone}</div>}
                <div className={styles.connActions}>
                  <Button
                    variant="outline"
                    icon={Link2Off}
                    loading={disconnect.isPending}
                    onClick={() => disconnect.mutate()}
                  >
                    Déconnecter
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.connLead}>
                  Liez le compte WhatsApp de l'agence pour envoyer automatiquement les
                  relances et notifications.
                </p>
                <ol className={styles.steps}>
                  <li>
                    <span className={styles.stepNum}>1</span> Ouvrez WhatsApp sur le téléphone de
                    l'agence
                  </li>
                  <li>
                    <span className={styles.stepNum}>2</span> Réglages → Appareils connectés →
                    Lier un appareil
                  </li>
                  <li>
                    <span className={styles.stepNum}>3</span> Scannez le QR code ci-contre
                  </li>
                </ol>
                <div className={styles.connActions}>
                  {!connecting ? (
                    <Button
                      icon={QrCode}
                      loading={connect.isPending}
                      onClick={() => connect.mutate()}
                    >
                      Connecter WhatsApp
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        icon={RefreshCw}
                        loading={restart.isPending}
                        onClick={() => restart.mutate()}
                      >
                        Régénérer le QR
                      </Button>
                      <Button
                        variant="ghost"
                        icon={Link2Off}
                        onClick={() => disconnect.mutate()}
                      >
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {connecting && (
            <div className={styles.qrPane}>
              <div className={styles.qrFrame}>
                {qr?.qr_code ? (
                  <img className={styles.qrImg} src={qr.qr_code} alt="QR code WhatsApp" />
                ) : (
                  <Loader center label="Génération du QR…" />
                )}
              </div>
              <span className={styles.qrHint}>Le QR se régénère automatiquement</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Settings() {
  const { data: tplData, isLoading: tplLoading } = useTemplates();
  const saveTpl = useSaveTemplates();
  const [templates, setTemplates] = useState(null);
  const [users, setUsers] = useState(INITIAL_USERS);

  useEffect(() => {
    if (tplData) setTemplates(tplData);
  }, [tplData]);

  const toggleUser = (id) =>
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u)));

  return (
    <PageWrapper eyebrow="Configuration" title="Paramètres">
      <div className={styles.sections}>
        {/* --- Connexion WhatsApp --- */}
        <WhatsAppConnection />

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
              <Button
                size="sm"
                icon={Save}
                loading={saveTpl.isPending}
                disabled={!templates}
                onClick={() => templates && saveTpl.mutate(templates)}
              >
                Enregistrer
              </Button>
            }
          />
          {tplLoading || !templates ? (
            <Loader center />
          ) : (
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
                  hint={TEMPLATE_HINTS[key]}
                />
              ))}
            </div>
          )}
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
