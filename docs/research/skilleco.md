
# Please prepare a thorough research on the state of SKILLs for LLMs: marketplaces, standards, Claude Code specifics, notable plugins, big projects like superpowers for developers, researchers, project managers.

Here is a structured overview of the current “skills” landscape around LLMs, with a focus on standards, marketplaces, Claude Code, and the emerging “superpowers” stacks for different roles.

***

## 1. What “Skills” Mean Now: Tools, MCP, Skills, Skills Protocol

There are three overlapping but distinct abstractions you’ll see referenced:

- **Function-calling / “tools”**
Model outputs a structured function/tool call, your orchestration layer executes it and feeds results back. This is the base primitive in all major APIs (OpenAI tools, Anthropic tools, Gemini function calling, etc.).
- **MCP (Model Context Protocol)**
An open protocol (originally from Anthropic) for exposing *servers* of tools/resources/prompts to AI clients (Claude Code, ChatGPT, VS Code, etc.). MCP standardizes how hosts discover tools and call them, but **not how workflows/knowledge are packaged**.[^1][^2]
- **Agent Skills (SKILL.md)**
A *knowledge \& workflow* layer: folders of instructions plus optional scripts/assets, standardized by the **Agent Skills** open spec at `agentskills.io`. Skills are portable across platforms and models; the AI loads them when relevant (“progressive disclosure”) instead of keeping everything in-system prompts.[^3][^4][^5]

A good mental model:

- **Tools**: “What external actions can I perform?”
- **MCP**: “How do I connect to and manage many tools/services?”
- **Skills**: “What are the reusable procedural playbooks for doing work, which may internally use tools/MCP?”

Skills and tools are complementary: real systems increasingly use **all three**—skills for process knowledge, MCP for integrations, tools for individual actions.[^2][^1]

***

## 2. Agent Skills Open Standard (SKILL.md)

### Core spec

Agent Skills is now a **vendor-neutral open standard**, hosted at `agentskills.io` and backed by the Agentic AI Foundation (Linux Foundation umbrella). Key properties:[^6][^7][^8]

- A **skill** is a directory with this shape:[^4][^5][^3]
    - `SKILL.md` (required):
        - YAML frontmatter with at least:
            - `name`: lowercase, hyphenated identifier (≤64 chars)
            - `description`: up to 1024 chars describing what it does and when to use it
        - Markdown body with instructions (workflow steps, patterns, examples, etc.)
    - Optional:
        - `scripts/` – executable code (Python, JS, Bash, etc.)
        - `references/` – long-form docs, schemas, policies
        - `assets/` – templates, data files, icons, etc.
- **Progressive disclosure** to avoid context bloat:[^9][^10][^4]
    - Level 1: Only `name` + `description` are indexed for all skills (≈100 tokens/set).
    - Level 2: When a task matches, the agent loads the `SKILL.md` body (≤5000 tokens recommended).
    - Level 3: External resources (`scripts/`, `references/`, `assets/`) are loaded on demand.

This lets you have **large skill libraries** (hundreds/thousands) without stuffing everything into system prompts.[^11][^9]

### Adoption and interoperability

Agent Skills was originally a Claude feature, then opened as a cross‑platform standard in Dec 2025. Current adoption includes:[^7][^8][^6]

- **Claude Code and Claude API** – native first-class support.[^12][^13][^3]
- **OpenAI Codex CLI and ChatGPT** – OpenAI’s public `openai/skills` catalog and spec adoption.[^14][^15][^3]
- **VS Code / GitHub Copilot** – VS Code docs explicitly promote using Agent Skills for reusable capabilities across Copilot in the editor, Copilot CLI, and agent mode.[^16][^17]
- Other early adopters: Microsoft Copilot Studio, Cursor, Atlassian tools, Figma plugins, Letta, goose, Amp, etc.[^8][^5][^3][^11]

From a systems perspective, this is emerging as the **de facto format** for “portable instructions + workflow modules” that you want to reuse across multiple LLM hosts.

***

## 3. Skills Protocol (skillsprotocol.com) vs Agent Skills

In parallel, there is the **Skills Protocol** (`skillsprotocol.com`), which defines a JSON‑RPC 2.0 HTTP interface for skill runtimes.[^18][^19]

