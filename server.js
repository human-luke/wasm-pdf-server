const express = require('express');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '1mb' }));

(async () => {
  try {
    // Correct WASM instantiation
    const wasmBuffer = fs.readFileSync('./PdfTeXEngine.wasm'); // Adjust path to .wasm file
    const wasmModule = await WebAssembly.instantiate(wasmBuffer);
    const engine = new wasmModule.instance.exports.PdfTeXEngine(); // Adjust export name
    await engine.loadEngine();
    console.log('LaTeX engine loaded');

    app.post('/compile', async (req, res) => {
      try {
        const latex = req.body.latex;
        if (!latex || !engine) return res.status(400).send('Engine not ready or LaTeX missing');

        engine.flushCache();
        engine.writeMemFSFile('main.tex', latex);
        engine.setEngineMainFile('main.tex');
        const result = await engine.compileLaTeX();

        if (result.pdf) {
          res.setHeader('Content-Type', 'application/pdf');
          res.send(Buffer.from(result.pdf));
        } else {
          return res.status(500).json({ error: 'Compilation failed', log: result.log });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Compilation error', details: err.toString() });
      }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`LaTeX API running on port ${port}`));
  } catch (err) {
    console.error('Failed to initialize engine:', err);
  }
})();
