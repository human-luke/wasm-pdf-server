const express = require('express');
const fs = require('fs');
const path = require('path');

const wasmModule = require('./pdftex.wasm/PdfTeXEngine.js');


let engine;
const app = express();
app.use(express.json({ limit: '1mb' }));

(async () => {
  
  engine = new wasmModule.PdfTeXEngine();
  await engine.loadEngine();
  console.log("✅ LaTeX engine loaded");
})();



global.fetch = (url) => {
  const fs = require('fs');
  const path = require('path');
  const wasmPath = path.resolve(__dirname, 'pdftex.wasm');
  return Promise.resolve({
    arrayBuffer: () => Promise.resolve(fs.readFileSync(wasmPath).buffer)
  });
};


app.post('/compile', async (req, res) => {
  try {
    const latex = req.body.latex;
    if (!latex || !engine) return res.status(400).send("Engine not ready or LaTeX missing");

    engine.flushCache();
    engine.writeMemFSFile("main.tex", latex);
    engine.setEngineMainFile("main.tex");

    const result = await engine.compileLaTeX();

    if (!result.pdf) {
      return res.status(500).json({ error: "Compilation failed", log: result.log });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(result.pdf));
  } catch (err) {
    console.error("Compilation error:", err);
    res.status(500).json({ error: "Compilation error", details: err.toString() });
  }
});

// Serve static files (like the WASM file)
app.use(express.static(path.join(__dirname, 'public')));

//  Example:  Put your pdftex.wasm file in a "public" directory
//  Then you can access it via /pdftex.wasm


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`LaTeX API running on port ${port}`));
