from app.engine import interrogate, public_case, score_accusation


def test_public_case_does_not_leak_truth():
    data = public_case()
    serialized = str(data).lower()
    assert "culprit_id" not in serialized
    assert "arjun killed" not in serialized
    assert "method" not in data


def test_arjun_timeline_question_unlocks_independent_sighting():
    result = interrogate({"suspect_id": "arjun", "question": "Explain the access logs at 8:42", "unlocked_evidence": ["E1", "E2"]})
    assert result["answer"]
    assert "E3" in result["unlocked_evidence"]
    assert result["contradiction"]


def test_meera_call_question_unlocks_call_evidence():
    result = interrogate({"suspect_id": "meera", "question": "What happened on the 9:17 PM call?", "unlocked_evidence": []})
    assert "blue folder" in result["answer"].lower()
    assert {"E6", "E7"}.issubset(set(result["unlocked_evidence"]))


def test_random_guess_with_all_evidence_and_gibberish_does_not_score_high():
    result = score_accusation({
        "suspect_id": "arjun",
        "evidence_ids": ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "unlocked_evidence_ids": ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "reasoning": "bullshit",
    })
    assert result["score"] == 10
    assert result["verdict"] == "INSUFFICIENTLY SUPPORTED"


def test_complete_reasoned_case_can_earn_full_score():
    reasoning = (
        "Arjun's financial motive is supported by the vendor ledger and Vikram's meeting draft: "
        "Vikram planned to expose the fraud. His alibi contradicts the access log and an independent "
        "facilities technician sighting, which place him after his claimed 8:45 departure. The 9:17 call "
        "account, call metadata, and forensic time window show that caller identity is uncertain and the "
        "call happened after death. Dev's camera violation explains the footage gap but does not by itself "
        "prove he killed Vikram. Taken together, independent records corroborate motive, presence, and a staged call."
    )
    result = score_accusation({
        "suspect_id": "arjun",
        "evidence_ids": ["E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "unlocked_evidence_ids": ["E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "reasoning": reasoning,
    })
    assert result["score"] == 100
    assert result["verdict"] == "SUPPORTED CONCLUSION"


def test_random_evidence_does_not_gain_reasoning_points_without_links():
    result = score_accusation({
        "suspect_id": "arjun",
        "evidence_ids": ["E1", "E2", "E3", "E5", "E6", "E7", "E8", "E9"],
        "unlocked_evidence_ids": ["E1", "E2", "E3", "E5", "E6", "E7", "E8", "E9"],
        "reasoning": "I think he did it because he looks suspicious and everyone has secrets.",
    })
    assert result["score"] <= 20
    assert result["verdict"] == "INSUFFICIENTLY SUPPORTED"


def test_wrong_suspect_never_gets_supported_conclusion():
    result = score_accusation({
        "suspect_id": "dev",
        "evidence_ids": ["E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "unlocked_evidence_ids": ["E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "reasoning": "These independent records corroborate the false timeline and the financial motive. The vendor ledger shows fraud, and the technician puts Arjun on the floor after his claimed departure. The 9:17 call happened after death, so the caller identity is uncertain. Dev's camera lie is unrelated and does not prove murder.",
    })
    assert result["verdict"] == "INSUFFICIENTLY SUPPORTED"
    assert result["score"] <= 40


def test_keyword_soup_cannot_fake_full_reasoning_score():
    reasoning = (
        "Arjun killed him because fraud vendor ledger motive call 9:17 death and camera Dev proves it "
        "because independent corroboration and timeline contradictory."
    )
    result = score_accusation({
        "suspect_id": "arjun",
        "evidence_ids": ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "unlocked_evidence_ids": ["E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9"],
        "reasoning": reasoning,
    })
    assert result["score"] < 60
    assert result["verdict"] == "INSUFFICIENTLY SUPPORTED"


def test_failed_accusation_feedback_does_not_reveal_answer():
    result = score_accusation({
        "suspect_id": "dev",
        "evidence_ids": [],
        "unlocked_evidence_ids": [],
        "reasoning": "I think Dev did it."
    })
    assert result["verdict"] == "INSUFFICIENTLY SUPPORTED"
    assert "not the culprit" not in result["explanation"].lower()
    assert "arjun" not in result["explanation"].lower()


def test_public_case_includes_all_three_full_initial_statements_without_spoilers():
    data = public_case()
    statements = {suspect["id"]: suspect.get("public_statement", "") for suspect in data["suspects"]}
    assert set(statements) == {"meera", "arjun", "dev"}
    assert all(len(statement.split()) >= 25 for statement in statements.values())
    assert "9:17 PM" in statements["meera"]
    assert "8:45 PM" in statements["arjun"]
    assert "camera" in statements["dev"].lower()
    assert "culprit_id" not in str(data).lower()
    assert "cover_up" not in str(data).lower()
