renderToolHeader("resize-image");

let srcImg = null, srcFile = null, aspect = 1;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const sidePanel = document.getElementById("sidePanel");
const previewStage = document.getElementById("previewStage");
const previewCanvas = document.getElementById("previewCanvas");
const dimsCaption = document.getElementById("dimsCaption");
const stage = document.getElementById("stage");
const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
let mode = "pixels";

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
  aspect = srcImg.width/srcImg.height;
  widthInput.value = srcImg.width;
  heightInput.value = srcImg.height;
  sidePanel.style.display = "block";
  previewStage.style.display = "flex";
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${srcImg.width}×${srcImg.height} — click to replace</p>`;
  drawPreview();
}

document.getElementById("modeSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  mode = btn.dataset.v;
  document.getElementById("pxFields").style.display = mode==="pixels" ? "block" : "none";
  document.getElementById("pctField").style.display = mode==="percent" ? "block" : "none";
  drawPreview();
});

const lockAspect = document.getElementById("lockAspect");
widthInput.addEventListener("input", ()=>{
  if(lockAspect.checked && srcImg) heightInput.value = Math.round(widthInput.value/aspect);
  drawPreview();
});
heightInput.addEventListener("input", ()=>{
  if(lockAspect.checked && srcImg) widthInput.value = Math.round(heightInput.value*aspect);
  drawPreview();
});
const pctInput = document.getElementById("pctInput");
pctInput.addEventListener("input", ()=>{
  document.getElementById("pctVal").textContent = pctInput.value;
  drawPreview();
});

function targetDims(){
  if(!srcImg) return [0,0];
  if(mode === "percent"){
    const s = (+pctInput.value)/100;
    return [Math.max(1,Math.round(srcImg.width*s)), Math.max(1,Math.round(srcImg.height*s))];
  }
  return [Math.max(1,+widthInput.value||srcImg.width), Math.max(1,+heightInput.value||srcImg.height)];
}

function drawPreview(){
  if(!srcImg) return;
  const [w,h] = targetDims();
  previewCanvas.width = w; previewCanvas.height = h;
  previewCanvas.getContext("2d").drawImage(srcImg,0,0,w,h);
  dimsCaption.textContent = `${w} × ${h} px`;
}

document.getElementById("resizeBtn").addEventListener("click", async ()=>{
  if(!srcImg){ toast("Upload an image first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"resize",label:"Resizing image"},{key:"finalize",label:"Finalizing"}]);
  ui.set("resize","active");
  await new Promise(r=>setTimeout(r,150));
  drawPreview();
  ui.progress(60); ui.set("resize","done"); ui.set("finalize","active");

  const isPng = srcFile.type === "image/png";
  const blob = await new Promise(res=>previewCanvas.toBlob(res, isPng?"image/png":"image/jpeg", 0.92));
  ui.progress(100); ui.set("finalize","done");

  const [w,h] = targetDims();
  const ext = isPng ? "png" : "jpg";
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Resized to ${w}×${h}</h3>
      <p>${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download Image</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `resized.${ext}`));
});
