"""Synthetic Canvas visual/picking fixtures, separate from the real five-level journey.
The production game has no fixture hooks or synthetic save loading.
"""
import json
import math
import os
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

OUT = Path(os.getenv("CANVAS_EVIDENCE_DIR", "browser-evidence/arithmetic/canvas"))
BUNDLE = Path(os.getenv("CANVAS_FIXTURE_JS", "browser-evidence/canvas-fixture.js")).resolve()
OUT.mkdir(parents=True, exist_ok=True)
REPORT = {"source": os.getenv("ARITHMETIC_HEAD_SHA", "local-workbench"),
          "type": "synthetic renderer fixtures; not game progression", "cases": [], "errors": []}
CROPS = ["carrot", "tomato", "corn", "pumpkin", "lettuce", "strawberry"]
BODY = {"carrot": (0, -.13), "tomato": (.19, -.23), "corn": (.08, -.61),
        "pumpkin": (0, -.23), "lettuce": (0, -.3), "strawberry": (.24, -.14)}


def project(x, z, y, width, height, angle, zoom=1):
    # Independent expression retained from the pre-cartoon input contract.
    rx, rz = x * math.cos(angle) - z * math.sin(angle), x * math.sin(angle) + z * math.cos(angle)
    s = min(width / 13.4, height / 9.6) * zoom
    return width * .5 + (rx - rz) * s, height * .59 + (rx + rz) * s * .42 - y * s


def pick(page, x, y):
    return page.evaluate("([x,y])=>canvasEvidence.pick(x,y)", [x, y])


def draw(page, spec):
    meta = page.evaluate("spec=>canvasEvidence.draw(spec)", spec)
    assert meta["renderer"] == "canvas2d", meta
    return meta


