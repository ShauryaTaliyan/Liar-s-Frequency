"""Deterministic guided interrogation and case scoring."""
from __future__ import annotations
import re
from typing import Any
from .case_data import PUBLIC_CASE, CASE_TRUTH


def public_case() -> dict[str, Any]:
    # Copy only the safe public data. Do not expose CASE_TRUTH or hidden suspect dossier fields.
    return {
        "id": PUBLIC_CASE["id"], "title": PUBLIC_CASE["title"], "firm": PUBLIC_CASE["firm"],
        "victim": PUBLIC_CASE["victim"], "discovered_at": PUBLIC_CASE["discovered_at"],
        "location": PUBLIC_CASE["location"], "briefing": PUBLIC_CASE["briefing"],
        "suspects": PUBLIC_CASE["suspects"],
        "evidence": [e for e in PUBLIC_CASE["evidence"] if e["initially_available"]],
    }


def _answer(suspect_id: str, question: str) -> tuple[str, list[str], str | None]:
    q = question.lower()
    if suspect_id == "arjun":
        if re.search(r"access|credential|8:42|20:42|executive floor|log|left at 8:45|20:45|timeline|movements|where were you", q):
            return (
                "My badge may have registered on that floor, but it does not prove I was in Vikram's office. "
                "I left around 8:45 PM, as I told the police. If you have a separate witness, I would like to hear what they actually saw.",
                ["E3"], "departure claim conflicts with independent presence records"
            )
        if re.search(r"money|payment|vendor|ledger|fraud|account|finance|transfer|consult", q):
            return (
                "Vikram and I disagreed about how some vendor payments were categorized. That is an accounting dispute, not a motive for murder. "
                "The vendor work was legitimate, and the board had visibility into the expenses.",
                ["E5", "E8"], "Arjun minimizes the vendor review while denying personal concern"
            )
        if re.search(r"blue folder|folder", q):
            return (
                "I don't know what you mean by a blue folder. Vikram kept dozens of folders. If Meera brought that up, you should ask her what she believes was inside it.",
                ["E6"], None
            )
        if re.search(r"9:17|21:17|call|phone|meera", q):
            return (
                "I knew Vikram and Meera spoke often. I did not call her from his phone. I had no reason to handle his personal phone that night.",
                ["E7", "E9"], "call timing conflicts with the accepted forensic window"
            )
        if re.search(r"camera|dev|outage|security|footage", q):
            return (
                "I was not responsible for the cameras. Dev managed security; you should ask him why that footage is missing. I cannot explain a technical problem in a building I do not manage.",
                ["E4"], None
            )
        if re.search(r"confront|contradiction|lying|truth|prove|witness|8:58|20:58|technician", q):
            return (
                "You are combining a badge record with an assumption about who used it. I have already told you I left at 8:45. A witness needs to identify me clearly, and your timeline needs to be independently verified.",
                ["E3", "E2"], "Arjun will not account for an independent sighting"
            )
        return (
            "I understand you're looking for inconsistencies, detective, but I won't speculate. Ask me about my timeline, the vendor payments, the blue folder, or the 9:17 call.", [], None
        )

    if suspect_id == "meera":
        if re.search(r"argument|fight|marriage|divorce|7:30|19:30", q):
            return ("We argued. It was ugly, and I did not want the police turning a private argument into a motive. But I left before eight. I did not go back to the office.", [], None)
        if re.search(r"call|9:17|21:17|phone|what did he say|blue folder", q):
            return ("He said, 'The blue folder. Don't let Arjun see it.' At the time I thought he was frightened about the company accounts. I cannot swear the caller was Vikram now that you are asking me to reconsider it.", ["E6", "E7"], "caller identity is not established by call metadata")
        if re.search(r"money|payment|vendor|arjun|finance|accounts", q):
            return ("Vikram was worried about company accounts. He mentioned a folder, but I did not see the records. I did not know how serious it was until now.", ["E5", "E8"], None)
        return ("I have told you what I remember. I was home that evening. If you want to know why Vikram was worried about Arjun, examine the company records.", [], None)

    if suspect_id == "dev":
        if re.search(r"camera|outage|disabled|technical|manual|footage|security", q):
            return ("It was not a technical fault. I disabled the corridor camera manually. I had stepped away from my station for a personal errand and did not want anyone asking questions. I did not touch Vikram, and I did not enter his office.", ["E4"], "Dev's original technical-fault explanation was false")
        if re.search(r"body|discover|10:06|22:06|found", q):
            return ("I found him at 10:06 during my security round. I called the police immediately. I should have reported the camera issue earlier, but I was afraid of losing my job.", [], None)
        if re.search(r"arjun|cfo|floor|access|badge|8:42|20:42", q):
            return ("I can tell you how the access system works, but I did not see Arjun enter Vikram's office. You should compare the logs with the facilities records instead of relying on me to guess.", ["E2", "E3"], None)
        return ("I can explain the security system and the camera gap. I cannot tell you who killed Vikram because I did not see the attack.", [], None)

    raise ValueError("Unknown suspect")


