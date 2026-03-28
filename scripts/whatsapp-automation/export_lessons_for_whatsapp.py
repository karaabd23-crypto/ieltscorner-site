import argparse
import ast
import hashlib
import json
import re
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]
LESSONS_DIR = REPO_ROOT / "src" / "content" / "lessons"
DEFAULT_OUTPUT = SCRIPT_DIR / "whatsapp_lessons_queue.json"
DEFAULT_TEXT_OUTPUT = SCRIPT_DIR / "lesson_summaries.txt"
DEFAULT_SITE_URL = "https://ieltscorner.ca"

FRONTMATTER_PATTERN = re.compile(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n?(.*)$", re.DOTALL)
PERSIAN_PATTERN = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")

FRONTMATTER_KEYS = (
    "title",
    "excerpt",
    "description",
    "category",
    "level",
    "date",
    "draft",
    "skill",
    "test",
    "exam",
    "tags",
)

CATEGORY_EMOJI = {
    "grammar": "🧩",
    "vocabulary": "📚",
    "writing": "✍️",
    "speaking": "🗣️",
    "reading": "📖",
    "listening": "🎧",
}

ALLOWED_KEYWORDS = (
    "celpip",
    "grammar",
    "vocab",
    "vocabulary",
)


def parse_scalar(raw_value: str) -> Any:
    value = raw_value.strip()
    if not value:
        return ""

    lower = value.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False

    if value.startswith(("[", "{", "'", '"')):
        try:
            return ast.literal_eval(value)
        except (SyntaxError, ValueError):
            pass

    return value.strip("'\"")


def extract_frontmatter_value(frontmatter: str, key: str) -> Any:
    pattern = re.compile(rf"(?m)^{re.escape(key)}:\s*(.+)\s*$")
    match = pattern.search(frontmatter)
    if not match:
        return None
    return parse_scalar(match.group(1))


def parse_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
    match = FRONTMATTER_PATTERN.match(raw)
    if not match:
        return {}, raw

    frontmatter_block = match.group(1)
    frontmatter: dict[str, Any] = {}
    for key in FRONTMATTER_KEYS:
        parsed = extract_frontmatter_value(frontmatter_block, key)
        if parsed is not None:
            frontmatter[key] = parsed

    body = match.group(2)
    return frontmatter, body


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    return re.sub(r"\s+", " ", text).strip()


def remove_persian_lines(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    kept = [line for line in lines if line and not PERSIAN_PATTERN.search(line)]
    return " ".join(kept)


def to_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [normalize_text(item) for item in value if normalize_text(item)]
    item = normalize_text(value)
    return [item] if item else []


def is_allowed_lesson(frontmatter: dict[str, Any], slug: str) -> bool:
    category = normalize_text(frontmatter.get("category")).lower()
    if category in {"grammar", "vocabulary"}:
        return True

    search_parts: list[str] = [
        slug,
        normalize_text(frontmatter.get("title")),
        normalize_text(frontmatter.get("excerpt")),
        normalize_text(frontmatter.get("description")),
        normalize_text(frontmatter.get("skill")),
        normalize_text(frontmatter.get("test")),
    ]
    search_parts.extend(to_list(frontmatter.get("exam")))
    search_parts.extend(to_list(frontmatter.get("tags")))

    haystack = " ".join(search_parts).lower()
    return any(keyword in haystack for keyword in ALLOWED_KEYWORDS)


def trim_excerpt(text: str, max_length: int = 170) -> str:
    cleaned = normalize_text(remove_persian_lines(text))
    if len(cleaned) <= max_length:
        return cleaned
    return f"{cleaned[: max_length - 1].rstrip()}…"


def lesson_url(site_url: str, category: str, slug: str) -> str:
    clean_site = site_url.rstrip("/")
    safe_category = category.strip("/") or "grammar"
    safe_slug = slug.strip("/")
    return f"{clean_site}/lessons/{safe_category}/{safe_slug}/"


def build_lesson_message(frontmatter: dict[str, Any], slug: str, site_url: str) -> str:
    title = normalize_text(frontmatter.get("title") or slug.replace("-", " ").title())
    excerpt = trim_excerpt(
        frontmatter.get("excerpt")
        or frontmatter.get("description")
        or "Practical CELPIP-ready lesson with clear examples and quick practice."
    )

    category = normalize_text(frontmatter.get("category") or "grammar").lower()
    emoji = CATEGORY_EMOJI.get(category, "📘")

    exams = [exam.upper() for exam in to_list(frontmatter.get("exam")) if exam]
    if not exams:
        test = normalize_text(frontmatter.get("test")).upper()
        exams = [test] if test else ["CELPIP"]

    level = normalize_text(frontmatter.get("level") or "")
    level_line = f" | 🧠 Level: {level}" if level else ""

    url = lesson_url(site_url, category, slug)

    message_lines = [
        f"{emoji} *{title}*",
        f"✨ {excerpt}",
        f"🎯 Focus: {category.title()} | 📝 Exam: {' / '.join(exams)}{level_line}",
        f"🔗 {url}",
    ]
    return "\n".join(message_lines)


def build_lesson_interaction(frontmatter: dict[str, Any], slug: str) -> dict[str, Any]:
    title = normalize_text(frontmatter.get("title") or slug.replace("-", " ").title())
    category = normalize_text(frontmatter.get("category") or "grammar").lower()

    prompt_map = {
        "grammar": f"Which grammar point from {title} do you want another example for?",
        "vocabulary": f"Which word or phrase from {title} do you want to use this week?",
        "writing": f"Which writing move from {title} needs another example?",
        "speaking": f"Which speaking move from {title} do you want to practise next?",
        "reading": f"Which reading skill from {title} feels hardest right now?",
        "listening": f"Which listening skill from {title} do you want more practice with?",
    }
    prompt = prompt_map.get(category) or f"Which part of {title} do you want another example for?"
    return {
        "type": "question",
        "prompt": prompt,
    }


def lesson_sort_key(frontmatter: dict[str, Any], slug: str) -> tuple[str, str]:
    date_value = normalize_text(frontmatter.get("date"))
    return (date_value or "9999-12-31", slug)


def load_lessons(include_draft: bool) -> list[dict[str, Any]]:
    lesson_items: list[dict[str, Any]] = []
    for lesson_path in sorted(LESSONS_DIR.glob("*.md")):
        raw = lesson_path.read_text(encoding="utf-8")
        frontmatter, _body = parse_frontmatter(raw)

        slug = lesson_path.stem
        if not include_draft and bool(frontmatter.get("draft", False)):
            continue
        if not is_allowed_lesson(frontmatter, slug):
            continue

        category = normalize_text(frontmatter.get("category") or "grammar").lower()
        title = normalize_text(frontmatter.get("title") or slug.replace("-", " ").title())

        lesson_items.append(
            {
                "slug": slug,
                "title": title,
                "category": category,
                "date": normalize_text(frontmatter.get("date")),
                "frontmatter": frontmatter,
            }
        )

    lesson_items.sort(key=lambda item: lesson_sort_key(item["frontmatter"], item["slug"]))
    return lesson_items


def build_queue(lessons: list[dict[str, Any]], site_url: str, max_lessons: int | None) -> list[dict[str, Any]]:
    selected = lessons[:max_lessons] if max_lessons else lessons
    queue: list[dict[str, Any]] = []

    for index, lesson in enumerate(selected, start=1):
        message = build_lesson_message(lesson["frontmatter"], lesson["slug"], site_url)
        message_hash = hashlib.sha1(message.encode("utf-8")).hexdigest()[:12]
        queue.append(
            {
                "id": f"lesson:{lesson['slug']}:{message_hash}",
                "source": "lesson",
                "position": index,
                "slug": lesson["slug"],
                "title": lesson["title"],
                "category": lesson["category"],
                "date": lesson["date"],
                "message": message,
                "url": lesson_url(site_url, lesson["category"], lesson["slug"]),
                "interaction": build_lesson_interaction(lesson["frontmatter"], lesson["slug"]),
            }
        )

    return queue


def write_outputs(queue: list[dict[str, Any]], output_json: Path, text_output: Path | None) -> None:
    output_json.write_text(json.dumps(queue, indent=2, ensure_ascii=False), encoding="utf-8")

    if text_output:
        text_chunks = [item["message"] for item in queue]
        text_output.write_text("\n\n---\n\n".join(text_chunks), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate WhatsApp-ready lesson summaries for CELPIP/grammar/vocabulary content."
    )
    parser.add_argument("--site-url", default=DEFAULT_SITE_URL, help="Canonical site URL, e.g. https://ieltscorner.ca")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON queue path")
    parser.add_argument(
        "--text-output",
        default=str(DEFAULT_TEXT_OUTPUT),
        help="Optional plain text output separated by --- blocks. Use --text-output '' to disable.",
    )
    parser.add_argument("--max-lessons", type=int, default=0, help="Limit number of lessons (0 = all)")
    parser.add_argument("--include-draft", action="store_true", help="Include draft lessons")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    lessons = load_lessons(include_draft=args.include_draft)
    queue = build_queue(lessons, site_url=args.site_url, max_lessons=(args.max_lessons or None))

    output_json = Path(args.output).resolve()
    output_json.parent.mkdir(parents=True, exist_ok=True)

    text_output: Path | None = None
    if normalize_text(args.text_output):
        text_output = Path(args.text_output).resolve()
        text_output.parent.mkdir(parents=True, exist_ok=True)

    write_outputs(queue, output_json, text_output)

    print(f"Generated {len(queue)} lesson messages.")
    print(f"JSON queue: {output_json}")
    if text_output:
        print(f"Text queue: {text_output}")


if __name__ == "__main__":
    main()
