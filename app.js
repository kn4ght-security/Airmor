(function () {
  var drop = document.getElementById("drop");
  var fileInput = document.getElementById("file");
  var fileInfo = document.getElementById("fileInfo");
  var codeBox = document.getElementById("code");
  var runBtn = document.getElementById("run");
  var clearBtn = document.getElementById("clear");
  var statusEl = document.getElementById("status");
  var outputPanel = document.getElementById("outputPanel");
  var output = document.getElementById("output");
  var copyBtn = document.getElementById("copy");
  var downloadBtn = document.getElementById("download");
  var presetSel = document.getElementById("preset");
  var luaVersionSel = document.getElementById("luaVersion");

  var pickedFile = null;
  var runBtnIdleText = runBtn.textContent;

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
  }
  function setProcessing(on) {
    runBtn.disabled = on;
    runBtn.textContent = on ? "Running cli.lua..." : runBtnIdleText;
  }

  drop.addEventListener("click", function () { fileInput.click(); });
  drop.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return;
    pickedFile = f;
    fileInfo.textContent = f.name + " \u00b7 " + f.size + " bytes";
    fileInfo.style.display = "block";
  });

  clearBtn.addEventListener("click", function () {
    pickedFile = null;
    fileInput.value = "";
    fileInfo.style.display = "none";
    codeBox.value = "";
    outputPanel.style.display = "none";
    setStatus("");
  });

  function getSourceText(cb) {
    if (pickedFile) {
      var reader = new FileReader();
      reader.onload = function () { cb(reader.result); };
      reader.onerror = function () { setStatus("Could not read that file.", "err"); setProcessing(false); };
      reader.readAsText(pickedFile);
      return;
    }
    cb(codeBox.value || 'print("Hello, Luau!")');
  }

  runBtn.addEventListener("click", function () {
    setProcessing(true);
    outputPanel.style.display = "none";
    setStatus("Sending to local server...");

    getSourceText(function (code) {
      fetch("/obfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          preset: presetSel.value,
          luaVersion: luaVersionSel.value,
        }),
      })
        .then(function (r) {
          return r.text().then(function (text) {
            var data;
            try { data = JSON.parse(text); } catch (e) { data = null; }
            if (!r.ok || !data || !data.ok) {
              throw new Error((data && data.error) || text || ("HTTP " + r.status));
            }
            return data;
          });
        })
        .then(function (data) {
          setProcessing(false);
          setStatus("Done." + (data.log ? " " + data.log : ""), "ok");
          output.textContent = data.result;
          outputPanel.style.display = "block";
        })
        .catch(function (err) {
          setProcessing(false);
          setStatus(
            "Failed: " + err.message +
            "\n\nMake sure server.js is running (node server.js) and that Lua 5.1 is on PATH.",
            "err"
          );
        });
    });
  });

  copyBtn.addEventListener("click", function () {
    navigator.clipboard && navigator.clipboard.writeText(output.textContent);
  });
  downloadBtn.addEventListener("click", function () {
    var blob = new Blob([output.textContent], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = (pickedFile ? pickedFile.name.replace(/\.lua$/i, "") : "script") + ".obfuscated.lua";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  });
})();
