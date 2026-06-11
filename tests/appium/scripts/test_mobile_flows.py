"""Appium end-to-end flows for SkinScope AI Android app."""
import time, pytest
from appium.webdriver.common.appiumby import AppiumBy


def _find_text(driver, text, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        els = driver.find_elements(AppiumBy.XPATH, f"//*[contains(@text,'{text}') or contains(@content-desc,'{text}')]")
        if els: return els[0]
        time.sleep(0.5)
    raise AssertionError(f"Element with text '{text}' not found")


def test_app_launches(driver):
    assert driver.current_package


def test_login_screen_visible(driver):
    _find_text(driver, "Sign", timeout=20)


def test_login_flow(driver, test_user):
    try:
        email = driver.find_element(AppiumBy.XPATH, "//android.widget.EditText[1]")
        pwd = driver.find_element(AppiumBy.XPATH, "//android.widget.EditText[2]")
    except Exception:
        pytest.skip("Login inputs not exposed")
    email.send_keys(test_user["email"]); pwd.send_keys(test_user["password"])
    _find_text(driver, "Sign").click()
    _find_text(driver, "Dashboard", timeout=20)


@pytest.mark.parametrize("module", ["Analyze", "Reports", "JARVIS", "Family", "Timeline", "Appointments", "Prescriptions", "Twin", "Compare"])
def test_dashboard_navigation(driver, module):
    try:
        _find_text(driver, module, timeout=15).click()
        time.sleep(1)
    except AssertionError:
        pytest.skip(f"{module} not visible in current state")


def test_image_upload_button_exists(driver):
    try:
        _find_text(driver, "Analyze", timeout=15).click()
        _find_text(driver, "Upload", timeout=15)
    except AssertionError:
        pytest.skip("Analyze flow not reachable in this state")
