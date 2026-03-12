import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = username.replace(/^@/, '').trim();
    if (clean.length >= 2) navigate(`/profile/${clean}`);
  };

  return (
    <main className={styles.home}>
      <div className={styles.hero}>
        <div className={styles.logo}>🎵 TikTool</div>
        <h1 className={styles.title}>Voir TikTok <span>Anonymement</span></h1>
        <p className={styles.subtitle}>Profil · Vidéos · Reposts · Stories — sans compte, sans trace.</p>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <input
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            autoFocus
            spellCheck={false}
          />
          <button type="submit" className={styles.btn}>Voir le profil →</button>
        </form>
        <p className={styles.badge}>🔒 100% anonyme · Aucun login requis · Comptes publics uniquement</p>
      </div>
    </main>
  );
}
