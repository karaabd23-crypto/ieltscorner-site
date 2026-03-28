from __future__ import annotations

import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SELENIUM_IMPORT_ERROR: Exception | None = None
try:
    from selenium import webdriver
    from selenium.common.exceptions import SessionNotCreatedException, TimeoutException, WebDriverException
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import WebDriverWait
except ModuleNotFoundError as exc:
    SELENIUM_IMPORT_ERROR = exc
    webdriver = None  # type: ignore[assignment]
    SessionNotCreatedException = Exception  # type: ignore[assignment]
    TimeoutException = Exception  # type: ignore[assignment]
    WebDriverException = Exception  # type: ignore[assignment]
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
DEFAULT_SERVICE_INPUT = SCRIPT_DIR / "whatsapp_services_queue.json"
DEFAULT_STATE_FILE = SCRIPT_DIR / "whatsapp_post_state.json"
DEFAULT_WEB_URL = "https://web.whatsapp.com/"
DEFAULT_PROFILE_DIR = Path(r"C:\Users\Karaa\AppData\Local\whatsapp_automation_profile")
DEFAULT_CHROME_PATH = Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
DEFAULT_DEBUGGER_ADDRESS = "127.0.0.1:9222"


class PostVerificationError(RuntimeError):
    """Raised when a sent message cannot be confirmed in the visible timeline."""


def normalize_text(value: Any) -> str:
    return " ".join(str(value or "").split()).strip()


def strip_non_bmp(value: str) -> str:
    return "".join(ch for ch in value if ord(ch) <= 0xFFFF)


def normalize_quiz(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None

    question = normalize_text(value.get("question"))
    if not question:
        return None

    raw_options = value.get("options")
    if not isinstance(raw_options, list):
        return None

    options = [normalize_text(option) for option in raw_options if normalize_text(option)]
    if len(options) < 2:
        return None

    correct_index = value.get("correct_index")
    if not isinstance(correct_index, int):
        correct_index = value.get("correctIndex")
    if not isinstance(correct_index, int) or correct_index < 0 or correct_index >= len(options):
        correct_index = 0

    explanation = normalize_text(value.get("explanation"))
    return {
        "question": question,
        "options": options,
        "correct_index": correct_index,
        "explanation": explanation,
    }


def normalize_interaction(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None

    kind = normalize_text(value.get("type")).lower()
    prompt = normalize_text(value.get("prompt") or value.get("question"))

    if kind == "question":
        if not prompt:
            return None
        return {
            "type": "question",
            "prompt": prompt,
        }

    if kind not in {"poll", "quiz"}:
        return None
    if not prompt:
        return None

    raw_options = value.get("options")
    if not isinstance(raw_options, list):
        return None

    options = [normalize_text(option) for option in raw_options if normalize_text(option)]
    if len(options) < 2:
        return None

    interaction: dict[str, Any] = {
        "type": kind,
        "prompt": prompt,
        "options": options,
    }

    if kind == "poll":
        interaction["allow_multiple"] = bool(value.get("allow_multiple", False))
        return interaction

    correct_index = value.get("correct_index")
    if not isinstance(correct_index, int):
        correct_index = value.get("correctIndex")
    if not isinstance(correct_index, int) or correct_index < 0 or correct_index >= len(options):
        correct_index = 0

    interaction["correct_index"] = correct_index
    interaction["explanation"] = normalize_text(value.get("explanation"))
    return interaction


def queue_item_interaction(item: dict[str, Any]) -> dict[str, Any] | None:
    interaction = normalize_interaction(item.get("interaction"))
    if interaction:
        return interaction

    quiz = normalize_quiz(item.get("quiz"))
    if quiz:
        return {
            "type": "quiz",
            "prompt": quiz["question"],
            "options": quiz["options"],
            "correct_index": quiz["correct_index"],
            "explanation": quiz["explanation"],
        }

    return None


def queue_item_has_content(item: dict[str, Any]) -> bool:
    return bool(normalize_text(item.get("message")) or queue_item_interaction(item))


def queue_item_fallback_seed(item: dict[str, Any]) -> str:
    message = normalize_text(item.get("message"))
    if message:
        return message

    interaction = queue_item_interaction(item)
    if interaction:
        return str(interaction.get("prompt", ""))

    return ""


def load_queue_file(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict) and queue_item_has_content(item)]
        if isinstance(data, dict) and isinstance(data.get("messages"), list):
            return [item for item in data["messages"] if isinstance(item, dict) and queue_item_has_content(item)]
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
            content_seed = queue_item_fallback_seed(item)
            if not content_seed:
                continue

            item_id = normalize_text(item.get("id"))
            if not item_id:
                item_id = f"fallback:{path.name}:{abs(hash(content_seed))}"
                item["id"] = item_id

            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            merged.append(item)

    return merged


def schedule_service_promotions(
    organic_queue: list[dict[str, Any]],
    service_queue: list[dict[str, Any]],
    service_every: int,
) -> list[dict[str, Any]]:
    if service_every <= 0 or not service_queue:
        return list(organic_queue)

    scheduled: list[dict[str, Any]] = []
    service_slot = 0
    service_index = 0
    since_last_service = 0

    for item in organic_queue:
        scheduled.append(item)
        if normalize_text(item.get("source")).lower() == "service":
            continue

        since_last_service += 1
        if since_last_service < service_every:
            continue

        base_service = dict(service_queue[service_index % len(service_queue)])
        service_index += 1
        service_slot += 1
        since_last_service = 0

        base_id = normalize_text(base_service.get("id")) or f"service:{service_slot:03d}"
        base_service["id"] = f"{base_id}:slot:{service_slot:03d}"
        base_service["source"] = "service"
        base_service["scheduled_slot"] = service_slot
        base_service["scheduled_after_id"] = normalize_text(item.get("id"))
        scheduled.append(base_service)

    return scheduled


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


def parse_debugger_address(value: str) -> tuple[str, int]:
    host, _, port = value.partition(":")
    return host or "127.0.0.1", int(port or "9222")


def is_debugger_available(address: str) -> bool:
    host, port = parse_debugger_address(address)
    try:
        with socket.create_connection((host, port), timeout=1.5):
            return True
    except OSError:
        return False


def wait_for_debugger(address: str, timeout_seconds: int) -> bool:
    deadline = time.time() + max(timeout_seconds, 1)
    while time.time() < deadline:
        if is_debugger_available(address):
            return True
        time.sleep(0.5)
    return False


def _build_chrome_options(profile_dir: str | None, headless: bool, debugger_address: str | None = None) -> Options:
    options = Options()
    if debugger_address:
        options.debugger_address = debugger_address
    else:
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        options.add_argument("--start-maximized")
        if profile_dir:
            options.add_argument(f"--user-data-dir={profile_dir}")
        if headless:
            options.add_argument("--headless=new")
    return options


def ensure_persistent_chrome(
    chrome_path: str,
    profile_dir: str,
    debugger_address: str,
    start_url: str,
) -> bool:
    if is_debugger_available(debugger_address):
        return False

    host, port = parse_debugger_address(debugger_address)
    profile_path = Path(profile_dir)
    profile_path.mkdir(parents=True, exist_ok=True)
    launch_args = [
        chrome_path,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile_path}",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--start-maximized",
        start_url,
    ]
    subprocess.Popen(
        launch_args,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0),
    )
    if not wait_for_debugger(debugger_address, timeout_seconds=20):
        raise RuntimeError(f"Persistent Chrome debugger did not start on {host}:{port}.")
    return True


