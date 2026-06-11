"""Security / headers smoke tests."""
import requests


def test_https_redirect_when_published(base_url):
    if "lovable.app" not in base_url:
        return
    http_url = base_url.replace("https://", "http://")
    r = requests.get(http_url, timeout=10, allow_redirects=False)
    assert r.status_code in (301, 302, 308) or r.url.startswith("https://")


def test_no_secrets_in_index(base_url):
    r = requests.get(base_url, timeout=10)
    body = r.text.lower()
    forbidden = ["service_role", "supabase_service_role_key", "sk_live_", "sk_test_"]
    for f in forbidden:
        assert f not in body, f"Secret-like token '{f}' found in HTML"
