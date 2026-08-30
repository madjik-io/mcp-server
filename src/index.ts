#!/usr/bin/env node
/**
 * Madjik MCP Server
 * =================
 * Agent-native market intelligence, computed by the Black Belt Labs engine.
 *
 * Exposes Madjik metrics — portfolio optimisation, risk simulation,
 * regime detection, sentiment, and cross-asset signals — as MCP tools that
 * any AI agent or LLM can call natively.
 *
 * Authentication: a Madjik API key (mk_...) or legacy Black Belt Labs key
 * (bbl_live_... / bbl_test_...). Keys are issued at https://madjik.io.
 *
 * Backend: api.madjik.io (Madjik storefront over the BBL wholesale engine)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_KEY = process.env.MADJIK_API_KEY ?? process.env.BLACKBELTLABS_API_KEY ?? "";
const BASE_URL = process.env.MADJIK_API_URL ?? "https://api.madjik.io/v1";
const KEY_PREFIXES = ["mk_", "bbl_live_", "bbl_test_"];

/**
 * Validate that a key is present and in a known namespace (Madjik mk_ keys and
 * legacy Black Belt Labs bbl_ keys are both accepted by the shared backend).
 * This runs at startup and on every tool call so misconfiguration surfaces early.
 */
function assertValidKey(key: string): void {
  if (!key) {
    throw new Error(
      "MADJIK_API_KEY is not set. " +
      "Get your key at https://madjik.io"
    );
  }
  if (!KEY_PREFIXES.some((p) => key.startsWith(p))) {
    throw new Error(
      "Invalid key format. Madjik API keys start with 'mk_' " +
      "(legacy 'bbl_live_' / 'bbl_test_' keys are also accepted). " +
      "Get your key at https://madjik.io"
    );
  }
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function apiGet(path: string): Promise<unknown> {
  assertValidKey(API_KEY);

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "User-Agent": "@madjik/mcp-server/2.0.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error(
        `Authentication failed (401). Verify your key at https://madjik.io.`
      );
    }
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// BBL Metrics catalog
// Quantum-finance framing — emphasises QC, AI, and risk capabilities.
// Metric IDs map 1-to-1 to the shared backend.
// ---------------------------------------------------------------------------

