import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, ArrowRight, Volume2, VolumeX, X } from 'lucide-react';
import './CaseOpeningCinematic.css';

type CinematicScene = 'waking' | 'ringing' | 'clock' | 'incoming' | 'reprimand' | 'briefing' | 'title';

type SceneAsset = {
  src: string;
  alt: string;
  position?: string;
  className?: string;
};

const ASSETS: Record<CinematicScene, SceneAsset> = {
  waking: {
    src: '/cinematic/waking.webp',
    alt: '',
    position: 'center center',
    className: 'lfic-scene-waking',
  },
  ringing: {
    src: '/cinematic/ringing-phone.webp',
    alt: '',
    position: '59% center',
    className: 'lfic-scene-ringing',
  },
  clock: {
    src: '/cinematic/alarm-clock.webp',
    alt: '',
    position: '42% center',
    className: 'lfic-scene-clock',
  },
  incoming: {
    src: '/cinematic/incoming-call.webp',
    alt: '',
    position: '43% center',
    className: 'lfic-scene-incoming',
  },
  reprimand: {
    // The answered-call artwork is shown only once the player answers.
    src: '/cinematic/call-answered.webp',
    alt: '',
    position: 'center center',
    className: 'lfic-scene-reprimand',
  },
  briefing: {
    src: '/cinematic/blinds.webp',
    alt: '',
    position: '52% center',
    className: 'lfic-scene-briefing',
  },
  title: {
    src: '/cinematic/title-card.webp',
    alt: "Liar's Frequency — The Sethi Case — Case 001",
    position: 'center center',
    className: 'lfic-scene-title',
  },
};

const DIALOGUE: Record<'reprimand' | 'briefing', string[]> = {
  reprimand: [
    'Do you have any idea what time it is?',
    "The briefing started at seven. I've been waiting for you.",
  ],
  briefing: [
    "Forget the excuses. We've got a dead man, three suspects, and a story that doesn't add up.",
    'Vikram Sethi. Found dead in his executive office. The scene looks like a burglary, but his valuables were left untouched.',
    "I'll brief you on the suspects. Try to keep up this time, detective.",
  ],
};

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextConstructor();
    }
    return sharedAudioContext;
  } catch {
    return null;
  }
}

/** Call from the Case 001 click handler so browsers can unlock audio in the user gesture. */
export function primeCinematicAudio() {
  const context = getAudioContext();
  if (context?.state === 'suspended') void context.resume().catch(() => undefined);
}

/**
 * Original, procedural noir title cue. It is synthesized locally with Web Audio,
 * so there is no third-party track, licensing dependency, or external download.
 * Returns a cleanup function that fades and stops every oscillator on exit.
 */
export function startNoirTheme(): () => void {
  const context = getAudioContext();
  if (!context) return () => undefined;
  void context.resume().catch(() => undefined);

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.30, context.currentTime + 1.4);
  master.connect(context.destination);

  const lowPass = context.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.setValueAtTime(410, context.currentTime);
  lowPass.Q.setValueAtTime(0.55, context.currentTime);
  lowPass.connect(master);

  const active = new Set<OscillatorNode>();
  let stopped = false;
  let chordIndex = 0;
  let loopId: number | null = null;

  const register = (oscillator: OscillatorNode) => {
    active.add(oscillator);
    oscillator.onended = () => {
      active.delete(oscillator);
      try { oscillator.disconnect(); } catch { /* already disconnected */ }
    };
  };

  // A soft, low analogue hum anchors the score without competing with dialogue.
  [55, 82.41].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 0 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(index === 0 ? 0.095 : 0.045, context.currentTime);
    oscillator.connect(gain);
    gain.connect(lowPass);
    register(oscillator);
    oscillator.start();
  });

  // A slow four-chord minor/noir progression, written for this game.
  const chords = [
    [220, 261.63, 329.63],       // A minor
    [174.61, 220, 261.63],       // F major colour
    [196, 246.94, 293.66],       // G major colour
    [164.81, 196, 246.94],       // E minor colour
  ];
  const playChord = () => {
    if (stopped || context.state === 'closed') return;
    const now = context.currentTime;
    const chord = chords[chordIndex % chords.length];
    chordIndex += 1;
    chord.forEach((frequency, index) => {
      try {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = index === 0 ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, now);
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(index === 0 ? 0.038 : 0.022, now + 0.75);
        envelope.gain.setValueAtTime(index === 0 ? 0.030 : 0.017, now + 1.5);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + 3.35);
        oscillator.connect(envelope);
        envelope.connect(lowPass);
        register(oscillator);
        oscillator.start(now);
        oscillator.stop(now + 3.4);
      } catch {
        // If the browser can't schedule Web Audio, visuals and subtitles still work.
      }
    });
    // A restrained low pulse gives the title card a slow, heartbeat-like rhythm.
    try {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(chords[chordIndex % chords.length][0] / 2, now);
      envelope.gain.setValueAtTime(0.0001, now);
      envelope.gain.exponentialRampToValueAtTime(0.075, now + 0.045);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
      oscillator.connect(envelope);
      envelope.connect(lowPass);
      register(oscillator);
      oscillator.start(now);
      oscillator.stop(now + 1.1);
    } catch {
      // Optional accent.
    }
  };

  playChord();
  loopId = window.setInterval(playChord, 3600);

  return () => {
    if (stopped) return;
    stopped = true;
    if (loopId !== null) window.clearInterval(loopId);
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    window.setTimeout(() => {
      [...active].forEach((oscillator) => {
        try { oscillator.stop(); } catch { /* already stopped */ }
      });
      try { lowPass.disconnect(); master.disconnect(); } catch { /* already disconnected */ }
    }, 380);
  };
}

