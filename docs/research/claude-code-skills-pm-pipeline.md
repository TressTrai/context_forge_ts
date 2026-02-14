# Claude Code Skills for PM Workflow Pipeline - Research

**Date**: 2026-02-13
**Purpose**: Catalog publicly available Claude Code skills that can serve as materials/supplements for a PM (Project Management) workflow pipeline.

---

## Table of Contents

1. [Curated Lists & Registries](#curated-lists--registries)
2. [Official Anthropic Skills & Plugins](#official-anthropic-skills--plugins)
3. [Comprehensive PM Skill Collections](#comprehensive-pm-skill-collections)
4. [PM Workflow Systems](#pm-workflow-systems)
5. [Requirements Writing & EARS](#requirements-writing--ears)
6. [User Persona & Research](#user-persona--research)
7. [Project Briefs & Kickstart Templates](#project-briefs--kickstart-templates)
8. [Technical Specs & Architecture Documents](#technical-specs--architecture-documents)
9. [Task Breakdown & Estimation](#task-breakdown--estimation)
10. [Brainstorming & Ideation](#brainstorming--ideation)
11. [Writing & Documentation](#writing--documentation)
12. [General PM Workflows & Frameworks](#general-pm-workflows--frameworks)
13. [Marketplaces & Discovery Platforms](#marketplaces--discovery-platforms)
14. [Mapping to PM Pipeline Levels](#mapping-to-pm-pipeline-levels)

---

## Curated Lists & Registries

| Name | URL | Description |
|------|-----|-------------|
| **travisvn/awesome-claude-skills** | https://github.com/travisvn/awesome-claude-skills | Curated list of Claude Skills, resources, and tools. Most comprehensive community list. |
| **ComposioHQ/awesome-claude-skills** | https://github.com/ComposioHQ/awesome-claude-skills | Curated list with integrations (Asana, Linear, Jira, Notion, Monday, etc.) |
| **hesreallyhim/awesome-claude-code** | https://github.com/hesreallyhim/awesome-claude-code | Skills, hooks, slash-commands, agent orchestrators, and plugins |
| **VoltAgent/awesome-agent-skills** | https://github.com/VoltAgent/awesome-agent-skills | 300+ agent skills from official dev teams and community. Cross-platform compatible. |
| **BehiSecc/awesome-claude-skills** | https://github.com/BehiSecc/awesome-claude-skills | Curated list including security and debugging skills |
| **jqueryscript/awesome-claude-code** | https://github.com/jqueryscript/awesome-claude-code | Tools, IDE integrations, and frameworks for Claude Code |
| **abubakarsiddik31/claude-skills-collection** | https://github.com/abubakarsiddik31/claude-skills-collection | Official + community skills including brainstorming, writing-plans, writing-skills |

---

## Official Anthropic Skills & Plugins

### anthropics/skills (Agent Skills Spec)
- **URL**: https://github.com/anthropics/skills
- **What**: Official public repository for the Agent Skills specification and examples
- **Includes**:
  - Document skills: docx, pdf, pptx, xlsx creation/editing
  - `skill-creator` - Interactive guide for building new skills
  - `internal-comms` - Status reports, newsletters, FAQs
  - `brand-guidelines` - Brand colors and typography enforcement
  - `frontend-design`, `web-artifacts-builder`, `mcp-builder`

### anthropics/knowledge-work-plugins (Cowork Plugins)
- **URL**: https://github.com/anthropics/knowledge-work-plugins
- **What**: 11 official open-source plugins for Claude Cowork and Claude Code
- **PM-relevant plugins**:
  - **product-management** - Specs, roadmaps, user research synthesis, stakeholder updates, competitive tracking. Integrates with Linear, Asana, Monday, ClickUp, Jira, Notion, Figma, Amplitude, Pendo.
  - **marketing** - Content drafting, campaign planning, brand voice enforcement, competitor briefs.
  - **productivity** - Task management, calendars, workflows, personal context. Integrates with Slack, Notion, Asana, Linear, Jira, Monday, ClickUp.
  - **enterprise-search** - Cross-tool search across email, chat, docs, wikis.

### Compound Engineering Plugin
- **URL**: https://github.com/EveryInc/compound-engineering-plugin
- **What**: Official Claude Code plugin structuring work into Plan -> Work -> Review -> Compound cycle. 80% effort in planning/review, 20% execution.
- **PM mapping**: Planning discipline, knowledge capture, review workflows

---

## Comprehensive PM Skill Collections

### deanpeters/Product-Manager-Skills (42 skills)
- **URL**: https://github.com/deanpeters/Product-Manager-Skills
- **What**: 42 battle-tested PM frameworks in 3 tiers
- **Component Skills (19)**: Templates for specific PM deliverables
  - `company-research` - Deep-dive competitor/company analysis
  - `customer-journey-map` - NNGroup experience mapping
  - `epic-hypothesis` - Hypothesis-driven delivery
  - `jobs-to-be-done` - JTBD framework
  - `pestel-analysis` - External factor assessment
  - `positioning-statement` - Geoffrey Moore framework
  - `press-release` - Amazon Working Backwards
  - `problem-statement` - Problem framing with evidence
  - `proto-persona` - Hypothesis-driven personas
  - `storyboard` - 6-frame user journey visualization
  - `user-story` - Mike Cohn + Gherkin methodology
  - `user-story-mapping` - Jeff Patton framework
  - `user-story-splitting` - 8 proven splitting patterns
  - `finance-metrics-quickref` - 32+ SaaS metrics
  - `saas-economics-efficiency-metrics` - CAC, LTV, payback, margins
  - `saas-revenue-growth-metrics` - MRR/ARR, churn, NRR
- **Interactive Skills (18)**: Guided discovery with adaptive questions
  - `prioritization-advisor` - Recommends RICE, ICE, Kano frameworks
  - `epic-breakdown-advisor` - Richard Lawrence's 9 patterns
  - `discovery-interview-prep` - Mom Test style interviews
  - `opportunity-solution-tree` - Teresa Torres methodology
  - `lean-ux-canvas` - Jeff Gothelf Lean UX Canvas v2
  - `problem-framing-canvas` - MITRE methodology
  - `tam-sam-som-calculator` - Market sizing
  - `feature-investment-advisor` - ROI & strategic value analysis
  - `positioning-workshop` - Interactive positioning session
  - `user-story-mapping-workshop` - Jeff Patton + facilitation
  - `customer-journey-mapping-workshop` - NNGroup + workshop facilitation
- **Workflow Skills (5)**: End-to-end PM processes
  - `discovery-process` - Frame -> research -> synthesize -> validate (3-4 weeks)
  - `prd-development` - Structured PRD creation (2-4 days)
  - `product-strategy-session` - Positioning -> problem -> solutions -> roadmap (2-4 weeks)
  - `roadmap-planning` - Gather inputs -> epics -> prioritize -> sequence (1-2 weeks)
  - `skill-authoring-workflow` - Meta workflow for creating skills

### menkesu/awesome-pm-skills (28 skills from Lenny's Podcast)
- **URL**: https://github.com/menkesu/awesome-pm-skills
- **What**: 28 AI-powered PM skills from Lenny's Podcast organized into 6 operational modes
- **Modes**:
  - **Builder Mode (11)**: zero-to-launch, strategic-build, continuous-discovery (Teresa Torres), design-first-dev, ai-product-patterns, jtbd-building (Bob Moesta), growth-embedded, exp-driven-dev, quality-speed, ship-decisions
  - **Communicator Mode (4)**: strategic-storytelling (Andy Raskin), positioning-craft (April Dunford), exec-comms (Amazon 6-pager/Stripe format), confident-speaking
  - **Strategist Mode (4)**: decision-frameworks (Annie Duke), strategy-frameworks (Crossing the Chasm), okr-frameworks (Christina Wodtke), prioritization-craft (RICE)
  - **Navigator Mode (3)**: influence-craft, stakeholder-craft, workplace-navigation
  - **Leader Mode (3)**: culture-craft, career-growth, strategic-pm
  - **Measurement Mode (2)**: metrics-frameworks (North Star/AARRR), user-feedback-system (Superhuman PMF)
  - **Launch Mode (1)**: launch-execution (April Dunford)

### dhzrx/ai-pm-claude-skills (10 skills)
- **URL**: https://github.com/dhzrx/ai-pm-claude-skills
- **What**: 10 specialized Claude Skills for AI Product Managers
- **Skills**: PRD Generator, Feature Prioritizer, User Research Analyzer, Competitive Analyzer, AI Ethics Assessor, Roadmap Planner, Metrics Dashboard Builder, Stakeholder Communicator, User Story Generator, GTM Strategy Builder

### Sh1n/pm-claude-skills (5 essential skills)
- **URL**: https://github.com/Sh1n/pm-claude-skills--
- **What**: 5 free essential PM skills claiming 8-9 hours/week savings
- **Skills**: PRD Template, Meeting Notes, Stakeholder Update, User Research Synthesis, Competitive Analysis

### alirezarezvani/claude-skills (Product Team)
- **URL**: https://github.com/alirezarezvani/claude-skills
- **Product Team Skills**:
  - `product-manager-toolkit` - RICE prioritization, customer interview analysis, PRD templates, discovery frameworks
  - `agile-product-owner` - INVEST-compliant stories, sprint planning, epic breakdown, velocity tracking
  - `product-strategist` - OKR cascade, alignment scoring, strategy templates, vision frameworks
  - `ux-researcher-designer` - Persona creation, journey mapping, research synthesis, usability testing
  - `ui-design-system` - Design tokens, atomic design, responsive breakpoints
- **Also includes**: Senior PM Expert, Scrum Master Expert, Jira Expert, Confluence Expert, Content Creator

---

## PM Workflow Systems

### automazeio/ccpm (Claude Code PM)
- **URL**: https://github.com/automazeio/ccpm
- **What**: Full PM system using GitHub Issues + Git worktrees for parallel agent execution
- **5-phase discipline**: Brainstorm -> Document -> Plan -> Execute -> Track
- **Commands**: `/pm:prd-new`, `/pm:prd-parse`, `/pm:epic-decompose`, `/pm:epic-sync`, `/pm:issue-start`, `/pm:next`, `/pm:status`, `/pm:standup`, `/pm:blocked`
- **PM mapping**: Full pipeline from PRD to shipped code with traceability

### scopecraft/command
- **URL**: https://github.com/scopecraft/command
- **What**: Comprehensive SDLC commands covering planning, implementation, release
- **5-step feature development**: brainstorm-feature -> feature-proposal -> feature-to-prd -> feature-planning -> implement
- **Entities**: task, parent, env, work, dispatch, area, workflow, template

### levnikolaevich/claude-code-skills (101 skills)
- **URL**: https://github.com/levnikolaevich/claude-code-skills
- **What**: 101 production-ready skills in Orchestrator-Worker pattern (L1/L2/L3)
- **Documentation Skills (13)**: Pipeline orchestrator, project docs coordinator, root docs creator, project core creator (requirements.md + architecture.md), backend/frontend/devops docs creators, reference docs (ADRs), tasks docs (kanban), test docs, presentation creator
- **Planning Skills (7)**: Scope decomposer (Epics + Stories), opportunity discoverer, epic/story coordinators, story creator/replanner, story prioritizer (RICE with market research)
- **Task Management (5)**: Task coordinator, task creator, task replanner, story validator (20 criteria), agent reviewer
- **Quality Skills (9)**: Quality gate, code quality checker (DRY/KISS/YAGNI), regression checker, test planner/researcher/manual tester
- **Audit Skills (28)**: Full codebase audit pipeline
- **Bootstrap (32)**: Project creation and transformation skills

### Helmi/claude-simone (Simone)
- **URL**: https://github.com/Helmi/claude-simone
- **What**: PM workflow system with structured prompts for AI-assisted development. Provides documents, guidelines, and processes for project planning and execution.

### b-r-a-n/gsd-claude (Get Shit Done)
- **URL**: https://github.com/b-r-a-n/gsd-claude
- **What**: Spec-driven development with phase-based planning, VCS abstraction, progress tracking
- **Commands**: `/gsd:new-project`, `/gsd:discuss-phase`, `/gsd:plan-phase`, `/gsd:execute-phase`
- **Philosophy**: Fresh subagent contexts, atomic plans (2-3 tasks each), wave-based execution

### SuperClaude-Org/SuperClaude_Framework
- **URL**: https://github.com/SuperClaude-Org/SuperClaude_Framework
- **What**: 30 slash commands, 16 specialized agents, 7 behavioral modes
- **PM-relevant**: `/sc:brainstorm`, `/sc:research`, `/sc:pm`, PM Agent persona, Business Panel mode, Brainstorming mode, Task Management mode
- **Documents**: PLANNING.md, TASK.md, KNOWLEDGE.md

---

## Requirements Writing & EARS

### EARS Requirements Authoring Skill
- **URL**: https://mcpmarket.com/tools/skills/ears-requirements-authoring
- **What**: Claude Code skill implementing EARS (Easy Approach to Requirements Syntax) notation
- **5 patterns**: Ubiquitous, Event-driven (WHEN...THEN), State-driven (WHILE), Conditional (IF...THEN), Unwanted behavior
- **6-step workflow**: Analyze -> Transform -> Identify theories -> Extract examples -> Enhance -> Present
- **PM mapping**: L3 Requirements - formal requirements engineering

### PRD Skills (Multiple Sources)
- **mcpmarket.com/tools/skills/product-requirements** - Interactive PRD creation with 90+ quality scoring
- **mcpmarket.com/tools/skills/requirements-analysis-specialist** - Transforms vague requirements into actionable PRDs with 100-point scoring
- **anombyte93/prd-taskmaster** - AI-powered PRD generation with Taskmaster integration
- **bodangren/bus-math-v2/prd-authoring** - Integrates PM + BA workflows from vague ideas to PRDs with epic breakdowns
- **davila7/claude-code-templates/requirements-clarity** - Transforms vague requirements into actionable PRDs

### ChatPRD Integration
- **URL**: https://www.chatprd.ai/resources/PRD-for-Claude-Code
- **What**: MCP integration giving Claude Code live access to PRDs. Edits in ChatPRD are instantly reflected in Claude Code prompts.
- **PM mapping**: L3-L4 Requirements writing with live sync

---

## User Persona & Research

### alirezarezvani/claude-skills - UX Researcher Designer
- **URL**: https://github.com/alirezarezvani/claude-skills/tree/main/product-team/ux-researcher-designer
- **What**: Data-driven personas from user interviews, journey mapping, research synthesis, usability testing
- **PM mapping**: L2 Persona creation, L3 Research synthesis

### deanpeters/Product-Manager-Skills
- `proto-persona` - Hypothesis-driven personas
- `customer-journey-map` - NNGroup experience mapping
- `discovery-interview-prep` - Mom Test style interviews
- `customer-journey-mapping-workshop` - Interactive facilitated workshop
- **PM mapping**: L2 Persona, L3 Journey mapping

### dhzrx/ai-pm-claude-skills
- `User Research Analyzer` - Synthesizes interviews/surveys, persona generation, theme extraction
- **PM mapping**: L2-L3 Research synthesis and persona creation

---

## Project Briefs & Kickstart Templates

### project-planner skill (MacroMan5/claude-code-workflow-plugins)
- **URL**: https://claude-plugins.dev/skills/@MacroMan5/claude-code-workflow-plugins/project-planner
- **What**: Transforms project ideas into PROJECT-OVERVIEW.md (vision, features, success criteria) + SPECIFICATIONS.md (functional requirements, API contracts, data models, architecture, phases)
- **PM mapping**: L1 Project brief, L2 Initial specs

### OthmanAdi/planning-with-files (Manus-style)
- **URL**: https://github.com/OthmanAdi/planning-with-files
- **What**: Persistent markdown planning with 3-file pattern: task_plan.md, findings.md, progress.md. Session recovery, error persistence.
- **Commands**: `/plan`, `/planning`
- **PM mapping**: L1-L2 Planning persistence

### Deep Plan Skill
- **URL**: https://pierce-lamb.medium.com/building-deep-plan-a-claude-code-plugin-for-comprehensive-planning-30e0921eb841
- **What**: Multi-stage planning: automated codebase/web research -> interactive stakeholder interviews -> cross-model validation (Gemini) -> sections directory of self-contained implementation units
- **PM mapping**: L2-L3 Comprehensive planning from requirements to implementation plan

### angakh/claude-skills-starter (12 essential commands)
- **URL**: https://github.com/angakh/claude-skills-starter
- **What**: Fork-and-customize template with 12 commands including `/overview` (pre-compute comprehensive project context), `/scaffold`, `/pr-create`, `/quality`, `/test`, `/update-docs`
- **PM mapping**: L1 Project bootstrapping

### serpro69/claude-starter-kit
- **URL**: https://github.com/serpro69/claude-starter-kit
- **What**: Starter template repo with configs, skills, agents

---

## Technical Specs & Architecture Documents

### codenamev/ai-software-architect
- **URL**: https://github.com/codenamev/ai-software-architect
- **What**: Markdown-based architecture documentation framework. ADRs, multi-perspective reviews (security, performance, scalability), recalibration from feedback to implementation plans.
- **Modes**: Pragmatic mode (YAGNI principle), offline capability
- **PM mapping**: L4 Architecture documentation, L5 ADR tracking

### terrylica/cc-skills (ADR-driven development)
- **URL**: https://github.com/terrylica/cc-skills
- **What**: Skills for ADR-driven development, DevOps automation, semantic versioning
- **PM mapping**: L4-L5 Technical decision tracking

### ADR Creator Skill
- **URL**: https://mcpmarket.com/tools/skills/adr-creator-3
- **What**: MADR (Markdown Architecture Decision Records) template with AI-specific extensions defining autonomy levels and tool preferences
- **PM mapping**: L4 Architecture decisions

### Claude ADR System Guide
- **URL**: https://gist.github.com/joshrotenberg/a3ffd160f161c98a61c739392e953764
- **What**: Comprehensive ADR system for projects where AI assistants work alongside human developers
- **PM mapping**: L4-L5 Decision tracking

### levnikolaevich/claude-code-skills
- `ln-112-project-core-creator` - Generates requirements.md and architecture.md
- `ln-113-backend-docs-creator` - API specs and database schemas
- `ln-002-best-practices-researcher` - Creates ADRs, guides, manuals
- **PM mapping**: L3-L5 Full technical documentation pipeline

---

## Task Breakdown & Estimation

### eyaltoledano/claude-task-master
- **URL**: https://github.com/eyaltoledano/claude-task-master
- **What**: AI-driven task management. Parses PRDs to generate structured tasks with dependencies and subtasks. Cross-tag task movement, complexity analysis, research integration.
- **Modes**: Core (~5K tokens), Standard (~10K), All (~21K)
- **PM mapping**: L5 Task breakdown from requirements

### levnikolaevich/claude-code-skills
- `ln-200-scope-decomposer` - Converts scope into Epics and Stories in one command
- `ln-210-epic-coordinator` - Creates/replans 3-7 Epics
- `ln-220-story-coordinator` - Creates/replans Stories with standards research
- `ln-230-story-prioritizer` - RICE prioritization with market research
- `ln-300-task-coordinator` - Decomposes Stories into 1-6 focused tasks
- `ln-310-story-validator` - 20 criteria across 8 groups with penalty scoring
- **PM mapping**: L4-L6 Full decomposition pipeline (scope -> epic -> story -> task)

### deanpeters/Product-Manager-Skills
- `epic-breakdown-advisor` - Richard Lawrence's 9 patterns for splitting epics
- `user-story-splitting` - 8 proven splitting patterns
- `user-story-mapping-workshop` - Jeff Patton facilitated workshop
- **PM mapping**: L4-L5 Story breakdown with proven methodologies

### rjs/shaping-skills (Shape Up methodology)
- **URL**: https://github.com/rjs/shaping-skills
- **What**: `/shaping` (iterate problem + solution, fit checks) and `/breadboarding` (map systems into UI/code affordances). By Ryan Singer himself.
- **Ripple Check hook**: Monitors shaping document edits for consistency
- **PM mapping**: L3-L4 Shape Up shaping and scoping

---

## Brainstorming & Ideation

### obra/superpowers
- **URL**: https://github.com/obra/superpowers
- **What**: 16 directly editable skills. `/brainstorm` refines rough ideas through questions, explores alternatives, presents design in sections. `/write-plan` creates bite-sized tasks (2-5 min each). `/execute-plan` dispatches subagents per task.
- **PM mapping**: L1-L2 Ideation, L3 Plan creation

### SuperClaude Framework
- `/sc:brainstorm` - Structured brainstorming with Business Panel mode (multi-expert analysis)
- `/sc:research` - Deep web research with multi-hop reasoning (up to 5 iterative searches)
- **PM mapping**: L1 Brainstorming, L2 Research

### abubakarsiddik31/claude-skills-collection
- `brainstorming` - Facilitate creative idea generation sessions
- `writing-plans` - Create structured written plans with clear milestones
- **PM mapping**: L1 Ideation, L2 Planning

### scopecraft/command
- `brainstorm-feature` - Ideation and concept exploration
- `feature-proposal` - Formal proposal creation
- **PM mapping**: L1-L2 From idea to proposal

---

## Writing & Documentation

### Anthropic Official
- `internal-comms` - Status reports, newsletters, FAQs
- `brand-guidelines` - Brand colors and typography enforcement
- Document skills (docx, pdf, pptx, xlsx) - Create/edit documents

### daymade/claude-code-skills
- `ppt-creator` - Slide decks with Pyramid Principle structure, data visualization
- `markdown-tools` - Convert .doc/.docx/PDF/PPTX to markdown
- `docs-cleaner` - Consolidate and organize documentation
- `meeting-minutes-taker` - Structured meeting minutes with action items
- `transcript-fixer` - Correct ASR transcripts
- `teams-channel-post-writer` - Educational Teams posts
- **PM mapping**: L2-L6 Documentation across all pipeline levels

### ComposioHQ/awesome-claude-skills
- `content-research-writer` - Research, outline, draft, refine content while maintaining voice/style
- **PM mapping**: L3-L4 Content creation

### coreyhaines31/marketingskills
- **URL**: https://github.com/coreyhaines31/marketingskills
- **What**: CRO, copywriting, SEO, analytics, email sequences for marketing
- **PM mapping**: L6 Go-to-market communications

### menkesu/awesome-pm-skills (Communicator Mode)
- `strategic-storytelling` (Andy Raskin, Nancy Duarte)
- `positioning-craft` (April Dunford)
- `exec-comms` (Amazon 6-pager, Stripe format)
- **PM mapping**: L5-L6 Executive communication and positioning

---

## General PM Workflows & Frameworks

### ccforpms.com (Claude Code for Product Managers)
- **URL**: https://ccforpms.com/
- **GitHub**: https://github.com/carlvellotti/claude-code-pm-course
- **What**: Free interactive 15-25 hour course teaching PMs to use Claude Code. Covers PRD writing, data analysis, competitive strategy, multi-format transformation.
- **PM mapping**: Training/reference for all levels

### prodmgmt.world/claude-code
- **URL**: https://www.prodmgmt.world/claude-code
- **What**: 180+ ready-to-use Claude Code skills curated for PMs. Lists Compound Engineering Plugin, Superpowers, GSD, Shaping Skills, and more.

### tony/claude-code-riper-5 (RIPER Workflow)
- **URL**: https://github.com/tony/claude-code-riper-5
- **What**: Enforces Research -> Innovate -> Plan -> Execute -> Review phases. Consolidated subagents and branch-aware memory bank.
- **PM mapping**: L1-L6 Full workflow discipline

### harperreed/dotfiles
- **URL**: https://github.com/harperreed/dotfiles
- **What**: Commands for managing projects, task management, code review, deployments

### ayoubben18/ab-method
- **URL**: https://github.com/ayoubben18/ab-method
- **What**: Transforms large problems into focused incremental missions using sub agents

---

## Marketplaces & Discovery Platforms

| Platform | URL | Description |
|----------|-----|-------------|
| **SkillsMP** | https://skillsmp.com/ | 25,000+ skills from GitHub repos following SKILL.md standard. Categories include Documentation. |
| **skills.sh** | https://skills.sh | 24K+ community skills across 20+ platforms |
| **claude-plugins.dev** | https://claude-plugins.dev/ | Community registry with CLI. Browse/search skills. |
| **mcpmarket.com** | https://mcpmarket.com/tools/skills/ | Skills listings including PRD, EARS, ADR skills |
| **playbooks.com/skills** | https://playbooks.com/skills/ | Skill discovery platform |
| **tessl.io/skills** | https://tessl.io/skills/ | Skill browser with GitHub integration |
| **claudepluginhub.com** | https://www.claudepluginhub.com/ | Plugin and agent hub |
| **aitmpl.com/skills** | https://www.aitmpl.com/skills | Claude Code templates and skills |

---

## Mapping to PM Pipeline Levels

### L1 - Discovery & Ideation
| Skill/System | Source | What it provides |
|--------------|--------|-----------------|
| `/brainstorm` | obra/superpowers | Refine rough ideas through questions, explore alternatives |
| `/sc:brainstorm` | SuperClaude Framework | Structured brainstorming with Business Panel |
| `brainstorming` | abubakarsiddik31/claude-skills-collection | Creative idea generation sessions |
| `brainstorm-feature` | scopecraft/command | Feature ideation and concept exploration |
| `/pm:prd-new` | automazeio/ccpm | Launch brainstorming for new requirements |
| `zero-to-launch` | menkesu/awesome-pm-skills | Idea to prototype playbook |
| `continuous-discovery` | menkesu/awesome-pm-skills | Teresa Torres weekly customer contact |
| `/sc:research` | SuperClaude Framework | Deep web research with multi-hop reasoning |
| `company-research` | deanpeters/Product-Manager-Skills | Competitor/company deep-dive |
| `Competitive Analyzer` | dhzrx/ai-pm-claude-skills | Feature matrices, SWOT, positioning maps |

### L2 - Personas & User Research
| Skill/System | Source | What it provides |
|--------------|--------|-----------------|
| `ux-researcher-designer` | alirezarezvani/claude-skills | Data-driven personas, journey mapping, research synthesis |
| `proto-persona` | deanpeters/Product-Manager-Skills | Hypothesis-driven personas |
| `customer-journey-map` | deanpeters/Product-Manager-Skills | NNGroup experience mapping |
| `customer-journey-mapping-workshop` | deanpeters/Product-Manager-Skills | Interactive facilitated journey mapping |
| `discovery-interview-prep` | deanpeters/Product-Manager-Skills | Mom Test style interviews |
| `User Research Analyzer` | dhzrx/ai-pm-claude-skills | Synthesize interviews, persona generation |
| `User Research Synthesis` | Sh1n/pm-claude-skills | Consolidate research findings |
| `jobs-to-be-done` | deanpeters/Product-Manager-Skills | JTBD framework |
| `user-feedback-system` | menkesu/awesome-pm-skills | Superhuman PMF measurement |
| `discovery-process` | deanpeters/Product-Manager-Skills | Frame->research->synthesize->validate (3-4 weeks) |

### L3 - Requirements & PRD
| Skill/System | Source | What it provides |
|--------------|--------|-----------------|
| EARS Requirements Authoring | mcpmarket.com | Formal EARS notation with 5 patterns |
| `requirements-clarity` | davila7/claude-code-templates | Transform vague requirements to actionable PRDs |
| Product Requirements Skill | mcpmarket.com | Interactive PRD with 90+ quality scoring |
| `prd-development` | deanpeters/Product-Manager-Skills | Structured PRD creation (2-4 days) |
| `prd-authoring` | bodangren/bus-math-v2 | PM + BA workflow from ideas to PRDs |
| PRD Generator | dhzrx/ai-pm-claude-skills | Comprehensive PRDs with user stories |
| `PRD Template` | Sh1n/pm-claude-skills | Standardized PRD documentation |
| `/pm:prd-parse` | automazeio/ccpm | Convert PRD to implementation epic |
| `feature-to-prd` | scopecraft/command | Expand feature to detailed PRD |
| ChatPRD MCP | chatprd.ai | Live PRD sync between ChatPRD and Claude Code |
| `problem-statement` | deanpeters/Product-Manager-Skills | Frame customer problems with evidence |
| `press-release` | deanpeters/Product-Manager-Skills | Amazon Working Backwards |
| `lean-ux-canvas` | deanpeters/Product-Manager-Skills | Jeff Gothelf Lean UX Canvas v2 |
| `ln-112-project-core-creator` | levnikolaevich/claude-code-skills | Generate requirements.md + architecture.md |

### L4 - Technical Specs & Architecture
| Skill/System | Source | What it provides |
|--------------|--------|-----------------|
| ai-software-architect | codenamev/ai-software-architect | ADRs, multi-perspective reviews, recalibration |
| ADR Creator | mcpmarket.com | MADR template with AI extensions |
| Claude ADR System | joshrotenberg gist | ADR system for AI+human teams |
| `ln-113-backend-docs-creator` | levnikolaevich/claude-code-skills | API specs and database schemas |
| `ln-114-frontend-docs-creator` | levnikolaevich/claude-code-skills | Design guidelines |
| `ln-002-best-practices-researcher` | levnikolaevich/claude-code-skills | ADRs, guides, manuals |
| `/shaping` | rjs/shaping-skills | Shape Up: iterate problem + solution with fit checks |
| `/breadboarding` | rjs/shaping-skills | Map systems into UI/code affordances |
| `project-planner` | MacroMan5/claude-code-workflow-plugins | SPECIFICATIONS.md with functional reqs, API, data models |
| Deep Plan | pierce-lamb | Multi-stage: research -> interview -> validate -> implementation sections |
| `product-strategy-session` | deanpeters/Product-Manager-Skills | Positioning -> problem -> solutions -> roadmap |

### L5 - Task Breakdown & Estimation
| Skill/System | Source | What it provides |
|--------------|--------|-----------------|
| Claude Task Master | eyaltoledano/claude-task-master | PRD-to-tasks with dependencies and complexity analysis |
| `ln-200-scope-decomposer` | levnikolaevich/claude-code-skills | Scope to Epics+Stories in one command |
| `ln-300-task-coordinator` | levnikolaevich/claude-code-skills | Stories to 1-6 focused tasks |
| `ln-230-story-prioritizer` | levnikolaevich/claude-code-skills | RICE with market research |
| `epic-breakdown-advisor` | deanpeters/Product-Manager-Skills | Richard Lawrence's 9 patterns |
| `user-story-splitting` | deanpeters/Product-Manager-Skills | 8 proven splitting patterns |
| `user-story` | deanpeters/Product-Manager-Skills | Mike Cohn + Gherkin |
| `user-story-mapping` | deanpeters/Product-Manager-Skills | Jeff Patton framework |
| `User Story Generator` | dhzrx/ai-pm-claude-skills | Features to stories with acceptance criteria |
| `Feature Prioritizer` | dhzrx/ai-pm-claude-skills | RICE/ICE scoring, value vs effort |
| `prioritization-advisor` | deanpeters/Product-Manager-Skills | Framework selection (RICE, ICE, Kano) |
| `/pm:epic-decompose` | automazeio/ccpm | Break epic into actionable tasks |
| `feature-planning` | scopecraft/command | Break feature into tasks |
| `/write-plan` | obra/superpowers | Bite-sized tasks (2-5 min each) |
| `roadmap-planning` | deanpeters/Product-Manager-Skills | Epics -> prioritize -> sequence (1-2 weeks) |
| `Roadmap Planner` | dhzrx/ai-pm-claude-skills | Strategy-aligned roadmaps |

### L6 - Execution, Communication & Tracking
| Skill/System | Source | What it provides |
|--------------|--------|-----------------|
| `/execute-plan` | obra/superpowers | Dispatch subagents per task with review |
| `/pm:issue-start` | automazeio/ccpm | Begin work with specialized agent |
| `/pm:standup` | automazeio/ccpm | Daily standup reports |
| `Stakeholder Update` | Sh1n/pm-claude-skills | Executive status communications |
| `Stakeholder Communicator` | dhzrx/ai-pm-claude-skills | Executive updates and alignment |
| `exec-comms` | menkesu/awesome-pm-skills | Amazon 6-pager, Stripe format |
| `strategic-storytelling` | menkesu/awesome-pm-skills | Andy Raskin narrative frameworks |
| `internal-comms` | anthropics/skills | Status reports, newsletters, FAQs |
| `Meeting Notes` | Sh1n/pm-claude-skills | Structured meeting documentation |
| `meeting-minutes-taker` | daymade/claude-code-skills | Minutes with action items |
| `launch-execution` | menkesu/awesome-pm-skills | GTM strategy |
| `GTM Strategy Builder` | dhzrx/ai-pm-claude-skills | Go-to-market launches |
| `Metrics Dashboard Builder` | dhzrx/ai-pm-claude-skills | North Star KPIs, funnel analysis |
| `metrics-frameworks` | menkesu/awesome-pm-skills | North Star and AARRR |
| Compound Engineering | EveryInc | Plan -> Work -> Review -> Compound cycle |

---

## Top Recommendations for Reuse

### Tier 1 - Most Comprehensive, Ready to Use
1. **deanpeters/Product-Manager-Skills** (42 skills) - Best PM skill set. Battle-tested methodologies (Teresa Torres, Jeff Patton, April Dunford, Amazon Working Backwards). Covers entire pipeline from discovery to roadmap.
2. **levnikolaevich/claude-code-skills** (101 skills) - Best for teams wanting automated pipeline from requirements to deployment. Orchestrator-Worker pattern keeps token usage efficient.
3. **automazeio/ccpm** - Best for GitHub-native PM workflow. Full traceability from PRD to code.

### Tier 2 - Strong Specialized Value
4. **menkesu/awesome-pm-skills** (28 skills) - Best for PM methodology depth (Lenny's Podcast frameworks). Strong on strategy and communication.
5. **rjs/shaping-skills** - Best for Shape Up methodology. Created by Ryan Singer himself.
6. **dhzrx/ai-pm-claude-skills** (10 skills) - Best for AI product management specifically.
7. **obra/superpowers** - Best brainstorming and plan execution skills.
8. **codenamev/ai-software-architect** - Best for architecture documentation and ADR workflows.

### Tier 3 - Useful Supplements
9. **anthropics/knowledge-work-plugins** (product-management) - Official Anthropic plugin with tool integrations.
10. **EveryInc/compound-engineering-plugin** - Knowledge compounding workflow.
11. **b-r-a-n/gsd-claude** - Spec-driven execution discipline.
12. **Sh1n/pm-claude-skills** (5 skills) - Quick wins for meeting notes, stakeholder updates.
13. **OthmanAdi/planning-with-files** - Persistent planning across sessions.
14. **EARS Requirements Authoring** - Formal requirements notation.
