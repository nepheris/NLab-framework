#!/usr/bin/env python3
"""Generate nLab framework documentation from canonical metadata and help sources.

Public help is editorial (short + long) and comes from help-registry.json.
Dev documentation extends public help with generated technical metadata.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FW = ROOT / "dev" / "framework"
OUT = ROOT / "dev" / "generated"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def help_map():
    registry = load(FW / "help" / "help-registry.json")
    return {x["help_id"]: x for x in registry.get("Data", {}).get("entries", [])}


def public_help(md: dict, data: dict, helps: dict):
    entry = helps.get(md.get("help_id"), {})
    public = entry.get("public", {})
    short = public.get("short_text")
    long = public.get("long_text")
    if not short:
        short = data.get("purpose") or data.get("description") or data.get("name")
    if not long:
        long = short
    return {"short_text": short, "long_text": long, "display": entry.get("display", {})}


def summary(path: Path, obj: dict, dev: bool, helps: dict):
    md = obj.get("metadata", {})
    data = obj.get("Data", {})
    item = {
        "id": md.get("id"),
        "type": md.get("json_type"),
        "category": md.get("category"),
        "status": md.get("status"),
        "artifact_version": md.get("artifact_version") or md.get("version"),
        "introduced_in": md.get("introduced_in"),
        "help_id": md.get("help_id"),
        "tags": md.get("tags", []),
        "help": public_help(md, data, helps),
    }
    if dev:
        item["dev_overlay"] = {
            "path": str(path.relative_to(ROOT)),
            "schema_id": md.get("schema_id"),
            "dependencies": md.get("dependencies", []),
            "runtime_modes": md.get("supported_runtime_modes", []),
            "visibility": md.get("visibility", []),
            "component": data.get("component"),
            "compose": data.get("compose", []),
            "button_ids": data.get("button_ids") or data.get("default_buttons") or [],
            "dev_notes": helps.get(md.get("help_id"), {}).get("dev_notes", []),
        }
    return item


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = load(FW / "framework-manifest.json")
    helps = help_map()
    public, dev = [], []
    for path in sorted(FW.rglob("*.json")):
        obj = load(path)
        md = obj.get("metadata", {})
        visibility = md.get("visibility", ["dev"])
        if "public" in visibility:
            public.append(summary(path, obj, False, helps))
        if "dev" in visibility or not visibility:
            dev.append(summary(path, obj, True, helps))

    def payload(mode, items):
        return {
            "framework_version": manifest["Data"]["framework_version"],
            "experience_mode": mode,
            "generated_from": "help-registry + metadata + schemas + registries",
            "count": len(items),
            "items": items,
        }

    (OUT / "framework-index-public.json").write_text(json.dumps(payload("public", public), ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    (OUT / "framework-index-dev.json").write_text(json.dumps(payload("dev", dev), ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

    public_help_payload = {
        "framework_version": manifest["Data"]["framework_version"],
        "source": "dev/framework/help/help-registry.json",
        "items": [{"id": x["id"], "help_id": x["help_id"], **x["help"]} for x in public if x.get("help_id")],
    }
    (OUT / "framework-help-public.json").write_text(json.dumps(public_help_payload, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

    lines=[f"# framework nLab {manifest['Data']['framework_version']} — aide Dev", "", "La partie publique reste visible; les informations ci-dessous constituent la surcouche technique générée.", ""]
    for x in dev:
        overlay=x.get("dev_overlay", {})
        lines += [
            f"## {x['id']}",
            f"- Aide courte : {x['help'].get('short_text') or '—'}",
            f"- Type : `{x['type']}`",
            f"- Statut : `{x['status']}`",
            f"- Fichier : `{overlay.get('path')}`",
            f"- Schéma : `{overlay.get('schema_id')}`",
            f"- Dépendances : `{', '.join(overlay.get('dependencies', [])) or '—'}`",
            ""
        ]
    (OUT / "framework-index-dev.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {len(public)} public and {len(dev)} dev entries in {OUT}")


if __name__ == "__main__":
    main()