def create_driver(
    profile_dir: str | None,
    headless: bool,
    debugger_address: str | None = None,
) -> webdriver.Chrome:
    require_selenium()
    if debugger_address:
        options = _build_chrome_options(None, headless, debugger_address=debugger_address)
        return webdriver.Chrome(options=options)

    if profile_dir:
        profile_path = Path(profile_dir)
        profile_path.mkdir(parents=True, exist_ok=True)
        # Clean stale Chrome singleton lock artifacts from previous crashes.
        for lock_name in ("SingletonLock", "SingletonCookie", "SingletonSocket"):
            lock_path = profile_path / lock_name
            if lock_path.exists():
                try:
                    lock_path.unlink()
                except OSError:
                    pass

    options = _build_chrome_options(profile_dir, headless)

    try:
        return webdriver.Chrome(options=options)
    except SessionNotCreatedException as error:
        error_text = str(error)
        if not profile_dir or "DevToolsActivePort" not in error_text:
            raise

        broken = Path(profile_dir)
        # Retry once with the same profile after cleaning stale lock files.
        for lock_name in ("SingletonLock", "SingletonCookie", "SingletonSocket"):
            lock_path = broken / lock_name
            if lock_path.exists():
                try:
                    lock_path.unlink()
                except OSError:
                    pass
        retry_options = _build_chrome_options(profile_dir, headless)
        return webdriver.Chrome(options=retry_options)


def find_search_box(driver: webdriver.Chrome, timeout: int = 25):
    selectors = [
        (By.CSS_SELECTOR, "input[role='textbox'][aria-label*='Search or start a new chat']"),
        (By.CSS_SELECTOR, "input[role='textbox'][aria-label='Search']"),
        (By.CSS_SELECTOR, "div[aria-label*='Search'][contenteditable='true']"),
        (By.XPATH, "//div[@contenteditable='true' and @data-tab='3']"),
        (By.XPATH, "//div[@contenteditable='true' and @role='textbox'][1]"),
    ]
    return wait_for_first(driver, selectors, timeout=timeout)


