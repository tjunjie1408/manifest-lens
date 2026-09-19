# Reused component attribution

Source: https://github.com/tjunjie1408/civic_pulse
Pinned commit: `fadf77b8db2943427bc46db471650c7f166f40bc`.

- `semantic_matching/embeddings.py`: copied directly from `src/civicpulse/embeddings.py` (upstream blob `f33f71a4a0b04d1ce497eec46500eb84837ab376`). Includes local-only runtime loading, input caching, dimension checks and cosine similarity.
- `tests/test_embeddings.py`: copied directly from upstream `tests/unit/test_embeddings.py`.
- `shipping.py`: adapts `normalize.py` (NFKC, casefold, punctuation, whitespace) and `categorize.py` (word-boundary term matching, unique strongest signal). Replaces civic categories, Pydantic domain models and civic aliases with shipping-specific contracts. It does not import civic incident matching thresholds.
- Document readers, SI/BL field extraction, deterministic comparison, prototype category fallback, evidence output and evaluation CLI are new shipping adapters.

CivicPulse's inspected category classifier uses rules; its E5 encoder is pretrained. This reuse does not claim a CivicPulse-trained shipping model. The original incident clustering, geography, priority scoring and database/UI were not imported because they do not implement SI/BL verification.

Model: `intfloat/multilingual-e5-small`, locally cached revision `614241f622f53c4eeff9890bdc4f31cfecc418b3`. Model card: https://huggingface.co/intfloat/multilingual-e5-small . The cached model card declares MIT. Initial inference uses no paid service and performs no model download. Runtime is offline for Hugging Face; only the local inbox/scorer receives HTTP requests.

No repository LICENSE file was observed in the pinned CivicPulse tree. This is user-directed local reuse; no redistribution or publication has been performed. Record the project's license before public redistribution.

The local package was renamed from `civicpulse` to `semantic_matching` on 2026-09-19 to describe its shipping role. Report snapshots use the same package and classifier names. Their source hashes describe the renamed files; predictions and scores remain unchanged. The upstream source and commit above identify the reused implementation.
