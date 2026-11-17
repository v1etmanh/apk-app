"""Translate a small dish pilot into a separate English JSON overlay.

The script reads the demo server's .env without printing secrets, keeps the
source JSON untouched, and falls back across configured providers per dish.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote

import requests
from dotenv import dotenv_values


DEFAULT_SERVER = Path(r"D:\dream_project\daily_mate_code\demo_server")
DEFAULT_SOURCE = DEFAULT_SERVER / "data" / "dishes.json"
DEFAULT_OUTPUT = DEFAULT_SERVER / "data" / "translations" / "en" / "pilot_dishes.json"
GLOSSARY_VERSION = "vi-en-food-v2"
GLOSSARY_TERMS = [
    ("phở", "pho"),
    ("bún", "rice vermicelli"),
    ("lẩu", "hot pot"),
    ("nước mắm", "fish sauce"),
    ("mắm tôm", "shrimp paste"),
    ("bạc hà / dọc mùng", "taro stem / elephant ear stem, not mint"),
    ("mướp khía", "ridged luffa"),
    ("nấm bào ngư", "oyster mushroom"),
    ("khổ qua", "bitter melon"),
    ("chả cá", "fish cake"),
    ("cá lóc", "snakehead fish"),
    ("cá thu", "mackerel"),
    ("mực ống", "squid"),
    ("rau càng cua", "pepper elder"),
    ("xào", "stir-fried"),
    ("kho", "braised"),
    ("hấp", "steamed"),
    ("luộc", "boiled"),
    ("nướng", "grilled"),
    ("chiên", "fried"),
    ("gà tiềm", "slow-simmered herbal chicken"),
]


def glossary_context(text: str) -> str:
    folded = text.casefold()
    selected = [f"{source} = {target}" for source, target in GLOSSARY_TERMS if source in folded]
    if not selected:
        return ""
    return "Vietnamese food glossary for terms present in this record:\n" + "; ".join(selected)


def normalize_terminology(result: dict[str, str], title: str, description: str) -> dict[str, str]:
    """Correct known culinary terms only when the Vietnamese source contains them."""
    combined = f"{title} {description}".casefold()
    normalized = dict(result)
    has_bac_ha = "bạc hà" in combined
    has_doc_mung = "dọc mùng" in combined
    if has_bac_ha or has_doc_mung:
        for field in ("title_en", "description_en"):
            if has_bac_ha and has_doc_mung:
                normalized[field] = re.sub(r"\bmint\b", "taro stem", normalized[field], flags=re.IGNORECASE)
                normalized[field] = re.sub(
                    r"\bwater spinach\b", "elephant ear stem", normalized[field], flags=re.IGNORECASE
                )
            else:
                normalized[field] = re.sub(
                    r"\b(?:mint|water spinach)\b",
                    "taro stem",
                    normalized[field],
                    flags=re.IGNORECASE,
                )
    return normalized


class ProviderError(RuntimeError):
    pass


def source_hash(title: str, description: str) -> str:
    raw = f"{title}\0{description}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def parse_llm_json(text: str) -> dict[str, str]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.I)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ProviderError("LLM did not return a JSON object")
    payload = json.loads(cleaned[start : end + 1])
    title = str(payload.get("title_en") or "").strip()
    description = str(payload.get("description_en") or "").strip()
    if not title or not description:
        raise ProviderError("LLM returned empty translation fields")
    return {"title_en": title, "description_en": description}


def llm_prompt(title: str, description: str) -> str:
    context = glossary_context(f"{title} {description}")
    glossary = f"\n{context}" if context else ""
    return (
        "Translate this Vietnamese dish record into natural English. Preserve "
        "proper names and Vietnamese dish terms when useful. Return ONLY valid "
        "JSON with exactly two string fields: title_en and description_en. "
        f"{glossary}"
        f"\nTITLE_VI: {title}\nDESCRIPTION_VI: {description}"
    )


def translate_deepl(cfg: dict[str, str], title: str, description: str) -> dict[str, str]:
    key = (cfg.get("DEEPL_API_KEY") or "").strip()
    if not key:
        raise ProviderError("DEEPL_API_KEY is empty")
    base = (cfg.get("DEEPL_API_URL") or "https://api-free.deepl.com").rstrip("/")
    context = glossary_context(f"{title} {description}")
    body = {"text": [title, description], "source_lang": "VI", "target_lang": "EN"}
    if context:
        body["context"] = context
    response = requests.post(
        f"{base}/v2/translate",
        headers={"Authorization": f"DeepL-Auth-Key {key}"},
        json=body,
        timeout=45,
    )
    if not response.ok:
        raise ProviderError(f"HTTP {response.status_code}: {response.text[:300]}")
    translations = response.json().get("translations") or []
    if len(translations) != 2:
        raise ProviderError("DeepL returned an unexpected translation count")
    result = {
        "title_en": str(translations[0].get("text") or "").strip(),
        "description_en": str(translations[1].get("text") or "").strip(),
    }
    return normalize_terminology(result, title, description)


def translate_llm(
    cfg: dict[str, str],
    url: str,
    key_name: str,
    model: str,
    title: str,
    description: str,
) -> dict[str, str]:
    key = (cfg.get(key_name) or "").strip()
    if not key:
        raise ProviderError(f"{key_name} is empty")
    body: dict[str, Any] = {
        "model": model,
        "temperature": 0,
        "max_completion_tokens": 500,
        "messages": [{"role": "user", "content": llm_prompt(title, description)}],
    }
    if key_name == "GROQ_API_KEY":
        body["reasoning_effort"] = "medium"
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json=body,
        timeout=90,
    )
    if not response.ok:
        raise ProviderError(f"HTTP {response.status_code}: {response.text[:300]}")
    content = response.json()["choices"][0]["message"].get("content") or ""
    return normalize_terminology(parse_llm_json(content), title, description)


def translate_mymemory(cfg: dict[str, str], title: str, description: str) -> dict[str, str]:
    email = (cfg.get("MYMEMORY_EMAIL") or "").strip()

    def one(text: str) -> str:
        params = f"q={quote(text)}&langpair=vi|en"
        if email:
            params += f"&de={quote(email)}"
        response = requests.get(
            f"https://api.mymemory.translated.net/get?{params}", timeout=45
        )
        if not response.ok:
            raise ProviderError(f"HTTP {response.status_code}: {response.text[:300]}")
        translated = str(response.json().get("responseData", {}).get("translatedText") or "").strip()
        if not translated:
            raise ProviderError("MyMemory returned empty text")
        return translated

    return {"title_en": one(title), "description_en": one(description)}


def valid_translation(result: dict[str, str], title: str, description: str) -> bool:
    title_en = result.get("title_en", "").strip()
    description_en = result.get("description_en", "").strip()
    return bool(title_en and description_en and (title_en != title or description_en != description))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--server", type=Path, default=DEFAULT_SERVER)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--checkpoint-every", type=int, default=25)
    parser.add_argument(
        "--groq-model",
        default="",
        help="Override GROQ_MODEL from .env, e.g. llama-3.1-8b-instant",
    )
    parser.add_argument(
        "--quiet-resume",
        action="store_true",
        help="Do not print one line for each record already completed",
    )
    args = parser.parse_args()

    env_path = args.server / ".env"
    cfg = {key: str(value or "") for key, value in dotenv_values(env_path).items()}
    source = json.loads(args.source.read_text(encoding="utf-8"))
    dishes = source.get("data", source) if isinstance(source, dict) else source
    dishes = list(dishes)[: args.limit]

    completed: dict[str, dict[str, Any]] = {}
    failures_by_id: dict[str, dict[str, Any]] = {}
    if args.resume and args.output.exists():
        existing = json.loads(args.output.read_text(encoding="utf-8"))
        completed = {str(item["id"]): item for item in existing.get("data", [])}
        failures_by_id = {str(item["id"]): item for item in existing.get("failures", [])}

    providers: list[tuple[str, Callable[[str, str], dict[str, str]]]] = [
        (
            "deepl",
            lambda title, description: translate_deepl(cfg, title, description),
        ),
        (
            "groq",
            lambda title, description: translate_llm(
                cfg,
                "https://api.groq.com/openai/v1/chat/completions",
                "GROQ_API_KEY",
                args.groq_model or cfg.get("GROQ_MODEL") or "openai/gpt-oss-120b",
                title,
                description,
            ),
        ),
        (
            "nvidia",
            lambda title, description: translate_llm(
                cfg,
                "https://integrate.api.nvidia.com/v1/chat/completions",
                "NVIDIA_API_KEY",
                "meta/llama-3.1-8b-instruct",
                title,
                description,
            ),
        ),
        (
            "openrouter",
            lambda title, description: translate_llm(
                cfg,
                "https://openrouter.ai/api/v1/chat/completions",
                "OPENROUTER_API_KEY",
                "openrouter/free",
                title,
                description,
            ),
        ),
        (
            "mymemory",
            lambda title, description: translate_mymemory(cfg, title, description),
        ),
    ]

    disabled_providers: set[str] = set()

    def ordered_data() -> list[dict[str, Any]]:
        return [completed[str(dish.get("id"))] for dish in dishes if str(dish.get("id")) in completed]

    def save_checkpoint() -> None:
        data = ordered_data()
        provider_counts: dict[str, int] = {}
        for item in data:
            provider = item.get("_meta", {}).get("provider", "unknown")
            provider_counts[provider] = provider_counts.get(provider, 0) + 1
        payload = {
            "version": "1.0",
            "language": "en",
            "source": str(args.source.name),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "count": len(data),
            "failed_count": len(failures_by_id),
            "data": data,
            "failures": list(failures_by_id.values()),
            "provider_counts": provider_counts,
            "checkpoint": True,
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        temp_path = args.output.with_suffix(args.output.suffix + ".tmp")
        temp_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temp_path.replace(args.output)

    def provider_should_disable(error_text: str) -> bool:
        return any(
            marker in error_text
            for marker in ("HTTP 401", "HTTP 402", "HTTP 403", "HTTP 429", "HTTP 456")
        )

    for index, dish in enumerate(dishes, start=1):
        dish_id = str(dish.get("id"))
        title = str(dish.get("title") or "").strip()
        description = str(dish.get("description") or "").strip()
        current_hash = source_hash(title, description)
        previous = completed.get(dish_id)
        if previous and previous.get("_meta", {}).get("source_hash") == current_hash:
            if not args.quiet_resume:
                print(f"[{index}/{len(dishes)}] {dish_id}: RESUME")
            continue
        translated: dict[str, str] | None = None
        selected_provider = ""
        provider_errors: list[str] = []

        for provider_name, provider in providers:
            if provider_name in disabled_providers:
                continue
            try:
                candidate = provider(title, description)
                if not valid_translation(candidate, title, description):
                    raise ProviderError("translation validation failed")
                translated = candidate
                selected_provider = provider_name
                break
            except Exception as exc:  # provider fallback is intentionally broad
                error_text = str(exc)
                provider_errors.append(f"{provider_name}: {error_text[:180]}")
                if provider_should_disable(error_text):
                    disabled_providers.add(provider_name)
                    print(f"provider_disabled={provider_name} reason={error_text[:120]}")

        if translated is None:
            failures_by_id[dish_id] = {"id": dish_id, "errors": provider_errors}
            print(f"[{index}/{len(dishes)}] {dish_id}: FAILED")
            if index % max(args.checkpoint_every, 1) == 0:
                save_checkpoint()
            continue

        completed[dish_id] = {
            "id": dish_id,
            "title_en": translated["title_en"],
            "description_en": translated["description_en"],
            "_meta": {
                "provider": selected_provider,
                "source_hash": current_hash,
                "glossary_version": GLOSSARY_VERSION,
                "status": "translated",
            },
        }
        failures_by_id.pop(dish_id, None)
        print(f"[{index}/{len(dishes)}] {dish_id}: {selected_provider}")
        if index % max(args.checkpoint_every, 1) == 0:
            save_checkpoint()

    save_checkpoint()
    data = ordered_data()
    provider_counts: dict[str, int] = {}
    for item in data:
        provider = item.get("_meta", {}).get("provider", "unknown")
        provider_counts[provider] = provider_counts.get(provider, 0) + 1
    print(f"OUTPUT={args.output}")
    print(f"TRANSLATED={len(data)} FAILED={len(failures_by_id)}")
    print(f"PROVIDERS={json.dumps(provider_counts, ensure_ascii=False)}")
    return 0 if not failures_by_id else 1


if __name__ == "__main__":
    raise SystemExit(main())
