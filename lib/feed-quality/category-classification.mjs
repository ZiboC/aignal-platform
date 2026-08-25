export const CATEGORY_IDS = [
  "coding_ai",
  "image_ai",
  "video_ai",
  "research_papers",
  "models_products",
  "business_investment",
  "tools_apps"
];

export const CATEGORY_DEFINITIONS = {
  coding_ai: "AI coding assistants, coding agents, IDEs, repositories, software engineering, and developer workflows.",
  image_ai: "AI image generation or editing, creative visual tools, photography, and design-focused image products.",
  video_ai: "AI video generation or editing, avatars, animation, filmmaking, and video-production tools.",
  research_papers: "Research papers, scientific studies, benchmarks, datasets, evaluations, and surveys.",
  models_products: "AI model releases, model updates, APIs, inference platforms, and general AI product launches.",
  business_investment: "Funding, acquisitions, partnerships, revenue, market strategy, policy, regulation, and enterprise adoption.",
  tools_apps: "End-user AI applications, productivity tools, assistants, and non-coding workflows."
};

const rules = {
  coding_ai: [
    [3.5, /\b(coding agents?|ai coding|code generation|code completion|software development|software engineering)\b/i],
    [3, /\b(github copilot|claude code|codebase|pull requests?|repositories?|developer tools?|ide|sdk|cli)\b/i],
    [2, /\b(debugging|code review|programming|developers? workflow)\b/i]
  ],
  image_ai: [
    [4, /\b(text[- ]to[- ]image|image generation|image generator|image editing|image editor|image model)\b/i],
    [3, /\b(photo generation|photo editing|generative fill|visual design|creative image|ai canvas)\b/i],
    [2, /\b(diffusion image|illustration|graphic design)\b/i]
  ],
  video_ai: [
    [4, /\b(text[- ]to[- ]video|image[- ]to[- ]video|video generation|video generator|video editing|video editor|video model)\b/i],
    [3, /\b(ai avatars?|lip[- ]sync|camera movement|film generation|generative video)\b/i],
    [2, /\b(animation generation|video production|video creative)\b/i]
  ],
  research_papers: [
    [4, /\b(arxiv|research paper|scientific paper|systematic review|position paper)\b/i],
    [3, /\b(benchmark|dataset|evaluation|survey|empirical study|we (introduce|propose|present))\b/i],
    [2, /\b(research|experiment|methodology|findings|accuracy|assessment)\b/i]
  ],
  models_products: [
    [4, /\b(model release|released? (a|an|the|new)? ?model|new ai model|model update|updated on hugging face)\b/i],
    [3, /\b(open weights?|foundation model|language model release|reasoning model|multimodal model release)\b/i],
    [2, /\b(api release|api update|inference platform|parameters?|model family|model available)\b/i]
  ],
  business_investment: [
    [4, /\b(funding round|raised? \$|series [a-f]|acquisition|acquires?|merger|investment)\b/i],
    [3, /\b(partnership|partners? with|revenue|valuation|market share|enterprise adoption)\b/i],
    [2, /\b(policy|regulation|regulatory|governance|commercial|business strategy|advertising campaign)\b/i]
  ],
  tools_apps: [
    [4, /\b(ai app|ai tool|productivity assistant|end-user application)\b/i],
    [3, /\b(workflow builder|automation tool|workspace assistant|browser assistant)\b/i],
    [2, /\b(productivity|workflow|application|assistant|plugin)\b/i]
  ]
};

export function classifyRecord(record) {
  const title = String(record.title ?? record.title_en ?? "");
  const summary = String(record.summary ?? record.summary_en ?? "");
  const source = String(record.sourceName ?? record.source_name ?? "");
  const fallback = record.fallbackCategory ?? record.fallback_category ?? null;
  const scores = Object.fromEntries(CATEGORY_IDS.map((category) => [category, 0]));
  const evidence = Object.fromEntries(CATEGORY_IDS.map((category) => [category, []]));

  for (const category of CATEGORY_IDS) {
    applyRules(scores, evidence, category, title, 1.8);
    applyRules(scores, evidence, category, summary, 1);
  }

  if (isResearchSource(record)) {
    addScore(scores, evidence, "research_papers", 20, "research source");
  }
  if (/claude code|github copilot/i.test(source)) {
    addScore(scores, evidence, "coding_ai", 5, "coding source");
  }
  if (/luma|runway|pika|sora/i.test(source)) {
    addScore(scores, evidence, "video_ai", 1.5, "video-oriented source");
  }
  if (CATEGORY_IDS.includes(fallback)) {
    addScore(scores, evidence, fallback, 0.75, "source fallback");
  }

  const ranked = CATEGORY_IDS
    .map((category) => ({ category, score: round(scores[category]) }))
    .sort((a, b) => b.score - a.score || CATEGORY_IDS.indexOf(a.category) - CATEGORY_IDS.indexOf(b.category));
  const top = ranked[0];
  const runnerUp = ranked[1];

  if (top.score <= 0) {
    const category = CATEGORY_IDS.includes(fallback) ? fallback : "models_products";
    return {
      category,
      confidence: 0.4,
      scores,
      evidence: evidence[category],
      margin: 0,
      reason: CATEGORY_IDS.includes(fallback) ? "source fallback only" : "default category"
    };
  }

  const margin = round(top.score - runnerUp.score);
  const confidence = round(Math.min(0.98, 0.5 + Math.min(top.score, 12) / 30 + Math.min(Math.max(margin, 0), 8) / 20));
  return {
    category: top.category,
    confidence,
    scores,
    evidence: evidence[top.category],
    margin,
    reason: evidence[top.category].slice(0, 3).join(", ") || "highest category score"
  };
}

export function isResearchSource(record) {
  const source = String(record.sourceName ?? record.source_name ?? "");
  return /\barxiv\b|hugging face papers?|papers with code/i.test(source);
}

export function hasExplicitAISignal(record) {
  if (isResearchSource(record)) return true;

  const source = String(record.sourceName ?? record.source_name ?? "");
  if (/claude code|github copilot|on hugging face|hugging face hub/i.test(source)) return true;

  const text = `${record.title ?? record.title_en ?? ""} ${record.summary ?? record.summary_en ?? ""}`;
  return /\b(ai|artificial intelligence|machine learning|deep learning|llms?|large language models?|generative|agents?|agentic|inference|neural|multimodal|computer vision|vision-language|robotics?|copilot|chatgpt|openai|anthropic|claude|gemini|cuda|model training|foundation models?)\b/i.test(text);
}

function applyRules(scores, evidence, category, text, multiplier) {
  for (const [weight, pattern] of rules[category]) {
    if (!pattern.test(text)) continue;
    addScore(scores, evidence, category, weight * multiplier, pattern.source);
  }
}

function addScore(scores, evidence, category, value, label) {
  scores[category] += value;
  evidence[category].push(label);
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}
