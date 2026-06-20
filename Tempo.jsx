const { useState, useEffect, useRef, Fragment } = React;

const THEME_KEY          = "workoutapp_theme";
const ACCENT_KEY         = "workoutapp_accent";
const PROFILE_NAME_KEY   = "workoutapp_profile_name";
const PROFILE_ICON_KEY   = "workoutapp_profile_iconid";
const PROFILE_BG_KEY     = "workoutapp_profile_bg";
const PROFILE_ICOLOR_KEY = "workoutapp_profile_iconcolor";
const VERSION = "v0.5.0";

const ACCENT_SCHEMES = {
  amber:  { label:"Amber",  swatch:"#d97706", gradient2:"#facc15", dark:{accent:"#d97706",accent2:"#fbbf24"}, light:{accent:"#b45309",accent2:"#d97706"} },
  purple: { label:"Purple", swatch:"#8b5cf6", gradient2:"#60a5fa", dark:{accent:"#8b5cf6",accent2:"#a78bfa"}, light:{accent:"#7c3aed",accent2:"#6d28d9"} },
  blue:   { label:"Blue",   swatch:"#3b82f6", gradient2:"#818cf8", dark:{accent:"#3b82f6",accent2:"#60a5fa"}, light:{accent:"#2563eb",accent2:"#1d4ed8"} },
  teal:   { label:"Teal",   swatch:"#0d9488", gradient2:"#22d3ee", dark:{accent:"#0d9488",accent2:"#2dd4bf"}, light:{accent:"#0f766e",accent2:"#0d9488"} },
  rose:   { label:"Rose",   swatch:"#e11d48", gradient2:"#fb923c", dark:{accent:"#e11d48",accent2:"#fb7185"}, light:{accent:"#be123c",accent2:"#e11d48"} },
};

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// Web Audio sound engine
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone({ freq = 880, freq2, duration = 0.12, volume = 0.4, type = "sine", delay = 0 }) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, t + duration * 0.8);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t); osc.stop(t + duration + 0.05);
  } catch(e) {}
}

// Sound packs — each pack implements the same keys
const SOUND_PACKS = {
  classic: {
    label: "Classic",
    description: "Clean digital beeps",
    sounds: {
      getReady:  () => playTone({ freq:660, duration:0.15, volume:0.3 }),
      workout:   () => { playTone({ freq:880, duration:0.12, volume:0.45 }); playTone({ freq:1100, duration:0.12, volume:0.45, delay:0.14 }); },
      rest:      () => { playTone({ freq:660, duration:0.12, volume:0.35 }); playTone({ freq:550, duration:0.18, volume:0.35, delay:0.14 }); },
      setRest:   () => { playTone({ freq:660, duration:0.1, volume:0.35 }); playTone({ freq:550, duration:0.1, volume:0.35, delay:0.12 }); playTone({ freq:440, duration:0.22, volume:0.35, delay:0.25 }); },
      coolDown:  () => { playTone({ freq:880, duration:0.1, volume:0.3 }); playTone({ freq:660, duration:0.1, volume:0.3, delay:0.12 }); playTone({ freq:440, duration:0.25, volume:0.3, delay:0.25 }); },
      done:      () => { [0, 0.15, 0.3, 0.5].forEach((delay, i) => playTone({ freq:[660,880,1100,1320][i], duration:0.18, volume:0.4, delay })); },
      countdown: () => playTone({ freq:440, duration:0.08, volume:0.25 }),
    },
  },
  chime: {
    label: "Chime",
    description: "Elegant musical tones",
    sounds: {
      // Single soft bell — marimba-like with quick decay
      getReady: () => {
        playTone({ freq:523, duration:0.6, volume:0.28, type:"sine" });
        playTone({ freq:1046, duration:0.3, volume:0.1, type:"sine" });
      },
      // Two ascending bell tones — C5 → E5 (a perfect third, uplifting)
      workout: () => {
        playTone({ freq:523, duration:0.7, volume:0.32, type:"sine" });
        playTone({ freq:659, duration:0.7, volume:0.32, type:"sine", delay:0.18 });
        playTone({ freq:1046, duration:0.35, volume:0.1, type:"sine", delay:0.02 });
        playTone({ freq:1318, duration:0.35, volume:0.1, type:"sine", delay:0.2 });
      },
      // Two descending tones — E5 → C5 (gentle landing)
      rest: () => {
        playTone({ freq:659, duration:0.7, volume:0.28, type:"sine" });
        playTone({ freq:523, duration:0.8, volume:0.28, type:"sine", delay:0.2 });
        playTone({ freq:1318, duration:0.3, volume:0.09, type:"sine", delay:0.02 });
      },
      // Three descending — E5 → D5 → C5 (longer rest signal)
      setRest: () => {
        playTone({ freq:659, duration:0.6, volume:0.28, type:"sine" });
        playTone({ freq:587, duration:0.6, volume:0.28, type:"sine", delay:0.2 });
        playTone({ freq:523, duration:0.8, volume:0.28, type:"sine", delay:0.4 });
        playTone({ freq:1318, duration:0.25, volume:0.08, type:"sine", delay:0.02 });
      },
      // Gentle descending resolve — G5 → E5 → C5
      coolDown: () => {
        playTone({ freq:784, duration:0.7, volume:0.26, type:"sine" });
        playTone({ freq:659, duration:0.7, volume:0.26, type:"sine", delay:0.22 });
        playTone({ freq:523, duration:0.9, volume:0.26, type:"sine", delay:0.44 });
        playTone({ freq:1568, duration:0.3, volume:0.08, type:"sine", delay:0.02 });
      },
      // Ascending arpeggio — C5 E5 G5 C6 (celebratory chord)
      done: () => {
        [[523,0],[659,0.18],[784,0.36],[1046,0.56]].forEach(([freq, delay]) => {
          playTone({ freq, duration:0.9, volume:0.3, type:"sine", delay });
          playTone({ freq:freq*2, duration:0.4, volume:0.08, type:"sine", delay:delay+0.01 });
        });
      },
      // Soft single tick — quieter than classic
      countdown: () => playTone({ freq:784, duration:0.12, volume:0.18, type:"sine" }),
    },
  },
};

const SOUND_PACK_KEY = "workoutapp_soundpack";

const HAPTICS = {
  getReady:  [40],                          // single soft tap
  workout:   [60, 40, 60],                  // two firm taps
  rest:      [30, 30, 30, 30, 80],          // quick trill then long
  setRest:   [30, 30, 30, 30, 30, 30, 120], // longer trill then long
  coolDown:  [80, 60, 120],                 // descending settle
  done:      [80, 50, 80, 50, 200],         // celebration
};

function useBounce() {
  const [pressed, setPressed] = useState(false);
  const press   = () => setPressed(true);
  const release = () => setPressed(false);
  return [pressed, press, release];
}

function buildTheme(mode, accentKey) {
  const base = mode === "light" ? {
    mode:"light", bg:"#f1f5f9", surface:"#ffffff", surface2:"#f8fafc",
    border:"#e2e8f0", border2:"#cbd5e1", green:"#16a34a", red:"#dc2626",
    text:"#0f172a", muted:"#94a3b8", muted2:"#64748b",
  } : {
    mode:"dark", bg:"#000000", surface:"#111111", surface2:"#1a1a1a",
    border:"#2d2d2d", border2:"#3d3d3d", green:"#22c55e", red:"#ef4444",
    text:"#ede9fe", muted:"#6b6080", muted2:"#a094b8",
  };
  const scheme = ACCENT_SCHEMES[accentKey] || ACCENT_SCHEMES.purple;
  const divider     = mode === "light" ? "rgba(0,0,0,0.08)"       : "rgba(255,255,255,0.08)";
  return {
    ...base, ...scheme[mode], gradient2: scheme.gradient2,
    pressBg:       mode === "light" ? "rgba(0,0,0,0.1)"        : "rgba(255,255,255,0.15)",
    pressBgStrong: mode === "light" ? "rgba(0,0,0,0.1)"        : "rgba(255,255,255,0.22)",
    pressBgSoft:   mode === "light" ? "rgba(0,0,0,0.08)"       : "rgba(255,255,255,0.12)",
    divider,
    hairline:      "0.5px solid " + divider,
    stickyBg:      mode === "light" ? "rgba(241,245,249,0.95)" : "rgba(0,0,0,0.95)",
    overlayBg:     mode === "light" ? "rgba(0,0,0,0.4)"        : "rgba(0,0,0,0.7)",
    modalShadow:   mode === "light" ? "0 8px 40px rgba(0,0,0,0.18)" : "0 8px 40px rgba(0,0,0,0.5)",
    glassBg: mode === "light"
      ? "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.68) 100%)"
      : "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
    glassBorder: mode === "light" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)",
    glassShadow: mode === "light"
      ? "inset 0 1px 0 rgba(255,255,255,1), inset 1px 0 0 rgba(255,255,255,0.65), inset 0 -1px 0 rgba(0,0,0,0.07), inset -1px 0 0 rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.1)"
      : "inset 0 1px 0 rgba(255,255,255,0.36), inset 1px 0 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.42), inset -1px 0 0 rgba(0,0,0,0.2), 0 4px 24px rgba(0,0,0,0.45)",
  };
}

