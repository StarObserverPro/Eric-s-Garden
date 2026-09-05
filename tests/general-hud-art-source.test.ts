import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const source = readFileSync(new URL("../src/ui/general-hud-art.ts", import.meta.url), "utf8");
const root = new URL("../src/ui/art/general-hud-r1/webp/", import.meta.url);

test("General HUD Art R1 keeps all 21 assets at all three sizes", () => {
  const names = ["brand-sprout","event-level","event-welcome","gesture-rotate","gesture-zoom","learning-hint","reward-star","status-grow","status-mature","status-pest","status-protected","status-water","tool-grow","tool-harvest","tool-protect","tool-water","utility-lock","utility-notebook","utility-reset","utility-speak","utility-stats"];
  expect(source).toContain("const hudArtUrls: Record<HudArtName, string>");
  expect(source).toContain("general-hud-r1/webp/2x/");
  for (const size of ["1x", "2x", "3x"]) {
    for (const name of names) {
      const content = readFileSync(new URL(`${size}/${name}-${size}.webp`, root), "utf8");
      expect(content.length).toBeGreaterThan(0);
    }
  }
});
