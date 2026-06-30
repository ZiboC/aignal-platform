import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeCandidates,
  normalizeSignalTitle,
  normalizeSignalUrl
} from "../../lib/feed-quality/canonicalize.mjs";

test("normalizeSignalUrl strips hash, utm params, and path trailing slash", () => {
  assert.equal(
    normalizeSignalUrl("https://example.com/post/?utm_source=x&id=1#section"),
    "https://example.com/post?id=1"
  );
});

test("normalizeSignalTitle removes noisy punctuation and lowercases", () => {
  assert.equal(normalizeSignalTitle("  OpenAI launches GPT-5!!! "), "openai launches gpt 5");
});

test("canonicalizeCandidates groups duplicate original URLs", () => {
  const candidates = [
    {
      id: "a",
      title_en: "OpenAI launches model",
      original_url: "https://example.com/a?utm_source=x",
      source_pool_id: "openai_blog",
      authority_tier: "S"
    },
    {
      id: "b",
      title_en: "OpenAI launches model",
      original_url: "https://example.com/a",
      source_pool_id: "another_source",
      authority_tier: "A"
    }
  ];

  const result = canonicalizeCandidates(candidates);
  assert.equal(result.items.length, 1);
  assert.equal(result.duplicateGroups.length, 1);
  assert.equal(result.items[0].supporting_sources.length, 2);
  assert.equal(result.items[0].id, "a");
});

test("canonicalizeCandidates groups duplicate events with different URLs and matching titles", () => {
  const candidates = [
    {
      id: "official",
      title_en: "NVIDIA releases new TensorRT inference tools",
      original_url: "https://developer.nvidia.com/blog/tensorrt-tools",
      source_pool_id: "nvidia_developer_blog",
      authority_tier: "S"
    },
    {
      id: "coverage",
      title_en: "NVIDIA releases new TensorRT inference tools",
      original_url: "https://example.com/news/nvidia-tensorrt",
      source_pool_id: "tech_news",
      authority_tier: "B"
    }
  ];

  const result = canonicalizeCandidates(candidates);
  assert.equal(result.items.length, 1);
  assert.equal(result.duplicateGroups.length, 1);
  assert.equal(result.items[0].id, "official");
  assert.equal(result.items[0].supporting_sources.length, 2);
});

test("canonicalizeCandidates groups near-duplicate titles with shared terms", () => {
  const candidates = [
    {
      id: "a",
      title_en: "OpenAI releases new agent safety benchmark",
      original_url: "https://openai.com/news/agent-safety-benchmark",
      source_pool_id: "openai_blog",
      authority_tier: "S"
    },
    {
      id: "b",
      title_en: "OpenAI releases agent safety benchmark",
      original_url: "https://example.com/openai-agent-safety",
      source_pool_id: "coverage",
      authority_tier: "B"
    }
  ];

  const result = canonicalizeCandidates(candidates);
  assert.equal(result.items.length, 1);
  assert.equal(result.duplicateGroups.length, 1);
});
