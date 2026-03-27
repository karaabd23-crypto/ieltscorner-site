from __future__ import annotations

import argparse
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SELENIUM_IMPORT_ERROR: Exception | None = None
try:
    from selenium import webdriver
    from selenium.common.exceptions import TimeoutException
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import WebDriverWait
except ModuleNotFoundError as exc:
    SELENIUM_IMPORT_ERROR = exc
    webdriver = None  # type: ignore[assignment]
    TimeoutException = Exception  # type: ignore[assignment]
    Options = None  # type: ignore[assignment]
    By = None  # type: ignore[assignment]
    Keys = None  # type: ignore[assignment]
    EC = None  # type: ignore[assignment]
    WebDriverWait = None  # type: ignore[assignment]

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_INPUTS = [
    SCRIPT_DIR / "whatsapp_lessons_queue.json",
    SCRIPT_DIR / "whatsapp_telegram_queue.json",
]
DEFAULT_STATE_FILE = SCRIPT_DIR / "whatsapp_post_state.json"
DEFAULT_WEB_URL = "https://web.whatsapp.com/"


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def load_queue_file(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict) and normalize_text(item.get("message"))]
        if isinstance(data, dict) and isinstance(data.get("messages"), list):
            return [item for item in data["messages"] if isinstance(item, dict) and normalize_text(item.get("message"))]
        return []

    text = path.read_text(encoding="utf-8")
    chunks = [chunk.strip() for chunk in text.split("---") if chunk.strip()]
    queue: list[dict[str, Any]] = []
    for index, chunk in enumerate(chunks, start=1):
        queue.append(
            {
                "id": f"text:{path.name}:{index}",
                "source": "text",
                "title": f"Text message {index}",
                "message": chunk,
            }
        )
    return queue


def merge_queues(paths: list[Path]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for path in paths:
        queue = load_queue_file(path)
        for item in queue:
            message = str(item.get("message", "")).strip()
            if not message:
                continue

            item_id = normalize_text(item.get("id"))
            if not item_id:
                item_id = f"fallback:{path.name}:{abs(hash(message))}"
                item["id"] = item_id

            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            merged.append(item)

    return merged


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"posted_ids": [], "history": []}

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"posted_ids": [], "history": []}

        posted_ids = data.get("posted_ids")
        history = data.get("history")
        return {
            "posted_ids": posted_ids if isinstance(posted_ids, list) else [],
            "history": history if isinstance(history, list) else [],
        }
    except json.JSONDecodeError:
        return {"posted_ids": [], "history": []}


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")


def require_selenium() -> None:
    if SELENIUM_IMPORT_ERROR is not None:
        raise SystemExit("Selenium is required for live posting. Install with: pip install selenium")


def wait_for_first(driver: webdriver.Chrome, selectors: list[tuple[str, str]], timeout: int = 25):
    last_error: Exception | None = None
    for by, selector in selectors:
        try:
            return WebDriverWait(driver, timeout).until(EC.presence_of_element_located((by, selector)))
        except TimeoutException as error:
            last_error = error
            continue
    if last_error:
        raise last_error
    raise TimeoutException("No selectors provided.")


def create_driver(profile_dir: str | None, headless: bool) -> webdriver.Chrome:
    require_selenium()
    options = Options()
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--no-sandbox")
    options.add_argument("--start-maximized")

    if profile_dir:
        options.add_argument(f"--user-data-dir={profile_dir}")

    if headless:
        options.add_argument("--headless=new")

    return webdriver.Chrome(options=options)


def find_search_box(driver: webdriver.Chrome):
    selectors = [
        (By.CSS_SELECTOR, "div[aria-label*='Search'][contenteditable='true']"),
        (By.XPATH, "//div[@contenteditable='true' and @data-tab='3']"),
        (By.XPATH, "//div[@contenteditable='true' and @role='textbox'][1]"),
    ]
    return wait_for_first(driver, selectors)


def find_message_box(driver: webdriver.Chrome):
    selectors = [
        (By.CSS_SELECTOR, "footer div[contenteditable='true'][role='textbox']"),
        (By.XPATH, "//footer//div[@contenteditable='true' and @role='textbox']"),
        (By.XPATH, "//div[@contenteditable='true' and @data-tab='10']"),
    ]
    return wait_for_first(driver, selectors)


def open_chat(driver: webdriver.Chrome, target_name: str, timeout_seconds: int) -> None:
    WebDriverWait(driver, timeout_seconds).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    search_box = find_search_box(driver)
    search_box.click()
    search_box.send_keys(Keys.CONTROL, "a")
    search_box.send_keys(Keys.BACKSPACE)
    search_box.send_keys(target_name)
    time.sleep(1.0)
    search_box.send_keys(Keys.ENTER)

    find_message_box(driver)


