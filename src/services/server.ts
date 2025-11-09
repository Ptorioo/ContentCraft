// server.ts
import express from "express";
import cors from "cors";
import multer from "multer";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Accept both multipart (FormData) and JSON for flexibility
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  // 1) multipart/form-data path
  const isMultipart = req.is("multipart/form-data");
  if (isMultipart) {
    const content = req.body?.content as string | undefined;
    const file = req.file; // optional
    if (!content && !file) {
      return res.status(400).json({ error: "content or file required" });
    }

    // Do your work here using content/file.buffer
    const parts: string[] = [];
    if (content) parts.push(`content="${content.slice(0, 80)}"`);
    if (file) parts.push(`file="${file.originalname}" size=${file.size}`);
    return res.json({ message: `ok: ${parts.join(", ")}` });
  }

  // 2) JSON path (if you ever call it with JSON)
  const { content, prompt } = req.body ?? {};
  const text = content ?? prompt;
  if (!text) return res.status(400).json({ error: "content required" });
  return res.json({ message: `ok: ${String(text).slice(0, 80)}` });
});

app.listen(8787, () => {
  console.log("API on :8787");
});
