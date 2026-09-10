renderToolHeader("split-pdf");

let pdfBytes = null;
let pageCount = 0;
let mode = "every";

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
  pdfBytes = new Uint8Array(await fileToArrayBuffer(file));
  const doc = await loadPdfJsDoc(pdfBytes.slice());
  pageCount = doc.numPages;
  sidePanel.style.display = "block";
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${pageCount} pages • ${bytesToSize(file.size)} — click to replace</p>`;
  thumbGrid.innerHTML = "";
  for(let i=1;i<=pageCount;i++){
    const canvas = await renderPageToCanvas(doc, i, 180);
    const card = document.createElement("div");
    card.className = "thumb-card";
    card.innerHTML = `<div class="thumb-idx">${i}</div>`;
    card.appendChild(canvas);
    thumbGrid.appendChild(card);
  }
}

document.getElementById("modeSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button");
  if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  mode = btn.dataset.v;
  document.getElementById("fixedField").style.display = mode==="fixed" ? "block" : "none";
  document.getElementById("rangesField").style.display = mode==="ranges" ? "block" : "none";
});

document.getElementById("fixedMinus").addEventListener("click", ()=>{
  const inp = document.getElementById("fixedCount");
  inp.value = Math.max(1, (+inp.value||1)-1);
});
document.getElementById("fixedPlus").addEventListener("click", ()=>{
  const inp = document.getElementById("fixedCount");
  inp.value = (+inp.value||1)+1;
});

function parseRanges(str, max){
  return str.split(",").map(s=>s.trim()).filter(Boolean).map(part=>{
    if(part.includes("-")){
      const [a,b] = part.split("-").map(n=>parseInt(n.trim(),10));
      return [Math.max(1,a), Math.min(max,b||a)];
    }
    const n = parseInt(part,10);
    return [n,n];
  }).filter(r=>r[0]>=1 && r[1]<=max && r[0]<=r[1]);
}

document.getElementById("splitBtn").addEventListener("click", async ()=>{
  if(!pdfBytes){ toast("Upload a PDF first"); return; }

  let groups = [];
  if(mode === "every"){
    for(let i=1;i<=pageCount;i++) groups.push([i,i]);
  } else if(mode === "fixed"){
    const size = Math.max(1, +document.getElementById("fixedCount").value || 1);
    for(let i=1;i<=pageCount;i+=size) groups.push([i, Math.min(pageCount, i+size-1)]);
  } else {
    groups = parseRanges(document.getElementById("rangesInput").value, pageCount);
    if(!groups.length){ toast("Enter valid page ranges"); return; }
  }

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [
    {key:"split", label:"Splitting pages"},
    {key:"zip", label:"Packaging ZIP"},
  ]);
  ui.set("split","active");

  const { PDFDocument } = PDFLib;
  const srcDoc = await PDFDocument.load(pdfBytes, {ignoreEncryption:true});
  const zip = new JSZip();

  for(let g=0; g<groups.length; g++){
    const [start,end] = groups[g];
    const outDoc = await PDFDocument.create();
    const indices = [];
    for(let p=start;p<=end;p++) indices.push(p-1);
    const copied = await outDoc.copyPages(srcDoc, indices);
    copied.forEach(p=>outDoc.addPage(p));
    const bytes = await outDoc.save();
    const name = start===end ? `page-${start}.pdf` : `pages-${start}-${end}.pdf`;
    zip.file(name, bytes);
    ui.progress(((g+1)/groups.length)*80);
  }

  ui.set("split","done"); ui.set("zip","active");
  const blob = await zip.generateAsync({type:"blob"});
  ui.progress(100);
  ui.set("zip","done");

  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Split into ${groups.length} PDF${groups.length>1?"s":""}</h3>
      <p>Packaged as a ZIP file</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download ZIP</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "split-pdfs.zip"));
});