def send_message(driver: webdriver.Chrome, message: str) -> None:
    box = find_message_box(driver)
    box.click()

    lines = message.splitlines() or [message]
    for idx, line in enumerate(lines):
        if line:
            box.send_keys(line)
        if idx < len(lines) - 1:
            box.send_keys(Keys.SHIFT, Keys.ENTER)

    box.send_keys(Keys.ENTER)


def post_messages(
    driver: webdriver.Chrome | None,
    queue: list[dict[str, Any]],
    state: dict[str, Any],
    state_file: Path,
    delay_seconds: int,
    max_posts: int | None,
    dry_run: bool,
) -> tuple[int, int]:
    posted_ids = set(str(item) for item in state.get("posted_ids", []))
    history = state.get("history", [])
    if not isinstance(history, list):
        history = []

    pending = [item for item in queue if str(item.get("id")) not in posted_ids]
    if max_posts:
        pending = pending[:max_posts]

    if dry_run:
        for item in pending:
            print(f"[dry-run] {item.get('id')} | {item.get('title', 'Untitled')}")
        return 0, len(pending)

    if driver is None:
        raise RuntimeError("Driver is required when dry_run is disabled.")

    sent_count = 0
    for index, item in enumerate(pending, start=1):
        send_message(driver, str(item.get("message", "")))
        item_id = str(item.get("id"))
        posted_ids.add(item_id)

        history.append(
            {
                "id": item_id,
                "source": item.get("source"),
                "title": item.get("title"),
                "posted_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        state["posted_ids"] = sorted(posted_ids)
        state["history"] = history[-5000:]
        save_state(state_file, state)

        sent_count += 1
        print(f"[sent] {index}/{len(pending)} -> {item_id}")

        if index < len(pending):
            time.sleep(max(delay_seconds, 1))

    return sent_count, len(pending)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Post WhatsApp messages from one or more queue files.")
    parser.add_argument(
        "--input",
        nargs="*",
        default=[str(path) for path in DEFAULT_INPUTS],
        help="Queue files (.json or text). Defaults to lesson + telegram queue files.",
    )
    parser.add_argument(
        "--target",
        default=os.getenv("WHATSAPP_TARGET_NAME", ""),
        help="WhatsApp chat or channel name to open in search.",
    )
    parser.add_argument(
        "--web-url",
        default=os.getenv("WHATSAPP_WEB_URL", DEFAULT_WEB_URL),
        help="WhatsApp web URL",
    )
    parser.add_argument(
        "--delay-seconds",
        type=int,
        default=int(os.getenv("WHATSAPP_DELAY_SECONDS", "12")),
        help="Delay between posts",
    )
    parser.add_argument(
        "--max-posts",
        type=int,
        default=int(os.getenv("WHATSAPP_MAX_POSTS", "0")),
        help="Max posts for this run (0 = all pending)",
    )
    parser.add_argument(
        "--state-file",
        default=os.getenv("WHATSAPP_STATE_FILE", str(DEFAULT_STATE_FILE)),
        help="JSON file that tracks posted message IDs",
    )
    parser.add_argument(
        "--profile-dir",
        default=os.getenv("WHATSAPP_PROFILE_DIR", ""),
        help="Optional Chrome profile directory to keep WhatsApp session",
    )
    parser.add_argument("--wait-timeout", type=int, default=90, help="Wait timeout for page elements")
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    parser.add_argument("--dry-run", action="store_true", help="Preview pending posts without sending")
    parser.add_argument("--no-qr-prompt", action="store_true", help="Skip manual QR prompt")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_paths = [Path(path).resolve() for path in args.input if normalize_text(path)]
    queue = merge_queues(input_paths)
    if not queue:
        raise SystemExit("No messages found in input queue files.")

    state_file = Path(args.state_file).resolve()
    state = load_state(state_file)
    max_posts = args.max_posts if args.max_posts > 0 else None

    if args.dry_run:
        _sent_count, pending_count = post_messages(
            driver=None,
            queue=queue,
            state=state,
            state_file=state_file,
            delay_seconds=args.delay_seconds,
            max_posts=max_posts,
            dry_run=True,
        )
        print(f"[done] Dry run complete. Pending items: {pending_count}")
        return

    if not normalize_text(args.target):
        raise SystemExit("Missing --target (or WHATSAPP_TARGET_NAME env var).")
    require_selenium()

    driver = create_driver(profile_dir=normalize_text(args.profile_dir) or None, headless=args.headless)
    try:
        driver.get(args.web_url)
        if not args.no_qr_prompt:
            input("Scan WhatsApp Web QR (if needed), then press Enter to continue...")

        open_chat(driver, args.target, timeout_seconds=args.wait_timeout)
        sent_count, _pending_count = post_messages(
            driver=driver,
            queue=queue,
            state=state,
            state_file=state_file,
            delay_seconds=args.delay_seconds,
            max_posts=max_posts,
            dry_run=False,
        )
        print(f"[done] Sent {sent_count} message(s).")
    finally:
        driver.quit()


if __name__ == "__main__":
    main()
