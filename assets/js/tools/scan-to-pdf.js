renderToolHeader("scan-to-pdf");

let stream = null;
let captures = []; // {id, dataUrl, w, h}
const video = document.getElementById("camVideo");
const thumbGrid = document.getElementById("thumbGrid");
const stage = document.getElementById("stage");
const capCount = document.getElementById("capCount");

document.getElementById("startCamBtn").addEventListener("click", async ()=>{
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    video.srcObject = stream;
    document.getElementById("startCamBtn").style.display = "none";
    document.getElementById("captureBtn").style.display = "inline-flex";
  }catch(err){
    toast("Couldn't access camera — try uploading a photo instead");
  }
});

document.getElementById("captureBtn").addEventListener("click", ()=>{
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  addCapture(canvas.toDataURL("image/jpeg", 0.92), canvas.width, canvas.height);
});

document.getElementById("uploadInput").addEventListener("change", async e=>{
  for(const file of e.target.files){
    const dataUrl = await fileToDataURL(file);
    const img = await loadImg(dataUrl);
    addCapture(dataUrl, img.width, img.height);
  }
  e.target.value = "";
});

function loadImg(src){
  return new Promise(res=>{ const i = new Image(); i.onload=()=>res(i); i.src=src; });
}

function addCapture(dataUrl, w, h){
  captures.push({id:uid(), dataUrl, w, h});
  renderThumbs();
}

function renderThumbs(){
  capCount.textContent = captures.length;
  thumbGrid.innerHTML = captures.map((c,i)=>`
    <div class="thumb-card" draggable="true" data-id="${c.id}">
      <div class="thumb-idx">${i+1}</div>
      <img src="${c.dataUrl}">
      <div class="thumb-actions"><span></span><button data-act="del" data-id="${c.id}">🗑️ Remove</button></div>
    </div>`).join("");
  thumbGrid.querySelectorAll('[data-act="del"]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      captures = captures.filter(c=>c.id!==btn.dataset.id);
      renderThumbs();
    });
  });
  enableDragReorder(thumbGrid, ".thumb-card", ids=>{
    captures = ids.map(id=>captures.find(c=>c.id===id));
  });
}

document.getElementById("buildBtn").addEventListener("click", async ()=>{
  if(!captures.length){ toast("Capture or upload at least one page"); return; }
  const pageSize = document.getElementById("pageSizeSel").value;
  const bw = document.querySelector('#colorSeg .active').dataset.v === "bw";

  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"process",label:"Processing scans"},{key:"build",label:"Building PDF"}]);
  ui.set("process","active");

  const { jsPDF } = window.jspdf;
  let doc = null;

  for(let i=0;i<captures.length;i++){
    let dataUrl = captures[i].dataUrl;
    if(bw) dataUrl = await toGrayscale(dataUrl);
    const dims = pageSize === "original" ? [captures[i].w, captures[i].h] :
      pageSize === "letter" ? [612, 792] : [595.28, 841.89];
    const orientation = dims[0] > dims[1] ? "l" : "p";
    if(!doc){
      doc = new jsPDF({ orientation, unit:"pt", format: pageSize==="original" ? dims : pageSize });
    } else {
      doc.addPage(pageSize==="original" ? dims : pageSize, orientation);
    }
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    const ratio = Math.min(pw/captures[i].w, ph/captures[i].h);
    const iw = captures[i].w*ratio, ih = captures[i].h*ratio;
    doc.addImage(dataUrl, "JPEG", (pw-iw)/2, (ph-ih)/2, iw, ih);
    ui.progress(((i+1)/captures.length)*90);
  }

  ui.set("process","done"); ui.set("build","done"); ui.progress(100);
  const blob = doc.output("blob");
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Scan complete</h3>
      <p>${captures.length} page(s) combined into one PDF</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, "scanned-document.pdf"));
});

function toGrayscale(dataUrl){
  return loadImg(dataUrl).then(img=>{
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img,0,0);
    const id = ctx.getImageData(0,0,c.width,c.height);
    for(let i=0;i<id.data.length;i+=4){
      const avg = id.data[i]*0.3 + id.data[i+1]*0.59 + id.data[i+2]*0.11;
      id.data[i]=id.data[i+1]=id.data[i+2]=avg;
    }
    ctx.putImageData(id,0,0);
    return c.toDataURL("image/jpeg", 0.9);
  });
}

document.getElementById("colorSeg").addEventListener("click", e=>{
  const btn = e.target.closest("button"); if(!btn) return;
  [...e.currentTarget.children].forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
});
