import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './VideoGrid.module.css';

interface Props {
  username: string;
  endpoint: 'videos' | 'reposts';
  showOriginalAuthor?: boolean;
}

export default function VideoGrid({ username, endpoint, showOriginalAuthor }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setItems([]);
    axios.get(`/api/profile/${username}/${endpoint}`)
      .then(r => setItems(r.data.items || []))
      .catch(() => setError('Impossible de charger les vidéos.'))
      .finally(() => setLoading(false));
  }, [username, endpoint]);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="error-box">{error}</div>;
  if (!items.length) return <div className={styles.empty}>Aucun contenu disponible.</div>;

  return (
    <div className={styles.grid}>
      {items.map(item => (
        <div key={item.videoId} className={`card ${styles.videoCard}`}>
          <div className={styles.thumb}>
            <img src={item.thumbnailUrl} alt={item.description} loading="lazy" />
            {item.duration > 0 && (
              <span className={styles.duration}>
                {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
              </span>
            )}
            {showOriginalAuthor && item.isRepost && (
              <span className={styles.repostBadge}>🔁 Repost</span>
            )}
          </div>
          <div className={styles.info}>
            <p className={styles.desc} title={item.description}>
              {item.description || '(sans description)'}
            </p>
            <div className={styles.stats}>
              <span>▶ {fmt(item.stats.plays)}</span>
              <span>❤️ {fmt(item.stats.likes)}</span>
            </div>
            {showOriginalAuthor && item.originalAuthor?.username && (
              <p className={styles.originalAuthor}>par @{item.originalAuthor.username}</p>
            )}
            <a
              href={`/api/download/video/${item.videoId}?username=${username}`}
              download
              className={styles.dlBtn}
            >
              ⬇ Télécharger
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);
}
