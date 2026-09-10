/* ============================================
   PDFKit — shared runtime
   All processing below runs 100% in the browser.
   No file is ever uploaded to a server.
   ============================================ */

// ---- Path helper: works whether page is at /index.html or /tools/xxx.html
const ROOT = location.pathname.includes("/tools/") ? "../" : "./";

// ---- Tool registry (single source of truth for homepage + nav + breadcrumbs)
const TOOLS = [
  // PDF organize
  { id:"merge-pdf", cat:"pdf", icon:"🔗", name:"Merge PDF", desc:"Combine multiple PDFs into one file", popular:true },
  { id:"split-pdf", cat:"pdf", icon:"✂️", name:"Split PDF", desc:"Split a PDF into separate files", popular:true },
  { id:"remove-pages", cat:"pdf", icon:"🗑️", name:"Remove Pages", desc:"Delete pages from a PDF" },
  { id:"extract-pages", cat:"pdf", icon:"📤", name:"Extract Pages", desc:"Pull selected pages into a new PDF" },
  { id:"reorder-pages", cat:"pdf", icon:"🔀", name:"Reorder Pages", desc:"Drag & drop to reorganize pages" },
  { id:"scan-to-pdf", cat:"pdf", icon:"📸", name:"Scan to PDF", desc:"Use your camera to scan documents" },
  { id:"compress-pdf", cat:"pdf", icon:"🗜️", name:"Compress PDF", desc:"Reduce PDF file size", popular:true },
  // Convert to PDF
  { id:"jpg-to-pdf", cat:"pdf", icon:"🖼️", name:"JPG to PDF", desc:"Convert images into a PDF", popular:true },
  { id:"word-to-pdf", cat:"pdf", icon:"📝", name:"Word to PDF", desc:"Convert DOCX documents to PDF" },
  { id:"ppt-to-pdf", cat:"pdf", icon:"📊", name:"PowerPoint to PDF", desc:"Convert slides to PDF", soon:true },
  { id:"excel-to-pdf", cat:"pdf", icon:"📈", name:"Excel to PDF", desc:"Convert spreadsheets to PDF" },
  { id:"html-to-pdf", cat:"pdf", icon:"🌐", name:"HTML to PDF", desc:"Convert a web page to PDF" },
  // Convert from PDF
  { id:"pdf-to-jpg", cat:"pdf", icon:"🖨️", name:"PDF to JPG", desc:"Turn PDF pages into images", popular:true },
  { id:"pdf-to-word", cat:"pdf", icon:"📃", name:"PDF to Word", desc:"Convert a PDF into an editable document", soon:true },
  // Edit
  { id:"rotate-pdf", cat:"pdf", icon:"🔄", name:"Rotate PDF", desc:"Rotate one or all pages" },
  { id:"add-page-numbers", cat:"pdf", icon:"🔢", name:"Add Page Numbers", desc:"Insert page numbers" },
  { id:"add-watermark", cat:"pdf", icon:"💧", name:"Add Watermark", desc:"Stamp text over your PDF" },
  { id:"crop-pdf", cat:"pdf", icon:"📐", name:"Crop PDF", desc:"Trim page margins" },
  { id:"pdf-forms", cat:"pdf", icon:"🧾", name:"PDF Forms", desc:"Fill and flatten form fields" },
  // Security
  { id:"unlock-pdf", cat:"pdf", icon:"🔓", name:"Unlock PDF", desc:"Remove a known PDF password", soon:true },
  { id:"protect-pdf", cat:"pdf", icon:"🔒", name:"Protect PDF", desc:"Add a password to a PDF", soon:true },
  // Image tools
  { id:"collage-maker", cat:"img", icon:"🧩", name:"Collage Maker", desc:"Arrange photos into a printable collage", popular:true, badge:"NEW" },
  { id:"resize-image", cat:"img", icon:"📏", name:"Resize Image", desc:"Change image dimensions" },
  { id:"compress-image", cat:"img", icon:"🗜️", name:"Compress Image", desc:"Shrink image file size", popular:true },
  { id:"convert-image", cat:"img", icon:"♻️", name:"Convert Image", desc:"JPG ⇄ PNG ⇄ WebP" },
];

function toolById(id){ return TOOLS.find(t=>t.id===id); }