def interrogate(payload: dict[str, Any]) -> dict[str, Any]:
    suspect_id = str(payload.get("suspect_id", "arjun"))
    question = str(payload.get("question", "")).strip()
    unlocked = set(payload.get("unlocked_evidence", []))
    if suspect_id not in CASE_TRUTH["suspects"]:
        raise ValueError("Unknown suspect_id")
    if not question:
        raise ValueError("Question cannot be blank")
    answer, evidence_ids, contradiction = _answer(suspect_id, question)
    new_evidence = [eid for eid in evidence_ids if eid not in unlocked]
    return {"answer": answer, "unlocked_evidence": new_evidence, "contradiction": contradiction, "suspect_id": suspect_id}


def score_accusation(payload: dict[str, Any]) -> dict[str, Any]:
    """Score evidence-linked reasoning, not suspect guessing or keyword stuffing.

    Each proof chain must be expressed in a single sentence that links the
    relevant fact to an inference. This remains a deterministic rubric (not an
    LLM judge), so its criteria are intentionally explicit and testable.
    """
    suspect_id = str(payload.get("suspect_id", ""))
    if suspect_id not in CASE_TRUTH["suspects"]:
        raise ValueError("Unknown suspect_id")

    known_ids = {item["id"] for item in PUBLIC_CASE["evidence"]}
    submitted_ids = {str(value) for value in payload.get("evidence_ids", [])}
    unlocked_ids = payload.get("unlocked_evidence_ids")
    if unlocked_ids is None:
        unlocked_ids = submitted_ids
    unlocked_ids = {str(value) for value in unlocked_ids}
    selected = submitted_ids & unlocked_ids & known_ids

    reasoning = str(payload.get("reasoning", "")).strip().lower()
    words = re.findall(r"[a-z0-9]+(?:['’][a-z]+)?", reasoning)
    word_count = len(words)
    # Split into sentences so disconnected keywords scattered through a
    # paragraph cannot masquerade as a deduction.
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+|[\n]+", reasoning) if part.strip()]
    meaningful_sentences = [sentence for sentence in sentences if len(re.findall(r"[a-z0-9]+(?:['’][a-z]+)?", sentence)) >= 6]

    def has(pattern: str, text: str | None = None) -> bool:
        return re.search(pattern, reasoning if text is None else text, re.IGNORECASE) is not None

    def linked_sentence(*patterns: str) -> bool:
        return any(all(has(pattern, sentence) for pattern in patterns) for sentence in meaningful_sentences)

    correct = suspect_id == CASE_TRUTH["culprit_id"]
    culprit_points = 10 if correct else 0

    finance = r"vendor|ledger|financial|payment|account(?:s|ing)?|fraud|funds|transfer"
    motive = r"motive|expos|report|confront|scheme|fraud|divert|disclos|prevent|stop|avoid|protect|risk"
    motive_points = 20 if (
        {"E5", "E8"}.issubset(selected)
        and linked_sentence(r"arjun|cfo|his|he", finance, motive, r"because|therefore|so|planned|would|could|risk|motive|reason|expos|confront|prevent|stop")
    ) else 0

    presence = r"access|badge|credential|facilities|technician|witness|sighting|service record|service log"
    contradiction = r"contradict|conflict|inconsistent|later than|after his claimed|does not match|doesn't match|false alibi|left at|departure"
    alibi_points = 20 if (
        {"E2", "E3"}.issubset(selected)
        and linked_sentence(r"arjun|his|he", presence, r"alibi|timeline|left|departure|8[:.]?45|after|later", contradiction)
    ) else 0

    call = r"call|phone|9[:.]?17|caller|meera"
    timing = r"forensic|death|dead|identity|staged|after death|time window|timing"
    call_inference = r"caller identity.{0,30}(uncertain|unknown|unproven)|not.{0,24}(prove|establish|show|mean).{0,24}(alive|caller|identity|death)|after death|could not have been alive|call.{0,35}(does not prove|cannot prove|doesn't prove)"
    call_points = 20 if (
        {"E6", "E7", "E9"}.issubset(selected)
        and linked_sentence(call, timing, call_inference)
    ) else 0

    camera_nuance = (
        "E4" in selected
        and linked_sentence(r"dev", r"camera|outage|footage", r"does not by itself prove|doesn't by itself prove|not proof of|not enough to prove|not evidence that|separate from|unrelated to|does not establish|cannot establish")
    )
    camera_points = 10 if camera_nuance else 0

    relationship_chains = sum(point > 0 for point in (motive_points, alibi_points, call_points))
    connective_count = sum(bool(has(pattern)) for pattern in [
        r"because", r"therefore|which means|as a result", r"support(?:s|ed)?|suggests?|shows?|indicates?",
        r"conflict|contradict|corroborat|taken together|combined|independent",
    ])
    coherence_points = 10 if (
        word_count >= 45 and len(meaningful_sentences) >= 4
        and relationship_chains >= 3 and connective_count >= 2
    ) else 0

    corroboration_points = 10 if (
        {"E2", "E3", "E5", "E8", "E6", "E7", "E9"}.issubset(selected)
        and linked_sentence(r"independent|records|corroborat|combined|taken together|cross-check|cross check", r"corroborat|support|together|connect|motive|presence|staged|records")
        and relationship_chains >= 3 and len(meaningful_sentences) >= 4
    ) else 0

    breakdown = {
        "correct_culprit": culprit_points,
        "motive_link": motive_points,
        "alibi_contradiction": alibi_points,
        "call_timeline": call_points,
        "camera_context": camera_points,
        "reasoning_coherence": coherence_points,
        "independent_corroboration": corroboration_points,
    }
    score = sum(breakdown.values())
    if not correct and score > 40:
        excess = score - 40
        for key in ("independent_corroboration", "reasoning_coherence", "camera_context", "call_timeline", "alibi_contradiction", "motive_link"):
            deduction = min(excess, breakdown[key])
            breakdown[key] -= deduction
            excess -= deduction
            if excess <= 0:
                break
        score = sum(breakdown.values())

    # Full support requires all three independently stated proof chains and
    # a coherent written argument; a lucky guess can never satisfy this gate.
    supported = correct and score >= 60 and relationship_chains >= 2 and coherence_points == 10
    verdict = "SUPPORTED CONCLUSION" if supported else "INSUFFICIENTLY SUPPORTED"

    if not correct:
        # Do not confirm or deny the culprit before the player explicitly opens
        # the canonical reveal. A failed accusation receives non-spoiler feedback.
        explanation = "This accusation is not sufficiently supported by the submitted reasoning. Suspicious behavior alone does not establish the homicide. Revisit the independently corroborated timeline and financial records."
    elif word_count < 8 or not reasoning or reasoning in {"bullshit", "idk", "random", "guess", "because he did it"}:
        explanation = "There is too little reasoning here to support the conclusion. Connect the selected evidence to motive, the false alibi, and the 9:17 call. A name alone cannot earn a high reasoning score."
    elif supported and score >= 90:
        explanation = "Strong deduction. You linked the vendor records to a motive, contradicted the claimed departure with independent evidence, interpreted the 9:17 call against the forensic window, and separated Dev's camera misconduct from proof of murder."
    elif supported:
        explanation = "Your conclusion has meaningful support, but some links remain incomplete. Review the score breakdown and explain how the independent facts fit together."
    else:
        missing = []
        if motive_points == 0:
            missing.append("explain how the vendor ledger and meeting draft give Arjun a motive")
        if alibi_points == 0:
            missing.append("connect the access log and independent facilities sighting to his claimed departure")
        if call_points == 0:
            missing.append("explain why the 9:17 call does not establish that Vikram was alive")
        if coherence_points == 0:
            missing.append("write a coherent, multi-sentence explanation connecting the facts")
        if camera_points == 0 and "E4" in selected:
            missing.append("explain why Dev's camera violation is not, by itself, proof of murder")
        explanation = "Not enough support yet. " + "; ".join(missing[:3]).capitalize() + "."

    return {
        "score": score,
        "verdict": verdict,
        "breakdown": breakdown,
        "explanation": explanation,
        "reasoning_word_count": word_count,
        "selected_evidence_count": len(selected),
    }

def case_reveal() -> dict[str, Any]:
    """Return spoiler material only when the player explicitly opens the reveal."""
    return {
        "headline": "Arjun Malhotra killed Vikram Sethi.",
        "summary": (
            f"{CASE_TRUTH['motive']} {CASE_TRUTH['method']} {CASE_TRUTH['cover_up']} "
            "Meera concealed marital conflict, while Dev concealed an unauthorized camera shutdown. "
            "Those lies were suspicious, but neither independently establishes the homicide."
        ),
        "timeline": CASE_TRUTH["timeline"],
    }

