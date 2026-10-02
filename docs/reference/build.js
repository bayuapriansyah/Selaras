const p = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const REPO = "C:\\Users\\MyBook Hype AMD\\OneDrive\\Desktop\\Hackathon\\Selaras";
const TPL = path.join(REPO, "docs", "reference", "reference.template.html");
const ASSETS = path.join(REPO, "docs", "deck", "assets");
const OUT_HTML = path.join(REPO, "docs", "reference", ".reference-built.html");
const OUT_PDF = path.join(REPO, "docs", "reference", "SELARAS-Dokumentasi-Lengkap.pdf");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let html = fs.readFileSync(TPL, "utf8");

  const shots = [...html.matchAll(/data-shot="([^"]+)"/g)].map((m) => m[1]);
  for (const name of new Set(shots)) {
    const file = path.join(ASSETS, name + ".png");
    if (!fs.existsSync(file)) throw new Error("missing shot: " + file);
    const b64 = fs.readFileSync(file).toString("base64");
    html = html.replace(
      new RegExp(`<img class="([^"]*)"([^>]*)data-shot="${name}" alt="([^"]*)"\\s*/?>`, "g"),
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
  await sleep(600);

  const stats = await pg.evaluate(() => ({
    babs: document.querySelectorAll("section.bab").length,
    refs: document.querySelectorAll(".ref").length,
    imgs: document.querySelectorAll("img").length,
    brokenImgs: [...document.querySelectorAll("img")].filter((i) => !i.complete || i.naturalWidth === 0).length,
    anchorsOk: [...document.querySelectorAll('a.c[href^="#"]')].every((a) =>
      document.getElementById(a.getAttribute("href").slice(1)),
    ),
  }));
  console.log("babs=" + stats.babs, "refs=" + stats.refs, "imgs=" + stats.imgs,
    "broken=" + stats.brokenImgs, "anchorsOk=" + stats.anchorsOk, "errs=" + JSON.stringify(errs));
  if (stats.brokenImgs > 0) throw new Error("broken images: " + stats.brokenImgs);
  if (!stats.anchorsOk) throw new Error("broken citation anchors");

  await pg.pdf({
    path: OUT_PDF,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await b.close();

  fs.unlinkSync(OUT_HTML);
  const kb = Math.round(fs.statSync(OUT_PDF).size / 1024);
  console.log("PDF=" + OUT_PDF, kb + " KB");
})().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
