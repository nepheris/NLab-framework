#!/usr/bin/env python3
"""nLab framework governance validator.

Validates canonical sources, metadata V2, JSON Schemas when jsonschema is
available, cross-registry references, layered-help coverage and selected
single-source-of-truth rules. Legacy V1 debt is summarized in normal mode and
becomes actionable errors with --strict.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from jsonschema import Draft202012Validator, RefResolver
except Exception:  # optional dependency
    Draft202012Validator = RefResolver = None

ROOT = Path(__file__).resolve().parents[2]
FW = ROOT / "dev" / "framework"
MANIFEST_PATH = FW / "framework-manifest.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def walk_json():
    for p in sorted(FW.rglob("*.json")):
        yield p, load(p)


def canonical_path(manifest: dict, key: str) -> Path:
    return FW / manifest["Data"]["canonical"][key]


def collect_ids(path: Path, key: str):
    items = load(path).get("Data", {}).get(key, [])
    return {x.get("id") for x in items if isinstance(x, dict) and x.get("id")}


def add(report, level, code, path, message):
    report[level].append({"code": code, "path": str(path.relative_to(ROOT)), "message": message})


def load_schema_store(schema_registry_path: Path):
    registry = load(schema_registry_path).get("Data", {}).get("schemas", [])
    store, paths = {}, {}
    for entry in registry:
        p = (schema_registry_path.parent / entry["path"]).resolve()
        doc = load(p)
        schema = doc["Data"]
        store[entry["id"]] = schema
        store[schema.get("$id", entry["id"])] = schema
        paths[entry["id"]] = p
    return store, paths


def duplicate_values(values):
    seen, dup = set(), set()
    for value in values:
        if value in seen:
            dup.add(value)
        seen.add(value)
    return dup


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="treat migration debt as errors")
    ap.add_argument("--json", dest="json_out", help="write report JSON to this path")
    args = ap.parse_args()

    report = {"errors": [], "warnings": [], "info": []}
    legacy_files = []
    manifest = load(MANIFEST_PATH)
    canonical = manifest["Data"]["canonical"]

    for name, rel in canonical.items():
        p = FW / rel
        if not p.exists():
            add(report, "errors", "canonical_missing", MANIFEST_PATH, f"{name}: {rel} not found")

    button_path = canonical_path(manifest, "button_registry")
    icon_path = canonical_path(manifest, "icon_registry")
    component_path = canonical_path(manifest, "component_registry")
    theme_path = canonical_path(manifest, "theme_registry")
    schema_registry_path = canonical_path(manifest, "schema_registry")
    help_path = canonical_path(manifest, "help_registry")

    button_doc = load(button_path)
    button_items = button_doc.get("Data", {}).get("buttons", [])
    button_ids_list = [x.get("id") for x in button_items if isinstance(x, dict) and x.get("id")]
    buttons = set(button_ids_list)
    for value in duplicate_values(button_ids_list):
        add(report, "errors", "duplicate_button_id", button_path, value)

    icon_doc = load(icon_path)
    icon_list = icon_doc.get("Data", {}).get("icons", [])
    icons = set(icon_list)
    for value in duplicate_values(icon_list):
        add(report, "errors", "duplicate_icon_id", icon_path, value)

    components = {x.get("id") for x in load(component_path).get("Data", {}).get("components", []) if x.get("id")}
    themes = {x.get("id") for x in load(theme_path).get("Data", {}).get("themes", []) if x.get("id")}
    schema_ids = collect_ids(schema_registry_path, "schemas")
    schema_store, _ = load_schema_store(schema_registry_path)

    help_doc = load(help_path)
    help_entries = help_doc.get("Data", {}).get("entries", [])
    help_ids_list = [x.get("help_id") for x in help_entries if isinstance(x, dict) and x.get("help_id")]
    help_ids = set(help_ids_list)
    for value in duplicate_values(help_ids_list):
        add(report, "errors", "duplicate_help_id", help_path, value)

    default_theme = load(theme_path).get("Data", {}).get("default_theme")
    if default_theme not in themes:
        add(report, "errors", "default_theme_unknown", theme_path, str(default_theme))

    if Draft202012Validator is None:
        add(report, "warnings", "jsonschema_unavailable", MANIFEST_PATH, "pip install jsonschema for full schema validation")

    seen_meta_ids = {}
    used_help_ids = set()
    required_v2 = {"id", "json_type", "scope", "schema_id", "artifact_version", "introduced_in", "status", "date_creation", "date_mise_a_jour", "visibility", "supported_runtime_modes"}

    def check_refs(node, path):
        if isinstance(node, dict):
            for k, v in node.items():
                if k == "button_id" and isinstance(v, str) and v not in buttons:
                    add(report, "errors", "button_unknown", path, v)
                elif k in {"button_ids", "default_buttons"} and isinstance(v, list):
                    for x in v:
                        if isinstance(x, str) and x not in buttons:
                            add(report, "errors", "button_unknown", path, x)
                elif k == "icon" and isinstance(v, str) and v not in icons:
                    add(report, "errors", "icon_unknown", path, v)
                elif k == "compose" and isinstance(v, list):
                    for x in v:
                        cid = x.get("component") if isinstance(x, dict) else None
                        if cid and cid not in components:
                            add(report, "errors", "component_unknown", path, cid)
                check_refs(v, path)
        elif isinstance(node, list):
            for x in node:
                check_refs(x, path)

    for path, obj in walk_json():
        md = obj.get("metadata") if isinstance(obj, dict) else None
        if not isinstance(md, dict):
            add(report, "errors", "metadata_missing", path, "metadata object missing")
            continue
        mid = md.get("id")
        if mid:
            if mid in seen_meta_ids:
                add(report, "errors", "duplicate_id", path, f"also in {seen_meta_ids[mid]}")
            seen_meta_ids[mid] = str(path.relative_to(ROOT))

        missing = required_v2 - set(md)
        legacy = bool(missing)
        if legacy:
            rel = str(path.relative_to(ROOT))
            legacy_files.append({"path": rel, "missing": sorted(missing), "legacy_version": md.get("version")})
            if args.strict:
                add(report, "errors", "metadata_v1_legacy", path, "missing: " + ", ".join(sorted(missing)))
        else:
            schema_id = md.get("schema_id")
            if not schema_id:
                add(report, "errors", "schema_missing", path, "schema_id is required by Metadata V2")
            elif schema_id not in schema_ids and md.get("json_type") != "framework_schema":
                add(report, "errors", "schema_unknown", path, str(schema_id))

        if obj.get("Data", {}).get("framework_version") and path != MANIFEST_PATH:
            add(report, "errors", "duplicate_framework_version", path, "framework_version must exist only in framework-manifest.json")

        help_id = md.get("help_id")
        if help_id:
            used_help_ids.add(help_id)
        if md.get("json_type") == "framework_component_config" and "public" in md.get("visibility", []) and help_id and help_id not in help_ids:
            add(report, "errors" if args.strict else "warnings", "public_help_missing", path, f"{help_id} has no editorial entry in canonical help registry")

        if path.name == "toolbar-full.json":
            for action in obj.get("Data", {}).get("actions", []):
                if isinstance(action, dict) and ("icon" in action or "label" in action or "button_template" in action):
                    add(report, "errors", "toolbar_duplicates_button_chrome", path, str(action))
            if "button_template" in obj.get("Data", {}):
                add(report, "errors", "toolbar_owns_visual_template", path, "button template must be selected by the theme")

        if not legacy and Draft202012Validator is not None and md.get("schema_id") in schema_store:
            schema = schema_store[md["schema_id"]]
            resolver = RefResolver.from_schema(schema, store=schema_store)
            for err in Draft202012Validator(schema, resolver=resolver).iter_errors(obj):
                where = "/".join(map(str, err.absolute_path)) or "root"
                add(report, "errors", "schema_validation", path, f"{where}: {err.message}")

        check_refs(obj, path)

    # Source hygiene: public help wording must not be embedded in templates/runtime.
    for path in sorted(FW.rglob("*")):
        if path.suffix.lower() not in {".html", ".js"} or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        if "data-help-text=" in text:
            add(report, "errors", "embedded_help_text", path, "use data-help-id and canonical help-registry instead")

    for help_id in sorted(help_ids - used_help_ids):
        add(report, "warnings", "unused_help_entry", help_path, help_id)

    if legacy_files and not args.strict:
        add(report, "warnings", "legacy_metadata_summary", MANIFEST_PATH, f"{len(legacy_files)} legacy Metadata V1 artifact(s) remain; run --strict for per-file migration errors")

    result = {
        "framework_version": manifest["Data"]["framework_version"],
        "status": "FAIL" if report["errors"] else "PASS",
        "counts": {k: len(v) for k, v in report.items()},
        "migration_debt": {"legacy_v1_count": len(legacy_files), "legacy_v1_files": legacy_files},
        **report,
    }
    text = json.dumps(result, ensure_ascii=False, indent=2)
    print(text)
    if args.json_out:
        out = Path(args.json_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(text + "\n", encoding="utf-8")
    raise SystemExit(1 if report["errors"] else 0)


if __name__ == "__main__":
    main()
