export const HUD_ART_NAMES = [
  "brand-sprout", "event-level", "event-welcome", "gesture-rotate", "gesture-zoom",
  "learning-hint", "reward-star", "status-grow", "status-mature", "status-pest",
  "status-protected", "status-water", "tool-grow", "tool-harvest", "tool-protect",
  "tool-water", "utility-lock", "utility-notebook", "utility-reset", "utility-speak",
  "utility-stats",
] as const;

export type HudArtName = typeof HUD_ART_NAMES[number];

const hudArtUrls: Record<HudArtName, string> = {
  "brand-sprout": new URL("./art/general-hud-r1/webp/2x/brand-sprout-2x.webp", import.meta.url).href,
  "event-level": new URL("./art/general-hud-r1/webp/2x/event-level-2x.webp", import.meta.url).href,
  "event-welcome": new URL("./art/general-hud-r1/webp/2x/event-welcome-2x.webp", import.meta.url).href,
  "gesture-rotate": new URL("./art/general-hud-r1/webp/2x/gesture-rotate-2x.webp", import.meta.url).href,
  "gesture-zoom": new URL("./art/general-hud-r1/webp/2x/gesture-zoom-2x.webp", import.meta.url).href,
  "learning-hint": new URL("./art/general-hud-r1/webp/2x/learning-hint-2x.webp", import.meta.url).href,
  "reward-star": new URL("./art/general-hud-r1/webp/2x/reward-star-2x.webp", import.meta.url).href,
  "status-grow": new URL("./art/general-hud-r1/webp/2x/status-grow-2x.webp", import.meta.url).href,
  "status-mature": new URL("./art/general-hud-r1/webp/2x/status-mature-2x.webp", import.meta.url).href,
  "status-pest": new URL("./art/general-hud-r1/webp/2x/status-pest-2x.webp", import.meta.url).href,
  "status-protected": new URL("./art/general-hud-r1/webp/2x/status-protected-2x.webp", import.meta.url).href,
  "status-water": new URL("./art/general-hud-r1/webp/2x/status-water-2x.webp", import.meta.url).href,
  "tool-grow": new URL("./art/general-hud-r1/webp/2x/tool-grow-2x.webp", import.meta.url).href,
  "tool-harvest": new URL("./art/general-hud-r1/webp/2x/tool-harvest-2x.webp", import.meta.url).href,
  "tool-protect": new URL("./art/general-hud-r1/webp/2x/tool-protect-2x.webp", import.meta.url).href,
  "tool-water": new URL("./art/general-hud-r1/webp/2x/tool-water-2x.webp", import.meta.url).href,
  "utility-lock": new URL("./art/general-hud-r1/webp/2x/utility-lock-2x.webp", import.meta.url).href,
  "utility-notebook": new URL("./art/general-hud-r1/webp/2x/utility-notebook-2x.webp", import.meta.url).href,
  "utility-reset": new URL("./art/general-hud-r1/webp/2x/utility-reset-2x.webp", import.meta.url).href,
  "utility-speak": new URL("./art/general-hud-r1/webp/2x/utility-speak-2x.webp", import.meta.url).href,
  "utility-stats": new URL("./art/general-hud-r1/webp/2x/utility-stats-2x.webp", import.meta.url).href,
};

const legacyNames = new Map<string, HudArtName>([
  ["🌱", "tool-grow"], ["💧", "status-water"], ["🐛", "status-pest"], ["🛡️", "status-protected"],
  ["🌿", "status-grow"], ["✨", "status-mature"], ["⭐", "reward-star"], ["🌟", "reward-star"],
  ["🧺", "tool-harvest"], ["🧴", "tool-protect"], ["🔊", "utility-speak"], ["📓", "utility-notebook"],
  ["📊", "utility-stats"], ["↻", "utility-reset"], ["🔒", "utility-lock"], ["↔", "gesture-rotate"],
  ["🤏", "gesture-zoom"], ["💡", "learning-hint"],
]);

