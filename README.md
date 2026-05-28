# Super App Demo with Ruby on Rails

A small lab project exploring the "super app" pattern: a host Rails application
that embeds independent sub-applications inside a single shell. Each sub-app
declares its integration mode in the registry — either a **Turbo Frame**
(DOM-level embed for sub-apps that share the host's Hotwire conventions,
proxied and URL-rewritten by the host) or an **`<iframe>`** (full browsing-
context isolation, loaded cross-origin straight from the sub-app's own URL,
intended for adopting existing SPAs built on heavy frameworks like Angular,
Vue, or React with no changes to the sub-app itself).

## Architectural style

This project is an implementation of **Microkernel (Plug-in) Architecture**:

| Microkernel concept | In this project                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Core system         | `superapp` — owns the shell, the registry, and the proxy/URL-rewrite mechanism used by turbo_frame plug-ins    |
| Plug-in registry    | `config.subapp_registries` — declares each plug-in's name, base URL, integration mode, and per-mode metadata   |
| Plug-in modules     | `subapp1`, `subapp2`, ... — independently built and deployed, free to use any stack                            |
| Plug-in contract    | Return a `<turbo-frame id="data_container">` (turbo_frame mode) or be reachable as a normal web app (iframe mode) |
| Isolation           | Shadow DOM (turbo_frame mode) or browsing-context isolation (iframe mode), selected per plug-in via `integration` |

