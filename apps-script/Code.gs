/**
 * Backend ligero para el panel de administración del Consejo Estatal de Bordadoras.
 *
 * 1) Pega este archivo en script.google.com.
 * 2) Configura Script Properties:
 *    SPREADSHEET_ID       ID del Google Sheet del catálogo
 *    IMAGES_FOLDER_ID     ID de la carpeta de Drive donde se guardarán las imágenes
 *    ADMIN_PASSWORD       Contraseña de administración
 *    OPTIONAL_PUBLIC_BASE_URL  Opcional. Si se omite usa https://lh3.googleusercontent.com/d/{id}
 * 3) Deploy > New deployment > Web app.
 *    Execute as: Me
 *    Who has access: Anyone
 */

const SHEETS = {
  productos: 'Productos',
  bordadoras: 'Bordadoras',
  consejeras: 'Consejeras',
  listas: 'Listas',
  configuracion: 'Configuración'
};

const HEADERS = {
  productos: ['ID','Bordadora ID','Estado','Destacado','Nombre de la pieza','Categoría','Técnica','Descripción','Materiales','Medidas','Tiempo de elaboración','Precio (MXN)','Nombre del archivo de foto','URL de foto (automático)','Bordadora','Municipio','Localidad','WhatsApp (10 dígitos)','Link de WhatsApp (automático)','Fecha de alta','Notas internas'],
  bordadoras: ['ID','Nombre completo','Es consejera','Municipio','Localidad','WhatsApp','Técnica principal','Años de experiencia','Nombre del archivo de foto','URL de foto (automático)','Biografía breve'],
  consejeras: ['ID','Bordadora ID','Nombre completo','Municipio','Localidad','Edad','Años de experiencia','Cargo en el Consejo','Colectivo o marca','Nombre del archivo de foto','URL de foto (automático)','Biografía']
};

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const action = payload.action;
    if (action === 'login') return json(login_(payload.password));
    requireAuth_(payload.token);

    if (action === 'getInit') return json({ ok: true, data: getInit_() });
    if (action === 'debugDrive') return json({ ok: true, debug: debugDrive_() });
    if (action === 'getNextId') return json({ ok: true, id: getNextIdForType_(payload.type, payload.prefix) });
    if (action === 'saveProduct') return json({ ok: true, rows: saveRecord_('productos', payload.record, 'P') });
    if (action === 'saveBordadora') return json({ ok: true, rows: saveRecord_('bordadoras', payload.record, 'B') });
    if (action === 'saveConsejera') return json({ ok: true, rows: saveRecord_('consejeras', payload.record, 'C') });
    if (action === 'deleteProduct') return json({ ok: true, rows: deleteRecord_('productos', payload.id) });
    if (action === 'deleteBordadora') return json({ ok: true, rows: deleteRecord_('bordadoras', payload.id) });
    if (action === 'deleteConsejera') return json({ ok: true, rows: deleteRecord_('consejeras', payload.id) });
    if (action === 'saveLists') return json({ ok: true, listas: saveLists_(payload.listas || {}) });
    if (action === 'saveConfig') return json({ ok: true, rows: saveConfig_(payload.rows || []) });
    if (action === 'uploadImage') return json({ ok: true, file: uploadImage_(payload) });

    throw new Error('Acción no reconocida: ' + action);
  } catch (err) {
    return json({ ok: false, error: err.message || String(err) });
  }
}

