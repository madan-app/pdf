renderToolHeader("add-watermark");

let srcBytes = null, fileName = "document.pdf";
let color = [0.878,0.271,0.369];

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

["wmOpacity","wmRotate","wmSize"].forEach(id=>{
  const el = document.getElementById(id);
  const suffix = id==="wmOpacity" ? "%" : id==="wmRotate" ? "°" : "";
  el.addEventListener("input", ()=>{
    document.getElementById(id+"Val").textContent = el.value + suffix;
  });
});

document.getElementById("wmColors").addEventListener("click", e=>{
  const sw = e.target.closest(".swatch"); if(!sw) return;
  document.querySelectorAll("#wmColors .swatch").forEach(s=>s.classList.remove("active"));
  sw.classList.add("active");
  color = sw.dataset.c.split(",").map(Number);
});

document.getElementById("applyBtn").addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF first"); return; }
  const text = document.getElementById("wmText").value.trim() || "WATERMARK";
  const opacity = (+document.getElementById("wmOpacity").value)/100;
  const rotation = +document.getElementById("wmRotate").value;
  const size = +document.getElementById("wmSize").value;

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"stamp",label:"Applying watermark"},{key:"finalize",label:"Finalizing"}]);
  ui.set("stamp","active");

  const { PDFDocument, rgb, degrees, StandardFonts } = PDFLib;
  const doc = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const pages = doc.getPages();

  pages.forEach((page,i)=>{
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: width/2 - textWidth/2,
      y: height/2,
      size, font,
      color: rgb(color[0],color[1],color[2]),
      opacity,
      rotate: degrees(rotation),
    });
    ui.progress(((i+1)/pages.length)*80);
  });

  ui.set("stamp","done"); ui.set("finalize","active");
  const bytes = await doc.save();
  ui.progress(100); ui.set("finalize","done");

  const blob = new Blob([bytes], {type:"application/pdf"});
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Watermark applied</h3>
      <p>${pages.length} pages watermarked</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${fileName}-watermarked.pdf`));
});
