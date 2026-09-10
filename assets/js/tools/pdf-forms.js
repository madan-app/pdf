renderToolHeader("pdf-forms", "Fill in an existing PDF's form fields, then flatten it into a final, non-editable PDF.");

let srcBytes = null, fileName = "form";
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const formPanel = document.getElementById("formPanel");
const fieldsList = document.getElementById("fieldsList");
const actionsRow = document.getElementById("actionsRow");
const stage = document.getElementById("stage");

dropzone.addEventListener("click", ()=>fileInput.click());
["dragenter","dragover"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(ev=>dropzone.addEventListener(ev, e=>{e.preventDefault(); dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e=>handleFile(e.dataTransfer.files[0]));
fileInput.addEventListener("change", e=>handleFile(e.target.files[0]));

async function handleFile(file){
  if(!file) return;
  fileName = file.name.replace(/\.pdf$/i,"");
  srcBytes = new Uint8Array(await fileToArrayBuffer(file));
  dropzone.innerHTML = `<div class="dz-icon">✅</div><h3>${file.name}</h3><p>${bytesToSize(file.size)} — click to replace</p>`;

  const { PDFDocument } = PDFLib;
  const doc = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const form = doc.getForm();
  const fields = form.getFields();

  if(!fields.length){
    formPanel.style.display = "block";
    fieldsList.innerHTML = `<p style="color:var(--text-faint);font-size:14px">This PDF has no fillable form fields (no AcroForm detected).</p>`;
    actionsRow.style.display = "none";
    return;
  }

  fieldsList.innerHTML = fields.map((f,i)=>{
    const name = f.getName();
    if(f instanceof PDFLib.PDFCheckBox){
      return `<div class="field"><label class="toggle-row"><span>${name}</span><label class="switch"><input type="checkbox" data-field="${name}" data-type="checkbox"><span class="slider"></span></label></label></div>`;
    }
    if(f instanceof PDFLib.PDFDropdown || f instanceof PDFLib.PDFOptionList){
      const options = f.getOptions ? f.getOptions() : [];
      return `<div class="field"><label>${name}</label><select data-field="${name}" data-type="dropdown">${options.map(o=>`<option value="${o}">${o}</option>`).join("")}</select></div>`;
    }
    if(f instanceof PDFLib.PDFRadioGroup){
      const options = f.getOptions ? f.getOptions() : [];
      return `<div class="field"><label>${name}</label><select data-field="${name}" data-type="radio">${options.map(o=>`<option value="${o}">${o}</option>`).join("")}</select></div>`;
    }
    return `<div class="field"><label>${name}</label><input type="text" data-field="${name}" data-type="text"></div>`;
  }).join("");

  formPanel.style.display = "block";
  actionsRow.style.display = "flex";
}

document.getElementById("fillBtn").addEventListener("click", async ()=>{
  if(!srcBytes){ toast("Upload a PDF form first"); return; }
  stage.style.display = "flex";
  stage.scrollIntoView({behavior:"smooth", block:"nearest"});
  const ui = createProcessingUI(stage, [{key:"fill",label:"Filling fields"},{key:"flatten",label:"Flattening form"}]);
  ui.set("fill","active");

  const { PDFDocument } = PDFLib;
  const doc = await PDFDocument.load(srcBytes, {ignoreEncryption:true});
  const form = doc.getForm();

  fieldsList.querySelectorAll("[data-field]").forEach(el=>{
    const name = el.dataset.field, type = el.dataset.type;
    try{
      if(type === "checkbox"){
        const cb = form.getCheckBox(name);
        el.checked ? cb.check() : cb.uncheck();
      } else if(type === "dropdown"){
        form.getDropdown(name).select(el.value);
      } else if(type === "radio"){
        form.getRadioGroup(name).select(el.value);
      } else {
        form.getTextField(name).setText(el.value);
      }
    }catch(e){ console.warn("Could not set field", name, e); }
  });
  ui.progress(60); ui.set("fill","done"); ui.set("flatten","active");

  form.flatten();
  const bytes = await doc.save();
  ui.progress(100); ui.set("flatten","done");

  const blob = new Blob([bytes], {type:"application/pdf"});
  stage.innerHTML = `
    <div class="result-box">
      <div class="check-circle">✓</div>
      <h3>Form filled &amp; flattened</h3>
      <p>Field values are now permanently part of the PDF</p>
      <button class="btn btn-download" id="dlBtn">⬇ Download PDF</button>
    </div>`;
  document.getElementById("dlBtn").addEventListener("click", ()=>downloadBlob(blob, `${fileName}-filled.pdf`));
});