type Props = {
  reducedMotion: boolean;
  voiceEnabled: boolean;
  musicEnabled: boolean;
  onBegin: () => void;
  onSkip: () => void;
};

export default function CaseOpeningCinematic({ reducedMotion, voiceEnabled, musicEnabled, onBegin, onSkip }: Props) {
  const [scene, setScene] = useState<CinematicScene>('waking');
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [subtitle, setSubtitle] = useState('');
  const [ringing, setRinging] = useState(false);
  const [answerPromptVisible, setAnswerPromptVisible] = useState(false);
  const [beginVisible, setBeginVisible] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const ringIntervalRef = useRef<number | null>(null);
  const activeOscillatorsRef = useRef<Set<OscillatorNode>>(new Set());

  const answerCall = useCallback(() => {
    setRinging(false);
    setAnswerPromptVisible(false);
    setDialogueIndex(0);
    setScene((current) => current === 'incoming' ? 'reprimand' : current);
  }, []);

  const skipToGame = useCallback(() => {
    setRinging(false);
    window.speechSynthesis?.cancel();
    onSkip();
  }, [onSkip]);

  // Preload the supplied artwork so cross-scene cuts never wait on a fresh image request.
  useEffect(() => {
    const preloads = Object.values(ASSETS).map((item) => {
      const image = new window.Image();
      image.src = item.src;
      return image;
    });
    return () => {
      preloads.forEach((image) => { image.onload = null; image.onerror = null; });
    };
  }, []);

  // One explicit scene controller owns all timed transitions.
  useEffect(() => {
    let timer: number | undefined;
    let promptTimer: number | undefined;

    if (scene === 'waking') {
      setSubtitle('');
      timer = window.setTimeout(() => setScene('ringing'), 5000);
    } else if (scene === 'ringing') {
      setRinging(true);
      setSubtitle('');
      timer = window.setTimeout(() => setScene('clock'), 3000);
    } else if (scene === 'clock') {
      setSubtitle('');
      timer = window.setTimeout(() => setScene('incoming'), 3000);
    } else if (scene === 'incoming') {
      setAnswerPromptVisible(false);
      promptTimer = window.setTimeout(() => setAnswerPromptVisible(true), 500);
      timer = window.setTimeout(answerCall, 7000);
    } else if (scene === 'reprimand' || scene === 'briefing') {
      setAnswerPromptVisible(false);
      setSubtitle('');
    } else if (scene === 'title') {
      setSubtitle('');
      setBeginVisible(false);
      timer = window.setTimeout(() => setBeginVisible(true), 5600);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (promptTimer !== undefined) window.clearTimeout(promptTimer);
    };
  }, [scene, answerCall]);

  // Generate a quiet, double-pulse telephone ring with Web Audio so no external asset is needed.
  useEffect(() => {
    if (!ringing || !soundEnabled) return;
    const context = getAudioContext();
    if (!context) return;
    let disposed = false;
    void context.resume().catch(() => undefined);

    const playTone = (frequency: number, startAt: number) => {
      if (disposed) return;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.035, startAt + 0.025);
        gain.gain.setValueAtTime(0.035, startAt + 0.19);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32);
        oscillator.connect(gain);
        gain.connect(context.destination);
        activeOscillatorsRef.current.add(oscillator);
        oscillator.onended = () => {
          activeOscillatorsRef.current.delete(oscillator);
          try { oscillator.disconnect(); gain.disconnect(); } catch { /* already disconnected */ }
        };
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.34);
      } catch {
        // Audio is optional: the visual vibration and subtitle flow still work without it.
      }
    };

    const playPulse = (delay: number) => {
      const startAt = context.currentTime + delay;
      playTone(440, startAt);
      playTone(480, startAt);
    };
    const playCycle = () => {
      if (disposed || context.state === 'closed') return;
      playPulse(0);
      playPulse(0.42);
    };
    playCycle();
    ringIntervalRef.current = window.setInterval(playCycle, 1900);

    return () => {
      disposed = true;
      if (ringIntervalRef.current !== null) window.clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
      for (const oscillator of activeOscillatorsRef.current) {
        try { oscillator.stop(); } catch { /* oscillator has already stopped */ }
      }
      activeOscillatorsRef.current.clear();
    };
  }, [ringing, soundEnabled]);

  // Title score exists only while the title card is shown and sound is enabled.
  useEffect(() => {
    if (scene !== 'title' || !soundEnabled || !musicEnabled) return;
    return startNoirTheme();
  }, [scene, soundEnabled, musicEnabled]);

  // Subtitle timing follows speech synthesis when available, with a deterministic timed fallback.
  useEffect(() => {
    if (scene !== 'reprimand' && scene !== 'briefing') return;
    const lines = DIALOGUE[scene];
    const line = lines[dialogueIndex];
    if (!line) return;

    setSubtitle(line);
    let completed = false;
    let fallbackTimer: number | undefined;
    let advanceTimer: number | undefined;
    let utterance: SpeechSynthesisUtterance | undefined;

    const advance = () => {
      if (completed) return;
      completed = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (advanceTimer !== undefined) window.clearTimeout(advanceTimer);
      advanceTimer = window.setTimeout(() => {
        if (dialogueIndex < lines.length - 1) {
          setDialogueIndex((current) => current + 1);
        } else if (scene === 'reprimand') {
          setDialogueIndex(0);
          setScene('briefing');
        } else {
          setScene('title');
        }
      }, reducedMotion ? 100 : 420);
    };

    const canSpeak = soundEnabled && voiceEnabled && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (canSpeak) {
      window.speechSynthesis.cancel();
      utterance = new SpeechSynthesisUtterance(line);
      utterance.lang = 'en-IN';
      utterance.rate = 0.94;
      utterance.pitch = 1.03;
      utterance.volume = 0.92;
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find((voice) => voice.lang.toLowerCase() === 'en-in' && /female|heera|aarti|priya|neerja|isha/i.test(voice.name))
        ?? voices.find((voice) => voice.lang.toLowerCase() === 'en-in')
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en-') && /female|samantha|aria|zira|karen|moira|tessa|serena/i.test(voice.name))
        ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en-'));
      if (englishVoice) utterance.voice = englishVoice;
      utterance.onend = advance;
      utterance.onerror = advance;
      window.speechSynthesis.speak(utterance);
      fallbackTimer = window.setTimeout(advance, Math.max(5500, 1000 + line.split(/\s+/).length * 360));
    } else {
      fallbackTimer = window.setTimeout(advance, Math.max(2300, 850 + line.split(/\s+/).length * 260));
    }

    return () => {
      completed = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (advanceTimer !== undefined) window.clearTimeout(advanceTimer);
      if (utterance) {
        utterance.onend = null;
        utterance.onerror = null;
        window.speechSynthesis.cancel();
      }
    };
  }, [scene, dialogueIndex, reducedMotion, soundEnabled, voiceEnabled]);

  // Keyboard controls: Escape skips; Enter/Space answers the phone while the prompt is active.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        skipToGame();
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isInteractiveTarget = Boolean(target?.closest('button, a, input, textarea, select, [contenteditable="true"]'));
      if (scene === 'incoming' && !isInteractiveTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        answerCall();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scene, answerCall, skipToGame]);

  // Avoid orphaned timers, speech, or ringtone nodes if the player exits the cinematic.
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    if (ringIntervalRef.current !== null) window.clearInterval(ringIntervalRef.current);
    for (const oscillator of activeOscillatorsRef.current) {
      try { oscillator.stop(); } catch { /* already stopped */ }
    }
    activeOscillatorsRef.current.clear();
    if (sharedAudioContext && sharedAudioContext.state === 'running') {
      void sharedAudioContext.suspend().catch(() => undefined);
    }
  }, []);

  const asset = ASSETS[scene];
  const isDialogue = scene === 'reprimand' || scene === 'briefing';
  const isTitle = scene === 'title';
  const showPhoneAnswer = scene === 'incoming' && answerPromptVisible;

  return (
    <main className={`lf-cinematic ${reducedMotion ? 'lfic-reduced-motion' : ''} ${isTitle ? 'lfic-title-state' : ''}`} aria-label="Case 001 opening cinematic">
      <div className={`lfic-image-layer ${asset.className ?? ''} ${scene === 'ringing' || scene === 'incoming' ? 'lfic-phone-vibrating' : ''}`} key={scene}>
        <img
          className="lfic-scene-image"
          src={asset.src}
          alt={asset.alt}
          draggable={false}
          style={{ objectPosition: asset.position }}
        />
      </div>
      <div className="lfic-vignette" aria-hidden="true" />
      <div className="lfic-film-grain" aria-hidden="true" />
      {isTitle && (
        <div className="lfic-title-effects" aria-hidden="true">
          <span className="lfic-title-backlight" />
          <span className="lfic-title-sweep" />
          <span className="lfic-title-signal-slice lfic-title-signal-slice-one" />
          <span className="lfic-title-signal-slice lfic-title-signal-slice-two" />
          <span className="lfic-title-scanlines" />
        </div>
      )}

      {scene !== 'waking' && (
        <div className="lfic-controls">
          <button className="lfic-control-button" onClick={skipToGame} type="button" aria-label="Skip opening cinematic">
            <span>SKIP INTRO</span><X size={14}/>
          </button>
          <button
            className="lfic-control-button lfic-sound-button"
            onClick={() => setSoundEnabled((current) => !current)}
            type="button"
            aria-pressed={!soundEnabled}
            aria-label={soundEnabled ? 'Mute cinematic sound' : 'Enable cinematic sound'}
          >
            {soundEnabled ? <Volume2 size={15}/> : <VolumeX size={15}/>}
            <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
          </button>
        </div>
      )}

      {showPhoneAnswer && (
        <div className="lfic-answer-area">
          <div className="lfic-incoming-label"><span className="lfic-pulse-dot"/> INCOMING CALL · ANIKA RAO</div>
          <button className="lfic-answer-button" onClick={answerCall} type="button">
            <span className="lfic-answer-icon"><AudioLines size={17}/></span>
            <span>ANSWER CALL</span>
            <span className="lfic-key-hint">ENTER ↵</span>
          </button>
        </div>
      )}

      {isDialogue && subtitle && (
        <div className="lfic-subtitle-wrap" aria-live="polite" aria-atomic="true">
          <div className="lfic-subtitle-speaker">ANIKA RAO <span>· VIDEO CALL</span></div>
          <p className="lfic-subtitle-text">“{subtitle}”</p>
        </div>
      )}

      {isTitle && beginVisible && (
        <button className="lfic-begin-button" onClick={onBegin} type="button">
          <span>BEGIN INVESTIGATION</span><ArrowRight size={17}/>
        </button>
      )}

      <span className="lfic-scene-reader" aria-live="off">
        {scene === 'waking' ? 'Opening scene' : scene === 'ringing' ? 'Phone ringing' : scene === 'clock' ? 'Alarm clock at 7:23 AM' : scene === 'incoming' ? 'Incoming call from Anika Rao' : scene === 'reprimand' ? 'Anika speaks' : scene === 'briefing' ? 'Case briefing' : 'Case 001 title card'}
      </span>
    </main>
  );
}