def find_message_box(driver: webdriver.Chrome, timeout: int = 25):
    selectors = [
        (By.CSS_SELECTOR, "footer div[contenteditable='true'][role='textbox']"),
        (By.XPATH, "//footer//div[@contenteditable='true' and @role='textbox']"),
        (By.XPATH, "//footer//*[@contenteditable='true']"),
    ]
    return wait_for_first(driver, selectors, timeout=timeout)


def find_active_chat_title(driver: webdriver.Chrome, timeout: int = 20) -> str:
    # Header structure can vary between regular chats and channel pages.
    wait_for_first(driver, [(By.TAG_NAME, "header")], timeout=timeout)
    candidates: list[str] = []
    selector_list = [
        "header [data-testid='conversation-info-header-chat-title']",
        "header [data-testid='conversation-header-title']",
        "header h1",
        "header span[title]",
    ]
    for selector in selector_list:
        for node in driver.find_elements(By.CSS_SELECTOR, selector):
            text = normalize_text(node.get_attribute("title") or node.text)
            if text:
                candidates.append(text)

    if not candidates:
        return ""

    ignore_pattern = re.compile(r"^\d+\s+(follower|followers|member|members)$", re.IGNORECASE)
    filtered = [item for item in candidates if not ignore_pattern.match(item)]
    pool = filtered or candidates
    pool.sort(key=len, reverse=True)
    return pool[0]


def is_login_screen(driver: webdriver.Chrome) -> bool:
    body_text = normalize_text(driver.find_element(By.TAG_NAME, "body").text).lower()
    login_markers = (
        "scan to log in",
        "log in with phone number",
        "scan the qr code",
        "link to your account",
    )
    return any(marker in body_text for marker in login_markers)


def wait_for_login(driver: webdriver.Chrome, timeout_seconds: int) -> bool:
    deadline = time.time() + max(timeout_seconds, 1)
    while time.time() < deadline:
        if not is_login_screen(driver):
            return True
        time.sleep(1.0)
    return False


def wait_for_composer(driver: webdriver.Chrome, timeout_seconds: int) -> None:
    deadline = time.time() + max(timeout_seconds, 1)
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            find_message_box(driver, timeout=8)
            return
        except Exception as error:
            last_error = error
            time.sleep(1.2)
    if last_error:
        raise last_error
    raise RuntimeError("Composer did not become available in time.")


def wait_for_channel_url(driver: webdriver.Chrome, timeout_seconds: int) -> bool:
    deadline = time.time() + max(timeout_seconds, 1)
    while time.time() < deadline:
        current = normalize_text(driver.current_url)
        if "/channel/" in current:
            return True
        time.sleep(1.0)
    return False


def open_channel_via_sidebar(driver: webdriver.Chrome, target_name: str, timeout_seconds: int) -> str:
    close_open_dialog(driver, timeout_seconds=5)

    active_title = find_active_chat_title(driver, timeout=5)
    if normalize_text(active_title).lower() == normalize_text(target_name).lower():
        try:
            find_message_box(driver, timeout=5)
            return target_name
        except Exception:
            pass

    channels_button = wait_for_first(
        driver,
        [
            (By.CSS_SELECTOR, "button[aria-label='Channels']"),
            (By.XPATH, "//button[@aria-label='Channels']"),
        ],
        timeout=timeout_seconds,
    )
    driver.execute_script("arguments[0].click();", channels_button)

    row = wait_for_first(
        driver,
        [
            (By.XPATH, f"//div[@role='button' and contains(@aria-label, {json.dumps(target_name + ' Channel')})]"),
            (By.XPATH, f"//div[@role='button' and contains(@aria-label, {json.dumps(target_name)})]"),
            (By.XPATH, f"//span[translate(normalize-space(@title), '\u202A\u202C', '')={json.dumps(target_name)}]"),
        ],
        timeout=timeout_seconds,
    )
    driver.execute_script("arguments[0].click();", row)

    wait_for_first(
        driver,
        [
            (By.XPATH, f"//div[@role='textbox' and contains(@aria-label, {json.dumps(target_name)})]"),
            (By.XPATH, "//div[@role='textbox' and @contenteditable='true']"),
        ],
        timeout=timeout_seconds,
    )
    return target_name


def open_chat(driver: webdriver.Chrome, target_name: str, timeout_seconds: int, strict_target: bool = True) -> str:
    WebDriverWait(driver, timeout_seconds).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    search_box = find_search_box(driver, timeout=timeout_seconds)
    search_box.click()
    search_box.send_keys(Keys.CONTROL, "a")
    search_box.send_keys(Keys.BACKSPACE)
    search_box.send_keys(target_name)
    time.sleep(1.0)
    search_box.send_keys(Keys.ENTER)

    find_message_box(driver, timeout=timeout_seconds)
    opened_title = find_active_chat_title(driver, timeout=timeout_seconds)
    if strict_target and normalize_text(opened_title).lower() != normalize_text(target_name).lower():
        raise SystemExit(
            f"Opened chat title '{opened_title}' does not exactly match target '{target_name}'. "
            "Refine --target or use --allow-partial-target."
        )
    return opened_title


