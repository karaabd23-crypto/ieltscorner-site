import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[1]

DEFAULT_TELEGRAM_JSON = SCRIPT_DIR / "telegram_posts.json"
DEFAULT_TELEGRAM_MJS = REPO_ROOT / "scripts" / "post-telegram-content.mjs"
DEFAULT_OUTPUT = SCRIPT_DIR / "whatsapp_telegram_queue.json"
DEFAULT_SITE_URL = "https://ieltscorner.ca"

LESSONS_DIR = REPO_ROOT / "src" / "content" / "lessons"
FRONTMATTER_PATTERN = re.compile(r"^---\s*\r?\n(.*?)\r?\n---\s*\r?\n?(.*)$", re.DOTALL)
CATEGORY_PATTERN = re.compile(r"(?m)^category:\s*['\"]?([a-zA-Z-]+)['\"]?\s*$")
PERSIAN_PATTERN = re.compile(r"[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]")
ALLOWED_KEYWORDS = ("celpip", "grammar", "vocab", "vocabulary")


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def contains_persian(text: str) -> bool:
    return bool(PERSIAN_PATTERN.search(text))


def extract_lesson_category(raw: str) -> str:
    match = FRONTMATTER_PATTERN.match(raw)
    if not match:
        return "grammar"

    frontmatter_block = match.group(1)
    category_match = CATEGORY_PATTERN.search(frontmatter_block)
    if not category_match:
        return "grammar"

    return normalize_text(category_match.group(1)).lower() or "grammar"


def build_lesson_lookup() -> dict[str, str]:
    lookup: dict[str, str] = {}
    for lesson_file in LESSONS_DIR.glob("*.md"):
        category = extract_lesson_category(lesson_file.read_text(encoding="utf-8"))
        lookup[lesson_file.stem] = category
    return lookup


def extract_array_literal(source: str, variable_name: str) -> str | None:
    marker = f"const {variable_name} ="
    marker_index = source.find(marker)
    if marker_index == -1:
        return None

    start_index = source.find("[", marker_index)
    if start_index == -1:
        return None

    depth = 0
    in_single = False
    in_double = False
    in_template = False
    escaped = False

    for index in range(start_index, len(source)):
        ch = source[index]

        if escaped:
            escaped = False
            continue

        if in_single:
            if ch == "\\":
                escaped = True
            elif ch == "'":
                in_single = False
            continue

        if in_double:
            if ch == "\\":
                escaped = True
            elif ch == '"':
                in_double = False
            continue

        if in_template:
            if ch == "\\":
                escaped = True
            elif ch == "`":
                in_template = False
            continue

        if ch == "'":
            in_single = True
            continue
        if ch == '"':
            in_double = True
            continue
        if ch == "`":
            in_template = True
            continue

        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return source[start_index : index + 1]

    return None


def eval_js_array_literal(array_literal: str) -> list[dict[str, Any]]:
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
        temp_path = Path(handle.name)
        handle.write(array_literal)

    try:
        node_snippet = (
            "const fs=require('fs');"
            "const vm=require('vm');"
            "const p=process.argv[process.argv.length-1];"
            "const src=fs.readFileSync(p,'utf8');"
            "const data=vm.runInNewContext('(' + src + ')');"
            "process.stdout.write(JSON.stringify(data));"
        )
        result = subprocess.run(
            ["node", "-e", node_snippet, str(temp_path)],
            capture_output=True,
            check=True,
        )
        stdout_text = result.stdout.decode("utf-8", errors="replace")
        parsed = json.loads(stdout_text)
        if isinstance(parsed, list):
            return parsed
        return []
    except FileNotFoundError as exc:
        raise SystemExit("Node.js is required to parse Telegram topic arrays from post-telegram-content.mjs") from exc
    finally:
        temp_path.unlink(missing_ok=True)


def load_topics_from_mjs(mjs_path: Path) -> list[dict[str, Any]]:
    if not mjs_path.exists():
        return []

    source = mjs_path.read_text(encoding="utf-8")
    channel_literal = extract_array_literal(source, "CHANNEL_TOPICS")
    exam_literal = extract_array_literal(source, "EXAM_CHANNEL_TOPICS")

    topics: list[dict[str, Any]] = []
    for literal in (exam_literal, channel_literal):
        if literal:
            topics.extend(eval_js_array_literal(literal))

    return [topic for topic in topics if isinstance(topic, dict)]


def clean_lines(lines: Any) -> list[str]:
    if not isinstance(lines, list):
        return []
    cleaned: list[str] = []
    for line in lines:
        text = normalize_text(line)
        if not text:
            continue
        if contains_persian(text):
            continue
        cleaned.append(text)
    return cleaned


