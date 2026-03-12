import React from 'react';
import styles from './VideoGrid.module.css';

const API = import.meta.env.VITE_API_URL || '/api';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

interface Props {
  items: any[];
  username: string;
  isRepost?: boolean;
}

export default function VideoGrid({ items, username, isRepost = false }: Props) {
  const handleDownload = (videoId: string) => {
    const url = `${API}/download/video/${videoId}?username=${encodeURIComponent(username)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-${videoId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={styles.grid}>
      {items.map(item => (
        <div key={item.videoId} className={styles.card}>
          <div className={styles.thumb}>
            {item.thumbnailUrl
              ? <img src={item.thumbnailUrl} alt={item.description} loading='lazy' />
              : <div className={styles.noThumb}>🎬</div>
            }
            {item.duration > 0 && <span className={styles.duration}>{formatDuration(item.duration)}</span>}
            {isRepost && <span className={styles.repostBadge}>🔁 Repost</span>}
          </div>
          <div className={styles.info}>
            {item.description && <p className={styles.desc}>{item.description}</p>}
            <div className={styles.stats}>
              <span>▶ {formatNumber(item.stats.plays)}</span>
              <span>❤ {formatNumber(item.stats.likes)}</span>
              <span>💬 {formatNumber(item.stats.comments)}</span>
            </div>
            {isRepost && item.originalAuthor?.username && (
              <p className={styles.original}>par @{item.originalAuthor.username}</p>
            )}
            <button className={styles.dlBtn} onClick={() => handleDownload(item.videoId)}>
              ↓ Télécharger
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