- It exposes *exactly 8 meta-tools* to agents:[^19]
    - Discovery: `list_skills`, `describe_skill`, `read_skill_file`
    - Execution: `execute_skill`, `run_code`
    - Blob management: `create_blob`, `read_blob`
    - Bootstrap: `load_skills_protocol_guide`
- Conceptually, this is a **runtime protocol**: skills live in a runtime, and LLMs work with them through these small meta-tools.

By contrast, **Agent Skills** standardizes the *filesystem format* (`SKILL.md` dirs). A lot of people pair the two:

- Agent Skills for how to structure skills on disk.
- Skills Protocol for how an LLM host talks to a skills runtime.[^18][^1]

When designing your own system, you’d usually:

- Author skill folders in SKILL.md format.
- Optionally wrap them with a Skills Protocol or MCP server for networked use.

***

## 4. Skills \& Skills Marketplaces

### Open, cross‑platform skill directories

Several public directories now index SKILL.md skills across GitHub and other sources:

- **Open Skills** (`openskills.cc`) – open directory of ~900+ OSS skills (and growing), all SKILL.md‑based.[^20]
- **SkillsMP** (`skillsmp.com`) – “Agent Skills Marketplace” advertising 25k+ skills compatible with Claude Code, Codex CLI and ChatGPT.[^21]
- **AgentSkills marketplace** (e.g. `agentskills.in`) – indexed skills (like `@openai/skill-creator`) with install commands and metadata.[^14]
- **openai/skills** – official OpenAI skill catalog for Codex/ChatGPT, aligned to the Agent Skills format.[^22][^15]
- **claude-plugins.dev / Discover Agent Skills** – indexing ≥55k skills useful with Claude Code, Cursor, etc., with search and metadata.[^23]

These function similarly to package indexes (npm, PyPI): you can discover, search, and then install skills into your local agent environment, usually via a CLI or host‑specific installer.

### Platform-level app / GPT marketplaces

In parallel with skills, platforms expose end‑user facing marketplaces:

- **OpenAI GPT Store / App Directory**
    - GPT Store (Jan 2024) evolved into a full **ChatGPT app directory + Apps SDK** by late 2025, letting developers publish apps/GPTs with deeper integrations.[^24][^25]
    - These “apps” often rely on tools/MCP internally; with Agent Skills adoption, many will start using skills under the hood for reusable workflows.
- **Enterprise agent platforms**
    - Salesforce Agentforce, Beam AI, SearchUnify, etc. increasingly offer **agent marketplaces** where teams install prebuilt agents for specific workflows (support, sales, ops).[^26][^27][^28]
    - These agents may or may not expose skills explicitly, but the direction is toward skills‑like packaging under the hood (for governance and portability).

The key trend: **skills are becoming the low‑level building block**, while GPTs/apps/agents are how users experience those capabilities.

***

## 5. Claude Code: Skills, Plugins, and Marketplaces

Claude Code is currently one of the most “skills‑first” developer environments.

### Skills in Claude Code

- Claude Code treats skills as **first‑class Agent Skills**:
    - Personal skills in `~/.claude/skills/*/SKILL.md`
    - Project skills in `.claude/skills/*/SKILL.md` checked into the repo.[^29][^13][^12]
- In the Claude Agent SDK, you enable them via:
    - `setting_sources` / `settingSources` pointing at user/project settings.
    - `allowed_tools=["Skill", ...]` to let the model invoke Skills.[^12]
- Claude:
    - Autonomously invokes relevant skills when their descriptions match the task.
    - Lets you run them explicitly via slash commands (e.g. `/skill-name`), since Claude Code extends the standard with direct invocation and subagent hooks.[^10][^13]

Anthropic’s docs and ecosystem guides strongly encourage you to treat **skill libraries as version‑controlled, shareable project assets**, not just local prompts.[^13][^10][^29]

### Claude Code plugins

On top of Skills, Claude Code has a **plugin system**:

- A plugin is a lightweight bundle that can include:[^30]
    - Slash commands (`/tdd`, `/ultrathink`, `/check`, etc.).
    - Subagents (specialized agents for distinct roles).
    - MCP servers (integrations with external tools/APIs).
    - Hooks (lifecycle extensions: session start, before/after commands, etc.).

