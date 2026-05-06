"""
Tests for the SRS scheduling algorithm.

Covers:
- Correct answer progression through first, second, and subsequent reviews
- Incorrect answer resets interval and decreases ease factor
- Partial answer treated as incorrect
- Ease factor floor (never below MIN_EASE_FACTOR)
- next_due always advances into the future
"""

from datetime import datetime

from learning.srs import (
    EASE_CORRECT_BONUS,
    EASE_INCORRECT_PENALTY,
    INTERVAL_FIRST_CORRECT_DAYS,
    INTERVAL_SECOND_CORRECT_DAYS,
    MIN_EASE_FACTOR,
    update_item_state,
)


def make_state(ease=2.5, interval=0, reps=0, due=None):
    return {
        "ease_factor": ease,
        "interval_days": interval,
        "repetitions": reps,
        "next_due": due or datetime(2026, 1, 1),
    }


# ── Correct-answer progression ──────────────────────────────────────────


def test_first_correct_answer():
    s = make_state(reps=0, interval=0)
    result = update_item_state(**s, result="CORRECT")
    assert result["repetitions"] == 1
    assert result["interval_days"] == INTERVAL_FIRST_CORRECT_DAYS
    assert result["ease_factor"] == 2.5 + EASE_CORRECT_BONUS
    assert result["next_due"] > s["next_due"]


def test_second_correct_answer():
    s = make_state(reps=1, interval=1, ease=2.6)
    result = update_item_state(**s, result="CORRECT")
    assert result["repetitions"] == 2
    assert result["interval_days"] == INTERVAL_SECOND_CORRECT_DAYS
    assert result["ease_factor"] == 2.6 + EASE_CORRECT_BONUS


def test_third_correct_answer_uses_ease_factor():
    s = make_state(reps=2, interval=6, ease=2.5)
    result = update_item_state(**s, result="CORRECT")
    assert result["repetitions"] == 3
    # ease updated first to 2.6, then interval = round(6 * 2.6) = 16
    assert result["interval_days"] == 16
    assert result["ease_factor"] == 2.5 + EASE_CORRECT_BONUS


def test_fourth_correct_compounds_ease():
    s = make_state(reps=3, interval=15, ease=2.6)
    result = update_item_state(**s, result="CORRECT")
    assert result["repetitions"] == 4
    # ease updated first to 2.7, then interval = round(15 * 2.7) = 40
    assert result["interval_days"] == 40


# ── Incorrect-answer handling ───────────────────────────────────────────


def test_incorrect_resets_repetitions():
    s = make_state(reps=5, interval=30, ease=2.5)
    result = update_item_state(**s, result="INCORRECT")
    assert result["repetitions"] == 0
    assert result["interval_days"] == INTERVAL_FIRST_CORRECT_DAYS
    assert result["ease_factor"] == 2.5 - EASE_INCORRECT_PENALTY


def test_incorrect_lowers_ease():
    s = make_state(reps=2, interval=6, ease=2.5)
    result = update_item_state(**s, result="INCORRECT")
    assert result["ease_factor"] == 2.5 - EASE_INCORRECT_PENALTY


def test_partial_treated_as_incorrect():
    s = make_state(reps=3, interval=12, ease=2.5)
    result = update_item_state(**s, result="PARTIAL")
    assert result["repetitions"] == 0
    assert result["interval_days"] == INTERVAL_FIRST_CORRECT_DAYS


# ── Ease factor floor ───────────────────────────────────────────────────


def test_ease_never_below_minimum():
    s = make_state(ease=MIN_EASE_FACTOR + 0.01, reps=0, interval=0)
    result = update_item_state(**s, result="INCORRECT")
    assert result["ease_factor"] == MIN_EASE_FACTOR


def test_ease_accumulates_after_recovery():
    """After bottoming out, correct answers should push ease back up."""
    s = make_state(ease=MIN_EASE_FACTOR, reps=0, interval=1)
    result = update_item_state(**s, result="CORRECT")
    assert result["ease_factor"] == MIN_EASE_FACTOR + EASE_CORRECT_BONUS


# ── next_due always in the future ───────────────────────────────────────


def test_next_due_advances():
    s = make_state(due=datetime(2026, 5, 6, 12, 0, 0))
    result = update_item_state(**s, result="CORRECT")
    assert result["next_due"] > s["next_due"]


# ── Edge cases ──────────────────────────────────────────────────────────


def test_new_item_with_zero_interval():
    """A brand-new item should graduate to interval 1 on first correct."""
    s = make_state(reps=0, interval=0)
    result = update_item_state(**s, result="CORRECT")
    assert result["interval_days"] == INTERVAL_FIRST_CORRECT_DAYS
    assert result["repetitions"] == 1


def test_very_high_ease_still_works():
    s = make_state(reps=2, interval=6, ease=10.0)
    result = update_item_state(**s, result="CORRECT")
    # ease updated first to 10.1, interval = round(6 * 10.1) = 61
    assert result["interval_days"] == 61
    assert result["repetitions"] == 3


def test_sequence_correct_incorrect_correct():
    """Simulate: correct -> incorrect -> correct."""
    s = make_state(reps=0, interval=0, ease=2.5)
    r1 = update_item_state(**s, result="CORRECT")
    assert r1["repetitions"] == 1

    r2 = update_item_state(**r1, result="INCORRECT")
    assert r2["repetitions"] == 0
    assert r2["interval_days"] == INTERVAL_FIRST_CORRECT_DAYS

    r3 = update_item_state(**r2, result="CORRECT")
    assert r3["repetitions"] == 1
    assert r3["interval_days"] == INTERVAL_FIRST_CORRECT_DAYS