function doGet() {
  return json({ ok: true, message: 'CEBY admin backend activo.' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function ss_() {
  const id = props_().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Falta Script Property SPREADSHEET_ID.');
  return SpreadsheetApp.openById(id);
}

function login_(password) {
  const expected = props_().getProperty('ADMIN_PASSWORD');
  if (!expected) throw new Error('Falta Script Property ADMIN_PASSWORD.');
  if (!password || password !== expected) throw new Error('Contraseña incorrecta.');
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('session_' + token, '1', 21600); // 6 horas
  return { ok: true, token: token };
}

function requireAuth_(token) {
  if (!token || CacheService.getScriptCache().get('session_' + token) !== '1') {
    throw new Error('Sesión vencida o no autorizada. Vuelve a entrar.');
  }
}

function getInit_() {
  const driveMap = getDriveImageMapCached_();
  const productos = enrichImageRows_(readTable_('productos'), driveMap);
  const bordadoras = enrichImageRows_(readTable_('bordadoras'), driveMap);
  const consejeras = enrichImageRows_(readTable_('consejeras'), driveMap);
  return {
    productos: productos,
    bordadoras: bordadoras,
    consejeras: consejeras,
    listas: readLists_(),
    configuracion: readConfig_(),
    _debug: buildDebug_(driveMap, productos, bordadoras, consejeras)
  };
}

function sheet_(key) {
  const sh = ss_().getSheetByName(SHEETS[key]);
  if (!sh) throw new Error('No se encontró la hoja: ' + SHEETS[key]);
  return sh;
}

function readHeaders_(sh) {
  const values = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return values.map(v => String(v || '').trim());
}

function readTable_(key) {
  const sh = sheet_(key);
  const headers = readHeaders_(sh);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const values = sh.getRange(2, 1, lastRow - 1, headers.length).getDisplayValues();
  return values
    .map(row => objectFromRow_(headers, row))
    .filter(obj => Object.values(obj).some(v => String(v || '').trim() !== ''));
}

function objectFromRow_(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { if (h) obj[h] = row[i] || ''; });
  return obj;
}

function getNextIdForType_(type, prefix) {
  const map = { productos: 'P', bordadoras: 'B', consejeras: 'C' };
  const key = type || 'productos';
  const p = prefix || map[key] || 'P';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return nextId_(key, p);
  } finally {
    lock.releaseLock();
  }
}

function saveRecord_(key, record, prefix) {
  if (!record) throw new Error('No se recibió registro.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_(key);
    ensureHeaders_(sh, HEADERS[key]);
    const headers = readHeaders_(sh);
    const idHeader = 'ID';
    const isExistingRecord = record.__isExisting === true || record.__isExisting === 'true';
    delete record.__isExisting;
    let id = String(record.ID || '').trim();
    if (!id) id = nextId_(key, prefix);
    let rowIndex = findRowById_(sh, id, headers.indexOf(idHeader) + 1);
    if (rowIndex && !isExistingRecord) {
      throw new Error('El ID ya existe y no se puede usar para un registro nuevo: ' + id + '. Vuelve a intentar guardar.');
    }
    if (idExistsInOtherRow_(sh, id, headers.indexOf(idHeader) + 1, rowIndex)) {
      throw new Error('El ID ya existe: ' + id);
    }
    if (rowIndex) {
      const existing = objectFromRow_(headers, sh.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0]);
      Object.keys(existing).forEach(function(header) {
        if (record[header] === undefined) record[header] = existing[header];
      });
    }
    record.ID = id;
    if (key === 'productos') {
      const allowedStates = ['Borrador', 'Publicada'];
      if (allowedStates.indexOf(String(record.Estado || '').trim()) === -1) record.Estado = 'Borrador';
    }
    normalizeRelations_(key, record);
    validateRecord_(key, record);
    applyAutomatics_(key, record);

    const values = headers.map(h => record[h] !== undefined ? record[h] : '');
    if (rowIndex) {
      sh.getRange(rowIndex, 1, 1, headers.length).setValues([values]);
    } else {
      sh.appendRow(values);
    }
    if (key === 'consejeras') markBordadoraAsConsejera_(record['Bordadora ID']);
    return enrichImageRows_(readTable_(key), getDriveImageMapCached_());
  } finally {
    lock.releaseLock();
  }
}

function idExistsInOtherRow_(sh, id, idCol, currentRow) {
  if (!idCol || idCol < 1) return false;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return false;
  const ids = sh.getRange(2, idCol, lastRow - 1, 1).getDisplayValues().flat();
  return ids.some(function(v, i) {
    const row = i + 2;
    return String(v).trim() === String(id).trim() && row !== currentRow;
  });
}

