import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 5174);
const hasExplicitPort = Boolean(process.env.PORT);
const distDir = path.join(__dirname, "dist");

app.use(express.static(distDir));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

function listen(nextPort, retryCount = 0) {
  const server = app.listen(nextPort, "0.0.0.0", () => {
    console.log(`FrontEnd is running at http://localhost:${nextPort}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !hasExplicitPort && retryCount < 10) {
      const fallbackPort = nextPort + 1;
      console.warn(`Port ${nextPort} is already in use, trying ${fallbackPort}...`);
      listen(fallbackPort, retryCount + 1);
      return;
    }

    if (error.code === "EADDRINUSE") {
      console.error(`Port ${nextPort} is already in use. Set PORT=5175 or stop the existing process.`);
      process.exit(1);
    }

    throw error;
  });
}

listen(port);
