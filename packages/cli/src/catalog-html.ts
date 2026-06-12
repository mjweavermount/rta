export const catalogHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RTA Catalog</title>
  <style>
    :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    html, body { height: 100%; overflow: hidden; }
    body { margin: 0; background: #0d1117; color: #d6deeb; }
    header { padding: 20px 28px; border-bottom: 1px solid #263142; background: #121923; position: sticky; top: 0; z-index: 1; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    header p { margin: 0; color: #8b9bb0; }
    main { display: grid; grid-template-columns: minmax(280px, 34vw) 1fr; height: calc(100vh - 86px); min-height: 0; }
    aside { border-right: 1px solid #263142; padding: 18px; overflow: auto; min-height: 0; }
    section { padding: 18px 22px; overflow: auto; min-height: 0; }
    input { width: 100%; box-sizing: border-box; background: #0a0f16; color: #d6deeb; border: 1px solid #2f3b4d; border-radius: 6px; padding: 10px 12px; }
    button { display: block; width: 100%; text-align: left; color: inherit; background: transparent; border: 0; border-bottom: 1px solid #182230; padding: 10px 4px; cursor: pointer; }
    button:hover, button[aria-selected="true"] { background: #172231; }
    .view-menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 6px; margin: 12px 0 14px; }
    .view-menu button { text-align: center; border: 1px solid #263142; border-radius: 6px; padding: 8px 4px; font-size: 12px; background: #0a0f16; }
    .view-menu button[aria-pressed="true"] { background: #1d2b3d; border-color: #4f83bd; color: #d9ecff; }
    .group { margin: 16px 0 8px; }
    .group-title { color: #c8d3e1; font-size: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; border-bottom: 1px solid #263142; padding-bottom: 6px; }
    .group-count { color: #64748b; font-weight: 500; margin-left: 6px; }
    .item-name { display: block; font-size: 14px; line-height: 1.3; font-weight: 700; }
    .item-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; font-size: 11px; color: #8b9bb0; }
    .item-kind { color: #74b7ff; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
    .item-path { overflow-wrap: anywhere; }
    button.depth-1 { padding-left: 18px; }
    button.depth-2 { padding-left: 32px; }
    button.depth-3 { padding-left: 46px; }
    .detail-kind { color: #74b7ff; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .muted { color: #8b9bb0; }
    .path { color: #a4d6a4; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
    pre { background: #090d13; border: 1px solid #263142; border-radius: 8px; padding: 12px; overflow: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; }
    a.rta-link { color: #f6c177; text-decoration: none; border-bottom: 1px dotted #f6c177; }
    .line { white-space: pre; }
    .ln { color: #64748b; display: inline-block; width: 4ch; user-select: none; }
    .entry-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 18px; }
    .entry-card { border: 1px solid #263142; border-radius: 8px; padding: 14px; background: #111923; }
    .entry-card h3 { margin: 0 0 8px; }
    .entry-card p { color: #9aa9bb; margin: 0 0 12px; }
    .entry-card button { border: 1px solid #324156; border-radius: 6px; padding: 8px 10px; color: #d9ecff; background: #172231; }
    .empty-state { border: 1px dashed #344154; border-radius: 8px; padding: 18px; color: #9aa9bb; background: #0a0f16; }
    .article { border: 1px solid #263142; border-radius: 8px; padding: 14px 16px; background: #111923; margin: 16px 0; }
    .article h3 { margin: 0 0 10px; }
    .article-section { border-top: 1px solid #263142; padding-top: 12px; margin-top: 12px; }
    .article-section:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
    .article-section h4 { margin: 0 0 6px; }
    .article-section p { margin: 0; color: #b4c2d2; line-height: 1.55; }
    .source-refs { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 16px; }
    .source-ref { color: #a4d6a4; background: #09131d; border: 1px solid #263142; border-radius: 999px; padding: 5px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <header>
    <h1>RTA Catalog</h1>
    <p>Vocabulary, ARDs, source files, and source-link overlays from this repo.</p>
  </header>
  <main>
    <aside>
      <input id="q" placeholder="Search catalog..." />
      <div class="view-menu" aria-label="Catalog view">
        <button type="button" data-view="home">Home</button>
        <button type="button" data-view="concepts">Concepts</button>
        <button type="button" data-view="core-vocab">Core vocab</button>
        <button type="button" data-view="repo-apps">Repo apps</button>
        <button type="button" data-view="runtime-apps">Runtime apps</button>
        <button type="button" data-view="scope">Scope</button>
        <button type="button" data-view="tree">Tree</button>
        <button type="button" data-view="type">Type</button>
        <button type="button" data-view="tier">Tier</button>
        <button type="button" data-view="records">Records</button>
        <button type="button" data-view="files">Files</button>
      </div>
      <div id="nodes"></div>
    </aside>
    <section id="detail">Loading catalog...</section>
  </main>
  <script>
    const nodesEl = document.getElementById("nodes");
    const detailEl = document.getElementById("detail");
    const qEl = document.getElementById("q");
    let catalog = { nodes: [], edges: [] };
    let selectedId = null;
    let viewMode = localStorage.getItem("rta.catalog.viewMode") || "home";
    const entryPoints = [
      {
        view: "concepts",
        title: "RTA concept articles",
        description: "Human-readable wiki entries for the ideas behind RTA: bounded contexts, ports, operation scopes, repositories, and more.",
      },
      {
        view: "core-vocab",
        title: "Core vocab",
        description: "The declared model language in this repo: contexts, aggregates, rules, decisions, ports, patterns, and archetypes.",
      },
      {
        view: "repo-apps",
        title: "Apps in repos",
        description: "Host-neutral app declarations found in source control, including wiring, tool surfaces, deployment intent, and adapter bindings.",
      },
      {
        view: "runtime-apps",
        title: "Apps executing",
        description: "Live app instances and runtime health. This is intentionally empty until RTA has a runtime app inventory source.",
      },
    ];
    const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const titleCase = (value) => String(value).split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    const matchesQuery = (n, q) => !q || [n.id, n.name, n.kind, n.path, n.description, n.scope, n.tier].some((v) => String(v ?? "").toLowerCase().includes(q));
    const defaultNodes = () => catalog.nodes.filter((n) => n.kind !== "source-file");
    const kindRank = {
      context: 0,
      aggregate: 1,
      rule: 2,
      decision: 2,
      "process-manager": 3,
      reaction: 4,
      "boundary-schema": 5,
      port: 6,
      "adapter-binding": 7,
      "tool-surface": 8,
      "deployment-intent": 9,
      "app-wiring": 10,
      pattern: 11,
      archetype: 12,
      "archetype-instance": 13,
      concept: 14,
      "vocab-symbol": 15,
      ard: 16,
      "source-file": 17,
    };
    const sortNodes = (nodes) => [...nodes].sort((a, b) =>
      (kindRank[a.kind] ?? 99) - (kindRank[b.kind] ?? 99) ||
      String(a.scope ?? "").localeCompare(String(b.scope ?? "")) ||
      String(a.name).localeCompare(String(b.name))
    );
    const groupBy = (nodes, keyFn) => {
      const groups = new Map();
      for (const node of sortNodes(nodes)) {
        const key = keyFn(node) || "Other";
        groups.set(key, [...(groups.get(key) ?? []), node]);
      }
      return [...groups.entries()].map(([name, nodes]) => ({ name, nodes }));
    };
    const itemSubline = (node) => viewMode === "files" ? node.path : node.id;
    const treeDepth = (node) => {
      if (viewMode !== "tree") return 0;
      if (node.kind === "context") return 0;
      if (["aggregate", "boundary-schema", "port", "tool-surface", "deployment-intent", "app-wiring"].includes(node.kind)) return 1;
      if (["rule", "decision", "reaction", "process-manager", "adapter-binding"].includes(node.kind)) return 2;
      return 1;
    };
    const visibleGroups = () => {
      const q = qEl.value.trim().toLowerCase();
      if (q) {
        return [{ name: "Search results", nodes: sortNodes(catalog.nodes.filter((n) => matchesQuery(n, q))).slice(0, 300) }];
      }

      if (viewMode === "home") {
        return [];
      }

      if (viewMode === "files") {
        return groupBy(catalog.nodes.filter((n) => n.kind === "source-file"), (n) => (n.path ?? "").split("/")[0] || "Root");
      }

      if (viewMode === "records") {
        return groupBy(catalog.nodes.filter((n) => n.kind === "ard"), (n) => String(n.metadata?.status ?? "Records"));
      }

      if (viewMode === "concepts") {
        return groupBy(catalog.nodes.filter((n) => n.kind === "concept"), (n) => String(n.metadata?.category ?? "Concepts"));
      }

      if (viewMode === "core-vocab") {
        const coreKinds = new Set([
          "pattern",
          "archetype",
          "archetype-instance",
          "context",
          "aggregate",
          "rule",
          "decision",
          "reaction",
          "process-manager",
          "boundary-schema",
          "port",
          "vocab-symbol",
        ]);
        return groupBy(catalog.nodes.filter((n) => coreKinds.has(n.kind)), (n) => String(n.metadata?.category ?? n.scope ?? titleCase(n.kind)));
      }

      if (viewMode === "repo-apps") {
        const appKinds = new Set(["app-wiring", "deployment-intent", "tool-surface", "adapter-binding"]);
        return groupBy(catalog.nodes.filter((n) => appKinds.has(n.kind)), (n) => n.scope ?? titleCase(n.kind));
      }

      if (viewMode === "runtime-apps") {
        return [{ name: "Runtime inventory", nodes: [] }];
      }

      if (viewMode === "tree") {
        return groupBy(
          defaultNodes().filter((n) => n.scope && !["ard", "concept", "vocab-symbol"].includes(n.kind)),
          (n) => n.scope,
        );
      }

      const nodes = defaultNodes();
      if (viewMode === "type") return groupBy(nodes, (n) => titleCase(n.kind));
      if (viewMode === "tier") return groupBy(nodes, (n) => n.tier ? n.tier.toUpperCase() : "Untiered");
      return groupBy(nodes, (n) => n.scope ?? (n.kind === "ard" ? "Architecture Records" : titleCase(n.kind)));
    };
    const renderList = () => {
      document.querySelectorAll("[data-view]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.view === viewMode));
      });
      if (viewMode === "home") {
        nodesEl.innerHTML = \`
          <div class="group">
            <div class="group-title">Entry points<span class="group-count">\${entryPoints.length}</span></div>
            \${entryPoints.map((entry) => \`
              <button data-entry-view="\${esc(entry.view)}">
                <strong class="item-name">\${esc(entry.title)}</strong>
                <div class="item-meta"><span class="item-path">\${esc(entry.description)}</span></div>
              </button>
            \`).join("")}
          </div>
        \`;
        return;
      }
      const groups = visibleGroups();
      if (groups.length === 1 && groups[0].nodes.length === 0) {
        nodesEl.innerHTML = \`
          <div class="group">
            <div class="group-title">\${esc(groups[0].name)}<span class="group-count">0</span></div>
            <div class="empty-state">No executing app inventory is wired yet. This entry point is reserved for live app state.</div>
          </div>
        \`;
        return;
      }
      nodesEl.innerHTML = groups.map((group) => \`
        <div class="group">
          <div class="group-title">\${esc(group.name)}<span class="group-count">\${group.nodes.length}</span></div>
          \${group.nodes.map((n) => \`
            <button data-id="\${esc(n.id)}" aria-selected="\${n.id === selectedId}" class="depth-\${treeDepth(n)}">
              <strong class="item-name">\${esc(n.name)}</strong>
              <div class="item-meta">
                <span class="item-kind">\${esc(n.kind)}</span>
                <span class="item-path">\${esc(itemSubline(n))}</span>
              </div>
            </button>
          \`).join("")}
        </div>
      \`).join("");
    };
    const renderHome = () => {
      detailEl.innerHTML = \`
        <div class="detail-kind">Catalog entry points</div>
        <h2>RTA Wiki</h2>
        <p>Start from the shape of the question instead of the shape of the files.</p>
        <div class="entry-grid">
          \${entryPoints.map((entry) => \`
            <div class="entry-card">
              <h3>\${esc(entry.title)}</h3>
              <p>\${esc(entry.description)}</p>
              <button type="button" data-entry-view="\${esc(entry.view)}">Open</button>
            </div>
          \`).join("")}
        </div>
      \`;
    };
    const renderSource = async (path) => {
      const [source, linkPayload] = await Promise.all([
        fetch("/api/v1/source?path=" + encodeURIComponent(path)).then((r) => r.json()),
        fetch("/api/v1/source/links?path=" + encodeURIComponent(path)).then((r) => r.json()),
      ]);
      const byLine = new Map();
      for (const link of linkPayload.links ?? []) {
        const arr = byLine.get(link.line) ?? [];
        arr.push(link);
        byLine.set(link.line, arr);
      }
      const lines = source.lines.map((line) => {
        const links = [...(byLine.get(line.number) ?? [])].sort((a, b) => a.startColumn - b.startColumn);
        let cursor = 1;
        let html = "";
        for (const link of links) {
          html += esc(line.text.slice(cursor - 1, link.startColumn - 1));
          html += \`<a class="rta-link" href="#\${encodeURIComponent(link.targetId)}" title="\${esc(link.targetId)}">\${esc(line.text.slice(link.startColumn - 1, link.endColumn - 1))}</a>\`;
          cursor = link.endColumn;
        }
        html += esc(line.text.slice(cursor - 1));
        return \`<div class="line"><span class="ln">\${line.number}</span> \${html}</div>\`;
      }).join("");
      return \`<h3>Source</h3><div class="path">\${esc(source.path)}</div><pre><code>\${lines}</code></pre>\`;
    };
    const showNode = async (id) => {
      selectedId = id;
      renderList();
      const node = catalog.nodes.find((n) => n.id === id);
      if (!node) return;
      const sourceKind = node.metadata?.kind && node.metadata.kind !== node.kind
        ? \`<p><strong>Source kind:</strong> \${esc(node.metadata.kind)}</p>\`
        : "";
      const articleSections = node.kind === "concept" && Array.isArray(node.metadata?.sections)
        ? \`
          <div class="article">
            <h3>Article</h3>
            \${node.metadata.sections.map((section) => \`
              <div class="article-section">
                <h4>\${esc(section.title)}</h4>
                <p>\${esc(section.body)}</p>
              </div>
            \`).join("")}
          </div>
        \`
        : "";
      const sourceRefs = Array.isArray(node.metadata?.sourcePaths) && node.metadata.sourcePaths.length
        ? \`
          <h3>Related source</h3>
          <div class="source-refs">
            \${node.metadata.sourcePaths.map((path) => \`<span class="source-ref">\${esc(path)}</span>\`).join("")}
          </div>
        \`
        : "";
      detailEl.innerHTML = \`
        <div class="detail-kind">Catalog kind: \${esc(node.kind)}</div>
        <h2>\${esc(node.name)}</h2>
        <p>\${esc(node.description)}</p>
        <p class="path">\${esc(node.path)}</p>
        \${sourceKind}
        \${articleSections}
        \${sourceRefs}
        <h3>Inheritance</h3>
        <p><strong>Inherits:</strong> \${(node.inheritsFrom ?? []).map((x) => \`<a class="rta-link" href="#\${encodeURIComponent(x)}">\${esc(x)}</a>\`).join(", ") || "<span class='muted'>none</span>"}</p>
        <p><strong>Used by:</strong> \${(node.usedBy ?? []).map((x) => \`<a class="rta-link" href="#\${encodeURIComponent(x)}">\${esc(x)}</a>\`).join(", ") || "<span class='muted'>none</span>"}</p>
        <h3>Checks</h3>
        <pre><code>\${esc((node.checks ?? []).join("\\n") || "none")}</code></pre>
      \`;
      if (node.source?.path) detailEl.innerHTML += await renderSource(node.source.path);
    };
    nodesEl.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-id]");
      if (button) location.hash = encodeURIComponent(button.dataset.id);
      const entryButton = event.target.closest("button[data-entry-view]");
      if (entryButton) {
        viewMode = entryButton.dataset.entryView;
        localStorage.setItem("rta.catalog.viewMode", viewMode);
        selectedId = null;
        history.replaceState(null, "", location.pathname);
        renderList();
        showFirstInView();
      }
    });
    detailEl.addEventListener("click", (event) => {
      const entryButton = event.target.closest("button[data-entry-view]");
      if (!entryButton) return;
      viewMode = entryButton.dataset.entryView;
      localStorage.setItem("rta.catalog.viewMode", viewMode);
      selectedId = null;
      history.replaceState(null, "", location.pathname);
      renderList();
      showFirstInView();
    });
    document.querySelector(".view-menu").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-view]");
      if (!button) return;
      viewMode = button.dataset.view;
      localStorage.setItem("rta.catalog.viewMode", viewMode);
      selectedId = null;
      renderList();
      showFirstInView();
    });
    qEl.addEventListener("input", renderList);
    window.addEventListener("hashchange", () => showNode(decodeURIComponent(location.hash.slice(1))));
    const showFirstInView = () => {
      if (viewMode === "home") {
        renderHome();
        return;
      }
      const first = visibleGroups().flatMap((group) => group.nodes)[0];
      if (first) {
        showNode(first.id);
        return;
      }
      detailEl.innerHTML = \`
        <div class="detail-kind">\${esc(titleCase(viewMode))}</div>
        <h2>No entries yet</h2>
        <div class="empty-state">This catalog entry point exists, but the repo does not expose data for it yet.</div>
      \`;
    };
    fetch("/api/v1/catalog").then((r) => r.json()).then((data) => {
      catalog = data;
      renderList();
      const initial = decodeURIComponent(location.hash.slice(1)) || catalog.nodes.find((n) => n.id === "concept.rta-heart")?.id || catalog.nodes[0]?.id;
      if (location.hash && initial) showNode(initial);
      else showFirstInView();
    });
  </script>
</body>
</html>`

