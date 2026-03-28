from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

try:
    from jsonschema import Draft7Validator
except Exception:  # pragma: no cover - fallback path for constrained environments
    Draft7Validator = None


def load_yaml(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate_with_schema(payload: Any, schema: dict[str, Any]) -> list[str]:
    if Draft7Validator is not None:
        validator = Draft7Validator(schema)
        errors = []
        for error in sorted(validator.iter_errors(payload), key=lambda e: list(e.absolute_path)):
            location = "/".join(str(part) for part in error.absolute_path) or "$"
            errors.append(f"{location}: {error.message}")
        return errors
    return _fallback_validate(payload, schema)


def _fallback_validate(payload: Any, schema: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    _validate_node(payload, schema, path=(), errors=errors)
    return errors


def _validate_node(value: Any, schema: dict[str, Any], path: tuple[Any, ...], errors: list[str]) -> None:
    if not isinstance(schema, dict):
        return

    if "const" in schema and value != schema["const"]:
        errors.append(f"{_format_path(path)}: expected const value {schema['const']!r}")

    if "enum" in schema and value not in schema["enum"]:
        errors.append(f"{_format_path(path)}: value {value!r} not in enum {schema['enum']}")

    if "anyOf" in schema and isinstance(schema["anyOf"], list):
        if not any(not _collect_subschema_errors(value, sub) for sub in schema["anyOf"]):
            errors.append(f"{_format_path(path)}: does not satisfy anyOf constraints")
            return

    if "oneOf" in schema and isinstance(schema["oneOf"], list):
        valid_count = sum(1 for sub in schema["oneOf"] if not _collect_subschema_errors(value, sub))
        if valid_count != 1:
            errors.append(f"{_format_path(path)}: expected exactly one matching oneOf schema, got {valid_count}")
            return

    schema_type = schema.get("type")
    if schema_type is not None and not _matches_type(value, schema_type):
        errors.append(f"{_format_path(path)}: expected type {schema_type}, got {type(value).__name__}")
        return

    if isinstance(value, str):
        pattern = schema.get("pattern")
        if pattern and re.search(pattern, value) is None:
            errors.append(f"{_format_path(path)}: string does not match pattern {pattern!r}")

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        minimum = schema.get("minimum")
        maximum = schema.get("maximum")
        if minimum is not None and value < minimum:
            errors.append(f"{_format_path(path)}: value {value} is below minimum {minimum}")
        if maximum is not None and value > maximum:
            errors.append(f"{_format_path(path)}: value {value} is above maximum {maximum}")

    if isinstance(value, dict):
        _validate_object(value, schema, path, errors)
        return

    if isinstance(value, list):
        _validate_array(value, schema, path, errors)
        return


def _validate_object(
    value: dict[str, Any],
    schema: dict[str, Any],
    path: tuple[Any, ...],
    errors: list[str],
) -> None:
    required = schema.get("required") or []
    for key in required:
        if key not in value:
            errors.append(f"{_format_path(path)}: missing required property {key!r}")

    properties = schema.get("properties") or {}
    additional_properties = schema.get("additionalProperties", True)
    if additional_properties is False:
        for key in value:
            if key not in properties:
                errors.append(f"{_format_path(path + (key,))}: additional property not allowed")

    for key, child in properties.items():
        if key not in value:
            continue
        if isinstance(child, dict):
            _validate_node(value[key], child, path + (key,), errors)


def _validate_array(value: list[Any], schema: dict[str, Any], path: tuple[Any, ...], errors: list[str]) -> None:
    min_items = schema.get("minItems")
    if isinstance(min_items, int) and len(value) < min_items:
        errors.append(f"{_format_path(path)}: expected at least {min_items} items, got {len(value)}")

    if schema.get("uniqueItems"):
        seen: set[str] = set()
        for index, item in enumerate(value):
            token = _unique_token(item)
            if token in seen:
                errors.append(f"{_format_path(path + (index,))}: duplicate item violates uniqueItems")
            seen.add(token)

    item_schema = schema.get("items")
    if isinstance(item_schema, dict):
        for index, item in enumerate(value):
            _validate_node(item, item_schema, path + (index,), errors)


def _collect_subschema_errors(value: Any, schema: dict[str, Any]) -> list[str]:
    sub_errors: list[str] = []
    _validate_node(value, schema, path=(), errors=sub_errors)
    return sub_errors


def _matches_type(value: Any, schema_type: str | list[str]) -> bool:
    if isinstance(schema_type, list):
        return any(_matches_type(value, entry) for entry in schema_type)
    if schema_type == "object":
        return isinstance(value, dict)
    if schema_type == "array":
        return isinstance(value, list)
    if schema_type == "string":
        return isinstance(value, str)
    if schema_type == "integer":
        return isinstance(value, int) and not isinstance(value, bool)
    if schema_type == "number":
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if schema_type == "boolean":
        return isinstance(value, bool)
    if schema_type == "null":
        return value is None
    return True


def _unique_token(value: Any) -> str:
    try:
        return json.dumps(value, sort_keys=True)
    except TypeError:
        return repr(value)


def _format_path(path: tuple[Any, ...]) -> str:
    if not path:
        return "$"
    return "/".join(str(part) for part in path)


def add(a: float | int, b: float | int) -> float | int:
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("add expects numeric inputs")
    return a + b


def subtract(a: float | int, b: float | int) -> float | int:
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("subtract expects numeric inputs")
    return a - b