const BBL_METRICS_CATALOG = [
  // ── Quantum Computing ──────────────────────────────────────────────────
  {
    id: "M50021",
    name: "Portfolio Optimisation (QC)",
    category: "Quantum Computing",
    description:
      "QAOA-derived optimal portfolio weights across a cross-asset universe. " +
      "Encodes the mean-variance problem as a QUBO and solves on Qiskit Aer / IBM Quantum hardware.",
    signal_range: "0–100 (higher = more concentrated optimal allocation)",
    computation: "quantum",
  },
  {
    id: "M50022",
    name: "Risk Simulation — VaR (QC)",
    category: "Quantum Computing",
    description:
      "Quantum Amplitude Estimation of Value-at-Risk at 95% and 99% confidence. " +
      "Provides quadratic speedup over classical Monte Carlo for tail-risk estimation.",
    signal_range: "0–100 (higher = elevated tail risk)",
    computation: "quantum",
  },

  // ── AI-Enhanced ────────────────────────────────────────────────────────
  {
    id: "M50017",
    name: "Sentiment Index (AI)",
    category: "AI-Enhanced",
    description:
      "Gemini-powered sentiment aggregation across social chatter, news flow, " +
      "and on-chain signals. Scores market mood on a 0–100 scale.",
    signal_range: "0–100 (0=extreme fear, 100=extreme greed)",
    computation: "ai",
  },
  {
    id: "M50019",
    name: "Market Narrative (AI)",
    category: "AI-Enhanced",
    description:
      "LLM synthesis of the dominant market narrative from news and social sources. " +
      "Identifies regime shifts before they appear in price data.",
    signal_range: "Qualitative narrative + bullish/bearish/neutral signal",
    computation: "ai",
  },
  {
    id: "M50020",
    name: "Anomaly Detection (AI)",
    category: "AI-Enhanced",
    description:
      "Gemini-powered detection of statistical anomalies in cross-asset price and flow data. " +
      "Flags unusual co-movements that may precede dislocations.",
    signal_range: "0–100 (higher = more anomalous)",
    computation: "ai",
  },
  {
    id: "M50016",
    name: "Regime Detection (AI)",
    category: "AI-Enhanced",
    description:
      "Hidden Markov Model + AI classification of the current macro regime: " +
      "risk-on, risk-off, stagflation, or liquidity-crisis.",
    signal_range: "Regime label + confidence score 0–100",
    computation: "ai",
  },
  {
    id: "M50010",
    name: "Regulatory Risk Index (AI)",
    category: "AI-Enhanced",
    description:
      "AI-scored probability of near-term regulatory action across crypto and DeFi. " +
      "Aggregates legislative signals, enforcement actions, and central bank commentary.",
    signal_range: "0–100 (higher = elevated regulatory risk)",
    computation: "ai",
  },

  // ── Classical — Risk & Leverage ────────────────────────────────────────
  {
    id: "M50001",
    name: "Cross-Asset Volatility Index",
    category: "Risk",
    description:
      "Composite realised volatility across equities, bonds, FX, commodities, and crypto. " +
      "Normalised to 0–100.",
    signal_range: "0–100",
    computation: "classical",
  },
  {
    id: "M50002",
    name: "Leverage Stress Index",
    category: "Risk",
    description:
      "Aggregates equity margin levels, crypto perpetual funding rates, and commodity open interest " +
      "into a single leverage pressure gauge.",
    signal_range: "0–100 (higher = more leveraged system)",
    computation: "classical",
  },
  {
    id: "M50003",
    name: "Correlation Breakdown Score",
    category: "Risk",
    description:
      "Measures deviation of realised cross-asset correlations from their rolling baseline. " +
      "Spikes indicate regime change or contagion risk.",
    signal_range: "0–100",
    computation: "classical",
  },
  {
    id: "M50004",
    name: "Liquidation Cascade Risk",
    category: "Risk",
    description:
      "Estimates the probability of a self-reinforcing liquidation cascade " +
      "given current open interest, funding, and margin levels.",
    signal_range: "0–100",
    computation: "classical",
  },

  // ── Classical — Capital Flows ───────────────────────────────────────────
  {
    id: "M50005",
    name: "Capital Flow Radar",
    category: "Capital Flows",
    description:
      "Tracks net money rotation between equities, bonds, commodities, crypto, and cash " +
      "using ETF flow, on-chain, and derivatives data.",
    signal_range: "Per-asset-class flow score −100 to +100",
    computation: "classical",
  },
  {
    id: "M50006",
    name: "Stablecoin Supply Delta",
    category: "Capital Flows",
    description:
      "7-day change in total stablecoin market cap as a proxy for crypto-native liquidity. " +
      "Positive = fresh capital entering; negative = capital exiting.",
    signal_range: "−100 to +100",
    computation: "classical",
  },

  // ── Classical — Market Structure ────────────────────────────────────────
  {
    id: "M50007",
    name: "Basis Divergence Index",
    category: "Market Structure",
    description:
      "Spread between spot and derivatives pricing across BTC, ETH, equity index futures, " +
      "and commodity futures. Persistent divergence signals stress or arbitrage opportunity.",
    signal_range: "0–100",
    computation: "classical",
  },
  {
    id: "M50008",
    name: "Term Structure Stress",
    category: "Market Structure",
    description:
      "Measures inversion and kink severity in yield curves and crypto futures curves " +
      "simultaneously. Composite score across Treasury and BTC/ETH term structures.",
    signal_range: "0–100 (higher = more inverted/stressed)",
    computation: "classical",
  },
  {
    id: "M50009",
    name: "DeFi Protocol Health",
    category: "DeFi",
    description:
      "Aggregated health score for major DeFi protocols: TVL trend, collateralisation ratios, " +
      "bad debt exposure, and governance activity.",
    signal_range: "0–100 (higher = healthier)",
    computation: "classical",
  },
] as const;

