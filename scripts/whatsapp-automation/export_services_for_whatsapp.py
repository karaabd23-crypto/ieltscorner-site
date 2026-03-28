import argparse
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = SCRIPT_DIR / "whatsapp_services_queue.json"
DEFAULT_SITE_URL = "https://ieltscorner.ca"


def build_services(site_url: str) -> list[dict[str, object]]:
    base = site_url.rstrip("/")
    return [
        {
            "id": "service:webinar:weekly-training",
            "source": "service",
            "service": "webinar",
            "title": "Weekly CELPIP Webinar",
            "url": f"{base}/webinar/",
            "message": "\n".join(
                [
                    "🎯 *Weekly CELPIP Webinar*",
                    "✨ Join one live session that clears up one real score problem instead of trying to cover everything at once.",
                    "• One focused teaching topic",
                    "• Clear examples and guided explanation",
                    "• Questions at the end before you study alone again",
                    "• Every Saturday at 6:00 PM PST | $12/session",
                    "",
                    f"🔗 {base}/webinar/",
                ]
            ),
            "interaction": {
                "type": "poll",
                "prompt": "What would help you most in the live webinar this week?",
                "options": [
                    "Writing strategy",
                    "Speaking guidance",
                    "Reading or listening timing",
                ],
                "allow_multiple": False,
            },
        },
        {
            "id": "service:tutoring:private-class",
            "source": "service",
            "service": "tutoring",
            "title": "Private IELTS / CELPIP Class",
            "url": f"{base}/tutoring/",
            "message": "\n".join(
                [
                    "🧑‍🏫 *Private IELTS / CELPIP Class*",
                    "✨ Work directly with Kara Abdolmaleki in a one-on-one session focused on your exact score target and weak points.",
                    "• Personalized strategy",
                    "• Direct corrections on speaking, writing, grammar, and vocabulary",
                    "• Simple action plan before your next session",
                    "• 1:1 coaching ($30) | Google Meet",
                    "",
                    f"🔗 {base}/tutoring/",
                ]
            ),
            "interaction": {
                "type": "question",
                "prompt": "Which weak area would you want fixed first in a private class?",
            },
        },
        {
            "id": "service:essay-correction:direct-feedback",
            "source": "service",
            "service": "essay_correction",
            "title": "Essay Correction",
            "url": f"{base}/essay-correction/",
            "message": "\n".join(
                [
                    "✍️ *Essay Correction*",
                    "✨ Submit one IELTS or CELPIP essay and get score-focused feedback you can use immediately.",
                    "• One complete essay review",
                    "• Detailed comments on grammar, structure, task response, and clarity",
                    "• Good if you want direct feedback before private tutoring",
                    "• Returned by email after you submit",
                    "",
                    f"🔗 {base}/essay-correction/",
                ]
            ),
            "interaction": {
                "type": "poll",
                "prompt": "What would you want essay feedback on first?",
                "options": [
                    "Grammar and language errors",
                    "Structure and organization",
                    "Task response and clarity",
                ],
                "allow_multiple": False,
            },
        },
        {
            "id": "service:ai-writing-lab:subscription",
            "source": "service",
            "service": "ai_writing_lab",
            "title": "CELPIP Writing Lab",
            "url": f"{base}/celpip/writing/ai-feedback/",
            "message": "\n".join(
                [
                    "🤖 *CELPIP Writing Lab*",
                    "✨ Practice timed Task 1 and Task 2 prompts and get scoring, feedback, rewrites, and lesson links.",
                    "• CA$5/month",
                    "• Unlimited monthly submissions",
                    "• 100 CELPIP sample essays included",
                    "• Cancel anytime",
                    "",
                    f"🔗 {base}/celpip/writing/ai-feedback/",
                ]
            ),
            "interaction": {
                "type": "poll",
                "prompt": "What would you use first in the CELPIP Writing Lab?",
                "options": [
                    "Timed Task 1 practice",
                    "Timed Task 2 practice",
                    "Score report and feedback",
                ],
                "allow_multiple": False,
            },
        },
        {
            "id": "service:sample-essays:library",
            "source": "service",
            "service": "sample_essays",
            "title": "100 CELPIP Sample Essays",
            "url": f"{base}/celpip/writing/samples/",
            "message": "\n".join(
                [
                    "📚 *100 CELPIP Sample Essays*",
                    "✨ Read CLB 9+ model answers by task, topic, or level and study what strong writing looks like.",
                    "• 50 Task 1 essays + 50 Task 2 essays",
                    "• Search by task, topic, or CLB level",
                    "• Included in the same CA$5/month writing subscription",
                    "",
                    f"🔗 {base}/celpip/writing/samples/",
                ]
            ),
            "interaction": {
                "type": "question",
                "prompt": "What kind of sample essay would help you most right now?",
            },
        },
        {
            "id": "service:webinar:seat-reminder",
            "source": "service",
            "service": "webinar",
            "title": "Live Webinar Seat",
            "url": f"{base}/webinar/",
            "message": "\n".join(
                [
                    "🗓️ *Save Your Webinar Seat*",
                    "✨ Use the weekly webinar when you want direct answers on one confusing exam skill before paying for longer coaching.",
                    "• Live online",
                    "• One focused score problem",
                    "• Practical Q and A at the end",
                    "• $12/session",
                    "",
                    f"🔗 {base}/webinar/",
                ]
            ),
            "interaction": {
                "type": "question",
                "prompt": "If you joined the live webinar, what would you want clarified first?",
            },
        },
        {
            "id": "service:tutoring:score-plan",
            "source": "service",
            "service": "tutoring",
            "title": "Private Score Plan",
            "url": f"{base}/tutoring/",
            "message": "\n".join(
                [
                    "📈 *Turn a Weak Area into a Score Plan*",
                    "✨ Private classes are best when you already know your score is stuck and want a focused plan for faster improvement.",
                    "• IELTS or CELPIP",
                    "• Speaking, writing, grammar, or vocabulary",
                    "• 1:1 coaching ($30)",
                    "",
                    f"🔗 {base}/tutoring/",
                ]
            ),
            "interaction": {
                "type": "poll",
                "prompt": "Which skill would you fix first in private coaching?",
                "options": [
                    "Writing",
                    "Speaking",
                    "Grammar or vocabulary",
                ],
                "allow_multiple": False,
            },
        },
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate WhatsApp-ready paid service promotions.")
    parser.add_argument("--site-url", default=DEFAULT_SITE_URL, help="Canonical site URL, e.g. https://ieltscorner.ca")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output JSON queue path")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    services = build_services(args.site_url)
    output_path.write_text(json.dumps(services, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Generated {len(services)} service promotions.")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
