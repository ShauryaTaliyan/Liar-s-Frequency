"""Canonical case data. Never return CASE_TRUTH or suspect private_truth to the client."""
from __future__ import annotations

PUBLIC_CASE = {
    "id": "LF-001",
    "title": "The Last Call at 9:17",
    "firm": "Meridian Private Investigations",
    "victim": {"name": "Vikram Sethi", "age": 38, "role": "Founder, Sethi Dynamics"},
    "discovered_at": "22:06",
    "location": "Sethi Dynamics HQ, executive office — Floor 17",
    "briefing": (
        "At 22:06, security supervisor Dev Bhatia found founder Vikram Sethi dead inside his locked executive office "
        "on the seventeenth floor of Sethi Dynamics HQ. The room appeared ransacked, but his wallet, laptop, and "
        "expensive watch were left behind. His wife Meera says Vikram called her at 21:17; the call lasted 46 seconds. "
        "Meera says she was home, CFO Arjun Malhotra says he left at 20:45, and Dev reports a technical camera fault "
        "and no entries after 21:00. These are initial claims, not verified facts. The investigation must establish "
        "which accounts conflict with independent records and what the 21:17 call actually proves."
    ),
    "suspects": [
        {"id": "meera", "name": "Meera Sethi", "role": "Wife · Corporate lawyer", "age": 34,
         "public_statement": "I was at home that evening. Vikram and I spoke earlier, but it was a private disagreement — nothing that should concern this investigation. He called me at 9:17 PM. He sounded tense and said he had something to sort out at work. The call lasted less than a minute. I did not go to the office, and I do not know what happened there after we spoke."},
        {"id": "arjun", "name": "Arjun Malhotra", "role": "CFO · Sethi Dynamics", "age": 40,
         "public_statement": "I left the building at approximately 8:45 PM and went straight home. Vikram and I had discussed routine vendor payments earlier, but there was no argument and nothing unusual. I did not return to the office, and I had no reason to use his personal phone. I heard about his death later that night."},
        {"id": "dev", "name": "Dev Bhatia", "role": "Security supervisor", "age": 48,
         "public_statement": "I was on duty in the security monitoring room. The corridor camera on the executive floor had a brief technical fault around half past eight. I logged it and the rest of the system appeared normal. As far as the monitors showed, nobody entered the executive floor after 9 PM. I found Mr Sethi during my 10:06 PM security round and called the police immediately."},
    ],
    "evidence": [
        {"id": "E1", "title": "The office scene", "category": "Crime scene", "summary": "Valuables remain untouched despite the apparent burglary.", "initially_available": True},
        {"id": "E2", "title": "Access control log", "category": "Digital record", "summary": "Arjun's credential appears on the executive floor at 20:42; exit recorded at 21:11.", "initially_available": True},
        {"id": "E3", "title": "Facilities service record", "category": "Witness record", "summary": "A facilities technician independently records seeing Arjun on the executive floor at 20:58.", "initially_available": False},
        {"id": "E4", "title": "Camera maintenance log", "category": "Security record", "summary": "The corridor camera was manually disabled during Dev's shift.", "initially_available": False},
        {"id": "E5", "title": "Vendor payment ledger", "category": "Financial record", "summary": "Irregular payments link a company vendor to an entity controlled by Arjun.", "initially_available": False},
        {"id": "E6", "title": "Meera's call account", "category": "Witness statement", "summary": "The caller said: 'The blue folder. Don't let Arjun see it.'", "initially_available": False},
        {"id": "E7", "title": "9:17 PM call metadata", "category": "Telecom record", "summary": "The call lasted 46 seconds; metadata proves timing, not the caller's identity.", "initially_available": False},
        {"id": "E8", "title": "Vikram's meeting draft", "category": "Document", "summary": "Vikram planned to confront Arjun about the payments the following morning.", "initially_available": False},
        {"id": "E9", "title": "Forensic time window", "category": "Forensic report", "summary": "The post-mortem places death before the 21:17 call, within a defined uncertainty window.", "initially_available": False},
    ],
}

# Internal canon only. It must never be sent as a full object to the frontend.
CASE_TRUTH = {
    "culprit_id": "arjun",
    "victim": "Vikram Sethi",
    "motive": "Arjun diverted company funds through a consulting vendor he controlled. Vikram discovered irregularities and intended to confront him and report them to the board.",
    "method": "During a confrontation in the executive office, Arjun fatally struck Vikram with a heavy metal desk ornament. The attack is kept off-screen; the game is about deduction, not procedural violence.",
    "cover_up": "Arjun disturbed the room to suggest a burglary, left with evidence linking him to the fraud, and used Vikram's phone to call Meera at 21:17 to distort the apparent timeline.",
    "timeline": [
        {"time": "19:30", "event": "Meera and Vikram argue about their marriage."},
        {"time": "20:12", "event": "Vikram reviews suspicious vendor payments and prepares to confront Arjun."},
        {"time": "20:31", "event": "Dev manually disables a corridor camera to hide an unauthorized personal errand."},
        {"time": "20:42", "event": "Arjun's credential is used on the executive floor."},
        {"time": "20:49", "event": "Arjun enters Vikram's office and confronts him about the financial scheme."},
        {"time": "20:55", "event": "Arjun kills Vikram during the confrontation."},
        {"time": "21:02", "event": "Arjun stages the room and leaves with evidence of the fraud."},
        {"time": "21:11", "event": "Arjun exits the building."},
        {"time": "21:17", "event": "A caller using Vikram's phone calls Meera; the call lasts 46 seconds."},
        {"time": "22:06", "event": "Dev discovers the body during a security round and calls police."},
    ],
    "suspects": {
        "meera": {
            "truth": "She argued with Vikram at 19:30, left before 20:00, and returned home. She knew about a financial investigation but not all of the details. At 21:17, a caller said: 'The blue folder. Don't let Arjun see it.' She believed it was Vikram but cannot reliably identify the voice in retrospect.",
            "lies": ["The argument was not serious", "She knew nothing about the financial investigation", "Initially omits the exact wording of the 21:17 call"],
            "innocent_reason": "She wants to conceal marital conflict and avoid becoming a suspect.",
        },
        "arjun": {
            "truth": "He diverted company funds through a consulting vendor he controlled. He entered the executive floor at 20:42, met Vikram, killed him at approximately 20:55, staged the room, left at 21:11, and called Meera using Vikram's phone at 21:17.",
            "lies": ["Claims he left at 20:45", "Denies knowing of the financial review", "Denies seeing the blue folder", "Denies handling Vikram's phone"],
            "innocent_reason": None,
        },
        "dev": {
            "truth": "He manually disabled the camera at 20:31 to conceal an unauthorized personal errand. He returned to duty, did not witness the attack, and discovered the body at 22:06.",
            "lies": ["Calls the outage a technical fault", "Claims he never left his station", "Initially omits the manual shutdown"],
            "innocent_reason": "He fears losing his job for violating security procedures.",
        },
    },
    "fairness_notes": [
        "A badge record alone does not prove identity; E3 independently corroborates Arjun's presence.",
        "A call record proves timing, not caller identity; E7 must be paired with E6 and E9.",
        "Motive plus lying is not sufficient proof; players must connect independent evidence.",
        "The game should never claim that the real-world player can convict or jail someone. The fictional case is referred to law enforcement.",
    ],
}