// ---- Header / Footer injection --------------------------------------
function renderHeader(){
  const el = document.getElementById("site-header");
  if(!el) return;
  el.innerHTML = `
  <div class="container">
    <a href="${ROOT}index.html" class="brand"><span class="logo-mark">PK</span> PDFKit</a>
    <nav class="nav-links">
      <a href="${ROOT}index.html#pdf-tools">PDF Tools</a>
      <a href="${ROOT}index.html#image-tools">Image Tools</a>
      <a href="${ROOT}index.html#popular">Popular</a>
      <a href="${ROOT}index.html#about">About</a>
    </nav>
    <a href="${ROOT}index.html#pdf-tools" class="nav-cta">All Tools</a>
    <button class="mobile-menu-btn" id="mobileMenuBtn">☰</button>
  </div>`;
}

function renderFooter(){
  const el = document.getElementById("site-footer");
  if(!el) return;
  el.innerHTML = `
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <h4>PDFKit</h4>
        <p style="font-size:14px;color:var(--text-dim);max-width:280px;margin:0 0 14px">
          A fast, private toolkit for working with PDFs and images — entirely in your browser.
        </p>
        <div class="footer-privacy">🔒 Your files never leave your device.</div>
      </div>
      <div class="footer-col">
        <h4>PDF Tools</h4>
        <a href="${ROOT}tools/merge-pdf.html">Merge PDF</a>
        <a href="${ROOT}tools/split-pdf.html">Split PDF</a>
        <a href="${ROOT}tools/compress-pdf.html">Compress PDF</a>
        <a href="${ROOT}tools/jpg-to-pdf.html">JPG to PDF</a>
      </div>
      <div class="footer-col">
        <h4>Image Tools</h4>
        <a href="${ROOT}tools/collage-maker.html">Collage Maker</a>
        <a href="${ROOT}tools/resize-image.html">Resize Image</a>
        <a href="${ROOT}tools/compress-image.html">Compress Image</a>
        <a href="${ROOT}tools/convert-image.html">Convert Image</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} PDFKit. All processing happens locally in your browser.</span>
      <span>Made for speed &amp; privacy</span>
    </div>
  </div>`;
}

// ---- Ad slot injection (placeholder — swap for real AdSense in production) --
// See README.md for how to plug in a real ad network / publisher ID.
function renderAdSlots(){
  document.querySelectorAll("[data-ad]").forEach(node=>{
    const size = node.getAttribute("data-ad");
    node.classList.add("ad-slot");
    if(size === "leaderboard") node.classList.add("ad-leaderboard");
    if(size === "inline") node.classList.add("ad-inline");
    if(size === "sidebar") node.classList.add("ad-sidebar");
    node.innerHTML = `<span>Advertisement</span>`;
    // Real integration point:
    // <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-XXXXXXXXXXXX"
    //      data-ad-slot="XXXXXXXXXX" data-ad-format="auto"></ins>
    // (window.adsbygoogle = window.adsbygoogle || []).push({});
  });
}

// ---- Toast --------------------------------------------------------------
function toast(msg, ms=2600){
  let t = document.getElementById("appToast");
  if(!t){
    t = document.createElement("div");
    t.id = "appToast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove("show"), ms);
}

// ---- Generic file download helper ---------------------------------------
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}

