// Tab functionality
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        
        // Remove active class from all buttons and contents
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// Helper functions
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status';
    if (type) element.classList.add(type);
}

function showSpinner() {
    document.getElementById('loading-spinner').style.display = 'block';
    document.body.style.cursor = 'wait';
}

function hideSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
    document.body.style.cursor = 'default';
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function downloadPdf(pdfBytes, fileName) {
    download(pdfBytes, fileName, "application/pdf");
}

// PDF to JPG Converter
document.getElementById('pdf-to-jpg-btn').addEventListener('click', async () => {
    const input = document.getElementById('pdf-to-jpg-input');
    const preview = document.getElementById('pdf-to-jpg-preview');
    const status = document.getElementById('pdf-to-jpg-status');
    
    if (!input.files.length) {
        showStatus(status, 'Please select a PDF file', 'error');
        return;
    }
    
    try {
        showSpinner();
        showStatus(status, 'Processing...', '');
        preview.innerHTML = '';
        
        const pdfFile = input.files[0];
        const pdf = await pdfjsLib.getDocument(URL.createObjectURL(pdfFile)).promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            const imgData = canvas.toDataURL('image/jpeg');
            const img = document.createElement('img');
            img.src = imgData;
            preview.appendChild(img);
            
            // Create download link
            const a = document.createElement('a');
            a.href = imgData;
            a.download = `page_${i}.jpg`;
            a.textContent = `Download Page ${i}`;
            a.className = 'download-link';
            preview.appendChild(document.createElement('br'));
            preview.appendChild(a);
        }
        
        showStatus(status, 'Conversion complete!', 'success');
    } catch (error) {
        showStatus(status, `Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideSpinner();
    }
});

// JPG to PDF Converter
document.getElementById('jpg-to-pdf-btn').addEventListener('click', async () => {
    const input = document.getElementById('jpg-to-pdf-input');
    const status = document.getElementById('jpg-to-pdf-status');
    
    if (!input.files.length) {
        showStatus(status, 'Please select one or more image files', 'error');
        return;
    }
    
    try {
        showSpinner();
        showStatus(status, 'Creating PDF...', '');
        
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        // Sort files by name
        const files = Array.from(input.files).sort((a, b) => a.name.localeCompare(b.name));
        
        for (const imageFile of files) {
            const imageBytes = await readFileAsArrayBuffer(imageFile);
            let image;
            
            if (imageFile.type === 'image/jpeg') {
                image = await pdfDoc.embedJpg(imageBytes);
            } else {
                image = await pdfDoc.embedPng(imageBytes);
            }
            
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }
        
        const pdfBytes = await pdfDoc.save();
        downloadPdf(pdfBytes, 'converted_images.pdf');
        showStatus(status, 'PDF created successfully!', 'success');
    } catch (error) {
        showStatus(status, `Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideSpinner();
    }
});

