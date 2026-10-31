import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  ArrowLeft, ArrowRight, AudioLines, BookOpen, Check, ChevronRight, FileText,
  History, LockKeyhole, Mic, MicOff, NotebookPen, Send, ShieldAlert, Volume2,
  VolumeX, X,
} from 'lucide-react';
import { questionPrompts, type ChatLine, type Evidence, type Suspect } from '../data/demo';
import { apiRequest } from '../lib/api';
import './VisualNovelGame.css';

type Screen = 'briefing' | 'statements' | 'interrogation' | 'evidence' | 'accusation' | 'reveal';
type CanonicalReveal = { headline: string; summary: string; timeline: { time: string; event: string }[] };
type AccusationScore = { score: number; verdict: string; breakdown: Record<string, number>; explanation: string };

type Props = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  onReturnArchive: () => void;
  reducedMotion: boolean;
  activeSuspect: string;
  active: Suspect;
  suspects: Suspect[];
  chooseSuspect: (id: string) => void;
  onBeginInterviews: () => void;
  lines: ChatLine[];
  question: string;
  setQuestion: Dispatch<SetStateAction<string>>;
  isReplying: boolean;
  ask: (question: string) => Promise<void> | void;
  talking: boolean;
  startMic: () => void;
  micSupported: boolean;
  voiceEnabled: boolean;
  setVoiceEnabled: Dispatch<SetStateAction<boolean>>;
  visibleEvidence: Evidence[];
  unlocked: string[];
  unlockedCount: number;
  checkedEvidence: string[];
  setCheckedEvidence: Dispatch<SetStateAction<string[]>>;
  accused: string;
  setAccused: Dispatch<SetStateAction<string>>;
  reasoning: string;
  setReasoning: Dispatch<SetStateAction<string>>;
  submitAccusation: () => Promise<void> | void;
  scoreResult: AccusationScore | null;
  showSolution: boolean;
  setShowSolution: Dispatch<SetStateAction<boolean>>;
  notice: string;
  apiOnline: boolean | null;
  bolnaConfigured: boolean;
  notesOpen: boolean;
  setNotesOpen: Dispatch<SetStateAction<boolean>>;
  notesText: string;
  setNotesText: Dispatch<SetStateAction<string>>;
};

const CASE_ART = '/visual-novel/case001';
const SCENE_ART = {
  office: `${CASE_ART}/scenes/sethi-executive-office.png`,
  corridor: `${CASE_ART}/scenes/executive-corridor-cctv.png`,
  security: `${CASE_ART}/scenes/security-monitoring-room.png`,
};
const CHARACTER_ART = {
  anika: `${CASE_ART}/characters/anika-rao.png`,
  meeraGuarded: `${CASE_ART}/characters/meera-sethi-guarded.png`,
  meeraDefensive: `${CASE_ART}/characters/meera-sethi-defensive.png`,
  arjunComposed: `${CASE_ART}/characters/arjun-malhotra-composed.png`,
  arjunCornered: `${CASE_ART}/characters/arjun-malhotra-cornered.png`,
  devNervous: `${CASE_ART}/characters/dev-bhatia-nervous.png`,
  devAdmitting: `${CASE_ART}/characters/dev-bhatia-admitting.png`,
  vikram: `${CASE_ART}/characters/vikram-sethi.png`,
};

function resolveScene(screen: Screen, activeSuspect: string, focusedEvidenceId: string | null, showSolution: boolean, statementSuspectId: string) {
  if (screen === 'briefing') return { src: SCENE_ART.office, alt: "Vikram Sethi's executive office at night", label: 'THE SETHI CASE · BRIEFING', position: 'center center' };
  const sceneSuspect = screen === 'statements' ? statementSuspectId : activeSuspect;
  if (screen === 'statements' || screen === 'interrogation') {
    if (sceneSuspect === 'dev') return { src: SCENE_ART.security, alt: 'The building security monitoring room', label: screen === 'statements' ? 'INITIAL ACCOUNT · DEV BHATIA' : 'SECURITY INTERVIEW · DEV BHATIA', position: 'center center' };
    if (sceneSuspect === 'arjun') return { src: SCENE_ART.corridor, alt: 'The executive corridor and its CCTV blind spot', label: screen === 'statements' ? 'INITIAL ACCOUNT · ARJUN MALHOTRA' : 'EXECUTIVE FLOOR · ARJUN MALHOTRA', position: 'center center' };
    return { src: SCENE_ART.office, alt: "Vikram Sethi's executive office", label: screen === 'statements' ? 'INITIAL ACCOUNT · MEERA SETHI' : 'PRIVATE INTERVIEW · MEERA SETHI', position: 'center center' };
  }
  if (screen === 'evidence') {
    if (focusedEvidenceId === 'E2' || focusedEvidenceId === 'E3') return { src: SCENE_ART.corridor, alt: 'The executive corridor CCTV blind spot', label: 'EVIDENCE REVIEW · ACCESS & MOVEMENTS', position: 'center center' };
    if (focusedEvidenceId === 'E4') return { src: SCENE_ART.security, alt: 'The security monitoring room', label: 'EVIDENCE REVIEW · CAMERA LOG', position: 'center center' };
    return { src: SCENE_ART.office, alt: "Vikram Sethi's executive office", label: 'FIELD FILE · EVIDENCE', position: 'center center' };
  }
  if (screen === 'accusation') return { src: `${CASE_ART}/evidence/vendor-payment-ledger.png`, alt: 'Vendor payment ledger under an amber desk light', label: 'FINAL REVIEW · THE THEORY', position: 'center center' };
  return { src: SCENE_ART.office, alt: "The Sethi executive office after the investigation", label: showSolution ? 'CASE CONCLUSION · SEALED TRUTH OPENED' : 'CASE CONCLUSION · MERIDIAN REVIEW', position: 'center center' };
}

