renderToolHeader("compress-image");

let srcImg = null, srcFile = null;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const sidePanel = document.getElementById("sidePanel");
const previewStage = document.getElementById("previewStage");
const previewImg = document.getElementById("previewImg");
const sizeCaption = document.getElementById("sizeCaption");
const stage = document.getElementById("stage");
const qInput = document.getElementById("qInput");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file || !file.type.startsWith("image/")) return;
  srcFile = file;
  const dataUrl = await fileToDataURL(file);
  srcImg = await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.src=dataUrl; });
  sidePanel.style.display = "block";
  previewStage.style.display = "flex";
  previewImg.src = dataUrl;
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${srcImg.width}×${srcImg.height} — click to replace</p>`;
  sizeCaption.textContent = `Original: ${bytesToSize(file.size)}`;
}

qInput.addEventListener("input", ()=>{ document.getElementById("qVal").textContent = qInput.value; });
document.getElementById("fmtSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
});

document.getElementById("compressBtn").addEventListener("click", async ()=>{
  if(!srcImg){ toast("Upload an image first"); return; }
  const quality = (+qInput.value)/100;
  const fmt = document.querySelector("#fmtSeg .active").dataset.v;

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"compress",label:"Compressing image"},{key:"finalize",label:"Finalizing"}]);
  ui.set("compress","active");

  const canvas = document.createElement("canvas");
  canvas.width = srcImg.width; canvas.height = srcImg.height;
  canvas.getContext("2d").drawImage(srcImg,0,0);
  ui.progress(50);
  const mime = fmt === "webp" ? "image/webp" : "image/jpeg";
  const blob = await new Promise(res=>canvas.toBlob(res, mime, quality));
  ui.progress(100); ui.set("compress","done"); ui.set("finalize","done");

  const savedPct = Math.max(0, Math.round((1-blob.size/srcFile.size)*100));
  const ext = fmt === "webp" ? "webp" : "jpg";
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Compressed successfully</h3>
      <p>${bytesToSize(srcFile.size)} → ${bytesToSize(blob.size)} ${savedPct>0?`(${savedPct}% smaller)`:""}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download Image</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `compressed.${ext}`));
});
