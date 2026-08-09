#!/usr/bin/env python3
"""Generate lightweight nLab framework indexes from canonical metadata.

Outputs separate public and dev indexes; no hand-maintained global manual is required.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FW = ROOT / "dev" / "framework"
OUT = ROOT / "dev" / "generated"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def summary(path: Path, obj: dict, dev: bool):
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
        "purpose": data.get("purpose") or data.get("description") or data.get("name"),
    }
    if dev:
        item.update({
            "path": str(path.relative_to(ROOT)),
            "schema_id": md.get("schema_id"),
            "dependencies": md.get("dependencies", []),
            "runtime_modes": md.get("supported_runtime_modes", []),
            "visibility": md.get("visibility", []),
            "component": data.get("component"),
            "compose": data.get("compose", []),
            "button_ids": data.get("button_ids") or data.get("default_buttons") or [],
        })
    return item


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = load(FW / "framework-manifest.json")
    public, dev = [], []
    for path in sorted(FW.rglob("*.json")):
        obj = load(path)
        md = obj.get("metadata", {})
        visibility = md.get("visibility", ["dev"] if "artifact_version" in md else ["dev"])
        if "public" in visibility:
            public.append(summary(path, obj, False))
        if "dev" in visibility or not visibility:
            dev.append(summary(path, obj, True))

    def payload(mode, items):
        return {
            "framework_version": manifest["Data"]["framework_version"],
            "experience_mode": mode,
            "generated_from": "metadata + schemas + registries",
            "count": len(items),
            "items": items,
        }

    (OUT / "framework-index-public.json").write_text(json.dumps(payload("public", public), ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    (OUT / "framework-index-dev.json").write_text(json.dumps(payload("dev", dev), ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

    lines=[f"# framework nLab {manifest['Data']['framework_version']} — index dev", "", "Index généré automatiquement depuis les métadonnées.", ""]
    for x in dev:
        lines += [f"## {x['id']}", f"- Type : `{x['type']}`", f"- Statut : `{x['status']}`", f"- Fichier : `{x['path']}`", f"- Schéma : `{x['schema_id']}`", f"- But : {x['purpose'] or '—'}", ""]
    (OUT / "framework-index-dev.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {len(public)} public and {len(dev)} dev entries in {OUT}")


if __name__ == "__main__":
    main()
