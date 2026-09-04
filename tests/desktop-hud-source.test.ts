import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const desktopSource = readFileSync(new URL("../src/ui/desktop-hud.ts", import.meta.url), "utf8");
const desktopCss = readFileSync(new URL("../src/ui/desktop-hud.css", import.meta.url), "utf8");
const responsiveSource = readFileSync(new URL("../src/ui/portrait-mobile.ts", import.meta.url), "utf8");

test("desktop and portrait HUD adapters are mutually arbitrated before main loads", () => {
  expect(responsiveSource).toContain('const desktopWide = window.matchMedia("(min-width: 1240px) and (orientation: landscape)")');
  expect(responsiveSource).toContain("unmountDesktopHud();\n    mountPortraitHud();");
  expect(responsiveSource).toContain("unmountPortraitHud();\n    mountDesktopHud();");
  expect(responsiveSource.indexOf("applyResponsiveMode();")).toBeLessThan(responsiveSource.indexOf('void import("../main")'));
});

test("desktop HUD moves shared state nodes instead of duplicating game state", () => {
  expect(desktopSource).toContain("move(brandWrap, topLeft);");
  expect(desktopSource).toContain('move(requireElement("levelBadge"), topCenter);');
  expect(desktopSource).toContain("move(progressRow, topCenter);");
  expect(desktopSource).toContain('move(requireElement("weatherBadge"), topCenter);');
  expect(desktopSource).toContain('move(requireElement("starCount"), topCenter);');
  expect(desktopSource).toContain("move(statsButton, topRight);");
  expect(desktopSource).toContain("move(renderPanel, bottomRight);");
  expect(desktopSource).toContain("move(stageCorner, bottomRight);");
  expect(desktopSource).toContain("move(toast, feedback);");
  expect(desktopSource).not.toContain("../game/");
});

test("desktop geometry preserves the R1 reference arithmetic", () => {
  expect(desktopCss).toContain("--hud-gap: 12px;");
  expect(desktopCss).toContain("--hud-top-height: 64px;");
  expect(desktopCss).toContain("--hud-left-width: 344px;");
  expect(desktopCss).toContain("--hud-center-width: 596px;");
  expect(desktopCss).toContain("--hud-right-width: 292px;");
  expect(desktopCss).toContain("grid-template-columns: 90px 212px 106px 92px;");
  expect(desktopCss).toContain("padding: 0 30px;");
  expect(desktopCss).toContain("--hud-dock-width: 932px;");
  expect(desktopCss).toContain("--hud-tool-width: 150px;");
  expect(desktopCss).toContain("--hud-tool-group-width: 474px;");
  expect(desktopCss).toContain("--hud-primary-width: 414px;");
  expect(desktopCss).toContain("grid-template-rows: 39px 39px;");
});

test("mission rows fill their content width and notebook stays an overlay", () => {
  expect(desktopCss).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
  expect(desktopCss).toContain("grid-template-columns: repeat(3, minmax(0, 1fr));");
  expect(desktopCss).toContain("position: fixed;\n    z-index: 46;");
  expect(desktopCss).toContain("pointer-events: none;\n    transition: opacity 0.18s ease, transform 0.18s ease;");
  expect(desktopCss).toContain(".notebook-card.is-desktop-open");
  expect(desktopCss).toContain("pointer-events: auto;");
  expect(desktopCss).toContain(".desktop-bottom-right .render-panel-body");
  expect(desktopCss).toContain("position: absolute;");
});
