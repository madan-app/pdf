renderToolHeader("convert-image");

let srcImg = null, srcFile = null;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const sidePanel = document.getElementById("sidePanel");
const previewStage = document.getElementById("previewStage");
const previewImg = document.getElementById("previewImg");
const stage = document.getElementById("stage");
const qInput = document.getElementById("qInput");
let targetFmt = "jpeg", bg = "#ffffff";

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
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${file.type} • ${bytesToSize(file.size)} — click to replace</p>`;
}

document.getElementById("fmtSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  targetFmt = btn.dataset.v;
  document.getElementById("qField").style.display = targetFmt==="png" ? "none" : "block";
  document.getElementById("bgField").style.display = targetFmt==="jpeg" ? "block" : "none";
});
qInput.addEventListener("input", ()=>{ document.getElementById("qVal").textContent = qInput.value; });
document.getElementById("bgSwatches").addEventListener("click", e=>{
  const sw = e.target.closest(".swatch"); if(!sw) return;
  document.querySelectorAll("#bgSwatches .swatch").forEach(s=>s.classList.remove("active"));
  sw.classList.add("active");
  bg = sw.dataset.v;
});

document.getElementById("convertBtn").addEventListener("click", async ()=>{
  if(!srcImg){ toast("Upload an image first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"convert",label:"Converting image"},{key:"finalize",label:"Finalizing"}]);
  ui.set("convert","active");

  const canvas = document.createElement("canvas");
  canvas.width = srcImg.width; canvas.height = srcImg.height;
  const ctx = canvas.getContext("2d");
  if(targetFmt === "jpeg"){ ctx.fillStyle = bg; ctx.fillRect(0,0,canvas.width,canvas.height); }
  ctx.drawImage(srcImg,0,0);
  ui.progress(55);

  const mimeMap = { jpeg:"image/jpeg", png:"image/png", webp:"image/webp" };
  const quality = (+qInput.value)/100;
  const blob = await new Promise(res=>canvas.toBlob(res, mimeMap[targetFmt], targetFmt==="png"?undefined:quality));
  ui.progress(100); ui.set("convert","done"); ui.set("finalize","done");

  const ext = targetFmt === "jpeg" ? "jpg" : targetFmt;
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Converted to ${ext.toUpperCase()}</h3>
      <p>${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download Image</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `converted.${ext}`));
});
