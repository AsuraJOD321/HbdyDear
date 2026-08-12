/* ===========================================================
   Shared helpers used across index.html / cause.html / last.html
   - Background music: plays a local MP3 (config.js -> song.file)
     and falls back to a YouTube embed if the file isn't found
   - Mute preference remembered across pages (localStorage)
   - Heart-burst celebration effect
   - Disables the fake custom cursor on touch devices
=========================================================== */

(function () {
    "use strict";

    /* ---------- 1. Touch-device cursor fix ---------- */
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch) {
        document.documentElement.classList.add('is-touch');
        const style = document.createElement('style');
        style.textContent = `
            .is-touch, .is-touch * { cursor: auto !important; }
            .is-touch .cursor, .is-touch .custom-cursor { display: none !important; }
        `;
        document.head.appendChild(style);
    }

    /* ---------- 2. Background music (local MP3, falls back to YouTube) ---------- */
    const MUTE_KEY = 'bday_music_muted';
    const SONG_CFG = (window.BDAY_CONFIG && window.BDAY_CONFIG.song) || {};
    const LOCAL_FILE = SONG_CFG.file || '';
    const YT_ID = SONG_CFG.youtubeId || '';

    let localAudio = null;
    let ytPlayer = null;
    let ytReady = false;
    let musicStarted = false;
    let usingLocalFile = false;

    function isMuted() {
        return localStorage.getItem(MUTE_KEY) === '1';
    }

    function setMuted(muted) {
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
        if (usingLocalFile && localAudio) {
            localAudio.muted = muted;
        } else if (ytReady && ytPlayer) {
            if (muted) ytPlayer.mute(); else ytPlayer.unMute();
        }
        updateToggleIcon();
    }

    function initLocalAudio() {
        localAudio = new Audio(LOCAL_FILE);
        localAudio.loop = true;
        localAudio.volume = 0.55;
        localAudio.muted = isMuted();
        localAudio.play().then(() => {
            usingLocalFile = true;
        }).catch(() => {
            // Local file missing/blocked — fall back to YouTube
            localAudio = null;
            usingLocalFile = false;
            if (YT_ID) {
                loadYouTubeAPI(initYouTubePlayer);
            }
        });
    }

    function loadYouTubeAPI(onReady) {
        if (window.YT && window.YT.Player) { onReady(); return; }
        if (!document.getElementById('yt-iframe-api')) {
            const tag = document.createElement('script');
            tag.id = 'yt-iframe-api';
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        }
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () {
            if (typeof prevCallback === 'function') prevCallback();
            onReady();
        };
    }

    function initYouTubePlayer() {
        if (!YT_ID || ytPlayer) return;
        const holder = document.createElement('div');
        holder.id = 'yt-music-player';
        Object.assign(holder.style, {
            position: 'fixed', width: '1px', height: '1px',
            bottom: '0', left: '0', opacity: '0', pointerEvents: 'none'
        });
        document.body.appendChild(holder);

        ytPlayer = new YT.Player('yt-music-player', {
            videoId: YT_ID,
            playerVars: {
                autoplay: 0, controls: 0, disablekb: 1, fs: 0,
                modestbranding: 1, playsinline: 1,
                loop: 1, playlist: YT_ID
            },
            events: {
                onReady: () => {
                    ytReady = true;
                    ytPlayer.setVolume(55);
                    if (isMuted()) ytPlayer.mute();
                    ytPlayer.playVideo();
                }
            }
        });
    }

    function startMusic() {
        if (musicStarted) {
            if (usingLocalFile && localAudio) localAudio.play();
            else if (ytReady && ytPlayer) ytPlayer.playVideo();
            return;
        }
        musicStarted = true;
        if (LOCAL_FILE) {
            initLocalAudio();
        } else if (YT_ID) {
            loadYouTubeAPI(initYouTubePlayer);
        }
    }

    function toggleMusic() {
        if (!musicStarted) {
            startMusic();
            setMuted(false);
            return;
        }
        setMuted(!isMuted());
    }

    function updateToggleIcon() {
        const btn = document.getElementById('music-toggle');
        if (!btn) return;
        btn.textContent = isMuted() || !musicStarted ? '🔇' : '🎵';
        btn.setAttribute('aria-label', isMuted() ? 'Turn music on' : 'Turn music off');
    }

    function injectMusicToggle() {
        const btn = document.createElement('button');
        btn.id = 'music-toggle';
        btn.type = 'button';
        btn.textContent = '🔇';
        btn.setAttribute('aria-label', 'Turn music on');
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: '9998',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            border: 'none',
            background: 'linear-gradient(45deg, #ff69b4, #ff99cc)',
            color: '#fff',
            fontSize: '1.4rem',
            boxShadow: '0 5px 15px rgba(255,105,180,0.4)',
            cursor: isTouch ? 'pointer' : 'none',
            transition: 'transform 0.2s'
        });
        btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMusic();
        });
        document.body.appendChild(btn);

        // Start music automatically on the very first click/tap anywhere,
        // respecting a previously saved mute preference.
        const autoStart = () => {
            startMusic();
            document.removeEventListener('click', autoStart);
            document.removeEventListener('touchend', autoStart);
        };
        document.addEventListener('click', autoStart, { once: true });
        document.addEventListener('touchend', autoStart, { once: true });
    }

    /* ---------- 3. Heart-burst celebration effect ---------- */
    window.heartBurst = function (count = 24) {
        const hearts = ['💖', '💕', '💗', '💓', '✨', '🌸'];
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            Object.assign(el.style, {
                position: 'fixed',
                left: '50%',
                top: '50%',
                fontSize: (Math.random() * 18 + 16) + 'px',
                pointerEvents: 'none',
                zIndex: '9997',
                transform: 'translate(-50%, -50%)',
                opacity: '1'
            });
            document.body.appendChild(el);
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 220 + 80;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance;
            if (window.gsap) {
                gsap.to(el, {
                    x: dx, y: dy,
                    opacity: 0,
                    rotation: Math.random() * 360,
                    duration: Math.random() * 0.8 + 0.9,
                    ease: 'power2.out',
                    onComplete: () => el.remove()
                });
            } else {
                el.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
                requestAnimationFrame(() => {
                    el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                    el.style.opacity = '0';
                });
                setTimeout(() => el.remove(), 1050);
            }
        }
    };

    /* ---------- 4. Personalize name from config.js ---------- */
    window.applyName = function () {
        const cfg = window.BDAY_CONFIG || {};
        const name = cfg.herName || 'Baby';
        document.querySelectorAll('[data-bday-name]').forEach(el => {
            el.textContent = name;
        });
    };

document.addEventListener('DOMContentLoaded', () => {
        window.applyName();

        if (window.BDAY_MUSIC_ENABLED) {
            injectMusicToggle();
            updateToggleIcon();
            startMusic();
        }
    });
})();