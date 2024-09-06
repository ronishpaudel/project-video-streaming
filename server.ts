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

// serve static files with proper MIME types
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res, path) => {
      if (path.endsWith(".m3u8")) {
        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      } else if (path.endsWith(".ts")) {
        res.setHeader("Content-Type", "video/mp2t");
      } else if (path.endsWith(".mov")) {
        res.setHeader("Content-Type", "video/quicktime");
      }
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
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
  const courseDirectoryPath = path.join(__dirname, "uploads/course");

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

    const urls = lessonIds.map((lessonId) => {
      return `/uploads/course/${lessonId}/index.m3u8`;
    });

    res.status(200).json({ urls });
  });
});

// upload route handler
app.post("/upload", upload.single("file"), function (req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  // convert video in HLS format
  const lessonId = uuidv4();
  const videoPath = req.file.path;
  const outputPath = `./uploads/course/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`;
  console.log("hlsPath", hlsPath);

  // if the output directory doesn't exist, create it
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // command to convert video to HLS format using ffmpeg
  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  // run the ffmpeg command; usually done in a separate process
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
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

const PORT = process.env.PORT || 8000;

app.listen(PORT, function () {
  console.log(`Server running on port ${PORT}`);
});
