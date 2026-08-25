import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyRecord,
  hasExplicitAISignal
} from "../../lib/feed-quality/category-classification.mjs";

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

test("requires explicit AI evidence instead of trusting the source brand", () => {
  assert.equal(hasExplicitAISignal({
    title: "5 ways to upgrade your home decor with Google Search",
    summary: "Find decor inspiration, shop for furniture, and tackle DIY projects.",
    sourceName: "Google AI Blog"
  }), false);

  assert.equal(hasExplicitAISignal({
    title: "Publishers bring blockbuster PC games to RTX Spark",
    summary: "The release adds anti-cheat technology and enhanced visual quality.",
    sourceName: "NVIDIA Newsroom"
  }), false);

  assert.equal(hasExplicitAISignal({
    title: "Jetson robotics computer improves edge AI inference",
    summary: "The new platform targets robotics and multimodal models.",
    sourceName: "NVIDIA Newsroom"
  }), true);

  assert.equal(hasExplicitAISignal({
    title: "A new benchmark for multimodal understanding",
    summary: "The paper evaluates vision-language models.",
    sourceName: "arXiv cs.CL"
  }), true);
});