function resolveTheme(t) {
  if (t === "system" || t?.startsWith("system_"))
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return t || "dark";
}

let T = buildTheme(
  resolveTheme(localStorage.getItem(THEME_KEY) || "dark"),
  localStorage.getItem(ACCENT_KEY) || "amber"
);

const btn = (variant = "primary", small = false) => ({
  display:"flex", alignItems:"center", justifyContent:"center", gap:"0.5rem",
  padding: small ? "0.45rem 1rem" : "0.65rem 1.5rem",
  fontFamily:SYS, fontWeight:600, fontSize: small ? "0.82rem" : "0.9rem",
  borderRadius:"8px", cursor:"pointer", border:"none", transition:"background 0.15s, opacity 0.15s",
  ...(variant==="primary"      && { background:`linear-gradient(135deg,${T.accent} 0%,${T.gradient2} 100%)`, color:"#fff" }),
  ...(variant==="ghost"        && { background:T.surface2, color:T.muted2 }),
  ...(variant==="danger"       && { background:T.red+"22",   color:T.red }),
  ...(variant==="accent-tonal" && { background:T.accent+"22", color:T.accent }),
});

const card = (extra = {}) => ({
  background:T.surface, border:"1px solid "+T.border, borderRadius:"12px", padding:"1.25rem", ...extra
});

const inp = (extra = {}) => ({
  background:T.surface2, border:"1px solid "+T.border, borderRadius:"8px",
  color:T.text, fontFamily:SYS, fontSize:"1rem",
  padding:"0.6rem 0.85rem", outline:"none", ...extra
});

const modalOverlay = () => ({
  position:"fixed", inset:0, zIndex:9999,
  background:T.overlayBg,
  backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)",
  display:"flex", alignItems:"center", justifyContent:"center", padding:"1.5rem",
});

const SYS = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
const SYS_MONO = `ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Mono", monospace`;

