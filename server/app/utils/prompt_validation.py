import re

ALLOWED_STATIC_PLACEHOLDERS = {
    "contact_name",
    "contact_phone",
    "contact_company",
    "campaign_name",
}

PLACEHOLDER_BLOCK_RE = re.compile(r"\{\{[^{}]*\}\}")
PLACEHOLDER_TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]*$")
GREETING_RE = re.compile(
    r"^\s*(hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)\b",
    re.IGNORECASE,
)
MARKDOWN_PATTERNS = (
    (re.compile(r"```"), "code fences"),
    (re.compile(r"^\s{0,3}#{1,6}\s", re.MULTILINE), "markdown headings"),
    (re.compile(r"^\s{0,3}[-*+]\s", re.MULTILINE), "bullet lists"),
    (re.compile(r"^\s{0,3}\d+\.\s", re.MULTILINE), "numbered lists"),
)


def _is_allowed_placeholder(token: str) -> bool:
    if token in ALLOWED_STATIC_PLACEHOLDERS:
        return True
    return token.startswith("custom_") and len(token) > len("custom_")


def extract_and_validate_placeholders(text: str, field_name: str) -> set[str]:
    matches = PLACEHOLDER_BLOCK_RE.findall(text)
    stripped = PLACEHOLDER_BLOCK_RE.sub("", text)
    if "{{" in stripped or "}}" in stripped:
        raise ValueError(
            f"{field_name} contains malformed placeholders. Use syntax like {{{{contact_name}}}}."
        )

    placeholders: set[str] = set()
    for match in matches:
        token = match[2:-2].strip()
        if not PLACEHOLDER_TOKEN_RE.fullmatch(token):
            raise ValueError(
                f"{field_name} has invalid placeholder '{match}'. "
                "Use lowercase letters, numbers, and underscores only."
            )

        if not _is_allowed_placeholder(token):
            allowed = ", ".join(sorted(ALLOWED_STATIC_PLACEHOLDERS))
            raise ValueError(
                f"{field_name} has unsupported placeholder '{{{{{token}}}}}'. "
                f"Allowed placeholders are: {allowed}, and custom_*."
            )

        placeholders.add(token)

    return placeholders


def _validate_plain_voice_text(text: str, field_name: str) -> str:
    cleaned = text.strip()
    if not cleaned:
        raise ValueError(f"{field_name} cannot be empty.")

    for pattern, description in MARKDOWN_PATTERNS:
        if pattern.search(cleaned):
            raise ValueError(
                f"{field_name} must be plain conversational text and cannot include {description}."
            )

    return cleaned


def validate_system_prompt_text(text: str, field_name: str = "system_prompt") -> str:
    cleaned = _validate_plain_voice_text(text, field_name)
    if len(cleaned) < 50:
        raise ValueError(f"{field_name} must be at least 50 characters.")
    extract_and_validate_placeholders(cleaned, field_name)
    return cleaned


def validate_first_message_text(text: str, field_name: str = "first_message") -> str:
    cleaned = _validate_plain_voice_text(text, field_name)
    if len(cleaned) < 10:
        raise ValueError(f"{field_name} must be at least 10 characters.")
    if not GREETING_RE.match(cleaned):
        raise ValueError(
            f"{field_name} must start with a greeting such as 'Hi' or 'Hello'."
        )

    placeholders = extract_and_validate_placeholders(cleaned, field_name)
    if "contact_name" not in placeholders:
        raise ValueError(f"{field_name} must include {{{{contact_name}}}}.")
    return cleaned
