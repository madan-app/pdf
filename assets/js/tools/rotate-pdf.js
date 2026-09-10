renderToolHeader("rotate-pdf");

let srcBytes = null;
let pageCount = 0;
let rotations = {};   // idx -> degrees (0/90/180/270)
let selected = new Set();
let scope = "all";
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
  pageCount = pdfJsDoc.numPages;
  rotations = {}; selected = new Set([...Array(pageCount).keys()]);
  for(let i=0;i<pageCount;i++) rotations[i]=0;
  sidePanel.style.display = "block";
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${pageCount} pages — click to replace</p>`;
  await renderThumbs();
}

async function renderThumbs(){
  thumbGrid.innerHTML = "";
  for(let i=0;i<pageCount;i++){
    const canvas = await renderPageToCanvas(pdfJsDoc, i+1, 170);
    canvas.style.transform = `rotate(${rotations[i]}deg)`;
    canvas.style.transition = "transform .2s";
    const card = document.createElement("div");
    card.className = "thumb-card";
    card.dataset.id = String(i);
    if(scope==="selected" && !selected.has(i)) card.style.opacity = ".45";
    card.innerHTML = `<div class="thumb-idx">${i+1}</div><div class="check ${selected.has(i)&&scope==="selected"?"checked":""}" data-idx="${i}">${scope==="selected"?(selected.has(i)?"✓":""):""}</div>`;
    const wrap = document.createElement("div");
    wrap.style.cssText = "aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f4f4f8";
    wrap.appendChild(canvas);
    card.appendChild(wrap);
    thumbGrid.appendChild(card);
  }
  if(scope==="selected"){
    thumbGrid.querySelectorAll(".check").forEach(chk=>{
      chk.addEventListener("click", e=>{
        const idx = +e.currentTarget.dataset.idx;
        if(selected.has(idx)) selected.delete(idx); else selected.add(idx);
        renderThumbs();
      });
    });
  }
}

document.getElementById("scopeSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  scope = btn.dataset.v;
  if(scope==="all") selected = new Set([...Array(pageCount).keys()]);
  renderThumbs();
});

function rotate(delta){
  const targets = scope==="all" ? [...Array(pageCount).keys()] : [...selected];
  targets.forEach(i=>{ rotations[i] = ((rotations[i]+delta)%360+360)%360; });
  renderThumbs();
}
document.getElementById("rotL").addEventListener("click", ()=>rotate(-90));
document.getElementById("rotR").addEventListener("click", ()=>rotate(90));

document.getElementById("saveBtn").addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"rotate",label:"Applying rotation"},{key:"finalize",label:"Finalizing"}]);
  ui.set("rotate","active");

  const { PDFDocument, degrees } = PDFLib;
  const doc = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const pages = doc.getPages();
  pages.forEach((p,i)=>{
    const delta = rotations[i]||0;
    if(delta){
      const current = p.getRotation().angle;
      p.setRotation(degrees(current + delta));
    }
  });
  ui.progress(70); ui.set("rotate","done"); ui.set("finalize","active");
  const bytes = await doc.save();
  ui.progress(100); ui.set("finalize","done");

  const blob = new Blob([bytes], {type:"application/pdf"});
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Rotation applied</h3>
      <p>${pages.length} pages processed</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "rotated.pdf"));
});