Plugins are installed and managed through the `/plugin` command and can be organized into marketplaces.

### Plugin marketplaces

Claude Code supports **multiple plugin marketplaces**, each a Git/GitHub repo or hosted JSON that lists available plugins:[^31][^32]

- You add marketplaces via:
    - `/plugin marketplace add owner/repo`
    - or via URLs / local paths to `marketplace.json`.[^32]
- You then install individual plugins:
    - `/plugin install plugin-name@marketplace-name`.[^33][^32]

Key marketplaces and aggregators:

- **Official anthropics/claude-code marketplace** – ships official plugins (agent-sdk-dev, feature-dev, commit-commands, security-guidance, etc.).[^32][^30]
- **ccplugins/awesome-claude-code-plugins** – curated marketplace with 100+ plugins across categories (workflow orchestration, DevOps, PM, design, security, etc.).[^34][^30]
- **Community marketplaces**:
    - `ananddtyagi/claude-code-marketplace` – commands (e.g. `/lyra`, `/audit`) and agents (devops-automator, accessibility-expert, etc.).[^33]
    - `obra/superpowers` – the Superpowers framework marketplace (see below).[^35][^36]
- Aggregators:
    - `claudecodemarketplace.com` – browsing hundreds of plugins across marketplaces.[^37]
    - `claudemarketplaces.com` – meta‑directory of marketplaces.[^38]
    - `awesome-claude-plugins` repo tracks top 100 plugin repos and adoption metrics.[^39]

For team use, Claude Code lets you **pin marketplaces and default plugins in `.claude/settings.json`**, so when devs “trust” a repo, they’re prompted to install a standard stack (house skill library, hooks, DevOps tools, etc.).[^31][^32]

***

## 6. Notable Plugins, Skills, and Frameworks (“Superpowers”)

### 6.1 Superpowers (Jesse Vincent)

**Superpowers** is one of the most influential Claude Code frameworks for dev workflows:[^36][^40][^35]

- Distributed as a Claude Code plugin + a coherent **skills library**.
- Installation: add the `obra/superpowers` marketplace and install the `superpowers` plugin, then restart Claude Code.[^35][^36]
- Features:
    - Injected session‑start hooks that tell Claude:
        - “You have skills; you must look them up and follow them.”
        - A disciplined flow: **brainstorm → plan → implement → review**.
    - Automatically creates per‑task git worktrees, encourages TDD, requires plan + validation before large edits.[^35]
    - Uses Agent Skills heavily; core skills live under `skills/` (e.g. `getting-started/SKILL.md` etc.), enforced via hooks.[^41][^35]

Conceptually, Superpowers is a **software development methodology encoded as skills + hooks**, turning Claude Code from “smart autocomplete” into a process‑enforcing teammate.

### 6.2 High‑impact Claude Code plugins

Recent “top plugins” lists converge on a handful of particularly powerful plugins:[^42][^43][^34]

- **Ralph Loop / Ralph Wiggum**
    - Official Anthropic plugin that turns Claude into a **self‑driving coding agent** capable of multi‑hour autonomous sessions via looping hooks and context reset patterns.[^42]
- **Firecrawl**
    - Web data extraction: turns arbitrary websites into clean, LLM‑ready data used in Claude sessions (and skills generation).[^42]
- **Context7**
    - MCP server that injects up‑to‑date API and code documentation, keeping Claude’s view of your ecosystem fresh.[^39][^42]
- **Playwright / browser automation plugins**
    - Plain‑English browser automation, integrated into Claude Code via MCP; ideal for E2E tests and scraping flows.[^42]
- **Security Guidance, Code Review, TDD Guard, TypeScript Quality Hooks**
    - Security Guidance: secure‑by‑default code suggestions.[^30][^42]
    - Code Review: structured PR reviews.[^34][^30]
    - TDD Guard / TS Quality Hooks: hooks enforcing tests/formatting/ESLint before changes go through.[^43]

These are essentially **“meta‑skills”**: composite stacks of skills, MCP integrations, and hooks that bring agentic behavior (plan, execute, validate) into day‑to‑day development.

### 6.3 Skills for researchers and PMs

While the most visible innovation is in dev workflows, there is a growing set of **cross‑role skills**:

