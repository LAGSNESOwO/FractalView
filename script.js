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
    if (isPrecisionMode) {
        return calculatePointPrecision(x0, y0, maxIter);
    }
    
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

// 高精度计算
function calculatePointPrecision(x0, y0, maxIter) {
    let x = new BigNumber(0);
    let y = new BigNumber(0);
    let x0Big = new BigNumber(x0);
    let y0Big = new BigNumber(y0);
    let iteration = 0;
    
    while (x.times(x).plus(y.times(y)).lte(4) && iteration < maxIter) {
        let xtemp = x.times(x).minus(y.times(y)).plus(x0Big);
        y = x.times(y).times(2).plus(y0Big);
        x = xtemp;
        iteration++;
    }
    
    return iteration;
}

// 坐标映射函数
function mapToReal(x, width, centerX, zoom) {
    return (x - width/2) / (width/4) / zoom + centerX;
}

function mapToImaginary(y, height, centerY, zoom) {
    return (y - height/2) / (height/4) / zoom + centerY;
}

// 设置像素颜色
function setPixel(imageData, x, y, iteration, maxIter) {
    let index = (x + y * canvas.width) * 4;
    
    if (iteration === maxIter) {
        imageData.data[index] = 0;
        imageData.data[index + 1] = 0;
        imageData.data[index + 2] = 0;
    } else {
        let hue = (iteration / maxIter) * 360;
        let [r, g, b] = hslToRgb(hue/360, 1, 0.5);
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
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

// 事件处理函数
function handleMouseDown(e) {
    isDragging = true;
    startX = e.offsetX;
    startY = e.offsetY;
}

function handleMouseMove(e) {
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
function handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDragging) return;
    
    let dx = e.touches[0].clientX - startX;
    let dy = e.touches[0].clientY - startY;
    
    currentX -= dx / (canvas.width/4) / zoomLevel;
    currentY -= dy / (canvas.height/4) / zoomLevel;
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    
    render();
}

function handleTouchEnd(e) {
    e.preventDefault();
    isDragging = false;
}

// 控制面板事件处理
function handleModeChange() {
    render();
}

function handleZoomFactorChange() {
    // 仅更新状态，不需要重新渲染
    updateStatus();
}

function handleIterationChange() {
    render();
}

function handlePrecisionChange() {
    render();
}

// 导航抽屉控制
function toggleDrawer() {
    const drawer = document.getElementById('navDrawer');
    drawer.classList.toggle('open');
}

// 页面切换
function switchPage(pageId) {
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    toggleDrawer();
}

// 重置视图
function reset() {
    currentX = -0.5;
    currentY = 0;
    zoomLevel = 1;
    render();
}

// 缩小
function zoomOut() {
    zoomLevel /= parseFloat(document.getElementById('zoomFactor').value);
    render();
}

// 更新状态显示
function updateStatus() {
    document.getElementById('zoomLevel').textContent = zoomLevel.toFixed(2) + 'x';
    document.getElementById('centerCoord').textContent = `(${currentX.toFixed(6)}, ${currentY.toFixed(6)})`;
    document.getElementById('precision').textContent = 
        document.getElementById('calculationMode').value === 'precision' ? '高精度' : '标准';
    document.getElementById('currentMode').textContent = 
        document.getElementById('calculationMode').value === 'precision' ? '高精度模式' : '标准模式';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initialize);

// 为导航栏链接添加事件监听
document.querySelectorAll('.nav-drawer a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('href').substring(1) + 'View';
        switchPage(pageId);
    });
});
