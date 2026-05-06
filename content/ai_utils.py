"""
AI-assisted content generation utilities.

Provides deterministic helpers for generating quiz items and
pronunciation exercises from text. LLM integration can be wired in
by replacing these stubs.
"""

from typing import Any


def generate_items_from_text(
    content_body: str, language_code: str, item_type: str = "CLOZE"
) -> list[dict[str, Any]]:
    lines = [l.strip() for l in content_body.split(".") if l.strip()]
    items: list[dict[str, Any]] = []
    for i, line in enumerate(lines[:5]):
        words = line.split()
        if len(words) < 3:
            continue
        if item_type == "MCQ":
            items.append({
                "item_type": "MCQ",
                "prompt": f"What best summarizes: \"{line[:80]}\"?",
                "metadata": {
                    "choices": [
                        line[:40] + "...",
                        "Something completely different",
                        "The opposite of the statement",
                        "None of the above",
                    ],
                    "correct_index": 0,
                },
                "difficulty_initial": 0.4 + i * 0.1,
                "sort_order": i,
            })
        else:
            blank = words[-1] if words else "..."
            items.append({
                "item_type": "CLOZE",
                "prompt": f"Fill in the blank: {line.replace(blank, '_____', 1)}" if blank in line
                    else f"Fill in: {line[:60]}...",
                "hint": f"The missing word starts with '{blank[0]}'" if blank else "",
                "metadata": {"blank_word": blank, "correct_answer": blank},
                "difficulty_initial": 0.5 + i * 0.1,
                "sort_order": i,
            })
    return items


def generate_pronunciation_item(
    prompt: str, answer_text: str, hint: str = "", audio_url: str = ""
) -> dict[str, Any]:
    return {
        "item_type": "PRONUNCIATION",
        "prompt": prompt or "Repeat this phrase aloud:",
        "hint": hint or f"Listen carefully and repeat: {answer_text}",
        "metadata": {
            "target_text": answer_text,
            "audio_url": audio_url,
            "phonetic_hint": _simple_phonetic_breakdown(answer_text),
            "show_hint": True,
        },
        "sort_order": 0,
    }


def _simple_phonetic_breakdown(text: str) -> dict[str, list[str]]:
    """Simple phoneme-like syllable breakdown for pronunciation guidance.

    Not a full linguistic phoneme parser — provides approximate syllable
    breaks and character-by-character hints for the student.
    """
    vowels = set("aeiouAEIOU")
    syllables: list[str] = []
    current: list[str] = []
    for ch in text:
        if ch.strip():
            current.append(ch)
        if ch in vowels and len(current) > 1:
            syllables.append("".join(current))
            current = []
    if current:
        syllables.append("".join(current))

    return {
        "syllables": syllables if syllables else [text],
        "char_count": len(text),
        "word_count": len(text.split()),
    }


def check_pronunciation_match(
    spoken: str, target: str, threshold: float = 0.6
) -> dict[str, Any]:
    """Lightweight pronunciation similarity check.

    Compares the spoken text against the target using a simple
    character-level similarity algorithm. Returns a match score and
    per-word comparison.
    """
    spoken_lower = spoken.lower().strip()
    target_lower = target.lower().strip()

    spoken_words = spoken_lower.split()
    target_words = target_lower.split()

    word_matches = 0
    word_details: list[dict[str, Any]] = []
    for i, tw in enumerate(target_words):
        sw = spoken_words[i] if i < len(spoken_words) else ""
        sim = _word_similarity(sw, tw)
        word_details.append({
            "target": tw,
            "spoken": sw,
            "similarity": round(sim, 2),
            "correct": sim >= threshold,
        })
        if sim >= threshold:
            word_matches += 1

    total_words = max(len(target_words), len(spoken_words))
    score = word_matches / total_words if total_words > 0 else 0.0

    return {
        "overall_score": round(score, 2),
        "matched_words": word_matches,
        "total_words": total_words,
        "word_details": word_details,
        "is_correct": score >= threshold,
    }


def _word_similarity(a: str, b: str) -> float:
    """Simple string similarity (prefix + edit distance approximation)."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    shorter = a if len(a) < len(b) else b
    longer = b if len(a) < len(b) else a
    matches = sum(1 for i, ch in enumerate(shorter) if i < len(longer) and ch == longer[i])
    return matches / max(len(shorter), len(longer))