// Split PDF
document.getElementById('split-pdf-btn').addEventListener('click', async () => {
    const input = document.getElementById('split-pdf-input');
    const status = document.getElementById('split-pdf-status');
    
    if (!input.files.length) {
        showStatus(status, 'Please select a PDF file', 'error');
        return;
    }
    
    try {
        showSpinner();
        showStatus(status, 'Splitting PDF...', '');
        
        const pdfBytes = await readFileAsArrayBuffer(input.files[0]);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        for (let i = 0; i < pageCount; i++) {
            const newPdf = await PDFLib.PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(page);
            const newPdfBytes = await newPdf.save();
            downloadPdf(newPdfBytes, `page_${i + 1}.pdf`);
        }
        
        showStatus(status, `PDF split into ${pageCount} files!`, 'success');
    } catch (error) {
        showStatus(status, `Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideSpinner();
    }
});

// Merge PDF
document.getElementById('merge-pdf-btn').addEventListener('click', async () => {
    const input = document.getElementById('merge-pdf-input');
    const status = document.getElementById('merge-pdf-status');
    
    if (!input.files.length) {
        showStatus(status, 'Please select one or more PDF files', 'error');
        return;
    }
    
    try {
        showSpinner();
        showStatus(status, 'Merging PDFs...', '');
        
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Sort files by name
        const files = Array.from(input.files).sort((a, b) => a.name.localeCompare(b.name));
        
        for (const file of files) {
            const pdfBytes = await readFileAsArrayBuffer(file);
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        
        const mergedPdfBytes = await mergedPdf.save();
        downloadPdf(mergedPdfBytes, 'merged.pdf');
        showStatus(status, 'PDFs merged successfully!', 'success');
    } catch (error) {
        showStatus(status, `Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideSpinner();
    }
});

// Rotate PDF
document.getElementById('rotate-pdf-btn').addEventListener('click', async () => {
    const input = document.getElementById('rotate-pdf-input');
    const degree = document.getElementById('rotate-degree').value;
    const status = document.getElementById('rotate-pdf-status');
    
    if (!input.files.length) {
        showStatus(status, 'Please select a PDF file', 'error');
        return;
    }
    
    try {
        showSpinner();
        showStatus(status, 'Rotating PDF...', '');
        
        const pdfBytes = await readFileAsArrayBuffer(input.files[0]);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        
        pages.forEach(page => {
            page.setRotation(parseInt(degree));
        });
        
        const rotatedPdfBytes = await pdfDoc.save();
        downloadPdf(rotatedPdfBytes, 'rotated.pdf');
        showStatus(status, 'PDF rotated successfully!', 'success');
    } catch (error) {
        showStatus(status, `Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideSpinner();
    }
});

// Compress PDF (simplified version)
document.getElementById('compress-pdf-btn').addEventListener('click', async () => {
    const input = document.getElementById('compress-pdf-input');
    const level = document.getElementById('compress-level').value;
    const status = document.getElementById('compress-pdf-status');
    
    if (!input.files.length) {
        showStatus(status, 'Please select a PDF file', 'error');
        return;
    }
    
    try {
        showSpinner();
        showStatus(status, 'Compressing PDF...', '');
        
        const pdfBytes = await readFileAsArrayBuffer(input.files[0]);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        
        // Note: This is a simplified compression
        const compressedPdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            // Add more compression options if needed
        });
        
        downloadPdf(compressedPdfBytes, 'compressed.pdf');
        showStatus(status, 'PDF compressed successfully!', 'success');
    } catch (error) {
        showStatus(status, `Error: ${error.message}`, 'error');
        console.error(error);
    } finally {
        hideSpinner();
    }
});

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// Verify libraries loaded
window.addEventListener('load', () => {
    console.log('PDF.js version:', pdfjsLib.version);
    console.log('PDFLib version:', PDFLib.version);
    console.log('All libraries loaded successfully!');
});



// Clear Memory Button
document.getElementById('clear-memory-btn').addEventListener('click', () => {
    try {
        // Clear file inputs
        document.querySelectorAll('input[type="file"]').forEach(input => {
            input.value = '';
        });
        
        // Clear preview areas
        document.querySelectorAll('.preview').forEach(preview => {
            preview.innerHTML = '';
        });
        
        // Clear status messages
        document.querySelectorAll('.status').forEach(status => {
            status.textContent = '';
            status.className = 'status';
        });
        
        // Force garbage collection (where supported)
        if (window.gc) {
            window.gc();
        }
        
        // Revoke object URLs
        if (window.URL && window.URL.revokeObjectURL) {
            document.querySelectorAll('img, a').forEach(element => {
                if (element.src && element.src.startsWith('blob:')) {
                    URL.revokeObjectURL(element.src);
                }
                if (element.href && element.href.startsWith('blob:')) {
                    URL.revokeObjectURL(element.href);
                }
            });
        }
        
        console.log('Memory cleared successfully');
        alert('Memory has been cleared. Page resources have been released.');
    } catch (error) {
        console.error('Error clearing memory:', error);
        alert('Error clearing memory. Please refresh the page.');
    }
});
