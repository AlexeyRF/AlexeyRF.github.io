document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const sourcePreview = document.getElementById('source-preview');
    const changeImageBtn = document.getElementById('change-image-btn');
    const uploadPrompt = document.querySelector('.upload-prompt');
    
    const charPreset = document.getElementById('char-preset');
    const customCharsContainer = document.getElementById('custom-chars-container');
    const customChars = document.getElementById('custom-chars');
    const invertChars = document.getElementById('invert-chars');
    
    const artWidth = document.getElementById('art-width');
    const widthVal = document.getElementById('width-val');
    const charAspect = document.getElementById('char-aspect');
    const aspectVal = document.getElementById('aspect-val');
    
    const contrast = document.getElementById('contrast');
    const contrastVal = document.getElementById('contrast-val');
    const brightness = document.getElementById('brightness');
    const brightnessVal = document.getElementById('brightness-val');
    
    const colorMode = document.getElementById('color-mode');
    const fontSize = document.getElementById('font-size');
    const fontSizeVal = document.getElementById('font-size-val');
    const lineHeight = document.getElementById('line-height');
    const lineHeightVal = document.getElementById('line-height-val');
    const bgColor = document.getElementById('bg-color');
    const textColor = document.getElementById('text-color');
    const textColorContainer = document.getElementById('text-color-container');
    const fontSizeContainer = document.getElementById('font-size-container');
    
    const copyBtn = document.getElementById('copy-btn');
    const downloadTxtBtn = document.getElementById('download-txt-btn');
    const downloadHtmlBtn = document.getElementById('download-html-btn');
    const downloadImgBtn = document.getElementById('download-img-btn');
    
    const artInfo = document.getElementById('art-info');
    const fitScreenBtn = document.getElementById('fit-screen-btn');
    const wrapTextBtn = document.getElementById('wrap-text-btn');
    const asciiOutput = document.getElementById('ascii-output');
    const artViewer = document.getElementById('art-viewer');
    
    const processCanvas = document.getElementById('process-canvas');
    const exportCanvas = document.getElementById('export-canvas');
    
    // Application State
    let loadedImage = null;
    let asciiData = {
        text: '',
        html: '',
        ansi: '',
        grid: [], // 2D array of {char, r, g, b}
        width: 0,
        height: 0
    };

    // Character Presets (from dark/dense to light/sparse)
    const PRESETS = {
        standard: '@%#*+=-:. ',
        dense: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
        blocks: '█▓▒░ ',
        binary: '01',
        minimal: '#+- '
    };

    // -------------------------------------------------------------
    // Event Listeners for UI Controls
    // -------------------------------------------------------------
    
    // Character presets change
    charPreset.addEventListener('change', () => {
        if (charPreset.value === 'custom') {
            customCharsContainer.classList.remove('hidden');
        } else {
            customCharsContainer.classList.add('hidden');
        }
        generateAscii();
    });
    
    customChars.addEventListener('input', generateAscii);
    invertChars.addEventListener('change', generateAscii);
    
    // Width Slider
    artWidth.addEventListener('input', () => {
        widthVal.textContent = artWidth.value;
        generateAscii();
    });
    
    // Aspect Ratio Slider
    charAspect.addEventListener('input', () => {
        aspectVal.textContent = charAspect.value;
        generateAscii();
    });
    
    // Contrast Slider
    contrast.addEventListener('input', () => {
        contrastVal.textContent = (contrast.value > 0 ? '+' : '') + contrast.value;
        generateAscii();
    });
    
    // Brightness Slider
    brightness.addEventListener('input', () => {
        brightnessVal.textContent = (brightness.value > 0 ? '+' : '') + brightness.value;
        generateAscii();
    });
    
    // Color Mode Change
    colorMode.addEventListener('change', () => {
        const mode = colorMode.value;
        if (mode === 'mono') {
            textColorContainer.classList.remove('hidden');
            downloadHtmlBtn.classList.add('hidden');
        } else if (mode === 'color-html') {
            textColorContainer.classList.add('hidden');
            downloadHtmlBtn.classList.remove('hidden');
        } else if (mode === 'color-terminal') {
            textColorContainer.classList.add('hidden');
            downloadHtmlBtn.classList.add('hidden');
        }
        updateViewerStyle();
        renderOutput();
    });
    
    // Font sizing
    fontSize.addEventListener('input', () => {
        fontSizeVal.textContent = fontSize.value;
        updateViewerStyle();
    });
    
    lineHeight.addEventListener('input', () => {
        lineHeightVal.textContent = lineHeight.value;
        updateViewerStyle();
    });
    
    // Background and Text colors
    bgColor.addEventListener('input', updateViewerStyle);
    textColor.addEventListener('input', updateViewerStyle);
    
    // View mode controls
    fitScreenBtn.addEventListener('click', () => {
        fitScreenBtn.classList.toggle('active');
        asciiOutput.classList.toggle('fit-screen');
    });
    
    wrapTextBtn.addEventListener('click', () => {
        wrapTextBtn.classList.toggle('active');
        asciiOutput.classList.toggle('wrap');
    });
    
    // -------------------------------------------------------------
    // Drag and Drop & File Upload Actions
    // -------------------------------------------------------------
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('highlight');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('highlight');
        }, false);
    });
    
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });
    
    changeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering file select twice
        fileInput.click();
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите файл изображения.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                loadedImage = img;
                
                // Update Preview UI
                sourcePreview.src = e.target.result;
                sourcePreview.classList.remove('hidden');
                changeImageBtn.classList.remove('hidden');
                uploadPrompt.classList.add('hidden');
                
                // Trigger calculation
                generateAscii();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // -------------------------------------------------------------
    // ASCII Generation Engine
    // -------------------------------------------------------------
    
    function getCharacterSet() {
        let charSet = '';
        if (charPreset.value === 'custom') {
            charSet = customChars.value || ' ';
        } else {
            charSet = PRESETS[charPreset.value];
        }
        
        if (invertChars.checked) {
            return charSet.split('').reverse().join('');
        }
        return charSet;
    }

    function generateAscii() {
        if (!loadedImage) return;
        
        const width = parseInt(artWidth.value);
        const aspect = parseFloat(charAspect.value);
        
        // Calculate output dimensions
        const scale = width / loadedImage.width;
        const height = Math.round(loadedImage.height * scale * aspect);
        
        if (width <= 0 || height <= 0) return;
        
        // Set up processing canvas
        processCanvas.width = width;
        processCanvas.height = height;
        
        const ctx = processCanvas.getContext('2d');
        ctx.drawImage(loadedImage, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // Settings parameters
        const bVal = parseInt(brightness.value); // -100 to 100
        const cVal = parseInt(contrast.value); // -100 to 100
        
        // Contrast correction factor
        // Formula: factor = (259 * (C + 255)) / (255 * (259 - C))
        const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
        
        const charSet = getCharacterSet();
        const charCount = charSet.length;
        
        const grid = [];
        let plainText = '';
        let htmlContent = '';
        let ansiContent = '';
        
        for (let y = 0; y < height; y++) {
            const row = [];
            let htmlRow = '';
            let ansiRow = '';
            
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                let r = pixels[idx];
                let g = pixels[idx + 1];
                let b = pixels[idx + 2];
                // we ignore alpha (pixels[idx + 3]) for simplicity
                
                // 1. Apply Brightness
                r += bVal;
                g += bVal;
                b += bVal;
                
                // 2. Apply Contrast
                r = contrastFactor * (r - 128) + 128;
                g = contrastFactor * (g - 128) + 128;
                b = contrastFactor * (b - 128) + 128;
                
                // Clamp RGB values
                r = Math.max(0, Math.min(255, Math.round(r)));
                g = Math.max(0, Math.min(255, Math.round(g)));
                b = Math.max(0, Math.min(255, Math.round(b)));
                
                // 3. Grayscale calculation (luminance formula)
                const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                
                // Map grayscale value (0-255) to character index
                // Note: Standard mapping is dark background. If background is dark:
                // High brightness (255) -> dense/heavy characters (like @ or █)
                // Low brightness (0) -> light/space characters (like ' ' or .)
                // We reverse the character set if the user checks the 'invert' box.
                const charIndex = Math.floor((gray / 256) * charCount);
                const char = charSet[charIndex] || ' ';
                
                // Store in grid
                row.push({ char, r, g, b });
                
                // Add to plain text
                plainText += char;
                
                // Add to HTML (colored)
                htmlRow += `<span style="color: rgb(${r}, ${g}, ${b})">${escapeHtml(char)}</span>`;
                
                // Add to ANSI (Colored terminal copy)
                // Format: \x1b[38;2;r;g;bm[char]
                ansiRow += `\x1b[38;2;${r};${g};${b}m${char}`;
            }
            
            grid.push(row);
            plainText += '\n';
            htmlContent += htmlRow + '\n';
            ansiContent += ansiRow + '\x1b[0m\n'; // reset color at end of row
        }
        
        asciiData = {
            text: plainText,
            html: htmlContent,
            ansi: ansiContent,
            grid: grid,
            width: width,
            height: height
        };
        
        // Update Info bar
        artInfo.textContent = `Разрешение: ${width}x${height} | Символов: ${width * height}`;
        
        // Render Output in UI
        renderOutput();
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/ /g, '&nbsp;');
    }

    function updateViewerStyle() {
        const bgVal = bgColor.value;
        const textVal = textColor.value;
        const sizeVal = fontSize.value;
        const lhVal = lineHeight.value;
        const mode = colorMode.value;
        
        asciiOutput.style.backgroundColor = bgVal;
        asciiOutput.style.fontSize = sizeVal + 'px';
        asciiOutput.style.lineHeight = lhVal;
        
        if (mode === 'mono') {
            asciiOutput.style.color = textVal;
        } else {
            asciiOutput.style.color = 'inherit';
        }
    }

    function renderOutput() {
        if (!loadedImage) return;
        
        const mode = colorMode.value;
        if (mode === 'mono') {
            // Raw plain text
            asciiOutput.textContent = asciiData.text;
        } else if (mode === 'color-html') {
            // Colored HTML
            asciiOutput.innerHTML = asciiData.html;
        } else if (mode === 'color-terminal') {
            // We show ANSI terminal format in plain text for preview (but text copy copies real ANSI codes)
            // For viewer preview, we can render the HTML representation so it looks right to the user!
            asciiOutput.innerHTML = asciiData.html;
        }
    }

    // Measure character size in pixel coordinates for canvas exporting
    function measureCharSize(fontSz, lineH, fontFamily) {
        const span = document.createElement('span');
        span.style.fontFamily = fontFamily;
        span.style.fontSize = fontSz + 'px';
        span.style.lineHeight = lineH;
        span.style.position = 'absolute';
        span.style.visibility = 'hidden';
        span.style.whiteSpace = 'pre';
        span.textContent = 'M';
        document.body.appendChild(span);
        const rect = span.getBoundingClientRect();
        document.body.removeChild(span);
        return {
            width: rect.width || (fontSz * 0.6), // Fallback aspect ratio approx 0.6
            height: rect.height || (fontSz * lineH)
        };
    }

    // -------------------------------------------------------------
    // Export Operations
    // -------------------------------------------------------------
    
    // 1. Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        if (!loadedImage) return;
        
        let textToCopy = '';
        const mode = colorMode.value;
        
        if (mode === 'mono') {
            textToCopy = asciiData.text;
        } else if (mode === 'color-terminal') {
            textToCopy = asciiData.ansi;
        } else {
            textToCopy = asciiData.text; // fallback
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span class="btn-icon">✓</span> Скопировано!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Ошибка копирования: ', err);
            alert('Не удалось скопировать. Пожалуйста, скопируйте вручную.');
        });
    });

    // 2. Download .TXT file
    downloadTxtBtn.addEventListener('click', () => {
        if (!loadedImage) return;
        
        let content = '';
        let filename = 'ascii-art.txt';
        const mode = colorMode.value;
        
        if (mode === 'color-terminal') {
            content = asciiData.ansi;
            filename = 'ascii-art-ansi.txt';
        } else {
            content = asciiData.text;
        }
        
        downloadBlob(content, filename, 'text/plain;charset=utf-8');
    });

    // 3. Download .HTML file (only active in color HTML mode)
    downloadHtmlBtn.addEventListener('click', () => {
        if (!loadedImage) return;
        
        const bgVal = bgColor.value;
        const fontSz = fontSize.value;
        const lineH = lineHeight.value;
        
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ASCII Art Color</title>
    <style>
        body {
            background-color: ${bgVal};
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        pre {
            font-family: 'Fira Code', 'Courier New', Courier, monospace;
            font-size: ${fontSz}px;
            line-height: ${lineH};
            background-color: ${bgVal};
            padding: 20px;
            border-radius: 8px;
            white-space: pre;
            overflow: auto;
            display: inline-block;
        }
        span {
            display: inline-block;
        }
    </style>
</head>
<body>
    <pre>${asciiData.html}</pre>
</body>
</html>`;

        downloadBlob(fullHtml, 'ascii-art.html', 'text/html;charset=utf-8');
    });

    // 4. Export as PNG Image via HTML5 Canvas
    downloadImgBtn.addEventListener('click', () => {
        if (!loadedImage) return;
        
        const grid = asciiData.grid;
        const rows = grid.length;
        if (rows === 0) return;
        const cols = grid[0].length;
        
        const fontSz = parseInt(fontSize.value) * 2; // Generate at 2x scale for higher quality
        const lineH = parseFloat(lineHeight.value);
        const bgVal = bgColor.value;
        const textVal = textColor.value;
        const mode = colorMode.value;
        
        const charMetrics = measureCharSize(fontSz, lineH, 'Fira Code, Courier New, monospace');
        const charW = charMetrics.width;
        const charH = charMetrics.height;
        
        const canvasW = Math.ceil(cols * charW);
        const canvasH = Math.ceil(rows * charH);
        
        exportCanvas.width = canvasW;
        exportCanvas.height = canvasH;
        
        const ctx = exportCanvas.getContext('2d');
        
        // 1. Draw Background
        ctx.fillStyle = bgVal;
        ctx.fillRect(0, 0, canvasW, canvasH);
        
        // 2. Configure font
        ctx.font = `${fontSz}px Fira Code, 'Courier New', Courier, monospace`;
        ctx.textBaseline = 'top';
        
        // 3. Draw characters row by row
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = grid[y][x];
                
                // Select color based on mode
                if (mode === 'mono') {
                    ctx.fillStyle = textVal;
                } else {
                    ctx.fillStyle = `rgb(${cell.r}, ${cell.g}, ${cell.b})`;
                }
                
                // Draw character at exact coordinates
                ctx.fillText(cell.char, x * charW, y * charH);
            }
        }
        
        // 4. Download canvas as PNG
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ascii-art.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    });

    function downloadBlob(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Initial UI setup
    updateViewerStyle();
});
