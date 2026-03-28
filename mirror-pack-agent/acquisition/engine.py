from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

import yaml


SUCCESS_STATUSES = {
    "direct_mirror_downloaded",
    "source_reference_verified",
    "html_page_snapshotted",
    "pdf_link_discovered_not_downloaded",
}


@dataclass(slots=True)
class AcquisitionSettings:
    output_root: Path
    timeout_seconds: float = 30.0
    user_agent: str = "InspectionOS-Acquisition/1.0"
    max_linked_pdfs: int = 20


class PdfLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[dict[str, str]] = []
        self.page_title = ""
        self._in_title = False
        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if tag == "title":
            self._in_title = True
        if tag == "a" and attrs_dict.get("href"):
            self._current_href = attrs_dict["href"]
            self._current_text = []

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.page_title += data
        if self._current_href is not None:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        if tag == "a" and self._current_href is not None:
            self.links.append(
                {
                    "href": self._current_href,
                    "text": collapse_whitespace("".join(self._current_text)),
                }
            )
            self._current_href = None
            self._current_text = []


class TrackingRedirectHandler(HTTPRedirectHandler):
    def __init__(self) -> None:
        super().__init__()
        self.chain: list[str] = []

    def redirect_request(
        self,
        req: Request,
        fp: Any,
        code: int,
        msg: str,
        headers: Any,
        newurl: str,
    ) -> Request | None:
        self.chain.append(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def run_acquisition(
    source_seed_path: Path,
    form_seed_path: Path | None,
    settings: AcquisitionSettings,
    jurisdictions: list[str] | None = None,
    programs: list[str] | None = None,
    source_record_keys: list[str] | None = None,
) -> dict[str, Any]:
    source_records = load_yaml_list(source_seed_path)
    form_records = load_yaml_list(form_seed_path) if form_seed_path and form_seed_path.exists() else []
    selected_records = filter_source_records(
        source_records,
        jurisdictions=jurisdictions or [],
        programs=programs or [],
        source_record_keys=source_record_keys or [],
    )

    files_dir = settings.output_root / "files"
    manifests_dir = settings.output_root / "manifests"
    reports_dir = settings.output_root / "reports"
    for directory in (files_dir, manifests_dir, reports_dir):
        directory.mkdir(parents=True, exist_ok=True)

    manifests: list[dict[str, Any]] = []
    for record in selected_records:
        manifest = acquire_source_record(record, settings, files_dir)
        manifests.append(manifest)
        manifest_path = manifests_dir / f"{record['source_record_key']}.json"
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    manifests_by_key = {manifest["source_record_key"]: manifest for manifest in manifests}
    enriched_source_records = build_enriched_source_records(selected_records, manifests_by_key)
    relevant_form_records = [
        record for record in form_records if record.get("source_record_key") in manifests_by_key
    ]
    enriched_form_records = build_enriched_form_records(relevant_form_records, manifests_by_key)
    resolution_index = build_resolution_index(enriched_source_records)
    summary = build_summary(manifests, selected_records, relevant_form_records)

    (reports_dir / "source_records.enriched.yaml").write_text(
        yaml.safe_dump(enriched_source_records, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )
    (reports_dir / "form_records.enriched.yaml").write_text(
        yaml.safe_dump(enriched_form_records, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )
    (reports_dir / "resolution_index.json").write_text(
        json.dumps(resolution_index, indent=2),
        encoding="utf-8",
    )
    (reports_dir / "acquisition_summary.json").write_text(
        json.dumps(summary, indent=2),
        encoding="utf-8",
    )

    return {
        "summary": summary,
        "manifests": manifests,
        "enriched_source_records_path": str(reports_dir / "source_records.enriched.yaml"),
        "enriched_form_records_path": str(reports_dir / "form_records.enriched.yaml"),
        "resolution_index_path": str(reports_dir / "resolution_index.json"),
    }


def load_yaml_list(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or []
    if not isinstance(data, list):
        raise ValueError(f"Expected a YAML list in {path}")
    return data


def filter_source_records(
    records: list[dict[str, Any]],
    jurisdictions: list[str],
    programs: list[str],
    source_record_keys: list[str],
) -> list[dict[str, Any]]:
    normalized_jurisdictions = {normalize_scope_value(value) for value in jurisdictions}
    normalized_programs = {normalize_scope_value(value) for value in programs}
    normalized_keys = {value.strip() for value in source_record_keys if value.strip()}

    filtered: list[dict[str, Any]] = []
    for record in records:
        if normalized_keys and record.get("source_record_key") not in normalized_keys:
            continue
        if normalized_jurisdictions:
            jurisdiction_value = normalize_scope_value(str(record.get("jurisdiction_name", "")))
            if jurisdiction_value not in normalized_jurisdictions:
                continue
        if normalized_programs:
            program_value = normalize_scope_value(str(record.get("program_label", "")))
            if program_value not in normalized_programs:
                continue
        filtered.append(record)
    return filtered


def acquire_source_record(
    record: dict[str, Any],
    settings: AcquisitionSettings,
    files_dir: Path,
) -> dict[str, Any]:
    source_urls = split_source_urls(str(record.get("source_url", "")))
    fetched_at = utc_now_iso()
    attempts: list[dict[str, Any]] = []
    discovered_pdf_links: list[dict[str, Any]] = []
    notes: list[str] = []

    for source_url in source_urls:
        attempt, attempt_links = acquire_single_url(record, source_url, settings, files_dir)
        attempts.append(attempt)
        discovered_pdf_links.extend(attempt_links)
        if attempt.get("notes"):
            notes.append(str(attempt["notes"]))

    primary_attempt = choose_primary_attempt(attempts)
    return {
        "source_record_key": record.get("source_record_key"),
        "requested_url": str(record.get("source_url", "")),
        "requested_urls": source_urls,
        "final_url": primary_attempt.get("final_url"),
        "status": derive_overall_status(attempts),
        "aliases": build_aliases(record),
        "fetched_at": fetched_at,
        "content_type": primary_attempt.get("content_type"),
        "sha256": primary_attempt.get("sha256"),
        "file_size": primary_attempt.get("file_size"),
        "stored_path": primary_attempt.get("stored_path"),
        "page_title": primary_attempt.get("page_title"),
        "discovered_pdf_links": discovered_pdf_links,
        "notes": collapse_whitespace(" | ".join(note for note in notes if note)),
        "http_status": primary_attempt.get("http_status"),
        "redirect_chain": primary_attempt.get("redirect_chain", []),
        "source_type_detected": primary_attempt.get("source_type_detected"),
        "local_file_name": record.get("local_file_name"),
        "jurisdiction_name": record.get("jurisdiction_name"),
        "program_label": record.get("program_label"),
        "fetch_attempts": attempts,
    }


def acquire_single_url(
    record: dict[str, Any],
    source_url: str,
    settings: AcquisitionSettings,
    files_dir: Path,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    response = fetch_url(source_url, settings)
    attempt: dict[str, Any] = {
        "requested_url": source_url,
        "final_url": response.get("final_url"),
        "http_status": response.get("http_status"),
        "content_type": response.get("content_type"),
        "redirect_chain": response.get("redirect_chain", []),
        "status": None,
        "stored_path": None,
        "sha256": None,
        "file_size": None,
        "page_title": None,
        "notes": response.get("error"),
        "source_type_detected": response.get("source_type_detected"),
    }
    discovered_links: list[dict[str, Any]] = []

    if response.get("error"):
        attempt["status"] = classify_error_status(response)
        return attempt, discovered_links

    body = response["body"]
    if is_pdf_response(response):
        stored_path, sha256, file_size = store_bytes(
            body,
            files_dir,
            record["source_record_key"],
            choose_primary_filename(record, response["final_url"]),
        )
        attempt.update(
            {
                "status": "direct_mirror_downloaded",
                "stored_path": stored_path,
                "sha256": sha256,
                "file_size": file_size,
            }
        )
        return attempt, discovered_links

    if is_html_response(response):
        html_text = body.decode("utf-8", errors="replace")
        parser = PdfLinkParser()
        parser.feed(html_text)
        page_title = collapse_whitespace(parser.page_title)
        stored_path, sha256, file_size = store_bytes(
            body,
            files_dir,
            record["source_record_key"],
            choose_html_filename(record, response["final_url"]),
        )
        attempt.update(
            {
                "stored_path": stored_path,
                "sha256": sha256,
                "file_size": file_size,
                "page_title": page_title,
            }
        )
        pdf_links = extract_pdf_links(parser.links, response["final_url"])
        if looks_like_manual_review(html_text, response["final_url"], response.get("http_status")):
            attempt["status"] = "requires_manual_review"
            attempt["notes"] = "Public HTML page requires manual review or unsupported interaction."
            return attempt, discovered_links
        if not pdf_links:
            attempt["status"] = "html_page_snapshotted"
            attempt["notes"] = "HTML page fetched, but no downloadable PDF links were found."
            return attempt, discovered_links

        download_count = 0
        for link in pdf_links[: settings.max_linked_pdfs]:
            pdf_response = fetch_url(link["url"], settings)
            link_entry = {
                "text": link["text"],
                "url": link["url"],
                "final_url": pdf_response.get("final_url"),
                "status": None,
                "stored_path": None,
                "content_type": pdf_response.get("content_type"),
                "sha256": None,
                "file_size": None,
                "http_status": pdf_response.get("http_status"),
                "notes": pdf_response.get("error"),
            }
            if pdf_response.get("error"):
                link_entry["status"] = classify_error_status(pdf_response)
                discovered_links.append(link_entry)
                continue
            if not is_pdf_response(pdf_response):
                link_entry["status"] = "wrong_content_type"
                link_entry["notes"] = "Linked artifact did not resolve to a PDF."
                discovered_links.append(link_entry)
                continue
            stored_path, link_sha, link_size = store_bytes(
                pdf_response["body"],
                files_dir,
                record["source_record_key"],
                choose_linked_pdf_filename(link["url"], download_count + 1),
            )
            link_entry.update(
                {
                    "status": "direct_mirror_downloaded",
                    "stored_path": stored_path,
                    "sha256": link_sha,
                    "file_size": link_size,
                    "notes": None,
                }
            )
            download_count += 1
            discovered_links.append(link_entry)

        attempt["status"] = "source_reference_verified" if download_count else "pdf_link_discovered_not_downloaded"
        if download_count:
            attempt["notes"] = f"Downloaded {download_count} linked PDF artifact(s) from HTML page."
        else:
            attempt["notes"] = "HTML page exposed candidate PDF links, but none resolved to downloadable PDFs."
        return attempt, discovered_links

    attempt["status"] = "wrong_content_type"
    attempt["notes"] = "Fetched content was neither PDF nor HTML."
    return attempt, discovered_links


def fetch_url(source_url: str, settings: AcquisitionSettings) -> dict[str, Any]:
    redirect_handler = TrackingRedirectHandler()
    opener = build_opener(redirect_handler)
    request = Request(
        source_url,
        headers={
            "User-Agent": settings.user_agent,
            "Accept": "application/pdf,text/html;q=0.9,*/*;q=0.8",
        },
    )
    try:
        with opener.open(request, timeout=settings.timeout_seconds) as response:
            body = response.read()
            final_url = response.geturl()
            content_type = (response.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            http_status = getattr(response, "status", None) or response.getcode()
            redirect_chain = [source_url]
            for item in redirect_handler.chain:
                if item != redirect_chain[-1]:
                    redirect_chain.append(item)
            if final_url and final_url != redirect_chain[-1]:
                redirect_chain.append(final_url)
            return {
                "body": body,
                "final_url": final_url,
                "content_type": content_type,
                "http_status": http_status,
                "redirect_chain": redirect_chain,
                "source_type_detected": detect_source_type(content_type, final_url),
            }
    except HTTPError as error:
        try:
            error.read()
        finally:
            error.close()
        return {
            "body": b"",
            "final_url": getattr(error, "url", source_url),
            "content_type": (error.headers.get("Content-Type") or "").split(";")[0].strip().lower()
            if getattr(error, "headers", None)
            else None,
            "http_status": error.code,
            "redirect_chain": [source_url, getattr(error, "url", source_url)],
            "source_type_detected": None,
            "error": str(error),
        }
    except URLError as error:
        return {
            "body": b"",
            "final_url": source_url,
            "content_type": None,
            "http_status": None,
            "redirect_chain": [source_url],
            "source_type_detected": None,
            "error": str(error.reason),
        }


def store_bytes(
    payload: bytes,
    files_dir: Path,
    source_record_key: str,
    filename: str,
) -> tuple[str, str, int]:
    safe_name = sanitize_filename(filename)
    target_path = files_dir / f"{source_record_key}__{safe_name}"
    target_path.write_bytes(payload)
    return (
        str(target_path.as_posix()),
        hashlib.sha256(payload).hexdigest(),
        len(payload),
    )


def build_enriched_source_records(
    source_records: list[dict[str, Any]],
    manifests_by_key: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for record in source_records:
        manifest = manifests_by_key[record["source_record_key"]]
        record_copy = dict(record)
        record_copy["acquisition"] = summarize_manifest_for_enrichment(manifest)
        enriched.append(record_copy)
    return enriched


def build_enriched_form_records(
    form_records: list[dict[str, Any]],
    manifests_by_key: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []
    for record in form_records:
        manifest = manifests_by_key.get(record.get("source_record_key"))
        record_copy = dict(record)
        record_copy["acquisition"] = summarize_manifest_for_enrichment(manifest) if manifest else None
        record_copy["download_strengthens_runtime_visibility"] = bool(
            manifest and collect_pdf_artifact_paths(manifest)
        )
        enriched.append(record_copy)
    return enriched


def summarize_manifest_for_enrichment(manifest: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": manifest["status"],
        "requested_url": manifest["requested_url"],
        "final_url": manifest.get("final_url"),
        "fetched_at": manifest["fetched_at"],
        "content_type": manifest.get("content_type"),
        "http_status": manifest.get("http_status"),
        "sha256": manifest.get("sha256"),
        "file_size": manifest.get("file_size"),
        "stored_path": manifest.get("stored_path"),
        "artifact_paths": collect_artifact_paths(manifest),
        "pdf_artifact_paths": collect_pdf_artifact_paths(manifest),
        "page_title": manifest.get("page_title"),
        "notes": manifest.get("notes"),
    }




def build_aliases(record: dict[str, Any]) -> list[str]:
    aliases = []
    local_name = str(record.get("local_file_name") or "").strip()
    if local_name:
        aliases.append(local_name)
    source_key = str(record.get("source_record_key") or "").strip()
    if source_key:
        aliases.append(source_key)
    return sorted({a for a in aliases if a})

def build_resolution_index(enriched_source_records: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "generated_at": utc_now_iso(),
        "entries": [
            {
                "source_record_key": record.get("source_record_key"),
                "local_file_name": record.get("local_file_name"),
                "status": record["acquisition"]["status"],
                "stored_path": record["acquisition"].get("stored_path"),
                "artifact_paths": record["acquisition"].get("artifact_paths", []),
                "pdf_artifact_paths": record["acquisition"].get("pdf_artifact_paths", []),
                "final_url": record["acquisition"].get("final_url"),
            }
            for record in enriched_source_records
        ],
    }


def build_summary(
    manifests: list[dict[str, Any]],
    selected_records: list[dict[str, Any]],
    form_records: list[dict[str, Any]],
) -> dict[str, Any]:
    status_counts: dict[str, int] = {}
    total_downloaded_files = 0
    for manifest in manifests:
        status = manifest["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
        total_downloaded_files += len(collect_artifact_paths(manifest))

    return {
        "generated_at": utc_now_iso(),
        "selected_source_record_count": len(selected_records),
        "selected_form_record_count": len(form_records),
        "manifest_count": len(manifests),
        "status_counts": status_counts,
        "downloaded_artifact_count": total_downloaded_files,
        "ready_source_count": sum(1 for manifest in manifests if manifest["status"] in SUCCESS_STATUSES),
        "source_record_keys": [record["source_record_key"] for record in selected_records],
    }


def collect_artifact_paths(manifest: dict[str, Any]) -> list[str]:
    artifact_paths: list[str] = []
    if manifest.get("stored_path"):
        artifact_paths.append(manifest["stored_path"])
    for entry in manifest.get("discovered_pdf_links", []):
        if entry.get("stored_path"):
            artifact_paths.append(entry["stored_path"])
    return artifact_paths


def collect_pdf_artifact_paths(manifest: dict[str, Any]) -> list[str]:
    artifact_paths: list[str] = []
    if manifest.get("stored_path") and str(manifest.get("content_type", "")).startswith("application/pdf"):
        artifact_paths.append(manifest["stored_path"])
    for entry in manifest.get("discovered_pdf_links", []):
        if entry.get("stored_path"):
            artifact_paths.append(entry["stored_path"])
    return artifact_paths


def split_source_urls(source_url: str) -> list[str]:
    return [item.strip() for item in source_url.split("|") if item.strip()]


def choose_primary_attempt(attempts: list[dict[str, Any]]) -> dict[str, Any]:
    if not attempts:
        return {}
    for preferred_status in (
        "direct_mirror_downloaded",
        "source_reference_verified",
        "html_page_snapshotted",
        "pdf_link_discovered_not_downloaded",
        "requires_manual_login",
        "requires_manual_review",
        "ambiguous_source",
        "superseded_source",
        "obsolete_source",
        "http_error",
        "wrong_content_type",
        "fetch_failed",
    ):
        for attempt in attempts:
            if attempt.get("status") == preferred_status:
                return attempt
    return attempts[0]


def derive_overall_status(attempts: list[dict[str, Any]]) -> str:
    if not attempts:
        return "fetch_failed"
    for preferred_status in (
        "direct_mirror_downloaded",
        "source_reference_verified",
        "html_page_snapshotted",
        "pdf_link_discovered_not_downloaded",
        "requires_manual_login",
        "requires_manual_review",
        "ambiguous_source",
        "superseded_source",
        "obsolete_source",
        "http_error",
        "wrong_content_type",
        "fetch_failed",
    ):
        if any(attempt.get("status") == preferred_status for attempt in attempts):
            return preferred_status
    return "fetch_failed"


def is_pdf_response(response: dict[str, Any]) -> bool:
    content_type = response.get("content_type") or ""
    final_url = str(response.get("final_url") or "")
    return content_type == "application/pdf" or strip_query(final_url).lower().endswith(".pdf")


def is_html_response(response: dict[str, Any]) -> bool:
    return str(response.get("content_type") or "").startswith("text/html")


def detect_source_type(content_type: str | None, final_url: str | None) -> str | None:
    if not content_type and not final_url:
        return None
    if content_type == "application/pdf" or strip_query(str(final_url or "")).lower().endswith(".pdf"):
        return "pdf"
    if content_type and content_type.startswith("text/html"):
        return "html"
    return "other"


def classify_error_status(response: dict[str, Any]) -> str:
    http_status = response.get("http_status")
    if http_status in {401, 403}:
        return "requires_manual_login"
    if isinstance(http_status, int):
        return "http_error"
    return "fetch_failed"


def choose_primary_filename(record: dict[str, Any], final_url: str) -> str:
    local_file_name = str(record.get("local_file_name") or "").strip()
    if local_file_name:
        return local_file_name
    url_name = Path(urlparse(final_url).path).name
    return url_name or "artifact.pdf"


def choose_html_filename(record: dict[str, Any], final_url: str) -> str:
    url_name = Path(urlparse(final_url).path).name or "page"
    if "." not in url_name:
        url_name = f"{url_name}.html"
    return f"{record['source_record_key']}__{url_name}"


def choose_linked_pdf_filename(link_url: str, index: int) -> str:
    url_name = Path(urlparse(link_url).path).name
    if not url_name.lower().endswith(".pdf"):
        url_name = f"linked_{index}.pdf"
    return f"linked_{index}__{url_name}"


def extract_pdf_links(links: list[dict[str, str]], base_url: str) -> list[dict[str, str]]:
    discovered: list[dict[str, str]] = []
    seen: set[str] = set()
    for link in links:
        href = link.get("href") or ""
        absolute_url = urljoin(base_url, href)
        lowered_url = absolute_url.lower()
        lowered_text = (link.get("text") or "").lower()
        if ".pdf" not in lowered_url and "pdf" not in lowered_text:
            continue
        if absolute_url in seen:
            continue
        seen.add(absolute_url)
        discovered.append(
            {
                "url": absolute_url,
                "text": link.get("text") or "",
            }
        )
    return discovered


def looks_like_manual_review(html_text: str, final_url: str | None, http_status: int | None) -> bool:
    if http_status in {401, 403}:
        return True
    lowered = html_text.lower()
    indicators = ("captcha", "sign in", "log in", "login", "access denied")
    if any(token in lowered for token in indicators):
        return True
    host = urlparse(str(final_url or "")).netloc.lower()
    return "login" in host


def normalize_scope_value(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def sanitize_filename(filename: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", filename).strip("._")
    return cleaned or "artifact.bin"


def strip_query(url: str) -> str:
    return url.split("?", 1)[0]


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
