// 全局变量
let canvas = document.getElementById('mandelbrot');
let ctx = canvas.getContext('2d');
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = -0.5;
let currentY = 0;
let zoomLevel = 1;
let imageData;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initialize();
});

// 初始化设置
function initialize() {
    // 设置画布大小
    canvas.width = 800;
    canvas.height = 600;
    
    // 添加事件监听器
    setupEventListeners();
    
    // 初始渲染
    render();
    
    // 更新状态显示
    updateStatus();
}

// 设置事件监听器
function setupEventListeners() {
    // 鼠标事件
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    
    // 触摸事件
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // 控制面板事件
    document.getElementById('calculationMode').addEventListener('change', handleModeChange);
    document.getElementById('zoomFactor').addEventListener('change', handleZoomFactorChange);
    document.getElementById('iterInput').addEventListener('change', handleIterationChange);
    document.getElementById('precisionControl').addEventListener('change', handlePrecisionChange);
}

// 渲染曼德博集合
function render() {
    const maxIter = parseInt(document.getElementById('iterInput').value);
    const isPrecisionMode = document.getElementById('calculationMode').value === 'precision';
    
    imageData = ctx.createImageData(canvas.width, canvas.height);
    
    for(let x = 0; x < canvas.width; x++) {
        for(let y = 0; y < canvas.height; y++) {
            let zx = mapToReal(x, canvas.width, currentX, zoomLevel);
            let zy = mapToImaginary(y, canvas.height, currentY, zoomLevel);
            
            let iteration = calculatePoint(zx, zy, maxIter, isPrecisionMode);
            
            setPixel(imageData, x, y, iteration, maxIter);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    updateStatus();
}

// 计算单个点
function calculatePoint(x0, y0, maxIter, isPrecisionMode) {
    let x = 0;
    let y = 0;
    let iteration = 0;
    
    while (x*x + y*y <= 4 && iteration < maxIter) {
        let xtemp = x*x - y*y + x0;
        y = 2*x*y + y0;
        x = xtemp;
        iteration++;
    }
    
    return iteration;
}

// 设置像素颜色
function setPixel(imageData, x, y, iteration, maxIter) {
    let index = (y * imageData.width + x) * 4;
    
    if (iteration === maxIter) {
        imageData.data[index] = 0;
        imageData.data[index + 1] = 0;
        imageData.data[index + 2] = 0;
    } else {
        let hue = (iteration / maxIter) * 360;
        let rgb = hslToRgb(hue/360, 1.0, 0.5);
        imageData.data[index] = rgb[0];
        imageData.data[index + 1] = rgb[1];
        imageData.data[index + 2] = rgb[2];
    }
    imageData.data[index + 3] = 255;
}

// HSL转RGB
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
        r = g = b = l;
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// 坐标映射函数
function mapToReal(x, width, centerX, zoom) {
    return (x - width/2) / (width/4) / zoom + centerX;
}

function mapToImaginary(y, height, centerY, zoom) {
    return (y - height/2) / (height/4) / zoom + centerY;
}

// 鼠标事件处理
function handleMouseDown(e) {
    isDragging = false;
    startX = e.offsetX;
    startY = e.offsetY;
    
    setTimeout(() => {
        if (!isDragging) {
            let clickX = mapToReal(startX, canvas.width, currentX, zoomLevel);
            let clickY = mapToImaginary(startY, canvas.height, currentY, zoomLevel);
            
            currentX = clickX;
            currentY = clickY;
            
            zoomLevel *= parseFloat(document.getElementById('zoomFactor').value);
            
            render();
        }
    }, 200);
}

function handleMouseMove(e) {
    if (Math.abs(e.offsetX - startX) > 5 || Math.abs(e.offsetY - startY) > 5) {
        isDragging = true;
    }
    
    if (!isDragging) return;
    
    let dx = e.offsetX - startX;
    let dy = e.offsetY - startY;
    
    currentX -= dx / (canvas.width/4) / zoomLevel;
    currentY -= dy / (canvas.height/4) / zoomLevel;
    
    startX = e.offsetX;
    startY = e.offsetY;
    
    render();
}

function handleMouseUp() {
    isDragging = false;
}

function handleWheel(e) {
    e.preventDefault();
    
    let zoomFactor = parseFloat(document.getElementById('zoomFactor').value);
    if (e.deltaY < 0) {
        zoomLevel *= zoomFactor;
    } else {
        zoomLevel /= zoomFactor;
    }
    
    render();
}

// 触摸事件处理
let touchStartTime;
let touchMoved = false;

function handleTouchStart(e) {
    e.preventDefault();
    touchStartTime = new Date().getTime();
    touchMoved = false;
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - canvas.offsetLeft;
        startY = e.touches[0].clientY - canvas.offsetTop;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    touchMoved = true;
    
    if (!isDragging) return;
    
    let dx = (e.touches[0].clientX - canvas.offsetLeft) - startX;
    let dy = (e.touches[0].clientY - canvas.offsetTop) - startY;
    
    currentX -= dx / (canvas.width/4) / zoomLevel;
    currentY -= dy / (canvas.height/4) / zoomLevel;
    
    startX = e.touches[0].clientX - canvas.offsetLeft;
    startY = e.touches[0].clientY - canvas.offsetTop;
    
    render();
}

function handleTouchEnd(e) {
    e.preventDefault();
    let touchEndTime = new Date().getTime();
    
    if (touchEndTime - touchStartTime < 200 && !touchMoved) {
        let clickX = mapToReal(startX, canvas.width, currentX, zoomLevel);
        let clickY = mapToImaginary(startY, canvas.height, currentY, zoomLevel);
        
        currentX = clickX;
        currentY = clickY;
        zoomLevel *= parseFloat(document.getElementById('zoomFactor').value);
        
        render();
    }
    
    isDragging = false;
}

// UI控制函数
function toggleDrawer() {
    document.getElementById('navDrawer').classList.toggle('open');
}

function zoomIn() {
    zoomLevel *= parseFloat(document.getElementById('zoomFactor').value);
    render();
}

function zoomOut() {
    zoomLevel /= parseFloat(document.getElementById('zoomFactor').value);
    render();
}

function reset() {
    currentX = -0.5;
    currentY = 0;
    zoomLevel = 1;
    render();
}

// 更新状态显示
function updateStatus() {
    document.getElementById('zoomLevel').textContent = zoomLevel.toFixed(2) + 'x';
    document.getElementById('centerCoord').textContent = 
        `(${currentX.toFixed(6)}, ${currentY.toFixed(6)})`;
    document.getElementById('currentMode').textContent = 
        document.getElementById('calculationMode').value === 'precision' ? '高精度模式' : '标准模式';
}

// 设置变更处理
function handleModeChange() {
    render();
}

function handleZoomFactorChange() {
    // 仅在下次缩放时生效
}

function handleIterationChange() {
    render();
}

function handlePrecisionChange() {
    if (document.getElementById('calculationMode').value === 'precision') {
        render();
    }
}

// 视图切换
function switchView(viewId) {
    document.querySelectorAll('.page-content').forEach(element => {
        element.classList.remove('active');
    });
    document.getElementById(viewId).classList.add('active');
    toggleDrawer();
}
