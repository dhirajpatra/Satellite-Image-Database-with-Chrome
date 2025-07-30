// IndexedDB setup for large satellite image storage
let db;
const dbName = 'SatelliteImageDB';
const dbVersion = 1;
const objectStoreName = 'images';

// Performance monitoring
let loadTimes = [];
let totalStorageUsed = 0;

// Initialize IndexedDB
async function initDB() {
    // Open or create the database
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        // Handle database errors
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            console.log('🗄️ IndexedDB initialized successfully');
            resolve(db);
        };
        
        // Create object store if it doesn't exist
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            const objectStore = db.createObjectStore(objectStoreName, { keyPath: 'id' });
            objectStore.createIndex('region', 'region', { unique: false });
            objectStore.createIndex('satellite', 'satellite', { unique: false });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('🏗️ IndexedDB object store created');
        };
    });
}

// Generate mock satellite images with realistic metadata
async function generateImages() {
    const source = document.getElementById('satelliteSource').value;
    const region = document.getElementById('region').value;
    const quality = document.getElementById('quality').value;
    
    const button = event.target;
    button.disabled = true;
    button.textContent = 'Generating...';
    
    try {
        // Quality settings
        const qualitySettings = {
            preview: { width: 400, height: 300, size: 0.5 },
            standard: { width: 800, height: 600, size: 2 },
            high: { width: 1600, height: 1200, size: 8 },
            ultra: { width: 3200, height: 2400, size: 25 }
        };
        
        const settings = qualitySettings[quality];
        const numImages = quality === 'ultra' ? 3 : quality === 'high' ? 5 : 8;
        
        console.group('🛰️ Generating Satellite Images');
        console.log(`Source: ${source}, Region: ${region}, Quality: ${quality}`);
        console.log(`Target size per image: ${settings.size}MB`);
        
        for (let i = 0; i < numImages; i++) {
            const startTime = performance.now();
            
            // Create realistic satellite image using Canvas
            const imageData = await createSatelliteImage(settings, region, i);
            
            const imageMetadata = {
                id: `${source}_${region}_${quality}_${Date.now()}_${i}`,
                satellite: source,
                region: region,
                quality: quality,
                timestamp: new Date().toISOString(),
                coordinates: generateCoordinates(region),
                cloudCover: Math.random() * 30,
                resolution: `${settings.width}x${settings.height}`,
                sizeBytes: imageData.size,
                processingTime: performance.now() - startTime,
                imageData: imageData.dataUrl
            };
            
            await storeImage(imageMetadata);
            console.log(`📁 Stored image ${i + 1}/${numImages} - ${(imageMetadata.sizeBytes / 1024 / 1024).toFixed(2)}MB`);
            
            // Update UI progressively
            if (i % 2 === 0) {
                await updateUI();
            }
        }
        
        console.groupEnd();
        await updateUI();
        
    } catch (error) {
        console.error('❌ Error generating images:', error);
    } finally {
        button.disabled = false;
        button.textContent = 'Generate Images';
    }
}

// Real satellite image URLs from various sources
const satelliteImageSources = {
    amazon: [
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80', // Forest aerial
        'https://images.unsplash.com/photo-1574482620901-2b87c6b20d71?w=800&q=80', // Amazon from space
        'https://images.unsplash.com/photo-1446071103084-c257b5f70672?w=800&q=80', // Green forest canopy
        'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80', // Rainforest aerial
        'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80'  // Dense forest
    ],
    sahara: [
        'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80', // Desert dunes
        'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&q=80', // Sahara aerial
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80', // Desert landscape
        'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800&q=80', // Sand patterns
        'https://images.unsplash.com/photo-1516298773066-c48f8e9bd92b?w=800&q=80'  // Desert from above
    ],
    himalaya: [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // Mountain peaks
        'https://images.unsplash.com/photo-1464822759844-d150ad6d1f6f?w=800&q=80', // Snow mountains
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', // Himalayan range
        'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=800&q=80', // Alpine landscape
        'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80'  // Mountain aerial
    ],
    arctic: [
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80', // Ice formations
        'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80', // Arctic ice
        'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=800&q=80', // Polar landscape
        'https://images.unsplash.com/photo-1516298773066-c48f8e9bd92b?w=800&q=80', // Ice patterns
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80'  // Arctic aerial
    ],
    'great-barrier': [
        'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=800&q=80', // Coral reef
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80', // Ocean aerial
        'https://images.unsplash.com/photo-1539650116574-75c0c6d73adf?w=800&q=80', // Reef from above
        'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80', // Blue ocean
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80'  // Coastal waters
    ]
};

