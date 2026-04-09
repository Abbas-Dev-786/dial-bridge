from app.utils.dynamic_variables import (
    MAX_CUSTOM_DYNAMIC_VARIABLES,
    MAX_DYNAMIC_VALUE_LENGTH,
    build_dynamic_variables,
)


def test_build_dynamic_variables_sanitizes_keys():
    dynamic_vars, stats = build_dynamic_variables(
        contact_name="Pat Lee",
        contact_phone="+15551230000",
        contact_company="Acme",
        campaign_name="Q2 Demo",
        custom_fields={"Interest Level": "High", "Region/State": "CA"},
    )

    assert dynamic_vars["custom_interest_level"] == "High"
    assert dynamic_vars["custom_region_state"] == "CA"
    assert stats["custom_seen"] == 2
    assert stats["custom_added"] == 2


def test_build_dynamic_variables_drops_invalid_and_collision_keys():
    dynamic_vars, stats = build_dynamic_variables(
        contact_name="Pat Lee",
        contact_phone="+15551230000",
        contact_company="Acme",
        campaign_name="Q2 Demo",
        custom_fields={
            "": "empty",
            "Interest Level": "High",
            "interest_level": "Medium",
        },
    )

    assert "custom_interest_level" in dynamic_vars
    assert dynamic_vars["custom_interest_level"] == "High"
    assert stats["custom_seen"] == 3
    assert stats["dropped_invalid_key"] == 1
    assert stats["dropped_collision"] == 1


def test_build_dynamic_variables_truncates_long_values():
    long_value = "x" * (MAX_DYNAMIC_VALUE_LENGTH + 200)
    dynamic_vars, _ = build_dynamic_variables(
        contact_name="Pat Lee",
        contact_phone="+15551230000",
        contact_company="Acme",
        campaign_name="Q2 Demo",
        custom_fields={"bio": long_value},
    )
    assert len(dynamic_vars["custom_bio"]) == MAX_DYNAMIC_VALUE_LENGTH


def test_build_dynamic_variables_applies_custom_field_limit():
    too_many_fields = {f"field_{i}": str(i) for i in range(MAX_CUSTOM_DYNAMIC_VARIABLES + 5)}
    dynamic_vars, stats = build_dynamic_variables(
        contact_name="Pat Lee",
        contact_phone="+15551230000",
        contact_company="Acme",
        campaign_name="Q2 Demo",
        custom_fields=too_many_fields,
    )

    custom_keys = [k for k in dynamic_vars if k.startswith("custom_")]
    assert len(custom_keys) == MAX_CUSTOM_DYNAMIC_VARIABLES
    assert stats["dropped_limit"] == 5
