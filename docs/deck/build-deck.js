const p = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = "C:\\Users\\MyBook Hype AMD\\OneDrive\\Desktop\\Hackathon\\Selaras";
const TPL = path.join(REPO, "docs", "deck", "deck.template.html");
const ASSETS = path.join(REPO, "docs", "deck", "assets");
const OUT_HTML = path.join(REPO, "docs", "deck", ".deck-built.html");
const OUT_PDF = path.join(REPO, "docs", "deck", "SELARAS-Healthkathon-2026.pdf");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let html = fs.readFileSync(TPL, "utf8");

  // inline semua data-shot sebagai base64 png
  const shots = [...html.matchAll(/data-shot="([^"]+)"/g)].map((m) => m[1]);
  for (const name of new Set(shots)) {
    const file = path.join(ASSETS, name + ".png");
    if (!fs.existsSync(file)) throw new Error("missing shot: " + file);
    const b64 = fs.readFileSync(file).toString("base64");
    html = html.replace(
      new RegExp(`<img class="([^"]*)"([^>]*)data-shot="${name}" alt="([^"]*)">`, "g"),
      `<img class="$1"$2src="data:image/png;base64,${b64}" alt="$3">`,
    );
  }
  const leftover = (html.match(/data-shot=/g) || []).length;
  if (leftover) throw new Error(leftover + " data-shot not replaced");

  fs.writeFileSync(OUT_HTML, html, "utf8");

  const b = await p.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: "new",
    args: ["--no-sandbox"],
  });
  const pg = await b.newPage();
  const errs = [];
  pg.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
  await pg.goto("file:///" + OUT_HTML.replace(/\\/g, "/"), { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(800);

  const count = await pg.evaluate(() => document.querySelectorAll(".slide").length);
  const overflow = await pg.evaluate(() =>
    [...document.querySelectorAll(".slide")].map((s, i) =>
      s.scrollWidth > s.clientWidth + 2 || s.scrollHeight > s.clientHeight + 2 ? i + 1 : null,
    ).filter(Boolean),
  );
  console.log("slides=" + count + " overflow=" + JSON.stringify(overflow) + " errs=" + JSON.stringify(errs));

  await pg.pdf({
    path: OUT_PDF,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await b.close();

  fs.unlinkSync(OUT_HTML);
  const kb = Math.round(fs.statSync(OUT_PDF).size / 1024);
  console.log(JSON.stringify({ pdf: OUT_PDF, slides: count, sizeKB: kb, sizeMB: (kb / 1024).toFixed(2) }));
})().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
