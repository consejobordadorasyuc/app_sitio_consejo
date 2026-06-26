(() => {
  const LS = {
    apiUrl: 'ceby_admin_api_url',
    token: 'ceby_admin_token'
  };

  const headers = {
    productos: ['ID','Bordadora ID','Estado','Nombre de la pieza','Categoría','Técnica','Descripción','Materiales','Medidas','Tiempo de elaboración','Precio (MXN)','Nombre del archivo de foto','URL de foto (automático)','Bordadora','Municipio','Localidad','WhatsApp (10 dígitos)','Link de WhatsApp (automático)','Fecha de alta','Notas internas'],
    bordadoras: ['ID','Nombre completo','Es consejera','Municipio','Localidad','WhatsApp','Técnica principal','Años de experiencia','Nombre del archivo de foto','URL de foto (automático)','Biografía breve'],
    consejeras: ['ID','Bordadora ID','Nombre completo','Municipio','Localidad','Edad','Años de experiencia','Cargo en el Consejo','Colectivo o marca','Nombre del archivo de foto','URL de foto (automático)','Biografía']
  };

  const schema = {
    productos: [
      ['ID','hidden'], ['Estado','select:Estados'], ['Nombre de la pieza','text'], ['Categoría','select:Categorías'], ['Técnica','select:Técnicas'],
      ['Descripción','textarea','wide'], ['Materiales','textarea','wide'], ['Medidas','text'], ['Tiempo de elaboración','text'], ['Precio (MXN)','number'],
      ['Nombre del archivo de foto','image'], ['URL de foto (automático)','hidden'], ['Bordadora','selectRef:Bordadoras'], ['Bordadora ID','hidden'], ['Municipio','text', true], ['Localidad','text', true],
      ['WhatsApp (10 dígitos)','tel', true], ['Link de WhatsApp (automático)','hidden'], ['Fecha de alta','hidden'], ['Notas internas','textarea','wide']
    ],
    bordadoras: [
      ['ID','hidden'], ['Nombre completo','text'], ['Es consejera','select:SiNo'], ['Municipio','select:Municipios'], ['Localidad','text'], ['WhatsApp','tel'],
      ['Años de experiencia','number'], ['Nombre del archivo de foto','image'], ['URL de foto (automático)','hidden'], ['Biografía breve','textarea','wide']
    ],
    consejeras: [
      ['ID','text', true], ['Nombre completo','selectRef:Bordadoras'], ['Bordadora ID','hidden'], ['Municipio','text', true], ['Localidad','text', true], ['Edad','number'], ['Años de experiencia','number'],
      ['Cargo en el Consejo','text'], ['Colectivo o marca','text'], ['Nombre del archivo de foto','image'], ['URL de foto (automático)','hidden'], ['Biografía','textarea','wide']
    ]
  };

  const configuredApiUrl = window.CEBY_ADMIN_CONFIG?.API_URL || '';
  const hasFixedApiUrl = configuredApiUrl && !configuredApiUrl.includes('PEGA_AQUI_TU_URL');

  let state = {
    token: localStorage.getItem(LS.token),
    apiUrl: hasFixedApiUrl ? configuredApiUrl : (localStorage.getItem(LS.apiUrl) || ''),
    data: null,
    currentTab: 'productos'
  };

  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => [...document.querySelectorAll(sel)];

  function showStatus(text, type = 'ok') {
    const box = $('status');
    box.textContent = text;
    box.className = `status ${type}`;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 4500);
  }

  async function api(action, payload = {}) {
    if (!state.apiUrl) throw new Error('Falta la URL del Apps Script.');
    const response = await fetch(state.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: state.token, ...payload })
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch (err) { throw new Error('La respuesta del Apps Script no es JSON. Revisa el despliegue.'); }
    if (!json.ok) throw new Error(json.error || 'Error desconocido');
    return json;
  }

  function normalizeUrl(url) { return (url || '').trim(); }

  async function login() {
    $('loginMessage').textContent = '';
    state.apiUrl = hasFixedApiUrl ? normalizeUrl(configuredApiUrl) : normalizeUrl($('apiUrlInput').value);
    const password = $('passwordInput').value;
    try {
      const json = await api('login', { password });
      state.token = json.token;
      localStorage.setItem(LS.apiUrl, state.apiUrl);
      localStorage.setItem(LS.token, state.token);
      await loadData();
      showAdmin();
    } catch (err) {
      $('loginMessage').textContent = err.message;
    }
  }

  function logout() {
    localStorage.removeItem(LS.token);
    state.token = '';
    $('adminScreen').classList.add('hidden');
    $('loginScreen').classList.remove('hidden');
  }

  function showAdmin() {
    $('loginScreen').classList.add('hidden');
    $('adminScreen').classList.remove('hidden');
  }

  async function loadData() {
    showStatus('Cargando datos...', 'warn');
    const json = await api('getInit');
    state.data = json.data;
    if (state.data?._debug) {
      console.info('CEBY Drive debug:', state.data._debug);
      if (!state.data._debug.driveImageCount) {
        showStatus('Drive no devolvió imágenes. Revisa IMAGES_FOLDER_ID.', 'error');
      } else if (state.data._debug.unresolvedCount) {
        console.warn('Imágenes no resueltas:', state.data._debug.unresolvedSamples);
      }
    }
    populateFilters();
    renderAll();
    showStatus('Datos actualizados.');
  }

  function listFrom(name) {
    if (name === 'SiNo') return ['Sí','No'];
    if (name === 'Estados') return ['Borrador','Publicada'];
    if (name === 'Bordadoras') return (state.data?.bordadoras || []).map(r => r['Nombre completo']).filter(Boolean);
    return state.data?.listas?.[name] || [];
  }

  function bordadoraOptions() {
    return (state.data?.bordadoras || [])
      .filter(r => r.ID && r['Nombre completo'])
      .map(r => ({
        value: r.ID,
        name: r['Nombre completo'],
        label: `${r.ID} · ${r['Nombre completo']} · ${r.Municipio || 'Sin municipio'}`,
        row: r
      }));
  }

  function normalizePerson(value) {
    return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
  }

  function findBordadora(value) {
    const v = String(value || '').trim();
    if (!v) return null;
    const n = normalizePerson(v);
    return (state.data?.bordadoras || []).find(r =>
      String(r.ID || '').trim() === v ||
      normalizePerson(r['Nombre completo']) === n ||
      normalizePerson(`${r.ID || ''} ${r['Nombre completo'] || ''}`) === n
    ) || null;
  }

  function resolveBordadoraId(row) {
    return row['Bordadora ID'] || findBordadora(row.Bordadora || row['Nombre completo'])?.ID || '';
  }

  function populateFilters() {
    const sel = $('productStateFilter');
    const current = sel.value;
    sel.innerHTML = '<option value="">Todos los estados</option>' + listFrom('Estados').map(v => `<option>${escapeHtml(v)}</option>`).join('');
    sel.value = current;
  }

  function renderAll() {
    renderProducts(); renderBordadoras(); renderConsejeras(); renderConfig(); renderOptions();
  }

  function isDirectImageUrl(value) {
    const v = String(value || '').trim();
    return /^https?:\/\//i.test(v) || /^data:image\//i.test(v) || /^blob:/i.test(v);
  }

  function imageUrl(row) {
    const resolved = row.__resolvedImageUrl;
    if (isDirectImageUrl(resolved)) return resolved;

    const autoUrl = row['URL de foto (automático)'] || row['URL de foto'];
    if (isDirectImageUrl(autoUrl)) return autoUrl;

    // Si la celda trae solo "P001_foto.jpg", no se usa como src: el backend debe resolverlo a URL de Drive.
    return '';
  }

  function renderProducts() {
    const term = $('productSearch').value.toLowerCase();
    const filter = $('productStateFilter').value;
    const rows = (state.data?.productos || []).filter(r => {
      const blob = [r['Nombre de la pieza'], r.Municipio, r.Bordadora, r.Categoría, r.Estado].join(' ').toLowerCase();
      return (!term || blob.includes(term)) && (!filter || r.Estado === filter);
    });
    $('productsList').innerHTML = rows.map(r => cardHtml({
      id: r.ID,
      title: r['Nombre de la pieza'] || '(Sin nombre)',
      subtitle: `${r.Categoría || 'Sin categoría'} · ${r.Municipio || 'Sin municipio'} · ${r.Bordadora || 'Sin bordadora'}`,
      img: imageUrl(r),
      badges: [r.Estado, r['Precio (MXN)'] ? `$${r['Precio (MXN)']} MXN` : ''].filter(Boolean),
      type: 'productos'
    })).join('') || '<p class="muted">No hay productos con esos filtros.</p>';
  }

  function renderBordadoras() {
    const term = $('bordadoraSearch').value.toLowerCase();
    const rows = (state.data?.bordadoras || []).filter(r => [r['Nombre completo'], r.Municipio, r.Localidad].join(' ').toLowerCase().includes(term));
    $('bordadorasList').innerHTML = rows.map(r => cardHtml({ id: r.ID, title: r['Nombre completo'], subtitle: `${r.Municipio || ''} · ${r.Localidad || ''}`, img: imageUrl(r), badges: [r['Es consejera'] === 'Sí' ? 'Consejera' : '', r.WhatsApp ? 'WhatsApp' : ''].filter(Boolean), type: 'bordadoras' })).join('') || '<p class="muted">No hay bordadoras.</p>';
  }

  function renderConsejeras() {
    const term = $('consejeraSearch').value.toLowerCase();
    const rows = (state.data?.consejeras || []).filter(r => [r['Nombre completo'], r.Municipio, r['Cargo en el Consejo'], r['Colectivo o marca']].join(' ').toLowerCase().includes(term));
    $('consejerasList').innerHTML = rows.map(r => cardHtml({ id: r.ID, title: r['Nombre completo'], subtitle: `${r['Cargo en el Consejo'] || 'Consejera'} · ${r.Municipio || ''}`, img: imageUrl(r), badges: [r['Colectivo o marca'], r.Localidad].filter(Boolean), type: 'consejeras' })).join('') || '<p class="muted">No hay consejeras.</p>';
  }

  function cardHtml({id,title,subtitle,img,badges,type}) {
    const safeTitle = escapeHtml(title || '');
    const thumb = img ? `<img class="thumb" src="${escapeAttr(img)}" alt="${safeTitle}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb',textContent:'Sin foto'}))">` : '<div class="thumb">Sin foto</div>';
    return `<article class="card">
      ${thumb}
      <div><h3>${safeTitle}</h3><p>${escapeHtml(subtitle || '')}</p><div class="badges">${badges.map(b => `<span class="badge">${escapeHtml(b)}</span>`).join('')}</div></div>
      <div class="card-actions"><button class="small" data-edit="${type}" data-id="${escapeAttr(id)}">Editar</button><button class="small danger" data-delete="${type}" data-id="${escapeAttr(id)}">Eliminar</button></div>
    </article>`;
  }

  function renderConfig() {
    const rows = state.data?.configuracion || [];
    $('configEditor').innerHTML = rows.map((r, i) => `<div class="config-row"><div class="config-key">${escapeHtml(r.Clave || '')}</div><div><textarea data-config-index="${i}">${escapeHtml(r.Valor || '')}</textarea></div></div>`).join('');
  }

  function openForm(type, id = '') {
    const rows = state.data[type] || [];
    const row = id ? rows.find(r => r.ID === id) : (type === 'productos' ? { Estado: 'Borrador' } : {});
    if (!row && id) return;
    const form = $(`${singular(type)}Form`);
    form.dataset.type = type;
    form.dataset.id = id;
    const fields = schema[type];
    form.innerHTML = `<h2>${id ? 'Editar' : 'Nuevo'} ${labelFor(type)}</h2><div class="form-grid">${fields.map(([name, kind, meta]) => fieldHtml(type, row || {}, name, kind, meta)).join('')}</div><div class="editor-actions"><button type="button" class="secondary" data-cancel-form>Cancelar</button><button type="submit" class="primary">Guardar</button></div>`;
    form.classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function singular(type) { return type === 'productos' ? 'product' : type === 'bordadoras' ? 'bordadora' : 'consejera'; }
  function labelFor(type) { return type === 'productos' ? 'producto' : type === 'bordadoras' ? 'bordadora' : 'consejera'; }

  function fieldHtml(type, row, name, kind, meta) {
    const resolvedValue = (kind === 'url' && name.toLowerCase().includes('url de foto') && !row[name]) ? imageUrl(row) : row[name];
    const value = resolvedValue ?? '';
    const disabled = meta === true ? 'disabled' : '';
    const wide = meta === 'wide' || kind === 'image' ? 'wide' : '';
    if (kind === 'hidden') {
      return `<input type="hidden" name="${escapeAttr(name)}" value="${escapeAttr(value)}"/>`;
    }
    if (kind.startsWith('selectRef:')) {
      const refName = kind.split(':')[1];
      const opts = refName === 'Bordadoras' ? bordadoraOptions() : [];
      const currentId = row['Bordadora ID'] || resolveBordadoraId(row);
      const currentBordadora = findBordadora(currentId);
      const displayValue = currentBordadora ? currentBordadora['Nombre completo'] : (row[name] || row.Bordadora || row['Nombre completo'] || '');
      const listId = `bordadoras-options-${Math.random().toString(36).slice(2)}`;
      const label = type === 'consejeras' ? 'Bordadora registrada como consejera' : 'Bordadora';
      return `<div class="${wide}"><label>${label}</label><input type="text" name="${escapeAttr(name)}" value="${escapeAttr(displayValue)}" list="${listId}" data-bordadora-picker="true" data-target-name="${escapeAttr(name)}" autocomplete="off" placeholder="Escribe el nombre y selecciona una bordadora registrada"/><input type="hidden" name="Bordadora ID" value="${escapeAttr(currentId)}"/><datalist id="${listId}">${opts.map(o => `<option value="${escapeAttr(o.name)}" label="${escapeAttr(o.label)}"></option>`).join('')}</datalist><p class="help">Este campo solo acepta bordadoras registradas en la hoja Bordadoras. Si no aparece en la lista, primero da de alta a la bordadora.</p></div>`;
    }
    if (kind.startsWith('select:')) {
      const listName = kind.split(':')[1];
      const opts = [''].concat(listFrom(listName));
      return `<div class="${wide}"><label>${escapeHtml(name)}</label><select name="${escapeAttr(name)}" ${disabled}>${opts.map(v => `<option ${String(v)===String(value)?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></div>`;
    }
    if (kind === 'textarea') return `<div class="${wide}"><label>${escapeHtml(name)}</label><textarea name="${escapeAttr(name)}" ${disabled}>${escapeHtml(value)}</textarea></div>`;
    if (kind === 'image') {
      const current = value ? `<p class="help"><strong>Foto actual:</strong> ${escapeHtml(value)}</p>` : '<p class="help">Sin foto registrada todavía.</p>';
      const label = type === 'productos' ? 'Foto del producto' : escapeHtml(name);
      return `<div class="wide"><label>${label}</label><input name="${escapeAttr(name)}" type="hidden" value="${escapeAttr(value)}"/>${current}<p class="help">Sube una imagen. Al guardar, se almacenará automáticamente en Drive con el formato ID_nombre-de-la-prenda_01.</p><input type="file" accept="image/*" data-image-field="${escapeAttr(name)}" data-type="${type}" /></div>`;
    }
    const inputType = kind === 'url' ? 'url' : kind === 'number' ? 'number' : kind === 'date' ? 'date' : kind === 'tel' ? 'tel' : 'text';
    return `<div class="${wide}"><label>${escapeHtml(name)}</label><input name="${escapeAttr(name)}" type="${inputType}" value="${escapeAttr(value)}" ${disabled}/></div>`;
  }

  async function getNextId(type) {
    const prefix = type === 'productos' ? 'P' : type === 'bordadoras' ? 'B' : 'C';
    const json = await api('getNextId', { type, prefix });
    return json.id;
  }

  function productNameForImage(type, obj, selectedBordadora) {
    if (type === 'productos') return obj['Nombre de la pieza'] || 'producto';
    if (type === 'bordadoras') return obj['Nombre completo'] || 'bordadora';
    if (type === 'consejeras') return obj['Nombre completo'] || selectedBordadora?.['Nombre completo'] || 'consejera';
    return 'imagen';
  }

  function syncBordadoraFromPicker(form) {
    const picker = form?.querySelector('[data-bordadora-picker="true"]');
    if (!picker) return null;
    const hidden = form.querySelector('input[type="hidden"][name="Bordadora ID"]');
    const b = findBordadora(picker.value);
    if (hidden) hidden.value = b ? b.ID : '';
    if (b) {
      picker.value = b['Nombre completo'];
      applyBordadoraToForm(form, b);
    }
    return b;
  }

  function applyBordadoraToForm(form, b) {
    if (!form || !b) return;
    setFormValue(form, 'Bordadora', b['Nombre completo']);
    setFormValue(form, 'Nombre completo', b['Nombre completo']);
    setFormValue(form, 'Municipio', b.Municipio);
    setFormValue(form, 'Localidad', b.Localidad);
    setFormValue(form, 'WhatsApp (10 dígitos)', b.WhatsApp);
    setFormValue(form, 'Años de experiencia', b['Años de experiencia']);
    if (form.dataset.type === 'consejeras') {
      setFormValue(form, 'Nombre del archivo de foto', b['Nombre del archivo de foto']);
      setFormValue(form, 'URL de foto (automático)', b['URL de foto (automático)']);
    }
  }

  function validateProductBeforeSave(obj, form, selectedBordadora) {
    if (!obj['Nombre de la pieza'] || !String(obj['Nombre de la pieza']).trim()) {
      throw new Error('Falta el nombre del producto.');
    }
    if (!obj['Descripción'] || !String(obj['Descripción']).trim()) {
      throw new Error('Falta la descripción del producto.');
    }
    if (!obj['Medidas'] || !String(obj['Medidas']).trim()) {
      throw new Error('Faltan las medidas del producto.');
    }
    if (!obj['Precio (MXN)'] || Number(obj['Precio (MXN)']) <= 0) {
      throw new Error('Falta el precio del producto o no es válido.');
    }
    if (!selectedBordadora) {
      throw new Error('Selecciona una bordadora registrada en la hoja Bordadoras.');
    }
    const fileInput = form.querySelector('input[type=file]');
    const hasNewFile = Boolean(fileInput?.files?.[0]);
    const hasExistingPhoto = Boolean(String(obj['Nombre del archivo de foto'] || '').trim() || String(obj['URL de foto (automático)'] || '').trim());
    if (!hasNewFile && !hasExistingPhoto) {
      throw new Error('Falta la foto del producto. Sube una imagen antes de guardar.');
    }
  }

  async function submitForm(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const type = form.dataset.type;
    const obj = Object.fromEntries(new FormData(form).entries());
    obj.__isExisting = Boolean(form.dataset.id);
    if (form.dataset.id) obj.ID = form.dataset.id;
    if (!form.dataset.id && obj.ID) delete obj.ID;

    const selectedBordadora = syncBordadoraFromPicker(form) || findBordadora(obj['Bordadora ID']) || findBordadora(obj.Bordadora || obj['Nombre completo']);
    if ((type === 'productos' || type === 'consejeras') && !selectedBordadora) {
      throw new Error('Selecciona una bordadora registrada en la hoja Bordadoras. Si no aparece, primero dala de alta en Bordadoras.');
    }
    if ((type === 'productos' || type === 'consejeras') && selectedBordadora) {
      obj['Bordadora ID'] = selectedBordadora.ID;
      obj.Bordadora = selectedBordadora['Nombre completo'];
      obj['Nombre completo'] = selectedBordadora['Nombre completo'];
      obj.Municipio = selectedBordadora.Municipio || obj.Municipio || '';
      obj.Localidad = selectedBordadora.Localidad || obj.Localidad || '';
      if (type === 'productos') obj['WhatsApp (10 dígitos)'] = selectedBordadora.WhatsApp || obj['WhatsApp (10 dígitos)'] || '';
      if (type === 'consejeras') {
        obj['Años de experiencia'] = obj['Años de experiencia'] || selectedBordadora['Años de experiencia'] || '';
        obj['Nombre del archivo de foto'] = obj['Nombre del archivo de foto'] || selectedBordadora['Nombre del archivo de foto'] || '';
        obj['URL de foto (automático)'] = obj['URL de foto (automático)'] || selectedBordadora['URL de foto (automático)'] || '';
      }
    }

    if (type === 'productos') validateProductBeforeSave(obj, form, selectedBordadora);

    const fileInput = form.querySelector('input[type=file]');
    if (fileInput?.files?.[0]) {
      if (!obj.ID) {
        showStatus('Asignando ID automático...', 'warn');
        obj.ID = await getNextId(type);
      }
      const file = fileInput.files[0];
      const imageBaseName = productNameForImage(type, obj, selectedBordadora);
      showStatus('Subiendo imagen...', 'warn');
      const uploaded = await uploadFile(type, obj.ID, imageBaseName, file);
      const imageField = fileInput.dataset.imageField;
      obj[imageField] = uploaded.name;
      const urlHeader = headers[type].find(h => h.includes('URL de foto'));
      if (urlHeader) obj[urlHeader] = uploaded.url;
    }

    showStatus('Guardando...', 'warn');
    const action = type === 'productos' ? 'saveProduct' : type === 'bordadoras' ? 'saveBordadora' : 'saveConsejera';
    const json = await api(action, { record: obj });
    state.data[type] = json.rows;
    form.classList.add('hidden');
    renderAll();
    showStatus('Registro guardado.');
  }

  async function uploadFile(type, recordId, title, file) {
    const dataUrl = await readFileAsDataUrl(file);
    const base64 = dataUrl.split(',')[1];
    const json = await api('uploadImage', { entity: type, recordId, title, filename: file.name, mimeType: file.type, data: base64, replaceExisting: true });
    return json.file;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); });
  }

  async function deleteRecord(type, id) {
    const labels = { productos: 'producto', bordadoras: 'bordadora', consejeras: 'consejera' };
    if (!confirm(`¿Eliminar definitivamente este ${labels[type] || 'registro'}? Esta acción quitará la fila de Google Sheets y no se puede deshacer.`)) return;
    const action = type === 'productos' ? 'deleteProduct' : type === 'bordadoras' ? 'deleteBordadora' : 'deleteConsejera';
    const json = await api(action, { id });
    state.data[type] = json.rows;
    renderAll();
    showStatus('Registro eliminado.');
  }

  function renderOptions() {
    const categories = state.data?.listas?.['Categorías'] || [];
    const techniques = state.data?.listas?.['Técnicas'] || [];
    $('categoriesOptions').value = categories.join('\n');
    $('techniquesOptions').value = techniques.join('\n');
  }

  function parseOptions(value) {
    const seen = new Set();
    return String(value || '').split(/\r?\n/).map(v => v.trim()).filter(v => {
      const key = v.toLocaleLowerCase('es');
      if (!v || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function saveOptions() {
    const listas = {
      'Categorías': parseOptions($('categoriesOptions').value),
      'Técnicas': parseOptions($('techniquesOptions').value),
      'Estados': ['Borrador', 'Publicada']
    };
    if (!listas['Categorías'].length) throw new Error('Agrega al menos una categoría.');
    if (!listas['Técnicas'].length) throw new Error('Agrega al menos una técnica.');
    showStatus('Guardando opciones...', 'warn');
    const json = await api('saveLists', { listas });
    state.data.listas = json.listas;
    populateFilters();
    renderOptions();
    showStatus('Opciones actualizadas.');
  }

  async function saveConfig() {
    const rows = (state.data.configuracion || []).map((r, i) => ({ Clave: r.Clave, Valor: document.querySelector(`[data-config-index="${i}"]`).value }));
    showStatus('Guardando configuración...', 'warn');
    const json = await api('saveConfig', { rows });
    state.data.configuracion = json.rows;
    renderConfig();
    showStatus('Configuración guardada.');
  }

  function bindEvents() {
    $('apiUrlInput').value = state.apiUrl;
    if (hasFixedApiUrl) {
      $('apiUrlBlock')?.classList.add('hidden');
      $('configuredApiMessage')?.classList.remove('hidden');
    }
    $('loginBtn').addEventListener('click', login);
    $('passwordInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    $('logoutBtn').addEventListener('click', logout);
    $('refreshBtn').addEventListener('click', () => loadData().catch(err => showStatus(err.message, 'error')));
    qsa('.nav').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('newProductBtn').addEventListener('click', () => openForm('productos'));
    $('newBordadoraBtn').addEventListener('click', () => openForm('bordadoras'));
    $('newConsejeraBtn').addEventListener('click', () => openForm('consejeras'));
    $('productSearch').addEventListener('input', renderProducts);
    $('productStateFilter').addEventListener('change', renderProducts);
    $('bordadoraSearch').addEventListener('input', renderBordadoras);
    $('consejeraSearch').addEventListener('input', renderConsejeras);
    $('saveConfigBtn').addEventListener('click', () => saveConfig().catch(err => showStatus(err.message, 'error')));
    $('saveOptionsBtn').addEventListener('click', () => saveOptions().catch(err => showStatus(err.message, 'error')));
    ['productForm','bordadoraForm','consejeraForm'].forEach(id => $(id).addEventListener('submit', e => submitForm(e).catch(err => showStatus(err.message, 'error'))));
    document.body.addEventListener('click', e => {
      const edit = e.target.closest('[data-edit]'); if (edit) openForm(edit.dataset.edit, edit.dataset.id);
      const del = e.target.closest('[data-delete]'); if (del) deleteRecord(del.dataset.delete, del.dataset.id).catch(err => showStatus(err.message, 'error'));
      if (e.target.closest('[data-cancel-form]')) e.target.closest('form').classList.add('hidden');
    });
    document.body.addEventListener('input', e => {
      const picker = e.target.closest('[data-bordadora-picker="true"]');
      if (!picker) return;
      const form = picker.closest('form');
      syncBordadoraFromPicker(form);
    });
    document.body.addEventListener('change', e => {
      const picker = e.target.closest('[data-bordadora-picker="true"]');
      if (!picker) return;
      const form = picker.closest('form');
      syncBordadoraFromPicker(form);
    });
  }

  function setFormValue(form, name, value) {
    const el = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (el && value !== undefined && value !== null && String(value).trim() !== '') el.value = value;
  }

  function switchTab(tab) {
    state.currentTab = tab;
    qsa('.nav').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    qsa('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${tab}`));
  }

  function escapeHtml(v) { return String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
  function escapeAttr(v) { return escapeHtml(v).replace(/'/g, '&#39;'); }

  bindEvents();
  if (state.token && state.apiUrl) loadData().then(showAdmin).catch(() => logout());
})();