def clean_hashtags(hashtags: Any) -> list[str]:
    if not isinstance(hashtags, list):
        return []

    result: list[str] = []
    for tag in hashtags:
        text = normalize_text(tag)
        if not text or contains_persian(text):
            continue
        if not text.startswith("#"):
            text = f"#{text}"
        text = re.sub(r"[^#A-Za-z0-9_]", "", text)
        if text and text != "#":
            result.append(text)
    return result


def is_allowed_post(entry: dict[str, Any]) -> bool:
    haystack_parts = [
        normalize_text(entry.get("topic_id")),
        normalize_text(entry.get("title")),
        " ".join(entry.get("hashtags", [])),
        " ".join(entry.get("lesson_slugs", [])),
    ]
    haystack = " ".join(haystack_parts).lower()
    return any(keyword in haystack for keyword in ALLOWED_KEYWORDS)


def normalize_quiz(quiz: Any) -> dict[str, Any] | None:
    if not isinstance(quiz, dict):
        return None

    question = normalize_text(quiz.get("question"))
    if not question or contains_persian(question):
        return None

    options_raw = quiz.get("options")
    if not isinstance(options_raw, list):
        return None

    options: list[str] = []
    for option in options_raw:
        text = normalize_text(option)
        if not text or contains_persian(text):
            continue
        options.append(text)

    if len(options) < 2:
        return None

    correct_index = quiz.get("correctIndex")
    if not isinstance(correct_index, int) or correct_index < 0 or correct_index >= len(options):
        correct_index = 0

    explanation = normalize_text(quiz.get("explanation"))
    if contains_persian(explanation):
        explanation = ""

    return {
        "question": question,
        "options": options,
        "correct_index": correct_index,
        "explanation": explanation,
    }