def close_open_dialog(driver: webdriver.Chrome, timeout_seconds: int = 10) -> None:
    dialogs = driver.find_elements(By.XPATH, "//*[@role='dialog']")
    if not dialogs:
        return

    deadline = time.time() + max(timeout_seconds, 1)
    while time.time() < deadline:
        dialogs = driver.find_elements(By.XPATH, "//*[@role='dialog']")
        if not dialogs:
            return

        leave_buttons = driver.find_elements(
            By.XPATH,
            "//*[@role='dialog']//*["
            "(self::button or @role='button') and "
            "(normalize-space()='Leave' or @aria-label='Leave')"
            "]",
        )
        if leave_buttons:
            driver.execute_script("arguments[0].click();", leave_buttons[0])
            time.sleep(0.8)
            continue

        close_buttons = driver.find_elements(By.XPATH, "//*[@role='dialog']//button[@aria-label='Close']")
        if close_buttons:
            driver.execute_script("arguments[0].click();", close_buttons[0])
        else:
            driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
        time.sleep(0.8)

    raise RuntimeError("Dialog did not close in time.")


def get_interaction_dialog(driver: webdriver.Chrome, heading: str, timeout_seconds: int = 20):
    wait_for_first(
        driver,
        [
            (By.XPATH, f"//*[@role='dialog']//span[normalize-space()={json.dumps(heading)}]"),
            (By.XPATH, "//*[@role='dialog']"),
        ],
        timeout=timeout_seconds,
    )
    return driver.find_element(By.XPATH, "//*[@role='dialog']")


def get_quiz_dialog(driver: webdriver.Chrome, timeout_seconds: int = 20):
    return get_interaction_dialog(driver, "Create quiz", timeout_seconds=timeout_seconds)


def get_poll_dialog(driver: webdriver.Chrome, timeout_seconds: int = 20):
    return get_interaction_dialog(driver, "Create poll", timeout_seconds=timeout_seconds)


def get_question_dialog(driver: webdriver.Chrome, timeout_seconds: int = 20):
    return get_interaction_dialog(driver, "Create question", timeout_seconds=timeout_seconds)


def find_dialog_textboxes(dialog: Any) -> list[Any]:
    return dialog.find_elements(By.XPATH, ".//div[@role='textbox' and @contenteditable='true']")


def wait_for_dialog_textboxes(
    driver: webdriver.Chrome,
    dialog_getter: Any,
    minimum_count: int,
    timeout_seconds: int = 15,
) -> list[Any]:
    deadline = time.time() + max(timeout_seconds, 1)
    while time.time() < deadline:
        dialog = dialog_getter(driver, timeout_seconds=timeout_seconds)
        boxes = find_dialog_textboxes(dialog)
        if len(boxes) >= minimum_count:
            return boxes
        time.sleep(0.4)
    raise RuntimeError(f"Composer did not expose {minimum_count} textboxes in time.")


def fill_rich_textbox(box: Any, value: str) -> None:
    safe_value = strip_non_bmp(value).strip()
    if not safe_value:
        raise RuntimeError("Cannot fill an empty textbox value.")

    driver = box.parent
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", box)
    driver.execute_script("arguments[0].focus();", box)
    driver.execute_script("arguments[0].click();", box)
    box.send_keys(Keys.CONTROL, "a")
    box.send_keys(Keys.BACKSPACE)
    box.send_keys(safe_value)
    time.sleep(0.25)

    observed = normalize_text(box.text)
    if observed != normalize_text(safe_value):
        raise RuntimeError(f"Textbox fill mismatch. Expected '{safe_value}', got '{observed}'.")


def open_attach_menu_item(driver: webdriver.Chrome, menu_label: str, timeout_seconds: int = 20) -> None:
    close_open_dialog(driver, timeout_seconds=3)

    attach_button = wait_for_first(
        driver,
        [
            (By.CSS_SELECTOR, "button[aria-label='Attach']"),
            (By.XPATH, "//button[@aria-label='Attach']"),
        ],
        timeout=timeout_seconds,
    )
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", attach_button)
    driver.execute_script("arguments[0].click();", attach_button)

    menu_entry = wait_for_first(
        driver,
        [
            (By.XPATH, f"//div[@role='menuitem' and @aria-label={json.dumps(menu_label)}]"),
            (By.XPATH, f"//div[@role='menuitem' and normalize-space()={json.dumps(menu_label)}]"),
        ],
        timeout=timeout_seconds,
    )
    driver.execute_script("arguments[0].click();", menu_entry)


