import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { exec } from "child_process";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:8000"],
    credentials: true,
  })
);

app.options("*", cors());
// Serve static files with proper MIME types
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      } else if (filePath.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      } else if (filePath.endsWith(".mov")) {
        res.setHeader("Content-Type", "video/quicktime");
      }
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.resolve(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// GET handler
app.get("/uploads", function (req, res) {
  const courseDirectoryPath = path.resolve(__dirname, "uploads/course");

  fs.readdir(courseDirectoryPath, (err, files) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Unable to scan directory", error: err });
    }

    const lessonIds = files.filter((file) => {
      const fullPath = path.join(courseDirectoryPath, file);
      return fs.statSync(fullPath).isDirectory();
    });

    if (lessonIds.length === 0) {
      return res.status(404).json({ message: "No lessons found" });
    }

    const urls = lessonIds.map(
      (lessonId) => `/uploads/course/${lessonId}/index.m3u8`
    );

    res.status(200).json({ urls });
  });
});

// POST handler
app.post("/upload", upload.single("file"), function (req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const lessonId = uuidv4();
  const videoPath = path.resolve(req.file.path);
  const outputPath = path.resolve(__dirname, "uploads/course", lessonId);
  const hlsPath = path.join(outputPath, "index.m3u8");

  console.log(`hlsPath : ./upload/course/${lessonId}/index.m3u8`);
  // Ensure directories  exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // ffmpeg command to convert video to HLS format
  const ffmpegCommand = `ffmpeg -i "${videoPath}" -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 "${hlsPath}"`;

  // Run the ffmpeg command
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ message: "Error converting video" });
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);

    const videoUrl = `http://localhost:3000/uploads/course/${lessonId}/index.m3u8`;
    res.json({
      message: "Video converted to HLS format",
      videoUrl: videoUrl,
      lessonId: lessonId,
    });
  });
});

app.get("/", function (req, res) {
  res.json({ message: "Hello World!" });
});

let PORT = process.env.PORT || 3000;

const server = app.listen(PORT, function () {
  console.log(`Server running on port ${PORT}`);
});

// Handle port in use error and switch to another port
server.on("error", (err: CustomError) => {
  if (err.code === "EADDRINUSE") {
    console.log(
      `Port ${PORT} is already in use. Switching to a different port...`
    );
    PORT = Number(PORT) + 1;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } else {
    console.error(`Server error: ${(err as any).message}`);
  }
});

interface CustomError extends Error {
  code?: string;
}
