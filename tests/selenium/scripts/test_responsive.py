"""Responsive viewport tests."""
import pytest
from selenium.webdriver.common.by import By
from tests.selenium.utils.helpers import wait_for


@pytest.mark.parametrize("size", [(375, 812), (414, 896), (768, 1024), (1024, 768), (1440, 900), (1920, 1080)])
def test_viewport(driver, base_url, size):
    driver.set_window_size(*size)
    driver.get(f"{base_url}/")
    body = wait_for(driver, (By.TAG_NAME, "body"))
    # No horizontal overflow
    scroll_w = driver.execute_script("return document.documentElement.scrollWidth")
    client_w = driver.execute_script("return document.documentElement.clientWidth")
    assert scroll_w - client_w <= 5, f"Horizontal overflow at {size}: {scroll_w}>{client_w}"
