import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Settings, Music, Zap, Star, AlertTriangle
} from 'lucide-react';
import {
  playTick, playWarning, startAlarm, stopAlarm,
  playDuckQuack, playAirHorn, playLaser, playBuzzer, playFanfare
} from './audio.js';
import './index.css';

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '2m', seconds: 120 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '15m', seconds: 900 },
  { label: '20m', seconds: 1200 },
];

const SOUNDBOARD = [
  { id: 'duck',    label: 'بطة 🦆',    desc: 'Quack!',    fn: playDuckQuack, cls: 'duck-btn',    icon: <span style={{fontSize:'1.8rem'}}>🦆</span> },
  { id: 'horn',    label: 'بوق 📯',    desc: 'Air Horn',   fn: playAirHorn,   cls: 'horn-btn',    icon: <span style={{fontSize:'1.8rem'}}>📯</span> },
  { id: 'laser',   label: 'ليزر ⚡',   desc: 'Pew Pew!',   fn: playLaser,     cls: 'laser-btn',   icon: <span style={{fontSize:'1.8rem'}}>⚡</span> },
  { id: 'buzzer',  label: 'بوق خطأ ❌', desc: 'Wrong!',    fn: playBuzzer,    cls: 'buzzer-btn',  icon: <span style={{fontSize:'1.8rem'}}>❌</span> },
  { id: 'fanfare', label: 'احتفال 🎉',  desc: 'Fanfare!',  fn: playFanfare,   cls: 'fanfare-btn', icon: <span style={{fontSize:'1.8rem'}}>🎉</span> },
];

function pad(n) {
  return String(n).padStart(2, '0');
}

function totalSeconds(h, m, s) {
  return h * 3600 + m * 60 + s;
}