function resolveCharacter(screen: Screen, activeSuspect: string, unlocked: string[], lines: ChatLine[], showSolution: boolean, statementSuspectId: string) {
  if (screen === 'briefing') return { src: CHARACTER_ART.anika, alt: 'Anika Rao, the lead detective’s investigative partner', name: 'ANIKA RAO', role: 'YOUR PARTNER' };
  if (screen === 'reveal' && showSolution) return { src: CHARACTER_ART.arjunCornered, alt: 'Arjun Malhotra, visibly cornered', name: 'ARJUN MALHOTRA', role: 'THE STORY BREAKS' };
  if (screen === 'statements') {
    if (statementSuspectId === 'meera') return { src: CHARACTER_ART.meeraGuarded, alt: 'Meera Sethi giving her initial statement', name: 'MEERA SETHI', role: 'INITIAL STATEMENT · WITNESS' };
    if (statementSuspectId === 'arjun') return { src: CHARACTER_ART.arjunComposed, alt: 'Arjun Malhotra giving his initial statement', name: 'ARJUN MALHOTRA', role: 'INITIAL STATEMENT · CFO' };
    return { src: CHARACTER_ART.devNervous, alt: 'Dev Bhatia giving his initial statement', name: 'DEV BHATIA', role: 'INITIAL STATEMENT · SECURITY' };
  }
  if (screen !== 'interrogation') return null;
  const admittedCamera = lines.some((line) => /disabled the corridor camera|manual(?:ly)?\s+shutdown|was not a technical fault/i.test(line.text)) || unlocked.includes('E4');
  const admittedArgument = lines.some((line) => /we argued|it was ugly|marital conflict/i.test(line.text)) || unlocked.includes('E6');
  const arjunPressed = unlocked.includes('E3') || unlocked.includes('E5');
  if (activeSuspect === 'meera') return { src: admittedArgument ? CHARACTER_ART.meeraDefensive : CHARACTER_ART.meeraGuarded, alt: admittedArgument ? 'Meera Sethi, defensive during questioning' : 'Meera Sethi, guarded during questioning', name: 'MEERA SETHI', role: admittedArgument ? 'DEFENSIVE · STATEMENT REVISED' : 'WITNESS · CORPORATE LAWYER' };
  if (activeSuspect === 'dev') return { src: admittedCamera ? CHARACTER_ART.devAdmitting : CHARACTER_ART.devNervous, alt: admittedCamera ? 'Dev Bhatia admitting he disabled the camera' : 'Dev Bhatia, nervous during questioning', name: 'DEV BHATIA', role: admittedCamera ? 'ADMISSION · CAMERA OUTAGE' : 'WITNESS · SECURITY SUPERVISOR' };
  return { src: arjunPressed ? CHARACTER_ART.arjunCornered : CHARACTER_ART.arjunComposed, alt: arjunPressed ? 'Arjun Malhotra, cornered by the evidence' : 'Arjun Malhotra, composed during questioning', name: 'ARJUN MALHOTRA', role: arjunPressed ? 'UNDER PRESSURE' : 'SUSPECT · CHIEF FINANCIAL OFFICER' };
}

const NAV: { id: Screen; label: string; index: string }[] = [
  { id: 'briefing', label: 'Premise', index: '01' },
  { id: 'statements', label: 'Statements', index: '02' },
  { id: 'interrogation', label: 'Interviews', index: '03' },
  { id: 'evidence', label: 'Evidence', index: '04' },
  { id: 'accusation', label: 'Accuse', index: '05' },
];