The core has no knowledge of any individual sub-app beyond what is in the
registry, and sub-apps have no knowledge of the core beyond the Turbo Frame
contract — giving the system the loose coupling characteristic of the
microkernel style.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  superapp (Rails 8.1, port 3000)                                │
│  ── home#index    renders the shell + nav                       │
│  ── subapps#show  proxies turbo_frame plug-ins through          │
│                   /subapps/:name/*exposed_path                  │
│                   (fetches baseurl, Nokogiri rewrites           │
│                    root-relative URLs to /subapps/:name)        │
│  ── subapps#embed renders an <iframe> wrapper pointing at the   │
│                   iframe plug-in's baseurl (no proxy)           │
└──────┬────────────────────┬─────────────────────────┬───────────┘
       │ proxied            │ proxied                 │
       ▼                    ▼                         │
 ┌──────────────┐   ┌──────────────────┐              │
 │ subapp1      │   │ subapp2          │              │
 │ Rails 8.1    │   │ TypeScript+Node  │              │
 │ port 3001    │   │ port 3002        │              │
 └──────────────┘   └──────────────────┘              │
                                                      │ iframe src
                                          ┌───────────┴─────────┐
                                          │ (browser → upstream,│
                                          │  cross-origin)      │
                                          ▼                     │
                                  ┌──────────────────┐          │
                                  │ subapp3          │          │
                                  │ Vue 3 + Vite SPA │          │
                                  │ port 3003        │          │
                                  └──────────────────┘          │
                                                                ▼
```

## Integration modes

Each registry entry declares an `integration` mode. The host shell branches on
that field when rendering the nav: turbo_frame plug-ins are loaded into the
`data_container` via a Turbo Frame swap that streams through the host's proxy;
iframe plug-ins are loaded into an `<iframe>` whose `src` points directly at
the plug-in's own `baseurl` — the host never sees those requests.

| Mode          | What the host renders                                                | Where the iframe/frame talks to                  | Isolation                                                        | When to use                                                          |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `turbo_frame` | Sub-app HTML swapped inline into `<turbo-frame id="data_container">` | Host proxy (`/subapps/:name/...`), same-origin   | Shadow DOM (styles + DOM only) via `subapp_shadow_controller`    | Sub-apps that share the host's Hotwire/Turbo conventions             |
| `iframe`      | `<iframe src="<baseurl>">` inside the same `data_container`          | Sub-app's own origin directly, **cross-origin**  | Separate browsing context (JS globals, custom elements, history) | **Adopting existing SPAs** (Angular/Vue/React) with no code changes  |

### Adopting an existing SPA via iframe mode

The iframe path is designed for the common case where a team already has an
Angular/Vue/React app and wants to drop it into the super app shell without
porting it to Hotwire. Because the iframe loads the upstream URL directly,
**no changes are required in the sub-app itself** — its router, its build
tool, and its asset paths all keep working unchanged. The host only needs to
know the sub-app's `baseurl`.

The trade-offs compared to the proxied turbo_frame path:

- **Cross-origin** — cookies on the iframe are 3rd-party from the host's
  perspective (subject to Safari ITP, Chrome storage partitioning).
- **`postMessage`** between host and plug-in needs an explicit `targetOrigin`
  (the upstream's origin), not `location.origin`.
- **Host CSP** — if you enforce one, add the upstream origin to `frame-src`.
- **Anti-framing headers** — if the upstream sends `X-Frame-Options` or CSP
  `frame-ancestors`, the browser will refuse to render it. Configure these
  on first-party sub-apps to allow framing by the super app's origin.

See `subapp3/` for a working Vue 3 + Vite example.

## Components

- **`superapp/`** — Rails 8.1 host. Renders the navigation, defines the
  `subapp_registries` in `config/environments/development.rb`, and owns the
  proxy controller at `app/controllers/subapps_controller.rb`.
- **`subapp1/`** — Rails 8.1 sub-app exposing `GET /entrypoint`. Demonstrates a
  Rails-on-Rails embed sharing Hotwire conventions (turbo_frame mode).
- **`subapp2/`** — Minimal TypeScript service over `node:http` exposing
  `/entrypoint` and `/clock`. Demonstrates that a turbo_frame sub-app can be
  any stack capable of returning a Turbo Frame.
- **`subapp3/`** — Vue 3 + Vue Router SPA served by Vite (iframe mode).
  Demonstrates adopting an existing SPA framework — embedded as-is from its
  own origin (`http://localhost:3003`), with no super-app-specific code.

## Sub-app registry

Sub-apps are declared in `superapp/config/environments/development.rb`:

```ruby
config.subapp_registries = [
  {
    name:          "subapp1",
    baseurl:       ENV.fetch("SUBAPP1_BASEURL", "http://localhost:3001"),
    entrypoint:    "/entrypoint",
    exposed_paths: ["/entrypoint", "/other_page", "/assets/**"],
    integration:   "turbo_frame",
    metadata:      { title: "Application 1" }
  },
  {
    name:        "subapp3",
    baseurl:     ENV.fetch("SUBAPP3_BASEURL", "http://localhost:3003"),
    integration: "iframe",
    metadata:    { title: "Application 3 (Vue)" }
  }
]
```

| Field           | Required for                | Purpose                                                                                                                          |
| --------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `name`          | both modes                  | Slug used as the registry lookup key (and, for turbo_frame mode, the proxy prefix `/subapps/:name/...`)                          |
| `baseurl`       | both modes                  | Upstream origin. For `turbo_frame` this is the URL the proxy fetches; for `iframe` this is the URL the browser loads directly    |
| `integration`   | both modes                  | `"turbo_frame"` or `"iframe"` — selects the host-side embedding strategy                                                         |
| `metadata`      | both modes                  | Free-form display data (e.g. `title` shown in the nav)                                                                           |
| `entrypoint`    | `turbo_frame`               | Initial path under `baseurl` that the host's nav link loads through the proxy                                                    |
| `exposed_paths` | `turbo_frame`               | Allow-list of globs (`File::FNM_PATHNAME \| FNM_EXTGLOB`) the Nokogiri URL rewriter uses to scope root-relative URLs              |

## Running

```bash
docker compose up --build
```

| Service   | URL                       | How the host reaches it                         |
| --------- | ------------------------- | ----------------------------------------------- |
| superapp  | http://localhost:3000     | —                                               |
| subapp1   | http://localhost:3001     | `SUBAPP1_BASEURL=http://subapp1:3001` (proxied) |
| subapp2   | http://localhost:3002     | `SUBAPP2_BASEURL=http://subapp2:3002` (proxied) |
| subapp3   | http://localhost:3003     | `SUBAPP3_BASEURL=http://localhost:3003` (browser-direct, cross-origin) |

`turbo_frame` plug-ins (subapp1, subapp2) are reached by the Rails proxy over
the Compose network using container hostnames, so their `BASEURL` values are
in-network URLs. `subapp3` is loaded directly by the user's browser, so its
`BASEURL` must be the URL that resolves from the browser — `http://localhost:3003`
in dev, the public URL in production.