def targets(page, width, height, angle, zoom=1, crops=True):
    s = min(width / 13.4, height / 9.6) * zoom
    checked = 0
    for index in range(12):
        x, z = (index % 4 - 1.5) * 1.65, (index // 4 - 1) * 1.75
        px, py = project(x, z, .14, width, height, angle, zoom)
        if 0 <= px < width and 0 <= py < height:
            actual = pick(page, px, py)
            assert actual == index, ("soil center", index, actual, width, height, angle, zoom)
            checked += 1
        if crops:
            rx, ry = project(x, z, .03, width, height, angle, zoom)
            bx, by = BODY[CROPS[index % 6]]
            px, py = rx + bx * s, ry + by * s
            if 0 <= px < width and 0 <= py < height:
                actual = pick(page, px, py)
                assert actual == index, ("painted crop body", index, actual, width, height, angle, zoom)
    assert checked >= 4
    return checked


def main():
    executable = os.getenv("CHROME_BIN") or shutil.which("google-chrome") or shutil.which("chromium")
    assert executable and BUNDLE.is_file(), (executable, str(BUNDLE))
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=executable, headless=True,
                                   args=["--no-sandbox", "--disable-gpu"])
        REPORT["browser"] = browser.version
        page = None
        try:
            for width, height, dpr in [(1440,900,1),(390,844,2),(320,568,3),(844,390,1)]:
                page = browser.new_page(viewport={"width":width,"height":height}, device_scale_factor=dpr)
                page.on("pageerror", lambda error: REPORT["errors"].append(str(error)))
                page.set_content("<style>html,body{margin:0}canvas{display:block;width:100vw;height:100vh}</style><canvas></canvas>")
                page.add_script_tag(path=str(BUNDLE))
                for quarter in range(4):
                    angle = .12 + quarter * math.pi / 2
                    meta = draw(page, {"angle":angle, "pests":True})
                    assert meta["metrics"]["dpr"] == min(dpr,2)
                    count = targets(page,width,height,angle)
                    page.screenshot(path=str(OUT / f"{width}x{height}-turn{quarter}.png"))
                    # Isolate bed walls: a nearer crop may legitimately cover one.
                    draw(page, {"angle":angle, "empty":True})
                    # A visible front bed wall is part of the same clickable object.
                    dx, dz = math.cos(angle)+math.sin(angle), math.cos(angle)-math.sin(angle)
                    for index in range(12):
                        x,z=(index%4-1.5)*1.65,(index//4-1)*1.75
                        for fx,fz in [(x+math.copysign(.62,dx),z),(x,z+math.copysign(.62,dz))]:
                            px,py=project(fx,fz,-.16,width,height,angle)
                            if 0 <= px < width and 0 <= py < height:
                                assert pick(page,px,py)==index, ("visible soil wall",index,angle)
                    REPORT["cases"].append({"viewport":[width,height],"dpr":dpr,"angle":angle,
                        "effectiveDpr":meta["metrics"]["dpr"],"rootTargets":count,"cropBodyTargets":12,
                        "weather":meta["snapshot"]["weather"]["id"],"status":"pass"})
                if width == 1440:
                    angle = .12 + math.pi
                    draw(page, {"angle":angle, "pests":True})
                    px,py=project(2.475,-.62,-.16,width,height,angle)
                    assert pick(page,px,py)==2, "foreground corn must own its visible overlap over farther bed 7"
                for zoom in [.76,1.35]:
                    draw(page,{"zoom":zoom})
                    targets(page,width,height,.12,zoom)
                fingerprints = []
                for stage in [1,2,3,4]:
                    draw(page,{"stage":stage})
                    fingerprints.append(page.evaluate("canvasEvidence.fingerprint()"))
                    if width in [1440,320]:
                        page.screenshot(path=str(OUT / f"{width}-stage{stage}.png"))
                assert len(set(fingerprints)) == 4, ("four growth silhouettes", fingerprints)
                draw(page,{"empty":True})
                targets(page,width,height,.12,crops=False)
                for x in [-1.65,0,1.65]:
                    # Exposed ground in the staggered gaps; a point at soil-top
                    # height can instead land on a visible raised side wall.
                    for z in [-1.3,.6]:
                        px,py=project(x,z,-.35,width,height,.12)
                        assert pick(page,px,py) is None, ("empty gutter stole tap", x,z)
                assert pick(page,-1,10) is None and pick(page,width+1,10) is None
                assert pick(page,0,0) is None
                assert page.evaluate("[NaN,Infinity,-Infinity].every(x=>canvasEvidence.pick(x,10)===null && canvasEvidence.pick(10,x)===null)")
                draw(page,{"wet":False})
                dry=page.evaluate("canvasEvidence.fingerprint()")
                draw(page,{"wet":True})
                wet=page.evaluate("canvasEvidence.fingerprint()")
                assert wet!=dry
                if width==1440: page.screenshot(path=str(OUT/"desktop-wet.png"))
                draw(page,{"harvested":True})
                harvested=page.evaluate("canvasEvidence.fingerprint()")
                draw(page,{"empty":True})
                assert page.evaluate("canvasEvidence.fingerprint()") == harvested, "harvested crop still paints"
                spec={"weather":"sunshower","pests":True}
                draw(page,spec)
                first=page.evaluate("canvasEvidence.fingerprint()")
                page.screenshot(path=str(OUT/f"{width}-sunshower.png"))
                assert page.evaluate("canvasEvidence.dispose()") is None
                draw(page,spec)
                assert page.evaluate("canvasEvidence.fingerprint()") == first, "re-entry is not deterministic"
                page.set_viewport_size({"width":height,"height":width})
                page.evaluate("canvasEvidence.resize()")
                targets(page,height,width,.12)
                page.close(); page=None
            assert not REPORT["errors"], REPORT["errors"]
            REPORT["status"]="pass"
        except Exception as error:
            REPORT["status"]="fail"; REPORT["failure"]=str(error)
            if page: page.screenshot(path=str(OUT/"failure.png"))
            raise
        finally:
            (OUT/"report.json").write_text(json.dumps(REPORT,indent=2),encoding="utf-8")
            browser.close()
    print(json.dumps({"status":REPORT["status"],"quarterTurnCases":len(REPORT["cases"]),"errors":REPORT["errors"]}))


if __name__ == "__main__":
    main()