function validateRecord_(key, record) {
  if (key !== 'productos') return;

  const missing = [];
  if (!String(record['Nombre de la pieza'] || '').trim()) missing.push('nombre del producto');
  if (!String(record['Descripción'] || '').trim()) missing.push('descripción');
  if (!String(record['Medidas'] || '').trim()) missing.push('medidas');
  if (!String(record['Precio (MXN)'] || '').trim() || Number(record['Precio (MXN)']) <= 0) missing.push('precio');
  if (!String(record['Nombre del archivo de foto'] || '').trim() && !String(record['URL de foto (automático)'] || '').trim()) missing.push('foto');
  if (!String(record['Bordadora ID'] || '').trim()) missing.push('bordadora registrada');

  if (missing.length) {
    throw new Error('No se puede guardar el producto. Falta: ' + missing.join(', ') + '.');
  }
}

function normalizeRelations_(key, record) {
  if (key === 'productos') {
    const b = findBordadoraForRecord_(record, 'Bordadora');
    if (!b) throw new Error('Selecciona una bordadora registrada antes de guardar el producto.');
    record['Bordadora ID'] = b.ID;
    record['Bordadora'] = b['Nombre completo'];
    record['Municipio'] = b.Municipio || '';
    record['Localidad'] = b.Localidad || '';
    record['WhatsApp (10 dígitos)'] = b.WhatsApp || record['WhatsApp (10 dígitos)'] || '';
  }
  if (key === 'consejeras') {
    const b = findBordadoraForRecord_(record, 'Nombre completo');
    if (!b) throw new Error('Solo puedes registrar como consejera a una bordadora previamente dada de alta.');
    record['Bordadora ID'] = b.ID;
    record['Nombre completo'] = b['Nombre completo'];
    record['Municipio'] = b.Municipio || '';
    record['Localidad'] = b.Localidad || '';
    record['Años de experiencia'] = record['Años de experiencia'] || b['Años de experiencia'] || '';
    record['Nombre del archivo de foto'] = record['Nombre del archivo de foto'] || b['Nombre del archivo de foto'] || '';
    record['URL de foto (automático)'] = record['URL de foto (automático)'] || b['URL de foto (automático)'] || '';
  }
}

function findBordadoraForRecord_(record, nameField) {
  const rows = readTable_('bordadoras');
  const id = String(record['Bordadora ID'] || '').trim();
  const name = String(record[nameField] || record['Bordadora'] || record['Nombre completo'] || '').trim();
  return rows.find(function(r) {
    return (id && String(r.ID || '').trim() === id) ||
      (name && normalizePersonKey_(r['Nombre completo']) === normalizePersonKey_(name));
  }) || null;
}

function normalizePersonKey_(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

function markBordadoraAsConsejera_(bordadoraId) {
  if (!bordadoraId) return;
  const sh = sheet_('bordadoras');
  const headers = readHeaders_(sh);
  const idCol = headers.indexOf('ID') + 1;
  const rowIndex = findRowById_(sh, bordadoraId, idCol);
  const col = headers.indexOf('Es consejera') + 1;
  if (rowIndex && col) sh.getRange(rowIndex, col).setValue('Sí');
}

function ensureHeaders_(sh, wanted) {
  const existing = readHeaders_(sh);
  const missing = wanted.filter(h => existing.indexOf(h) === -1);
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
  }
}

function findRowById_(sh, id, idCol) {
  if (!idCol || idCol < 1) throw new Error('La tabla no tiene columna ID.');
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sh.getRange(2, idCol, lastRow - 1, 1).getDisplayValues().flat();
  const idx = ids.findIndex(v => String(v).trim() === String(id).trim());
  return idx >= 0 ? idx + 2 : 0;
}

function nextId_(key, prefix) {
  const rows = readTable_(key);
  const re = new RegExp('^' + prefix + '(\\d+)$', 'i');
  const used = new Set();
  let max = 0;
  rows.forEach(function(r) {
    const id = String(r.ID || '').trim();
    if (!id) return;
    used.add(id.toUpperCase());
    const m = id.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  });
  let n = max + 1;
  let candidate = prefix + String(n).padStart(3, '0');
  while (used.has(candidate.toUpperCase())) {
    n++;
    candidate = prefix + String(n).padStart(3, '0');
  }
  return candidate;
}

