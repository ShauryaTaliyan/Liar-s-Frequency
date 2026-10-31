export type Evidence = {
  id: string;
  title: string;
  summary: string;
  category: string;
  locked?: boolean;
  image?: string;
  imageAlt?: string;
};

export type Suspect = {
  id: string;
  name: string;
  role: string;
  age: number;
  initials: string;
  accent: string;
  description: string;
  status: string;
  initialStatement: string;
};

export const suspects: Suspect[] = [
  {
    id: 'meera', name: 'Meera Sethi', role: 'Wife · Corporate lawyer', age: 34, initials: 'MS', accent: 'rose',
    description: 'Guarded, articulate, emotionally exhausted.', status: 'Awaiting interview',
    initialStatement: '“I was at home that evening. Vikram and I spoke earlier, but it was a private disagreement — nothing that should concern this investigation. He called me at 9:17 PM. He sounded tense and said he had something to sort out at work. The call lasted less than a minute. I did not go to the office, and I do not know what happened there after we spoke.”',
  },
  {
    id: 'arjun', name: 'Arjun Malhotra', role: 'CFO · Sethi Dynamics', age: 40, initials: 'AM', accent: 'amber',
    description: 'Controlled, polished, carefully evasive.', status: 'Available to question',
    initialStatement: '“I left the building at approximately 8:45 PM and went straight home. Vikram and I had discussed routine vendor payments earlier, but there was no argument and nothing unusual. I did not return to the office, and I had no reason to use his personal phone. I heard about his death later that night.”',
  },
  {
    id: 'dev', name: 'Dev Bhatia', role: 'Security supervisor', age: 48, initials: 'DB', accent: 'steel',
    description: 'Nervous, defensive, afraid of losing his job.', status: 'Awaiting interview',
    initialStatement: '“I was on duty in the security monitoring room. The corridor camera on the executive floor had a brief technical fault around half past eight. I logged it and the rest of the system appeared normal. As far as the monitors showed, nobody entered the executive floor after 9 PM. I found Mr Sethi during my 10:06 PM security round and called the police immediately.”',
  },
];

export const evidence: Evidence[] = [
  { id: 'E1', title: 'The office scene', summary: 'Valuables remain untouched despite the apparent burglary.', category: 'Crime scene', image: '/visual-novel/case001/scenes/sethi-executive-office.png', imageAlt: 'Vikram Sethi’s executive office, with an overturned chair and evidence markers' },
  { id: 'E2', title: 'Access control log', summary: 'Arjun’s credential appears on the executive floor at 8:42 PM; exit recorded at 9:11 PM.', category: 'Digital record', image: '/visual-novel/case001/evidence/access-control-record.png', imageAlt: 'An access badge, control reader and activity strip' },
  { id: 'E3', title: 'Facilities service record', summary: 'A technician independently records seeing Arjun on the executive floor at 8:58 PM.', category: 'Witness record', locked: true },
  { id: 'E4', title: 'Camera maintenance log', summary: 'The corridor camera was manually disabled during Dev’s shift.', category: 'Security record', locked: true, image: '/visual-novel/case001/evidence/camera-maintenance-record.png', imageAlt: 'A camera maintenance clipboard beside a CCTV control panel' },
  { id: 'E5', title: 'Vendor payment ledger', summary: 'Irregular payments link a company vendor to an entity controlled by Arjun.', category: 'Financial record', locked: true, image: '/visual-novel/case001/evidence/vendor-payment-ledger.png', imageAlt: 'A vendor payment ledger and payment report under an amber desk lamp' },
  { id: 'E6', title: 'Meera’s call account', summary: 'The caller said: “The blue folder. Don’t let Arjun see it.”', category: 'Witness statement', locked: true },
  { id: 'E7', title: '9:17 PM call metadata', summary: 'The call lasted 46 seconds; metadata proves timing, not the caller’s identity.', category: 'Telecom record', locked: true, image: '/visual-novel/case001/evidence/phone-call-record.png', imageAlt: 'A phone displaying an abstract call-history record' },
  { id: 'E8', title: 'Vikram’s meeting draft', summary: 'Vikram planned to confront Arjun about the payments the following morning.', category: 'Document', locked: true },
  { id: 'E9', title: 'Forensic time window', summary: 'The post-mortem places death before the 9:17 PM call, within a defined uncertainty window.', category: 'Forensic report', locked: true },
];

export type ChatLine = { speaker: 'partner' | 'suspect' | 'player' | 'system'; text: string; time: string };

export const initialInterviewTranscripts: Record<string, ChatLine[]> = {
  meera: [
    { speaker: 'partner', text: 'Meera, we have your first statement. You said you were home and that Vikram called at 9:17. I need to understand what happened before and during that call.', time: '09:14' },
    { speaker: 'suspect', text: suspects[0].initialStatement, time: '09:14' },
  ],
  arjun: [
    { speaker: 'partner', text: 'Mr Malhotra, your first statement places you leaving at 8:45 PM. We will compare that account with the access and facilities records.', time: '09:14' },
    { speaker: 'suspect', text: suspects[1].initialStatement, time: '09:14' },
  ],
  dev: [
    { speaker: 'partner', text: 'Mr Bhatia, your statement describes a camera fault and says nobody entered after nine. I want to establish exactly what you saw and what the system recorded.', time: '09:14' },
    { speaker: 'suspect', text: suspects[2].initialStatement, time: '09:14' },
  ],
};

export const starterTranscript: ChatLine[] = initialInterviewTranscripts.meera;

export const questionPrompts = [
  { label: 'Your timeline', text: 'Walk me through your movements from 8:30 to 9:15 PM.', category: 'timeline' },
  { label: 'The access logs', text: 'Your access credential appears on the executive floor at 8:42. Explain that.', category: 'access' },
  { label: 'The money', text: 'What do you know about the irregular vendor payments?', category: 'money' },
  { label: 'The blue folder', text: 'What was in Vikram’s blue folder?', category: 'folder' },
  { label: 'The 9:17 call', text: 'Did you know someone called Meera from Vikram’s phone at 9:17?', category: 'call' },
  { label: 'Press the contradiction', text: 'You said you left at 8:45, but other records place you there later. Which is it?', category: 'confront' },
];
