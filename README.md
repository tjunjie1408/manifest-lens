# Manifest Lens

An Averis–Monash Hackathon prototype for comparing **Shipping Instructions (SI)** with **draft Bills of Lading (BL)**. Reviewers can inspect source evidence, correct extracted fields, recheck differences, and record a decision with an audit history.

- **Evidence Map** — see which documents and fields need attention.
- **Review workspace** — compare seven shipping fields alongside the original evidence.
- **Human review** — confirm results or request information; keep corrections and decisions in PostgreSQL.

Built with SvelteKit, TypeScript, PostgreSQL, and Python. The demo runs locally without paid AI APIs or a hosted LLM.

## How AI is used

Email triage uses a hybrid classifier: explicit shipping rules handle clear cases, while a pinned `multilingual-e5-small` embedding model classifies messages that the rules cannot resolve. The tracked `worker/reports/experiment-v2/` run records the model revision, source hashes, all 520 predictions, 37 semantic fallback decisions, and the organizer scorer response. The web prototype consumes that frozen, auditable output so judges can inspect the evidence without downloading model weights.

Document field extraction and SI-versus-BL comparison remain conservative and deterministic. Missing, unreadable, or ambiguous evidence is sent to human review instead of being guessed. Reproducing the batch AI run requires the separate locked worker environment and a local copy of the pinned model; the Docker web demo packages the frozen results and the lightweight human-correction runtime.

## Quick start: Docker

**Requirements:** Docker Desktop / Docker Engine with Compose running. Run all commands from the repository root. The first build needs internet access to download images and dependencies; no host Node.js or Python installation is needed.

The supplied demo files must be present:

- `sdoc-hackathon-docker/data_v2/inbox/`
- `sdoc-hackathon-docker/data_v2/attachments/`
- `worker/reports/experiment-v2/audit.json`

```sh
docker compose up --build -d --wait
```

