"""Bounded production-browser arithmetic journeys; no game/debug hooks.

Run against `vite preview` with playwright==1.57.0 and an installed Chromium.
All five levels use real mouse/touch actions from a fresh save. Save reads are
observations, never fabricated counts or replacements for player actions.
"""
import json
import math
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = os.environ.get("ARITHMETIC_URL", "http://127.0.0.1:4175")
OUT = Path(os.environ.get("ARITHMETIC_EVIDENCE", "browser-evidence/arithmetic"))
OUT.mkdir(parents=True, exist_ok=True)
KEY = "eric-secret-garden-r2"
BROWSER = os.environ.get("ARITHMETIC_BROWSER") or next(
    (path for name in ["google-chrome", "chromium", "chromium-browser"] if (path := shutil.which(name))), None)
REPORT = {"source": os.environ.get("ARITHMETIC_HEAD_SHA", os.environ.get("GITHUB_SHA", "local-workbench")), "renderer": "Canvas fallback", "journeys": []}


def saved(page):
    return page.evaluate("key => JSON.parse(localStorage.getItem(key))", KEY)


def settle(page):
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


def activate(page, selector, touch):
    target = page.locator(selector)
    assert target.count() == 1, f"ambiguous/missing action: {selector}"
    if touch:
        target.tap(timeout=8000)
    else:
        target.click(timeout=8000)
    settle(page)


