import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = username.replace(/^@/, '').trim();
    if (!clean || !/^[a-zA-Z0-9_.]{2,30}$/.test(clean)) {
      setError('Username invalide. Ex: @username (2-30 caractères)');
      return;
    }
    navigate(`/profile/${clean}`);
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>👁</span>
          <span className={styles.logoText}>TikTool</span>
        </div>
        <p className={styles.tagline}>Viewer TikTok anonyme — profils, vidéos, reposts & stories</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputWrap}>
            <span className={styles.at}>@</span>
            <input
              className={styles.input}
              type='text'
              placeholder='username'
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoFocus
              autoComplete='off'
              spellCheck={false}
            />
          </div>
          <button type='submit' className={styles.btn}>Voir le profil TikTok →</button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.badges}>
          <span className={styles.badge}>🔒 100% anonyme</span>
          <span className={styles.badge}>🚫 Aucun login requis</span>
          <span className={styles.badge}>📥 Téléchargement direct</span>
        </div>
      </div>
    </div>
  );
}
