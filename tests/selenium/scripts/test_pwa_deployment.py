"""PWA + deployment readiness tests."""
import requests
import pytest


@pytest.mark.parametrize("path", [
    "/manifest.webmanifest", "/icon-192.png", "/icon-512.png",
    "/apple-touch-icon.png", "/favicon.ico",
])
def test_pwa_assets_reachable(base_url, path):
    r = requests.get(f"{base_url}{path}", timeout=10)
    assert r.status_code == 200, f"{path} returned {r.status_code}"


def test_manifest_valid(base_url):
    r = requests.get(f"{base_url}/manifest.webmanifest", timeout=10)
    m = r.json()
    assert m["display"] == "standalone"
    assert m["name"]
    assert len(m["icons"]) >= 2


def test_index_has_theme_color(base_url):
    r = requests.get(base_url, timeout=10)
    assert "theme-color" in r.text
