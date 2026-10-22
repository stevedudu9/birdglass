const fs = require('node:fs');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const [inputFile, outputFile] = process.argv.slice(2);
const records = [];
let headerText = '', header, started = false, finished = false;
let inside = false, quoted = false, escaped = false, depth = 0, parts = [];
let decodedBytes = 0;

function inspect(record) {
  assert.equal(record.state, 'preview');
  const { input, layout, preview, imageAsset } = record.handoff;
  assert.equal(input.widthMm, 5000); assert.equal(input.heightMm, 5000);
  assert.equal(layout.dotCount, 10000); assert.equal(layout.dotsMm.length, 10000);
  assert.equal(layout.rows, 100); assert.equal(layout.columns, 100);
  assert.equal(layout.dotDiameterMm, 10);
  assert.equal(layout.actualCenterPitchXmm, 50); assert.equal(layout.actualCenterPitchYmm, 50);
  assert.equal(input.windowId, layout.windowId); assert.equal(input.windowId, preview.windowId);
  assert.equal(input.dimensionRevision, layout.dimensionRevision);
  assert.equal(input.photoRevision, preview.photoRevision);
  assert.equal(layout.layoutVersion, preview.layoutVersion);
  assert.equal(preview.projectedDots.length, 10000);
  const ids = new Set();
  for (let i = 0; i < layout.dotsMm.length; i++) {
    const dot = layout.dotsMm[i], projected = preview.projectedDots[i];
    assert.equal(dot.xMm, 25 + (i % 100) * 50);
    assert.equal(dot.yMm, 25 + Math.floor(i / 100) * 50);
    ids.add(dot.id); assert.equal(projected.dotId, dot.id);
    assert.equal(projected.outlineNorm.length, 48);
    for (const point of [projected.centerNorm, ...projected.outlineNorm])
      assert.ok(Number.isFinite(point.u) && Number.isFinite(point.v));
  }
  assert.equal(ids.size, 10000);
  assert.match(imageAsset.dataUrl, /^data:image\/(png|jpeg);base64,/);
  const entry = header.buildingPlan.entries.find(entry => entry.windowId === input.windowId);
  assert.ok(entry); assert.equal(entry.layoutVersion, layout.layoutVersion);
  delete record.handoff.exportedAt;
  const recordHash = crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
  records.push({ label: input.label, windowId: input.windowId, layoutVersion: layout.layoutVersion, recordHash, dotCount: layout.dotCount,
    physicalCoordinatesChecked: true, projectedVerticesChecked: 480000, revisionAndPlanIdsMatch: true });
}

async function main() {
  const compressed = /\.gz$/i.test(inputFile);
  const input = compressed ? fs.createReadStream(inputFile).pipe(zlib.createGunzip()) : fs.createReadStream(inputFile);
  input.setEncoding('utf8');
  for await (let chunk of input) {
    decodedBytes += Buffer.byteLength(chunk, 'utf8');
    if (!started) {
      headerText += chunk;
      const marker = ',"windows":[';
      const position = headerText.indexOf(marker);
      if (position < 0) continue;
      header = JSON.parse(headerText.slice(0, position) + '}');
      assert.equal(header.schemaVersion, '0.1');
      assert.equal(header.buildingPlan.entries.length, 8);
      chunk = headerText.slice(position + marker.length);
      headerText = ''; started = true;
    }
    let partStart = inside ? 0 : -1;
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      if (!inside) {
        if (finished) { assert.ok(/\s|}/.test(char)); continue; }
        if (/\s|,/.test(char)) continue;
        if (char === ']') { finished = true; continue; }
        assert.equal(char, '{'); inside = true; depth = 1; partStart = i; continue;
      }
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') {
        depth--;
        if (depth === 0) {
          parts.push(chunk.slice(partStart, i + 1));
          inspect(JSON.parse(parts.join('')));
          parts = []; inside = false; partStart = -1;
        }
      }
    }
    if (inside) parts.push(chunk.slice(partStart));
  }
  assert.ok(started && finished && !inside);
  assert.equal(records.length, 8);
  assert.equal(new Set(records.map(record => record.windowId)).size, 8);
  delete header.exportedAt;
  const result = { passed: true, projectBytes: decodedBytes, downloadBytes: fs.statSync(inputFile).size,
    headerHash: crypto.createHash('sha256').update(JSON.stringify(header)).digest('hex'), windows: 8,
    totalDots: 80000, totalProjectedVerticesChecked: 3840000, records,
    note: 'Actual browser download from an isolated eight-pane illustrated project. Inspected one window record at a time. Desktop hardware; phone-width layout is not a real-phone performance test.' };
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ passed: true, bytes: result.projectBytes, windows: 8, totalDots: 80000, verticesChecked: 3840000 }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
