import styles from './Table.module.css';

/**
 * Table réutilisable.
 * columns : [{ key, header, render?(row), align?, width?, mono? }]
 * Le rendu reste sobre : filets fins, en-tête en capitales espacées.
 */
export default function Table({ columns, data, rowKey = 'id', onRowClick, empty }) {
  if (!data?.length && empty) {
    return <div className={styles.emptyWrap}>{empty}</div>;
  }
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ textAlign: col.align || 'left', width: col.width }}
                className={styles.th}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row[rowKey]}
              className={onRowClick ? styles.clickable : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{ textAlign: col.align || 'left' }}
                  className={`${styles.td} ${col.mono ? 'tabular' : ''}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