def wait_for_dialog_close(driver: webdriver.Chrome, timeout_seconds: int) -> None:
    deadline = time.time() + max(timeout_seconds, 1)
    while time.time() < deadline:
        if not driver.find_elements(By.XPATH, "//*[@role='dialog']"):
            return
        time.sleep(0.4)
    raise RuntimeError("Dialog did not close after sending.")


def click_send_button(dialog: Any) -> None:
    send_button = dialog.find_element(By.XPATH, ".//*[(@role='button' or self::button) and @aria-label='Send']")
    if normalize_text(send_button.get_attribute("aria-disabled")).lower() == "true":
        raise RuntimeError("Send button is disabled.")
    dialog.parent.execute_script("arguments[0].click();", send_button)


def set_checkbox_state(driver: webdriver.Chrome, checkbox: Any, desired: bool) -> None:
    current = normalize_text(checkbox.get_attribute("aria-checked")).lower() == "true"
    if current == desired:
        return
    driver.execute_script("arguments[0].click();", checkbox)
    time.sleep(0.2)


def open_quiz_composer(driver: webdriver.Chrome, timeout_seconds: int = 20) -> None:
    open_attach_menu_item(driver, "Quiz", timeout_seconds=timeout_seconds)
    get_quiz_dialog(driver, timeout_seconds=timeout_seconds)


def open_poll_composer(driver: webdriver.Chrome, timeout_seconds: int = 20) -> None:
    open_attach_menu_item(driver, "Poll", timeout_seconds=timeout_seconds)
    get_poll_dialog(driver, timeout_seconds=timeout_seconds)


def open_question_composer(driver: webdriver.Chrome, timeout_seconds: int = 20) -> None:
    open_attach_menu_item(driver, "Question", timeout_seconds=timeout_seconds)
    get_question_dialog(driver, timeout_seconds=timeout_seconds)


def send_quiz(driver: webdriver.Chrome, quiz: dict[str, Any], timeout_seconds: int = 25) -> None:
    open_quiz_composer(driver, timeout_seconds=timeout_seconds)

    boxes = wait_for_dialog_textboxes(driver, get_quiz_dialog, minimum_count=3, timeout_seconds=timeout_seconds)
    fill_rich_textbox(boxes[0], quiz["prompt"])

    for option_index, option in enumerate(quiz["options"]):
        boxes = wait_for_dialog_textboxes(
            driver,
            get_quiz_dialog,
            minimum_count=option_index + 2,
            timeout_seconds=timeout_seconds,
        )
        fill_rich_textbox(boxes[option_index + 1], option)

    dialog = get_quiz_dialog(driver, timeout_seconds=timeout_seconds)
    checkboxes = dialog.find_elements(By.XPATH, ".//input[@type='checkbox']")
    correct_index = int(quiz["correct_index"])
    if correct_index >= len(checkboxes):
        raise RuntimeError(
            f"Quiz composer exposed {len(checkboxes)} answer selectors for {len(quiz['options'])} options."
        )
    driver.execute_script("arguments[0].click();", checkboxes[correct_index])
    time.sleep(0.3)

    click_send_button(dialog)
    wait_for_dialog_close(driver, timeout_seconds=timeout_seconds)


def send_poll(driver: webdriver.Chrome, poll: dict[str, Any], timeout_seconds: int = 25) -> None:
    open_poll_composer(driver, timeout_seconds=timeout_seconds)

    boxes = wait_for_dialog_textboxes(driver, get_poll_dialog, minimum_count=3, timeout_seconds=timeout_seconds)
    fill_rich_textbox(boxes[0], poll["prompt"])

    for option_index, option in enumerate(poll["options"]):
        boxes = wait_for_dialog_textboxes(
            driver,
            get_poll_dialog,
            minimum_count=option_index + 2,
            timeout_seconds=timeout_seconds,
        )
        fill_rich_textbox(boxes[option_index + 1], option)

    dialog = get_poll_dialog(driver, timeout_seconds=timeout_seconds)
    multiple_answers = dialog.find_elements(By.XPATH, ".//input[@type='checkbox' and @id='polls-single-option-switch']")
    if multiple_answers:
        set_checkbox_state(driver, multiple_answers[0], bool(poll.get("allow_multiple", False)))

    click_send_button(dialog)
    wait_for_dialog_close(driver, timeout_seconds=timeout_seconds)


def send_question(driver: webdriver.Chrome, question: dict[str, Any], timeout_seconds: int = 25) -> None:
    open_question_composer(driver, timeout_seconds=timeout_seconds)

    dialog = get_question_dialog(driver, timeout_seconds=timeout_seconds)
    boxes = find_dialog_textboxes(dialog)
    if not boxes:
        raise RuntimeError("Question composer did not expose a textbox.")
    fill_rich_textbox(boxes[0], question["prompt"])

    click_send_button(dialog)
    wait_for_dialog_close(driver, timeout_seconds=timeout_seconds)


