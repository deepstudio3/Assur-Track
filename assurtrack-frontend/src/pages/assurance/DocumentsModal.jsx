import toast from 'react-hot-toast';
import { UploadCloud, FileText, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import {
  useContratDocuments,
  useUploadContratDocuments,
  useDeleteContratDocument,
  openDocument,
} from '../../hooks/useDocuments';
import styles from './Assurance.module.css';

const fmtSize = (b) =>
  b < 1024 * 1024 ? `${Math.round(b / 1024)} Ko` : `${(b / 1024 / 1024).toFixed(1)} Mo`;

export default function DocumentsModal({ contrat, onClose }) {
  const open = Boolean(contrat);
  const { data: docs, isLoading } = useContratDocuments(contrat?.id, open);
  const upload = useUploadContratDocuments();
  const del = useDeleteContratDocument();

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    try {
      await upload.mutateAsync({ contratId: contrat.id, files });
      toast.success(`${files.length} document(s) ajouté(s)`);
    } catch {
      /* toast géré par le hook */
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={contrat ? `${contrat.numero_police} · ${contrat.type_assurance}` : ''}
      title="Documents du contrat"
    >
      <label
        className={styles.dropzone}
        htmlFor="docs-add"
        style={{ marginBottom: 'var(--space-4)' }}
      >
        <UploadCloud size={20} />
        <span>{upload.isPending ? 'Envoi en cours…' : 'Ajouter des images ou PDF'}</span>
      </label>
      <input
        id="docs-add"
        type="file"
        multiple
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={onPick}
      />

      {isLoading ? (
        <Loader center />
      ) : !docs?.length ? (
        <EmptyState
          title="Aucun document"
          description="Ajoutez les pièces liées à ce contrat (attestation, carte grise, devis…)."
        />
      ) : (
        <div className={styles.fileList}>
          {docs.map((d) => (
            <div className={styles.fileRow} key={d.id}>
              <span className={styles.fileIcon}>
                {d.mime_type === 'application/pdf' ? <FileText size={16} /> : <ImageIcon size={16} />}
              </span>
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{d.nom_original}</span>
                <span className={styles.fileSize}>{fmtSize(d.taille)}</span>
              </div>
              <button
                className={styles.fileBtn}
                onClick={() => openDocument(d.id)}
                title="Ouvrir"
                aria-label="Ouvrir"
              >
                <ExternalLink size={16} />
              </button>
              <button
                className={`${styles.fileBtn} ${styles.fileBtnDanger}`}
                onClick={() => del.mutate(d.id)}
                title="Supprimer"
                aria-label="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