function applyAutomatics_(key, record) {
  if (key === 'productos') {
    const whatsapp = onlyDigits_(record['WhatsApp (10 dígitos)']);
    if (whatsapp) record['Link de WhatsApp (automático)'] = 'https://wa.me/52' + whatsapp;
    if (!record['Fecha de alta']) record['Fecha de alta'] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  if ((key === 'bordadoras') && record['WhatsApp']) {
    record['WhatsApp'] = onlyDigits_(record['WhatsApp']);
  }
}

function onlyDigits_(value) {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

function deleteRecord_(key, id) {
  const sh = sheet_(key);
  const headers = readHeaders_(sh);
  const idCol = headers.indexOf('ID') + 1;
  const rowIndex = findRowById_(sh, id, idCol);
  if (!rowIndex) throw new Error('No se encontró el registro ' + id);

  if (key === 'bordadoras') {
    const bordadoraRow = objectFromRow_(headers, sh.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0]);
    const bordadoraName = normalizePersonKey_(bordadoraRow['Nombre completo']);
    const productRefs = readTable_('productos').filter(function(r) {
      return String(r['Bordadora ID'] || '').trim() === String(id).trim() ||
        (bordadoraName && normalizePersonKey_(r.Bordadora) === bordadoraName);
    });
    const councilRefs = readTable_('consejeras').filter(function(r) {
      return String(r['Bordadora ID'] || '').trim() === String(id).trim() ||
        (bordadoraName && normalizePersonKey_(r['Nombre completo']) === bordadoraName);
    });
    if (productRefs.length || councilRefs.length) {
      throw new Error('No se puede eliminar esta bordadora porque está vinculada con ' + productRefs.length + ' producto(s) y ' + councilRefs.length + ' consejera(s). Elimina o reasigna primero esos registros.');
    }
  }

  let linkedBordadoraId = '';
  if (key === 'consejeras') {
    const councilRow = objectFromRow_(headers, sh.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0]);
    linkedBordadoraId = String(councilRow['Bordadora ID'] || '').trim();
    if (!linkedBordadoraId) {
      const linked = findBordadoraForRecord_(councilRow, 'Nombre completo');
      linkedBordadoraId = linked ? linked.ID : '';
    }
  }

  sh.deleteRow(rowIndex);

  if (key === 'consejeras' && linkedBordadoraId) {
    const remaining = readTable_('consejeras').some(function(r) { return String(r['Bordadora ID'] || '').trim() === linkedBordadoraId; });
    if (!remaining) setBordadoraConsejera_(linkedBordadoraId, 'No');
  }

  return enrichImageRows_(readTable_(key), getDriveImageMapCached_());
}

function setBordadoraConsejera_(bordadoraId, value) {
  if (!bordadoraId) return;
  const sh = sheet_('bordadoras');
  const headers = readHeaders_(sh);
  const rowIndex = findRowById_(sh, bordadoraId, headers.indexOf('ID') + 1);
  const col = headers.indexOf('Es consejera') + 1;
  if (rowIndex && col) sh.getRange(rowIndex, col).setValue(value || 'No');
}

function saveLists_(listas) {
  const sh = sheet_('listas');
  const allowed = ['Categorías', 'Técnicas', 'Estados'];
  const existingHeaders = readHeaders_(sh);

  allowed.forEach(function(name) {
    if (!Object.prototype.hasOwnProperty.call(listas, name)) return;
    let values = Array.isArray(listas[name]) ? listas[name] : [];
    values = values.map(function(v) { return String(v || '').trim(); }).filter(Boolean);
    if (name === 'Estados') values = ['Borrador', 'Publicada'];

    let col = existingHeaders.indexOf(name) + 1;
    if (!col) {
      col = sh.getLastColumn() + 1;
      sh.getRange(1, col).setValue(name);
      existingHeaders.push(name);
    }
    const rowsToClear = Math.max(sh.getMaxRows() - 1, 1);
    sh.getRange(2, col, rowsToClear, 1).clearContent();
    if (values.length) sh.getRange(2, col, values.length, 1).setValues(values.map(function(v) { return [v]; }));
  });
  return readLists_();
}

