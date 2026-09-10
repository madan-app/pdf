renderToolHeader("compress-pdf");

let srcFile = null, srcBytes = null;
let level = "medium";

const LEVELS = {
  high:   { scale: 2.0, quality: 0.85 },
  medium: { scale: 1.4, quality: 0.68 },
  low:    { scale: 1.0, quality: 0.45 },
};

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const stage = document.getElementById("stage");
const sidePanel = document.getElementById("sidePanel");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  srcFile = file;
  srcBytes = new Uint8Array(await fileToArrayBuffer(file));
  sidePanel.style.display = "block";
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${bytesToSize(file.size)} — click to replace</p>`;
}

document.getElementById("levelSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  level = btn.dataset.v;
});

document.getElementById("compressBtn").addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF first"); return; }
  const cfg = LEVELS[level];

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [
    {key:"read", label:"Reading PDF"},
    {key:"render", label:"Re-encoding pages"},
    {key:"build", label:"Rebuilding PDF"},
    {key:"finalize", label:"Finalizing"},
  ]);
  ui.set("read","active");

  const pdfJsDoc = await loadPdfJsDoc(srcBytes.slice());
  const pageCount = pdfJsDoc.numPages;
  ui.set("read","done"); ui.set("render","active");

  const { PDFDocument } = PDFLib;
  const outDoc = await PDFDocument.create();

  for(let i=1;i<=pageCount;i++){
    const page = await pdfJsDoc.getPage(i);
    const baseVp = page.getViewport({scale:1});
    const targetWidth = baseVp.width * cfg.scale;
    const scale = targetWidth / baseVp.width * cfg.scale / cfg.scale; // keep explicit
    const viewport = page.getViewport({scale: cfg.scale});
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await page.render({canvasContext: ctx, viewport}).promise;
    const jpegDataUrl = canvas.toDataURL("image/jpeg", cfg.quality);
    const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(",")[1]), c=>c.charCodeAt(0));
    const img = await outDoc.embedJpg(jpegBytes);
    const pageWidthPt = baseVp.width * 0.75; // px(96dpi)->pt approx already 1:1 from pdfjs; keep original size
    const origSize = page.getViewport({scale:1});
    const newPage = outDoc.addPage([origSize.width, origSize.height]);
    newPage.drawImage(img, {x:0, y:0, width: origSize.width, height: origSize.height});
    ui.progress(10 + (i/pageCount)*60);
  }

  ui.set("render","done"); ui.set("build","active");
  const outBytes = await outDoc.save();
  ui.progress(95);
  ui.set("build","done"); ui.set("finalize","done");
  ui.progress(100);

  const blob = new Blob([outBytes], {type:"application/pdf"});
  const savedPct = Math.max(0, Math.round((1 - blob.size/srcFile.size)*100));
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Compressed successfully</h3>
      <p>${bytesToSize(srcFile.size)} → ${bytesToSize(blob.size)} ${savedPct>0 ? `(${savedPct}% smaller)` : ""}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "compressed.pdf"));
});
