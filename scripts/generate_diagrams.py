import urllib.request
import base64
import zlib
import os

def kroki_encode(text):
    compressed = zlib.compress(text.encode("utf-8"), 9)
    return base64.urlsafe_b64encode(compressed).decode("ascii")

def save_svg(name, mermaid_text):
    encoded = kroki_encode(mermaid_text)
    url = f"https://kroki.io/mermaid/svg/{encoded}"
    print(f"Fetching {name} from {url}")
    try:
        # Include User-Agent to avoid 403 Forbidden
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                path = f"docs/diagrams/{name}.svg"
                os.makedirs(os.path.dirname(path), exist_ok=True)
                with open(path, "wb") as f:
                    f.write(response.read())
                print(f"Saved to {path}")
            else:
                print(f"Error fetching {name}: {response.status}")
    except Exception as e:
        print(f"Exception: {str(e)}")

architecture = """
flowchart TD
    subgraph Agents["Regional Agents"]
        US["US Desk"]
        CN["China Desk"]
        EU["EU Desk"]
        JP["Japan Desk"]
        CR["Crypto Desk"]
    end

    subgraph Data["Data Feeds"]
        D1["Financial Datasets MCP"]
        D2["AKShare and yfinance"]
        D3["CoinGecko and DeFiLlama"]
    end

    D1 --> US
    D2 --> CN
    D2 --> EU
    D2 --> JP
    D3 --> CR

    Agents --> Thesis["InvestmentThesis Pydantic schema"]
    Thesis --> Trans["Translator Agent"]
    Trans --> PMQ["PredictionMarketQuestion"]

    Thesis --> Hash["SHA256 canonical hash"]
    Hash --> IPFS["Pinata IPFS pin"]
    Hash --> Stake["Stake 10 ROSETTA"]
    IPFS --> Registry["ReasoningRegistry Arc L1"]
    Stake --> Registry
    PMQ --> Market["PredictionMarket binary YES NO"]
    Registry --> Market

    Market --> Settler["Autonomous Settler"]
    Settler --> Oracle["Price Oracle"]

    Registry --> Training["AdalFlow Trace Dataset"]
    Training --> Optimizer["Textgrad Optimizer"]
    Optimizer --> Agents
"""

accountability_loop = """
flowchart LR
    A["Agent analyzes ticker"] --> B["InvestmentThesis Pydantic"]
    B --> C["SHA256 hash"]
    C --> D["IPFS pin"]
    C --> E["Stake 10 ROSETTA"]
    D --> F["Arc L1 record"]
    E --> F
    F --> G["PredictionMarket binary question"]
    G --> H{"Market expires"}
    H -->|correct| I["Bond returned and reputation"]
    H -->|wrong| J["Bond slashed to correct predictor"]
"""

save_svg("architecture", architecture)
save_svg("accountability_loop", accountability_loop)
