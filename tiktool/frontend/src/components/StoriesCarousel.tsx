import React, { useState } from 'react';
import styles from './StoriesCarousel.module.css';

const API = import.meta.env.VITE_API_URL || '/api';

interface Props {
  items: any[];
  username: string;
}

export default function StoriesCarousel({ items, username }: Props) {
  const [active, setActive] = useState<any | null>(null);

  const handleDownload = (storyId: string) => {
    const url = `${API}/download/story/${storyId}?username=${encodeURIComponent(username)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiktok-story-${storyId}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div className={styles.track}>
        {items.map(story => (
          <button
            key={story.storyId}
            className={`${styles.bubble} ${active?.storyId === story.storyId ? styles.activeBubble : ''}`}
            onClick={() => setActive(active?.storyId === story.storyId ? null : story)}
          >
            <div className={styles.ring}>
              {story.thumbnailUrl
                ? <img src={story.thumbnailUrl} alt='story' className={styles.bubbleImg} />
                : <span className={styles.bubbleIcon}>{story.mediaType === 'video' ? '🎬' : '🖼'}</span>
              }
            </div>
            <span className={styles.bubbleLabel}>{story.mediaType === 'video' ? 'Vidéo' : 'Photo'}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className={styles.modal} onClick={e => e.target === e.currentTarget && setActive(null)}>
          <div className={styles.viewer}>
            <button className={styles.close} onClick={() => setActive(null)}>✕</button>
            {active.mediaType === 'video'
              ? <video src={active.mediaUrl} controls autoPlay className={styles.media} />
              : <img src={active.mediaUrl} alt='story' className={styles.media} />
            }
            <div className={styles.viewerActions}>
              <button className={styles.dlBtn} onClick={() => handleDownload(active.storyId)}>↓ Télécharger</button>
              <span className={styles.expires}>
                Expire le {new Date(active.expiresAt).toLocaleDateString('fr-CA')}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
