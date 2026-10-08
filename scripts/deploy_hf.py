"""Deploy the static export (out/) to the Hugging Face Space and verify it.

Environment:
  HF_TOKEN     required – fine-grained token with write access to the Space only
  HF_SPACE_ID  required – "owner/space-name"

Exits non-zero (and the workflow turns red) if the token is missing, the
upload fails, or the deployed status.json does not match this deployment.
"""

import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime, timezone

from huggingface_hub import HfApi, hf_hub_download

OUT_DIR = "out"
ERROR_STAGES = {"BUILD_ERROR", "RUNTIME_ERROR", "CONFIG_ERROR", "NO_APP_FILE"}


def fail(message: str) -> None:
    print(f"::error::{message}")
    sys.exit(1)


def load_json(path: str):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def main() -> None:
    token = os.environ.get("HF_TOKEN", "").strip()
    space_id = os.environ.get("HF_SPACE_ID", "").strip()
    if not token:
        fail("HF_TOKEN ist nicht gesetzt – Repository-Secret 'HF_TOKEN' (Schreibrecht auf den Space) anlegen.")
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", space_id):
        fail("HF_SPACE_ID fehlt oder ist ungültig (Format: owner/space-name).")
    if not os.path.isfile(os.path.join(OUT_DIR, "index.html")):
        fail("out/index.html fehlt – zuerst 'npm run build' ausführen.")

    meta = load_json("data/meta.json") or {}
    reports = load_json("data/reports.json") or []
    status = {
        "deployedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "lastUpdated": meta.get("lastUpdated"),
        "dataAsOf": meta.get("dataAsOf"),
        "latestReport": reports[0].get("id") if reports else None,
        "commit": os.environ.get("GITHUB_SHA"),
        "workflowRun": os.environ.get("GITHUB_RUN_ID"),
    }
    with open(os.path.join(OUT_DIR, "status.json"), "w", encoding="utf-8") as f:
        json.dump(status, f, indent=2)
    # The README front matter is the Space configuration (sdk: static).
    shutil.copyfile("README.md", os.path.join(OUT_DIR, "README.md"))

    api = HfApi(token=token)
    print(f"Lade Static Export nach Space {space_id} hoch ...")
    commit = api.upload_folder(
        repo_id=space_id,
        repo_type="space",
        folder_path=OUT_DIR,
        commit_message=f"Deploy Energy Trend Radar (Daten bis {status['dataAsOf'] or 'unbekannt'})",
        # Remove artefacts of earlier builds (hashed chunks, pages); files uploaded
        # in this commit are kept, .gitattributes is never deleted.
        delete_patterns=["_next/**", "*.html", "*.txt", "status.json"],
    )
    print(f"Commit: {commit.commit_url}")

    downloaded = hf_hub_download(
        repo_id=space_id,
        repo_type="space",
        filename="status.json",
        revision=commit.oid,
        token=token,
        local_dir=tempfile.mkdtemp(),
    )
    deployed = load_json(downloaded) or {}
    if deployed.get("deployedAt") != status["deployedAt"]:
        fail("Verifikation fehlgeschlagen: status.json im Space stammt nicht aus diesem Deployment.")

    # The commit check above proves the files landed; the runtime stage shows whether
    # the Space can serve them (e.g. a broken README front matter gives CONFIG_ERROR).
    try:
        raw_stage = api.get_space_runtime(space_id).stage
        # SpaceStage is a str-Enum; str() would give "SpaceStage.RUNNING", .value gives "RUNNING".
        stage = str(getattr(raw_stage, "value", raw_stage))
    except Exception as exc:
        print(f"::warning::Space-Status nicht abrufbar ({type(exc).__name__})")
        stage = "UNKNOWN"
    print(f"Space-Status: {stage}")
    if stage in ERROR_STAGES:
        fail(f"Space meldet {stage} – Konfiguration (README-Header) und Space-Logs auf huggingface.co prüfen.")
    if stage in ("PAUSED", "STOPPED", "SLEEPING"):
        print(f"::warning::Space ist {stage} – Inhalte sind hochgeladen, werden aber erst nach dem Starten ausgeliefert.")

    print(f"✅ Deployment verifiziert: https://huggingface.co/spaces/{space_id} (Daten bis {status['dataAsOf']})")


if __name__ == "__main__":
    main()