export function hudArtUrl(name: HudArtName): string { return hudArtUrls[name]; }

export function hudArtImage(name: HudArtName, className = "hud-art"): HTMLImageElement {
  const image = document.createElement("img");
  image.className = className;
  image.src = hudArtUrl(name);
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  image.dataset.hudArt = name;
  return image;
}

export function setHudLabel(host: HTMLElement, name: HudArtName, label: string): void {
  host.replaceChildren(hudArtImage(name), document.createTextNode(` ${label}`));
}

export function legacyHudArtName(iconText: string): HudArtName | undefined {
  return legacyNames.get(iconText.replace(/\uFE0F/g, ""));
}

export function installGeneralHudArt(): void {
  if (document.documentElement.dataset.generalHudArtInstalled === "true") return;
  document.documentElement.dataset.generalHudArtInstalled = "true";
  let queued = false;
  const sync = (): void => {
    queued = false;
    document.querySelectorAll<HTMLElement>("[data-hud-art]").forEach((host) => {
      if (host.tagName === "IMG" || host.querySelector(":scope > img[data-hud-art]")) return;
      const name = host.dataset.hudArt as HudArtName | undefined;
      if (name && name in hudArtUrls) host.replaceChildren(hudArtImage(name));
    });
    document.querySelectorAll<HTMLElement>(".tool-btn > span").forEach((host) => {
      const tool = host.parentElement?.dataset.tool;
      const name = tool === "harvest" ? "tool-harvest" : tool === "water" ? "tool-water" : tool === "spray" ? "tool-protect" : undefined;
      if (name && !host.querySelector(":scope > img[data-hud-art]")) host.replaceChildren(hudArtImage(name));
    });
    replaceLeading(document.getElementById("speakBtn"), "utility-speak");
    const stats = document.getElementById("statsBtn");
    replaceLeading(stats, stats?.textContent?.includes("小本本") ? "utility-notebook" : "utility-stats");
    replaceLeading(document.getElementById("resetBtn"), "utility-reset");
    replaceLeading(document.getElementById("starCount"), "reward-star");
    replaceLeading(document.getElementById("waterStatus"), "status-water");
    const spray = document.getElementById("sprayStatus");
    replaceLeading(spray, spray?.textContent?.startsWith("🐛") ? "status-pest" : "status-protected");
    replaceLeading(document.getElementById("growthStatus"), "status-grow");
    replaceLeading(document.getElementById("unlockIcon"), "utility-lock");
    replaceLeading(document.getElementById("questionBtn"), "learning-hint");
    replaceLeading(document.querySelector(".celebration-icon"), "reward-star");
    const help = document.querySelectorAll<HTMLElement>(".stage-corner-left > span");
    replaceLeading(help[0] ?? null, "gesture-rotate");
    replaceLeading(help[1] ?? null, "gesture-zoom");
    document.querySelectorAll<HTMLElement>(".log-icon").forEach((host) => {
      const name = legacyHudArtName(host.textContent?.trim() ?? "");
      if (name) replaceLeading(host, name);
    });
    document.querySelectorAll<HTMLElement>(".reward-pill").forEach((host) => {
      const name = legacyHudArtName(host.textContent?.trim().split(/\s+/)[0] ?? "");
      if (name) replaceLeading(host, name);
    });
    document.querySelectorAll<HTMLElement>(".desktop-notebook-stats, .portrait-notebook-stats").forEach((host) => replaceLeading(host, "utility-stats"));
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(sync);
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  sync();
}

function replaceLeading(host: HTMLElement | null, name: HudArtName): void {
  if (!host || host.querySelector(":scope > img[data-hud-art]")) return;
  const text = host.textContent?.trimStart() ?? "";
  const first = text.match(/^\S+/)?.[0];
  if (!first || !legacyHudArtName(first)) return;
  const rest = text.slice(first.length).trimStart();
  host.replaceChildren(hudArtImage(name), document.createTextNode(rest ? ` ${rest}` : ""));
}
