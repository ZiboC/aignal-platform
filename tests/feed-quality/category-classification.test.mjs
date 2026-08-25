import assert from "node:assert/strict";
import test from "node:test";
import { classifyRecord } from "../../lib/feed-quality/category-classification.mjs";

test("classifies explicit AI coding tools without treating generic developer copy as coding", () => {
  assert.equal(classifyRecord({
    title: "Claude Code adds repository-aware coding agents",
    summary: "The release improves code review and developer workflows.",
    sourceName: "Claude Code Changelog"
  }).category, "coding_ai");

  assert.notEqual(classifyRecord({
    title: "OpenAI releases a new image model for developers",
    summary: "The model supports image generation and editing through an API."
  }).category, "coding_ai");
});

test("separates creative image and video products", () => {
  assert.equal(classifyRecord({
    title: "New image model adds text-to-image generation and editing",
    summary: "Designers can edit photos with generative fill."
  }).category, "image_ai");

  assert.equal(classifyRecord({
    title: "EditStream enables interactive video generation and editing",
    summary: "The model supports text-to-video, image-to-video, and camera movement."
  }).category, "video_ai");
});

test("keeps scientific imaging and multimodal benchmarks in research", () => {
  assert.equal(classifyRecord({
    title: "Topology of a Smile: Persistent Homology in Dental Imaging",
    summary: "This study evaluates a method on a medical imaging dataset and reports diagnostic accuracy.",
    sourceName: "arXiv cs.CV",
    fallbackCategory: "image_ai"
  }).category, "research_papers");

  assert.equal(classifyRecord({
    title: "EditStream: A Unified Framework for Interactive Video Generation and Editing",
    summary: "The paper proposes text-to-video and image-to-video generation methods.",
    sourceName: "arXiv cs.CV"
  }).category, "research_papers");

  assert.equal(classifyRecord({
    title: "PUMA: A Benchmark for Culturally Grounded Multimodal Understanding",
    summary: "The paper introduces 900 evaluation tasks for multimodal models.",
    sourceName: "arXiv cs.CL"
  }).category, "research_papers");
});

test("classifies model updates and business events by their primary subject", () => {
  assert.equal(classifyRecord({
    title: "Tencent updates WeMM-Embedding-2B on Hugging Face",
    summary: "The updated multimodal embedding model is now available."
  }).category, "models_products");

  assert.equal(classifyRecord({
    title: "AI startup raises $40 million Series B",
    summary: "The funding round supports enterprise expansion."
  }).category, "business_investment");
});
