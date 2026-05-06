"""
Spaced-repetition scheduling logic based on a variant of SM-2.

This module is pure — it has no database or framework dependencies — so it
can be tested in isolation and reused on the client side if desired.
"""

from datetime import datetime, timedelta

# The minimum ease factor an item can reach.  Prevents intervals from
# collapsing entirely after repeated failures.
MIN_EASE_FACTOR = 1.3

# How much to increment ease on a correct answer.
EASE_CORRECT_BONUS = 0.1

# How much to decrement ease on an incorrect answer.
EASE_INCORRECT_PENALTY = 0.2

# Default intervals used when graduating a new card.
INTERVAL_FIRST_CORRECT_DAYS = 1
INTERVAL_SECOND_CORRECT_DAYS = 6


def update_item_state(
    *,
    ease_factor: float,
    interval_days: int,
    repetitions: int,
    next_due: datetime,
    result: str,
    now: datetime | None = None,
) -> dict:
    """Return updated SRS fields given a previous state and an attempt result.

    ``result`` must be one of ``CORRECT``, ``INCORRECT``, or ``PARTIAL``.
    ``PARTIAL`` is treated like a mistake for scheduling purposes.

    Returns a dict with keys matching ``ItemState`` field names:
    ``ease_factor``, ``interval_days``, ``repetitions``, ``next_due``.
    """
    now = now or datetime.now()

    if result == "CORRECT":
        # Adjust ease factor upward.
        ease_factor = max(ease_factor + EASE_CORRECT_BONUS, MIN_EASE_FACTOR)

        repetitions += 1
        if repetitions == 1:
            interval_days = INTERVAL_FIRST_CORRECT_DAYS
        elif repetitions == 2:
            interval_days = INTERVAL_SECOND_CORRECT_DAYS
        else:
            interval_days = round(interval_days * ease_factor)

    else:
        # INCORRECT or PARTIAL — reset progress, shorten interval.
        ease_factor = max(ease_factor - EASE_INCORRECT_PENALTY, MIN_EASE_FACTOR)
        repetitions = 0
        interval_days = INTERVAL_FIRST_CORRECT_DAYS

    next_due = now + timedelta(days=interval_days)

    return {
        "ease_factor": ease_factor,
        "interval_days": interval_days,
        "repetitions": repetitions,
        "next_due": next_due,
    }
