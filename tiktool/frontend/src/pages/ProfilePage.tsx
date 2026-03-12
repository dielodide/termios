import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import VideoGrid from '../components/VideoGrid';
import StoriesCarousel from '../components/StoriesCarousel';
import styles from './ProfilePage.module.css';

type Tab = 'videos' | 'reposts' | 'stories';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('videos');

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError('');
    axios.get(`/api/profile/${username}`)
      .then(r => setProfile(r.data))
      .catch(err => setError(err.response?.data?.error || 'Erreur lors du chargement'))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;
  if (error) return (
    <div className="container" style={{ paddingTop: 60 }}>
      <div className="error-box">{error}</div>
      <div style={{ textAlign: 'center', marginTop: 16 }}><Link to="/">← Retour</Link></div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className="container">
        <Link to="/" className={styles.back}>← Retour</Link>

        <div className={styles.profileHeader}>
          <img src={profile.avatarUrl} alt={profile.displayName} className={styles.avatar} />
          <div className={styles.profileInfo}>
            <h1 className={styles.displayName}>{profile.displayName}</h1>
            <p className={styles.handle}>@{profile.username}</p>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            <div className={styles.stats}>
              <StatItem label="Followers" value={profile.stats.followers} />
              <StatItem label="Following" value={profile.stats.following} />
              <StatItem label="Likes" value={profile.stats.likes} />
              <StatItem label="Vidéos" value={profile.stats.videosCount} />
            </div>
            {profile.isPrivate && <span className={styles.privateBadge}>🔒 Compte privé</span>}
          </div>
        </div>

        <div className={styles.tabs}>
          {(['videos', 'reposts', 'stories'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          {tab === 'videos' && <VideoGrid username={username!} endpoint="videos" />}
          {tab === 'reposts' && <VideoGrid username={username!} endpoint="reposts" showOriginalAuthor />}
          {tab === 'stories' && <StoriesCarousel username={username!} />}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : String(n);
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{fmt(value)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