function readLists_() {
  const sh = sheet_('listas');
  const headers = readHeaders_(sh);
  const lastRow = sh.getLastRow();
  const out = {};
  headers.forEach((h, colIndex) => {
    if (!h) return;
    if (lastRow < 2) { out[h] = []; return; }
    out[h] = sh.getRange(2, colIndex + 1, lastRow - 1, 1).getDisplayValues().flat().filter(Boolean);
  });
  return out;
}

function readConfig_() {
  const sh = sheet_('configuracion');
  const values = sh.getDataRange().getDisplayValues();
  const headerRow = values.findIndex(row => String(row[0]).trim().toLowerCase().indexOf('clave') === 0);
  const start = headerRow >= 0 ? headerRow + 1 : 1;
  const rows = [];
  for (let i = start; i < values.length; i++) {
    const key = values[i][0];
    if (key) rows.push({ Clave: key, Valor: values[i][1] || '' });
  }
  return rows;
}

function saveConfig_(rows) {
  const sh = sheet_('configuracion');
  const values = sh.getDataRange().getDisplayValues();
  const headerRow = values.findIndex(row => String(row[0]).trim().toLowerCase().indexOf('clave') === 0);
  const startRow = (headerRow >= 0 ? headerRow + 2 : 2);
  const current = readConfig_();
  const allowed = new Set(current.map(r => r.Clave));
  rows.forEach((r, idx) => {
    if (!allowed.has(r.Clave)) throw new Error('Clave de configuración no permitida: ' + r.Clave);
    sh.getRange(startRow + idx, 1, 1, 2).setValues([[r.Clave, r.Valor || '']]);
  });
  return readConfig_();
}

function uploadImage_(payload) {
  const folderId = props_().getProperty('IMAGES_FOLDER_ID');
  if (!folderId) throw new Error('Falta Script Property IMAGES_FOLDER_ID.');
  if (!payload.data) throw new Error('No se recibió imagen.');
  if (!payload.recordId) throw new Error('Falta ID del registro para nombrar la imagen.');

  const folder = DriveApp.getFolderById(folderId);
  const ext = extensionFrom_(payload.filename, payload.mimeType);
  const name = buildImageFilename_(payload.recordId, payload.title || payload.entity || 'imagen', ext);

  if (payload.replaceExisting) trashExistingFilesByName_(folder, name);

  const blob = Utilities.newBlob(Utilities.base64Decode(payload.data), payload.mimeType || 'image/jpeg', name);
  const file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}
  const id = file.getId();
  try { CacheService.getScriptCache().remove('drive_image_map_v1'); CacheService.getScriptCache().remove('drive_image_map_v2'); } catch (err) {}
  const url = buildPublicUrl_(id);
  return { id: id, name: name, url: url };
}

function buildImageFilename_(recordId, title, ext) {
  const id = String(recordId || '').trim().toUpperCase();
  const slug = slugFilenamePart_(title || 'imagen');
  return id + '_' + slug + '_01' + ext;
}

function trashExistingFilesByName_(folder, name) {
  const files = folder.getFilesByName(name);
  while (files.hasNext()) {
    try { files.next().setTrashed(true); } catch (err) {}
  }
}

function slugFilenamePart_(value) {
  return String(value || 'imagen')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'imagen';
}

function debugDrive_() {
  const driveMap = getDriveImageMapCached_();
  const productos = enrichImageRows_(readTable_('productos'), driveMap);
  const bordadoras = enrichImageRows_(readTable_('bordadoras'), driveMap);
  const consejeras = enrichImageRows_(readTable_('consejeras'), driveMap);
  return buildDebug_(driveMap, productos, bordadoras, consejeras);
}

