renderToolHeader("merge-pdf");

let files = []; // {id, file}

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const actionsRow = document.getElementById("actionsRow");
const stage = document.getElementById("stage");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>addFiles(e.dataTransfer.files));
fileInput.addEventListener("change", e=>addFiles(e.target.files));

function addFiles(list){
  [...list].forEach(f=>{
    if(f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) return;
    files.push({id:uid(), file:f});
  });
  fileInput.value = "";
  renderList();
}

function renderList(){
  actionsRow.style.display = files.length ? "flex" : "none";
  fileList.innerHTML = files.map((f,i)=>`
    <div class="file-row" draggable="true" data-id="${f.id}">
      <span class="grip">⠿</span>
      <div class="fthumb" style="display:flex;align-items:center;justify-content:center;font-size:16px;background:#fdecea;color:#e0455e">📄</div>
      <div class="finfo">
        <div class="fname">${i+1}. ${f.file.name}</div>
        <div class="fmeta">${bytesToSize(f.file.size)}</div>
      </div>
      <button class="fdel" data-id="${f.id}">✕</button>
    </div>`).join("");

  fileList.querySelectorAll(".fdel").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      files = files.filter(f=>f.id !== btn.dataset.id);
      renderList();
    });
  });

  enableDragReorder(fileList, ".file-row", (orderedIds)=>{
    files = orderedIds.map(id=>files.find(f=>f.id===id));
  });
}

document.getElementById("clearBtn").addEventListener("click", ()=>{
  files = [];
  stage.style.display = "none";
  renderList();
});

document.getElementById("mergeBtn").addEventListener("click", async ()=>{
  if(files.length < 1){ toast("Add at least one PDF"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [
    {key:"read", label:"Reading files"},
    {key:"merge", label:"Merging pages"},
    {key:"finalize", label:"Finalizing PDF"},
  ]);

  try{
    ui.set("read","active");
    const { PDFDocument } = PDFLib;
    const outDoc = await PDFDocument.create();
    let done = 0;

    for(const f of files){
      const bytes = await fileToArrayBuffer(f.file);
      const srcDoc = await PDFDocument.load(bytes, {ignoreEncryption:true});
      ui.set("read","done"); ui.set("merge","active");
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach(p=>outDoc.addPage(p));
      done++;
      ui.progress((done/files.length)*80);
    }

    ui.set("merge","done"); ui.set("finalize","active");
    const outBytes = await outDoc.save();
    ui.progress(100);
    ui.set("finalize","done");

    const blob = new Blob([outBytes], {type:"application/pdf"});
    showResult(blob, `merged-${files.length}-files.pdf`, `Merged ${files.length} PDFs • ${outDoc.getPageCount()} pages`);
  }catch(err){
    console.error(err);
    stage.innerHTML = `<div class="preview-empty">⚠️ Couldn't merge these files. Make sure they're valid, unencrypted PDFs.</div>`;
  }
});

function showResult(blob, filename, subtitle){
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Your PDF is ready</h3>
      <p>${subtitle}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download ${filename}</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, filename));
}