def hit_plot(page, index, touch):
    """Canvas soil-centre projection, kept in sync with Canvas2DRenderer.#project.
    This computes only the input location, never changes the garden model.
    """
    state = saved(page)
    rect = page.locator("#gardenCanvas2d").bounding_box()
    view = page.evaluate("JSON.parse(localStorage.getItem('eric-secret-garden-camera-view-r1') || 'null')")
    zoom = view["zoom"] if view else state["camera"]["zoom"]
    angle = state["camera"]["angle"]
    x, z = (index % 4 - 1.5) * 1.65, (index // 4 - 1) * 1.75
    rx, rz = x * math.cos(angle) - z * math.sin(angle), x * math.sin(angle) + z * math.cos(angle)
    scale = min(rect["width"] / 13.4, rect["height"] / 9.6) * zoom
    px = rect["x"] + rect["width"] * .5 + (rx - rz) * scale
    py = rect["y"] + rect["height"] * .59 + (rx + rz) * scale * .42 - .14 * scale
    if touch:
        page.touchscreen.tap(px, py)
    else:
        page.mouse.click(px, py)
    settle(page)


def screenshot(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"), timeout=10000)


def check_layout(page, name, touch, sharing=False):
    geometry = page.evaluate("""() => {
      const rect = el => {const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,scroll:el.scrollWidth,client:el.clientWidth};};
      const result = {viewport:[innerWidth,innerHeight],body:document.documentElement.scrollWidth};
      for(const id of ['orderHud','levelDialog','nextLevelBtn']) result[id]=rect(document.getElementById(id));
      result.chips=[...document.querySelectorAll('#orderHud .order-hud-crop')].map(rect);
      result.baskets=[...document.querySelectorAll('.sharing-basket')].map(rect);
      result.actions=[...document.querySelectorAll('.sharing-action')].map(rect);
      return result;
    }""")
    width, height = geometry["viewport"]
    assert geometry["body"] <= width + 1, (name, "page horizontal overflow", geometry)
    if touch:
        hud = geometry["orderHud"]
        assert hud["w"] > 0 and hud["x"] >= 0 and hud["right"] <= width, (name, "HUD outside viewport", geometry)
        assert hud["bottom"] < height * .35, (name, "HUD dominates garden", geometry)
        assert all(c["scroll"] <= c["client"] + 1 for c in geometry["chips"]), (name, "crop counters clipped", geometry)
    if sharing:
        dialog = geometry["levelDialog"]
        assert dialog["x"] >= -1 and dialog["right"] <= width + 1 and dialog["y"] >= -1 and dialog["bottom"] <= height + 1, (name, "dialog outside viewport", geometry)
        assert dialog["scroll"] <= dialog["client"] + 1, (name, "dialog horizontal overflow", geometry)
        assert all(b["scroll"] <= b["client"] + 1 for b in geometry["baskets"]), (name, "basket overflow", geometry)
        assert all(a["h"] >= 44 and a["w"] >= 44 for a in geometry["actions"]), (name, "small touch action", geometry)
        assert page.locator('#nextLevelBtn').is_enabled(), "sharing became a next-level gate"
    (OUT / f"{name}-geometry.json").write_text(json.dumps(geometry, indent=2))


def grow_to_harvest(page, touch):
    if not saved(page) or not saved(page)["planted"]:
        activate(page, "#growBtn", touch)
    for _ in range(4):
        if saved(page)["round"] >= 4:
            break
        state = saved(page)
        dry = [p["index"] for p in state["plots"] if p["crop"] and p["stage"] < 4 and not p["watered"]]
        if dry:
            activate(page, '[data-tool="water"]', touch)
            for index in dry:
                hit_plot(page, index, touch)
                assert saved(page)["plots"][index]["watered"], ("water input missed", index)
        pests = [p["index"] for p in saved(page)["plots"] if p["pest"]]
        if pests:
            activate(page, '[data-tool="spray"]', touch)
            for index in pests:
                before = sum(p["pest"] for p in saved(page)["plots"])
                hit_plot(page, index, touch)
                assert sum(p["pest"] for p in saved(page)["plots"]) == before - 1
        before = saved(page)["round"]
        activate(page, "#growBtn", touch)
        assert saved(page)["round"] == before + 1, "real care did not advance growth"
        if saved(page)["level"] == 0 and saved(page)["round"] == 3:
            assert sum(p["watered"] for p in saved(page)["plots"]) == 4, "sunshower did not water four real beds"
    activate(page, '[data-tool="harvest"]', touch)
    indices = [p["index"] for p in saved(page)["plots"] if p["crop"] and not p["harvested"]]
    for index in indices:
        before = sum(saved(page)["harvested"].values())
        hit_plot(page, index, touch)
        state = saved(page)
        assert sum(state["harvested"].values()) == before + 1, ("harvest input missed", index)
        progress = page.locator("#levelProgress").text_content()
        assert progress.startswith(str(before + 1) + " /"), "order HUD stale"
        if before + 1 == len(indices) - 1:
            screenshot(page, f"{'touch' if touch else 'desktop'}-one-missing-level{state['level']}")
    assert page.locator("#levelDialog").evaluate("el => el.open"), "completion not wired"
    assert page.locator("#levelQuestion .answer-btn").count() == 0, "completion still starts with a quiz"


def assert_tokens(page, count):
    ids = page.locator(".sharing-token").evaluate_all("els => els.map(el => Number(el.dataset.token)).sort((a,b)=>a-b)")
    assert ids == list(range(count)), "a harvested token duplicated or vanished"


def share(page, touch, name):
    original = saved(page)
    activate(page, '[data-focus-key="start"]', touch)
    baskets = page.locator(".sharing-basket").count()
    total = sum(original["harvested"].values())
    check_layout(page, f"{name}-sharing-start", touch, True)
    screenshot(page, f"{name}-sharing-start")
    assert page.locator(".sharing-equation").count() == 0, "division answer shown before action"
    for _ in range(total):
        activate(page, '[data-focus-key="put-0"]', touch)
    assert page.locator('.sharing-result[data-equal="false"]').count() == 1
    assert_tokens(page, total)
    screenshot(page, f"{name}-uneven")
    each = total // baskets
    for destination in range(1, baskets):
        for _ in range(each):
            activate(page, '[data-focus-key="take-0"]', touch)
            activate(page, f'[data-focus-key="put-{destination}"]', touch)
    assert page.locator('.sharing-result[data-equal="true"]').count() == 1
    assert page.locator('.sharing-equation').inner_text().startswith(f"{total} ÷ {baskets} = {each}")
    assert_tokens(page, total)
    check_layout(page, f"{name}-sharing-equal", touch, True)
    screenshot(page, f"{name}-sharing-equal")
    after = saved(page)
    for field in ["harvested", "totalHarvest", "stars"]:
        assert after[field] == original[field], f"sharing changed {field}"
    placement = after["sharing"]
    activate(page, '.arithmetic-close', touch)
    assert not page.locator('#levelDialog').evaluate('el => el.open')
    activate(page, '#growBtn', touch)
    assert saved(page)["sharing"] == placement
    page.reload(wait_until="networkidle")
    page.locator('#rendererIndicator[data-status="ready"]').wait_for(timeout=10000)
    activate(page, "#growBtn", touch)
    assert saved(page)["sharing"] == placement and saved(page)["stars"] == original["stars"]
    assert page.locator('.sharing-result[data-equal="true"]').count() == 1, "reload lost sharing arrangement"
    activate(page, '[data-focus-key="restart"]', touch)
    activate(page, '[data-focus-key="put-0"]', touch)
    partial = saved(page)["sharing"]
    page.reload(wait_until="networkidle")
    page.locator('#rendererIndicator[data-status="ready"]').wait_for(timeout=10000)
    activate(page, "#growBtn", touch)
    assert saved(page)["sharing"] == partial
    before_level = saved(page)["level"]
    activate(page, '#nextLevelBtn', touch)
    if before_level < 4:
        assert saved(page)["level"] == before_level + 1 and saved(page)["sharing"] is None
    else:
        assert saved(page)["level"] == 4 and saved(page)["completed"]
        assert saved(page)["stars"] == 15
    return {"basketCount": baskets, "total": total, "each": each, "correction": True, "reload": True, "optional": True, "closeAndResume": True}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=BROWSER, headless=True, args=["--no-sandbox", "--disable-gpu"])
    try:
        for name, width, height, touch in [("desktop",1440,900,False),("touch",390,844,True)]:
            context = browser.new_context(viewport={"width":width,"height":height}, device_scale_factor=1, has_touch=touch, is_mobile=touch)
            context.add_init_script("localStorage.setItem('eric-secret-garden-render-r1', JSON.stringify({preference:'canvas',instances:500,maxDpr:1}));")
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.set_default_timeout(10000)
            try:
                page.goto(URL, wait_until="networkidle")
                page.locator('#rendererIndicator[data-status="ready"]').wait_for()
                assert "Canvas" in page.locator('#rendererName').inner_text()
                assert page.locator('#targetList .order-slot').count() == 10
                screenshot(page, f"{name}-initial")
                check_layout(page, f"{name}-initial", touch)
                summaries = []
                for level in range(5):
                    if touch and level >= 3:
                        page.set_viewport_size({"width":320,"height":568})
                        settle(page)
                    check_layout(page, f"{name}-level{level}-order", touch)
                    assert page.locator('#orderHud .order-hud-crop').count() == (6 if level == 4 else 5 if level >= 2 else 4)
                    grow_to_harvest(page, touch)
                    assert saved(page)["stars"] == (level + 1) * 3
                    if level == 1:
                        activate(page, '#nextLevelBtn', touch)
                    else:
                        if touch and level >= 2:
                            page.set_viewport_size({"width":320,"height":568})
                            settle(page)
                        summaries.append(share(page, touch, f"{name}-level{level}"))
                activate(page, '#growBtn', touch)
                assert saved(page)["stars"] == 15
                activate(page, '.arithmetic-close', touch)
                if touch:
                    activate(page, '#statsBtn', touch)
                page.once("dialog", lambda dialog: dialog.accept())
                activate(page, '#resetBtn', touch)
                assert saved(page)["level"] == 0 and saved(page)["stars"] == 0
                assert saved(page)["sharing"] is None and not saved(page)["harvested"]
                assert not errors, errors
                REPORT["journeys"].append({"name":name,"viewport":[width,height],"narrowTouch":[320,568] if touch else None,"input":"touchscreen.tap" if touch else "mouse.click","status":"pass","sharing":summaries,"errors":errors})
            except Exception as error:
                screenshot(page, f"{name}-FAILED")
                (OUT / f"{name}-failed-dom.html").write_text(page.content())
                REPORT["journeys"].append({"name":name,"status":"fail","error":str(error),"errors":errors})
                raise
            finally:
                (OUT / "report.json").write_text(json.dumps(REPORT, ensure_ascii=False, indent=2))
                context.close()
    finally:
        browser.close()
print(json.dumps(REPORT, ensure_ascii=False, indent=2))
