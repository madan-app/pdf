// Shared by remove-pages.html / extract-pages.html / reorder-pages.html
// Requires global TOOL_MODE = "remove" | "extract" | "reorder"
renderToolHeader(
  TOOL_MODE === "remove" ? "remove-pages" : TOOL_MODE === "extract" ? "extract-pages" : "reorder-pages"
);

let srcBytes = null;
let order = [];      // array of original page indices (0-based), current order
let marked = new Set(); // selected pages (by id used in DOM = original index)

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const thumbGrid = document.getElementById("thumbGrid");
const stage = document.getElementById("stage");
const actionsRow = document.getElementById("actionsRow");
const actionBtn = document.getElementById("actionBtn");
const hintText = document.getElementById("hintText");

const MODE_COPY = {
  remove:  {icon:"🗑️", verb:"Remove selected pages", hint:"Tap pages to mark for removal, then click Remove.", btn:"🗑️ Remove Selected Pages"},
  extract: {icon:"📤", verb:"Extract selected pages", hint:"Tap the pages you want to keep, then click Extract.", btn:"📤 Extract Selected Pages"},
  reorder: {icon:"🔀", verb:"Save reordered PDF", hint:"Drag pages to reorder them, or delete unwanted pages.", btn:"💾 Save Reordered PDF"},
};
if(hintText) hintText.textContent = MODE_COPY[TOOL_MODE].hint;
if(actionBtn) actionBtn.textContent = MODE_COPY[TOOL_MODE].btn;

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  srcBytes = new Uint8Array(await fileToArrayBuffer(file));
  const doc = await loadPdfJsDoc(srcBytes.slice());
  order = [...Array(doc.numPages).keys()];
  marked.clear();
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${doc.numPages} pages — click to replace</p>`;
  await renderThumbs(doc);
  actionsRow.style.display = "flex";
}

async function renderThumbs(doc){
  thumbGrid.innerHTML = "";
  for(const origIdx of order){
    const canvas = await renderPageToCanvas(doc, origIdx+1, 180);
    const card = document.createElement("div");
    card.className = "thumb-card";
    card.draggable = TOOL_MODE === "reorder";
    card.dataset.id = String(origIdx);
    const showCheck = TOOL_MODE !== "reorder";
    card.innerHTML = `
      <div class="thumb-idx">${order.indexOf(origIdx)+1}</div>
      ${showCheck ? `<div class="check" data-idx="${origIdx}">${marked.has(origIdx) ? "✓" : ""}</div>` : ""}
    `;
    card.appendChild(canvas);
    const actions = document.createElement("div");
    actions.className = "thumb-actions";
    if(TOOL_MODE === "reorder"){
      actions.innerHTML = `<button data-act="del" data-idx="${origIdx}">🗑️ Delete</button><span class="grip">⠿ drag</span>`;
    }
    card.appendChild(actions);
    if(showCheck && marked.has(origIdx)) card.classList.add("selected-for-delete");
    thumbGrid.appendChild(card);
  }
  bindThumbEvents(doc);
}

function bindThumbEvents(doc){
  thumbGrid.querySelectorAll(".check").forEach(chk=>{
    chk.addEventListener("click", e=>{
      const idx = +e.currentTarget.dataset.idx;
      if(marked.has(idx)) marked.delete(idx); else marked.add(idx);
      renderThumbs(doc);
    });
  });
  thumbGrid.querySelectorAll('[data-act="del"]').forEach(btn=>{
    btn.addEventListener("click", e=>{
      const idx = +e.currentTarget.dataset.idx;
      order = order.filter(i=>i!==idx);
      renderThumbs(doc);
    });
  });
  if(TOOL_MODE === "reorder"){
    enableDragReorder(thumbGrid, ".thumb-card", (ids)=>{
      order = ids.map(Number);
      renderThumbs(doc);
    });
  }
}

document.getElementById("selectAllBtn")?.addEventListener("click", ()=>{
  order.forEach(i=>marked.add(i));
  reRenderFromCache();
});
document.getElementById("selectNoneBtn")?.addEventListener("click", ()=>{
  marked.clear();
  reRenderFromCache();
});
let cachedDoc = null;
async function reRenderFromCache(){
  if(!cachedDoc){ cachedDoc = await loadPdfJsDoc(srcBytes.slice()); }
  renderThumbs(cachedDoc);
}
// keep cachedDoc in sync
const _origHandleFile = handleFile;

actionBtn?.addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF first"); return; }

  let finalOrder;
  if(TOOL_MODE === "remove"){
    if(!marked.size){ toast("Select pages to remove"); return; }
    finalOrder = order.filter(i=>!marked.has(i));
  } else if(TOOL_MODE === "extract"){
    if(!marked.size){ toast("Select pages to extract"); return; }
    finalOrder = order.filter(i=>marked.has(i));
  } else {
    finalOrder = order;
  }

  if(!finalOrder.length){ toast("At least one page must remain"); return; }

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [
    {key:"build", label:"Building new PDF"},
    {key:"finalize", label:"Finalizing"},
  ]);
  ui.set("build","active");

  const { PDFDocument } = PDFLib;
  const src = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, finalOrder);
  copied.forEach(p=>out.addPage(p));
  ui.progress(70); ui.set("build","done"); ui.set("finalize","active");
  const bytes = await out.save();
  ui.progress(100); ui.set("finalize","done");

  const blob = new Blob([bytes], {type:"application/pdf"});
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Done — ${out.getPageCount()} pages</h3>
      <p>${MODE_COPY[TOOL_MODE].verb}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${TOOL_MODE}-result.pdf`));
});
