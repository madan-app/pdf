# PDFKit — PDF & Image Toolkit

A SaaS-style, fully client-side PDF and image toolkit. **All processing happens in the visitor's browser** — files are read with the File API and never uploaded to a server, so "Your files never leave your device" is literally true here (there is no backend at all).

Open `index.html` in a browser to try it, or deploy the whole folder to any static host (Netlify, Vercel, GitHub Pages, S3, nginx, etc.) — no build step required.

## How it's built

- Plain HTML / CSS / vanilla JS — no framework, no bundler.
- `assets/css/style.css` — the whole design system (colors, cards, panels, buttons, responsive rules).
- `assets/js/common.js` — shared header/footer rendering, the tool registry (`TOOLS` array — add a tool here and it shows up on the homepage automatically), drag-and-drop reorder helper, toast notifications, processing-step UI, and PDF/image helper functions.
- `assets/js/tools/*.js` — one file per tool, loaded only on that tool's page.
- `tools/*.html` — one page per tool. Each includes only the CDN libraries it actually needs.
- Everything is processed with these CDN libraries (loaded at runtime, in the visitor's browser):
  - **pdf-lib** — creating/editing PDFs (merge, split, rotate, watermark, page numbers, crop, forms)
  - **pdf.js** — rendering PDF pages to canvas (thumbnails, PDF→JPG, compress)
  - **jsPDF** — building PDFs from images (JPG→PDF, Collage Maker, Scan to PDF, HTML/Word/Excel→PDF)
  - **html2canvas** — rasterizing HTML/DOCX/XLSX content before turning it into a PDF
  - **mammoth.js** — DOCX → HTML for the Word to PDF tool
  - **SheetJS (xlsx)** — reading spreadsheets for the Excel to PDF tool
  - **JSZip** — packaging multi-file results (Split PDF, PDF→JPG, Collage Maker multi-page image export)

## What's fully working

**PDF:** Merge, Split (every page / fixed size / custom ranges), Remove Pages, Extract Pages, Reorder Pages, Rotate, Add Page Numbers, Add Watermark, Compress (re-encodes pages as images at 3 quality presets), Crop, Scan to PDF (camera capture or photo upload → PDF), PDF Forms (fill + flatten AcroForm fields), JPG/Image → PDF (full settings: quality, page size, orientation, margins, compression toggle), PDF → JPG/PNG (ZIP export), HTML → PDF, Word (.docx) → PDF, Excel (.xlsx/.csv) → PDF.

**Image:** Collage Maker (multi-image upload, drag reorder, page size/orientation, preset or custom grid, spacing/margins, cover/contain fit, rounded corners, background color, borders, filename captions, export as PDF/JPEG/PNG with ZIP for multi-page), Resize Image, Compress Image, Convert Image (JPG/PNG/WebP).

## What's marked "Coming soon" (and why)

These are shown in the UI with an honest explanation rather than a broken/fake implementation:

- **PowerPoint → PDF** — faithfully rendering slide layouts client-side needs a real slide-rendering engine, not just a zip-and-guess parser.
- **PDF → Word** — reconstructing an accurately-formatted, editable `.docx` from arbitrary PDFs is a genuinely hard, open problem.
- **Unlock PDF / Protect PDF** — real password protection/removal needs carefully tested cryptography; pdf-lib does not support this out of the box, and we didn't want to ship something that looks secure but isn't.

If you want to build these out, the natural next steps are: a WASM-based renderer (e.g. LibreOffice-in-WASM) for PPT, a layout-analysis + `docx` library approach for PDF→Word, and a proper PDF encryption library (e.g. server-side with `qpdf`/`pikepdf`, since true AES encryption is hard to do safely in pure client JS) for the security tools.

## Ads

Ad placeholders (`data-ad="leaderboard|inline|sidebar"`) are sprinkled through the homepage and tool sidebars — see `renderAdSlots()` in `common.js`. To go live with Google AdSense:

1. Replace `ca-pub-XXXXXXXXXXXXXXXX` in the `<script>` tag at the top of `index.html` (and any tool pages you want ads on) with your real publisher ID.
2. In `renderAdSlots()`, swap the placeholder `<span>Advertisement</span>` markup for a real `<ins class="adsbygoogle">` unit and push it to `adsbygoogle`, as commented inline in that function.

## The "processing" animation

`createProcessingUI()` in `common.js` renders the staged progress list (e.g. *Preparing images → Optimizing images → Creating PDF → Generating preview → Finalizing PDF*) used across every tool. Real work happens between the `ui.set(key, "active")` / `ui.set(key, "done")` calls — it's not fake; the steps map to actual stages of the real processing pipeline (only a couple of very fast tools add a short `sleep()` so a near-instant operation still reads as multi-step).

## Extending

To add a new tool:
1. Add an entry to the `TOOLS` array in `assets/js/common.js` (id, category, icon, name, description) — it will automatically appear on the homepage and in the footer nav.
2. Create `tools/your-tool.html` (copy a similar existing page as a starting point) and `assets/js/tools/your-tool.js`.
3. Call `renderToolHeader("your-tool")` at the top of your JS file to auto-fill the breadcrumb/title/description from the registry.

## Responsive design

The layout is a CSS grid (`.workspace`) that collapses the settings sidebar above the main content under 900px width, and the tool/card grids reflow with `auto-fill` — tested down to a 360px-wide phone viewport.

## Browser support

Anything reasonably modern (Chrome, Edge, Safari, Firefox — desktop and mobile). Camera capture (Scan to PDF) requires HTTPS or `localhost`, and camera/microphone-style permission prompts.