interface MetricEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  signal_range: string;
  computation: "quantum" | "ai" | "classical";
}

// Live catalog from the registry-backed API (/v1/catalog). Cached 5 min; falls
// back to the static BBL_METRICS_CATALOG if the API is unreachable. New metrics
// (M50048+) appear automatically — no rebuild needed.
let _catalog: MetricEntry[] | null = null;
let _catalogTs = 0;
const CATALOG_TTL = 5 * 60 * 1000;

async function getCatalog(): Promise<readonly MetricEntry[]> {
  if (_catalog && Date.now() - _catalogTs < CATALOG_TTL) return _catalog;
  try {
    const data: any = await apiGet("/catalog");
    _catalog = ((data.metrics ?? []) as any[]).map((m) => ({
      id: m.metric_id,
      name: m.name,
      category: m.category,
      description: `${m.name}. Category: ${m.category}; computation: ${m.computation_method}.`,
      signal_range: "0-100",
      computation:
        m.computation_method === "qc" ? "quantum" :
        m.computation_method === "ai" ? "ai" : "classical",
    }));
    _catalogTs = Date.now();
    return _catalog;
  } catch (_e) {
    return _catalog ?? BBL_METRICS_CATALOG;
  }
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "madjik",
  version: "2.0.0",
});

// ── Tool 1: get_metric ──────────────────────────────────────────────────────

server.tool(
  "get_metric",
  "Fetch the current value, signal, and metadata for a single Madjik metric by ID (computed by Black Belt Labs). " +
  "Use list_metrics or search_metrics first to find the right metric ID.",
  {
    metric_id: z
      .string()
      .regex(/^ME\d{5}$/i)
      .describe("Metric ID, e.g. M50021 (Portfolio Optimisation QC) or M50017 (Sentiment AI)"),
  },
  async ({ metric_id }) => {
    const data = await apiGet(`/metrics/${metric_id.toUpperCase()}`);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tool 2: get_quantum_metrics ─────────────────────────────────────────────

server.tool(
  "get_quantum_metrics",
  "Fetch all quantum-computed metrics: Portfolio Optimisation (M50021) and " +
  "Risk Simulation VaR (M50022). These are the flagship Black Belt Labs QC outputs.",
  {},
  async () => {
    const qcIds = (await getCatalog())
      .filter((m) => m.computation === "quantum")
      .map((m) => m.id);

    const results = await Promise.all(
      qcIds.map(async (id) => {
        try {
          return await apiGet(`/metrics/${id}`);
        } catch (err) {
          return { metric_id: id, error: String(err) };
        }
      })
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          computation: "quantum",
          backend: "Qiskit Aer / IBM Quantum",
          metrics: results,
        }, null, 2),
      }],
    };
  }
);

// ── Tool 3: get_ai_metrics ──────────────────────────────────────────────────

server.tool(
  "get_ai_metrics",
  "Fetch all AI-enhanced metrics: Sentiment (M50017), Market Narrative (M50019), " +
  "Anomaly Detection (M50020), Regime Detection (M50016), and Regulatory Risk (M50010). " +
  "All computed via Gemini on Vertex AI.",
  {},
  async () => {
    const aiIds = (await getCatalog())
      .filter((m) => m.computation === "ai")
      .map((m) => m.id);

    const results = await Promise.all(
      aiIds.map(async (id) => {
        try {
          return await apiGet(`/metrics/${id}`);
        } catch (err) {
          return { metric_id: id, error: String(err) };
        }
      })
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          computation: "ai",
          model: "Gemini (Vertex AI)",
          metrics: results,
        }, null, 2),
      }],
    };
  }
);

// ── Tool 4: get_risk_snapshot ───────────────────────────────────────────────

