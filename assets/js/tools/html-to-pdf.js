renderToolHeader("html-to-pdf", "Paste HTML or upload an .html file — rendered and exported entirely in your browser.");

const previewStage = document.getElementById("previewStage");
const actionsRow = document.getElementById("actionsRow");
const stage = document.getElementById("stage");
let renderFrame = null;

document.getElementById("htmlFileInput").addEventListener("change", async e=>{
  const file = e.target.files[0];
  if(!file) return;
  const text = await file.text();
  document.getElementById("htmlInput").value = text;
});

['pageSizeSeg','orientSeg'].forEach(id=>{
  document.getElementById(id).addEventListener("click", e=>{
    const btn = e.target.closest("button"); if(!btn) return;
    [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  });
});

document.getElementById("renderBtn").addEventListener("click", ()=>{
  const html = document.getElementById("htmlInput").value.trim();
  if(!html){ toast("Paste some HTML or upload a file first"); return; }

  previewStage.innerHTML = "";
  const frame = document.createElement("iframe");
  frame.style.cssText = "width:100%;min-height:480px;border:1px solid var(--border);border-radius:10px;background:#fff";
  frame.sandbox = "allow-same-origin";
  previewStage.appendChild(frame);
  frame.srcdoc = html;
  renderFrame = frame;
  actionsRow.style.display = "flex";
});

document.getElementById("exportBtn").addEventListener("click", async ()=>{
  if(!renderFrame){ toast("Render a preview first"); return; }
  const pageSize = document.querySelector("#pageSizeSeg .active").dataset.v;
  const orientation = document.querySelector("#orientSeg .active").dataset.v;

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"capture",label:"Capturing content"},{key:"paginate",label:"Paginating"},{key:"finalize",label:"Finalizing PDF"}]);
  ui.set("capture","active");

  const doc = renderFrame.contentDocument;
  const target = doc.body;
  const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  ui.set("capture","done"); ui.set("paginate","active"); ui.progress(50);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: orientation==="landscape"?"l":"p", unit:"pt", format:pageSize });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = canvas.height * (imgW/canvas.width);

  let heightLeft = imgH, position = 0, first = true;
  const pageCanvas = document.createElement("canvas");
  const ctx = pageCanvas.getContext("2d");
  const pxPerPt = canvas.width / imgW;

  while(heightLeft > 0){
    if(!first) pdf.addPage(pageSize, orientation==="landscape"?"l":"p");
    first = false;
    const sliceHeightPt = Math.min(pageH, heightLeft);
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPt * pxPerPt;
    ctx.clearRect(0,0,pageCanvas.width,pageCanvas.height);
    ctx.drawImage(canvas, 0, position*pxPerPt, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imgW, sliceHeightPt);
    heightLeft -= pageH;
    position += pageH;
    ui.progress(50 + Math.min(40, (1-heightLeft/imgH)*40));
  }

  ui.set("paginate","done"); ui.set("finalize","done"); ui.progress(100);
  const blob = pdf.output("blob");
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>PDF ready</h3>
      <p>${bytesToSize(blob.size)}</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "webpage.pdf"));
});