def send_message(driver: webdriver.Chrome, message: str) -> None:
    box = find_message_box(driver, timeout=30)
    box.click()

    safe_message = strip_non_bmp(message)
    lines = safe_message.splitlines() or [safe_message]
    for idx, line in enumerate(lines):
        if line:
            try:
                box.send_keys(line)
            except WebDriverException as error:
                if "only supports characters in the BMP" not in str(error):
                    raise
                box.send_keys(strip_non_bmp(line))
        if idx < len(lines) - 1:
            box.send_keys(Keys.SHIFT, Keys.ENTER)

    box.send_keys(Keys.ENTER)


def collect_visible_message_texts(driver: webdriver.Chrome) -> list[str]:
    texts: list[str] = []
    body_text = normalize_text(driver.find_element(By.TAG_NAME, "body").text)
    if body_text:
        texts.append(body_text)

    roots = driver.find_elements(By.ID, "main")
    search_root = roots[0] if roots else driver

    selectors = [
        ".//*[@data-testid='selectable-text']",
        ".//*[contains(@class, 'copyable-text')]",
        ".//span[contains(@class, 'selectable-text') and contains(@class, 'copyable-text')]",
        ".//div[@data-testid='msg-container']//span",
        ".//div[@role='row']",
    ]
    seen: set[str] = set()
    for xpath in selectors:
        nodes = search_root.find_elements(By.XPATH, xpath)
        for node in nodes:
            text = normalize_text(node.text)
            if not text:
                continue
            if text in seen:
                continue
            seen.add(text)
            texts.append(text)
    return texts


def message_marker(message: str) -> str:
    lines = [normalize_text(line) for line in message.splitlines() if normalize_text(line)]
    base = lines[0] if lines else normalize_text(message)
    marker = re.sub(r"[*_`~]+", "", base)
    marker = re.sub(r"^[^\w#]+", "", marker, flags=re.UNICODE)
    marker = normalize_text(marker).lower()
    return marker[:140]


def count_marker_matches(messages: list[str], marker: str) -> int:
    if not marker:
        return 0
    return sum(item.lower().count(marker) for item in messages)


def verify_message_posted(
    driver: webdriver.Chrome,
    message: str,
    baseline_count: int,
    timeout_seconds: int,
) -> bool:
    marker = message_marker(message)
    if not marker:
        return False

    deadline = time.time() + max(timeout_seconds, 3)
    while time.time() < deadline:
        visible = collect_visible_message_texts(driver)
        if count_marker_matches(visible, marker) > baseline_count:
            return True
        time.sleep(1.0)
    return False


