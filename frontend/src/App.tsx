import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRight, AudioLines, BadgeCheck,
  Bell, BookOpen, BrainCircuit, BriefcaseBusiness, Check, CheckCheck, ChevronDown,
  CircleHelp, ClipboardList, Clock3, Copy, Eye, FileSearch, Fingerprint, Gavel,
  Headphones, Image as ImageIcon, LockKeyhole, Mic, MicOff, Phone, Play, Radio,
  Search, Send, ShieldAlert, ShieldCheck, Sparkles, UserRound, Volume2, VolumeX, X, Settings, Info,
} from 'lucide-react';
import { apiRequest, apiBase } from './lib/api';
import CaseOpeningCinematic, { primeCinematicAudio, startNoirTheme } from './components/CaseOpeningCinematic';
import VisualNovelGame from './components/VisualNovelGame';
import { evidence as baseEvidence, initialInterviewTranscripts, questionPrompts, starterTranscript, suspects, type ChatLine, type Evidence } from './data/demo';

type Screen = 'briefing' | 'statements' | 'interrogation' | 'evidence' | 'accusation' | 'reveal';
type AppStage = 'menu' | 'archive' | 'cinematic' | 'game';
type MenuPanel = 'settings' | 'about' | 'more' | null;
type ApiInterrogation = { answer: string; unlocked_evidence: string[]; contradiction?: string | null; session_id?: string };
type ScoreResult = { score: number; verdict: string; breakdown: Record<string, number>; explanation: string };

const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