- Claude Code plugin category list includes:
    - **Data Analytics**, **Documentation**, **Marketing \& Growth**, **Project \& Product Management**, **Security \& Legal**, etc.[^30]
- Examples:
    - Linear integration plugin – manage issues directly via Claude Code.[^42]
    - Skills for report generation, competitive analysis, and documentation workflows in Open Skills / SkillsMP directories (e.g., prebuilt “quarterly-report” or “user-research-synthesis” skills).[^11][^20]
    - Partner enterprise skills from Canva, Stripe, Notion, Zapier etc., curated in Anthropic’s enterprise skills directory.[^7][^8][^11]

On the **ChatGPT side**, GPT Store categories like “Research” and “Productivity” host many GPTs that internally use tools/MCP and, increasingly, skills; notable examples include Consensus for academic search and domain-specific research assistants.[^25][^24]

***

## 7. VS Code \& IDE Ecosystem: Agent Mode + Skills

Beyond Claude Code’s terminal UX, IDEs are converging on similar patterns:

- **VS Code AI extensibility**
    - Provides Language Model, Tools, and Chat APIs to build custom AI features into extensions (domain‑specific tools, agent modes, smart actions).[^17]
    - Combined with Agent Skills support, this enables **skills‑driven Copilot agents** for language/framework‑specific workflows (testing, debugging, deployment, etc.).[^16][^17]
- **Agent Skills in VS Code**
    - VS Code docs explicitly recommend Agent Skills when you want reusable, cross‑tool capabilities (shared across VS Code Copilot, Copilot CLI, GitHub agents).[^16]
    - SKILL.md structure closely mirrors `agentskills.io` spec: `name`, `description` for metadata, then body instructions, then referenced files for deeper content.[^16]
- **AI agent extensions (Cline, Roo Code, Continue.dev, etc.)**
    - These bring “agentic coding” into VS Code, running commands, editing code, and even interacting with browsers.[^44][^45]
    - Most are model‑agnostic and can be wired to Claude, GPT‑4/5, or local models; their internal structure increasingly looks like “agent + skills + tools + MCP”.

If you already live in VS Code, you can choose:

- **Claude‑first**: Claudix/Claude Code for VS Code integrates the Claude Code agent directly and can leverage your skills/plugins config.[^43]
- **Copilot‑first**: Use GitHub Copilot’s agent mode + Agent Skills to define standardized workflows that are portable to Codex CLI and other GitHub surfaces.[^22][^16]

***

## 8. Other Agent Platforms and Marketplaces

For completeness, there is a parallel wave of **enterprise AI agent platforms**:

- Platforms like Google Vertex AI Agent Builder, Salesforce Agentforce, Beam AI, SearchUnify, etc. provide:
    - Low‑/no‑code agent builders.
    - Prebuilt agent templates for support, sales, data extraction, etc.[^27][^28][^26]
    - Increasingly, **agent marketplaces** where businesses install and configure off‑the‑shelf agents.
- These platforms typically:
    - Use tools / function calling for actions.
    - Expose agent templates as marketplace items.
    - Are starting to align with standards like MCP and Agent Skills to avoid lock‑in and allow cross‑platform reuse.[^8][^11]

If you’re building enterprise automation, these are relevant as **deployment targets** for your skills/tooling stack, but the interesting “infrastructure” pieces remain MCP + tools + skills.

***

## 9. How to Design with Skills Today (Developer / Researcher / PM Focus)

Given your background, a practical architecture that leverages the current state of skills would look like:

### 9.1 For developers (Claude Code–centric stack)

- **Base stack**
    - Claude Code as the primary agentic environment.
    - Configure:
        - `.claude/skills/` (project) + `~/.claude/skills/` (personal) with SKILL.md‑based workflows.
        - `.claude/settings.json` to:
            - Enable Skills + relevant tools/MCP.
            - Require your preferred marketplaces and default plugins.
- **Plugins \& frameworks**
    - Install **Superpowers** as the “opinionated dev methodology”.[^40][^36][^35]
    - Add:
        - Ralph Loop (autonomous coding).
        - Context7 (code/API docs).
        - Firecrawl (web data).
        - Playwright / browser automation.
        - Sec/Review/TDD hooks appropriate to your tech stack.[^34][^43][^42]
