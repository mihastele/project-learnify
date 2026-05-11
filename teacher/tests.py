from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import ContentUnit, Item
from learning.models import Learner


class TeacherCreateLessonAuthTests(APITestCase):
    def setUp(self):
        self.create_lesson_url = reverse("teacher-create-lesson")
        self.payload = {
            "title": "Sample Lesson",
            "description": "Intro lesson",
            "subject": "SCIENCE",
            "level": "BEGINNER",
            "license_type": "CC-BY",
            "source_url": "https://example.com/lesson",
            "language_code": "en",
            "script": "Latin",
            "body": "Lesson body",
        }

    def test_create_lesson_requires_authentication(self):
        response = self.client.post(self.create_lesson_url, self.payload, format="json")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )
        self.assertEqual(ContentUnit.objects.count(), 0)

    def test_authenticated_user_can_create_lesson(self):
        user = get_user_model().objects.create_user(
            username="teacher1", email="teacher1@example.com", password="pass12345"
        )
        self.client.force_authenticate(user=user)
        response = self.client.post(self.create_lesson_url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContentUnit.objects.count(), 1)
        lesson = ContentUnit.objects.get()
        self.assertEqual(lesson.created_by, user)


class QuizItemFlowTests(APITestCase):
    """Integration tests: create lesson -> add items -> verify item count -> fetch as learner."""

    def setUp(self):
        self.teacher = get_user_model().objects.create_user(
            username="tchr", password="pass12345"
        )
        self.learner_user = get_user_model().objects.create_user(
            username="learner1", password="pass12345"
        )
        self.learner = Learner.objects.create(user=self.learner_user)
        self.create_lesson_url = reverse("teacher-create-lesson")
        self.add_item_url = reverse("teacher-add-item")
        self.client.force_authenticate(user=self.teacher)

    def test_create_lesson_with_items_shows_correct_item_count(self):
        """Create a lesson with 3 items, verify response includes all items and item_count."""
        payload = {
            "title": "Geography Quiz",
            "description": "Capitals of the world",
            "subject": "GEOGRAPHY",
            "level": "Intermediate",
            "license_type": "CC-BY",
            "language_code": "en",
            "body": "Test the capitals.",
            "items": [
                {
                    "item_type": "MCQ",
                    "prompt": "Capital of France?",
                    "metadata": {
                        "choices": ["Paris", "London", "Berlin", "Madrid"],
                        "correct_index": 0,
                    },
                },
                {
                    "item_type": "TRUE_FALSE",
                    "prompt": "Tokyo is the capital of Japan",
                    "metadata": {"correct_answer": "true"},
                },
                {
                    "item_type": "CLOZE",
                    "prompt": "The capital of Italy is ____",
                    "metadata": {"correct_answer": "Rome"},
                },
            ],
        }
        response = self.client.post(self.create_lesson_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(len(data["items"]), 3)
        self.assertEqual(Item.objects.count(), 3)
        lesson = ContentUnit.objects.get()
        self.assertEqual(lesson.items.count(), 3)

    def test_add_item_to_existing_lesson_increases_count(self):
        """Add an item to an existing lesson, verify item count updates."""
        lesson = ContentUnit.objects.create(
            title="Science Quiz",
            subject="SCIENCE",
            level="Beginner",
            license_type="CC0",
            created_by=self.teacher,
        )
        self.assertEqual(lesson.items.count(), 0)
        response = self.client.post(
            self.add_item_url,
            {
                "lesson_id": str(lesson.id),
                "item_type": "MCQ",
                "prompt": "What is H2O?",
                "metadata": {
                    "choices": ["Water", "Oxygen", "Hydrogen", "Salt"],
                    "correct_index": 0,
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(lesson.items.count(), 1)
        lesson.refresh_from_db()
        self.assertEqual(lesson.items.count(), 1)

    def test_edit_existing_quiz_add_remove_items(self):
        """Edit a quiz: add items, then verify all items appear in practice fetch."""
        lesson = ContentUnit.objects.create(
            title="Math Test",
            subject="MATH",
            level="Beginner",
            license_type="CC-BY",
            created_by=self.teacher,
        )
        Item.objects.create(
            content_unit=lesson, item_type="MATH_INPUT",
            prompt="2+2=?", metadata={"correct_answer": "4"},
            sort_order=0,
        )
        Item.objects.create(
            content_unit=lesson, item_type="MATH_INPUT",
            prompt="5*3=?", metadata={"correct_answer": "15"},
            sort_order=1,
        )
        self.assertEqual(lesson.items.count(), 2)

        self.client.force_authenticate(user=self.learner_user)
        next_items_url = reverse("learner-next-items", kwargs={"pk": self.learner.id})
        response = self.client.get(
            next_items_url, {"content_unit": str(lesson.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.json()
        self.assertEqual(len(items), 2)

    def test_learners_next_items_returns_empty_with_message(self):
        """When a lesson has 0 items, the learner sees 0 items (no crash)."""
        lesson = ContentUnit.objects.create(
            title="Empty Lesson",
            subject="SCIENCE",
            level="Beginner",
            license_type="CC0",
            created_by=self.teacher,
        )
        self.assertEqual(lesson.items.count(), 0)

        self.client.force_authenticate(user=self.learner_user)
        next_items_url = reverse("learner-next-items", kwargs={"pk": self.learner.id})
        response = self.client.get(
            next_items_url, {"content_unit": str(lesson.id)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 0)

    def test_create_canvas_game_item(self):
        """Create a lesson with an ADVANCED_CANVAS_GAME item."""
        payload = {
            "title": "Game Lesson",
            "description": "Canvas game test",
            "subject": "CODING",
            "level": "Beginner",
            "license_type": "CC-BY",
            "language_code": "en",
            "body": "Play the game",
            "items": [
                {
                    "item_type": "ADVANCED_CANVAS_GAME",
                    "prompt": "Collect all coins!",
                    "hint": "Use arrow keys",
                    "metadata": {
                        "game_slug": "collect_coins",
                        "game_config": {
                            "time_limit": 60,
                            "target_score": 5,
                            "max_lives": 3,
                            "enemy_count": 3,
                            "success_condition": {"type": "score_threshold", "score": 5},
                            "failure_condition": {"type": "lives_reached_zero"},
                        },
                    },
                },
            ],
        }
        response = self.client.post(self.create_lesson_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(len(data["items"]), 1)
        item = Item.objects.get()
        self.assertEqual(item.item_type, "ADVANCED_CANVAS_GAME")
        self.assertIn("game_slug", item.metadata)
        self.assertEqual(item.metadata["game_slug"], "collect_coins")

    def test_canvas_game_item_requires_valid_config(self):
        """Reject canvas game items missing required fields."""
        payload = {
            "title": "Bad Game",
            "description": "Invalid config",
            "subject": "CODING",
            "level": "Beginner",
            "license_type": "CC-BY",
            "language_code": "en",
            "body": "Play",
            "items": [
                {
                    "item_type": "ADVANCED_CANVAS_GAME",
                    "prompt": "Bad game",
                    "metadata": {
                        "game_config": {
                            "time_limit": 60,
                        },
                    },
                },
            ],
        }
        response = self.client.post(self.create_lesson_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AttemptRecordingTests(APITestCase):
    """Test that canvas game results are recorded correctly as attempts."""

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="learner2", password="pass12345"
        )
        self.learner = Learner.objects.create(user=self.user)
        self.teacher = get_user_model().objects.create_user(
            username="tchr2", password="pass12345"
        )
        self.client.force_authenticate(user=self.user)

    def test_canvas_game_win_submitted_as_attempt(self):
        lesson = ContentUnit.objects.create(
            title="Game Quiz", subject="CODING", level="Beginner",
            license_type="CC0", created_by=self.teacher,
        )
        item = Item.objects.create(
            content_unit=lesson, item_type="ADVANCED_CANVAS_GAME",
            prompt="Collect coins!", metadata={
                "game_slug": "collect_coins",
                "game_config": {
                    "time_limit": 60, "target_score": 5, "max_lives": 3,
                    "success_condition": {"type": "score_threshold", "score": 5},
                    "failure_condition": {"type": "lives_reached_zero"},
                },
            },
        )
        attempt_url = reverse("attempt-list")
        response = self.client.post(
            attempt_url,
            {
                "learner": str(self.learner.id),
                "item": str(item.id),
                "result": "CORRECT",
                "response_data": {
                    "result": "success",
                    "score": 5,
                    "time_elapsed": 30.5,
                    "lives_remaining": 3,
                },
                "latency_ms": 30500,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.learner.attempts.count(), 1)
        attempt = self.learner.attempts.get()
        self.assertEqual(attempt.result, "CORRECT")
        self.assertEqual(attempt.response_data["result"], "success")
        self.assertEqual(attempt.response_data["score"], 5)