function App() {
  const [appStage, setAppStage] = useState<AppStage>('menu');
  const [menuPanel, setMenuPanel] = useState<MenuPanel>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screen, setScreen] = useState<Screen>('briefing');
  const [activeSuspect, setActiveSuspect] = useState('meera');
  const [lines, setLines] = useState<ChatLine[]>(initialInterviewTranscripts.meera);
  const [question, setQuestion] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [talking, setTalking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [audioPrimed, setAudioPrimed] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>(['E1', 'E2']);
  const [checkedEvidence, setCheckedEvidence] = useState<string[]>([]);
  const [accused, setAccused] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesText, setNotesText] = useState(() => { try { return window.localStorage.getItem('lf-case001-field-notes') ?? ''; } catch { return ''; } });
  const [conversationLogs, setConversationLogs] = useState<Record<string, ChatLine[]>>(initialInterviewTranscripts);
  const [notice, setNotice] = useState('DEMO MODE · LOCAL CASE ENGINE');
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [bolnaConfigured, setBolnaConfigured] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const active = suspects.find((s) => s.id === activeSuspect) ?? suspects[1];
  const visibleEvidence = useMemo(() => baseEvidence.map((item) => ({ ...item, locked: item.locked && !unlocked.includes(item.id) })), [unlocked]);
  const unlockedCount = unlocked.length;

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicSupported(Boolean(SpeechRecognition));
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event: any) => {
        let finalText = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += chunk;
          else interim += chunk;
        }
        setQuestion((current) => (finalText ? `${current ? `${current} ` : ''}${finalText}`.trim() : interim));
      };
      recognition.onerror = () => setTalking(false);
      recognition.onend = () => setTalking(false);
      recognitionRef.current = recognition;
    }
    apiRequest<{ status: string; bolna_configured: boolean }>('/api/bolna/status')
      .then((result) => { setApiOnline(true); setBolnaConfigured(result.bolna_configured); if (result.bolna_configured) setNotice('BOLNA API CONFIGURED · DEMO INTERROGATION ACTIVE'); })
      .catch(() => { setApiOnline(false); });
  }, []);

  const musicShouldPlay = audioPrimed && musicEnabled && appStage !== 'cinematic';
  useEffect(() => {
    if (!musicShouldPlay) return;
    return startNoirTheme();
  }, [musicShouldPlay]);

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [lines, isReplying]);

  useEffect(() => {
    try { window.localStorage.setItem('lf-case001-field-notes', notesText); } catch { /* Notes remain usable for this session when storage is unavailable. */ }
  }, [notesText]);

  useEffect(() => {
    setConversationLogs((current) => ({ ...current, [activeSuspect]: lines }));
  }, [lines, activeSuspect]);

  function primeAppAudio() {
    primeCinematicAudio();
    setAudioPrimed(true);
  }

  function speak(text: string) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = activeSuspect === 'arjun' ? 0.82 : 1;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  async function ask(q: string) {
    const clean = q.trim();
    if (!clean || isReplying) return;
    setInterviewStarted(true);
    setQuestion('');
    setLines((prev) => [...prev, { speaker: 'player', text: clean, time: fmtTime() }]);
    setIsReplying(true);
    let result: ApiInterrogation | null = null;
    try {
      result = await apiRequest<ApiInterrogation>('/api/interrogate', {
        session_id: 'demo-session-001', suspect_id: activeSuspect, question: clean, unlocked_evidence: unlocked,
      });
    } catch {
      result = demoReply(activeSuspect, clean, unlocked);
    }
    window.setTimeout(() => {
      const answer = result!.answer;
      setLines((prev) => [...prev, { speaker: 'suspect', text: answer, time: fmtTime() }]);
      if (result!.unlocked_evidence?.length) {
        setUnlocked((prev) => Array.from(new Set([...prev, ...result!.unlocked_evidence])));
        const newIds = result!.unlocked_evidence.filter((id) => !unlocked.includes(id));
        if (newIds.length) {
          const names = newIds.map((id) => baseEvidence.find((e) => e.id === id)?.title).filter(Boolean).join(', ');
          setLines((prev) => [...prev, { speaker: 'system', text: `EVIDENCE ADDED TO BOARD · ${names}`, time: fmtTime() }]);
        }
      }
      setIsReplying(false);
      speak(answer);
      if (result!.contradiction) setNotice(`CONTRADICTION DETECTED · ${result!.contradiction}`);
      else setNotice('INTERROGATION ACTIVE · STATEMENTS LOGGED');
    }, 420);
  }

  function demoReply(suspectId: string, q: string, currentUnlocked: string[]): ApiInterrogation {
    const text = q.toLowerCase();
    let answer = '';
    let ids: string[] = [];
    let contradiction: string | null = null;
    if (suspectId === 'arjun') {
      if (/access|credential|8:42|executive floor|log|left at 8:45|timeline|movements/.test(text)) {
        answer = 'My badge may have registered on that floor, but it does not prove I was in Vikram’s office. I left around 8:45, as I told the police. If you have a separate witness, I would like to hear what they actually saw.';
        ids = ['E3'];
        contradiction = 'departure time vs. access records';
      } else if (/money|payment|vendor|ledger|fraud|account|finance/.test(text)) {
        answer = 'Vikram and I disagreed about how some vendor payments were categorized. That is an accounting dispute, not a motive for murder. The vendor work was legitimate, and the board had visibility into the expenses.';
        ids = ['E5', 'E8'];
        contradiction = 'denies personal concern about the vendor review';
      } else if (/blue folder|folder/.test(text)) {
        answer = 'I don’t know what you mean by a blue folder. Vikram kept dozens of folders. If Meera brought that up, you should ask her what she believes was inside it.';
        ids = ['E6'];
      } else if (/9:17|call|phone|meera/.test(text)) {
        answer = 'I knew Vikram and Meera spoke often. I did not call her from his phone. I had no reason to handle his personal phone that night.';
        ids = ['E7', 'E9'];
        contradiction = 'call timing conflicts with the accepted death window';
      } else if (/camera|dev|outage|security/.test(text)) {
        answer = 'I was not responsible for the cameras. Dev managed security; you should ask him why that footage is missing. I cannot explain a technical problem in a building I do not manage.';
        ids = ['E4'];
      } else if (/confront|contradiction|lying|truth|prove|witness|8:58/.test(text)) {
        answer = 'You are combining a badge record with an assumption about who used it. I have already told you I left at 8:45. A witness needs to identify me clearly, and your timeline needs to be independently verified.';
        ids = ['E3', 'E2'];
        contradiction = 'Arjun refuses to account for the independent sighting';
      } else {
        answer = 'I understand you are looking for inconsistencies, detective, but I will not speculate. Ask me about my timeline, the vendor payments, the blue folder, or the 9:17 call.';
      }
    } else if (suspectId === 'meera') {
      if (/argument|fight|marriage|divorce/.test(text)) { answer = 'We argued. It was ugly, and I did not want the police turning a private argument into a motive. But I left before eight. I did not go back to the office.'; }
      else if (/call|9:17|phone|what did he say/.test(text)) { answer = 'He said, “The blue folder. Don’t let Arjun see it.” At the time I thought he was frightened about the company accounts. I cannot swear the caller was Vikram now that you are asking me to reconsider it.'; ids = ['E6', 'E7']; }
      else { answer = 'I have told you what I remember. I was home that evening. If you want to know why Vikram was worried about Arjun, you need to examine the company records.'; }
    } else {
      if (/camera|outage|disabled|technical/.test(text)) { answer = 'It was not a technical fault. I disabled the corridor camera manually. I had stepped away from my station for a personal errand and did not want anyone asking questions. I did not touch Vikram, and I did not enter his office.'; ids = ['E4']; }
      else if (/body|discover|10:06|found/.test(text)) { answer = 'I found him at 10:06 during my security round. I called the police immediately. I wish I had reported the camera issue earlier, but I was afraid of losing my job.'; }
      else { answer = 'I can explain the security system and the camera gap. I cannot tell you who killed Vikram because I did not see the attack.'; }
    }
    return { answer, unlocked_evidence: ids.filter((id) => !currentUnlocked.includes(id)), contradiction };
  }

  function startMic() {
    if (!recognitionRef.current) { setNotice('MIC NOT AVAILABLE · TYPE A QUESTION INSTEAD'); return; }
    try { setTalking(true); recognitionRef.current.start(); setNotice('LISTENING · SPEAK YOUR QUESTION'); }
    catch { setTalking(false); setNotice('MIC BUSY · TRY AGAIN'); }
  }

  async function submitAccusation() {
    if (!accused) {
      setNotice('SELECT A SUSPECT BEFORE SUBMITTING YOUR CONCLUSION');
      return;
    }
    if (!checkedEvidence.length) {
      setNotice('SELECT THE EVIDENCE YOU ARE RELYING ON');
      return;
    }
    if (reasoning.trim().split(/\s+/).filter(Boolean).length < 12) {
      setNotice('ADD A REASONED EXPLANATION — A GUESS IS NOT A CASE');
      return;
    }
    const payload = {
      suspect_id: accused,
      evidence_ids: checkedEvidence,
      unlocked_evidence_ids: unlocked,
      reasoning,
    };
    try {
      // The authoritative score stays on the backend; never ship the culprit key
      // in the browser bundle or silently grade an accusation with a spoiler key.
      const result = await apiRequest<ScoreResult>('/api/accuse', payload);
      setScoreResult(result);
      setShowSolution(false);
      setScreen('reveal');
      setNotice('CONCLUSION RECORDED · REVIEW THE RESULT');
    } catch {
      setNotice('SCORING UNAVAILABLE · START THE FASTAPI CASE ENGINE ON PORT 8000');
    }
  }

  function chooseSuspect(suspectId: string) {
    setActiveSuspect(suspectId);
    setLines(conversationLogs[suspectId] ?? initialInterviewTranscripts[suspectId] ?? starterTranscript);
    setQuestion('');
    setInterviewStarted(true);
    setScreen('interrogation');
  }

  function beginInterviews() {
    setActiveSuspect('meera');
    setLines(initialInterviewTranscripts.meera);
    setQuestion('');
    setInterviewStarted(true);
    setScreen('interrogation');
  }

  const navItems: { id: Screen; label: string; icon: typeof Radio; badge?: string }[] = [
    { id: 'briefing', label: 'Case briefing', icon: ClipboardList },
    { id: 'interrogation', label: 'Interrogation', icon: AudioLines, badge: 'LIVE' },
    { id: 'evidence', label: 'Evidence board', icon: Fingerprint, badge: String(unlockedCount).padStart(2, '0') },
    { id: 'accusation', label: 'Final accusation', icon: Gavel },
  ];

  function loadCase001() {
    primeAppAudio();
    setAppStage('cinematic');
    setScreen('briefing');
    setActiveSuspect('meera');
    setLines(initialInterviewTranscripts.meera);
    setQuestion('');
    setIsReplying(false);
    setInterviewStarted(false);
    setUnlocked(['E1', 'E2']);
    setCheckedEvidence([]);
    setAccused('');
    setShowSolution(false);
    setConversationLogs(initialInterviewTranscripts);
    setReasoning('');
    setScoreResult(null);
    setNotice('DEMO MODE · LOCAL CASE ENGINE');
    window.speechSynthesis?.cancel();
  }

  if (appStage === 'cinematic') {
    return (
      <CaseOpeningCinematic
        reducedMotion={reducedMotion}
        voiceEnabled={voiceEnabled}
        musicEnabled={musicEnabled}
        onBegin={() => setAppStage('game')}
        onSkip={() => setAppStage('game')}
      />
    );
  }

  if (appStage === 'menu') {
    return (
      <div className={`lf-shell lf-home-shell ${reducedMotion ? 'lf-reduced-motion' : ''}`}>
        <div className="lf-home-atmosphere" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <span className={`lf-home-dust lf-home-dust-${index + 1}`} key={index} />)}
          <span className="lf-glitch-band lf-glitch-band-1" />
          <span className="lf-glitch-band lf-glitch-band-2" />
          <span className="lf-glitch-band lf-glitch-band-3" />
          <span className="lf-glitch-block lf-glitch-block-1" />
          <span className="lf-glitch-block lf-glitch-block-2" />
        </div>
        <div className="lf-home-reels-plane" aria-hidden="true">
          <span className="lf-tape-reel lf-tape-reel-one">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="presentation">
              <defs>
                <radialGradient id="lf-reel-gold-one" cx="37%" cy="27%" r="82%"><stop offset="0" stopColor="#f7dc99"/><stop offset=".42" stopColor="#d4ad5e"/><stop offset=".78" stopColor="#b18a43"/><stop offset="1" stopColor="#745125"/></radialGradient>
              </defs>
              <ellipse cx="50" cy="51" rx="50" ry="49" fill="#080705" opacity=".9"/>
              <ellipse cx="49" cy="48" rx="48.5" ry="47" fill="url(#lf-reel-gold-one)" stroke="#171007" strokeWidth="4"/>
              <ellipse cx="49" cy="48" rx="43.5" ry="42.5" fill="none" stroke="#f5d893" strokeWidth="1.5" opacity=".8"/>
              <g className="lf-reel-rotor">
                {[0, 72, 144, 216, 288].map((angle) => <g transform={`rotate(${angle} 49 48)`} key={angle}>
                  <path d="M49 12 C56 12 60 17 58 24 L55 33 C53 38 46 38 43 33 L40 24 C38 17 42 12 49 12Z" fill="#0b0905" stroke="#7a5a2b" strokeWidth="1.6"/>
                  <path d="M49 14 L49 31" stroke="#000" strokeWidth="1" opacity=".7"/>
                </g>)}
              </g>
              <ellipse cx="49" cy="48" rx="13.5" ry="13" fill="#a17a39" stroke="#221707" strokeWidth="3"/>
              <ellipse cx="49" cy="48" rx="8.2" ry="8" fill="#e2bd6e" stroke="#5a3c18" strokeWidth="1.8"/>
              <ellipse cx="49" cy="48" rx="3.6" ry="3.5" fill="#120d06"/>
              <path d="M49 41.5 L51 45 L49 48 L46 45Z" fill="#1b1308" opacity=".9"/>
            </svg>
          </span>
          <span className="lf-tape-reel lf-tape-reel-two">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="presentation">
              <defs>
                <radialGradient id="lf-reel-gold-two" cx="35%" cy="24%" r="85%"><stop offset="0" stopColor="#f6d990"/><stop offset=".43" stopColor="#d0a75b"/><stop offset=".8" stopColor="#ad813a"/><stop offset="1" stopColor="#6d4a22"/></radialGradient>
              </defs>
              <ellipse cx="50" cy="51" rx="50" ry="49" fill="#080705" opacity=".95"/>
              <ellipse cx="49" cy="48" rx="48.5" ry="47" fill="url(#lf-reel-gold-two)" stroke="#171007" strokeWidth="4"/>
              <ellipse cx="49" cy="48" rx="43.5" ry="42.5" fill="none" stroke="#f2d18b" strokeWidth="1.4" opacity=".8"/>
              <g className="lf-reel-rotor lf-reel-rotor-reverse">
                {[0, 72, 144, 216, 288].map((angle) => <g transform={`rotate(${angle} 49 48)`} key={angle}>
                  <path d="M49 12 C56 12 60 17 58 24 L55 33 C53 38 46 38 43 33 L40 24 C38 17 42 12 49 12Z" fill="#090805" stroke="#755629" strokeWidth="1.6"/>
                  <path d="M49 14 L49 31" stroke="#000" strokeWidth="1" opacity=".7"/>
                </g>)}
              </g>
              <ellipse cx="49" cy="48" rx="13.5" ry="13" fill="#997137" stroke="#201605" strokeWidth="3"/>
              <ellipse cx="49" cy="48" rx="8.2" ry="8" fill="#e1bc6d" stroke="#503613" strokeWidth="1.8"/>
              <ellipse cx="49" cy="48" rx="3.6" ry="3.5" fill="#110c05"/>
              <path d="M49 41.5 L51 45 L49 48 L46 45Z" fill="#1b1308" opacity=".9"/>
            </svg>
          </span>
          <span className="lf-recorder-led" />
        </div>
        <main className="lf-home-main">
          <section className="lf-home-content" aria-label="Main menu">
            <h1 className="lf-home-title"><span>LIAR'S</span> <em>FREQUENCY</em></h1>
            <div className="lf-home-subtitle">MERIDIAN PRIVATE INVESTIGATIONS</div>
            <div className="lf-home-actions">
              <button className="lf-home-start" onClick={() => { primeAppAudio(); setAppStage('archive'); }}>
                <span>START INVESTIGATION</span><ArrowRight size={18}/>
              </button>
              <nav className="lf-home-secondary" aria-label="Menu options">
                <button onClick={() => setMenuPanel('settings')}><Settings size={15}/><span>SETTINGS</span></button>
                <span className="lf-home-option-divider" aria-hidden="true">/</span>
                <button onClick={() => setMenuPanel('about')}><Info size={15}/><span>ABOUT</span></button>
              </nav>
            </div>
          </section>
        </main>

        {menuPanel && <div className="lf-modal-scrim" onClick={() => setMenuPanel(null)} role="presentation">
          <section className="lf-modal" role="dialog" aria-modal="true" aria-labelledby="lf-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="lf-modal-top"><span className="lf-eyebrow"><span className="lf-eyebrow-line"/> MERIDIAN SYSTEMS</span><button className="lf-modal-close" onClick={() => setMenuPanel(null)} aria-label="Close"><X size={18}/></button></div>
            {menuPanel === 'settings' && <>
              <h2 id="lf-modal-title">Settings<span>.</span></h2>
              <p className="lf-modal-intro">Adjust your experience.</p>
              <div className="lf-setting-row"><span className="lf-setting-icon"><Volume2 size={17}/></span><span className="lf-setting-copy"><strong>Spoken responses</strong><small>Read dialogue aloud in demo mode.</small></span><button className={`lf-toggle ${voiceEnabled ? 'on' : ''}`} aria-pressed={voiceEnabled} onClick={() => setVoiceEnabled((value) => !value)}><span/></button></div>
              <div className="lf-setting-row"><span className="lf-setting-icon"><AudioLines size={17}/></span><span className="lf-setting-copy"><strong>Original noir score</strong><small>Play the original ambient theme after interaction.</small></span><button className={`lf-toggle ${musicEnabled ? 'on' : ''}`} aria-pressed={musicEnabled} onClick={() => setMusicEnabled((value) => !value)}><span/></button></div>
              <div className="lf-setting-row"><span className="lf-setting-icon"><Activity size={17}/></span><span className="lf-setting-copy"><strong>Reduced motion</strong><small>Minimize movement and transitions.</small></span><button className={`lf-toggle ${reducedMotion ? 'on' : ''}`} aria-pressed={reducedMotion} onClick={() => setReducedMotion((value) => !value)}><span/></button></div>
            </>}
            {menuPanel === 'about' && <>
              <h2 id="lf-modal-title">About <em>Liar's Frequency.</em></h2>
              <p className="lf-modal-intro">A voice-first detective thriller. Interrogate suspects, connect conflicting accounts, and solve each case through evidence and reasoning.</p>
              <div className="lf-credit-list">
                <div><span>PROJECT</span><strong>Liar's Frequency</strong></div>
                <div><span>CONCEPT & STORY</span><strong>Liar's Frequency project team</strong></div>
                <div><span>BUILT FOR</span><strong>Bolna Symphony Buildathon</strong></div>
                <div><span>TECHNOLOGY</span><strong>React · TypeScript · FastAPI</strong></div>
                <div><span>VOICE</span><strong>Browser speech demo; Bolna integration planned</strong></div>
              </div>
            </>}
          </section>
        </div>}
      </div>
    );
  }

  if (appStage === 'archive') {
    const upcomingCases = [
      { id: '002', name: 'The Empty Room', type: 'MISSING PERSONS', note: 'Somewhere, one detail does not belong.' },
      { id: '003', name: 'Dead Air', type: 'UNSOLVED TRANSMISSION', note: 'A voice arrives from a place it should not.' },
      { id: '004', name: 'The Glass House', type: 'CORPORATE ESPIONAGE', note: 'Everyone can see. Nobody admits.' },
      { id: '005', name: 'Cold Signal', type: 'CLOSED FILES', note: 'The next clue is still out there.' },
    ];
    return (
      <div className={`lf-shell lf-archive-shell ${reducedMotion ? 'lf-reduced-motion' : ''}`}>
        <div className="lf-grain"/>
        <header className="lf-menu-header">
          <button className="lf-brand" onClick={() => setAppStage('menu')}><span className="lf-brand-mark"><AudioLines size={21}/></span><span className="lf-brand-wording"><strong>LIAR'S <em>FREQUENCY</em></strong><small>MERIDIAN PRIVATE INVESTIGATIONS</small></span></button>
          <button className="lf-back-menu" onClick={() => setAppStage('menu')}><ArrowLeft size={15}/> MAIN MENU</button>
        </header>
        <main className="lf-archive-main">
          <div className="lf-archive-heading"><div><div className="lf-eyebrow"><span className="lf-eyebrow-line"/> MERIDIAN / CLASSIFIED ARCHIVE</div><h1>Choose your <em>case.</em></h1><p>Every file hides a different version of the truth. Only one is ready to open.</p></div><div className="lf-archive-count"><span className="lf-count-big">01</span><span>AVAILABLE<br/>CASE FILE</span></div></div>
          <div className="lf-archive-divider"><span>CASE FILES</span><span>SELECT A FILE TO BEGIN</span></div>
          <div className="lf-case-grid">
            <button className="lf-case-card lf-case-available" onClick={loadCase001}>
              <div className="lf-case-art lf-case-art-001"><div className="lf-case-art-lines"/><div className="lf-case-art-orb"><Fingerprint size={42}/></div><span className="lf-case-number">CASE 001</span><span className="lf-case-status"><span/> AVAILABLE</span><span className="lf-case-art-code">M.I. / 001-A</span></div>
              <div className="lf-case-card-body"><div className="lf-case-card-kicker">HOMICIDE · 20–30 MIN</div><h2>The Last Call<br/><em>at 9:17.</em></h2><p>A founder is dead. Three statements conflict. One call may change everything.</p><div className="lf-case-card-bottom"><span>OPEN CASE FILE</span><ArrowRight size={17}/></div></div>
            </button>
            {upcomingCases.map((item) => <article className="lf-case-card lf-case-locked" key={item.id} aria-label={`Case ${item.id}: more to come`}>
              <div className="lf-case-art lf-case-art-locked"><div className="lf-case-art-lines"/><div className="lf-question-mark">?</div><span className="lf-case-number">CASE {item.id}</span><span className="lf-case-status lf-status-soon"><LockKeyhole size={11}/> IN DEVELOPMENT</span><span className="lf-case-art-code">MERIDIAN / TBA</span></div>
              <div className="lf-case-card-body"><div className="lf-case-card-kicker">{item.type}</div><h2>{item.name}</h2><p>{item.note}</p><div className="lf-case-card-bottom lf-coming-soon"><span><CircleHelp size={14}/> MORE TO COME</span><span className="lf-coming-dots">•••</span></div></div>
            </article>)}
          </div>
          <div className="lf-archive-bottom"><span><LockKeyhole size={13}/> CLASSIFIED CASE ARCHIVE</span><span>01 ACTIVE <i/> 04 MORE TO COME</span><span>NEW FILES WILL APPEAR HERE</span></div>
        </main>
      </div>
    );
  }

  return (
    <VisualNovelGame
      screen={screen}
      setScreen={setScreen}
      onReturnArchive={() => { setAppStage('archive'); window.speechSynthesis?.cancel(); }}
      reducedMotion={reducedMotion}
      activeSuspect={activeSuspect}
      active={active}
      suspects={suspects}
      chooseSuspect={chooseSuspect}
      onBeginInterviews={beginInterviews}
      lines={lines}
      question={question}
      setQuestion={setQuestion}
      isReplying={isReplying}
      ask={ask}
      talking={talking}
      startMic={startMic}
      micSupported={micSupported}
      voiceEnabled={voiceEnabled}
      setVoiceEnabled={setVoiceEnabled}
      visibleEvidence={visibleEvidence}
      unlocked={unlocked}
      unlockedCount={unlockedCount}
      checkedEvidence={checkedEvidence}
      setCheckedEvidence={setCheckedEvidence}
      accused={accused}
      setAccused={setAccused}
      reasoning={reasoning}
      setReasoning={setReasoning}
      submitAccusation={submitAccusation}
      scoreResult={scoreResult}
      showSolution={showSolution}
      setShowSolution={setShowSolution}
      notice={notice}
      apiOnline={apiOnline}
      bolnaConfigured={bolnaConfigured}
      notesOpen={notesOpen}
      setNotesOpen={setNotesOpen}
      notesText={notesText}
      setNotesText={setNotesText}
    />
  );
}

