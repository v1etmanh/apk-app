"""Build English translation overlays for the remaining demo-server catalogs.

The Vietnamese source JSON files are never modified. Existing English fields are
reused; only user-facing Vietnamese text is sent to DeepL. Relation/configuration
tables are intentionally excluded from translation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import dotenv_values


DEFAULT_SERVER = Path(r"D:\dream_project\daily_mate_code\demo_server")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def items(payload: Any) -> list[dict[str, Any]]:
    return list(payload.get("data", payload) if isinstance(payload, dict) else payload)


def source_hash(value: Any) -> str:
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def deepl_translate(cfg: dict[str, str], texts: list[str], context: str = "") -> list[str]:
    key = (cfg.get("DEEPL_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("DEEPL_API_KEY is empty")
    base = (cfg.get("DEEPL_API_URL") or "https://api-free.deepl.com").rstrip("/")
    body: dict[str, Any] = {
        "text": texts,
        "source_lang": "VI",
        "target_lang": "EN",
        "preserve_formatting": True,
    }
    if context:
        body["context"] = context
    response = requests.post(
        f"{base}/v2/translate",
        headers={"Authorization": f"DeepL-Auth-Key {key}"},
        json=body,
        timeout=60,
    )
    if not response.ok:
        raise RuntimeError(f"HTTP {response.status_code}: {response.text[:300]}")
    result = response.json().get("translations") or []
    if len(result) != len(texts):
        raise RuntimeError("DeepL returned an unexpected translation count")
    return [str(row.get("text") or "").strip() for row in result]


def translate_unique(
    cfg: dict[str, str], values: list[str], context: str = "Vietnamese food data"
) -> dict[str, str]:
    unique = list(dict.fromkeys(value.strip() for value in values if value.strip()))
    translated: dict[str, str] = {}
    # Small batches reduce API calls while keeping each request easy to retry.
    for start in range(0, len(unique), 25):
        batch = unique[start : start + 25]
        for source, target in zip(batch, deepl_translate(cfg, batch, context)):
            translated[source] = target
        print(f"DeepL values: {min(start + len(batch), len(unique))}/{len(unique)}")
    return translated


def parse_json_string(value: Any, fallback: Any) -> Any:
    if not isinstance(value, str):
        return value if value is not None else fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def ascii_name(value: str) -> str:
    replacements = {
        "Đ": "D",
        "đ": "d",
        "Hồ Chí Minh": "Ho Chi Minh City",
        "Bà Rịa - Vũng Tàu": "Ba Ria - Vung Tau",
        "Thừa Thiên Huế": "Thua Thien Hue",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def base_payload(source_name: str, data: list[dict[str, Any]], providers: dict[str, int]) -> dict[str, Any]:
    return {
        "version": "1.0",
        "language": "en",
        "source": source_name,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(data),
        "failed_count": 0,
        "data": data,
        "failures": [],
        "provider_counts": providers,
        "checkpoint": False,
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)
    print(f"WROTE={path} COUNT={payload['count']}")


def build_ingredients(cfg: dict[str, str], root: Path, out: Path) -> dict[str, dict[str, Any]]:
    source_name = "ingredients.json"
    records = items(load_json(root / source_name))
    category_map = {
        "Dầu & Mỡ": "Oils & Fats",
        "Gia vị": "Seasonings",
        "Hải sản": "Seafood",
        "Ngũ cốc & Tinh bột": "Grains & Starches",
        "Rau củ": "Vegetables",
        "Sữa & Trứng": "Dairy & Eggs",
        "Thịt": "Meat",
        "Trái cây": "Fruits",
        "Đã chế biến": "Processed Foods",
        "Đậu & Hạt": "Legumes & Nuts",
        "Đồ uống": "Beverages",
    }
    unknown = [str(row.get("category") or "").strip() for row in records if str(row.get("category") or "").strip() not in category_map]
    category_map.update(translate_unique(cfg, unknown, "Ingredient category names") if unknown else {})
    data: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    for row in records:
        category = str(row.get("category") or "").strip()
        translated = {
            "id": row["id"],
            "name_en": str(row.get("name_en") or row.get("name") or "").strip(),
            "category_en": category_map.get(category, category),
            "_meta": {"provider": "existing+static", "source_hash": source_hash({"name": row.get("name"), "category": category})},
        }
        data.append(translated)
        by_id[str(row["id"])] = translated
    write_json(out / source_name, base_payload(source_name, data, {"existing": len(data)}))
    return by_id


def build_cooking_methods(cfg: dict[str, str], root: Path, out: Path) -> None:
    source_name = "cooking_methods.json"
    records = items(load_json(root / source_name))
    values = [str(row.get(field) or "").strip() for row in records for field in ("description_vi", "notes", "distinction_key")]
    translated = translate_unique(cfg, values, "Vietnamese cooking method descriptions and notes")
    data = []
    for row in records:
        data.append({
            "method_id": row["method_id"],
            "name_en": str(row.get("name_en") or row.get("method_name") or "").strip(),
            "description_en": translated.get(str(row.get("description_vi") or "").strip(), ""),
            "notes_en": translated.get(str(row.get("notes") or "").strip(), ""),
            "distinction_key_en": translated.get(str(row.get("distinction_key") or "").strip(), ""),
            "_meta": {"provider": "deepl+existing", "source_hash": source_hash(row)},
        })
    write_json(out / source_name, base_payload(source_name, data, {"deepl": len(data), "existing": len(data)}))


def protect_template_placeholders(source: str, target: str) -> str:
    placeholders = re.findall(r"\{[^{}]+\}", source)
    for token in placeholders:
        if token not in target:
            target = f"{target} {token}"
    return target.strip()


def build_advice_templates(cfg: dict[str, str], root: Path, out: Path) -> None:
    source_name = "advice_templates.json"
    records = items(load_json(root / source_name))
    values = [str(row.get(field) or "").strip() for row in records for field in ("template_text", "notes")]
    translated = translate_unique(cfg, values, "Daily Mate health and food advice templates")
    data = []
    for row in records:
        template = str(row.get("template_text") or "").strip()
        notes = str(row.get("notes") or "").strip()
        data.append({
            "id": row["id"],
            "template_text_en": protect_template_placeholders(template, translated.get(template, template)),
            "notes_en": translated.get(notes, notes) if notes else "",
            "lang": "en",
            "_meta": {"provider": "deepl", "source_hash": source_hash(row)},
        })
    write_json(out / source_name, base_payload(source_name, data, {"deepl": len(data)}))


REGION_EN = {"urban_major": "Major Urban Area", "north": "Northern Vietnam", "central": "Central Vietnam", "south": "Southern Vietnam"}
CLIMATE_EN = {"subtropical": "Subtropical", "tropical": "Tropical", "highland": "Highland"}
CUISINE_EN = {"northern": "Northern", "central": "Central", "southern": "Southern"}


def province_overlay(row: dict[str, Any]) -> dict[str, Any]:
    name = str(row.get("province_name") or row.get("name") or "").strip()
    aliases = parse_json_string(row.get("aliases"), [])
    if not isinstance(aliases, list):
        aliases = []
    region = str(row.get("food_region") or "")
    climate = str(row.get("climate_type") or "")
    cuisine = str(row.get("cuisine_culture") or "")
    return {
        "id": row["id"],
        "name_en": ascii_name(name),
        "aliases_en": [ascii_name(str(alias)) for alias in aliases],
        "food_region_en": REGION_EN.get(region, region),
        "climate_type_en": CLIMATE_EN.get(climate, climate),
        "cuisine_culture_en": CUISINE_EN.get(cuisine, cuisine),
        "_meta": {"provider": "deterministic", "source_hash": source_hash(row)},
    }


def build_provinces(root: Path, out: Path) -> dict[str, dict[str, Any]]:
    source_name = "provinces.json"
    records = items(load_json(root / source_name))
    data = [province_overlay(row) for row in records]
    write_json(out / source_name, base_payload(source_name, data, {"deterministic": len(data)}))
    return {str(row["id"]): item for row, item in zip(records, data)}


def build_mobile_ingredients(root: Path, out: Path, ingredients: dict[str, dict[str, Any]]) -> None:
    source_name = "mobile_ingredients.json"
    records = items(load_json(root / source_name))
    data = []
    for row in records:
        translated = ingredients.get(str(row["id"]), {})
        data.append({
            "id": row["id"],
            "name_en": translated.get("name_en", row.get("name", "")),
            "category_en": translated.get("category_en", row.get("category", "")),
            "_meta": {"provider": "ingredients_en", "source_hash": source_hash(row)},
        })
    write_json(out / source_name, base_payload(source_name, data, {"ingredients_en": len(data)}))


def build_mobile_provinces(root: Path, out: Path, provinces: dict[str, dict[str, Any]]) -> None:
    source_name = "mobile_provinces.json"
    records = items(load_json(root / source_name))
    labels = [str(row.get("regional_flavor_label") or "").strip() for row in records]
    cfg = {key: str(value or "") for key, value in dotenv_values(root.parent / ".env").items()}
    labels_en = translate_unique(cfg, labels, "Vietnamese regional flavor labels") if any(labels) else {}
    data = []
    for row in records:
        translated = provinces.get(str(row["id"]), {})
        label = str(row.get("regional_flavor_label") or "").strip()
        data.append({
            "id": row["id"],
            "name_en": translated.get("name_en", ascii_name(str(row.get("name") or ""))),
            "food_region_en": translated.get("food_region_en", REGION_EN.get(str(row.get("food_region") or ""), row.get("food_region", ""))),
            "climate_type_en": translated.get("climate_type_en", CLIMATE_EN.get(str(row.get("climate_type") or ""), row.get("climate_type", ""))),
            "cuisine_culture_en": translated.get("cuisine_culture_en", CUISINE_EN.get(str(row.get("cuisine_culture") or ""), row.get("cuisine_culture", ""))),
            "regional_flavor_label_en": labels_en.get(label, label),
            "_meta": {"provider": "deterministic+deepl", "source_hash": source_hash(row)},
        })
    write_json(out / source_name, base_payload(source_name, data, {"deterministic": len(data), "deepl": len(labels_en)}))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", type=Path, default=DEFAULT_SERVER)
    parser.add_argument("--only", choices=["ingredients", "cooking_methods", "advice_templates", "provinces", "mobile_ingredients", "mobile_provinces", "all"], default="all")
    args = parser.parse_args()
    root = args.server / "data"
    out = root / "translations" / "en"
    cfg = {key: str(value or "") for key, value in dotenv_values(args.server / ".env").items()}
    ingredients = build_ingredients(cfg, root, out) if args.only in ("ingredients", "all", "mobile_ingredients") else {}
    if args.only in ("cooking_methods", "all"):
        build_cooking_methods(cfg, root, out)
    if args.only in ("advice_templates", "all"):
        build_advice_templates(cfg, root, out)
    provinces = build_provinces(root, out) if args.only in ("provinces", "all", "mobile_provinces") else {}
    if args.only in ("mobile_ingredients", "all"):
        if not ingredients:
            ingredients = {str(row["id"]): row for row in items(load_json(out / "ingredients.json"))[0:]} if (out / "ingredients.json").exists() else build_ingredients(cfg, root, out)
        build_mobile_ingredients(root, out, ingredients)
    if args.only in ("mobile_provinces", "all"):
        if not provinces and (out / "provinces.json").exists():
            provinces = {str(row["id"]): row for row in items(load_json(out / "provinces.json"))}
        if not provinces:
            provinces = build_provinces(root, out)
        build_mobile_provinces(root, out, provinces)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
