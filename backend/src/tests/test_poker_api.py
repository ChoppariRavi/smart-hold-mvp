# backend/src/tests/test_poker_api.py
from playwright.sync_api import sync_playwright

def test_poker_startup():
    with sync_playwright() as p:
        # Launch browser (headless=False lets you see the magic)
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # 1. Navigate to your FastAPI Swagger docs
        page.goto("http://127.0.0.1:8000/docs")
        
        # 2. Assert the title is correct
        assert "Smart Hold Poker API" in page.title()
        
        # 3. Take a screenshot of your hard work
        page.screenshot(path="docs_check.png")
        
        browser.close()

if __name__ == "__main__":
    test_poker_startup()