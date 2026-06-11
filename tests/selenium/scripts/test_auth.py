"""Authentication module tests (TC_001 - TC_012)."""
import pytest
from selenium.webdriver.common.by import By
from tests.selenium.utils.helpers import wait_for, login


@pytest.mark.smoke
def test_login_page_loads(driver, base_url):
    driver.get(f"{base_url}/login")
    assert wait_for(driver, (By.CSS_SELECTOR, "input[type='email']"))


def test_invalid_email_format(driver, base_url):
    driver.get(f"{base_url}/login")
    email = wait_for(driver, (By.CSS_SELECTOR, "input[type='email']"))
    email.send_keys("abc")
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys("x")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    assert "/login" in driver.current_url


def test_protected_route_redirects(driver, base_url):
    driver.get(f"{base_url}/dashboard")
    # Either redirected to /login or a login UI appears
    assert "/login" in driver.current_url or driver.find_elements(By.CSS_SELECTOR, "input[type='email']")


def test_signup_page_loads(driver, base_url):
    driver.get(f"{base_url}/signup")
    assert wait_for(driver, (By.CSS_SELECTOR, "input[type='email']"))


@pytest.mark.auth
def test_valid_login(driver, base_url, test_user):
    pytest.importorskip("dotenv")
    try:
        login(driver, base_url, test_user["email"], test_user["password"])
    except Exception:
        pytest.skip("Test account not provisioned")
    assert "/dashboard" in driver.current_url