- **Cross‑platform reuse**
    - Author your workflows as SKILL.md skills, then re‑use them:
        - In VS Code via Copilot Skills.
        - In Codex CLI / ChatGPT via Agent Skills installers.
        - In your own agent SDKs via `setting_sources` and allowed tools.[^3][^12][^16]


### 9.2 For researchers

- **Skills for research workflows**
    - Build skills like:
        - `literature-review/`
        - `data-cleaning/`
        - `qualitative-coding/`
    - Use `references/` to hold schemas and style guides, and `scripts/` for repeatable analysis scripts.
- **Tooling**
    - Pair skills with MCP servers:
        - Academic search (e.g., arXiv, Semantic Scholar).
        - Internal document stores/data warehouses.
    - Use ChatGPT GPTs or Claude agent configs that load your research skills by default for reproducible methods.[^24][^25][^11]


### 9.3 For product and project managers

- **Process‑oriented skills**
    - Encapsulate:
        - PRD templates, RFC templates.
        - Estimation and risk‑analysis checklists.
        - Release / rollout / incident‑postmortem workflows.
    - Attach **assets** (Notion templates, Jira field configs) and use MCP/tool calls to your tracking systems.[^11][^7]
- **Shared skill libraries**
    - Maintain an org‑level skills repo; admins provision it:
        - As an enterprise Skill library in Claude.[^7][^8][^11]
        - As shared skills in Copilot / VS Code.
        - As deployable assets in your internal agent platform.

This gives PMs and researchers “superpowers” that mirror what devs are getting from Superpowers/Ralph/etc., but tuned to their workflows.

***

## 10. Where This Is Going

Broad trends that matter for your system design:

1. **Agent Skills (SKILL.md) is solidifying as the dominant “workflow + instructions” format** across Claude, Copilot, Codex/ChatGPT, and other tools.[^5][^4][^3]
2. **MCP and Skills Protocol** provide a standardized “I/O layer” for tools and skills runtimes, making it easier to keep your skills portable while still using rich integrations.[^1][^2][^18]
3. **Claude Code is the most advanced skills‑native dev environment**, with plugins and marketplaces that encode full methodologies (Superpowers, Ralph Loop) rather than just isolated tools.[^10][^35][^42]
4. **Marketplaces are stratifying**:
    - Skill-level directories (Open Skills, SkillsMP, AgentSkills marketplaces).
    - Plugin-level catalogs (Claude Code marketplaces).
    - App/agent‑level stores (GPT Store, enterprise agent marketplaces).[^21][^20][^24][^30]
5. For someone building serious systems, the right move is to:
    - Treat skills as **versioned, testable artifacts** (like infrastructure‑as‑code, but for workflows).
    - Build a thin orchestration layer that can:
        - Load skills from SKILL.md repos.
        - Expose tools/MCP servers.
        - Deploy to multiple hosts (Claude Code, VS Code, ChatGPT, internal agents).

If you want, the next step can be a concrete design sketch for your own **multi‑agent/skills stack** (e.g., for your LLM infra, game design workflows, or museum tech projects) using SKILL.md + MCP + Claude Code as the backbone.
<span style="display:none">[^46][^47][^48][^49][^50][^51][^52][^53][^54][^55][^56][^57][^58][^59][^60]</span>

<div align="center">⁂</div>

[^1]: https://lucek.ai/blogs/agent-skills.html

[^2]: https://skywork.ai/blog/ai-agent/claude-skills-vs-mcp-vs-llm-tools-comparison-2025/

[^3]: https://llm-council.dev/adr/ADR-034-agent-skills-verification/

[^4]: https://agentskills.io/specification

[^5]: https://strapi.io/blog/what-are-agent-skills-and-how-to-use-them

[^6]: https://markets.financialcontent.com/wral/article/tokenring-2025-12-24-anthropic-launches-agent-skills-open-standard-the-new-universal-language-for-ai-interoperability

[^7]: https://siliconangle.com/2025/12/18/anthropic-makes-agent-skills-open-standard/

[^8]: https://www.unite.ai/anthropic-opens-agent-skills-standard-continuing-its-pattern-of-building-industry-infrastructure/

