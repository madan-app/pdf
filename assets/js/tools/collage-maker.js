renderToolHeader("collage-maker", "Arrange photos into a printable, multi-page collage — grid layout, spacing and export options, all live.");

const PAGE_MM = { a4:[210,297], a3:[297,420], a5:[148,210], letter:[215.9,279.4], legal:[215.9,355.6] };
const PRESET_GRID = { 1:[1,1], 2:[1,2], 4:[2,2], 6:[2,3], 9:[3,3], 12:[3,4] };

let images = []; // {id, file, img, dataUrl}
let currentPage = 0;

const state = {
  pageSize: "a4", customW:210, customH:297, orientation:"portrait",
  perPageMode: "4", rows:2, cols:2,
  spacing:4, margin:8, fit:"cover", rounded:0,
  background:"#ffffff", borderOn:false, borderThickness:3, captionOn:false,
  exportFormat:"pdf",
};

// ---------- element refs ----------
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const thumbGrid = document.getElementById("thumbGrid");
const canvas = document.getElementById("collageCanvas");
const pageInfo = document.getElementById("pageInfo");
const pageNav = document.getElementById("pageNav");
const stage = document.getElementById("stage");

// ---------- image upload ----------
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
  renderThumbs();
  refreshPreview();
}

function renderThumbs(){
  thumbGrid.innerHTML = images.map((im,i)=>`
    <div class="thumb-card" draggable="true" data-id="${im.id}" style="cursor:grab">
      <img src="${im.dataUrl}" style="aspect-ratio:1/1">
      <div class="thumb-actions" style="padding:3px 4px">
        <span style="font-size:10px;color:var(--text-faint)">${i+1}</span>
        <button data-act="del" data-id="${im.id}" style="font-size:11px">🗑️</button>
      </div>
    </div>`).join("");
  thumbGrid.querySelectorAll('[data-act="del"]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      images = images.filter(im=>im.id!==btn.dataset.id);
      renderThumbs(); refreshPreview();
    });
  });
  enableDragReorder(thumbGrid, ".thumb-card", ids=>{
    images = ids.map(id=>images.find(im=>im.id===id));
    refreshPreview();
  });
}

