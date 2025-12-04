// server.ts
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const ROOT = process.cwd();
const PYTHON = process.env.PYTHON_PATH || "python";
const MODEL_SCRIPT = path.resolve(ROOT, "src/model/infer_ati.py");
const IMG_DIR = path.resolve(ROOT, "src/model/input_images");

// small helper: run python and parse JSON
function runPython(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [MODEL_SCRIPT, ...args], {
      cwd: ROOT,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8", // << force UTF-8 output
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            `python exited with code ${code}\nSTDERR:\n${stderr || "(empty)"}`
          )
        );
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (e) {
        reject(
          new Error(
            `Failed to parse python JSON.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`
          )
        );
      }
    });
  });
}

// POST /api/analyze  (FormData or JSON)
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    const isMultipart = req.is("multipart/form-data");
    let text = "";
    let relImg: string | undefined;

    if (isMultipart) {
      text = (req.body?.content as string) || "";
      const file = req.file;

      if (!text && !file) {
        return res.status(400).json({ error: "content or file required" });
      }

      if (file) {
        if (!fs.existsSync(IMG_DIR)) {
          fs.mkdirSync(IMG_DIR, { recursive: true });
        }
        const safeName =
          Date.now().toString() +
          "_" +
          file.originalname.replace(/[^\w.\-]/g, "_");
        const absPath = path.join(IMG_DIR, safeName);
        fs.writeFileSync(absPath, file.buffer);
        relImg = safeName; // relative to IMG_DIR, what python expects
      }
    } else {
      const { content, prompt, imageRelPath } = req.body ?? {};
      text = String(content ?? prompt ?? "");
      if (imageRelPath) {
        relImg = String(imageRelPath);
      }
      if (!text && !relImg) {
        return res
          .status(400)
          .json({ error: "content or imageRelPath required" });
      }
    }

    const args = ["--text", text];
    if (relImg) {
      args.push("--rel_img", relImg);
    }

    const result = await runPython(args);
    const responseData = {
      ati: result.ati,
      novelty: result.novelty,
      diversity: result.diversity,
    };
    return res.json(responseData);
  } catch (err: any) {
    console.error("analyze error:", err);
    return res
      .status(500)
      .json({ error: "python_error", detail: err?.message ?? String(err) });
  }
});

app.listen(8787, () => {
  console.log("API on :8787");
});
