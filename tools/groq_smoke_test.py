"""Safe Groq API smoke test for the Daily Mate demo server.

This script reads the server .env explicitly, never prints the API key, and
tests both the models endpoint and the same chat-completions request used by
demo_server/rag/answer_generator.py.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path

import requests


DEFAULT_ENV = Path(r"D:\dream_project\daily_mate_code\demo_server\.env")
BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "llama-3.1-8b-instant"


def read_env_value(path: Path, name: str) -> str:
    if not path.exists():
        return ""
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() != name:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        return value.strip()
    return ""


def key_fingerprint(value: str) -> dict[str, object]:
    return {
        "present": bool(value),
        "length": len(value),
        "starts_with_gsk": value.startswith("gsk_"),
        "sha256_8": hashlib.sha256(value.encode()).hexdigest()[:8] if value else None,
    }


def response_detail(response: requests.Response) -> str:
    try:
        payload = response.json()
        return json.dumps(payload, ensure_ascii=False)[:1200]
    except ValueError:
        return response.text[:1200]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", type=Path, default=DEFAULT_ENV)
    args = parser.parse_args()

    dotenv_key = read_env_value(args.env, "GROQ_API_KEY")
    process_key = os.environ.get("GROQ_API_KEY", "").strip()
    api_key = process_key or dotenv_key
    model = read_env_value(args.env, "GROQ_MODEL") or DEFAULT_MODEL

    print("Groq smoke test")
    print(f"env_file={args.env}")
    print(f"model={model}")
    print(f"dotenv_key={json.dumps(key_fingerprint(dotenv_key))}")
    print(f"process_key={json.dumps(key_fingerprint(process_key))}")
    print(f"selected_source={'process environment' if process_key else 'dotenv file'}")

    if not api_key:
        print("RESULT=FAIL: GROQ_API_KEY is empty")
        return 2

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        models = requests.get(f"{BASE_URL}/models", headers=headers, timeout=30)
        print(f"models_status={models.status_code}")
        if models.ok:
            model_ids = [item.get("id") for item in models.json().get("data", [])[:10]]
            print(f"models_sample={json.dumps(model_ids, ensure_ascii=False)}")
        else:
            print(f"models_detail={response_detail(models)}")
    except requests.RequestException as exc:
        print(f"models_network_error={exc}")

    body = {
        "model": model,
        "temperature": 0,
        "max_tokens": 80,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Translate to English and return only the translation: "
                    "Món phở bò truyền thống Việt Nam."
                ),
            }
        ],
    }

    try:
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=body,
            timeout=30,
        )
        print(f"chat_status={response.status_code}")
        if response.ok:
            content = response.json()["choices"][0]["message"]["content"]
            print(f"translation={content.strip()}")
            print("RESULT=OK")
            return 0
        print(f"chat_detail={response_detail(response)}")
        print("RESULT=FAIL")
        return 1
    except requests.RequestException as exc:
        print(f"chat_network_error={exc}")
        print("RESULT=FAIL")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