def post_messages(
    driver: webdriver.Chrome | None,
    queue: list[dict[str, Any]],
    state: dict[str, Any],
    state_file: Path,
    delay_seconds: int,
    max_posts: int | None,
    dry_run: bool,
    verify_send: bool,
    verify_timeout_seconds: int,
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
        close_open_dialog(driver, timeout_seconds=3)

        message = str(item.get("message", "")).strip()
        interaction = queue_item_interaction(item)
        timeline_posts = 0

        if message:
            baseline_count = 0
            if verify_send:
                baseline_count = count_marker_matches(
                    collect_visible_message_texts(driver),
                    message_marker(message),
                )

            send_message(driver, message)
            if verify_send:
                verified = verify_message_posted(
                    driver=driver,
                    message=message,
                    baseline_count=baseline_count,
                    timeout_seconds=verify_timeout_seconds,
                )
                if not verified:
                    raise PostVerificationError(
                        f"Post verification failed for item {item.get('id')}. "
                        "Summary message was not detected in the visible channel/chat timeline."
                    )
            timeline_posts += 1

        if interaction:
            if timeline_posts:
                time.sleep(1.0)

            prompt = str(interaction.get("prompt", "")).strip()
            interaction_baseline_count = 0
            if verify_send:
                interaction_baseline_count = count_marker_matches(
                    collect_visible_message_texts(driver),
                    message_marker(prompt),
                )

            kind = str(interaction.get("type"))
            if kind == "quiz":
                send_quiz(driver, interaction, timeout_seconds=max(verify_timeout_seconds, 20))
            elif kind == "poll":
                send_poll(driver, interaction, timeout_seconds=max(verify_timeout_seconds, 20))
            elif kind == "question":
                send_question(driver, interaction, timeout_seconds=max(verify_timeout_seconds, 20))
            else:
                raise RuntimeError(f"Unsupported interaction type: {kind}")

            if verify_send:
                verified = verify_message_posted(
                    driver=driver,
                    message=prompt,
                    baseline_count=interaction_baseline_count,
                    timeout_seconds=verify_timeout_seconds,
                )
                if not verified:
                    raise PostVerificationError(
                        f"Post verification failed for item {item.get('id')}. "
                        f"{kind.title()} prompt was not detected in the visible channel/chat timeline."
                    )
            timeline_posts += 1

        if timeline_posts == 0:
            continue

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
        descriptor = "post" if timeline_posts == 1 else "posts"
        print(f"[sent] {index}/{len(pending)} -> {item_id} ({timeline_posts} timeline {descriptor})")

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
        "--service-input",
        default=os.getenv("WHATSAPP_SERVICE_INPUT", str(DEFAULT_SERVICE_INPUT)),
        help="Optional JSON queue of paid-service promotions to insert periodically.",
    )
    parser.add_argument(
        "--service-every",
        type=int,
        default=int(os.getenv("WHATSAPP_SERVICE_EVERY", "10")),
        help="Insert one paid-service promotion after every N non-service posts (0 disables service scheduling).",
    )
    parser.add_argument(
        "--target",
        default=os.getenv("WHATSAPP_TARGET_NAME", ""),
        help="WhatsApp chat or channel name to open in search.",
    )
    parser.add_argument(
        "--target-url",
        default=os.getenv("WHATSAPP_TARGET_URL", ""),
        help="Direct WhatsApp chat/channel URL (for example https://web.whatsapp.com/channel/...).",
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
        default=os.getenv("WHATSAPP_PROFILE_DIR", str(DEFAULT_PROFILE_DIR)),
        help="Chrome user-data-dir path to persist WhatsApp session (defaults to local .chrome-profile).",
    )
    parser.add_argument(
        "--chrome-path",
        default=os.getenv("WHATSAPP_CHROME_PATH", str(DEFAULT_CHROME_PATH)),
        help="Chrome executable path for persistent browser launch.",
    )
    parser.add_argument(
        "--debugger-address",
        default=os.getenv("WHATSAPP_DEBUGGER_ADDRESS", DEFAULT_DEBUGGER_ADDRESS),
        help="Debugger address used to attach to the persistent Chrome session.",
    )
    parser.add_argument(
        "--persistent-browser",
        dest="persistent_browser",
        action="store_true",
        default=True,
        help="Attach to or launch one persistent Chrome instance instead of opening a fresh browser each run.",
    )
    parser.add_argument(
        "--fresh-browser",
        dest="persistent_browser",
        action="store_false",
        help="Use a fresh browser session for this run instead of the persistent Chrome instance.",
    )
    parser.add_argument("--wait-timeout", type=int, default=90, help="Wait timeout for page elements")
    parser.add_argument(
        "--login-wait-seconds",
        type=int,
        default=int(os.getenv("WHATSAPP_LOGIN_WAIT_SECONDS", "120")),
        help="How long to wait for WhatsApp login when QR screen is shown.",
    )
    parser.add_argument(
        "--retry-attempts",
        type=int,
        default=int(os.getenv("WHATSAPP_RETRY_ATTEMPTS", "2")),
        help="Number of end-to-end retry attempts for live posting.",
    )
    parser.add_argument("--headless", action="store_true", help="Run browser in headless mode")
    parser.add_argument("--dry-run", action="store_true", help="Preview pending posts without sending")
    parser.add_argument("--no-qr-prompt", action="store_true", help="Skip manual QR prompt")
    parser.add_argument(
        "--no-verify-send",
        action="store_true",
        help="Disable post-send timeline verification checks.",
    )
    parser.add_argument(
        "--verify-timeout",
        type=int,
        default=int(os.getenv("WHATSAPP_VERIFY_TIMEOUT", "45")),
        help="Seconds to wait for per-message in-chat verification.",
    )
    parser.add_argument(
        "--post-login-settle-seconds",
        type=int,
        default=int(os.getenv("WHATSAPP_POST_LOGIN_SETTLE_SECONDS", "6")),
        help="Extra wait after login before opening/searching channel.",
    )
    parser.add_argument(
        "--allow-partial-target",
        action="store_true",
        help="Do not enforce exact opened chat title match.",
    )
    parser.add_argument(
        "--channels-nav",
        dest="channels_nav",
        action="store_true",
        default=True,
        help="Open the target from the left Channels sidebar instead of chat search.",
    )
    parser.add_argument(
        "--search-nav",
        dest="channels_nav",
        action="store_false",
        help="Use WhatsApp search instead of the left Channels sidebar for this run.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    input_paths = [Path(path).resolve() for path in args.input if normalize_text(path)]
    organic_queue = merge_queues(input_paths)
    if not organic_queue:
        raise SystemExit("No messages found in input queue files.")

    service_queue: list[dict[str, Any]] = []
    if normalize_text(args.service_input):
        service_queue = load_queue_file(Path(args.service_input).resolve())
        service_queue = [
            item for item in service_queue if normalize_text(item.get("source")).lower() == "service"
        ]

    queue = schedule_service_promotions(
        organic_queue=organic_queue,
        service_queue=service_queue,
        service_every=max(args.service_every, 0),
    )

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
            verify_send=not args.no_verify_send,
            verify_timeout_seconds=args.verify_timeout,
        )
        print(f"[done] Dry run complete. Pending items: {pending_count}")
        return

    target_name = normalize_text(args.target)
    target_url = normalize_text(args.target_url)
    if not target_name and not target_url:
        raise SystemExit("Missing --target or --target-url.")
    require_selenium()

    attempts = max(args.retry_attempts, 1)
    for attempt in range(1, attempts + 1):
        profile_dir = normalize_text(args.profile_dir)
        if profile_dir:
            Path(profile_dir).mkdir(parents=True, exist_ok=True)
        launched_persistent = False
        debugger_address = normalize_text(args.debugger_address)
        if args.persistent_browser:
            launched_persistent = ensure_persistent_chrome(
                chrome_path=normalize_text(args.chrome_path),
                profile_dir=profile_dir or str(DEFAULT_PROFILE_DIR),
                debugger_address=debugger_address or DEFAULT_DEBUGGER_ADDRESS,
                start_url=target_url or args.web_url,
            )
        driver = create_driver(
            profile_dir=profile_dir or None,
            headless=args.headless,
            debugger_address=(debugger_address or DEFAULT_DEBUGGER_ADDRESS) if args.persistent_browser else None,
        )
        try:
            print(f"[attempt] {attempt}/{attempts}")
            if not args.persistent_browser or launched_persistent:
                driver.get(target_url or args.web_url)

            if is_login_screen(driver):
                print("[login] WhatsApp login screen detected.")
                if not args.no_qr_prompt:
                    try:
                        input("Scan WhatsApp QR now, then press Enter to continue...")
                    except EOFError:
                        pass
                if not wait_for_login(driver, args.login_wait_seconds):
                    raise RuntimeError(
                        f"Still on login screen after {args.login_wait_seconds}s. "
                        "Link this browser session first."
                    )
                # Channel URLs often resolve to /# during login; reopen target after auth.
                if target_url:
                    driver.get(target_url)
                time.sleep(max(args.post_login_settle_seconds, 0))

            if target_url:
                composer_ready = False
                url_loaded = wait_for_channel_url(driver, timeout_seconds=args.wait_timeout)
                if url_loaded:
                    try:
                        wait_for_composer(driver, timeout_seconds=max(12, args.wait_timeout // 2))
                        composer_ready = True
                    except Exception:
                        composer_ready = False

                if composer_ready:
                    opened_title = find_active_chat_title(driver, timeout=args.wait_timeout)
                    print(f"[chat] Opened by URL: {opened_title}")
                    if target_name and not args.allow_partial_target:
                        if normalize_text(opened_title).lower() != target_name.lower():
                            raise RuntimeError(
                                f"Opened chat title '{opened_title}' does not exactly match target '{target_name}'. "
                                "Use --allow-partial-target to bypass this check."
                            )
                else:
                    if not target_name:
                        current = normalize_text(driver.current_url)
                        raise RuntimeError(
                            "Target URL is not writable (no composer found) and no --target name was provided "
                            f"for fallback search. Current URL: {current}"
                        )
                    print("[chat] URL view is not writable. Falling back to chat search by name.")
                    opened_title = open_chat(
                        driver,
                        target_name,
                        timeout_seconds=args.wait_timeout,
                        strict_target=not args.allow_partial_target,
                    )
                    print(f"[chat] Opened by search fallback: {opened_title}")
            else:
                if args.channels_nav:
                    opened_title = open_channel_via_sidebar(
                        driver,
                        target_name,
                        timeout_seconds=args.wait_timeout,
                    )
                    print(f"[chat] Opened via Channels: {opened_title}")
                else:
                    opened_title = open_chat(
                        driver,
                        target_name,
                        timeout_seconds=args.wait_timeout,
                        strict_target=not args.allow_partial_target,
                    )
                    print(f"[chat] Opened: {opened_title}")

            sent_count, _pending_count = post_messages(
                driver=driver,
                queue=queue,
                state=state,
                state_file=state_file,
                delay_seconds=args.delay_seconds,
                max_posts=max_posts,
                dry_run=False,
                verify_send=not args.no_verify_send,
                verify_timeout_seconds=args.verify_timeout,
            )
            print(f"[done] Sent {sent_count} message(s).")
            return
        except Exception as error:
            print(f"[error] Attempt {attempt} failed: {error}")
            if isinstance(error, PostVerificationError):
                print("[error] Not retrying automatically to avoid duplicate posts after uncertain verification.")
                raise
            if attempt >= attempts:
                raise
            time.sleep(2)
        finally:
            driver.quit()

    raise SystemExit(1)


if __name__ == "__main__":
    main()