// ---------- settings bindings ----------
function bindChips(id, key, extra){
  document.getElementById(id).addEventListener("click", e=>{
    const btn = e.target.closest(".chip,button"); if(!btn) return;
    [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    state[key] = btn.dataset.v;
    if(extra) extra(btn.dataset.v);
    refreshPreview();
  });
}
bindChips("pageSizeChips","pageSize", v=>{
  document.getElementById("customSizeField").style.display = v==="original" ? "block" : "none";
});
bindChips("orientSeg","orientation");
bindChips("perPageChips","perPageMode", v=>{
  document.getElementById("customGridField").style.display = v==="custom" ? "block" : "none";
  if(v!=="custom"){ const [r,c]=PRESET_GRID[v]; state.rows=r; state.cols=c; }
});
bindChips("fitSeg","fit");
bindChips("exportSeg","exportFormat");

document.getElementById("customW").addEventListener("input", e=>{ state.customW=+e.target.value; refreshPreview(); });
document.getElementById("customH").addEventListener("input", e=>{ state.customH=+e.target.value; refreshPreview(); });

function stepper(idPrefix, key, min=1, max=8){
  const input = document.getElementById(idPrefix+"Input");
  document.getElementById(idPrefix+"Minus").addEventListener("click", ()=>{ input.value = Math.max(min, +input.value-1); state[key]=+input.value; refreshPreview(); });
  document.getElementById(idPrefix+"Plus").addEventListener("click", ()=>{ input.value = Math.min(max, +input.value+1); state[key]=+input.value; refreshPreview(); });
  input.addEventListener("input", ()=>{ state[key]=Math.max(min,Math.min(max,+input.value||min)); refreshPreview(); });
}
stepper("rows","rows"); stepper("cols","cols");

["spacing","pageMargin","rounded","borderThickness"].forEach(id=>{
  const el = document.getElementById(id);
  const key = id==="pageMargin" ? "margin" : id;
  const labelId = id==="pageMargin" ? "marginVal" : id+"Val";
  el.addEventListener("input", ()=>{
    state[key] = +el.value;
    document.getElementById(labelId).textContent = el.value;
    refreshPreview();
  });
});

document.getElementById("bgSwatches").addEventListener("click", e=>{
  const sw = e.target.closest(".swatch"); if(!sw) return;
  document.querySelectorAll("#bgSwatches .swatch").forEach(s=>s.classList.remove("active"));
  sw.classList.add("active");
  state.background = sw.dataset.v;
  refreshPreview();
});

document.getElementById("borderToggle").addEventListener("change", e=>{
  state.borderOn = e.target.checked;
  document.getElementById("borderThicknessField").style.display = state.borderOn ? "block" : "none";
  refreshPreview();
});
document.getElementById("captionToggle").addEventListener("change", e=>{
  state.captionOn = e.target.checked;
  refreshPreview();
});

// ---------- layout math ----------
function pageDimsMM(){
  let [w,h] = state.pageSize === "original" ? [state.customW, state.customH] : PAGE_MM[state.pageSize];
  if(state.orientation === "landscape" && w < h) [w,h] = [h,w];
  if(state.orientation === "portrait" && w > h) [w,h] = [h,w];
  return [w,h];
}
function gridDims(){
  if(state.perPageMode === "custom") return [state.rows, state.cols];
  return PRESET_GRID[state.perPageMode];
}
function buildPages(){
  const [rows, cols] = gridDims();
  const perPage = rows*cols;
  if(!images.length) return [];
  const pages = [];
  for(let i=0;i<images.length;i+=perPage) pages.push(images.slice(i, i+perPage));
  return pages;
}

// ---------- render one page to a canvas at given DPI ----------
function drawPage(targetCanvas, pageImages, dpi){
  const [wmm,hmm] = pageDimsMM();
  const px = mm => mm*dpi/25.4;
  const [rows, cols] = gridDims();
  targetCanvas.width = Math.round(px(wmm));
  targetCanvas.height = Math.round(px(hmm));
  const ctx = targetCanvas.getContext("2d");
  ctx.fillStyle = state.background;
  ctx.fillRect(0,0,targetCanvas.width, targetCanvas.height);

  const margin = px(state.margin), spacing = px(state.spacing);
  const availW = targetCanvas.width - margin*2 - spacing*(cols-1);
  const availH = targetCanvas.height - margin*2 - spacing*(rows-1);
  const cellW = availW/cols, cellH = availH/rows;
  const captionH = state.captionOn ? Math.max(14, cellH*0.09) : 0;

  pageImages.forEach((im, idx)=>{
    const r = Math.floor(idx/cols), c = idx%cols;
    const x = margin + c*(cellW+spacing);
    const y = margin + r*(cellH+spacing);
    const imgAreaH = cellH - captionH;

    ctx.save();
    if(state.rounded > 0){
      const rad = Math.min(px(state.rounded/2), cellW/2, imgAreaH/2);
      roundRectPath(ctx, x, y, cellW, imgAreaH, rad);
      ctx.clip();
    }
    drawFitted(ctx, im.img, x, y, cellW, imgAreaH, state.fit);
    ctx.restore();

    if(state.borderOn){
      ctx.save();
      ctx.strokeStyle = "#333333";
      ctx.lineWidth = state.borderThickness * (dpi/96);
      if(state.rounded > 0){
        const rad = Math.min(px(state.rounded/2), cellW/2, imgAreaH/2);
        roundRectPath(ctx, x, y, cellW, imgAreaH, rad);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, cellW, imgAreaH);
      }
      ctx.restore();
    }

    if(state.captionOn){
      ctx.save();
      ctx.fillStyle = state.background === "#000000" ? "#ffffff" : "#222222";
      ctx.font = `${Math.max(9, captionH*0.55)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = im.file.name.length > 24 ? im.file.name.slice(0,21)+"…" : im.file.name;
      ctx.fillText(label, x+cellW/2, y+imgAreaH+captionH/2);
      ctx.restore();
    }
  });
}

function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawFitted(ctx, img, x, y, w, h, mode){
  const ir = img.width/img.height, cr = w/h;
  if(mode === "cover"){
    let sw, sh, sx, sy;
    if(ir > cr){ sh = img.height; sw = sh*cr; sx = (img.width-sw)/2; sy=0; }
    else { sw = img.width; sh = sw/cr; sx = 0; sy = (img.height-sh)/2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  } else {
    let dw, dh;
    if(ir > cr){ dw = w; dh = w/ir; } else { dh = h; dw = h*ir; }
    ctx.drawImage(img, x+(w-dw)/2, y+(h-dh)/2, dw, dh);
  }
}

// ---------- live preview ----------
function refreshPreview(){
  const pages = buildPages();
  if(!pages.length){
    canvas.width = 0; canvas.height = 0;
    pageInfo.textContent = "Add images to see a live preview";
    pageNav.style.display = "none";
    return;
  }
  currentPage = Math.min(currentPage, pages.length-1);
  drawPage(canvas, pages[currentPage], 96);
  canvas.style.width = "100%";
  canvas.style.height = "auto";
  const [rows,cols] = gridDims();
  pageInfo.textContent = `Page ${currentPage+1} of ${pages.length} • ${rows}×${cols} grid • ${images.length} photo(s) total`;

  if(pages.length > 1){
    pageNav.style.display = "flex";
    pageNav.innerHTML = pages.map((_,i)=>`<button data-p="${i}" class="${i===currentPage?'active':''}">${i+1}</button>`).join("");
    pageNav.querySelectorAll("button").forEach(b=>b.addEventListener("click", ()=>{ currentPage=+b.dataset.p; refreshPreview(); }));
  } else {
    pageNav.style.display = "none";
  }
}

// ---------- create / export ----------
document.getElementById("createBtn").addEventListener("click", async ()=>{
  const pages = buildPages();
  if(!pages.length){ toast("Add at least one image"); return; }

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [
    {key:"layout", label:"Laying out pages"},
    {key:"render", label:"Rendering collage"},
    {key:"export", label:"Exporting"},
  ]);
  ui.set("layout","done"); ui.set("render","active");

  const exportCanvas = document.createElement("canvas");
  const dpi = 200;

  if(state.exportFormat === "pdf"){
    const [wmm,hmm] = pageDimsMM();
    const { jsPDF } = window.jspdf;
    let doc = null;
    for(let i=0;i<pages.length;i++){
      drawPage(exportCanvas, pages[i], dpi);
      const orientation = wmm > hmm ? "l" : "p";
      if(!doc) doc = new jsPDF({orientation, unit:"mm", format:[wmm,hmm]});
      else doc.addPage([wmm,hmm], orientation);
      doc.addImage(exportCanvas.toDataURL("image/jpeg",0.92), "JPEG", 0, 0, wmm, hmm);
      ui.progress(((i+1)/pages.length)*85);
    }
    ui.set("render","done"); ui.set("export","active");
    const blob = doc.output("blob");
    ui.progress(100); ui.set("export","done");
    finishResult(blob, "collage.pdf", `${pages.length} page(s)`);
  } else {
    const ext = state.exportFormat === "jpeg" ? "jpg" : "png";
    const mime = state.exportFormat === "jpeg" ? "image/jpeg" : "image/png";
    if(pages.length === 1){
      drawPage(exportCanvas, pages[0], dpi);
      ui.progress(85); ui.set("render","done"); ui.set("export","active");
      const blob = await new Promise(res=>exportCanvas.toBlob(res, mime, 0.92));
      ui.progress(100); ui.set("export","done");
      finishResult(blob, `collage-page-1.${ext}`, "1 page");
    } else {
      const zip = new JSZip();
      for(let i=0;i<pages.length;i++){
        drawPage(exportCanvas, pages[i], dpi);
        const blob = await new Promise(res=>exportCanvas.toBlob(res, mime, 0.92));
        zip.file(`collage-page-${i+1}.${ext}`, blob);
        ui.progress(((i+1)/pages.length)*85);
      }
      ui.set("render","done"); ui.set("export","active");
      const zipBlob = await zip.generateAsync({type:"blob"});
      ui.progress(100); ui.set("export","done");
      finishResult(zipBlob, "collage-pages.zip", `${pages.length} pages, packaged as ZIP`);
    }
  }
});

function finishResult(blob, filename, subtitle){
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Collage ready</h3>
      <p>${subtitle} • ${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download ${filename.endsWith(".zip")?"All as ZIP":filename}</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, filename));
}