server.tool(
  "get_risk_snapshot",
  "Fetch a composite risk snapshot combining QC VaR (M50022), Leverage Stress (M50002), " +
  "Liquidation Cascade Risk (M50004), and Correlation Breakdown (M50003). " +
  "Use this for a fast single-call risk assessment.",
  {},
  async () => {
    const riskIds = ["M50022", "M50002", "M50004", "M50003"];

    const results = await Promise.all(
      riskIds.map(async (id) => {
        try {
          return await apiGet(`/metrics/${id}`);
        } catch (err) {
          return { metric_id: id, error: String(err) };
        }
      })
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          snapshot: "risk",
          description:
            "Composite risk view: QC-derived VaR, leverage stress, liquidation cascade probability, " +
            "and cross-asset correlation breakdown.",
          metrics: results,
        }, null, 2),
      }],
    };
  }
);

// ── Tool 5: list_metrics ────────────────────────────────────────────────────

server.tool(
  "list_metrics",
  "List all available Black Belt Labs metrics with their IDs, names, categories, " +
  "computation method (quantum / ai / classical), and descriptions.",
  {
    category: z
      .enum(["all", "Quantum Computing", "AI-Enhanced", "Risk", "Capital Flows", "Market Structure", "DeFi"])
      .optional()
      .default("all")
      .describe("Filter by category, or 'all' for the full catalog"),
    computation: z
      .enum(["all", "quantum", "ai", "classical"])
      .optional()
      .default("all")
      .describe("Filter by computation method"),
  },
  async ({ category, computation }) => {
    let metrics: readonly MetricEntry[] = await getCatalog();

    if (category !== "all") {
      metrics = metrics.filter((m) => m.category === category);
    }
    if (computation !== "all") {
      metrics = metrics.filter((m) => m.computation === computation);
    }

    const rows = metrics.map((m) =>
      `${m.id} [${m.computation.toUpperCase()}] ${m.name} (${m.category})\n  ${m.description}`
    );

    return {
      content: [{
        type: "text",
        text:
          `Black Belt Labs — ${metrics.length} metric(s) found\n` +
          `(filters: category=${category}, computation=${computation})\n\n` +
          rows.join("\n\n"),
      }],
    };
  }
);

// ── Tool 6: search_metrics ──────────────────────────────────────────────────

server.tool(
  "search_metrics",
  "Search Black Belt Labs metrics by keyword. Searches metric names, descriptions, and categories.",
  {
    query: z
      .string()
      .describe(
        "Search query, e.g. 'quantum', 'VaR', 'sentiment', 'regime', 'leverage', 'stablecoin'"
      ),
  },
  async ({ query }) => {
    const q = query.toLowerCase();
    const matches = (await getCatalog()).filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.computation.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      return {
        content: [{
          type: "text",
          text:
            `No metrics found matching "${query}". ` +
            `Try: 'quantum', 'ai', 'risk', 'leverage', 'sentiment', 'regime', 'flow'.`,
        }],
      };
    }

    const text = matches
      .map((m) => `${m.id} [${m.computation.toUpperCase()}]: ${m.name} — ${m.description}`)
      .join("\n");

    return {
      content: [{
        type: "text",
        text: `Found ${matches.length} metric(s) matching "${query}":\n\n${text}`,
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// Resource: metrics catalog
// ---------------------------------------------------------------------------

server.resource(
  "metrics-catalog",
  "blackbeltlabs://catalog",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify(await getCatalog(), null, 2),
      mimeType: "application/json",
    }],
  })
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Validate key at startup — fail loudly rather than on first tool call
  try {
    assertValidKey(API_KEY);
  } catch (err) {
    console.error(`[madjik-mcp] ${String(err)}`);
    process.exit(1);
  }

  const keyType = API_KEY.startsWith("bbl_test_") ? "TEST" : "LIVE";
  console.error(`[madjik-mcp] Starting — key type: ${keyType}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[madjik-mcp] Fatal:", err);
  process.exit(1);
});
