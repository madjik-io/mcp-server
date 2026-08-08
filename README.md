# @blackbeltlabs/mcp-server

**Quantum-finance intelligence for AI agents.**

Connect any MCP-compatible AI agent to Black Belt Labs metrics — quantum-computed portfolio optimisation, VaR simulation, AI-enhanced regime detection, sentiment, and cross-asset risk signals.

## Requirements

- Node.js ≥ 18
- A Black Belt Labs API key (`bbl_live_...` or `bbl_test_...`) — get one at [blackbeltlabs.fi](https://blackbeltlabs.fi)

> **Note:** Madjik API keys (`mk_...`) are not accepted. BBL keys are issued separately at blackbeltlabs.fi.

## Quickstart

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "blackbeltlabs": {
      "command": "npx",
      "args": ["-y", "@blackbeltlabs/mcp-server"],
      "env": {
        "BLACKBELTLABS_API_KEY": "bbl_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. You can now ask: *"What is the current quantum VaR estimate from Black Belt Labs?"*

### Other MCP clients

```bash
BLACKBELTLABS_API_KEY=bbl_live_your_key npx @blackbeltlabs/mcp-server
```

## Available Tools

| Tool | Description |
|---|---|
| `get_metric` | Fetch any single metric by ID (e.g. `ME10021`) |
| `get_quantum_metrics` | Fetch all quantum-computed metrics (ME10021, ME10022) |
| `get_ai_metrics` | Fetch all AI-enhanced metrics (ME10016, ME10017, ME10019, ME10020, ME10010) |
| `get_risk_snapshot` | Composite risk view: QC VaR + leverage + liquidation + correlation |
| `list_metrics` | Browse catalog by category or computation method |
| `search_metrics` | Search by keyword (e.g. `quantum`, `sentiment`, `regime`) |

## Key Metrics

| ID | Name | Method |
|---|---|---|
| ME10021 | Portfolio Optimisation | ⚛️ Quantum (QAOA) |
| ME10022 | Risk Simulation — VaR | ⚛️ Quantum (QAE) |
| ME10017 | Sentiment Index | 🤖 AI (Gemini) |
| ME10019 | Market Narrative | 🤖 AI (Gemini) |
| ME10016 | Regime Detection | 🤖 AI + HMM |
| ME10002 | Leverage Stress Index | Classical |
| ME10004 | Liquidation Cascade Risk | Classical |

## License

MIT © Black Belt Labs

## Disclaimer

Madjik metrics are informational market indicators computed by the Black Belt Labs engine. They are not investment advice, an offer, or a recommendation to buy or sell any asset. Quantum-computed metrics run on Qiskit simulators (hardware-ready circuit designs).
