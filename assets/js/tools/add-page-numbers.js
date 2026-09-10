renderToolHeader("add-page-numbers");

let srcBytes = null, fileName = "document.pdf";
let position = "bottom-center";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const stage = document.getElementById("stage");
const sidePanel = document.getElementById("sidePanel");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  fileName = file.name.replace(/\.pdf$/i,"");
  srcBytes = new Uint8Array(await fileToArrayBuffer(file));
  sidePanel.style.display = "block";
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${bytesToSize(file.size)} — click to replace</p>`;
}

document.getElementById("posChips").addEventListener("click", e=>{
  const chip = e.target.closest(".chip"); if(!chip) return;
  document.querySelectorAll("#posChips .chip").forEach(c=>c.classList.remove("active"));
  chip.classList.add("active");
  position = chip.dataset.v;
});

const fontSizeInput = document.getElementById("fontSize");
fontSizeInput.addEventListener("input", ()=>{
  document.getElementById("fontSizeVal").textContent = fontSizeInput.value;
});

document.getElementById("applyBtn").addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"stamp",label:"Stamping page numbers"},{key:"finalize",label:"Finalizing"}]);
  ui.set("stamp","active");

  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const doc = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fmt = document.getElementById("formatSel").value;
  const startAt = parseInt(document.getElementById("startAt").value,10) || 1;
  const fontSize = parseInt(fontSizeInput.value,10) || 11;
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, i)=>{
    const n = startAt + i;
    let label = String(n);
    if(fmt === "page-n") label = `Page ${n}`;
    if(fmt === "n-of-total") label = `${n} / ${total + startAt - 1}`;
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(label, fontSize);
    const margin = 28;
    let x, y;
    if(position.includes("left")) x = margin;
    else if(position.includes("right")) x = width - textWidth - margin;
    else x = (width - textWidth)/2;
    y = position.startsWith("top") ? height - margin : margin - fontSize*0.3;
    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0.15,0.16,0.2) });
    ui.progress(((i+1)/total)*80);
  });

  ui.set("stamp","done"); ui.set("finalize","active");
  const bytes = await doc.save();
  ui.progress(100); ui.set("finalize","done");

  const blob = new Blob([bytes], {type:"application/pdf"});
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Page numbers added</h3>
      <p>${total} pages numbered</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${fileName}-numbered.pdf`));
});
