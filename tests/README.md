# SkinScope AI — Testing & Mobile Readiness

This `tests/` tree provides a complete QA framework for the **SkinScope AI** web app and the Capacitor-wrapped Android APK, **without modifying any existing application code**.

```
tests/
├── selenium/         # Web UI automation (pytest + Selenium 4)
│   ├── scripts/      # Test scripts grouped by module
│   ├── utils/        # Shared helpers (login, waits)
│   ├── conftest.py   # Fixtures: driver, base_url, test_user
│   ├── pytest.ini
│   ├── requirements.txt
│   └── run_and_report.py
├── appium/           # Android UI automation (pytest + Appium 2)
│   ├── scripts/
│   ├── conftest.py
│   ├── requirements.txt
│   └── run_and_report.py
├── reports/          # HTML / JUnit output (Selenium)
├── screenshots/      # Failure screenshots (Selenium)
├── mobile-reports/   # HTML / JUnit output (Appium)
├── mobile-screenshots/
├── test-data/        # Sample images, fixtures
├── test-cases/       # CSV master of 135 test cases
└── excel-reports/    # Excel master + execution reports
```

---

## 1. Test Case Catalog

* `test-cases/test_cases.csv` — flat catalog
* `excel-reports/SkinScopeAI_TestCases.xlsx` — formatted Excel with **Summary** sheet

**135 test cases** spanning: Authentication · Dashboard · Image Analysis · Validation · Medical Reports · Prescriptions · JARVIS · Family · Timeline · Appointments · Health Twin · Compare · Share/PDF · Lifestyle · Insights · Diary · Reminders · UI/UX · Responsive · Performance · Security · Integration · PWA/Deployment · Unit.

Each row captures: **Test Case ID · Module · Scenario · Preconditions · Steps · Expected Result · Actual Result · Status · Priority · Type**.

---

## 2. Run the web app locally (VS Code)

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Vite serves the app at **http://localhost:8080** (configured in `vite.config.ts`). Override with `SKINSCOPE_BASE_URL` for tests.

### Required env vars (`.env`)
Already populated by Lovable Cloud:
* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_PUBLISHABLE_KEY`
* `VITE_SUPABASE_PROJECT_ID`

For tests, optionally add:
* `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`
* `SKINSCOPE_BASE_URL` (defaults to `http://localhost:8080`)
* `HEADLESS=true|false`

---

## 3. Selenium execution

```bash
cd <project-root>
pip install -r tests/selenium/requirements.txt
python tests/selenium/run_and_report.py
```

Outputs:
* `tests/reports/selenium_report.html` — interactive HTML report
* `tests/reports/selenium_junit.xml` — CI-friendly JUnit
* `tests/excel-reports/Selenium_Execution_Report.xlsx` — pass/fail summary
* `tests/screenshots/` — failure screenshots

Run a single module:
```bash
pytest tests/selenium/scripts/test_auth.py -v
```

---

## 4. Appium execution (Android APK)

### Prerequisites
* Node 18+ and `npm i -g appium`
* `appium driver install uiautomator2`
* Android SDK + an emulator or USB device with developer mode
* Built APK at `android/app/build/outputs/apk/debug/app-debug.apk` (see §5)

### Run
```bash
appium &                                        # start server
pip install -r tests/appium/requirements.txt
python tests/appium/run_and_report.py
```

Outputs:
* `tests/mobile-reports/appium_report.html`
* `tests/mobile-reports/Appium_Execution_Report.xlsx`
* `tests/mobile-screenshots/` on failure

---

## 5. Android APK generation (Capacitor)

The web app is already a PWA (manifest + icons + standalone display). To wrap it as a real APK:

```bash
# 1. Install Capacitor
bun add @capacitor/core @capacitor/cli @capacitor/android @capacitor/camera @capacitor/splash-screen

# 2. Initialize Android platform (uses capacitor.config.ts in repo root)
bun run build
npx cap add android
npx cap sync android

# 3. Merge permissions
#    Copy the <uses-permission> entries from android-config/AndroidManifest.permissions.xml
#    into android/app/src/main/AndroidManifest.xml (inside the <manifest> tag).

# 4. Copy launcher icons
#    Reuse public/icon-512.png and public/icon-192.png as the app icon sources.

# 5. Build APK
cd android
./gradlew assembleDebug
# APK -> android/app/build/outputs/apk/debug/app-debug.apk
```

For a **production AAB**: `./gradlew bundleRelease` (requires signing config in `android/app/build.gradle`).

---

## 6. Deployment readiness checklist

Run automatically by `test_pwa_deployment.py` against the live URL:

| Check | Source |
| --- | --- |
| `/manifest.webmanifest` returns 200 JSON with `display:"standalone"` | Selenium |
| `/icon-192.png`, `/icon-512.png`, `/apple-touch-icon.png`, `/favicon.ico` reachable | Selenium |
| `theme-color` meta tag present in HTML | Selenium |
| Build completes (`bun run build`) with exit 0 | CI |
| No `service_role` / `sk_live_` leaked in HTML | `test_security.py` |
| HTTPS redirect enforced on published domain | `test_security.py` |
| All routes reachable post-login | `test_dashboard.py` |

The Excel **Summary** sheet in `Selenium_Execution_Report.xlsx` is the single source of truth for go/no-go.

---

## 7. Disclaimer

These tests do **not** modify production functionality. AI-assisted health features remain labeled as *insights only* — verify with a licensed healthcare provider.