export default function App() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [totalDuration, setTotalDuration] = useState(300);
  const [remaining, setRemaining] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tickEnabled, setTickEnabled] = useState(true);
  const [warningEnabled, setWarningEnabled] = useState(true);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [activePreset, setActivePreset] = useState(1);
  const [activeSoundBtn, setActiveSoundBtn] = useState(null);
  const [warningFired, setWarningFired] = useState(false);

  const appContainerRef = useRef(null);
  const intervalRef = useRef(null);

  // Sync display inputs with remaining time when paused
  const displayH = Math.floor(remaining / 3600);
  const displayM = Math.floor((remaining % 3600) / 60);
  const displayS = remaining % 60;

  const resetTimer = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setIsFinished(false);
    setWarningFired(false);
    stopAlarm();
    const total = totalSeconds(hours, minutes, seconds);
    setTotalDuration(total);
    setRemaining(total);
  }, [hours, minutes, seconds]);

  const startTimer = useCallback(() => {
    if (remaining <= 0) return;
    setIsFinished(false);
    setIsRunning(true);
    stopAlarm();
  }, [remaining]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    clearInterval(intervalRef.current);
  }, []);

  // Main countdown tick
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          setIsFinished(true);
          if (!isMuted && alarmEnabled) startAlarm();
          return 0;
        }

        const next = prev - 1;

        if (!isMuted) {
          if (tickEnabled && next > 0) playTick();
          if (warningEnabled && next === 10) {
            setWarningFired(false);
          }
          if (warningEnabled && next <= 10 && !warningFired) {
            playWarning();
            setWarningFired(true);
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isMuted, tickEnabled, warningEnabled, alarmEnabled, warningFired]);

  // Stop alarm when user unmutes or resets
  useEffect(() => {
    if (isMuted) stopAlarm();
  }, [isMuted]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      appContainerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Apply preset
  const applyPreset = (p, idx) => {
    setActivePreset(idx);
    const h = Math.floor(p.seconds / 3600);
    const m = Math.floor((p.seconds % 3600) / 60);
    const s = p.seconds % 60;
    setHours(h);
    setMinutes(m);
    setSeconds(s);
    setTotalDuration(p.seconds);
    setRemaining(p.seconds);
    setIsRunning(false);
    setIsFinished(false);
    setWarningFired(false);
    stopAlarm();
    clearInterval(intervalRef.current);
  };

  // Handle input change — only when not running
  const handleInputChange = (setter) => (e) => {
    if (isRunning) return;
    const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    setter(val);
  };

  const handleHoursChange = (e) => {
    if (isRunning) return;
    const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
    setHours(val);
  };

  // Update total duration whenever inputs change (when paused)
  useEffect(() => {
    if (!isRunning && !isFinished) {
      const total = totalSeconds(hours, minutes, seconds);
      setTotalDuration(total);
      setRemaining(total);
      setActivePreset(null);
      setWarningFired(false);
    }
  }, [hours, minutes, seconds]);

  // SVG Progress ring
  const RADIUS = 165;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = totalDuration > 0 ? remaining / totalDuration : 1;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const ringColor = remaining === 0
    ? '#ef4444'
    : remaining <= 10
    ? '#ef4444'
    : remaining <= 30
    ? '#f59e0b'
    : '#6366f1';

  const isDanger = remaining <= 10 && remaining > 0;
  const isWarning = remaining > 10 && remaining <= 30;

  const getStatusLabel = () => {
    if (isFinished) return '⏰ انتهى الوقت!';
    if (!isRunning && remaining === totalDuration) return '⏱ جاهز';
    if (isRunning) return '▶ يعدّ...';
    return '⏸ متوقف';
  };

  // Sound FX with visual flash
  const triggerSoundFx = (sfx) => {
    sfx.fn();
    setActiveSoundBtn(sfx.id);
    setTimeout(() => setActiveSoundBtn(null), 300);
  };

  return (
    <div className="app-container" ref={appContainerRef} id="app-root">
      {/* HEADER */}
      <header className="app-header">
        <div className="logo-card" title="شعار المجموعة">
          <img src="/group-logo.png" alt="Group Logo" className="logo-image" />
        </div>

        <div className="title-section">
          <h1>⏳ تايمر المهرجان</h1>
          <p>Scout Festival Timer</p>
        </div>

        <div className="logo-card" title="شعار المهرجان">
          <img src="/festival-logo.jpeg" alt="Festival Logo" className="logo-image" />
        </div>
      </header>

      {/* TIMER CIRCLE */}
      <div className="timer-container">
        <div className={`timer-card ${isDanger ? 'danger-pulse' : ''}`} id="timer-circle">
          {/* SVG Progress Ring */}
          <svg className="progress-ring" viewBox="0 0 380 380">
            {/* Track circle */}
            <circle
              cx="190" cy="190"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="14"
            />
            {/* Animated progress circle */}
            <circle
              className="progress-ring-circle"
              cx="190" cy="190"
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth="14"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={isFinished ? CIRCUMFERENCE : strokeDashoffset}
              style={{ filter: `drop-shadow(0 0 10px ${ringColor}88)` }}
            />
          </svg>

          {/* Digits */}
          <div className="timer-digits">
            <div
              className="time-text"
              style={{ color: isDanger ? '#ef4444' : isWarning ? '#f59e0b' : 'white' }}
            >
              {displayH > 0 ? `${pad(displayH)}:` : ''}{pad(displayM)}:{pad(displayS)}
            </div>
            <div className="status-label">{getStatusLabel()}</div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="controls-row">
          {/* Mute / Unmute */}
          <button
            className={`control-btn btn-utility ${!isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'فعّل الصوت' : 'اكتم الصوت'}
            id="btn-mute"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          {/* Play / Pause */}
          {!isRunning ? (
            <button
              className="control-btn btn-play"
              onClick={startTimer}
              disabled={remaining <= 0}
              id="btn-start"
            >
              <Play size={22} /> ابدأ
            </button>
          ) : (
            <button
              className="control-btn btn-pause"
              onClick={pauseTimer}
              id="btn-pause"
            >
              <Pause size={22} /> وقّف
            </button>
          )}

          {/* Reset */}
          <button
            className="control-btn btn-reset"
            onClick={resetTimer}
            title="إعادة الضبط"
            id="btn-reset"
          >
            <RotateCcw size={20} />
          </button>

          {/* Fullscreen */}
          <button
            className="control-btn btn-utility"
            onClick={toggleFullscreen}
            title="ملء الشاشة"
            id="btn-fullscreen"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      {/* SETUP PANEL */}
      <div className="setup-panel" id="setup-panel">
        <div className="setup-title"><Settings size={14} style={{verticalAlign:'middle', marginRight:'6px'}} /> ضبط الوقت</div>

        {/* Time Inputs */}
        <div className="inputs-row">
          <div className="input-group">
            <div className="input-label">ساعات</div>
            <input
              id="input-hours"
              type="number"
              className="input-box"
              value={pad(hours)}
              min={0} max={23}
              onChange={handleHoursChange}
              disabled={isRunning}
            />
          </div>
          <span className="input-separator">:</span>
          <div className="input-group">
            <div className="input-label">دقائق</div>
            <input
              id="input-minutes"
              type="number"
              className="input-box"
              value={pad(minutes)}
              min={0} max={59}
              onChange={handleInputChange(setMinutes)}
              disabled={isRunning}
            />
          </div>
          <span className="input-separator">:</span>
          <div className="input-group">
            <div className="input-label">ثواني</div>
            <input
              id="input-seconds"
              type="number"
              className="input-box"
              value={pad(seconds)}
              min={0} max={59}
              onChange={handleInputChange(setSeconds)}
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Presets */}
        <div className="presets-grid" id="presets-grid">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              id={`preset-${p.label}`}
              className={`preset-btn ${activePreset === i ? 'active' : ''}`}
              onClick={() => applyPreset(p, i)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM PANELS: Settings + Soundboard */}
      <div className="panels-container">

        {/* Sound Settings Panel */}
        <div className="panel-card" id="settings-panel">
          <div className="setup-title"><Volume2 size={14} style={{verticalAlign:'middle', marginRight:'6px'}} /> إعدادات الصوت</div>

          <div className="switch-container">
            <div className="switch-label">
              <div className="switch-title">⏱ صوت الثانية (Tick)</div>
              <div className="switch-desc">نقرة خفيفة كل ثانية</div>
            </div>
            <label className="switch-input-wrapper">
              <input type="checkbox" className="switch-input" id="toggle-tick" checked={tickEnabled} onChange={e => setTickEnabled(e.target.checked)} />
              <span className="switch-slider" />
            </label>
          </div>

          <div className="switch-container">
            <div className="switch-label">
              <div className="switch-title"><AlertTriangle size={13} style={{verticalAlign:'middle', marginRight:'4px', color:'#f59e0b'}} /> صوت التحذير (&lt;10s)</div>
              <div className="switch-desc">تنبيه مزدوج عند آخر 10 ثواني</div>
            </div>
            <label className="switch-input-wrapper">
              <input type="checkbox" className="switch-input" id="toggle-warning" checked={warningEnabled} onChange={e => setWarningEnabled(e.target.checked)} />
              <span className="switch-slider" />
            </label>
          </div>

          <div className="switch-container">
            <div className="switch-label">
              <div className="switch-title">⏰ صوت الانتهاء (Alarm)</div>
              <div className="switch-desc">نغمة تنبّه عند انتهاء الوقت</div>
            </div>
            <label className="switch-input-wrapper">
              <input type="checkbox" className="switch-input" id="toggle-alarm" checked={alarmEnabled} onChange={e => setAlarmEnabled(e.target.checked)} />
              <span className="switch-slider" />
            </label>
          </div>

          {isFinished && (
            <button
              className="control-btn btn-pause"
              style={{ width: '100%', justifyContent: 'center', borderRadius: '14px' }}
              onClick={stopAlarm}
              id="btn-stop-alarm"
            >
              🔕 إيقاف الإنذار
            </button>
          )}
        </div>

        {/* Soundboard Panel */}
        <div className="panel-card" id="soundboard-panel">
          <div className="setup-title"><Music size={14} style={{verticalAlign:'middle', marginRight:'6px'}} /> لوحة الأصوات المجنونة 🎵</div>
          <div className="soundboard-grid">
            {SOUNDBOARD.map(sfx => (
              <button
                key={sfx.id}
                id={`sfx-${sfx.id}`}
                className={`sound-fx-btn ${sfx.cls} ${activeSoundBtn === sfx.id ? 'active' : ''}`}
                onClick={() => triggerSoundFx(sfx)}
                style={activeSoundBtn === sfx.id ? { transform: 'scale(0.93)', opacity: 0.8 } : {}}
              >
                {sfx.icon}
                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{sfx.label}</span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sfx.desc}</span>
              </button>
            ))}

            {/* Extra: Stop Alarm button in soundboard too */}
            <button
              id="sfx-stop"
              className="sound-fx-btn"
              onClick={stopAlarm}
              style={{ borderColor: 'rgba(239,68,68,0.2)' }}
            >
              <span style={{ fontSize: '1.8rem' }}>🔕</span>
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>إيقاف 🔕</span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Stop Alarm</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