Open **[Manifest Lens](http://127.0.0.1:3000/shipping/overview)**. On your first visit, register an account with a name, email, and password, then sign in.

Compose starts PostgreSQL, applies the committed database migrations, and starts the application. Local demo defaults work without creating a `.env` file. Review history persists in the `db-data` volume.

A clean clone of this GitHub repository contains everything required for the `app` profile above. The optional organizer evaluator described below is not required to run or judge Manifest Lens.

### Optional: use the organizer's local scoring service

The participant repository does not include the organizer's private scoring server or answer key. If you separately have the complete organizer bundle, you can also start its HTTP inbox and evaluator from the same Compose project:

```sh
docker compose --profile evaluator up --build -d --wait
```

The website stays at `http://127.0.0.1:3000`; the organizer service is at `http://127.0.0.1:8080` (`/health`, `/emails`, `/attachments/...`, and `/submit`). The `evaluator` profile requires the separately supplied organizer bundle, including `server/`, `sample_submission.json`, and `ground_truth.json`; it is expected to fail when those private files are absent from a clean participant clone.

Organizer inputs are mounted read-only. The answer key is mounted separately into the scoring service and is not available to the web app; the answer-key endpoint is disabled. Keep this service local to evaluation rather than exposing it as the public website. Stop the combined stack with `docker compose --profile evaluator stop`.

GitHub CI uses synthetic email envelopes to check integration and container startup without the untracked bundle. Those fixtures do not replace organizer inputs in a real demo or release image, and CI does not run the organizer scoring service.

### Try the demo

1. Open the **Evidence Map** and filter the cases that need attention.
2. Select a field or open a case to inspect its email and document evidence.
3. Correct a field and recheck the comparison.
4. Record a review decision and inspect the saved history.

### Manage the containers

```sh
docker compose ps -a             # Check service status
docker compose logs app migrate  # Inspect application and migration logs
docker compose stop              # Stop services; keep database data
```

The app and database should be `healthy`. The migration service normally shows `Exited (0)`. Readiness is available at `/api/health`.

## Configuration

For custom settings, copy `.env.example` to `.env` and edit it. Keep an existing `.env` if you already have one. Docker defaults are intended for a local demo only.

| Setting                                             | Local development                                                                | Docker Compose                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`                                | Set a random secret of at least 32 characters.                                   | Optional override in `.env`; replace the demo secret for any shared deployment.                  |
| `DATABASE_URL`                                      | Defaults in the example to `postgres://postgres:postgres@localhost:5432/averis`. | Derived from `POSTGRES_*` using the internal `db` hostname; `.env`'s `DATABASE_URL` is not used. |
| `ORIGIN`                                            | Set to `http://localhost:5173`.                                                  | Fixed to `http://127.0.0.1:3000` in `compose.yaml`.                                              |
| `SHIPPING_PYTHON`                                   | Optional absolute Python 3.12 executable path; otherwise uses `worker/.venv`.    | Already set to the packaged Python runtime.                                                      |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Match `DATABASE_URL` if you change these.                                        | Optional `.env` overrides; defaults are `postgres`, `postgres`, and `averis`.                    |

`AI_API_KEY` is not needed for shipping review. Changing `POSTGRES_*` does not update credentials in an already initialized database volume.

To change the Docker site's address, update both the app's `ORIGIN` and port mapping in [compose.yaml](compose.yaml). Editing only `.env`'s `ORIGIN` will not change the Compose configuration.

With Node.js installed, generate an auth secret using:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

## Local development

**Requirements:** Node.js 22+, Python 3.12, uv, and Docker for PostgreSQL. This setup runs the website outside Docker with live reload.

First, copy the environment template (PowerShell):

```powershell
Copy-Item .env.example .env
```

On macOS/Linux, use `cp .env.example .env`. Set `BETTER_AUTH_SECRET` and `ORIGIN=http://localhost:5173`, then run:

```sh
npm ci --ignore-scripts
uv sync --frozen --project worker
docker compose up -d --wait db
npm run db:migrate
npm run dev
```

Open **[the development site](http://localhost:5173/shipping/overview)** and register an account.

`uv sync` installs the worker's locked dependencies, including those for batch model evaluation. For website-only development, you can skip that step and set `SHIPPING_PYTHON` to an existing Python 3.12 executable: the review recomputation uses only Python's standard library.

### Useful commands

```sh
npm run check          # Svelte and TypeScript checks
npm run build          # Production website build
npm run db:generate    # Generate a migration after a schema change
npm run db:migrate     # Apply committed migrations
```

## Project structure

| Location                              | Purpose                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `src/routes/shipping/`                | Page loaders, form actions, and route composition            |
| `src/lib/components/shipping/`        | Dashboard, queue, review components, and feature styles      |
| `src/lib/shipping/`                   | Shared types and evidence-map presentation logic             |
| `src/lib/server/services/shipping.ts` | Evidence loading, Python rechecks, and saved reviews         |
| `worker/`                             | Python comparison logic and separate batch model experiments |
| `sdoc-hackathon-docker/`              | Supplied synthetic data and organizer evaluator              |
| `Dockerfile`, `compose.yaml`          | Application packaging, database, and migrations              |

See the [UI file guide](src/lib/components/shipping/README.md) for where to edit a specific screen, and the [worker guide](worker/README.md) for model setup and batch evaluation. The organizer evaluator is separate and is not required to use the website.

## Demo scope and deployment

The website displays a frozen experiment over **520 synthetic emails** and their supporting attachments. It supports human corrections and rechecks; fresh mailbox ingestion, document uploads, and OCR are not implemented. Dashboard states describe available evidence and review progress, not calibrated model confidence or accuracy on real shipments.

The Docker image includes the evidence files and Python comparison runtime, but excludes model weights and evaluator answer keys. The reproducible multilingual embedding pipeline runs through the locked worker environment and produces the tracked audit artifacts consumed by the web prototype.

For cloud hosting, use a container service that supports Node.js, Python subprocesses, and the packaged evidence files, plus persistent PostgreSQL. Configure `DATABASE_URL`, a fresh `BETTER_AUTH_SECRET`, and the exact public HTTPS URL as `ORIGIN`; run `node scripts/migrate.mjs` before starting `node build`. The current localhost Compose file needs adaptation for public hosting. An edge/serverless adapter is not a drop-in replacement.

For a Docker-based Render web service, deploy the repository's root `Dockerfile` and set the HTTP health-check path to `/api/health`. Render's free web services can spin down after inactivity, so the first visit may take longer while the service wakes. Open and verify the public URL shortly before judging, or use an instance type that does not spin down during the judging window.
