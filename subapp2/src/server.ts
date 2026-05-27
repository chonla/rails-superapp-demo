import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const PORT = Number(process.env.PORT ?? 3002);

const frame = (title: string, body: string): string => `
<turbo-frame id="data_container">
  <div data-controller="subapp-shadow">
    <template shadowrootmode="open">
      <style>
        :host { display: block; font-family: system-ui, -apple-system, sans-serif; }
        .subapp-root { padding: 0.5rem 0; }
        h1 { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.5rem; }
        p { margin: 0.25rem 0; }
        a { color: #2563eb; text-decoration: underline; }
        code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
      </style>
      <div class="subapp-root">
        <h1>${title}</h1>
        ${body}
      </div>
    </template>
  </div>
</turbo-frame>
`.trim();

const entrypoint = (): string =>
  frame(
    "Sub App 2 (TypeScript, no framework)",
    `
      <p>Served by a plain Node HTTP server in TypeScript.</p>
      <p>
        <a href="/clock" data-turbo-frame="data_container">Show server time</a>
      </p>
    `,
  );

const clock = (): string =>
  frame(
    "Sub App 2 &mdash; Server time",
    `
      <p>Server time: <code>${new Date().toISOString()}</code></p>
      <p>
        <a href="/entrypoint" data-turbo-frame="data_container">Back to entrypoint</a>
      </p>
    `,
  );

const routes: Record<string, () => string> = {
  "/entrypoint": entrypoint,
  "/clock": clock,
};

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/up") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  const handler = req.method === "GET" ? routes[url.pathname] : undefined;
  if (handler) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(handler());
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`subapp2 listening on http://localhost:${PORT}`);
});
