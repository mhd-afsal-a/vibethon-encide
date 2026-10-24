require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;
const ROADMAP_PATH = path.join(__dirname, "fakeRoadmap.json");

app.use(cors());
app.use(express.json());

function loadFakeRoadmap() {
  const raw = fs.readFileSync(ROADMAP_PATH, "utf8");
  return JSON.parse(raw);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/roadmap-test", (_req, res) => {
  res.json(loadFakeRoadmap());
});

app.post("/roadmap", (_req, res) => {
  res.json(loadFakeRoadmap());
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