// Fetch and process real satellite images
async function createSatelliteImage(settings, region, index) {
    try {
        const imageUrls = satelliteImageSources[region] || satelliteImageSources.amazon;
        const imageUrl = imageUrls[index % imageUrls.length];
        
        console.log(`🛰️ Fetching satellite image: ${imageUrl}`);
        
        // Create a canvas to resize and process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = settings.width;
        canvas.height = settings.height;
        
        // Load the image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Return a promise to handle image loading and processing
        return new Promise((resolve, reject) => {
            img.onload = () => {
                try {
                    // Draw and resize the image
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    // Add satellite overlay effects
                    addSatelliteOverlay(ctx, canvas, region);
                    
                    // Convert to blob with appropriate compression
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const reader = new FileReader();
                            reader.onload = () => {
                                resolve({
                                    dataUrl: reader.result,
                                    size: blob.size,
                                    originalUrl: imageUrl
                                });
                            };
                            reader.readAsDataURL(blob);
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    }, 'image/jpeg', settings.size > 5 ? 0.9 : 0.7);
                    
                } catch (error) {
                    console.error('Canvas processing error:', error);
                    reject(error);
                }
            };
            
            img.onerror = () => {
                console.warn(`Failed to load image: ${imageUrl}, using fallback`);
                // Fallback to generated pattern if image fails
                createFallbackImage(ctx, canvas, region, index);
                canvas.toBlob((blob) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            dataUrl: reader.result,
                            size: blob.size,
                            originalUrl: 'fallback-generated'
                        });
                    };
                    reader.readAsDataURL(blob);
                }, 'image/jpeg', 0.8);
            };
            
            // Add timestamp to avoid caching issues
            img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        });
        
    } catch (error) {
        console.error('Error in createSatelliteImage:', error);
        throw error;
    }
}

