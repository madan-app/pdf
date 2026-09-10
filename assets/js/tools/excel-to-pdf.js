renderToolHeader("excel-to-pdf", "Convert spreadsheets to a clean, printable PDF table — processed locally.");

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const previewStage = document.getElementById("previewStage");
const sidePanel = document.getElementById("sidePanel");
const stage = document.getElementById("stage");
const sheetSel = document.getElementById("sheetSel");
let workbook = null;
let fileName = "spreadsheet";
let renderNode = null;

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  fileName = file.name.replace(/\.(xlsx|xls|csv)$/i,"");
  const buf = await fileToArrayBuffer(file);
  workbook = XLSX.read(buf, {type:"array"});
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${workbook.SheetNames.length} sheet(s) — click to replace</p>`;
  sheetSel.innerHTML = workbook.SheetNames.map(n=>`<option value="${n}">${n}</option>`).join("");
  sidePanel.style.display = "block";
  renderSheet();
}

sheetSel.addEventListener("change", renderSheet);

function renderSheet(){
  const name = sheetSel.value || workbook.SheetNames[0];
  const html = XLSX.utils.sheet_to_html(workbook.Sheets[name], {id:"xlsxTable"});
  previewStage.style.display = "block";
  previewStage.innerHTML = `<div id="tableWrap" style="background:#fff;padding:20px;display:inline-block;min-width:100%">${html}</div>`;
  const table = document.getElementById("xlsxTable");
  if(table){
    table.style.borderCollapse = "collapse";
    table.style.fontFamily = "Arial, sans-serif";
    table.style.fontSize = "12px";
    table.querySelectorAll("td,th").forEach(cell=>{
      cell.style.border = "1px solid #ccc";
      cell.style.padding = "6px 10px";
      cell.style.whiteSpace = "nowrap";
    });
  }
  renderNode = document.getElementById("tableWrap");
}

document.getElementById("orientSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
});

document.getElementById("exportBtn").addEventListener("click", async ()=>{
  if(!renderNode){ toast("Upload a spreadsheet first"); return; }
  const orientation = document.querySelector("#orientSeg .active").dataset.v;

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"render",label:"Rendering table"},{key:"finalize",label:"Finalizing PDF"}]);
  ui.set("render","active");

  const blob = await nodeToPdfBlob(renderNode, {pageSize:"a4", orientation}, pct=>ui.progress(pct));
  ui.set("render","done"); ui.set("finalize","done"); ui.progress(100);

  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>PDF ready</h3>
      <p>${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${fileName}.pdf`));
});
