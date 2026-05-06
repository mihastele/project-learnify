from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import ContentUnit


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