function buildDebug_(driveMap, productos, bordadoras, consejeras) {
  const exactNames = Object.keys((driveMap && driveMap.exact) || {});
  const allRows = [].concat(productos || [], bordadoras || [], consejeras || []);
  const sheetNames = allRows.map(function(r) { return String(r['Nombre del archivo de foto'] || '').trim(); }).filter(Boolean);
  const unresolved = allRows
    .filter(function(r) { return String(r['Nombre del archivo de foto'] || '').trim() && !r.__resolvedImageUrl; })
    .slice(0, 15)
    .map(function(r) { return {
      id: r.ID || '',
      name: r['Nombre del archivo de foto'] || '',
      normalized: normalizeImageKey_(r['Nombre del archivo de foto'] || ''),
      title: r['Nombre de la pieza'] || r['Nombre completo'] || ''
    }; });

  return {
    driveImageCount: (driveMap && driveMap.count) || exactNames.length,
    sampleDriveNames: exactNames.slice(0, 20),
    sampleSheetNames: sheetNames.slice(0, 20),
    unresolvedCount: allRows.filter(function(r) { return String(r['Nombre del archivo de foto'] || '').trim() && !r.__resolvedImageUrl; }).length,
    unresolvedSamples: unresolved
  };
}

function getDriveImageMapCached_() {
  const cacheKey = 'drive_image_map_v2';
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (err) {}
  }

  const folderId = props_().getProperty('IMAGES_FOLDER_ID');
  if (!folderId) throw new Error('Falta Script Property IMAGES_FOLDER_ID.');

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const map = { exact: {}, normalized: {}, count: 0 };

  while (files.hasNext()) {
    const file = files.next();
    const mime = String(file.getMimeType() || '');
    if (mime.indexOf('image/') !== 0) continue;

    const name = String(file.getName() || '').trim();
    const url = buildPublicUrl_(file.getId());

    map.count++;
    map.exact[name] = url;
    map.normalized[normalizeImageKey_(name)] = url;
  }

  try {
    cache.put(cacheKey, JSON.stringify(map), 600); // 10 minutos
  } catch (err) {}
  return map;
}

function enrichImageRows_(rows, driveMap) {
  return (rows || []).map(function(row) {
    const copy = {};
    Object.keys(row || {}).forEach(function(key) { copy[key] = row[key]; });
    const resolved = resolveImageUrl_(copy, driveMap);
    if (resolved) copy.__resolvedImageUrl = resolved;
    return copy;
  });
}

function resolveImageUrl_(row, driveMap) {
  const explicitUrl = String(row['URL de foto (automático)'] || row['URL de foto'] || '').trim();
  if (isDirectImageUrl_(explicitUrl)) return explicitUrl;

  const rawName = String(row['Nombre del archivo de foto'] || '').trim();
  if (!rawName) return '';

  const candidates = candidateImageNames_(rawName);
  for (var i = 0; i < candidates.length; i++) {
    var name = candidates[i];
    if (driveMap.exact && driveMap.exact[name]) return driveMap.exact[name];

    var normalized = normalizeImageKey_(name);
    if (driveMap.normalized && driveMap.normalized[normalized]) return driveMap.normalized[normalized];
  }
  return '';
}

function candidateImageNames_(rawName) {
  const clean = String(rawName || '').trim();
  if (!clean) return [];
  const parts = clean.split('/');
  const basename = parts[parts.length - 1].trim();
  const decoded = safeDecodeURIComponent_(basename);
  const normalized = decoded.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out = [];
  [clean, basename, decoded, normalized].forEach(function(v) {
    if (v && out.indexOf(v) === -1) out.push(v);
  });
  return out;
}

function normalizeImageKey_(value) {
  return String(value || '')
    .trim()
    .split('/').pop()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDecodeURIComponent_(value) {
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return value;
  }
}

function isDirectImageUrl_(value) {
  const v = String(value || '').trim();
  return /^https?:\/\//i.test(v) || /^data:image\//i.test(v) || /^blob:/i.test(v);
}

function buildPublicUrl_(id) {
  const customBase = props_().getProperty('OPTIONAL_PUBLIC_BASE_URL');
  return customBase ? customBase.replace('{id}', id) : 'https://lh3.googleusercontent.com/d/' + id;
}

function extensionFrom_(filename, mimeType) {
  const m = String(filename || '').toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/);
  if (m) return '.' + m[1];
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';
  return '.jpg';
}

function sanitizeFilename_(value) {
  return String(value || 'imagen')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