function speakerName(line: ChatLine, active: Suspect) {
  if (line.speaker === 'player') return 'YOU';
  if (line.speaker === 'suspect') return active.name.toUpperCase();
  if (line.speaker === 'system') return 'CASE NOTE';
  return 'ANIKA RAO';
}

export default function VisualNovelGame(props: Props) {
  const {
    screen, setScreen, onReturnArchive, reducedMotion, activeSuspect, active, suspects, chooseSuspect, onBeginInterviews,
    lines, question, setQuestion, isReplying, ask, talking, startMic, micSupported, voiceEnabled,
    setVoiceEnabled, visibleEvidence, unlocked, unlockedCount, checkedEvidence, setCheckedEvidence,
    accused, setAccused, reasoning, setReasoning, submitAccusation, scoreResult, showSolution,
    setShowSolution, notice, apiOnline, bolnaConfigured, notesOpen, setNotesOpen, notesText, setNotesText,
  } = props;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [askOwnOpen, setAskOwnOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [transitionOn, setTransitionOn] = useState(false);
  const [focusedEvidence, setFocusedEvidence] = useState<string | null>(null);
  const [canonicalReveal, setCanonicalReveal] = useState<CanonicalReveal | null>(null);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState('');
  const [statementSuspectId, setStatementSuspectId] = useState('meera');
  const [reviewedStatements, setReviewedStatements] = useState<string[]>([]);
  const previousScreen = useRef<Screen | null>(null);
  const focusedEvidenceItem = visibleEvidence.find((item) => item.id === focusedEvidence) ?? visibleEvidence[0];
  const scene = resolveScene(screen, activeSuspect, focusedEvidenceItem?.id ?? null, showSolution, statementSuspectId);
  const character = resolveCharacter(screen, activeSuspect, unlocked, lines, showSolution, statementSuspectId);
  const currentStatementSuspect = suspects.find((suspect) => suspect.id === statementSuspectId) ?? suspects[0];
  const allStatementsReviewed = suspects.every((suspect) => reviewedStatements.includes(suspect.id));
  const focusedEvidenceArt = focusedEvidenceItem?.image ? { src: focusedEvidenceItem.image, alt: focusedEvidenceItem.imageAlt ?? focusedEvidenceItem.title } : undefined;
  const conversation = lines.filter((line) => line.speaker !== 'system');
  const latest = conversation[conversation.length - 1];
  const latestSystem = lines[lines.length - 1]?.speaker === 'system' ? lines[lines.length - 1] : undefined;
  const selectedEvidence = useMemo(() => visibleEvidence.filter((item) => checkedEvidence.includes(item.id)), [visibleEvidence, checkedEvidence]);
  const reasoningWordCount = reasoning.trim() ? reasoning.trim().split(/\s+/).filter(Boolean).length : 0;
  const canSubmitAccusation = Boolean(accused && checkedEvidence.length > 0 && reasoningWordCount >= 12);
  const canMakeFormalAccusation = unlockedCount >= 5;

  useEffect(() => {
    if (previousScreen.current === null) {
      previousScreen.current = screen;
      return;
    }
    if (previousScreen.current !== screen && !reducedMotion) {
      setTransitionOn(true);
      const timer = window.setTimeout(() => setTransitionOn(false), 460);
      previousScreen.current = screen;
      return () => window.clearTimeout(timer);
    }
    previousScreen.current = screen;
  }, [screen, reducedMotion]);

  useEffect(() => {
    if (screen !== 'interrogation') {
      setHistoryOpen(false);
      setAskOwnOpen(false);
    }
    if (screen !== 'reveal') setShowBreakdown(false);
  }, [screen]);

  function readInitialStatement() {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentStatementSuspect.initialStatement.replace(/[“”]/g, ''));
    utterance.rate = 0.91;
    utterance.pitch = statementSuspectId === 'arjun' ? 0.84 : statementSuspectId === 'dev' ? 0.92 : 1.02;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  }

  function toggleEvidence(id: string) {
    if (!unlocked.includes(id)) return;
    setCheckedEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setFocusedEvidence(id);
  }

  async function unsealTruth() {
    setSolutionError('');
    if (canonicalReveal) { setShowSolution(true); return; }
    setSolutionLoading(true);
    try {
      const reveal = await apiRequest<CanonicalReveal>('/api/reveal');
      setCanonicalReveal(reveal);
      setShowSolution(true);
    } catch {
      setSolutionError('The canonical reveal needs the local FastAPI case engine. Start the backend, then try again.');
    } finally {
      setSolutionLoading(false);
    }
  }

  const quickPrompts = activeSuspect === 'meera'
    ? [
      { label: 'The argument', text: 'Tell me about the argument with Vikram.', category: 'argument' },
      { label: 'The 9:17 call', text: 'What exactly did the caller say at 9:17?', category: 'call' },
      { label: 'The blue folder', text: 'What did you mean by the blue folder?', category: 'folder' },
      { label: 'The accounts', text: 'What did Vikram tell you about the company accounts?', category: 'accounts' },
    ]
    : activeSuspect === 'dev'
      ? [
        { label: 'The camera gap', text: 'Why did the corridor camera go offline?', category: 'camera' },
        { label: 'Finding the body', text: 'When and how did you discover Vikram?', category: 'body' },
        { label: 'Arjun’s access', text: 'What can you tell me about Arjun’s access to the executive floor?', category: 'access' },
        { label: 'Your timeline', text: 'Walk me through your shift timeline.', category: 'timeline' },
      ]
      : [questionPrompts[0], questionPrompts[1], questionPrompts[2], questionPrompts[4]];

  return (
    <div className={`vn-game ${reducedMotion ? 'vn-reduced-motion' : ''}`}>
      <div className="vn-world" key={scene.src}>
        <img className="vn-world-art" src={scene.src} alt={scene.alt} style={{ objectPosition: scene.position ?? 'center' }} />
        <div className={`vn-world-shade vn-shade-${screen}`} aria-hidden="true" />
        <div className="vn-world-grain" aria-hidden="true" />
      </div>
      {transitionOn && <div className="vn-seam-cut" aria-hidden="true" />}

      {character && <div className={`vn-character-layer vn-character-${screen} ${screen === 'reveal' ? 'vn-character-reveal-open' : ''}`} aria-label={`${character.name}, ${character.role}`}>
        <img className="vn-character-art" src={character.src} alt={character.alt} />
        <div className="vn-character-nameplate"><strong>{character.name}</strong><span>{character.role}</span></div>
      </div>}

      <header className="vn-hud">
        <button className="vn-archive-link" onClick={onReturnArchive}><ArrowLeft size={15} /> ARCHIVE</button>
        <div className="vn-case-stamp"><span>MERIDIAN PRIVATE INVESTIGATIONS</span><strong>CASE 001 <i>/</i> THE SETHI CASE</strong></div>
        <div className="vn-hud-tools">
          <button onClick={() => setNotesOpen(true)} aria-label="Open field notes"><NotebookPen size={16}/><span>NOTES</span></button>
          <button onClick={() => setVoiceEnabled((value) => !value)} aria-label={voiceEnabled ? 'Mute spoken dialogue' : 'Enable spoken dialogue'}>{voiceEnabled ? <Volume2 size={16}/> : <VolumeX size={16}/>}<span>{voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}</span></button>
        </div>
      </header>

      <div className="vn-scene-stamp"><span className="vn-gold-line"/>{scene.label}<span className="vn-scene-dot"/></div>

      {screen === 'briefing' && (
        <main className="vn-briefing-stage vn-lower-stage">
          <section className="vn-dialogue-box vn-briefing-dialogue" aria-label="Case premise">
            <div className="vn-speaker-line"><span className="vn-speaker-mark">AR</span><div><strong>ANIKA RAO</strong><small>YOUR PARTNER · CASE BRIEFING</small></div><span className="vn-dialogue-count">CASE 001 / 01</span></div>
            <div className="vn-victim-strip"><img src={CHARACTER_ART.vikram} alt="Vikram Sethi, the victim"/><span><small>THE VICTIM</small><strong>VIKRAM SETHI</strong><em>38 · FOUNDER, SETHI DYNAMICS</em></span></div>
            <h1 className="vn-premise-title">The Last Call <em>at 9:17.</em></h1>
            <p className="vn-dialogue-text">“At 10:06 last night, security supervisor Dev Bhatia found Vikram Sethi dead inside his locked executive office on the seventeenth floor. The room looked ransacked, but his wallet, laptop and expensive watch were left behind. Nothing obvious had been stolen.”</p>
            <p className="vn-dialogue-text vn-premise-secondary">“There is one detail the police cannot reconcile. Vikram’s wife, Meera, says he called her at 9:17 PM and sounded frightened. The call lasted 46 seconds. If that was Vikram, it changes the timeline. If it wasn't, someone wanted us to believe it was.”</p>
            <div className="vn-premise-facts">
              <div><small>BODY DISCOVERED</small><strong>10:06 PM</strong><span>Locked executive office</span></div>
              <div><small>THE CALL</small><strong>9:17 PM</strong><span>46 seconds · caller unverified</span></div>
              <div><small>THREE ACCOUNTS</small><strong>Not aligned</strong><span>Wife · CFO · Security</span></div>
            </div>
            <div className="vn-premise-assignment"><strong>YOUR ASSIGNMENT</strong><span>Find out whose account conflicts with the records, who had a reason to silence Vikram, and what the 9:17 call actually proves. These are starting claims — not established facts.</span></div>
            <button className="vn-solid-action vn-premise-continue" onClick={() => setScreen('statements')}>READ THE THREE INITIAL STATEMENTS <ArrowRight size={15}/></button>
          </section>
        </main>
      )}

      {screen === 'statements' && (
        <main className="vn-statements-stage">
          <section className="vn-statements-panel" aria-label="Initial suspect statements">
            <div className="vn-section-kicker"><span>CASE 001 / FIRST ACCOUNTS</span><span>{reviewedStatements.length} OF 3 READ</span></div>
            <h1>Three people. <em>Three stories.</em></h1>
            <p className="vn-section-intro">Before you question anyone, hear the account each person gave. These are their claims, not verified facts.</p>
            <div className="vn-statement-tabs" role="tablist" aria-label="Suspect statements">
              {suspects.map((suspect, index) => (
                <button key={suspect.id} role="tab" aria-selected={statementSuspectId === suspect.id} className={statementSuspectId === suspect.id ? 'active' : ''} onClick={() => setStatementSuspectId(suspect.id)}>
                  <span>0{index + 1}</span><strong>{suspect.name}</strong><small>{reviewedStatements.includes(suspect.id) ? 'READ' : 'UNREAD'}</small>
                </button>
              ))}
            </div>
            <article className="vn-statement-card" aria-live="polite">
              <div className="vn-statement-card-kicker"><span>RECORDED STATEMENT</span><span>{currentStatementSuspect.role.toUpperCase()}</span></div>
              <button className="vn-play-statement" onClick={readInitialStatement} disabled={!voiceEnabled} title={voiceEnabled ? 'Read this statement aloud' : 'Enable voice from the top bar to hear statements'}><Volume2 size={13}/> {voiceEnabled ? 'PLAY STATEMENT' : 'VOICE MUTED'}</button>
              <blockquote>{currentStatementSuspect.initialStatement}</blockquote>
              <div className="vn-statement-caution">This is {currentStatementSuspect.name.split(' ')[0]}’s version of events. It has not yet been corroborated.</div>
              <div className="vn-statement-actions">
                <button className="vn-outline-action" onClick={() => setReviewedStatements((current) => current.includes(statementSuspectId) ? current : [...current, statementSuspectId])}>
                  <Check size={14}/>{reviewedStatements.includes(statementSuspectId) ? 'STATEMENT READ' : 'MARK AS READ'}
                </button>
                <button className="vn-solid-action" onClick={() => {
                  const next = suspects.find((suspect) => !reviewedStatements.includes(suspect.id) && suspect.id !== statementSuspectId);
                  if (next) setStatementSuspectId(next.id);
                  else if (allStatementsReviewed || reviewedStatements.includes(statementSuspectId)) onBeginInterviews();
                }} disabled={!allStatementsReviewed && !reviewedStatements.includes(statementSuspectId)}>
                  {allStatementsReviewed ? 'BEGIN INTERVIEWS' : 'NEXT STATEMENT'} <ArrowRight size={15}/>
                </button>
              </div>
            </article>
            <div className="vn-statement-footer"><span>Read each account before starting the interviews.</span><button className="vn-text-action" onClick={() => setScreen('briefing')}><ArrowLeft size={14}/> BACK TO CASE PREMISE</button></div>
          </section>
        </main>
      )}

      {screen === 'interrogation' && (
        <main className="vn-interrogation-stage">
          <div className="vn-suspect-switcher vn-suspect-switcher-compact" aria-label="Choose suspect">
            <span className="vn-interview-label">ON THE LINE</span>
            <select value={activeSuspect} onChange={(event) => chooseSuspect(event.target.value)} aria-label="Choose a suspect to interview">
              {suspects.map((suspect) => <option key={suspect.id} value={suspect.id}>{suspect.name}</option>)}
            </select>
            <button className="vn-history-button" onClick={() => setHistoryOpen((open) => !open)}><History size={14}/> HISTORY</button>
          </div>

          {historyOpen && <aside className="vn-history-panel" aria-label="Conversation history">
            <div className="vn-history-head"><span>INTERVIEW HISTORY</span><button onClick={() => setHistoryOpen(false)} aria-label="Close history"><X size={15}/></button></div>
            <div className="vn-history-scroll">{conversation.map((line, index) => <div key={`${line.time}-${index}`} className={`vn-history-line ${line.speaker}`}><small>{line.speaker === 'player' ? 'YOU' : line.speaker === 'suspect' ? active.name.toUpperCase() : 'ANIKA RAO'} · {line.time}</small><p>{line.text}</p></div>)}</div>
          </aside>}

          <section className="vn-dialogue-box vn-interview-dialogue" aria-label="Current dialogue">
            <div className="vn-dialogue-topline"><div className="vn-speaker-line"><span className={`vn-speaker-mark ${latest?.speaker === 'suspect' ? 'vn-mark-suspect' : ''}`}>{latest?.speaker === 'suspect' ? active.initials : latest?.speaker === 'player' ? 'YOU' : 'AR'}</span><div><strong>{latest ? speakerName(latest, active) : active.name.toUpperCase()}</strong><small>{latest?.speaker === 'player' ? 'YOUR QUESTION' : latest?.speaker === 'suspect' ? 'SUSPECT STATEMENT' : 'CASE GUIDANCE'}</small></div></div><span className="vn-dialogue-count">{unlockedCount} CLUES LOGGED</span></div>
            <p className="vn-dialogue-text">{isReplying ? `${active.name} is considering your question…` : (latest?.text ?? 'Choose a question to begin the interview.')}</p>
            {latestSystem && <div className="vn-discovery-note"><AudioLines size={13}/><span>{latestSystem.text.replace('EVIDENCE ADDED TO BOARD · ', 'NEW EVIDENCE · ')}</span></div>}
            <div className="vn-question-choices"><span className="vn-choice-label">WHAT DO YOU ASK?</span><div>{quickPrompts.map((prompt, index) => <button key={prompt.category} disabled={isReplying} onClick={() => void ask(prompt.text)}><span>0{index + 1}</span>{prompt.label}<ChevronRight size={14}/></button>)}</div></div>
            <button className="vn-ask-own-toggle" onClick={() => setAskOwnOpen((open) => !open)}>{askOwnOpen ? '− CLOSE CUSTOM QUESTION' : '+ ASK YOUR OWN QUESTION'}</button>
            {askOwnOpen && <form className="vn-question-form" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
              <button type="button" className={`vn-mic-button ${talking ? 'listening' : ''}`} onClick={startMic} disabled={!micSupported} aria-label={micSupported ? 'Speak a question' : 'Microphone input not supported'}>{talking ? <Mic size={17}/> : micSupported ? <Mic size={17}/> : <MicOff size={17}/>}</button>
              <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask in your own words…" aria-label="Your question" />
              <button className="vn-send-button" type="submit" disabled={!question.trim() || isReplying}><Send size={16}/><span>ASK</span></button>
            </form>}
            <div className="vn-quiet-status"><span className={`vn-status-led ${apiOnline ? 'online' : ''}`}/>{apiOnline ? 'CASE ENGINE CONNECTED' : 'LOCAL CASE MODE'}<span className="vn-status-divider">/</span>{notice.includes('CONTRADICTION') ? notice.replace('CONTRADICTION DETECTED · ', '') : 'Statements are logged automatically.'}</div>
          </section>
        </main>
      )}

      {screen === 'evidence' && (
        <main className="vn-evidence-stage">
          <section className="vn-evidence-paper">
            <div className="vn-section-kicker"><span>FIELD FILE / 001</span><span>{unlockedCount} OF 9 DISCOVERED</span></div>
            <h1>What can be <em>proven?</em></h1>
            <p className="vn-section-intro">Select evidence you intend to rely on. An item is not proof of guilt until you explain what it establishes.</p>
            <div className="vn-evidence-layout">
              <div className="vn-evidence-list" role="list" aria-label="Discovered evidence">
                {visibleEvidence.filter((item) => !item.locked).map((item) => <button key={item.id} className={`vn-evidence-row ${focusedEvidenceItem?.id === item.id ? 'focused' : ''} ${checkedEvidence.includes(item.id) ? 'selected' : ''}`} onClick={() => setFocusedEvidence(item.id)}>
                  <span className="vn-evidence-row-id">{item.id}</span><span className="vn-evidence-row-title"><strong>{item.title}</strong><small>{item.category}</small></span><span className="vn-evidence-row-status">{checkedEvidence.includes(item.id) ? 'IN THEORY' : 'VIEW'}</span>
                </button>)}
                {visibleEvidence.filter((item) => !item.locked).length === 0 && <p className="vn-no-evidence">No clues discovered yet. Interrogate a suspect to open the file.</p>}
              </div>
              {focusedEvidenceItem && <article className="vn-evidence-detail"><div className="vn-evidence-detail-id">{focusedEvidenceItem.id} / {focusedEvidenceItem.category.toUpperCase()}</div>{focusedEvidenceArt && <figure className="vn-evidence-art-frame"><img src={focusedEvidenceArt.src} alt={focusedEvidenceArt.alt} loading="lazy"/><figcaption>MERIDIAN EVIDENCE PHOTOGRAPH · {focusedEvidenceItem.id}</figcaption></figure>}<h2>{focusedEvidenceItem.title}</h2><p>{focusedEvidenceItem.summary}</p><button className={`vn-outline-action ${checkedEvidence.includes(focusedEvidenceItem.id) ? 'selected' : ''}`} onClick={() => toggleEvidence(focusedEvidenceItem.id)}><Check size={14}/>{checkedEvidence.includes(focusedEvidenceItem.id) ? 'REMOVE FROM THEORY' : 'ADD TO THEORY'}</button></article>}
            </div>
            <div className="vn-evidence-footer"><span>{canMakeFormalAccusation ? `${selectedEvidence.length} item${selectedEvidence.length === 1 ? '' : 's'} selected for your theory` : `Discover ${5 - unlockedCount} more clue${5 - unlockedCount === 1 ? '' : 's'} before a formal accusation.`}</span><button className="vn-solid-action" disabled={!canMakeFormalAccusation} onClick={() => setScreen('accusation')}>BUILD YOUR ACCUSATION <ArrowRight size={15}/></button></div>
          </section>
        </main>
      )}

      {screen === 'accusation' && (
        <main className="vn-accusation-stage">
          <section className="vn-accusation-paper">
            <div className="vn-section-kicker"><span>FINAL REVIEW / CASE 001</span><span>NO GUESS EARNS FULL MARKS</span></div>
            <h1>Make the evidence <em>add up.</em></h1>
            <p className="vn-section-intro">A correct name is only 10 points. Connect the facts to motive, opportunity, and the call. Only discovered clues can be submitted.</p>
            {/SELECT A SUSPECT|SELECT THE EVIDENCE|ADD A REASONED EXPLANATION|SCORING UNAVAILABLE/.test(notice) && <p className="vn-accusation-notice" role="status">{notice}</p>}
            <div className="vn-accuse-block"><label className="vn-field-label">01 / WHO DO YOU ACCUSE?</label><div className="vn-accused-options">{suspects.map((suspect) => <button key={suspect.id} className={accused === suspect.id ? 'active' : ''} onClick={() => setAccused(suspect.id)}><span>{suspect.initials}</span><strong>{suspect.name}</strong><small>{suspect.role}</small></button>)}</div></div>
            <div className="vn-accuse-block"><label className="vn-field-label">02 / WHAT SUPPORTS YOUR THEORY?</label><div className="vn-accuse-evidence">{visibleEvidence.filter((item) => !item.locked).map((item) => <label key={item.id} className={checkedEvidence.includes(item.id) ? 'selected' : ''}><input type="checkbox" checked={checkedEvidence.includes(item.id)} onChange={() => toggleEvidence(item.id)}/><span className="vn-checkbox-mark">{checkedEvidence.includes(item.id) && <Check size={12}/>}</span><span><strong>{item.id} · {item.title}</strong><small>{item.category}</small></span></label>)}</div></div>
            <div className="vn-accuse-block"><label className="vn-field-label" htmlFor="vn-reasoning">03 / CONNECT THE CLUES IN YOUR OWN WORDS</label><textarea id="vn-reasoning" value={reasoning} onChange={(event) => setReasoning(event.target.value)} placeholder="Explain why the records contradict the alibi, what establishes motive, and what the 9:17 call actually proves…" rows={4}/><div className="vn-reasoning-meta"><span>{reasoningWordCount} words · 12 minimum</span><span>Explain the links, not just the suspect name.</span></div></div>
            <div className="vn-submit-gate" aria-label="Submission requirements">
              <span className={accused ? 'complete' : ''}>{accused ? '✓' : '○'} Choose a suspect</span>
              <span className={checkedEvidence.length ? 'complete' : ''}>{checkedEvidence.length ? '✓' : '○'} Select evidence</span>
              <span className={reasoningWordCount >= 12 ? 'complete' : ''}>{reasoningWordCount >= 12 ? '✓' : '○'} Explain your theory (12+ words)</span>
            </div>
            <div className="vn-accusation-actions"><button className="vn-text-action" onClick={() => setScreen('evidence')}><ArrowLeft size={14}/> REVIEW EVIDENCE</button><button className="vn-solid-action" disabled={!canSubmitAccusation} onClick={() => void submitAccusation()}>SUBMIT CONCLUSION <ArrowRight size={15}/></button></div>
          </section>
        </main>
      )}

      {screen === 'reveal' && (
        <main className="vn-reveal-stage">
          <section className="vn-reveal-paper">
            <div className="vn-section-kicker"><span>CASE 001 / SEALED RESULT</span><span>MERIDIAN REVIEW</span></div>
            <div className="vn-result-label">{scoreResult?.verdict ?? 'CONCLUSION RECORDED'}</div>
            <div className="vn-score-number">{scoreResult?.score ?? 0}<span>/100</span></div>
            <div className="vn-score-track"><span style={{ width: `${scoreResult?.score ?? 0}%` }}/></div>
            <p className="vn-score-feedback">{scoreResult?.explanation ?? 'Your conclusion has been recorded.'}</p>
            {scoreResult && <><button className="vn-breakdown-toggle" onClick={() => setShowBreakdown((value) => !value)}>{showBreakdown ? 'HIDE SCORE DETAILS −' : 'HOW WAS THIS SCORED? +'}</button>{showBreakdown && <div className="vn-score-breakdown">{Object.entries(scoreResult.breakdown).map(([key, value]) => <div key={key} className={value > 0 ? 'earned' : ''}><span>{({correct_culprit:'Correct culprit',motive_link:'Motive linked to records',alibi_contradiction:'Alibi contradicted',call_timeline:'Call timeline explained',camera_context:'Camera clue interpreted',reasoning_coherence:'Reasoning coherence',independent_corroboration:'Independent corroboration'} as Record<string, string>)[key] ?? key}</span><strong>{value} pts</strong></div>)}</div>}</>}
            {solutionError && <p className="vn-solution-error" role="alert">{solutionError}</p>}
            {!showSolution ? <div className="vn-reveal-actions"><button className="vn-text-action" onClick={() => setScreen('evidence')}><ArrowLeft size={14}/> REVIEW THE CASE</button><button className="vn-solid-action" onClick={() => void unsealTruth()} disabled={solutionLoading}>{solutionLoading ? 'OPENING FILE…' : 'UNSEAL THE TRUTH'} <ArrowRight size={15}/></button></div> : canonicalReveal && <div className="vn-canonical-truth"><div className="vn-truth-stamp"><ShieldAlert size={16}/> CANONICAL REVEAL</div><div className="vn-victim-recollection"><img src={CHARACTER_ART.vikram} alt="Vikram Sethi"/><span>THE VICTIM · VIKRAM SETHI</span></div><h1>{canonicalReveal.headline}</h1><p>{canonicalReveal.summary}</p><div className="vn-timeline-reveal">{canonicalReveal.timeline.map((item) => <div key={item.time}><time>{item.time}</time><span>{item.event}</span></div>)}</div><div className="vn-reveal-actions"><button className="vn-text-action" onClick={() => { setShowSolution(false); setScreen('accusation'); }}><ArrowLeft size={14}/> RECONSIDER MY THEORY</button><button className="vn-solid-action" onClick={onReturnArchive}>CLOSE CASE FILE <ArrowRight size={15}/></button></div></div>}
          </section>
        </main>
      )}

      <nav className="vn-chapter-nav" aria-label="Investigation chapters">
        {NAV.map((item) => {
          const locked = (item.id === 'interrogation' && !allStatementsReviewed) || (item.id === 'accusation' && !canMakeFormalAccusation);
          const lockedTitle = item.id === 'interrogation' && !allStatementsReviewed ? 'Read all three initial statements first.' : 'Interrogate suspects and discover at least five clues first.';
          return <button key={item.id} className={`${screen === item.id ? 'active' : ''} ${locked ? 'locked' : ''}`} disabled={locked} title={locked ? lockedTitle : undefined} onClick={() => setScreen(item.id)}><span>{item.index}</span>{item.label}</button>;
        })}
        {screen === 'reveal' && <span className="vn-nav-result">RESULT</span>}
      </nav>

      {notesOpen && <div className="vn-notes-scrim" role="presentation" onClick={() => setNotesOpen(false)}>
        <aside className="vn-notes-drawer" role="dialog" aria-modal="true" aria-label="Detective's field notes" onClick={(event) => event.stopPropagation()}>
          <div className="vn-notes-head"><div><span>MERIDIAN / PERSONAL WORKSPACE</span><h2>Field notes</h2></div><button onClick={() => setNotesOpen(false)} aria-label="Close notes"><X size={17}/></button></div>
          <textarea value={notesText} onChange={(event) => setNotesText(event.target.value)} placeholder="Record a contradiction, a time, or a question to revisit…" />
          <div className="vn-notes-foot"><BookOpen size={13}/> Autosaved in this browser</div>
        </aside>
      </div>}

    </div>
  );
}
