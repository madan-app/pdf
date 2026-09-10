renderToolHeader("jpg-to-pdf", "Turn one or more images into a single PDF, fully configurable.");

let images = []; // {id, file, img, dataUrl}
const settings = { quality:"high", pageSize:"a4", orientation:"portrait", margin:"none", compress:true, layout:"combine" };
const QUALITY_MAP = { high:0.92, medium:0.7, low:0.45 };
const MARGIN_MAP = { none:0, small:18, normal:42 };
const PAGE_PT = { a4:[595.28,841.89], letter:[612,792] };

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const actionsRow = document.getElementById("actionsRow");
const previewStage = document.getElementById("previewStage");
const previewCanvas = document.getElementById("previewCanvas");
const previewLoading = document.getElementById("previewLoading");
const previewCaption = document.getElementById("previewCaption");
const stage = document.getElementById("stage");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>addFiles(e.dataTransfer.files));
fileInput.addEventListener("change", e=>addFiles(e.target.files));

async function addFiles(list){
  for(const f of list){
    if(!f.type.startsWith("image/")) continue;
    const dataUrl = await fileToDataURL(f);
    const img = await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.src=dataUrl; });
    images.push({id:uid(), file:f, img, dataUrl});
  }
  fileInput.value = "";
  renderList();
  updatePreview();
}

function renderList(){
  const has = images.length > 0;
  actionsRow.style.display = has ? "flex" : "none";
  previewStage.style.display = has ? "flex" : "none";
  fileList.innerHTML = images.map((im,i)=>`
    <div class="file-row" draggable="true" data-id="${im.id}">
      <span class="grip">⠿</span>
      <img class="fthumb" src="${im.dataUrl}">
      <div class="finfo">
        <div class="fname">${i+1}. ${im.file.name}</div>
        <div class="fmeta">${im.img.width}×${im.img.height} • ${bytesToSize(im.file.size)}</div>
      </div>
      <button class="fdel" data-id="${im.id}">✕</button>
    </div>`).join("");

  fileList.querySelectorAll(".fdel").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      images = images.filter(im=>im.id !== btn.dataset.id);
      renderList(); updatePreview();
    });
  });
  enableDragReorder(fileList, ".file-row", ids=>{
    images = ids.map(id=>images.find(im=>im.id===id));
    updatePreview();
  });
}

function bindSeg(id, key){
  document.getElementById(id).addEventListener("click", e=>{
    const btn = e.target.closest("button"); if(!btn) return;
    [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    settings[key] = btn.dataset.v;
    updatePreview();
  });
}
bindSeg("qualitySeg","quality");
bindSeg("pageSizeSeg","pageSize");
bindSeg("orientationSeg","orientation");
bindSeg("marginSeg","margin");
bindSeg("layoutSeg","layout");
document.getElementById("compressToggle").addEventListener("change", e=>{
  settings.compress = e.target.checked; updatePreview();
});

function pageDimsFor(im){
  let [w,h] = settings.pageSize === "original" ? [im.img.width, im.img.height] : PAGE_PT[settings.pageSize];
  let orientation = settings.orientation;
  if(orientation === "auto") orientation = im.img.width > im.img.height ? "landscape" : "portrait";
  if(settings.pageSize !== "original" && orientation === "landscape" && w < h) [w,h] = [h,w];
  if(settings.pageSize !== "original" && orientation === "portrait" && w > h) [w,h] = [h,w];
  return [w,h];
}

function updatePreview(){
  if(!images.length){ return; }
  previewLoading.style.display = "none";
  previewCanvas.style.display = "block";
  const im = images[0];
  const [pw, ph] = pageDimsFor(im);
  const margin = MARGIN_MAP[settings.margin];
  const scale = 420/pw;
  previewCanvas.width = pw*scale; previewCanvas.height = ph*scale;
  const ctx = previewCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0,0,previewCanvas.width, previewCanvas.height);
  const availW = (pw - margin*2)*scale, availH = (ph - margin*2)*scale;
  const ratio = Math.min(availW/im.img.width, availH/im.img.height);
  const iw = im.img.width*ratio, ih = im.img.height*ratio;
  const x = margin*scale + (availW-iw)/2, y = margin*scale + (availH-ih)/2;
  ctx.drawImage(im.img, x, y, iw, ih);
  ctx.strokeStyle = "#e4e7f0"; ctx.strokeRect(0.5,0.5,previewCanvas.width-1,previewCanvas.height-1);
  previewCaption.textContent = `Page 1 of ${images.length} — ${settings.pageSize.toUpperCase()} • ${settings.orientation}`;
}

document.getElementById("createBtn").addEventListener("click", async ()=>{
  if(!images.length){ toast("Add at least one image"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [
    {key:"prep", label:"Preparing images"},
    {key:"optimize", label:"Optimizing images"},
    {key:"create", label:"Creating PDF"},
    {key:"preview", label:"Generating preview"},
    {key:"finalize", label:"Finalizing PDF"},
  ]);
  ui.set("prep","active"); ui.progress(5);
  await sleep(150);
  ui.set("prep","done"); ui.set("optimize","active");

  const quality = QUALITY_MAP[settings.quality];
  const margin = MARGIN_MAP[settings.margin];
  const { jsPDF } = window.jspdf;
  let doc = null;

  for(let i=0;i<images.length;i++){
    const im = images[i];
    let dataUrl = im.dataUrl;
    let fmt = "JPEG";
    if(settings.compress || im.file.type !== "image/png"){
      const c = document.createElement("canvas");
      c.width = im.img.width; c.height = im.img.height;
      c.getContext("2d").drawImage(im.img,0,0);
      dataUrl = c.toDataURL("image/jpeg", quality);
    } else {
      fmt = "PNG";
    }
    const [pw, ph] = pageDimsFor(im);
    const orientation = pw > ph ? "l" : "p";
    const format = settings.pageSize === "original" ? [pw,ph] : settings.pageSize;
    if(!doc){
      doc = new jsPDF({ orientation, unit:"pt", format });
    } else {
      doc.addPage(format, orientation);
    }
    const availW = pw - margin*2, availH = ph - margin*2;
    const ratio = Math.min(availW/im.img.width, availH/im.img.height);
    const iw = im.img.width*ratio, ih = im.img.height*ratio;
    doc.addImage(dataUrl, fmt, (pw-iw)/2, (ph-ih)/2, iw, ih);
    ui.progress(10 + ((i+1)/images.length)*60);
  }

  ui.set("optimize","done"); ui.set("create","done"); ui.set("preview","active"); ui.progress(86);
  await sleep(150);
  ui.set("preview","done"); ui.set("finalize","active");
  const blob = doc.output("blob");
  ui.progress(100); ui.set("finalize","done");

  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>PDF ready</h3>
      <p>${images.length} image(s) • ${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "images.pdf"));
});

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
