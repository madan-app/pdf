renderToolHeader("crop-pdf");

let srcBytes = null;
let pdfJsDoc = null;
let scope = "all";
const margins = { top:0, bottom:0, left:0, right:0 };

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const stage = document.getElementById("stage");
const sidePanel = document.getElementById("sidePanel");
const previewWrap = document.getElementById("previewWrap");
const previewCanvas = document.getElementById("previewCanvas");
const cropOverlay = document.getElementById("cropOverlay");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  srcBytes = new Uint8Array(await fileToArrayBuffer(file));
  pdfJsDoc = await loadPdfJsDoc(srcBytes.slice());
  sidePanel.style.display = "block";
  previewWrap.style.display = "flex";
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${pdfJsDoc.numPages} pages — click to replace</p>`;
  await drawPreview();
}

async function drawPreview(){
  const page = await pdfJsDoc.getPage(1);
  const viewport = page.getViewport({scale: Math.min(1.6, 560/page.getViewport({scale:1}).width)});
  previewCanvas.width = viewport.width; previewCanvas.height = viewport.height;
  const ctx = previewCanvas.getContext("2d");
  await page.render({canvasContext: ctx, viewport}).promise;
  updateOverlay();
}

function updateOverlay(){
  const w = previewCanvas.clientWidth || previewCanvas.width;
  const h = previewCanvas.clientHeight || previewCanvas.height;
  cropOverlay.style.left = (margins.left/100*w) + "px";
  cropOverlay.style.right = (margins.right/100*w) + "px";
  cropOverlay.style.top = (margins.top/100*h) + "px";
  cropOverlay.style.bottom = (margins.bottom/100*h) + "px";
}

[["cropTop","top"],["cropBottom","bottom"],["cropLeft","left"],["cropRight","right"]].forEach(([id,key])=>{
  document.getElementById(id).addEventListener("input", e=>{
    margins[key] = +e.target.value;
    document.getElementById(key+"Val").textContent = e.target.value;
    updateOverlay();
  });
});

document.getElementById("scopeSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  scope = btn.dataset.v;
});

document.getElementById("applyBtn").addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"crop",label:"Applying crop box"},{key:"finalize",label:"Finalizing"}]);
  ui.set("crop","active");

  const { PDFDocument } = PDFLib;
  const doc = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const pages = doc.getPages();
  pages.forEach((page, i)=>{
    if(scope === "first" && i !== 0) return;
    const { width, height } = page.getSize();
    const l = width*(margins.left/100), r = width*(margins.right/100);
    const t = height*(margins.top/100), b = height*(margins.bottom/100);
    page.setCropBox(l, b, Math.max(10,width-l-r), Math.max(10,height-t-b));
    ui.progress(((i+1)/pages.length)*80);
  });

  ui.set("crop","done"); ui.set("finalize","active");
  const bytes = await doc.save();
  ui.progress(100); ui.set("finalize","done");

  const blob = new Blob([bytes], {type:"application/pdf"});
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Crop applied</h3>
      <p>${scope==="all" ? "All pages cropped" : "First page cropped"}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "cropped.pdf"));
});

window.addEventListener("resize", updateOverlay);