function EvidenceCard({ item, checked, onToggle }: { item: Evidence; checked: boolean; onToggle: () => void }) {
  const icons: Record<string, typeof FileSearch> = { 'Crime scene': ImageIcon, 'Digital record': Activity, 'Witness record': UserRound, 'Security record': ShieldAlert, 'Financial record': BriefcaseBusiness, 'Witness statement': BookOpen, 'Telecom record': Phone, Document: ClipboardList, 'Forensic report': Search };
  const Icon = icons[item.category] ?? FileSearch;
  return <button className={`evidence-card ${checked ? 'is-selected' : ''}`} onClick={onToggle}><div className="evidence-card-top"><span className="evidence-id">{item.id}</span><span className="evidence-category">{item.category}</span><span className={`evidence-select ${checked ? 'checked' : ''}`}>{checked && <Check size={12}/>}</span></div><div className="evidence-preview"><div className={`evidence-glyph ${item.id.toLowerCase()}`}><Icon size={27}/><span>{item.id} / ARCHIVE</span></div><div className="evidence-scanline"/></div><div className="evidence-card-copy"><h3>{item.title}</h3><p>{item.summary}</p></div><div className="evidence-card-footer"><span><LockKeyhole size={12}/> VERIFIED CASE MATERIAL</span><span>{checked ? 'SELECTED' : 'ADD TO THEORY'}</span></div></button>;
}

export default App;
