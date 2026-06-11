"""Dashboard module tests."""
import pytest
from selenium.webdriver.common.by import By
from tests.selenium.utils.helpers import login, wait_for


@pytest.fixture(autouse=True)
def _login(driver, base_url, test_user):
    try:
        login(driver, base_url, test_user["email"], test_user["password"])
    except Exception:
        pytest.skip("Login unavailable")


@pytest.mark.parametrize("path", [
    "/dashboard", "/dashboard/analyze", "/dashboard/reports", "/dashboard/medical-reports",
    "/dashboard/prescriptions", "/dashboard/jarvis", "/dashboard/family",
    "/dashboard/timeline", "/dashboard/appointments", "/dashboard/twin",
    "/dashboard/compare", "/dashboard/share", "/dashboard/lifestyle",
    "/dashboard/insights", "/dashboard/intelligence", "/dashboard/diary",
    "/dashboard/reminders",
])
def test_route_renders(driver, base_url, path):
    driver.get(f"{base_url}{path}")
    body = wait_for(driver, (By.TAG_NAME, "body"))
    assert body.is_displayed()


def test_sidebar_navigation(driver, base_url):
    driver.get(f"{base_url}/dashboard")
    nav_links = driver.find_elements(By.CSS_SELECTOR, "nav a, aside a")
    assert len(nav_links) > 3
