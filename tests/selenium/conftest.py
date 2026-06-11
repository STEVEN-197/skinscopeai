"""Pytest fixtures for SkinScope AI Selenium suite."""
import os, time, pathlib
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("SKINSCOPE_BASE_URL", "http://localhost:8080")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
SCREENSHOT_DIR = pathlib.Path(__file__).resolve().parents[1] / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def driver(request):
    opts = Options()
    if HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1440,900")
    opts.add_argument("--disable-gpu")
    drv = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
    drv.implicitly_wait(5)
    yield drv
    # Screenshot on failure
    rep = getattr(request.node, "rep_call", None)
    if rep and rep.failed:
        name = SCREENSHOT_DIR / f"{request.node.name}_{int(time.time())}.png"
        try:
            drv.save_screenshot(str(name))
        except Exception:
            pass
    drv.quit()


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture
def test_user():
    return {
        "email": os.getenv("TEST_USER_EMAIL", "test@example.com"),
        "password": os.getenv("TEST_USER_PASSWORD", "TestPassword123!"),
    }
