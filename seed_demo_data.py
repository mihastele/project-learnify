"""
Seed the database with demo lessons across different subjects and item types.
Run: python manage.py shell < seed_demo_data.py
Or: python manage.py runscript seed_demo_data
"""
import uuid
from datetime import date

from content.models import ContentUnit, ContentVariant, MediaResource, Item
from learning.models import Learner


def run():
    # Skip if data already exists
    if ContentUnit.objects.exists():
        print(f"Data already exists: {ContentUnit.objects.count()} lessons, {Item.objects.count()} items")
        return

    learner_id = "00000000-0000-0000-0000-000000000001"
    learner, _ = Learner.objects.get_or_create(
        id=learner_id,
        defaults={"created_at": "2024-01-01T00:00:00Z"},
    )

    # ── Lesson 1: Spanish Basics (Language) ──
    cu1 = ContentUnit.objects.create(
        id=uuid.uuid4(),
        title="Spanish Greetings & Introductions",
        description="Learn basic Spanish greetings and how to introduce yourself.",
        subject="LANGUAGE", level="Beginner",
        license_type="CC-BY", created_by=None,
    )
    ContentVariant.objects.create(
        content_unit=cu1, language_code="en", script="Latin",
        body=(
            "In Spanish, there are several ways to greet people.\n\n"
            "Hola means Hello. Buenos días means Good morning. "
            "Buenas tardes means Good afternoon. Buenas noches means Good night.\n\n"
            "To introduce yourself, say: Me llamo [name]. This literally means 'I call myself'.\n"
            "To ask someone's name: ¿Cómo te llamas?\n"
            "Nice to meet you: Mucho gusto."
        ),
    )
    MediaResource.objects.create(
        content_unit=cu1, type="AUDIO",
        url="https://example.com/spanish-greetings.mp3",
        caption="Native speaker greeting examples",
    )

    # Items
    Item.objects.create(
        content_unit=cu1, item_type="MCQ",
        prompt="What does 'Buenos días' mean?",
        hint="Think about morning time",
        metadata={"choices": ["Good morning", "Good afternoon", "Good night", "Hello"], "correct_index": 0},
        sort_order=0, points=10,
    )
    Item.objects.create(
        content_unit=cu1, item_type="CLOZE",
        prompt="Complete: 'Me _____ Juan' (I call myself Juan)",
        hint="The word starts with 'll'",
        metadata={"correct_answer": "llamo", "blank_word": "llamo"},
        sort_order=1, points=10,
    )
    Item.objects.create(
        content_unit=cu1, item_type="TRUE_FALSE",
        prompt="'Hola' means Goodbye. True or False?",
        hint="",
        metadata={"correct_answer": "false"},
        sort_order=2, points=5,
    )
    Item.objects.create(
        content_unit=cu1, item_type="PRONUNCIATION",
        prompt="Repeat this Spanish greeting aloud:",
        hint="Practice rolling your tongue slightly on the 'r'",
        metadata={"target_text": "Buenos días", "audio_url": "", "show_hint": True},
        sort_order=3, points=15,
    )
    Item.objects.create(
        content_unit=cu1, item_type="SPEAK_REPEAT",
        prompt="Record yourself saying: 'Mucho gusto, ¿cómo te llamas?'",
        hint="",
        metadata={},
        sort_order=4, points=15,
    )

    # ── Lesson 2: Algebra Basics (Math) ──
    cu2 = ContentUnit.objects.create(
        id=uuid.uuid4(),
        title="Solving Linear Equations",
        description="Learn how to solve simple linear equations step by step.",
        subject="MATH", level="Intermediate",
        license_type="CC-BY", created_by=None,
    )
    ContentVariant.objects.create(
        content_unit=cu2, language_code="en", script="Latin",
        body=(
            "A linear equation is an equation where the variable has no exponent greater than 1.\n\n"
            "The general form is: ax + b = c\n\n"
            "To solve, isolate the variable:\n"
            "1. Subtract b from both sides: ax = c - b\n"
            "2. Divide both sides by a: x = (c - b) / a\n\n"
            "Example: 2x + 3 = 11\n"
            "Step 1: 2x = 11 - 3 = 8\n"
            "Step 2: x = 8 / 2 = 4"
        ),
    )
    Item.objects.create(
        content_unit=cu2, item_type="MATH_INPUT",
        prompt="Solve for x: 3x + 7 = 22",
        hint="First subtract 7 from both sides, then divide by 3",
        metadata={"correct_answer": "5", "equation": "3x + 7 = 22"},
        sort_order=0, points=15,
    )
    Item.objects.create(
        content_unit=cu2, item_type="MATH_INPUT",
        prompt="Solve for y: 5y - 4 = 21",
        hint="",
        metadata={"correct_answer": "5", "equation": "5y - 4 = 21"},
        sort_order=1, points=15,
    )
    Item.objects.create(
        content_unit=cu2, item_type="MCQ",
        prompt="What is the first step to solve 4x + 10 = 30?",
        hint="",
        metadata={"choices": [
            "Subtract 10 from both sides",
            "Divide both sides by 4",
            "Multiply both sides by 4",
            "Add 10 to both sides",
        ], "correct_index": 0},
        sort_order=2, points=10,
    )

    # ── Lesson 3: Solar System (Science) ──
    cu3 = ContentUnit.objects.create(
        id=uuid.uuid4(),
        title="Our Solar System",
        description="Explore the planets of our solar system.",
        subject="SCIENCE", level="Beginner",
        license_type="CC-BY", created_by=None,
    )
    ContentVariant.objects.create(
        content_unit=cu3, language_code="en", script="Latin",
        body=(
            "Our solar system consists of the Sun and everything that orbits it.\n\n"
            "There are 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.\n\n"
            "The inner planets (Mercury, Venus, Earth, Mars) are rocky and small.\n"
            "The outer planets (Jupiter, Saturn, Uranus, Neptune) are gas giants.\n\n"
            "The asteroid belt lies between Mars and Jupiter."
        ),
    )
    Item.objects.create(
        content_unit=cu3, item_type="SORTING",
        prompt="Arrange the planets in order from closest to the Sun:",
        hint="Start with Mercury",
        metadata={
            "options": ["Earth", "Mars", "Mercury", "Venus"],
            "correct_order": [0, 1, 2, 3],
        },
        sort_order=0, points=15,
    )
    Item.objects.create(
        content_unit=cu3, item_type="MATCHING",
        prompt="Match each planet to its type:",
        hint="",
        metadata={"pairs": [
            {"left": "Mercury", "right": "Inner Planet"},
            {"left": "Jupiter", "right": "Gas Giant"},
            {"left": "Earth", "right": "Inner Planet"},
            {"left": "Saturn", "right": "Gas Giant"},
        ]},
        sort_order=1, points=20,
    )
    Item.objects.create(
        content_unit=cu3, item_type="WRITING",
        prompt="Explain why Earth is unique among the planets in our solar system.",
        hint="Think about water, atmosphere, and life",
        metadata={"min_words": 20, "max_words": 200},
        sort_order=2, points=25,
    )

    # ── Lesson 4: World History (History) ──
    cu4 = ContentUnit.objects.create(
        id=uuid.uuid4(),
        title="The Renaissance Period",
        description="Explore the rebirth of art, science, and culture in Europe.",
        subject="HISTORY", level="Intermediate",
        license_type="CC-BY", created_by=None,
    )
    ContentVariant.objects.create(
        content_unit=cu4, language_code="en", script="Latin",
        body=(
            "The Renaissance was a period of European history from the 14th to 17th century.\n\n"
            "It began in Italy and spread across Europe, marking the transition from the Middle Ages "
            "to modernity. Key figures include Leonardo da Vinci, Michelangelo, and Galileo.\n\n"
            "The Renaissance saw major advances in art, science, literature, and philosophy. "
            "The invention of the printing press by Gutenberg in 1440 revolutionized the spread of knowledge."
        ),
    )
    Item.objects.create(
        content_unit=cu4, item_type="CLOZE",
        prompt="The invention of the _______ press by Gutenberg in 1440 revolutionized knowledge.",
        hint="Starts with 'p'",
        metadata={"correct_answer": "printing", "blank_word": "printing"},
        sort_order=0, points=10,
    )
    Item.objects.create(
        content_unit=cu4, item_type="LISTEN_ANSWER",
        prompt="Listen to the audio and answer: When did the Renaissance begin?",
        hint="",
        metadata={"correct_answer": "14th century", "audio_url": ""},
        sort_order=1, points=15,
    )
    Item.objects.create(
        content_unit=cu4, item_type="TRUE_FALSE",
        prompt="The Renaissance began in France. True or False?",
        hint="",
        metadata={"correct_answer": "false"},
        sort_order=2, points=5,
    )

    # ── Lesson 5: Coding Basics (Coding) ──
    cu5 = ContentUnit.objects.create(
        id=uuid.uuid4(),
        title="Python Fundamentals: Variables & Types",
        description="Learn the basics of Python programming.",
        subject="CODING", level="Beginner",
        license_type="CC-BY", created_by=None,
    )
    ContentVariant.objects.create(
        content_unit=cu5, language_code="en", script="Latin",
        body=(
            "Python is a high-level programming language known for its readability.\n\n"
            "Variables store data. In Python, you don't need to declare types:\n"
            "  name = 'Alice'\n"
            "  age = 25\n"
            "  is_student = True\n\n"
            "Common types: str (text), int (whole numbers), float (decimals), bool (True/False), "
            "list (ordered collection), dict (key-value pairs)."
        ),
    )
    Item.objects.create(
        content_unit=cu5, item_type="MCQ",
        prompt="What type is the value `True` in Python?",
        hint="",
        metadata={"choices": ["bool", "str", "int", "list"], "correct_index": 0},
        sort_order=0, points=10,
    )
    Item.objects.create(
        content_unit=cu5, item_type="CLOZE",
        prompt="Fill in: `my_name = ______` to store the string 'Bob'",
        hint="Use quotes",
        metadata={"correct_answer": "'Bob'", "blank_word": "'Bob'"},
        sort_order=1, points=10,
    )
    Item.objects.create(
        content_unit=cu5, item_type="MATH_INPUT",
        prompt="What is the result of: 10 // 3 in Python? (integer division)",
        hint="// means floor division",
        metadata={"correct_answer": "3"},
        sort_order=2, points=15,
    )

    print(f"Seeded {ContentUnit.objects.count()} lessons with {Item.objects.count()} items")


if __name__ == "__main__":
    run()
