"""Appium fixtures for the SkinScope AI Android APK."""
import os, pathlib, pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options
from dotenv import load_dotenv

load_dotenv()
SHOTS = pathlib.Path(__file__).resolve().parents[1] / "mobile-screenshots"
SHOTS.mkdir(parents=True, exist_ok=True)

APPIUM_SERVER = os.getenv("APPIUM_SERVER", "http://localhost:4723")
APK_PATH = os.getenv("APK_PATH", "android/app/build/outputs/apk/debug/app-debug.apk")
APP_PACKAGE = os.getenv("APP_PACKAGE", "app.lovable.skinscopeai")
APP_ACTIVITY = os.getenv("APP_ACTIVITY", ".MainActivity")


@pytest.fixture
def driver(request):
    opts = UiAutomator2Options()
    opts.platform_name = "Android"
    opts.automation_name = "UiAutomator2"
    opts.device_name = os.getenv("DEVICE_NAME", "Android Emulator")
    opts.new_command_timeout = 120
    if os.path.exists(APK_PATH):
        opts.app = os.path.abspath(APK_PATH)
    else:
        opts.app_package = APP_PACKAGE
        opts.app_activity = APP_ACTIVITY
    opts.auto_grant_permissions = True
    drv = webdriver.Remote(APPIUM_SERVER, options=opts)
    drv.implicitly_wait(8)
    yield drv
    rep = getattr(request.node, "rep_call", None)
    if rep and rep.failed:
        try: drv.save_screenshot(str(SHOTS / f"{request.node.name}.png"))
        except Exception: pass
    drv.quit()


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    setattr(item, f"rep_{outcome.get_result().when}", outcome.get_result())


@pytest.fixture
def test_user():
    return {
        "email": os.getenv("TEST_USER_EMAIL", "test@example.com"),
        "password": os.getenv("TEST_USER_PASSWORD", "TestPassword123!"),
    }