function fileToArrayBuffer(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function bytesToSize(bytes){
  if(bytes === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB"];
  const i = Math.floor(Math.log(bytes)/Math.log(k));
  return `${(bytes/Math.pow(k,i)).toFixed(i===0?0:1)} ${sizes[i]}`;
}

function uid(){ return Math.random().toString(36).slice(2,10); }

// ---- Simple staged "processing" UI (used across tools) -------------------
// steps: [{key,label}]  — call driver.start(), driver.set(key,'active'|'done'), driver.progress(pct)
function createProcessingUI(container, steps){
  container.innerHTML = `
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-bar" id="pbar" style="width:0%"></div></div>
      <div class="progress-steps" id="psteps">
        ${steps.map(s=>`<div class="pstep" data-key="${s.key}"><span class="dot">•</span> ${s.label}</div>`).join("")}
      </div>
    </div>`;
  const bar = container.querySelector("#pbar");
  return {
    progress(pct){ bar.style.width = Math.min(100,Math.max(0,pct)) + "%"; },
    set(key, state){
      const row = container.querySelector(`.pstep[data-key="${key}"]`);
      if(!row) return;
      row.classList.remove("active","done");
      if(state) row.classList.add(state);
      row.querySelector(".dot").textContent = state==="done" ? "✓" : "•";
    }
  };
}

// ---- Drag & drop reorder helper for list/grid items -----------------------
function enableDragReorder(container, itemSelector, onReorder){
  let dragEl = null;
  container.addEventListener("dragstart", e=>{
    const item = e.target.closest(itemSelector);
    if(!item) return;
    dragEl = item;
    item.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  container.addEventListener("dragend", e=>{
    const item = e.target.closest(itemSelector);
    if(item) item.classList.remove("dragging");
    if(dragEl){
      const ids = [...container.querySelectorAll(itemSelector)].map(n=>n.dataset.id);
      onReorder(ids);
    }
    dragEl = null;
  });
  container.addEventListener("dragover", e=>{
    e.preventDefault();
    const after = getDragAfterElement(container, itemSelector, e.clientY, e.clientX);
    if(!dragEl) return;
    if(after == null){ container.appendChild(dragEl); }
    else { container.insertBefore(dragEl, after); }
  });
}
function getDragAfterElement(container, sel, y, x){
  const els = [...container.querySelectorAll(`${sel}:not(.dragging)`)];
  let closest = {offset:-Infinity, el:null};
  for(const el of els){
    const box = el.getBoundingClientRect();
    const isGrid = box.width < container.clientWidth * 0.9;
    const offset = isGrid
      ? (y - box.top - box.height/2) + (x - box.left - box.width/2) * 0.001
      : y - box.top - box.height/2;
    if(offset < 0 && offset > closest.offset) closest = {offset, el};
  }
  return closest.el;
}

// ---- Tool page header (breadcrumb + title) --------------------------------
function renderToolHeader(toolId, subtitleOverride){
  const t = toolById(toolId);
  const el = document.getElementById("toolHeader");
  if(!el || !t) return;
  document.title = `${t.name} — PDFKit`;
  el.innerHTML = `
    <div class="container">
      <div class="breadcrumb"><a href="${ROOT}index.html">Home</a> / ${t.cat==="pdf"?"PDF Tools":"Image Tools"} / ${t.name}</div>
      <h1>${t.icon} ${t.name}</h1>
      <p>${subtitleOverride || t.desc}</p>
    </div>`;
}

// ---- pdf.js thumbnail helpers (used by split/remove/extract/reorder/rotate/pdf-to-jpg) --
async function loadPdfJsDoc(bytes){
  if(typeof pdfjsLib !== "undefined"){
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  return pdfjsLib.getDocument({data: bytes}).promise;
}

async function renderPageToCanvas(pdfDoc, pageNum, targetWidth=220){
  const page = await pdfDoc.getPage(pageNum);
  const baseViewport = page.getViewport({scale:1});
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({scale});
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({canvasContext: ctx, viewport}).promise;
  return canvas;
}

// ---- Shared: render a DOM node to a paginated PDF blob (word/excel/html tools) --
async function nodeToPdfBlob(node, {pageSize="a4", orientation="portrait"}={}, onProgress){
  const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: orientation==="landscape"?"l":"p", unit:"pt", format:pageSize });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = canvas.height * (imgW/canvas.width);
  const pxPerPt = canvas.width / imgW;

  let heightLeft = imgH, position = 0, first = true;
  const pageCanvas = document.createElement("canvas");
  const ctx = pageCanvas.getContext("2d");

  while(heightLeft > 0){
    if(!first) pdf.addPage(pageSize, orientation==="landscape"?"l":"p");
    first = false;
    const sliceHeightPt = Math.min(pageH, heightLeft);
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.max(1, sliceHeightPt * pxPerPt);
    ctx.clearRect(0,0,pageCanvas.width,pageCanvas.height);
    ctx.drawImage(canvas, 0, position*pxPerPt, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imgW, sliceHeightPt);
    heightLeft -= pageH;
    position += pageH;
    if(onProgress) onProgress(Math.min(95, (1-heightLeft/imgH)*95));
  }
  return pdf.output("blob");
}

// ---- Boot --------------------------------------------------------------
document.addEventListener("DOMContentLoaded", ()=>{
  renderHeader();
  renderFooter();
  renderAdSlots();
});
