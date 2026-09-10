renderToolHeader("word-to-pdf", "Best-effort DOCX → PDF conversion, rendered entirely in your browser.");

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const previewStage = document.getElementById("previewStage");
const actionsRow = document.getElementById("actionsRow");
const stage = document.getElementById("stage");
let renderNode = null;
let fileName = "document";

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  if(!file.name.toLowerCase().endsWith(".docx")){ toast("Please choose a .docx file"); return; }
  fileName = file.name.replace(/\.docx$/i,"");
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${bytesToSize(file.size)} — converting…</p>`;

  const arrayBuffer = await fileToArrayBuffer(file);
  const result = await mammoth.convertToHtml({ arrayBuffer });

  previewStage.style.display = "flex";
  previewStage.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "background:#fff;width:100%;max-width:700px;padding:56px;font-family:Georgia,serif;line-height:1.6;color:#222;box-shadow:var(--shadow-md);border-radius:4px";
  wrap.innerHTML = result.value;
  previewStage.appendChild(wrap);
  renderNode = wrap;
  actionsRow.style.display = "flex";

  if(result.messages && result.messages.length){
    console.log("mammoth conversion notes:", result.messages);
  }
}

document.getElementById("exportBtn").addEventListener("click", async ()=>{
  if(!renderNode){ toast("Upload a .docx file first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"capture",label:"Rendering document"},{key:"finalize",label:"Finalizing PDF"}]);
  ui.set("capture","active");

  const blob = await nodeToPdfBlob(renderNode, {pageSize:"a4", orientation:"portrait"}, pct=>ui.progress(pct));
  ui.set("capture","done"); ui.set("finalize","done"); ui.progress(100);

  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>PDF ready</h3>
      <p>${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${fileName}.pdf`));
});
