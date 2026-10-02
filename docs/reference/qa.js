const p = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = "C:\\Users\\MyBook Hype AMD\\OneDrive\\Desktop\\Hackathon\\Selaras";
const TPL = path.join(REPO, "docs", "reference", "reference.template.html");
const ASSETS = path.join(REPO, "docs", "deck", "assets");
const OUT = process.env.TEMP + "\\opencode\\ref-qa";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let html = fs.readFileSync(TPL, "utf8");
  const shots = [...html.matchAll(/data-shot="([^"]+)"/g)].map((m) => m[1]);
  for (const name of new Set(shots)) {
    const b64 = fs.readFileSync(path.join(ASSETS, name + ".png")).toString("base64");
    html = html.replace(
      new RegExp(`<img class="([^"]*)"([^>]*)data-shot="${name}" alt="([^"]*)"\\s*/?>`, "g"),
      `<img class="$1"$2src="data:image/png;base64,${b64}" alt="$3">`,
    );
  }
  const tmp = OUT + "\\view.html";
  fs.writeFileSync(tmp, html, "utf8");

  const b = await p.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox"],
  });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1000, height: 1414, deviceScaleFactor: 1 });
  await pg.goto("file:///" + tmp.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(500);

  const sections = await pg.$$eval("body > *", (els) =>
    els.map((el, i) => ({ i, cls: el.className || el.tagName })),
  );
  let overflow = [];
  for (let i = 0; i < sections.length; i++) {
    const el = await pg.$(`body > *:nth-child(${i + 1})`);
    if (!el) continue;
    await el.screenshot({ path: `${OUT}\\s${String(i).padStart(2, "0")}.png` });
  }
  // overflow check per section (content wider than sheet padding?)
  overflow = await pg.evaluate(() => {
    const bad = [];
    document.querySelectorAll("section.bab").forEach((s, i) => {
      if (s.scrollWidth > s.clientWidth + 2) bad.push("w" + (i + 1));
    });
    return bad;
  });
  console.log("sections=" + sections.length, "overflow=" + JSON.stringify(overflow));
  await b.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
