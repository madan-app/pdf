renderToolHeader("pdf-to-jpg");

let srcBytes = null;
let pdfJsDoc = null;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const thumbGrid = document.getElementById("thumbGrid");
const stage = document.getElementById("stage");
const sidePanel = document.getElementById("sidePanel");

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
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${pdfJsDoc.numPages} pages — click to replace</p>`;
  thumbGrid.innerHTML = "";
  for(let i=1;i<=pdfJsDoc.numPages;i++){
    const canvas = await renderPageToCanvas(pdfJsDoc, i, 180);
    const card = document.createElement("div");
    card.className = "thumb-card";
    card.innerHTML = `<div class="thumb-idx">${i}</div>`;
    card.appendChild(canvas);
    thumbGrid.appendChild(card);
  }
}

['fmtSeg','resSeg'].forEach(id=>{
  document.getElementById(id).addEventListener("click", e=>{
    const btn = e.target.closest("button"); if(!btn) return;
    [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.getElementById("convertBtn").addEventListener("click", async ()=>{
  if(!pdfJsDoc){ toast("Upload a PDF first"); return; }
  const fmt = document.querySelector("#fmtSeg .active").dataset.v;
  const scale = +document.querySelector("#resSeg .active").dataset.v;
  const ext = fmt === "jpeg" ? "jpg" : "png";

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"render",label:"Rendering pages"},{key:"zip",label:"Packaging ZIP"}]);
  ui.set("render","active");

  const zip = new JSZip();
  for(let i=1;i<=pdfJsDoc.numPages;i++){
    const page = await pdfJsDoc.getPage(i);
    const viewport = page.getViewport({scale});
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({canvasContext: canvas.getContext("2d"), viewport}).promise;
    const dataUrl = canvas.toDataURL(`image/${fmt}`, 0.92);
    const base64 = dataUrl.split(",")[1];
    zip.file(`page-${String(i).padStart(2,"0")}.${ext}`, base64, {base64:true});
    ui.progress((i/pdfJsDoc.numPages)*85);
  }
  ui.set("render","done"); ui.set("zip","active");
  const blob = await zip.generateAsync({type:"blob"});
  ui.progress(100); ui.set("zip","done");

  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>${pdfJsDoc.numPages} image(s) ready</h3>
      <p>Packaged as a ZIP file</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download ZIP</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "pdf-images.zip"));
});
