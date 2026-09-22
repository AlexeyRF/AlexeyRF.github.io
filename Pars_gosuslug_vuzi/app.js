document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const filesConfigGroup = document.getElementById('files-config-group');
    const filesList = document.getElementById('files-list');
    const processBtn = document.getElementById('process-btn');
    const downloadExcelBtn = document.getElementById('download-excel-btn');
    const userCodeInput = document.getElementById('user-code');
    const placeholder = document.getElementById('placeholder');
    const resultsArea = document.getElementById('results');

    let loadedFiles = []; // { name: string, file: File, spots: number, isTarget: boolean, data: Array, parsedOutput: Array }
    let globalUserCode = -1;


    // --- Drag and Drop Logic ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    async function handleFiles(files) {
        const validFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.csv'));
        if (validFiles.length === 0) return;

        const loadingMsg = document.createElement('div');
        loadingMsg.style = 'padding: 10px; color: var(--text-secondary);';
        loadingMsg.id = 'loading-msg';
        loadingMsg.textContent = 'Анализ файлов на дубликаты...';
        filesList.appendChild(loadingMsg);
        
        const fileReadPromises = validFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve({ file, text: e.target.result });
                reader.onerror = () => resolve({ file, text: null });
                reader.readAsText(file);
            });
        });

        const results = await Promise.all(fileReadPromises);

        const loadingEl = document.getElementById('loading-msg');
        if (loadingEl) loadingEl.remove();
        
        const uniqueFiles = [];
        const seenContent = new Set();
        
        for (const res of results) {
            if (res.text !== null) {
                const isDuplicateName = loadedFiles.some(f => f.name === res.file.name);
                if (!isDuplicateName && !seenContent.has(res.text)) {
                    seenContent.add(res.text);
                    uniqueFiles.push(res);
                }
            }
        }
        
        uniqueFiles.forEach(({file, text}) => {
            const index = loadedFiles.length;
            loadedFiles.push({
                name: file.name,
                file: file,
                spots: 25, // default
                university: '1', // default to Vuz 1
                data: parseCSVText(text),
                parsedOutput: null
            });

            const configItem = document.createElement('div');
            configItem.className = 'file-config-item';
            configItem.innerHTML = `
                <div class="file-name">${file.name}</div>
                <div class="file-spots-row">
                    <label>Вуз:</label>
                    <select class="univ-input" data-index="${index}" style="margin-right: 10px; padding: 2px;">
                        <option value="1">Вуз 1</option>
                        <option value="2">Вуз 2</option>
                        <option value="3">Вуз 3</option>
                        <option value="4">Вуз 4</option>
                        <option value="5">Вуз 5</option>
                    </select>
                    <label>КЦП (мест):</label>
                    <input type="number" class="number-input spot-input" data-index="${index}" value="25" min="1">
                </div>
            `;
            filesList.appendChild(configItem);

            const inputEl = configItem.querySelector('.spot-input');
            if (inputEl) {
                inputEl.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    loadedFiles[idx].spots = parseInt(e.target.value) || 25;
                });
            }

            const univEl = configItem.querySelector('.univ-input');
            if (univEl) {
                univEl.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    loadedFiles[idx].university = e.target.value;
                });
            }
        });

        filesConfigGroup.style.display = 'block';
        updateProcessButton();
        downloadExcelBtn.classList.add('hidden'); // Hide download button if new files loaded
    }

    userCodeInput.addEventListener('input', updateProcessButton);

    function updateProcessButton() {
        const userCode = userCodeInput.value.trim();
        processBtn.disabled = !(loadedFiles.length > 0 && userCode !== '');
    }

    // --- CSV Parser ---
    function parseCSVText(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return [];
        
        const header = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const rowStr = lines[i];
            const row = rowStr.split(';');
            const obj = {};
            header.forEach((h, idx) => {
                let val = row[idx] ? row[idx].trim() : '';
                obj[h] = val.replace(/^"|"$/g, '');
            });
            data.push(obj);
        }
        return data;
    }

    function readCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                let text = e.target.result;
                resolve(parseCSVText(text));
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // --- Process Logic ---
    processBtn.addEventListener('click', async () => {
        globalUserCode = parseInt(userCodeInput.value.trim());
        processBtn.disabled = true;
        processBtn.textContent = 'Анализ...';

        try {
            // Read all files
            for (let f of loadedFiles) {
                if (!f.data) {
                    f.data = await readCSVFile(f.file);
                }
            }

            analyzeData(globalUserCode, loadedFiles);
            
            // Render HTML tables
            placeholder.classList.add('hidden');
            resultsArea.classList.remove('hidden');
            resultsArea.innerHTML = renderHTML(loadedFiles);
            
            // Generate Excel blob and trigger auto-download
            await createAndDownloadExcel(loadedFiles);

            // Show manual download button
            downloadExcelBtn.classList.remove('hidden');

        } catch (err) {
            alert('Ошибка при чтении файлов: ' + err.message);
            console.error(err);
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = 'Анализировать списки';
        }
    });

    downloadExcelBtn.addEventListener('click', async () => {
        downloadExcelBtn.disabled = true;
        downloadExcelBtn.textContent = 'Генерация...';
        await createAndDownloadExcel(loadedFiles);
        downloadExcelBtn.disabled = false;
        downloadExcelBtn.textContent = 'Скачать Excel (.xlsx)';
    });

    function analyzeData(userCode, filesData) {
        for (let i = 0; i < filesData.length; i++) {
            const currentFile = filesData[i];
            const df = currentFile.data;

            let userPos = -1;
            // Find user
            for (let r = 0; r < df.length; r++) {
                let idCol = df[r]['ID участника'] || df[r]['Код поступающего'];
                if (parseInt(idCol) === userCode) {
                    userPos = r;
                    break;
                }
            }

            let shouldDisplay = userPos !== -1;

            if (!shouldDisplay) {
                currentFile.parsedOutput = null;
                continue;
            }

            const tableData = [];
            let realCompetitorsAbove = 0;
            let maybeCompetitorsAbove = 0;

            for (let r = 0; r < df.length; r++) {
                const row = df[r];
                const pCodeStr = row['ID участника'] || row['Код поступающего'];
                if (!pCodeStr) continue;
                const pCode = parseInt(pCodeStr);
                const currentPriority = parseInt(row['Приоритет конкурса']);
                const score = row['Сумма баллов'] || '';
                const consent = row['Подано согласие'] || '';

                if (pCode === userCode) {
                    tableData.push({
                        no: r + 1,
                        id: pCode + ' (ВЫ)',
                        score: score,
                        priority: currentPriority,
                        consent: consent,
                        isCompetitor: 'ЭТО ВЫ',
                        isDirectCompetitor: 'ЭТО ВЫ',
                        reason: '',
                        stateClass: 'row-you',
                        fillColor: 'FFFFEB9C' // Yellow
                    });
                    continue;
                }

                let isCompetitor = "Да";
                let passReason = "";
                let stateClass = "row-competitor";
                let fillColor = 'FFFFC7CE'; // Red

                const expectedPriorities = new Set();
                for (let p = 1; p < currentPriority; p++) {
                    expectedPriorities.add(p);
                }
                const foundPriorities = new Set();
                let passesSomewhere = false;

                // Search in other files
                for (let j = 0; j < filesData.length; j++) {
                    if (i === j) continue;
                    const otherFile = filesData[j];
                    const otherDf = otherFile.data;
                    const isSameUniversity = currentFile.university === otherFile.university;
                    
                    // Find person in other file
                    for (let or = 0; or < otherDf.length; or++) {
                        let otherIdCol = otherDf[or]['ID участника'] || otherDf[or]['Код поступающего'];
                        if (parseInt(otherIdCol) === pCode) {
                            const otherPriority = parseInt(otherDf[or]['Приоритет конкурса']);
                            const otherConsentStr = otherDf[or]['Подано согласие'] || '';
                            const otherConsent = otherConsentStr.trim().toLowerCase();
                            
                            if (isSameUniversity) {
                                foundPriorities.add(otherPriority);

                                if (otherPriority < currentPriority) {
                                    if (or < otherFile.spots) {
                                        passesSomewhere = true;
                                        passReason = `Проходит по ${otherPriority} приор. в ${otherFile.name.replace(/\.csv$/i, "")}`;
                                        break;
                                    }
                                }
                            } else {
                                const hasOtherConsent = otherConsent !== '' && !['-', '—', '–', 'нет', 'не подано'].includes(otherConsent);
                                if (hasOtherConsent && or < otherFile.spots) {
                                    passesSomewhere = true;
                                    passReason = `Подано согласие и проходит в ${otherFile.name.replace(/\.csv$/i, "")}`;
                                    break;
                                }
                            }
                        }
                    }
                    if (passesSomewhere) break;
                }

                if (passesSomewhere) {
                    isCompetitor = "Нет";
                    stateClass = "row-no-competitor";
                    fillColor = 'FFC6EFCE'; // Green
                } else {
                    let missingPriorities = [...expectedPriorities].filter(x => !foundPriorities.has(x));
                    if (missingPriorities.length > 0) {
                        isCompetitor = "?";
                        passReason = `Нет информации по приоритету для вуза зачисления`;
                        stateClass = "row-unknown";
                        fillColor = 'FFE0E0E0'; // Gray
                    }
                }

                let isDirectCompetitor = "Нет";
                const consentLower = consent.trim().toLowerCase();
                const hasConsent = consentLower !== '' && !['-', '—', '–', 'нет', 'не подано'].includes(consentLower);
                if (isCompetitor === 'Да' && hasConsent) {
                    isDirectCompetitor = 'Да';
                } else if (isCompetitor === '?' && hasConsent) {
                    isDirectCompetitor = '?';
                }

                tableData.push({
                    no: r + 1,
                    id: pCode,
                    score: score,
                    priority: currentPriority,
                    consent: consent,
                    isCompetitor: isCompetitor,
                    isDirectCompetitor: isDirectCompetitor,
                    reason: passReason,
                    stateClass: stateClass,
                    fillColor: fillColor
                });

                if (userPos !== -1 && (r + 1) <= (userPos + 1)) {
                    if (isCompetitor === 'Да') realCompetitorsAbove++;
                    if (isCompetitor === '?') maybeCompetitorsAbove++;
                }
            }

            currentFile.parsedOutput = {
                tableData,
                userPos,
                realCompetitorsAbove,
                maybeCompetitorsAbove
            };
        }
    }

    function renderHTML(filesData) {
        let html = '';

        for (let i = 0; i < filesData.length; i++) {
            const currentFile = filesData[i];
            const spots = currentFile.spots;
            const sheetName = currentFile.name.replace(/\.csv$/i, "");
            const parsed = currentFile.parsedOutput;
            
            if (!parsed) continue;
            
            const { tableData, userPos, realCompetitorsAbove, maybeCompetitorsAbove } = parsed;

            let summaryHTML = '';
            if (userPos !== -1) {
                summaryHTML = `
                    <div class="result-summary">
                        <span>Мест: ${spots}</span>
                        <span>В списке: ${tableData.length}</span>
                        <span>Изначальное место: ${userPos + 1}</span><br>
                        <span style="color: #ff99a8;">Точных конкурентов выше: ${realCompetitorsAbove}</span>
                        <span style="color: #c9c9c9;">Под вопросом (?): ${maybeCompetitorsAbove}</span><br>
                        <span class="highlight-pos">Ваше реальное место: от ${realCompetitorsAbove + 1} до ${realCompetitorsAbove + maybeCompetitorsAbove + 1}</span>
                    </div>
                `;
            } else {
                summaryHTML = `
                    <div class="result-summary">
                        <span>Мест: ${spots}</span>
                        <span>В списке: ${tableData.length}</span><br>
                        <span style="color: #ff99a8;">Вас нет в этом списке</span>
                    </div>
                `;
            }

            let rowsHTML = tableData.map(t => `
                <tr class="${t.stateClass}">
                    <td>${t.no}</td>
                    <td>${t.id}</td>
                    <td>${t.score}</td>
                    <td>${t.priority}</td>
                    <td>${t.consent}</td>
                    <td>${t.isCompetitor}</td>
                    <td>${t.isDirectCompetitor}</td>
                    <td>${t.reason}</td>
                </tr>
            `).join('');

            html += `
                <section class="result-section">
                    <div class="result-header">
                        <h3>${sheetName}</h3>
                        ${summaryHTML}
                    </div>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>№</th>
                                    <th>ID участника</th>
                                    <th>Баллы</th>
                                    <th>Приоритет</th>
                                    <th>Заявление</th>
                                    <th>Конкурент?</th>
                                    <th>Прямой конкурент</th>
                                    <th>Причина</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHTML}
                            </tbody>
                        </table>
                    </div>
                </section>
            `;
        }
        return html;
    }

    async function createAndDownloadExcel(filesData) {
        // Create a new workbook and add a worksheet
        const workbook = new ExcelJS.Workbook();
        let hasSheets = false;
        let sheetNames = new Set();
        
        for (let i = 0; i < filesData.length; i++) {
            const currentFile = filesData[i];
            const parsed = currentFile.parsedOutput;
            if (!parsed) continue;

            hasSheets = true;
            let baseName = currentFile.name.replace(/\.csv$/i, "").substring(0, 31); // Max 31 chars
            let sheetName = baseName;
            let counter = 1;
            while (sheetNames.has(sheetName)) {
                let suffix = `_${counter}`;
                sheetName = baseName.substring(0, 31 - suffix.length) + suffix;
                counter++;
            }
            sheetNames.add(sheetName);
            const worksheet = workbook.addWorksheet(sheetName);

            // Add columns
            worksheet.columns = [
                { header: '№', key: 'no', width: 5 },
                { header: 'ID участника', key: 'id', width: 20 },
                { header: 'Баллы', key: 'score', width: 10 },
                { header: 'Приоритет здесь', key: 'priority', width: 18 },
                { header: 'Заявление', key: 'consent', width: 15 },
                { header: 'Конкурент?', key: 'isCompetitor', width: 15 },
                { header: 'Прямой конкурент', key: 'isDirectCompetitor', width: 18 },
                { header: 'Причина', key: 'reason', width: 60 }
            ];

            // Add rows
            parsed.tableData.forEach(rowData => {
                const row = worksheet.addRow({
                    no: rowData.no,
                    id: rowData.id,
                    score: rowData.score,
                    priority: rowData.priority,
                    consent: rowData.consent,
                    isCompetitor: rowData.isCompetitor,
                    isDirectCompetitor: rowData.isDirectCompetitor,
                    reason: rowData.reason
                });

                // Fill color
                if (rowData.fillColor) {
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: rowData.fillColor }
                        };
                    });
                }
            });
        }

        if (!hasSheets) {
            alert('Среди загруженных списков нет ни одного, где бы вы присутствовали.');
            return;
        }

        // Generate buffer and trigger download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agro_competitors.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
});