def flatten_topics(topics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    flattened: list[dict[str, Any]] = []
    for topic in topics:
        topic_id = normalize_text(topic.get("id"))
        hashtags = clean_hashtags(topic.get("hashtags"))
        lesson_slugs = [normalize_text(slug) for slug in topic.get("lessonSlugs", []) if normalize_text(slug)]

        for variant in ("lesson", "mini"):
            content = topic.get(variant)
            if not isinstance(content, dict):
                continue

            title = normalize_text(content.get("title"))
            if not title or contains_persian(title):
                continue

            lines = clean_lines(content.get("lines"))
            quiz = normalize_quiz(content.get("quiz"))
            flattened.append(
                {
                    "topic_id": topic_id,
                    "variant": variant,
                    "title": title,
                    "lines": lines,
                    "quiz": quiz,
                    "hashtags": hashtags,
                    "lesson_slugs": lesson_slugs,
                }
            )

    return flattened


def load_posts_from_json(json_path: Path) -> list[dict[str, Any]]:
    if not json_path.exists():
        return []

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        return []

    posts: list[dict[str, Any]] = []
    for index, post in enumerate(payload, start=1):
        if not isinstance(post, dict):
            continue

        text = normalize_text(post.get("text"))
        if not text:
            continue

        lines = [line for line in text.split("\n") if normalize_text(line)]
        title = normalize_text(post.get("title") or (lines[0] if lines else f"Telegram Post {index}"))

        quiz = normalize_quiz(post.get("quiz"))
        posts.append(
            {
                "topic_id": normalize_text(post.get("id") or f"json-{index}"),
                "variant": normalize_text(post.get("variant") or "lesson"),
                "title": title,
                "lines": clean_lines(lines),
                "quiz": quiz,
                "hashtags": clean_hashtags(post.get("hashtags", [])),
                "lesson_slugs": [normalize_text(slug) for slug in post.get("lesson_slugs", []) if normalize_text(slug)],
            }
        )

    return posts


def pick_url(entry: dict[str, Any], lesson_lookup: dict[str, str], site_url: str) -> str:
    clean_site = site_url.rstrip("/")
    for slug in entry.get("lesson_slugs", []):
        category = lesson_lookup.get(slug)
        if category:
            return f"{clean_site}/lessons/{category}/{slug}/"

    text = " ".join(
        [
            normalize_text(entry.get("title")),
            normalize_text(entry.get("topic_id")),
            " ".join(entry.get("hashtags", [])),
        ]
    ).lower()

    if "vocab" in text or "vocabulary" in text:
        return f"{clean_site}/lessons/vocabulary/"
    if "grammar" in text:
        return f"{clean_site}/lessons/grammar/"
    if "celpip" in text:
        return f"{clean_site}/celpip/"

    return f"{clean_site}/lessons/"


def build_message(entry: dict[str, Any], url: str) -> str:
    lines = entry.get("lines", [])
    summary_lines = lines[:4]
    if not summary_lines:
        summary_lines = ["Practical English tip for CELPIP communication and score improvement."]

    icon = "📌" if entry.get("variant") == "mini" else "🚀"
    parts = [
        f"{icon} *{entry['title']}*",
        f"✨ {summary_lines[0]}",
    ]

    for extra_line in summary_lines[1:]:
        parts.append(f"• {extra_line}")

    explanation = normalize_text((entry.get("quiz") or {}).get("explanation"))
    if explanation:
        parts.append(f"💡 {explanation}")

    parts.append("")
    parts.append(f"🔗 {url}")

    hashtags = entry.get("hashtags", [])
    if hashtags:
        parts.append(" ".join(hashtags[:5]))

    return "\n".join(parts)


def build_question_interaction(entry: dict[str, Any]) -> dict[str, Any]:
    title = normalize_text(entry.get("title"))
    prompt = "Which part of this tip do you want another example for?"

    haystack = " ".join(
        [
            normalize_text(entry.get("topic_id")),
            title,
            " ".join(entry.get("hashtags", [])),
        ]
    ).lower()
    if "celpip" in haystack:
        prompt = "Which part of this CELPIP tip do you want another example for?"
    elif "grammar" in haystack:
        prompt = "Which grammar point here do you want another example for?"
    elif "vocab" in haystack or "vocabulary" in haystack:
        prompt = "Which word or phrase here do you want to use this week?"

    if title:
        prompt = f"{prompt} ({title})"

    return {
        "type": "question",
        "prompt": prompt,
    }


def build_interaction(entry: dict[str, Any]) -> dict[str, Any]:
    quiz = entry.get("quiz")
    if quiz:
        if entry.get("variant") == "mini":
            return {
                "type": "poll",
                "question": quiz["question"],
                "options": quiz["options"],
                "allow_multiple": False,
            }
        return {
            "type": "quiz",
            "question": quiz["question"],
            "options": quiz["options"],
            "correct_index": quiz["correct_index"],
            "explanation": quiz.get("explanation", ""),
        }

    return build_question_interaction(entry)


def build_queue(entries: list[dict[str, Any]], lesson_lookup: dict[str, str], site_url: str, max_posts: int | None) -> list[dict[str, Any]]:
    queue: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for entry in entries:
        if not is_allowed_post(entry):
            continue

        if contains_persian(entry["title"]):
            continue

        if not entry["lines"] and not entry.get("quiz"):
            continue

        url = pick_url(entry, lesson_lookup, site_url)
        message = build_message(entry, url)
        if contains_persian(message):
            continue

        item_id = f"telegram:{entry['topic_id']}:{entry['variant']}"
        if item_id in seen_ids:
            continue
        seen_ids.add(item_id)

        queue.append(
            {
                "id": item_id,
                "source": "telegram",
                "topic_id": entry["topic_id"],
                "variant": entry["variant"],
                "title": entry["title"],
                "url": url,
                "message": message,
                "quiz": entry.get("quiz"),
                "interaction": build_interaction(entry),
            }
        )

    if max_posts:
        return queue[:max_posts]
    return queue


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert Telegram CELPIP/grammar/vocabulary posts into WhatsApp-ready messages."
    )
    parser.add_argument("--source-json", default=str(DEFAULT_TELEGRAM_JSON), help="Path to Telegram posts JSON export")
    parser.add_argument("--source-mjs", default=str(DEFAULT_TELEGRAM_MJS), help="Path to scripts/post-telegram-content.mjs")
    parser.add_argument("--site-url", default=DEFAULT_SITE_URL, help="Site URL base")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON queue path")
    parser.add_argument("--max-posts", type=int, default=0, help="Limit queue size (0 = all)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    json_posts = load_posts_from_json(Path(args.source_json).resolve())
    mjs_topics = load_topics_from_mjs(Path(args.source_mjs).resolve())
    mjs_posts = flatten_topics(mjs_topics)

    all_entries = mjs_posts + json_posts
    lesson_lookup = build_lesson_lookup()

    queue = build_queue(
        entries=all_entries,
        lesson_lookup=lesson_lookup,
        site_url=args.site_url,
        max_posts=(args.max_posts or None),
    )

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(queue, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Loaded {len(mjs_posts)} posts from Telegram topic script.")
    print(f"Loaded {len(json_posts)} posts from JSON export.")
    print(f"Generated {len(queue)} WhatsApp Telegram messages.")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
