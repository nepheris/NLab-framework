#!/usr/bin/env python3
"""nLab framework governance validator.

Checks canonical sources, metadata V2 adoption and cross-registry references.
Legacy V1 metadata is a warning by default and an error with --strict.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FW = ROOT / "dev" / "framework"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def walk_json():
    for p in sorted(FW.rglob("*.json")):
        yield p, load(p)


def collect_ids(path: Path, key: str):
    data = load(path).get("Data", {})
    items = data.get(key, [])
    return {x.get("id") for x in items if isinstance(x, dict) and x.get("id")}


def add(report, level, code, path, message):
    report[level].append({"code": code, "path": str(path.relative_to(ROOT)), "message": message})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true", help="treat legacy metadata as errors")
    ap.add_argument("--json", dest="json_out", help="write report JSON to this path")
    args = ap.parse_args()

    report = {"errors": [], "warnings": [], "info": []}
    manifest_path = FW / "framework-manifest.json"
    manifest = load(manifest_path)
    canonical = manifest["Data"]["canonical"]

    for name, rel in canonical.items():
        p = FW / rel
        if not p.exists():
            add(report, "errors", "canonical_missing", manifest_path, f"{name}: {rel} not found")

    buttons = collect_ids(FW / "ui" / "button-registry.json", "buttons")
    icons = set(load(FW / "ui" / "icon-registry.json").get("Data", {}).get("icons", []))
    components = {x.get("id") for x in load(FW / "components" / "component-registry.json").get("Data", {}).get("components", []) if x.get("id")}
    themes = {x.get("id") for x in load(FW / "themes" / "theme-registry.json").get("Data", {}).get("themes", []) if x.get("id")}
    schemas = {x.get("id") for x in load(FW / "catalogues" / "schema-registry.json").get("Data", {}).get("schemas", []) if x.get("id")}

    default_theme = load(FW / "themes" / "theme-registry.json").get("Data", {}).get("default_theme")
    if default_theme not in themes:
        add(report, "errors", "default_theme_unknown", FW / "themes" / "theme-registry.json", str(default_theme))

    seen_meta_ids = {}
    required_v2 = {"id", "json_type", "scope", "schema_id", "artifact_version", "introduced_in", "status", "date_creation", "date_mise_a_jour", "visibility", "supported_runtime_modes"}

    def check_button_refs(node, path):
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
                check_button_refs(v, path)
        elif isinstance(node, list):
            for x in node:
                check_button_refs(x, path)

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
        if missing:
            level = "errors" if args.strict else "warnings"
            add(report, level, "metadata_v1_legacy", path, "missing: " + ", ".join(sorted(missing)))
        if md.get("schema_id") is None:
            level = "errors" if "artifact_version" in md else "warnings"
            add(report, level, "schema_missing", path, "schema_id is null")
        elif md.get("schema_id") not in schemas and md.get("json_type") != "framework_schema":
            add(report, "errors", "schema_unknown", path, str(md.get("schema_id")))
        if "version" in md:
            add(report, "warnings", "legacy_version_field", path, "use metadata.artifact_version")
        if obj.get("Data", {}).get("framework_version") and path != manifest_path:
            add(report, "errors", "duplicate_framework_version", path, "framework_version must exist only in framework-manifest.json")
        check_button_refs(obj, path)

    result = {
        "framework_version": manifest["Data"]["framework_version"],
        "status": "FAIL" if report["errors"] else "PASS",
        "counts": {k: len(v) for k, v in report.items()},
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
