# Aignal 信息来源池

更新日期：2026-06-10

这份来源池按 Aignal 网页里的 7 个分类组织：写代码 AI、图片 AI、视频 AI、研究论文、模型/产品、产业/投资、工具应用。机器可读数据在 `data/source-pool.json`，后续可以接入 `scripts/generate-feed.mjs`，替代当前脚本里的硬编码 `sources`。

## 来源等级

- `S`：一手权威来源。公司官网、官方 changelog、论文正式库、政府/监管文件、SEC filing。
- `A`：权威验证来源。模型库、benchmark、leaderboard、公开数据平台。
- `B`：发现和市场情报来源。Product Hunt、G2、Crunchbase、GitHub 趋势类平台。
- `C`：社区线索来源。只能用于早期发现，不直接作为事实来源。

## 接入原则

- 发布事实优先用 `S` 级来源；`A` 级可用于验证模型能力、榜单变化和采用趋势。
- `B` 级来源适合发现工具、创业公司和市场热度，但要回到官网、docs、release notes、GitHub release 或监管文件确认。
- 论文类来源要区分 preprint、review 中、accepted proceedings；arXiv 不等于同行评审结论。
- Leaderboard 必须保存抓取日期、榜单名称、模型版本和方法说明，避免排名变化后无法追溯。
- 投融资、上市公司、政策类信号优先用 SEC、公司 IR、政府页面、Stanford AI Index、OECD.AI 等来源。

## 分类优先级

### 写代码 AI

优先抓官方 changelog、工程平台和 coding benchmark。核心来源包括 GitHub Changelog、GitHub Copilot、OpenAI API Changelog、Claude Platform release notes、Claude Code changelog、Gemini API changelog、Cursor changelog、Replit changelog、NVIDIA Developer Blog。验证来源包括 SWE-bench、LiveCodeBench、Aider leaderboards。

### 图片 AI

优先抓模型发布、创意工具平台和视觉模型 benchmark。核心来源包括 OpenAI News、Google DeepMind、Google AI Blog、Adobe News、Black Forest Labs、NVIDIA Blog、NVIDIA Research、Hugging Face Model Cards、Artificial Analysis Text-to-Image、arXiv cs.CV、CVF Open Access。

### 视频 AI

优先抓官方模型页、研究页和视频 benchmark。核心来源包括 OpenAI Sora、Runway Research、Luma News、Pika FAQ、Google DeepMind、NVIDIA Blog、NVIDIA Developer Blog、NVIDIA Research、Adobe Firefly partner pages、Artificial Analysis Text-to-Video/Image-to-Video、VBench、arXiv cs.CV。

### 研究论文

优先抓论文平台、正式 proceedings 和一手研究页面。核心来源包括 arXiv API、arXiv category taxonomy、OpenReview、ACL Anthology、CVF Open Access、PMLR、NeurIPS Proceedings、Hugging Face Papers、NVIDIA Research、NVIDIA Developer Blog。

### 模型/产品

优先抓模型发布说明、官方模型页、模型库和基础设施平台。核心来源包括 OpenAI Model Release Notes、Claude Release Notes、Google DeepMind、Meta Llama、Mistral News/Changelog、Cohere Changelog、DeepSeek News、Qwen Hugging Face、NVIDIA Newsroom、NVIDIA Blog、NVIDIA Developer Blog、NVIDIA Research、Hugging Face Hub、Artificial Analysis Models、LMArena、Epoch AI Benchmarks。

### 产业/投资

优先抓监管文件、政策框架、宏观报告、市场数据库和关键 AI 基础设施厂商动态。核心来源包括 SEC EDGAR API、SEC Filings Search、NVIDIA Newsroom、NVIDIA Blog、Crunchbase Data、CB Insights AI 100、Stanford AI Index、OECD.AI、NIST AI RMF、EU GPAI Code of Practice、AI.gov。

### 工具应用

优先抓产品发现平台、工程工具和开源项目元数据，再回到官网验证。核心来源包括 Product Hunt、Product Hunt API、GitHub Trending、GitHub REST API、GitHub Releases API、NVIDIA Developer Blog、G2 AI category、Chrome Web Store docs、GitHub AI Topics、OSSInsight Trending AI。

## 质量优先覆盖策略

- 每个分类都有独立来源池，但分类当天没有达到合格质量时，不用低质量内容硬填。
- 缺口应该进入质量报告，记录为 `coverage_gap`，例如“视频 AI 今日无达标来源”。
- 当同一信号被多个来源重复报道时，优先保留一手来源，其他来源作为验证证据，而不是生成重复卡片。
- 同一来源同一天不应垄断单个分类；如果都是同一家来源的相似内容，应做 canonical 合并后再排序。

## 下一步接入建议

1. 先写一个读取 `data/source-pool.json` 的轻量 loader，校验 `category_ids` 和 `source_ids` 都能互相匹配。
2. 给 feed 采集脚本增加 `--source-tier=S,A`、`--category=models_products` 这类过滤参数。
3. 先接入 RSS/API 友好的来源，如 OpenAI、Anthropic、Hugging Face、arXiv、GitHub API。
4. 对 HTML-only 来源加缓存和失败降级，避免一次抓取失败影响整天 feed。
5. 给每条生成的信号保留 `source_pool_id`、`authority_tier`、`verification_rule`，后续前端可以展示“来源质量”。
