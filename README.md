# Catph local web UI

A small webpage for the Catph obfuscator you already have. The page talks to
a tiny local server (`server.js`), which runs your real `cli.lua` as a
subprocess — the actual obfuscation pipeline is unchanged, this just gives it
a browser front end instead of the command line.

Nothing is reimplemented and nothing leaves your machine; the server only
listens on `localhost`.

## Setup

1. Copy these files from your existing `main-obfuscator.zip` into this same
   folder, next to `server.js`:
   - `cli.lua`
   - `catph/` (the whole folder)
   - `presets.lua`
   - `config.lua`
   - `logger.lua`
   - `colors.lua`
   - `highlightlua.lua`

2. Install **Lua 5.1** and make sure the `lua` command runs it.
   The tool uses `loadstring` and `setfenv`, which only exist in Lua 5.1 —
   not 5.2+, and not Luau itself. (`--LuaU` controls what the *output* code
   targets; it doesn't change what runs the tool.)
   - macOS: `brew install lua@5.1`
   - Debian/Ubuntu: `sudo apt install lua5.1` (the command may be `lua5.1`
     instead of `lua` — if so, edit the `execFile("lua", ...)` line near the
     bottom of `server.js` to `"lua5.1"`)
   - Windows: install Lua 5.1 and make sure `lua.exe` is on PATH

3. Install **Node.js** if you don't have it already (any recent version).

4. Run:
   ```
   node server.js
   ```

5. Open **http://localhost:8787** in your browser.

## Using it

- Upload a `.lua` file or paste code.
- Pick a preset (`customvm` is the CLI's own default) and a target
  (**LuaU** for Roblox, or **Lua 5.1**).
- Click **Obfuscate**. The output appears below, with Copy and Download
  buttons.

## If it fails

The page shows the server's error message directly, which is almost always
one of:
- `node server.js` isn't running
- `lua` isn't installed or isn't on PATH
- `cli.lua` (and the files from step 1) aren't in this folder

I haven't been able to run this myself — there's no internet access in my
environment to install a Lua interpreter, and only a C library for Lua 5.4
is present, not the Lua 5.1 CLI this tool needs. I checked `server.js` and
`app.js` for syntax errors, but the first real run needs to happen on your
machine.
