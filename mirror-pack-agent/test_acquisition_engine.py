import shutil
import threading
import unittest
import uuid
from pathlib import Path
import http.server
import socketserver

import yaml

from acquisition.engine import AcquisitionSettings, filter_source_records, run_acquisition

PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
HTML_WITH_PDF = b"<html><head><title>Test PDF Links</title></head><body><a href='/linked.pdf'>Download PDF</a></body></html>"
HTML_WITHOUT_PDF = b"<html><head><title>No PDFs</title></head><body><p>No downloads here</p></body></html>"


class TestRequestHandler(http.server.BaseHTTPRequestHandler):
    __test__ = False
    def do_GET(self):  # noqa: N802
        if self.path == "/direct.pdf":
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.end_headers()
            self.wfile.write(PDF_BYTES)
        elif self.path == "/linked.pdf":
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.end_headers()
            self.wfile.write(PDF_BYTES)
        elif self.path == "/page-with-pdf.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML_WITH_PDF)
        elif self.path == "/page-without-pdf.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(HTML_WITHOUT_PDF)
        elif self.path == "/login.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<html><body>Login required</body></html>")
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        return


class TestAcquisitionEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.httpd = socketserver.TCPServer(("127.0.0.1", 0), TestRequestHandler)
        cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.server_thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.httpd.server_address[1]}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()
        cls.server_thread.join(timeout=5)

    def test_scope_filtering(self) -> None:
        records = [
            {"source_record_key": "one", "jurisdiction_name": "San Francisco", "program_label": "Dust control"},
            {"source_record_key": "two", "jurisdiction_name": "Oakland", "program_label": "Special inspections"},
        ]
        filtered = filter_source_records(records, jurisdictions=["san francisco"], programs=["dust control"], source_record_keys=[])
        self.assertEqual([record["source_record_key"] for record in filtered], ["one"])

    def test_run_acquisition_downloads_and_reports(self) -> None:
        root = make_repo_tempdir()
        try:
            source_seed = root / "source_records.seed.yaml"
            form_seed = root / "form_records.seed.yaml"
            output_root = root / "acquired"
            source_records = [
                {"source_record_key": "direct_pdf", "local_file_name": "direct.pdf", "jurisdiction_name": "Test City", "program_label": "Testing", "source_url": f"{self.base_url}/direct.pdf"},
                {"source_record_key": "html_page", "local_file_name": "page-with-pdf.pdf", "jurisdiction_name": "Test City", "program_label": "Testing", "source_url": f"{self.base_url}/page-with-pdf.html"},
                {"source_record_key": "page_only", "local_file_name": "page-only.pdf", "jurisdiction_name": "Test City", "program_label": "Testing", "source_url": f"{self.base_url}/page-without-pdf.html"},
                {"source_record_key": "login_page", "local_file_name": "login.pdf", "jurisdiction_name": "Test City", "program_label": "Testing", "source_url": f"{self.base_url}/login.html"},
                {"source_record_key": "missing", "local_file_name": "missing.pdf", "jurisdiction_name": "Test City", "program_label": "Testing", "source_url": f"{self.base_url}/missing.pdf"},
            ]
            form_records = [
                {"form_record_key": "direct_pdf", "source_record_key": "direct_pdf", "runtime_visibility": "packet_builder_and_admin"},
                {"form_record_key": "html_page", "source_record_key": "html_page", "runtime_visibility": "packet_builder_and_admin"},
            ]
            source_seed.write_text(yaml.safe_dump(source_records, sort_keys=False), encoding="utf-8")
            form_seed.write_text(yaml.safe_dump(form_records, sort_keys=False), encoding="utf-8")

            result = run_acquisition(
                source_seed_path=source_seed,
                form_seed_path=form_seed,
                settings=AcquisitionSettings(output_root=output_root, timeout_seconds=5.0, max_linked_pdfs=5),
            )
            summary = result["summary"]
            self.assertEqual(summary["manifest_count"], 5)
            self.assertEqual(summary["status_counts"]["direct_mirror_downloaded"], 1)
            self.assertEqual(summary["status_counts"]["source_reference_verified"], 1)
            self.assertEqual(summary["status_counts"]["html_page_snapshotted"], 1)
            self.assertEqual(summary["status_counts"]["requires_manual_review"], 1)
            self.assertEqual(summary["status_counts"]["http_error"], 1)

            manifests_dir = output_root / "manifests"
            direct_manifest = yaml.safe_load((manifests_dir / "direct_pdf.json").read_text(encoding="utf-8"))
            html_manifest = yaml.safe_load((manifests_dir / "html_page.json").read_text(encoding="utf-8"))

            self.assertEqual(direct_manifest["status"], "direct_mirror_downloaded")
            self.assertTrue(direct_manifest["stored_path"].endswith(".pdf"))
            self.assertEqual(html_manifest["status"], "source_reference_verified")
            self.assertEqual(len(html_manifest["discovered_pdf_links"]), 1)
            self.assertEqual(html_manifest["discovered_pdf_links"][0]["status"], "direct_mirror_downloaded")
            self.assertTrue((output_root / "reports" / "source_records.enriched.yaml").exists())
            self.assertTrue((output_root / "reports" / "form_records.enriched.yaml").exists())
            self.assertTrue((output_root / "reports" / "resolution_index.json").exists())
        finally:
            shutil.rmtree(root, ignore_errors=True)


def make_repo_tempdir() -> Path:
    temp_root = Path(__file__).resolve().parent / "test_scratch"
    temp_root.mkdir(exist_ok=True)
    path = temp_root / f"case_{uuid.uuid4().hex}"
    path.mkdir(parents=True, exist_ok=False)
    return path


if __name__ == "__main__":
    unittest.main()
