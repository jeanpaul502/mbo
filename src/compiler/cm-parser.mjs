function parseProperties(body) {
  const properties = {};
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*"([^"]*)"\s*;$/);
    if (match?.[1] && match[2] !== undefined) {
      properties[match[1]] = match[2];
    }
  }
  return properties;
}

export function parseCmSource(source) {
  const match = source.match(/^(page|layout|component)\s+([A-Za-z0-9_-]+)\s*\{([\s\S]*)\}\s*$/m);
  if (!match) {
    throw new Error("Invalid .cm source. Expected a page, layout or component declaration.");
  }

  return {
    kind: match[1],
    name: match[2],
    properties: parseProperties(match[3] ?? "")
  };
}
