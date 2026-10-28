#!/usr/bin/env node
// Local web UI for the Catph obfuscator.
// This does NOT reimplement the obfuscator in JS — it shells out to the real
// Lua tool (cli.lua) as a subprocess, so the actual pipeline runs exactly as
// it does from the command line. This file just gives it a browser front end.
//
// Requirements on THIS machine:
//   - Lua 5.1 installed and on PATH as `lua` (the tool uses loadstring/setfenv,
//     which only exist in Lua 5.1, not 5.2+ and not Luau itself)
//   - cli.lua, catph/, presets.lua, config.lua, logger.lua, colors.lua and
//     highlightlua.lua copied into this same folder, next to server.js
//
// Run:  node server.js
// Open: http://localhost:8787

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const CLI_PATH = path.join(ROOT, "cli.lua");
const PORT = 8787;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — generous for a single script

const PRESETS = [
  "luaubc",
  "customvm-small",
  "customvm",
  "customvm-large",
  "ironbrew2",
  "customvm-allstricks",
  "catph",
  "customvm-test",
];

function sendFile(res, filePath, type) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (req.method === "GET") {
    const file = req.url === "/" ? "/index.html" : req.url;
    const safe = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
    const full = path.join(PUBLIC_DIR, safe);
    if (!full.startsWith(PUBLIC_DIR)) { send(res, 400, "bad path"); return; }
    const ext = path.extname(full);
    const type =
      ext === ".html" ? "text/html; charset=utf-8" :
      ext === ".css" ? "text/css" :
      ext === ".js" ? "text/javascript" : "application/octet-stream";
    sendFile(res, full, type);
    return;
  }

  if (req.method === "POST" && req.url === "/obfuscate") {
    let chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) req.destroy();
      else chunks.push(c);
    });
    req.on("end", () => {
      if (size > MAX_BYTES) { send(res, 413, "payload too large"); return; }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch (e) { send(res, 400, "bad json"); return; }

      const code = typeof body.code === "string" ? body.code : "";
      const preset = PRESETS.includes(body.preset) ? body.preset : "customvm";
      const luaVersionFlag = body.luaVersion === "Lua51" ? "--Lua51" : "--LuaU";

      if (!code.trim()) { send(res, 400, "no code provided"); return; }
      if (!fs.existsSync(CLI_PATH)) {
        send(res, 500,
          "cli.lua not found next to server.js. Copy cli.lua, catph/, presets.lua, " +
          "config.lua, logger.lua, colors.lua and highlightlua.lua into this folder.");
        return;
      }

      const id = crypto.randomBytes(6).toString("hex");
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "catph-"));
      const inFile = path.join(tmpDir, "in-" + id + ".lua");
      const outFile = path.join(tmpDir, "in-" + id + ".obfuscated.lua");

      fs.writeFileSync(inFile, code, "utf8");

      execFile(
        "lua",
        [CLI_PATH, inFile, "--preset", preset, luaVersionFlag, "--out", outFile, "--nocolors", "--quiet"],
        { cwd: ROOT, timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (err, stdout, stderr) => {
          let result = null;
          try { result = fs.readFileSync(outFile, "utf8"); } catch (e) {}
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}

          if (!result) {
            send(res, 500, JSON.stringify({
              ok: false,
              error: stderr || (err && err.message) || "obfuscation failed with no output",
            }), "application/json");
            return;
          }
          send(res, 200, JSON.stringify({ ok: true, result, log: stderr || "" }), "application/json");
        }
      );
    });
    return;
  }

  send(res, 404, "not found");
});

server.listen(PORT, () => {
  console.log("Catph web UI running at http://localhost:" + PORT);
  console.log("Expecting cli.lua at: " + CLI_PATH);
});
