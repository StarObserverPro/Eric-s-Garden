(() => {
  const params = new URLSearchParams(window.location.search);
  const expectedWidth = Number(params.get("width"));
  const expectedHeight = Number(params.get("height"));
  const root = document.documentElement;
  const errors = [];
  const evidence = {};
  const near = (a, b, tolerance = 1) => Math.abs(a - b) <= tolerance;

  const rect = (selector) => {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) return null;
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
  };
  const fail = (condition, message) => { if (!condition) errors.push(message); };

  const verify = () => {
    const topLeft = rect(".desktop-top-left");
    const topCenter = rect(".desktop-top-center");
    const topRight = rect(".desktop-top-right");
    const mission = rect(".mission-card");
    const feedback = rect(".desktop-right-feedback");
    const dock = rect(".control-deck");
    const bottomRight = rect(".desktop-bottom-right");
    const garden = rect(".garden-stage");
    const targetList = rect(".target-list");
    const targets = [...document.querySelectorAll(".target-list .target-chip")].map((node) => node.getBoundingClientRect());
    const statusStrip = rect(".status-strip");
    const statuses = [...document.querySelectorAll(".status-strip span")].map((node) => node.getBoundingClientRect());
    const notebook = document.querySelector(".notebook-card");
    const statsButton = document.getElementById("statsBtn");
    const statsDialog = document.getElementById("statsDialog");

    Object.assign(evidence, {
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      scroll: { documentWidth: root.scrollWidth, documentHeight: root.scrollHeight },
      topLeft, topCenter, topRight, mission, feedback, dock, bottomRight, garden, targetList, statusStrip,
    });

    fail(document.body.classList.contains("desktop-hud-active"), "desktop adapter is not active");
    fail(innerWidth === expectedWidth && innerHeight === expectedHeight, `viewport is ${innerWidth}x${innerHeight}, expected ${expectedWidth}x${expectedHeight}`);
    fail(root.scrollWidth <= innerWidth && root.scrollHeight <= innerHeight, "page scroll exceeds viewport");
    fail(getComputedStyle(document.body).overflow === "hidden", "desktop body overflow is not hidden");
    fail(document.querySelectorAll(".desktop-top-hud").length === 3, "top HUD does not have exactly three outer containers");
    fail(Boolean(topLeft && topCenter && topRight && mission && feedback && dock && bottomRight && garden), "one or more required desktop HUD regions are missing");

    if (garden) {
      fail(near(garden.x, 0) && near(garden.y, 0), "garden does not start at viewport origin");
      fail(near(garden.width, innerWidth) && near(garden.height, innerHeight), "garden does not fill the viewport");
    }
    if (topLeft && topCenter && topRight) {
      fail(near(topLeft.y, topCenter.y) && near(topCenter.y, topRight.y), "top containers do not share a top edge");
      fail(near(topLeft.height, 64) && near(topCenter.height, 64) && near(topRight.height, 64), "top containers are not all 64px high");
      fail(near(topCenter.x + topCenter.width / 2, innerWidth / 2), "center status container is not viewport-centered");
      fail(topLeft.right <= topCenter.x && topCenter.right <= topRight.x, "top HUD containers overlap");
    }
    if (topLeft && mission) {
      fail(near(topLeft.x, mission.x) && near(topLeft.width, mission.width), "brand and mission outer edges do not align");
    }
    if (topRight && feedback && bottomRight) {
      fail(near(topRight.width, feedback.width) && near(topRight.width, bottomRight.width), "right HUD columns do not share one width");
      fail(near(topRight.right, feedback.right) && near(topRight.right, bottomRight.right), "right HUD columns do not share one right edge");
    }
    if (dock && bottomRight) {
      fail(near(dock.height, 90) && near(bottomRight.height, 90), "bottom action regions are not both 90px high");
      fail(near(dock.y, bottomRight.y) && near(dock.bottom, bottomRight.bottom), "bottom action regions do not share top and bottom edges");
      fail(dock.right <= bottomRight.x, "center action dock overlaps the bottom-right utility stack");
    }
    if (mission && dock) fail(mission.bottom <= dock.y, "mission card overlaps the bottom action dock");

    if (targetList && targets.length >= 2) {
      fail(near(targets[0].x, targetList.x) && near(targets[1].right, targetList.right), "mission target row does not fill its content width");
      fail(near(targets[1].x - targets[0].right, 12), "mission target sibling gap is not 12px");
    } else errors.push("mission target cells are missing");

    if (statusStrip && statuses.length === 3) {
      fail(near(statuses[0].x, statusStrip.x) && near(statuses[2].right, statusStrip.right), "mission status row does not fill its content width");
      fail(near(statuses[1].x - statuses[0].right, 12) && near(statuses[2].x - statuses[1].right, 12), "mission status sibling gaps are not 12px");
    } else errors.push("mission status cells are missing");

    fail(document.querySelector(".desktop-top-center > #levelBadge") !== null, "level is not owned by the center status container");
    fail(document.querySelector(".desktop-top-center > #weatherBadge") !== null, "weather is not owned by the center status container");
    fail(document.querySelector(".desktop-top-center > #starCount") !== null, "stars are not owned by the center status container");
    fail(document.querySelector(".progress-track > #levelProgress") !== null, "progress number is not inside the progress track");
    fail(document.querySelector(".mission-card #levelBadge, .mission-card #weatherBadge, .mission-card #starCount") === null, "global status leaked back into the mission card");
    fail(document.querySelector(".desktop-bottom-right > .stage-corner-left") !== null, "rotation/zoom help is not in the bottom-right stack");
    fail(document.querySelector(".desktop-bottom-right > .render-panel") !== null, "画面与帮助 is not in the bottom-right stack");

    const renderPanel = document.querySelector(".render-panel");
    fail(renderPanel instanceof HTMLDetailsElement && !renderPanel.open, "renderer diagnostics are open in normal play");

    if (notebook instanceof HTMLElement && statsButton instanceof HTMLButtonElement) {
      const beforeGarden = rect(".garden-stage");
      const beforeStyle = getComputedStyle(notebook);
      fail(beforeStyle.position === "fixed" && beforeStyle.pointerEvents === "none", "notebook is not a closed fixed overlay");
      statsButton.click();
      const openGarden = rect(".garden-stage");
      fail(notebook.classList.contains("is-desktop-open"), "notebook button did not open the desktop overlay");
      fail(!(statsDialog instanceof HTMLDialogElement) || !statsDialog.open, "notebook button leaked through to the statistics dialog");
      if (beforeGarden && openGarden) fail(near(beforeGarden.width, openGarden.width) && near(beforeGarden.height, openGarden.height), "opening notebook resized the renderer surface");
      notebook.style.transition = "none";
      statsButton.click();
      fail(!notebook.classList.contains("is-desktop-open"), "notebook button did not close the desktop overlay");
    } else errors.push("notebook overlay controls are missing");

    if (expectedWidth >= 1700 && topLeft && topCenter && topRight && dock) {
      fail(near(topLeft.width, 344), "wide reference left column is not 344px");
      fail(near(topCenter.width, 596), "wide reference center status is not 596px");
      fail(near(topRight.width, 292), "wide reference right column is not 292px");
      fail(near(dock.width, 932), "wide reference action dock is not 932px");
      const toolRects = [...document.querySelectorAll(".tool-btn")].map((node) => node.getBoundingClientRect());
      const growRect = document.getElementById("growBtn")?.getBoundingClientRect();
      fail(toolRects.length === 3 && toolRects.every((box) => near(box.width, 150)), "wide reference tool slots are not 150px each");
      fail(Boolean(growRect && near(growRect.width, 414)), "wide reference primary action is not 414px");
    }

    root.dataset.hudEvidence = errors.length === 0 ? "pass" : "fail";
    root.dataset.hudEvidenceReport = encodeURIComponent(JSON.stringify({ ...evidence, errors }));
  };

  const waitForHud = (attempt = 0) => {
    const ready = document.body.classList.contains("desktop-hud-active")
      && document.querySelectorAll(".target-list .target-chip").length >= 2
      && document.querySelectorAll(".status-strip span").length === 3;
    if (ready) {
      verify();
      return;
    }
    if (attempt >= 45) {
      errors.push("desktop HUD did not become ready before evidence timeout");
      root.dataset.hudEvidence = "fail";
      root.dataset.hudEvidenceReport = encodeURIComponent(JSON.stringify({ errors }));
      return;
    }
    window.setTimeout(() => waitForHud(attempt + 1), 100);
  };

  waitForHud();
})();
