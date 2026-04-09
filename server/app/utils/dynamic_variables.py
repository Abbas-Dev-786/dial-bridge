import json
import re
from typing import Any, TypedDict

MAX_DYNAMIC_VALUE_LENGTH = 500
MAX_CUSTOM_DYNAMIC_VARIABLES = 50
MAX_CUSTOM_KEY_LENGTH = 48

NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
MULTI_UNDERSCORE_RE = re.compile(r"_+")


class DynamicVariableBuildStats(TypedDict):
    custom_seen: int
    custom_added: int
    dropped_invalid_key: int
    dropped_collision: int
    dropped_limit: int


def _coerce_dynamic_value(value: Any, fallback: str = "") -> str:
    if value is None:
        output = fallback
    elif isinstance(value, bool):
        output = "true" if value else "false"
    elif isinstance(value, (int, float, str)):
        output = str(value)
    else:
        try:
            output = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        except TypeError:
            output = str(value)

    output = output.strip()
    if not output:
        output = fallback

    if len(output) > MAX_DYNAMIC_VALUE_LENGTH:
        output = output[:MAX_DYNAMIC_VALUE_LENGTH]

    return output


def sanitize_custom_dynamic_key(raw_key: Any) -> str | None:
    if raw_key is None:
        return None

    key = str(raw_key).strip().lower()
    if not key:
        return None

    key = NON_ALNUM_RE.sub("_", key)
    key = MULTI_UNDERSCORE_RE.sub("_", key).strip("_")
    if key.startswith("custom_"):
        key = key[len("custom_"):]
    key = key.strip("_")
    if not key:
        return None

    if key[0].isdigit():
        key = f"field_{key}"

    key = key[:MAX_CUSTOM_KEY_LENGTH].strip("_")
    if not key:
        return None

    return f"custom_{key}"


def build_dynamic_variables(
    *,
    contact_name: Any,
    contact_phone: Any,
    contact_company: Any,
    campaign_name: Any,
    custom_fields: dict[str, Any] | None = None,
) -> tuple[dict[str, str], DynamicVariableBuildStats]:
    dynamic_vars = {
        "contact_name": _coerce_dynamic_value(contact_name, fallback="there"),
        "contact_phone": _coerce_dynamic_value(contact_phone, fallback=""),
        "contact_company": _coerce_dynamic_value(contact_company, fallback=""),
        "campaign_name": _coerce_dynamic_value(campaign_name, fallback=""),
    }
    stats: DynamicVariableBuildStats = {
        "custom_seen": 0,
        "custom_added": 0,
        "dropped_invalid_key": 0,
        "dropped_collision": 0,
        "dropped_limit": 0,
    }

    if not isinstance(custom_fields, dict):
        return dynamic_vars, stats

    for raw_key, raw_value in custom_fields.items():
        stats["custom_seen"] += 1

        if stats["custom_added"] >= MAX_CUSTOM_DYNAMIC_VARIABLES:
            stats["dropped_limit"] += 1
            continue

        sanitized_key = sanitize_custom_dynamic_key(raw_key)
        if not sanitized_key:
            stats["dropped_invalid_key"] += 1
            continue

        if sanitized_key in dynamic_vars:
            stats["dropped_collision"] += 1
            continue

        dynamic_vars[sanitized_key] = _coerce_dynamic_value(raw_value, fallback="")
        stats["custom_added"] += 1

    return dynamic_vars, stats
