import asyncio
from playwright.async_api import async_playwright
import os

async def capture():
    async with async_playwright() as p:
        # Launch chromium
        browser = await p.chromium.launch()
        # Set viewport for high resolution
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            device_scale_factor=2, # High DPI
            color_scheme='dark'    # Force dark mode
        )
        page = await context.new_page()
        
        print("Connecting to http://localhost:5173...")
        try:
            # Wait for the frontend to be ready (up to 30s)
            await page.goto("http://localhost:5173", wait_until="networkidle", timeout=30000)
            
            # Additional wait to ensure Recharts and Framer Motion animations finish
            await asyncio.sleep(5)
            
            # Capture the screenshot
            path = "dashboard_screenshot.png"
            await page.screenshot(path=path, full_page=False)
            print(f"✅ Screenshot saved to {os.path.abspath(path)}")
            
        except Exception as e:
            print(f"❌ Failed to capture screenshot: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(capture())
