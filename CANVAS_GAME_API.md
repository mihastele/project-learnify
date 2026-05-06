# Canvas Games Integration API

This document provides the API specifications for integrating teacher-created canvas-based games into the Learnify platform.

## 1. Retrieve a Game

Before starting a game, you need to retrieve its configuration. The configuration contains the JSON payload describing the tools used (boxes, buttons, shapes, properties).

**Endpoint:** `GET /api/gamification/canvas-games/{id}/`

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Drag and Drop Vocab",
  "description": "Match the word to the picture.",
  "created_by": 1,
  "tools_config": {
    "boxes": [...],
    "buttons": [...],
    "logic": "..."
  },
  "created_at": "2023-10-01T12:00:00Z"
}
```

## 2. Submit Game Feedback

When a learner completes a game, submit the result to the gamification engine. This will automatically award XP, update stats, and check for badges.

**Endpoint:** `POST /api/gamification/canvas-games/{id}/feedback/`

**Request Body:**
```json
{
  "learner_id": "987f6543-e21b-34d5-c678-901234567890",
  "result": "win" // or "lose"
}
```

**Response:**
```json
{
  "message": "Feedback processed. Awarded 10 XP.",
  "game": "Drag and Drop Vocab",
  "xp_awarded": 10
}
```
