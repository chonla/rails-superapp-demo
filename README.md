# Super App Demo with Ruby on Rails

A small lab project exploring the "super app" pattern: a host Rails application
that embeds independent sub-applications inside a single shell, served through a
reverse-proxying controller and rendered into isolated Shadow DOM regions via
Turbo Frames.

## Architectural style

This project is an implementation of **Microkernel (Plug-in) Architecture**:

| Microkernel concept | In this project                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Core system         | `superapp` — owns the shell, routing, and the proxy/URL-rewrite mechanism                             |
| Plug-in registry    | `config.subapp_registries` — declares each plug-in's name, base URL, allow-listed paths, and metadata |
| Plug-in modules     | `subapp1`, `subapp2` — independently built and deployed, free to use any stack                        |
| Plug-in contract    | Return a `<turbo-frame id="data_container">` (optionally wrapping a `<template shadowrootmode>`)      |
| Isolation           | Shadow DOM per sub-app prevents style/DOM bleed between plug-ins and the core                         |

The core has no knowledge of any individual sub-app beyond what is in the
registry, and sub-apps have no knowledge of the core beyond the Turbo Frame
contract — giving the system the loose coupling characteristic of the
microkernel style.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  superapp (Rails 8.1, port 3000)                        │
│  ── home#index renders the shell + nav                  │
│  ── SubappsController proxies /subapps/:name/*path      │
│     · fetches from the sub-app's baseurl                │
│     · rewrites root-relative URLs via Nokogiri so they  │
│       stay under /subapps/:name (allow-listed globs)    │
│     · streams the response back into a Turbo Frame      │
└─────────┬───────────────────────────┬───────────────────┘
          │                           │
          ▼                           ▼
  ┌───────────────┐           ┌───────────────────┐
  │ subapp1       │           │ subapp2           │
  │ Rails 8.1     │           │ TypeScript + Node │
  │ port 3001     │           │ http (no fw)      │
  │               │           │ port 3002         │
  └───────────────┘           └───────────────────┘
```

Each sub-app responds with a `<turbo-frame id="data_container">` whose contents
are wrapped in a `<template shadowrootmode="open">`. A Stimulus controller
(`subapp_shadow_controller.js`) attaches the shadow root on connect, isolating
the sub-app's styles and DOM from the host page.

## Components

- **`superapp/`** — Rails 8.1 host. Renders the navigation, defines the
  `subapp_registries` in `config/environments/development.rb`, and owns the
  proxy controller at `app/controllers/subapps_controller.rb`.
- **`subapp1/`** — Rails 8.1 sub-app exposing `GET /entrypoint`. Demonstrates a
  Rails-on-Rails embed sharing Hotwire conventions.
- **`subapp2/`** — Minimal TypeScript service over `node:http` exposing
  `/entrypoint` and `/clock`. Demonstrates that a sub-app can be any stack
  capable of returning a Turbo Frame.

## Sub-app registry

Sub-apps are declared in `superapp/config/environments/development.rb`:

```ruby
config.subapp_registries = [
  {
    name:    "subapp1",
    baseurl: ENV.fetch("SUBAPP1_BASEURL", "http://localhost:3001"),
    paths:   ["/entrypoint", "/other_page", "/assets/**"],
    metadata: { title: "Application 1" }
  },
  ...
]
```

`paths` is an allow-list of globs (using `File::FNM_PATHNAME | FNM_EXTGLOB`)
that the URL rewriter uses to decide which root-relative URLs in the proxied
HTML should be prefixed with `/subapps/:name`.

## Running

```bash
docker compose up --build
```

| Service   | URL                       |
| --------- | ------------------------- |
| superapp  | http://localhost:3000     |
| subapp1   | http://localhost:3001     |
| subapp2   | http://localhost:3002     |

The host reaches sub-apps over the Compose network using `SUBAPP1_BASEURL` and
`SUBAPP2_BASEURL`, both set in `docker-compose.yml`.
