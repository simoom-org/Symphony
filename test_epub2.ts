import { exportToEpub } from "./src/utils/epubExporter.ts";
import { DocumentProject } from "./src/types.ts";
import fs from "fs";

// Create a dummy project
const dummyProject = {
  id: "test",
  metadata: {
    title: "Test",
    authors: "Author",
    tags: "tag1, tag2",
    translators: "",
    language: "en"
  },
  chapters: [
    { id: "1", title: "Chapter 1", content: "<p>Hello</p>", level: 1, updatedAt: new Date().toISOString() }
  ],
  settings: {
    fontSize: 16,
    lineHeight: 1.5
  }
} as DocumentProject;

// Mock saveAs
globalThis.saveAs = () => {};

exportToEpub(dummyProject).then(() => {
  console.log("EPUB export completed successfully!");
}).catch(err => {
  console.error("EPUB export failed:", err);
});