const STATIC_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  @keyframes menuIn {
    0%   { opacity:0; transform:scale(0.85) translateY(-6px); }
    60%  { opacity:1; transform:scale(1.02) translateY(1px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
  }
  .menu-open { animation: menuIn 0.22s cubic-bezier(0.34,1.4,0.64,1) forwards; transform-origin: top right; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
  @keyframes fabPopIn {
    0%   { transform: translateY(12px); opacity: 0; }
    100% { transform: translateY(0px); opacity: 1; }
  }

  @keyframes breatheFast {
    0%, 100% { transform: scale(1);    opacity: 0.55; }
    50%       { transform: scale(1.13); opacity: 0.85; }
  }
  @keyframes breatheSlow {
    0%, 100% { transform: scale(1);    opacity: 0.35; }
    50%       { transform: scale(1.11); opacity: 0.65; }
  }
  @keyframes breatheIdle {
    0%, 100% { transform: scale(1);    opacity: 0.25; }
    50%       { transform: scale(1.07); opacity: 0.45; }
  }
  @keyframes popperPop {
    0%   { transform: scale(0.7) rotate(-15deg); opacity:0; }
    40%  { transform: scale(1.12) rotate(8deg);  opacity:1; }
    60%  { transform: scale(0.95) rotate(-3deg); }
    80%  { transform: scale(1.04) rotate(2deg); }
    100% { transform: scale(1) rotate(0deg); opacity:1; }
  }

  @keyframes popperFloat {
    0%   { transform: scale(1) rotate(0deg); }
    25%  { transform: scale(1.06) rotate(4deg); }
    50%  { transform: scale(1.03) rotate(0deg); }
    75%  { transform: scale(1.06) rotate(-4deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  .popper-pop { animation: popperPop 1s cubic-bezier(0.34,1.4,0.64,1) forwards; transform-origin: center; }
  .popper-float { animation: popperFloat 3s ease-in-out infinite; transform-origin: center; }

  @keyframes popUp {
    0%   { opacity:0; transform:scale(0.6) translateY(20px); }
    70%  { opacity:1; transform:scale(1.05) translateY(-4px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
  }
  .pop-up { animation: popUp 0.6s cubic-bezier(0.34,1.4,0.64,1) forwards; }
  .glow-fast { animation: breatheFast 0.8s ease-in-out infinite; }
  .glow-slow { animation: breatheSlow 4s ease-in-out infinite; }
  .glow-idle { animation: breatheIdle 6s ease-in-out infinite; }
`;

const PROFILE_ICON_DEFS = [
  { id:"bolt",     svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
  { id:"flame",    svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> },
  { id:"target",   svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> },
  { id:"trophy",   svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 4 17 4 7 20 7 20 17 16 17"/><polygon points="8 21 16 21 16 17 8 17 8 21"/><path d="M10 7V3H14V7"/></svg> },
  { id:"star",     svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { id:"heart",    svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { id:"dumbbell", svg:(c) => <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg> },
];

const PROFILE_COLOR_PAIRS = [
  {bg:"#1e3a5f",icon:"#60b4ff"},{bg:"#3b1f5e",icon:"#c084fc"},{bg:"#1a4731",icon:"#4ade80"},
  {bg:"#5c1a1a",icon:"#f87171"},{bg:"#4a2c0a",icon:"#fb923c"},{bg:"#1a3a4a",icon:"#22d3ee"},
  {bg:"#3d2a0a",icon:"#fbbf24"},{bg:"#2d1a4a",icon:"#a78bfa"},{bg:"#1a3a2a",icon:"#34d399"},
];

function randomProfileCombo(currentId) {
  const icons = PROFILE_ICON_DEFS.filter(i => i.id !== currentId);
  const icon  = icons[Math.floor(Math.random() * icons.length)];
  const color = PROFILE_COLOR_PAIRS[Math.floor(Math.random() * PROFILE_COLOR_PAIRS.length)];
  return { iconId: icon.id, bg: color.bg, iconColor: color.icon };
}

function ProfileIconDisplay({ iconId, bg, iconColor, size = 36 }) {
  const def = PROFILE_ICON_DEFS.find(d => d.id === iconId) || PROFILE_ICON_DEFS[0];
  return (
    <div style={{ width:size, height:size, borderRadius:"99px", background:bg, flexShrink:0,
      display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      <div style={{ width:size*0.55, height:size*0.55 }}>{def.svg(iconColor)}</div>
    </div>
  );
}

// Modal is rendered at App root — always above everything, never clipped
function ProfileModal({ name, iconId, bg, iconColor, onSave, onClose }) {
  const [draftName,   setDraftName]   = useState(name);
  const [draftIconId, setDraftIconId] = useState(iconId);
  const [draftBg,     setDraftBg]     = useState(bg);
  const [draftIColor, setDraftIColor] = useState(iconColor);

  function randomIcon() {
    const combo = randomProfileCombo(draftIconId);
    setDraftIconId(combo.iconId); setDraftBg(combo.bg); setDraftIColor(combo.iconColor);
  }

  return (
    <div style={modalOverlay()} onClick={onClose}>
      <div style={{ ...card({ maxWidth:"320px", width:"100%", padding:"2rem" }), boxShadow:T.modalShadow }}
        onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily:SYS_MONO, fontSize:"0.68rem", letterSpacing:"0.12em",
          color:T.muted2, marginBottom:"1.25rem" }}>PROFILE</p>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:"0.75rem" }}>
          <button onClick={randomIcon} style={{ width:"80px", height:"80px", borderRadius:"99px",
            background:draftBg, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 20px rgba(0,0,0,0.25)" }}>
            <div style={{ width:"44px", height:"44px" }}>
              {(PROFILE_ICON_DEFS.find(d => d.id === draftIconId) || PROFILE_ICON_DEFS[0]).svg(draftIColor)}
            </div>
          </button>
        </div>
        <p style={{ fontFamily:SYS, fontSize:"0.75rem", color:T.muted,
          textAlign:"center", marginBottom:"1.25rem" }}>Tap to change</p>
        <input value={draftName} onChange={e => setDraftName(e.target.value)}
          placeholder="Your name" maxLength={15}
          style={{ ...inp({ width:"100%", marginBottom:"1.25rem", textAlign:"center" }) }} />
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button onClick={() => { onSave(draftName || "Athlete", draftIconId, draftBg, draftIColor); onClose(); }}
            style={{ ...btn("primary"), borderRadius:"99px", flex:1 }}>Save</button>
          <button onClick={onClose}
            onPointerDown={e => e.currentTarget.style.background = T.pressBgSoft}
            onPointerUp={e => { e.currentTarget.style.background = T.surface2; }}
            onPointerLeave={e => e.currentTarget.style.background = T.surface2}
            onPointerCancel={e => e.currentTarget.style.background = T.surface2}
            style={{ ...btn("ghost"), borderRadius:"99px", flex:1 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GlobalNav({ theme, onSetTheme, accent, onSetAccent, profileName, profileIconId, profileBg, profileIColor, onShowProfile, soundEnabled, onToggleSound, hapticEnabled, onToggleHaptic, soundPack, onSetSoundPack, onShowHistory, currentScreen }) {
  const [open,    setOpen]    = useState(false);
  const [section, setSection] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function h(e) { if (navRef.current && !navRef.current.contains(e.target)) { setOpen(false); setSection(null); } }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function close() { setOpen(false); setSection(null); }

  const menuItemStyle = {
    display:"flex", alignItems:"center", justifyContent:"space-between",
    width:"100%", textAlign:"left", border:"none", background:"transparent",
    padding:"0.9rem 1.25rem", fontFamily:SYS, fontSize:"0.95rem",
    color:T.text, cursor:"pointer",
    transition:"background 0.1s",
  };
  const menuPress   = (e) => { e.currentTarget.style.background = T.pressBgSoft; };
  const menuRelease = (e) => { e.currentTarget.style.background = "transparent"; };

  const sectionHeader = (label, back) => (
    <div style={{ padding:"0.7rem 1.25rem", borderBottom:"1px solid "+T.border,
      display:"flex", alignItems:"center", gap:"0.6rem", minHeight:"56px" }}>
      <button onClick={back}
        onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease}
        style={{ background:"none", border:"none", color:T.muted2,
        cursor:"pointer", fontSize:"1.3rem", padding:"0 0.25rem", lineHeight:1,
        display:"flex", alignItems:"center", borderRadius:"99px", transition:"background 0.1s" }}>&#8249;</button>
      <p style={{ fontFamily:SYS_MONO, fontSize:"0.68rem",
        letterSpacing:"0.12em", color:T.muted2 }}>{label}</p>
    </div>
  );

  const [hamburgerPressed, setHamburgerPressed] = useState(false);


  return (
    <div ref={navRef} style={{ position:"relative" }}>
      <button
        onPointerDown={() => setHamburgerPressed(true)}
        onPointerUp={() => { setHamburgerPressed(false); setOpen(o => !o); if (open) setSection(null); }}
        onPointerLeave={() => setHamburgerPressed(false)}
        onPointerCancel={() => setHamburgerPressed(false)}
        style={{
        background: hamburgerPressed ? T.pressBgStrong : T.glassBg,
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        border:"1px solid "+T.glassBorder,
        borderRadius:"99px", cursor:"pointer", display:"flex", flexDirection:"column",
        gap:"4px", alignItems:"center", justifyContent:"center",
        width:"44px", height:"44px", flexShrink:0,
        transition:"background 0.1s",
        boxShadow: T.glassShadow,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          style={{ color: T.mode==="light" ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)" }}>
          <path d="M20 7L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M20 12L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M20 17L4 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="menu-open" style={{
          position:"absolute", right:0, top:"calc(100% + 8px)", zIndex:500,
          background: T.mode==="light" ? "rgba(255,255,255,1)" : "rgba(18,18,18,1)",
          backdropFilter:"blur(40px)", WebkitBackdropFilter:"blur(40px)",
          border:"1px solid "+(T.mode==="light" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)"),
          borderRadius:"16px", overflow:"hidden",
          boxShadow: T.mode==="light" ? "0 8px 40px rgba(0,0,0,0.12)" : "0 8px 40px rgba(0,0,0,0.4)",
          minWidth:"260px",
        }}>

          {section === null && (
            <button onClick={() => { close(); onShowProfile(); }}
              onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease}
              style={{
              display:"flex", alignItems:"center", gap:"0.85rem",
              width:"100%", background:"transparent", border:"none", padding:"0.9rem 1.25rem",
              borderBottom:"0.5px solid "+(T.mode==="light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"),
              cursor:"pointer",
            }}>
              <ProfileIconDisplay iconId={profileIconId} bg={profileBg} iconColor={profileIColor} size={36} />
              <div style={{ textAlign:"left" }}>
                <p style={{ fontFamily:SYS, fontWeight:600, fontSize:"0.92rem",
                  color:T.text, lineHeight:1.2 }}>{profileName}</p>
                <p style={{ fontFamily:SYS, fontSize:"0.72rem", color:T.muted }}>Edit profile</p>
              </div>
            </button>
          )}

          {section === null && (
            <>
              <button
                onPointerDown={currentScreen === "timer" ? undefined : menuPress}
                onPointerUp={currentScreen === "timer" ? undefined : () => { menuRelease; close(); onShowHistory(); }}
                onPointerLeave={currentScreen === "timer" ? undefined : menuRelease}
                onPointerCancel={currentScreen === "timer" ? undefined : menuRelease}
                disabled={currentScreen === "timer"}
                style={{ ...menuItemStyle, opacity: currentScreen === "timer" ? 0.35 : 1, cursor: currentScreen === "timer" ? "default" : "pointer" }}>
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>History</span>
                </span>
                <span style={{ fontSize:"0.8rem", color:T.muted }}>›</span>
              </button>
              <button onClick={() => setSection("appearance")} onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease} style={{ ...menuItemStyle }}
               >
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
                    <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                  </svg>
                  <span>Appearance</span>
                </span>
                <span style={{ fontSize:"0.8rem", color:T.muted }}>›</span>
              </button>

              <button onClick={() => setSection("sound")} onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease} style={{ ...menuItemStyle }}
               >
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  </svg>
                  <span>Sound & Haptic</span>
                </span>
                <span style={{ fontSize:"0.8rem", color:T.muted }}>›</span>
              </button>

              <p style={{ fontFamily:SYS_MONO, fontSize:"0.6rem", letterSpacing:"0.1em",
                color:T.muted, textAlign:"center", padding:"0.6rem 1.25rem",
                borderTop:T.hairline }}>
                TEMPO {VERSION}
              </p>
            </>
          )}

          {section === "sound" && (
            <>
              {sectionHeader("SOUND & HAPTIC", () => setSection(null))}

              {/* Sound toggle */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"0.9rem 1.25rem" }}>
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem", fontFamily:SYS, fontSize:"0.95rem", color:T.text }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                  </svg>
                  Sound
                </span>
                <button onClick={onToggleSound} style={{
                  width:"44px", height:"24px", borderRadius:"99px", border:"none", cursor:"pointer",
                  background: soundEnabled ? T.accent : T.border,
                  position:"relative", transition:"background 0.2s", flexShrink:0,
                }}>
                  <span style={{ position:"absolute", top:"3px", left: soundEnabled ? "23px" : "3px",
                    width:"18px", height:"18px", borderRadius:"50%", background:"white",
                    transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.25)" }}/>
                </button>
              </div>

              {/* Haptic toggle */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"0.9rem 1.25rem",
                borderTop:T.hairline }}>
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem", fontFamily:SYS, fontSize:"0.95rem", color:T.text }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="7" y="2" width="10" height="20" rx="2"/>
                    <line x1="4.5" y1="8" x2="2.5" y2="10"/>
                    <line x1="4.5" y1="16" x2="2.5" y2="14"/>
                    <line x1="19.5" y1="8" x2="21.5" y2="10"/>
                    <line x1="19.5" y1="16" x2="21.5" y2="14"/>
                  </svg>
                  Haptic
                </span>
                <button onClick={onToggleHaptic} style={{
                  width:"44px", height:"24px", borderRadius:"99px", border:"none", cursor:"pointer",
                  background: hapticEnabled ? T.accent : T.border,
                  position:"relative", transition:"background 0.2s", flexShrink:0,
                }}>
                  <span style={{ position:"absolute", top:"3px", left: hapticEnabled ? "23px" : "3px",
                    width:"18px", height:"18px", borderRadius:"50%", background:"white",
                    transition:"left 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.25)" }}/>
                </button>
              </div>

              {/* Sound pack selector */}
              <button onClick={() => setSection("soundpack")} onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease} style={{ ...menuItemStyle,
                borderTop:T.hairline }}
               >
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
                  </svg>
                  <span>Sound Style</span>
                </span>
                <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                  <span style={{ fontFamily:SYS, fontSize:"0.78rem", color:T.muted }}>
                    {SOUND_PACKS[soundPack]?.label}
                  </span>
                  <span style={{ fontSize:"0.8rem", color:T.muted }}>›</span>
                </div>
              </button>
            </>
          )}

          {section === "soundpack" && (
            <>
              {sectionHeader("SOUND STYLE", () => setSection("sound"))}
              {Object.entries(SOUND_PACKS).map(([key, pack], i, arr) => {
                const active = soundPack === key;
                return (
                  <Fragment key={key}>
                    <button onClick={() => onSetSoundPack(key)} style={{
                      ...menuItemStyle,
                      color: active ? T.accent : T.muted2,
                      background: active ? T.accent+"15" : "transparent",
                    }}>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"0.15rem" }}>
                        <span style={{ fontFamily:SYS, fontSize:"0.95rem" }}>{pack.label}</span>
                        <span style={{ fontFamily:SYS, fontSize:"0.72rem", color:T.muted }}>{pack.description}</span>
                      </div>
                      {active && <span style={{ fontSize:"0.85rem" }}>✓</span>}
                    </button>
                    {i < arr.length-1 && (
                      <div style={{ height:"0.5px", background:T.divider, margin:"0 1rem" }} />
                    )}
                  </Fragment>
                );
              })}
            </>
          )}

          {section === "appearance" && (
            <>
              <div style={{ padding:"0.7rem 1.25rem", borderBottom:"0.5px solid "+T.border,
                display:"flex", alignItems:"center", justifyContent:"space-between", minHeight:"56px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                  <button onClick={() => setSection(null)}
                    onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease}
                    style={{ background:"none", border:"none", color:T.muted2, cursor:"pointer",
                      fontSize:"1.3rem", padding:"0 0.25rem", lineHeight:1,
                      display:"flex", alignItems:"center", borderRadius:"99px", transition:"background 0.1s" }}>&#8249;</button>
                  <p style={{ fontFamily:SYS_MONO, fontSize:"0.68rem",
                    letterSpacing:"0.12em", color:T.muted2 }}>APPEARANCE</p>
                </div>
                <div style={{ display:"flex",
                  background: T.mode==="light" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)",
                  borderRadius:"99px", padding:"0.2rem", gap:"0.1rem" }}>
                  {[
                    { id:"light",  svg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
                    { id:"dark",   svg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> },
                    { id:"system", svg: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
                  ].map(opt => {
                    const active = theme === opt.id || (opt.id === "system" && theme.startsWith("system"));
                    return (
                      <button key={opt.id} onClick={() => onSetTheme(opt.id)} style={{
                        width:"30px", height:"26px", borderRadius:"99px", border:"none",
                        cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                        background: active ? (T.mode==="light" ? "#fff" : "#3d3558") : "transparent",
                        color: active ? T.accent : T.muted,
                        transition:"background 0.18s, color 0.18s",
                      }}>{opt.svg}</button>
                    );
                  })}
                </div>
              </div>
              <button onClick={() => setSection("color")} onPointerDown={menuPress} onPointerUp={menuRelease} onPointerLeave={menuRelease} onPointerCancel={menuRelease} style={{ ...menuItemStyle }}
               >
                <span style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <span style={{ width:"18px", height:"18px", borderRadius:"50%",
                    background:T.accent, display:"inline-block", flexShrink:0 }} />
                  <span>Color scheme</span>
                </span>
                <span style={{ fontSize:"0.8rem", color:T.muted }}>›</span>
              </button>
            </>
          )}

          {section === "color" && (
            <>
              {sectionHeader("COLOR SCHEME", () => setSection("appearance"))}
              {Object.entries(ACCENT_SCHEMES).map(([key, scheme], i, arr) => {
                const active = accent === key;
                return (
                  <Fragment key={key}>
                    <button onClick={() => onSetAccent(key)} style={{
                      ...menuItemStyle,
                      color: active ? scheme.swatch : T.muted2,
                      background: active ? scheme.swatch+"15" : "transparent",
                    }}>
                      <span style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                        <span style={{ width:"18px", height:"18px", borderRadius:"50%",
                          background:scheme.swatch, display:"inline-block", flexShrink:0,
                          boxShadow: active ? "0 0 0 3px "+scheme.swatch+"44" : "none" }} />
                        <span>{scheme.label}</span>
                      </span>
                      {active && <span style={{ fontSize:"0.85rem" }}>✓</span>}
                    </button>
                    {i < arr.length-1 && (
                      <div style={{ height:"0.5px", background:T.divider, margin:"0 1rem" }} />
                    )}
                  </Fragment>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}


// ─── Workout History ─────────────────────────────────────────────────────────
const HISTORY_KEY = "workoutapp_history";

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch(e) { return []; }
}

function saveWorkoutToHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  // Keep last 200 entries
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 200)));
}

function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function HistoryScreen({ onClose }) {
  const [history, setHistory] = useState(() => loadHistory());
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().split('T')[0];
  });

  // Build current week Mon–Sun
  const today = new Date(); today.setHours(0,0,0,0);
  const dayOfWeek = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d;
  });

  const workoutDates = new Set(history.map(e => e.date));
  const selectedWorkouts = history.filter(e => e.date === selectedDate);
  const dayLabels = ["M","T","W","T","F","S","S"];

  return (
    <div className="fade-up" style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:"calc(100vh - 56px)" }}>

      {/* Sticky weekly calendar */}
      <div style={{
        position:"sticky", top:"calc(56px + env(safe-area-inset-top))", zIndex:50,
        background: T.stickyBg,
        backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
        padding:"0.75rem 1rem",
        borderBottom:"1px solid "+T.border,
        marginLeft:"-1rem", marginRight:"-1rem",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {weekDays.map((day, i) => {
            const iso = day.toISOString().split('T')[0];
            const isToday = iso === today.toISOString().split('T')[0];
            const isSelected = iso === selectedDate;
            const hasWorkout = workoutDates.has(iso);
            return (
              <button key={iso} onClick={() => setSelectedDate(iso)} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:"0.25rem",
                background:"none", border:"none", cursor:"pointer", padding:"0.3rem 0.4rem",
                borderRadius:"10px",
                transition:"background 0.15s",
                background: isSelected
                  ? T.accent+"33"
                  : "transparent",
              }}>
                <p style={{ fontFamily:SYS, fontSize:"0.68rem", color: isSelected ? T.accent : T.muted,
                  fontWeight: isToday ? 700 : 400 }}>{dayLabels[i]}</p>
                <p style={{ fontFamily:SYS, fontWeight: isToday ? 700 : 400,
                  fontSize:"1rem", color: isSelected ? T.accent : isToday ? T.text : T.muted2 }}>
                  {day.getDate()}
                </p>
                <div style={{ width:"5px", height:"5px", borderRadius:"50%",
                  background: hasWorkout ? T.accent : "transparent" }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout cards for selected day */}
      <div style={{ padding:"0.75rem 0 6rem", flex:1 }}>
        {selectedWorkouts.length === 0 ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", padding:"3rem 1rem", gap:"0.75rem" }}>
            <p style={{ fontFamily:SYS, fontSize:"2rem" }}>
            {["🏃","🏋️","🤸","⛹️","🚴","🤾","🧘","🏊","⛹️‍♀️","🤸‍♀️","🏋️‍♀️","🤾‍♂️","🤾‍♀️","🏊‍♀️","🧘‍♀️","🧘‍♂️","🤽‍♀️","🤽","⛹️‍♂️","🤸‍♂️","🏋️‍♂️","🚴‍♀️","🚴‍♂️"][Math.floor(Math.random() * 23)]}
          </p>
            <p style={{ fontFamily:SYS, fontWeight:600, fontSize:"1rem", color:T.muted2 }}>No workouts this day</p>
            <p style={{ fontFamily:SYS, fontSize:"0.85rem", color:T.muted }}>Completed workouts will appear here</p>
          </div>
        ) : (
          selectedWorkouts.map((entry, i) => (
            <div key={i} style={{ background:T.surface, border:"1px solid "+T.border,
              borderRadius:"12px", padding:"1rem 1.25rem", marginBottom:"0.75rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.75rem" }}>
                <div>
                  <p style={{ fontFamily:SYS, fontWeight:600, fontSize:"1rem", color:T.text }}>
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                  </p>
                  <p style={{ fontFamily:SYS, fontSize:"0.78rem", color:T.muted, marginTop:"0.1rem" }}>
                    {fmt(entry.durationSec)} total
                  </p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontFamily:SYS, fontWeight:700, fontSize:"1.1rem", color:T.accent }}>
                    {entry.completedRounds}/{entry.totalRounds}
                  </p>
                  <p style={{ fontFamily:SYS, fontSize:"0.72rem", color:T.muted }}>rounds</p>
                </div>
              </div>
              <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                {[
                  `${entry.sets} sets`,
                  `${entry.exercises} exercises`,
                  entry.skippedRounds > 0 ? `${entry.skippedRounds} skipped` : null,
                ].filter(Boolean).map((tag, j) => (
                  <span key={j} style={{ fontFamily:SYS, fontSize:"0.72rem",
                    background: tag.includes("skipped") ? T.red+"22" : T.surface2,
                    color: tag.includes("skipped") ? T.red : T.muted2,
                    padding:"0.2rem 0.6rem", borderRadius:"99px",
                    border:"1px solid "+(tag.includes("skipped") ? T.red+"44" : T.border) }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function fmtTime(sec) {
  return String(Math.floor(sec / 60)).padStart(2,"0") + ":" + String(sec % 60).padStart(2,"0");
}

function RowInput({ label, value, onChange, min, max, step = 1, isTime = false }) {
  const display = isTime ? fmtTime(value) : value;
  const [minusPressed, setMinusPressed] = useState(false);
  const [plusPressed,  setPlusPressed]  = useState(false);
  const longPressRef = useRef(null);

  function handleMinusDown() {
    setMinusPressed(true);
    longPressRef.current = setTimeout(() => onChange(min), 600);
  }
  function handleMinusUp() {
    setMinusPressed(false);
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    onChange(Math.max(min, value - step));
  }
  function handlePlusDown() {
    setPlusPressed(true);
    longPressRef.current = setTimeout(() => onChange(max), 600);
  }
  function handlePlusUp() {
    setPlusPressed(false);
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    onChange(Math.min(max, value + step));
  }
  function handleLeave(setter) {
    setter(false);
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  }

  return (
    <div style={{ padding:"0.85rem 1rem", textAlign:"center" }}>
      <p style={{ fontFamily:SYS, fontSize:"0.78rem", color:T.muted, marginBottom:"0.35rem" }}>{label}</p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"1.5rem" }}>
        <button
          onPointerDown={handleMinusDown}
          onPointerUp={handleMinusUp}
          onPointerLeave={() => handleLeave(setMinusPressed)}
          onPointerCancel={() => handleLeave(setMinusPressed)}
          style={{
          width:"36px", height:"36px", borderRadius:"99px",
          background: minusPressed ? T.pressBg : "transparent",
          border:"1px solid "+T.border,
          color:T.muted2, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          transition:"background 0.1s", userSelect:"none", WebkitUserSelect:"none",
        }}>
          <svg width="14" height="2" viewBox="0 0 14 2" fill="none">
            <rect width="14" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
        <p style={{ fontFamily:SYS, fontWeight:600, fontSize:"1.5rem",
          color:T.text, letterSpacing:"0.02em", minWidth:"80px",
          userSelect:"none", WebkitUserSelect:"none" }}>{display}</p>
        <button
          onPointerDown={handlePlusDown}
          onPointerUp={handlePlusUp}
          onPointerLeave={() => handleLeave(setPlusPressed)}
          onPointerCancel={() => handleLeave(setPlusPressed)}
          style={{
          width:"36px", height:"36px", borderRadius:"99px",
          background: plusPressed ? T.pressBg : "transparent",
          border:"1px solid "+T.border,
          color:T.muted2, cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          transition:"background 0.1s", userSelect:"none", WebkitUserSelect:"none",
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="6" y="0" width="2" height="14" rx="1" fill="currentColor"/>
            <rect x="0" y="6" width="14" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function HomeScreen({ onStart, settings, onSettingsChange }) {
  const { sets, exercises, getReadySec, workoutSec, restSec, coolDownSec } = settings;
  const setSets        = v => onSettingsChange({ ...settings, sets: v });
  const setExercises   = v => onSettingsChange({ ...settings, exercises: v });
  const setGetReadySec = v => onSettingsChange({ ...settings, getReadySec: v });
  const setWorkoutSec  = v => onSettingsChange({ ...settings, workoutSec: v });
  const setRestSec     = v => onSettingsChange({ ...settings, restSec: v });
  const setCoolDownSec = v => onSettingsChange({ ...settings, coolDownSec: v });

  const totalSec = getReadySec
    + sets * (exercises * workoutSec + (exercises - 1) * restSec)
    + (sets - 1) * restSec
    + coolDownSec;
  const totalMin    = Math.floor(totalSec / 60);
  const totalRemSec = totalSec % 60;

  const rows = [
    { label:"Exercises",    value:exercises,   onChange:setExercises,   min:1, max:20,  step:1, isTime:false },
    { label:"Sets",         value:sets,        onChange:setSets,        min:1, max:10,  step:1, isTime:false },
    { label:"Get Ready",    value:getReadySec, onChange:setGetReadySec, min:0, max:120, step:5, isTime:true  },
    { label:"Time per Set", value:workoutSec,  onChange:setWorkoutSec,  min:5, max:300, step:5, isTime:true  },
    { label:"Rest",         value:restSec,     onChange:setRestSec,     min:0, max:120, step:5, isTime:true  },
    { label:"Cool Down",    value:coolDownSec, onChange:setCoolDownSec, min:0, max:120, step:5, isTime:true  },
  ];

  return (
    <div className="fade-up" style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:"calc(100vh - 56px)" }}>

      {/* Sticky total time banner — minimal */}
      <div style={{
        position:"sticky", top:"calc(56px + env(safe-area-inset-top))", zIndex:50,
        background: T.stickyBg,
        backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
        padding:"0.6rem 1rem", textAlign:"center",
        borderBottom:"1px solid "+T.border,
        marginLeft:"-1rem", marginRight:"-1rem",
      }}>
        <p style={{ fontFamily:SYS, fontSize:"0.62rem", letterSpacing:"0.08em",
          color:T.muted, marginBottom:"0.1rem", textTransform:"uppercase" }}>Total Workout Time</p>
        <p style={{ fontFamily:SYS, fontWeight:700, fontSize:"1.6rem", color:T.accent, lineHeight:1 }}>
          {totalMin}<span style={{ fontSize:"0.85rem", color:T.muted, marginLeft:"2px" }}>m</span>
          {totalRemSec > 0 && <>{" "}{totalRemSec}<span style={{ fontSize:"0.85rem", color:T.muted, marginLeft:"2px" }}>s</span></>}
        </p>
      </div>

      {/* Scrollable rows — no card, floats on background */}
      <div style={{ padding:"0.5rem 0 6rem" }}>
        {rows.map((row, i) => (
          <Fragment key={row.label}>
            <RowInput {...row} />
            {i < rows.length - 1 && (
              <div style={{ display:"flex", justifyContent:"center" }}>
                <div style={{ height:"1px", background:T.border, width:"25%", opacity:0.5 }} />
              </div>
            )}
          </Fragment>
        ))}
      </div>

    </div>
  );
}

function DoneScreen({ onBack, sets, exercises, completedRounds }) {
  const DONE_EMOJIS = ["🎉", "🏆", "⚡", "🔥", "🎯", "⭐", "🥇", "👏", "👍", "💪"];
  const [doneEmoji] = useState(() => DONE_EMOJIS[Math.floor(Math.random() * DONE_EMOJIS.length)]);
  const [emojiClass, setEmojiClass] = useState("popper-pop");
  const [backBounce, pressBack, releaseBack] = useBounce();

  useEffect(() => {
    const t = setTimeout(() => setEmojiClass("popper-float"), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fade-up" style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", minHeight:"calc(100vh - 56px)", gap:"2rem", padding:"2rem",
      textAlign:"center" }}>
      <div style={{ width:"180px", height:"180px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div key={emojiClass} className={emojiClass}
          style={{ fontSize:"100px", lineHeight:1, userSelect:"none", transformOrigin:"center" }}>
          {doneEmoji}
        </div>
      </div>
      <div className="pop-up" style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
        <p style={{ fontFamily:SYS, fontWeight:700, fontSize:"2rem", color:T.text }}>
          Workout Complete!
        </p>
        <p style={{ fontFamily:SYS, fontSize:"0.95rem", color:T.muted2 }}>
          {completedRounds} of {exercises * sets} rounds completed
        </p>
        {completedRounds < exercises * sets && (
          <p style={{ fontFamily:SYS, fontSize:"0.82rem", color:T.muted }}>
            {exercises * sets - completedRounds} skipped
          </p>
        )}
      </div>
      <div style={{ pointerEvents:"none", display:"flex", justifyContent:"center" }}>
        <button
          onPointerDown={() => pressBack()}
          onPointerUp={() => { releaseBack(); setTimeout(onBack, 300); }}
          onPointerLeave={() => releaseBack()}
          onPointerCancel={() => releaseBack()}
          style={{
            ...btn("primary"), borderRadius:"99px", padding:"0.9rem 2.5rem", fontSize:"1rem",
            background:`linear-gradient(135deg,${T.accent} 0%,${T.gradient2} 100%)`,
            boxShadow:`0 4px 24px ${T.accent}66`,
            pointerEvents:"all",
            transform: backBounce ? "scale(0.92)" : "scale(1)",
            transition: backBounce ? "transform 0.1s ease-in" : "transform 0.3s cubic-bezier(0.34,2.8,0.64,1)",
          }}>Back to Home</button>
      </div>
    </div>
  );
}

function TimerScreen({ config, onBack, onRequestQuit, onRequestResetWorkout, onRequestSkipAll, onDone, soundEnabled, hapticEnabled, soundPack }) {
  const vibe = (p) => { if (hapticEnabled) vibrate(p); };
  const beep = (k) => { if (soundEnabled) (SOUND_PACKS[soundPack] || SOUND_PACKS.classic).sounds[k]?.(); };
  const { workoutSec, restSec, exercises, sets, getReadySec, coolDownSec } = config;

  // phases: getReady → workout → rest → ... → setRest → ... → coolDown → done
  const startPhase = getReadySec > 0 ? "getReady" : "workout";
  const [phase,           setPhase]           = useState(startPhase);
  const [currentSet,      setCurrentSet]      = useState(1);
  const [currentExercise, setCurrentExercise] = useState(1);
  const [timeLeft,        setTimeLeft]        = useState(getReadySec > 0 ? getReadySec : workoutSec);
  const [running,         setRunning]         = useState(false);
  const [done,            setDone]            = useState(false);
  const [finishedRounds,  setFinishedRounds]  = useState(0);
  const [playBounce,  pressPlay,  releasePlay]  = useBounce();
  const [skipBounce,  pressSkip,  releaseSkip]  = useBounce();
  const [resetBounce, pressReset, releaseReset] = useBounce();
  const [confirmReset,    setConfirmReset]    = useState(false);  // kept for local use
  const [confirmSkipAll,  setConfirmSkipAll]  = useState(false);  // kept for local use
  const resetLongRef   = useRef(null);
  const skipLongRef    = useRef(null);
  const [smoothProgress,  setSmoothProgress]  = useState(0);
  const intervalRef = useRef(null);
  const rafRef       = useRef(null);
  const phaseStartRef = useRef({ time: Date.now(), duration: 1 });

  const totalRounds     = exercises * sets;
  const completedRounds = (currentSet-1)*exercises + (currentExercise-1)
    + (phase==="rest" || phase==="setRest" || done ? 1 : 0);
  const progress = totalRounds > 0 ? Math.min(completedRounds / totalRounds, 1) : 0;

  const phaseLabelMap = {
    getReady:"GET READY", workout:"WORKOUT", rest:"REST",
    setRest:"SET REST", coolDown:"COOL DOWN",
  };
  const phaseLabel    = done ? "DONE!" : phaseLabelMap[phase] || phase.toUpperCase();
  const phaseDuration = phase==="workout" ? workoutSec
    : phase==="getReady" ? getReadySec
    : phase==="coolDown" ? coolDownSec
    : phase==="setRest"  ? restSec
    : restSec;
  const timerProgress = done ? 1 : phaseDuration > 0 ? 1-(timeLeft/phaseDuration) : 1;

  function advance() {
    if (phase === "getReady") {
      vibe(HAPTICS.workout); beep('workout');
      setPhase("workout"); setTimeLeft(workoutSec);
    } else if (phase === "workout") {
      if (currentExercise < exercises) {
        if (restSec > 0) { vibe(HAPTICS.rest); beep('rest'); setPhase("rest"); setTimeLeft(restSec); }
        else { setCurrentExercise(e => e+1); setTimeLeft(workoutSec); vibe(HAPTICS.workout); beep('workout'); }
      } else {
        if (currentSet < sets) {
          if (restSec > 0) { vibe(HAPTICS.setRest); beep('setRest'); setPhase("setRest"); setTimeLeft(restSec); }
          else { setCurrentSet(s => s+1); setCurrentExercise(1); setTimeLeft(workoutSec); vibe(HAPTICS.workout); beep('workout'); }
        } else {
          if (coolDownSec > 0) { vibe(HAPTICS.coolDown); beep('coolDown'); setPhase("coolDown"); setTimeLeft(coolDownSec); }
          else { vibe(HAPTICS.done); beep('done'); setDone(true); setRunning(false); onDone && onDone(finishedRounds); }
        }
      }
    } else if (phase === "rest") {
      setCurrentExercise(e => e+1); vibe(HAPTICS.workout); beep('workout'); setPhase("workout"); setTimeLeft(workoutSec);
    } else if (phase === "setRest") {
      setCurrentSet(s => s+1); setCurrentExercise(1); vibe(HAPTICS.workout); beep('workout'); setPhase("workout"); setTimeLeft(workoutSec);
    } else if (phase === "coolDown") {
      vibe(HAPTICS.done); beep('done'); setDone(true); setRunning(false); onDone && onDone(finishedRounds);
    }
  }

  function resetWorkout() {
    clearInterval(intervalRef.current);
    cancelAnimationFrame(rafRef.current);
    const startPhase = getReadySec > 0 ? "getReady" : "workout";
    setPhase(startPhase);
    setCurrentSet(1);
    setCurrentExercise(1);
    setTimeLeft(getReadySec > 0 ? getReadySec : workoutSec);
    setSmoothProgress(0);
    setRunning(false);
    setDone(false);
    setConfirmReset(false);
  }

  function skipToCooldown() {
    clearInterval(intervalRef.current);
    cancelAnimationFrame(rafRef.current);
    setCurrentSet(sets);
    setCurrentExercise(exercises);
    if (coolDownSec > 0) {
      setPhase("coolDown");
      setTimeLeft(coolDownSec);
    } else {
      vibe(HAPTICS.done); beep('done');
      setDone(true);
      onDone && onDone(finishedRounds);
    }
    setSmoothProgress(0);
    setRunning(false);
    setConfirmSkipAll(false);
  }

  useEffect(() => {
    function handleQuit() { setRunning(false); onRequestQuit(onBack); }
    document.addEventListener("tempo-quit", handleQuit);
    return () => document.removeEventListener("tempo-quit", handleQuit);
  }, []);

  const wakeLockRef = useRef(null);

  async function acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch(e) {}
  }

  function releaseWakeLock() {
    try {
      if (wakeLockRef.current) { wakeLockRef.current.release(); wakeLockRef.current = null; }
    } catch(e) {}
  }

  // Acquire wake lock when timer starts, release when done or paused
  useEffect(() => {
    if (running && !done) { acquireWakeLock(); }
    else { releaseWakeLock(); }
    return () => releaseWakeLock();
  }, [running, done]);

  // Re-acquire wake lock if user switches apps and returns
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && running && !done) acquireWakeLock();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [running, done]);

  // Reset smooth progress when phase changes
  useEffect(() => {
    setSmoothProgress(0);
    phaseStartRef.current = { time: Date.now(), duration: phaseDuration };
  }, [phase, currentSet, currentExercise]);

  // rAF loop drives smoothProgress between 0 and 1 based on real elapsed time
  useEffect(() => {
    if (!running || done) { cancelAnimationFrame(rafRef.current); return; }
    // Sync start time so resuming from pause picks up where it left off
    const elapsedSec = (1 - timeLeft / phaseDuration) * phaseDuration;
    phaseStartRef.current = { time: Date.now() - elapsedSec * 1000, duration: phaseDuration };

    function tick() {
      const { time, duration } = phaseStartRef.current;
      const p = Math.min((Date.now() - time) / 1000 / duration, 1);
      setSmoothProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, phase, currentSet, currentExercise, done]);

  useEffect(() => {
    if (!running || done) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          if (phase === "workout") setFinishedRounds(r => r + 1);
          setTimeout(() => advance(), 200);
          return 0;
        }
        // Countdown beep for last 3 seconds
        if (t <= 4 && t > 1) beep('countdown');
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase, currentExercise, currentSet, done]);

  const accentColor = done ? T.green
    : phase === "getReady" ? T.muted2
    : phase === "coolDown" ? T.green
    : phase === "workout"  ? T.accent
    : T.gradient2;

  return done ? <DoneScreen onBack={onBack} sets={sets} exercises={exercises} completedRounds={finishedRounds} /> : (
    <div className="fade-up" style={{ display:"flex", flexDirection:"column", gap:"1rem",
      alignItems:"center", minHeight:"calc(100vh - 56px)", justifyContent:"center",
      marginTop:"-5vh", paddingBottom:"2rem" }}>

      <div style={{ position:"relative", width:"300px", height:"300px", flexShrink:0 }}>
        {/* Breathing glow */}
        {running && !done && (
          <div style={{
            position:"absolute", inset:0, borderRadius:"50%",
            background:`radial-gradient(circle, ${accentColor}33 0%, ${accentColor}00 70%)`,
            pointerEvents:"none",
            animation: `${
              phase === "workout" ? "breatheFast 1.5s" :
              phase === "rest" || phase === "setRest" ? "breatheSlow 4s" :
              "breatheIdle 6s"
            } ease-in-out infinite`,
          }} />
        )}
        <svg key={phase} className="ring-pop" width="300" height="300" viewBox="0 0 300 300" style={{ position:"relative", zIndex:1 }}>
          {/* Clock face fill — white in light mode for watch-face feel */}
          <circle cx="150" cy="150" r="124"
            fill={T.mode === "light" ? "rgba(255,255,255,0.9)" : "transparent"} />
          {/* Track — softer in light mode */}
          <circle cx="150" cy="150" r="130" fill="none"
            stroke={T.mode === "light" ? "#e2d9d0" : T.border}
            strokeWidth="10" />
          {/* Progress arc - drawn clockwise from 12 o'clock */}
          {smoothProgress > 0 && (() => {
            const cx = 150, cy = 150, r = 130;
            const startX = cx, startY = cy - r;
            const angle = smoothProgress >= 1 ? 2 * Math.PI - 0.001 : smoothProgress * 2 * Math.PI;
            const endX = cx + r * Math.sin(angle);
            const endY = cy - r * Math.cos(angle);
            const largeArc = angle > Math.PI ? 1 : 0;
            const d = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
            return (
              <path d={d} fill="none" stroke={accentColor} strokeWidth="10"
                strokeLinecap="round"
                style={{ transition:"stroke 0.4s" }} />
            );
          })()}
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", zIndex:2 }}>
          <p style={{ fontFamily:SYS_MONO, fontSize:"0.65rem", letterSpacing:"0.15em",
            color:accentColor, marginBottom:"0.25rem", transition:"color 0.4s" }}>{phaseLabel}</p>
          <p style={{ fontFamily:SYS, fontWeight:700, fontSize:"4.5rem",
            color: T.mode === "light" ? "#1a1a2e" : T.text, lineHeight:1,
            fontVariantNumeric:"tabular-nums", letterSpacing:"-0.02em" }}>
            {done ? "🎉" : String(Math.floor(timeLeft/60)).padStart(2,"0")+":"+String(timeLeft%60).padStart(2,"0")}
          </p>
          {!done && <p style={{ fontFamily:SYS, fontSize:"0.75rem",
            color: T.mode === "light" ? "#6b7280" : T.muted2, marginTop:"0.3rem" }}>
            {phaseLabel === "GET READY" || phaseLabel === "COOL DOWN" ? " " : `Set ${currentSet}/${sets} · Ex ${currentExercise}/${exercises}`}
          </p>}
        </div>
      </div>

      {!done && (
        <>
          <div style={{ display:"flex", gap:"1.5rem", alignItems:"center", justifyContent:"center" }}>

            {/* Reset current phase button — long press resets entire workout */}
            <button
              onPointerDown={() => {
                pressReset();
                resetLongRef.current = setTimeout(() => {
                  resetLongRef.current = null;
                  releaseReset();
                  setRunning(false);
                  onRequestResetWorkout(resetWorkout);
                }, 600);
              }}
              onPointerUp={() => {
                releaseReset();
                if (resetLongRef.current) {
                  clearTimeout(resetLongRef.current);
                  resetLongRef.current = null;
                  clearInterval(intervalRef.current);
                  cancelAnimationFrame(rafRef.current);
                  setTimeLeft(phaseDuration);
                  setSmoothProgress(0);
                  phaseStartRef.current = { time: Date.now(), duration: phaseDuration };
                  setRunning(false);
                }
                // If long press fired (ref is null), do nothing
              }}
              onPointerLeave={() => {
                releaseReset();
                if (resetLongRef.current) { clearTimeout(resetLongRef.current); resetLongRef.current = null; }
              }}
              onPointerCancel={() => {
                releaseReset();
                if (resetLongRef.current) { clearTimeout(resetLongRef.current); resetLongRef.current = null; }
              }}
              style={{
              width:"52px", height:"52px", borderRadius:"50%", border:"1px solid "+T.border,
              background: resetBounce ? T.pressBg : T.surface2,
              cursor:"pointer", transition:"background 0.1s",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={T.muted2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onPointerDown={() => pressPlay()}
              onPointerUp={() => { releasePlay(); setRunning(r => !r); if (!running) { vibe(HAPTICS[phase] || HAPTICS.workout); beep(phase); } }}
              onPointerLeave={() => releasePlay()}
              onPointerCancel={() => releasePlay()}
              style={{
              width:"72px", height:"72px", borderRadius:"50%", border:"none", cursor:"pointer",
              background:`linear-gradient(135deg,${T.accent} 0%,${T.gradient2} 100%)`,
              boxShadow:`0 4px 20px ${T.accent}66`,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
              transform: playBounce ? "scale(0.82)" : "scale(1)",
              transition: playBounce ? "transform 0.1s ease-in" : "transform 0.3s cubic-bezier(0.34,2.2,0.64,1)",
            }}>
              {running ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <rect x="5" y="4" width="4" height="16" rx="1.5"/>
                  <rect x="15" y="4" width="4" height="16" rx="1.5"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <polygon points="6,3 21,12 6,21"/>
                </svg>
              )}
            </button>

            {/* Skip — long press skips to cooldown */}
            <button
              onPointerDown={() => {
                pressSkip();
                skipLongRef.current = setTimeout(() => {
                  skipLongRef.current = null;
                  releaseSkip();
                  setRunning(false);
                  onRequestSkipAll(skipToCooldown);
                }, 600);
              }}
              onPointerUp={() => {
                releaseSkip();
                if (skipLongRef.current) {
                  clearTimeout(skipLongRef.current);
                  skipLongRef.current = null;
                  clearInterval(intervalRef.current);
                  cancelAnimationFrame(rafRef.current);
                  setRunning(false);
                  advance();
                }
                // If long press fired (ref is null), do nothing
              }}
              onPointerLeave={() => {
                releaseSkip();
                if (skipLongRef.current) { clearTimeout(skipLongRef.current); skipLongRef.current = null; }
              }}
              onPointerCancel={() => {
                releaseSkip();
                if (skipLongRef.current) { clearTimeout(skipLongRef.current); skipLongRef.current = null; }
              }}
              style={{
              width:"52px", height:"52px", borderRadius:"50%", border:"1px solid "+T.border,
              background: skipBounce ? T.pressBg : T.surface2,
              cursor:"pointer", transition:"background 0.1s",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke={T.muted2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5,4 15,12 5,20"/>
                <line x1="19" y1="4" x2="19" y2="20"/>
              </svg>
            </button>
          </div>

          {/* Dots */}
          {(() => {
            const total = exercises * sets;
            const dotsPerRow = total > 100 ? 20 : 10;
            const dotSize = total > 100 ? "7px" : "10px";
            const dotGap = total > 100 ? "0.3rem" : "0.5rem";
            return (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.4rem", width:"100%", marginTop:"0.75rem" }}>
                {Array.from({ length: Math.ceil(total / dotsPerRow) }).map((_, rowIndex) => (
                  <div key={rowIndex} style={{ display:"flex", gap:dotGap, justifyContent:"center" }}>
                    {Array.from({ length: Math.min(dotsPerRow, total - rowIndex * dotsPerRow) }).map((_, colIndex) => {
                      const i = rowIndex * dotsPerRow + colIndex;
                      const s = Math.floor(i / exercises) + 1;
                      const e = (i % exercises) + 1;
                      const isDone = phase === "coolDown" || (s < currentSet || (s===currentSet && (e < currentExercise
                        || (e===currentExercise && (phase==="rest"||phase==="setRest")))));
                      const isActive = s===currentSet && e===currentExercise && phase==="workout";
                      return (
                        <div key={i} style={{ width:dotSize, height:dotSize, borderRadius:"50%", flexShrink:0,
                          background: isDone ? T.accent : isActive ? T.accent : T.border,
                          transition:"background 0.3s",
                          boxShadow: isActive ? `0 0 6px ${T.accent}` : "none" }} />
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

function ConfirmModal({ title, heading, body, confirmLabel, variant = "danger", onConfirm, onClose }) {
  const color = variant === "accent-tonal" ? T.accent : T.red;
  return (
    <div style={modalOverlay()} onClick={onClose}>
      <div style={{ ...card({ maxWidth:"300px", width:"100%", padding:"2rem" }), boxShadow:T.modalShadow }}
        onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily:SYS_MONO, fontSize:"0.64rem", letterSpacing:"0.1em",
          color, marginBottom:"0.5rem" }}>{title}</p>
        <p style={{ fontFamily:SYS, fontWeight:600, fontSize:"1.05rem",
          color:T.text, marginBottom:"0.5rem" }}>{heading}</p>
        <p style={{ fontFamily:SYS, fontSize:"0.85rem", color:T.muted2,
          lineHeight:1.5, marginBottom:"1.5rem" }}>{body}</p>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          <button
            onPointerDown={e => e.currentTarget.style.background = color+"55"}
            onPointerUp={e => { e.currentTarget.style.background = color+"22"; onConfirm(); }}
            onPointerLeave={e => e.currentTarget.style.background = color+"22"}
            onPointerCancel={e => e.currentTarget.style.background = color+"22"}
            style={{ ...btn(variant), borderRadius:"99px", width:"100%" }}>
            {confirmLabel}
          </button>
          <button
            onPointerDown={e => e.currentTarget.style.background = T.pressBgSoft}
            onPointerUp={e => { e.currentTarget.style.background = T.surface2; onClose(); }}
            onPointerLeave={e => e.currentTarget.style.background = T.surface2}
            onPointerCancel={e => e.currentTarget.style.background = T.surface2}
            style={{ ...btn("ghost"), borderRadius:"99px", width:"100%" }}>
            Keep going
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme,         setTheme]         = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const [accent,        setAccent]        = useState(() => localStorage.getItem(ACCENT_KEY) || "amber");
  const [profileName,   setProfileName]   = useState(() => localStorage.getItem(PROFILE_NAME_KEY) || "Athlete");
  const [profileIconId, setProfileIconId] = useState(() => localStorage.getItem(PROFILE_ICON_KEY) || "bolt");
  const [profileBg,     setProfileBg]     = useState(() => localStorage.getItem(PROFILE_BG_KEY) || "#1e3a5f");
  const [profileIColor, setProfileIColor] = useState(() => localStorage.getItem(PROFILE_ICOLOR_KEY) || "#60b4ff");
  const [screen,        setScreen]        = useState("home");
  const [config,        setConfig]        = useState(null);
  const [timerDone,     setTimerDone]     = useState(false);
  const [workoutStart,  setWorkoutStart]  = useState(null);
  const [workoutSettings, setWorkoutSettings] = useState({
    sets: 4, exercises: 5, getReadySec: 10, workoutSec: 30, restSec: 15, coolDownSec: 30,
  });
  const [soundEnabled,  setSoundEnabled]  = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [soundPack,     setSoundPack]     = useState(() => localStorage.getItem(SOUND_PACK_KEY) || "classic");
  const [showProfile,   setShowProfile]   = useState(false);
  const [confirmQuit,   setConfirmQuit]   = useState(false);
  const [confirmReset,  setConfirmReset]  = useState(false);
  const [confirmSkipAll,setConfirmSkipAll]= useState(false);
  const [quitCallback,  setQuitCallback]  = useState(null);

  const [backPressed,   setBackPressed]   = useState(false);
  const [startBounce, pressStart, releaseStart] = useBounce();
  const [, forceUpdate] = useState(0);

  function handleSetTheme(t) {
    setTheme(t); localStorage.setItem(THEME_KEY, t);
    T = buildTheme(resolveTheme(t), accent);
  }
  function handleSetAccent(a) {
    setAccent(a); localStorage.setItem(ACCENT_KEY, a);
    T = buildTheme(resolveTheme(theme), a);
  }
  function handleSaveProfile(name, iconId, bg, iColor) {
    setProfileName(name); setProfileIconId(iconId); setProfileBg(bg); setProfileIColor(iColor);
    localStorage.setItem(PROFILE_NAME_KEY, name); localStorage.setItem(PROFILE_ICON_KEY, iconId);
    localStorage.setItem(PROFILE_BG_KEY, bg);     localStorage.setItem(PROFILE_ICOLOR_KEY, iColor);
  }

  T = buildTheme(resolveTheme(theme), accent);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { T = buildTheme(resolveTheme("system"), accent); forceUpdate(n => n + 1); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, accent]);

  return (
    <>
      <style>{STATIC_STYLES}</style>
      <div style={{ minHeight:"100vh", background:T.bg, transition:"background 0.3s",
        display:"flex", flexDirection:"column" }}>

        {/* Modal at App root — always above everything, never clipped */}
        {showProfile && (
          <ProfileModal name={profileName} iconId={profileIconId} bg={profileBg}
            iconColor={profileIColor} onSave={handleSaveProfile} onClose={() => setShowProfile(false)} />
        )}

        {/* Background gradient tint — light mode only */}
        {T.mode === "light" && false && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0,
            background:`linear-gradient(135deg,${T.accent}11 0%,${T.gradient2}08 30%,transparent 55%)`,
            pointerEvents:"none", zIndex:0 }} />
        )}

        {/* Header */}
        <div style={{ position:"sticky", top:0, zIndex:100,
          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
          background: T.mode==="light" ? "rgba(241,245,249,0.85)" : "rgba(0,0,0,0.85)",
          paddingTop:"env(safe-area-inset-top)" }}>
          <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0.75rem 1rem",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            position:"relative", zIndex:1 }}>

            {screen === "timer" || screen === "history" ? (
              <button
                onPointerDown={() => setBackPressed(true)}
                onPointerUp={() => {
                  setBackPressed(false);
                  if (screen === "history") { setScreen("home"); return; }
                  if (timerDone) { setScreen("home"); setConfig(null); setTimerDone(false); }
                  else document.dispatchEvent(new CustomEvent("tempo-quit"));
                }}
                onPointerLeave={() => setBackPressed(false)}
                onPointerCancel={() => setBackPressed(false)}
                style={{
                width:"44px", height:"44px", borderRadius:"99px",
                background: backPressed ? T.pressBgStrong : T.glassBg,
                backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
                border:"1px solid "+T.glassBorder,
                boxShadow: T.glassShadow,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                transition:"background 0.1s",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.text}
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            ) : (
              <div style={{ width:"44px" }} />
            )}

            <svg width="80" height="28" style={{ overflow:"visible", display:"block" }}>
              <defs>
                <linearGradient id="tempoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={T.accent} />
                  <stop offset="100%" stopColor={T.gradient2} />
                </linearGradient>
              </defs>
              <text x="50%" y="22" textAnchor="middle" fill="url(#tempoGrad)"
                style={{ fontFamily:SYS, fontWeight:700, fontSize:"1.2rem", letterSpacing:"0.02em" }}>
                Temp<tspan fontStyle="italic">o</tspan>
              </text>
            </svg>

            <GlobalNav
              theme={theme} onSetTheme={handleSetTheme}
              accent={accent} onSetAccent={handleSetAccent}
              profileName={profileName} profileIconId={profileIconId}
              profileBg={profileBg} profileIColor={profileIColor}
              onShowProfile={() => setShowProfile(true)}
              soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(s => !s)}
              hapticEnabled={hapticEnabled} onToggleHaptic={() => setHapticEnabled(h => !h)}
              soundPack={soundPack} onSetSoundPack={p => { setSoundPack(p); localStorage.setItem(SOUND_PACK_KEY, p); }}
              onShowHistory={() => setScreen("history")}
              currentScreen={screen} />
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth:"480px", margin:"0 auto", padding:"0 1rem",
          position:"relative", zIndex:1, display:"flex", flexDirection:"column",
          flex:1, minHeight:0, width:"100%" }}>
          {screen === "home"  && <HomeScreen
            settings={workoutSettings}
            onSettingsChange={setWorkoutSettings}
            onStart={() => {}} />}
          {screen === "history" && <HistoryScreen onClose={() => setScreen("home")} />}
          {screen === "timer" && config && <TimerScreen config={config}
            onBack={() => { setScreen("home"); setConfig(null); setTimerDone(false); }}
            onDone={(finishedRounds) => {
              setTimerDone(true);
              const now = new Date();
              const durationSec = workoutStart ? Math.round((now - workoutStart) / 1000) : 0;
              const totalRounds = config.sets * config.exercises;
              saveWorkoutToHistory({
                timestamp: now.toISOString(),
                date: now.toISOString().split('T')[0],
                durationSec,
                sets: config.sets,
                exercises: config.exercises,
                totalRounds,
                completedRounds: finishedRounds,
                skippedRounds: totalRounds - finishedRounds,
              });
            }}
            soundEnabled={soundEnabled}
            hapticEnabled={hapticEnabled}
            soundPack={soundPack}
            onRequestQuit={(cb) => { setQuitCallback(() => cb); setConfirmQuit(true); }}
            onRequestResetWorkout={(cb) => { setQuitCallback(() => cb); setConfirmReset(true); }}
            onRequestSkipAll={(cb) => { setQuitCallback(() => cb); setConfirmSkipAll(true); }} />}
        </div>

        {confirmQuit && <ConfirmModal
          title="QUIT WORKOUT" heading="End this session?"
          body="Your progress won't be saved."
          confirmLabel="End workout"
          onConfirm={() => { setConfirmQuit(false); if (quitCallback) quitCallback(); }}
          onClose={() => setConfirmQuit(false)} />}

        {confirmReset && <ConfirmModal
          title="RESET WORKOUT" heading="Start over?"
          body="This will reset all sets and exercises back to the beginning."
          confirmLabel="Reset workout"
          onConfirm={() => { setConfirmReset(false); if (quitCallback) quitCallback(); }}
          onClose={() => setConfirmReset(false)} />}

        {confirmSkipAll && <ConfirmModal
          title="SKIP TO COOLDOWN" variant="accent-tonal"
          heading="Skip remaining sets?"
          body="Jump straight to the cool down phase."
          confirmLabel="Skip to cool down"
          onConfirm={() => { setConfirmSkipAll(false); if (quitCallback) quitCallback(); }}
          onClose={() => setConfirmSkipAll(false)} />}

        {/* Home screen FAB */}
        {screen === "home" && (
          <div key={screen} style={{
            position:"fixed", bottom:0, left:0, right:0, zIndex:200,
            display:"flex", justifyContent:"center",
            padding:`1rem 2rem calc(2.5rem + env(safe-area-inset-bottom))`,
            background: T.mode==="light"
              ? "linear-gradient(to top, rgba(241,245,249,1) 60%, rgba(241,245,249,0))"
              : "linear-gradient(to top, rgba(0,0,0,1) 60%, rgba(0,0,0,0))",
            pointerEvents:"none",
            animation:"fabPopIn 0.5s cubic-bezier(0.34,1.6,0.64,1) forwards",
          }}>
            <button
              onPointerDown={() => pressStart()}
              onPointerUp={() => {
                releaseStart();
                setTimeout(() => {
                  const { sets, exercises, getReadySec, workoutSec, restSec, coolDownSec } = workoutSettings;
                  setConfig({ sets, exercises, getReadySec, workoutSec, restSec, coolDownSec });
                  setScreen("timer");
                  setTimerDone(false);
                  setWorkoutStart(new Date());
                }, 300);
              }}
              onPointerLeave={() => releaseStart()}
              onPointerCancel={() => releaseStart()}
              style={{
                width:"100%", maxWidth:"250px", height:"52px",
                borderRadius:"99px", border:"none", cursor:"pointer",
                background:`linear-gradient(135deg,${T.accent} 0%,${T.gradient2} 100%)`,
                boxShadow:`0 4px 24px ${T.accent}66`,
                display:"flex", alignItems:"center", justifyContent:"center",
                pointerEvents:"all",
                fontFamily:SYS, fontWeight:600, fontSize:"1rem", color:"white",
                transform: startBounce ? "scale(0.92)" : "scale(1)",
                transition: startBounce
                  ? "transform 0.1s ease-in"
                  : "transform 0.3s cubic-bezier(0.34,2.8,0.64,1)",
              }}>
              Start Workout
            </button>
          </div>
        )}
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
