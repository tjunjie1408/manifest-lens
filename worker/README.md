# Shipping baseline worker

Local classification and document verification for the supplied shipping problem. Reusable embedding utilities live in `semantic_matching/`; upstream attribution is documented in `PROVENANCE.md`. The batch baseline is now also consumed by the local SvelteKit review prototype at `/shipping`; see the human-review implementation note in `docs/plans/` from the repository root.

Python 3.12, uv, pinned `uv.lock`. From this directory:

```powershell
uv sync --frozen
uv run --frozen python -m pytest -q
uv run --frozen python -X utf8 evaluate.py --output reports/my-run-001
```

Start the supplied scorer first from the repository root:

```powershell
docker compose -f sdoc-hackathon-docker/docker-compose.yml up -d
```

The default model path is the local Hugging Face E5 snapshot shown in `evaluate.py`. Override with `--model-path PATH` for a complete local copy of the same revision. Missing model weights fail explicitly; this command does not download them. `--rules-only` is a diagnostic alternative and must use a distinct `--output` directory. Dependencies may need a one-time internet download during `uv sync`.

The original run remains under `reports/baseline-v1/`; the second experiment is under `reports/experiment-v2/`. Use a new output directory for every run; existing directories are rejected before inference. Each new run stores the executed source files and their hashes. Outputs:

- `submission.json`: predictions frozen before scoring.
- `score.json`: actual response from the organizer's local `/submit` endpoint.
- `audit.json`: classification terms/similarities, original extracted rows, source locations, values and per-field outcomes.
- `run.json`: source/lock hashes, model/source revision, counts and runtime.
- `review_queue.json`: pending human-review items referencing original audit evidence; not approval records.
- `source/`: snapshot of the source files recorded in the manifest.

Inference reads `/emails` and observed `/attachments/...` only. It never opens `ground_truth.json`, generator source or sample submission labels. The scorer alone handles the answer key. Running on all 520 supplied synthetic examples is exploratory evaluation, not a held-out generalization estimate.

Comparison uses exact normalized entity strings and decimal unit conversion. Semantic similarity selects an email category only when rules are unresolved; it never makes two unequal weights, ports or names match. Similarities are uncalibrated scores, not probabilities. All semantic fallback decisions are marked for review in the audit; the benchmark still requires a category prediction.

Document coverage: text TXT, text-layer PDF, DOCX paragraphs/tables and XLSX cells. Image-only PDFs are routed to review; no OCR has been implemented. The parser is a conservative label-based baseline, with no claim of arbitrary-layout support. PDF locations are extracted line positions, not bounding boxes. DOCX paragraph indices are body-block indices.

`OK` on a non-comparison category means not applicable, not proof of SI/BL agreement. A BL comparison without both documents is always `NEEDS_REVIEW`, even where the benchmark labels missing-attachment requests `OK`. Confirmed mismatches alongside unknown fields remain in `known_mismatches` in the audit; benchmark output follows its review schema.

Experimental review policy queues every predicted BL comparison for human sign-off, even automatic matches, plus uncertain classification fallbacks. Unqueued non-comparison emails are not approved documents. The batch JSON remains a pending-work export. The local website now provides authenticated corrections, recomputation and versioned human decisions in PostgreSQL, without modifying this export. No new training, OCR, cloud deployment or real-inbox validation is claimed. See `PROVENANCE.md` for exactly what was reused.



## Container runtime

The root Dockerfile packages only `manual_compare.py` and `shipping.py` with Python 3.12 for human review recomputation. These modules use the standard library. Batch evaluation dependencies and `semantic_matching/` stay in the locked uv environment and are not copied into the web image. Current classifier labels are `shipping_rules` and `shipping_e5_prototype`; stored reports use the same identifiers; their run metadata distinguishes renamed source snapshots from the original evaluation.
