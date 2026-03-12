import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from './StoriesCarousel.module.css';

interface Props { username: string; }

export default function StoriesCarousel({ username }: Props) {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    axios.get(`/api/profile/${username}/stories`)
      .then(r => setStories(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="spinner" />;
  if (!stories.length) return <div style={{ color: '#555', textAlign: 'center', padding: '40px 0' }}>Aucune story active.</div>;

  return (
    <div>
      <div className={styles.bubbles}>
        {stories.map((s, i) => (
          <button key={s.storyId} className={styles.bubble} onClick={() => setActive(i)}>
            <div className={styles.bubbleRing}>
              <img src={s.thumbnailUrl} alt="story" className={styles.bubbleImg} />
            </div>
            <span className={styles.bubbleLabel}>Story {i + 1}</span>
          </button>
        ))}
      </div>

      {active !== null && (
        <div className={styles.overlay} onClick={() => setActive(null)}>
          <div className={styles.storyViewer} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setActive(null)}>✕</button>
            {stories[active].mediaType === 'video' ? (
              <video
                src={stories[active].mediaUrl}
                autoPlay
                controls
                className={styles.media}
              />
            ) : (
              <img src={stories[active].mediaUrl} className={styles.media} alt="story" />
            )}
            <div className={styles.nav}>
              <button onClick={() => setActive(Math.max(0, active - 1))} disabled={active === 0}>← Préc</button>
              <span>{active + 1} / {stories.length}</span>
              <button onClick={() => setActive(Math.min(stories.length - 1, active + 1))} disabled={active === stories.length - 1}>Suiv →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