[^9]: https://markets.financialcontent.com/wral/article/tokenring-2025-12-25-anthropic-unveils-agent-skills-open-standard-a-blueprint-for-modular-ai-autonomy

[^10]: https://claudecn.com/en/blog/understanding-agent-skills/

[^11]: https://theaitrack.com/anthropic-open-agent-skills-standard/

[^12]: https://platform.claude.com/docs/en/agent-sdk/skills

[^13]: https://code.claude.com/docs/en/skills

[^14]: https://www.agentskills.in/marketplace/@openai%2Fskill-creator

[^15]: https://github.com/openai/skills

[^16]: https://code.visualstudio.com/docs/copilot/customization/agent-skills

[^17]: https://code.visualstudio.com/api/extension-guides/ai/ai-extensibility-overview

[^18]: https://skillsprotocol.com

[^19]: https://skillsprotocol.com/tools

[^20]: https://openskills.cc

[^21]: https://skillsmp.com

[^22]: https://developers.openai.com/codex/skills/

[^23]: https://claude-plugins.dev/skills

[^24]: https://www.datastudios.org/post/chatgpt-app-directory-and-gpt-store-marketplace-launch-sdk-features-and-platform-evolution

[^25]: https://openai.com/index/introducing-the-gpt-store/

[^26]: https://sanalabs.com/agents-blog/best-ai-automation-agents-enterprise-platforms-2025

[^27]: https://www.searchunify.com/resource-center/blog/top-5-enterprise-ai-agent-platforms-in-2025

[^28]: https://www.thesys.dev/blogs/ai-agent-platforms

[^29]: https://www.launchvault.dev/blog/ultimate-guide-agent-skills-claude

[^30]: https://github.com/ccplugins/awesome-claude-code-plugins

[^31]: https://code.claude.com/docs/en/plugin-marketplaces

[^32]: https://code.claude.com/docs/en/discover-plugins

[^33]: https://github.com/ananddtyagi/claude-code-marketplace

[^34]: https://claudecodemarketplace.com/marketplace/ccplugins-awesome-claude-code-plugins

[^35]: https://blog.fsck.com/2025/10/09/superpowers/

[^36]: https://claudecodemarketplace.com/marketplace/obra/superpowers

[^37]: https://claudecodemarketplace.com

[^38]: https://claudemarketplaces.com

[^39]: https://github.com/quemsah/awesome-claude-plugins

[^40]: https://github.com/obra/superpowers

[^41]: https://www.youtube.com/watch?v=vfVQP2AbUHo

[^42]: https://www.firecrawl.dev/blog/best-claude-code-plugins

[^43]: https://awesomeclaude.ai/awesome-claude-code

[^44]: https://dev.to/keploy/top-ai-powered-vs-code-extensions-for-coding-testing-in-2025-2cnn

[^45]: https://content.techgig.com/career-advice/5-ai-extensions-to-supercharge-your-vs-code-experience-in-2025/articleshow/124290339.cms

[^46]: https://github.com/ericbuess/claude-code-docs

[^47]: https://www.reddit.com/r/ClaudeCoder/comments/1og9vkg/catalogue_of_claude_code_tools_heres_everything_i/

[^48]: https://codewithmukesh.com/blog/claude-code-for-beginners/

[^49]: https://www.text.com/blog/best-ai-agent-platforms/

[^50]: https://github.com/github/gh-aw/issues/13965

[^51]: https://www.marketermilk.com/blog/best-ai-agent-platforms

[^52]: https://www.anthropic.com/news/claude-opus-4-6

[^53]: https://deepwiki.com/anthropics/skills/5.1-agent-skills-specification

[^54]: https://jimmysong.io/ai/agentskills/

[^55]: https://calstudio.com/custom-gpts

[^56]: https://www.reddit.com/r/ChatGPT/comments/1l61caj/prediction_proposal_native_gptstore_monetization/

[^57]: https://www.reddit.com/r/ChatGPTPromptGenius/comments/1l61e0a/prediction_proposal_native_gptstore_monetization/

[^58]: https://graphite.com/guides/best-vscode-extensions-ai

[^59]: https://strapi.io/blog/vs-code-extensions

[^60]: https://www.reddit.com/r/claude/comments/1qi290w/superpowers_plugin_for_claude_code_the_complete/

