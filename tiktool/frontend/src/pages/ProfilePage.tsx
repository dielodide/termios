import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './ProfilePage.module.css';
import VideoGrid from '../components/VideoGrid';
import StoriesCarousel from '../components/StoriesCarousel';

const API = import.meta.env.VITE_API_URL || '/api';

type Tab = 'profil' | 'videos' | 'reposts' | 'stories';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [tab, setTab] = useState<Tab>('profil');
  const [profile, setProfile] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [reposts, setReposts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError('');
    fetch(`${API}/profile/${username}`)
      .then(r => {
        if (!r.ok) {
          if (r.status === 404) throw new Error('Profil introuvable ou privé.');
          if (r.status === 429) throw new Error('Trop de requêtes. Réessaie dans quelques secondes.');
          throw new Error('Erreur serveur.');
        }
        return r.json();
      })
      .then(data => { setProfile(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [username]);

  const fetchTab = async (t: Tab) => {
    setTab(t);
    if (t === 'profil') return;
    setTabLoading(true);
    try {
      const endpoint = t === 'videos' ? 'videos' : t === 'reposts' ? 'reposts' : 'stories';
      const r = await fetch(`${API}/profile/${username}/${endpoint}`);
      const data = await r.json();
      if (t === 'videos') setVideos(data.items || []);
      if (t === 'reposts') setReposts(data.items || []);
      if (t === 'stories') setStories(data.items || []);
    } catch {}
    setTabLoading(false);
  };

  if (loading) return <div className='spinner' />;
  if (error) return (
    <div style={{ padding: 24 }}>
      <Link to='/' className={styles.back}>← Retour</Link>
      <div className='error-box'>{error}</div>
    </div>
  );

  return (
    <div className={styles.page}>
      <Link to='/' className={styles.back}>← Retour</Link>

      {/* Header */}
      <div className={styles.header}>
        <img src={profile.avatarUrl} alt={profile.username} className={styles.avatar} />
        <div className={styles.info}>
          <h1 className={styles.displayName}>{profile.displayName}</h1>
          <p className={styles.handle}>@{profile.username}</p>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <div className={styles.stats}>
            <div className={styles.stat}><span>{formatNumber(profile.stats.followers)}</span><label>Abonnés</label></div>
            <div className={styles.stat}><span>{formatNumber(profile.stats.following)}</span><label>Abonnements</label></div>
            <div className={styles.stat}><span>{formatNumber(profile.stats.likes)}</span><label>Likes</label></div>
            <div className={styles.stat}><span>{formatNumber(profile.stats.videosCount)}</span><label>Vidéos</label></div>
          </div>
        </div>
      </div>

      <p className={styles.anonNote}>👁 Visionnage 100% anonyme — aucune connexion requise</p>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['profil','videos','reposts','stories'] as Tab[]).map(t => (
          <button key={t} className={`${styles.tab} ${tab===t ? styles.activeTab : ''}`} onClick={() => fetchTab(t)}>
            {t === 'profil' && '👤 Profil'}
            {t === 'videos' && '🎬 Vidéos'}
            {t === 'reposts' && '🔁 Reposts'}
            {t === 'stories' && '✨ Stories'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.content}>
        {tabLoading && <div className='spinner' />}

        {!tabLoading && tab === 'profil' && (
          <div className={styles.profilTab}>
            <a
              href={`https://www.tiktok.com/@${profile.username}`}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.tiktokLink}
            >
              Ouvrir le profil TikTok officiel ↗
            </a>
            {videos.length > 0 && (
              <>
                <h3 className={styles.sectionTitle}>Dernières vidéos</h3>
                <VideoGrid items={videos.slice(0, 3)} username={username!} />
              </>
            )}
            {videos.length === 0 && (
              <button className={styles.loadBtn} onClick={() => fetchTab('videos')}>Charger les vidéos →</button>
            )}
          </div>
        )}

        {!tabLoading && tab === 'videos' && (
          videos.length === 0
            ? <p className='empty-state'>Aucune vidéo trouvée.</p>
            : <VideoGrid items={videos} username={username!} />
        )}

        {!tabLoading && tab === 'reposts' && (
          reposts.length === 0
            ? <p className='empty-state'>Aucun repost trouvé.</p>
            : <VideoGrid items={reposts} username={username!} isRepost />
        )}

        {!tabLoading && tab === 'stories' && (
          stories.length === 0
            ? <p className='empty-state'>Aucune story active.</p>
            : <StoriesCarousel items={stories} username={username!} />
        )}
      </div>
    </div>
  );
}