// Add satellite-style overlay effects
function addSatelliteOverlay(ctx, canvas, region) {
    // Add subtle scan lines for satellite effect
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    
    // Draw horizontal scan lines
    for (let i = 0; i < canvas.height; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Add corner coordinates overlay
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    const coords = generateCoordinates(region);
    ctx.fillText(`${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`, 10, 25);
    
    // Add timestamp
    ctx.fillText(new Date().toISOString().slice(0, 19), 10, canvas.height - 10);
    
    ctx.globalAlpha = 1;
}

// Fallback pattern generator
function createFallbackImage(ctx, canvas, region, index) {
    // Create region-specific terrain patterns as fallback
    const terrainColors = {
        amazon: ['#228B22', '#32CD32', '#006400', '#8FBC8F'],
        sahara: ['#F4A460', '#DEB887', '#D2691E', '#CD853F'],
        himalaya: ['#F5F5F5', '#E6E6FA', '#B0C4DE', '#708090'],
        arctic: ['#F0F8FF', '#E0FFFF', '#B0E0E6', '#87CEEB'],
        'great-barrier': ['#0080FF', '#4169E1', '#1E90FF', '#00BFFF']
    };
    
    const colors = terrainColors[region] || terrainColors.amazon;
    
    // Generate terrain pattern
    for (let y = 0; y < canvas.height; y += 3) {
        for (let x = 0; x < canvas.width; x += 3) {
            const noise = (Math.sin(x * 0.008 + index) + Math.cos(y * 0.008 + index)) * 0.5;
            const colorIndex = Math.floor((noise + 1) * colors.length / 2) % colors.length;
            ctx.fillStyle = colors[colorIndex];
            ctx.fillRect(x, y, 3, 3);
        }
    }
    
    // Add "GENERATED" watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GENERATED PATTERN', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
}

// Generate realistic coordinates for regions
function generateCoordinates(region) {
    const regionCoords = {
        amazon: { lat: -3.4653, lng: -62.2159, range: 10 },
        sahara: { lat: 23.8859, lng: 2.5085, range: 15 },
        himalaya: { lat: 27.9881, lng: 86.9250, range: 5 },
        arctic: { lat: 84.0000, lng: -72.0000, range: 20 },
        'great-barrier': { lat: -18.2871, lng: 147.6992, range: 3 }
    };
    
    const base = regionCoords[region] || regionCoords.amazon;
    return {
        latitude: base.lat + (Math.random() - 0.5) * base.range,
        longitude: base.lng + (Math.random() - 0.5) * base.range
    };
}

// Store image in IndexedDB
async function storeImage(imageData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([objectStoreName], 'readwrite');
        const objectStore = transaction.objectStore(objectStoreName);
        const request = objectStore.add(imageData);
        
        request.onsuccess = () => {
            totalStorageUsed += imageData.sizeBytes;
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

// Retrieve all images from IndexedDB
async function getAllImages() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([objectStoreName], 'readonly');
        const objectStore = transaction.objectStore(objectStoreName);
        const request = objectStore.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Update UI with current data
async function updateUI() {
    const startTime = performance.now();
    const images = await getAllImages();
    const loadTime = performance.now() - startTime;
    loadTimes.push(loadTime);
    
    // Update statistics
    document.getElementById('imageCount').textContent = images.length;
    document.getElementById('totalSize').textContent = `${(totalStorageUsed / 1024 / 1024).toFixed(2)} MB`;
    document.getElementById('avgLoadTime').textContent = `${Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)}ms`;
    
    // Calculate compression ratio
    const uncompressedSize = images.reduce((total, img) => {
        const [width, height] = img.resolution.split('x').map(Number);
        return total + (width * height * 3); // RGB bytes
    }, 0);
    const compressionRatio = uncompressedSize > 0 ? (1 - totalStorageUsed / uncompressedSize) * 100 : 0;
    document.getElementById('compressionRatio').textContent = `${compressionRatio.toFixed(1)}%`;
    
    // Performance warning
    const warningElement = document.getElementById('performanceWarning');
    if (totalStorageUsed > 100 * 1024 * 1024) { // 100MB
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
    
    // Update images grid
    const container = document.getElementById('imagesContainer');
    if (images.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>No images loaded. Generate some satellite imagery to begin!</p>
            </div>
        `;
    } else {
        container.innerHTML = images.map(img => `
            <div class="image-card">
                <img src="${img.imageData}" alt="${img.region} satellite image" onclick="openModal('${img.id}')">
                <div class="image-info">
                    <h4>${img.satellite.toUpperCase()} - ${img.region.replace('-', ' ')}</h4>
                    <p><strong>Quality:</strong> ${img.quality}</p>
                    <p><strong>Resolution:</strong> ${img.resolution}</p>
                    <p><strong>Size:</strong> ${(img.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Cloud Cover:</strong> ${img.cloudCover.toFixed(1)}%</p>
                    <p><strong>Coordinates:</strong> ${img.coordinates.latitude.toFixed(4)}, ${img.coordinates.longitude.toFixed(4)}</p>
                </div>
            </div>
        `).join('');
    }
    
    // Log performance data for DevTools analysis
    console.log('📊 Performance Update:', {
        imageCount: images.length,
        totalSizeMB: (totalStorageUsed / 1024 / 1024).toFixed(2),
        avgLoadTimeMs: Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length),
        memoryUsage: performance.memory ? `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'
    });
}

// Open image in modal
async function openModal(imageId) {
    const images = await getAllImages();
    const image = images.find(img => img.id === imageId);
    
    if (image) {
        document.getElementById('modalImage').src = image.imageData;
        document.getElementById('modalInfo').innerHTML = `
            <h3>${image.satellite.toUpperCase()} - ${image.region.replace('-', ' ')}</h3>
            <p><strong>Captured:</strong> ${new Date(image.timestamp).toLocaleString()}</p>
            <p><strong>Processing Time:</strong> ${image.processingTime.toFixed(2)}ms</p>
            <p><strong>File Size:</strong> ${(image.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
        `;
        document.getElementById('imageModal').classList.add('active');
    }
}

// Close modal
function closeModal() {
    document.getElementById('imageModal').classList.remove('active');
}

// Clear database
async function clearDatabase() {
    if (confirm('Are you sure you want to clear all stored images?')) {
        const transaction = db.transaction([objectStoreName], 'readwrite');
        const objectStore = transaction.objectStore(objectStoreName);
        await objectStore.clear();
        
        totalStorageUsed = 0;
        loadTimes = [];
        await updateUI();
        
        console.log('🗑️ Database cleared successfully');
    }
}

// Initialize the application
async function init() {
    try {
        await initDB();
        await updateUI();
        
        console.log('🚀 Satellite Image Database initialized');
        console.log('💡 Open DevTools → Application → IndexedDB to inspect stored data');
        console.log('🔍 Use Network tab to monitor image generation performance');
        
        // Add DevTools integration hooks
        window.satelliteDB = {
            db,
            getAllImages,
            clearDatabase,
            stats: () => ({
                imageCount: document.getElementById('imageCount').textContent,
                totalSize: document.getElementById('totalSize').textContent,
                avgLoadTime: document.getElementById('avgLoadTime').textContent
            })
        };
        
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }
}

// Start the application
init();

// Close modal on outside click
document.getElementById('imageModal').addEventListener('click', (e) => {
    if (e.target.id === 'imageModal') {
        closeModal();
    }
});