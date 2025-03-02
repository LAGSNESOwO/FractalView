// script.js
document.addEventListener('DOMContentLoaded', initialize);

// 全局变量
let canvas, ctx;
let currentX = 0, currentY = 0;
let zoomLevel = 1;
let isDragging = false;
let startX, startY;
let worker = null;
let workerBusy = false;

// 初始化
function initialize() {
    canvas = document.getElementById('mandelbrotCanvas');
    ctx = canvas.getContext('2d');
    
    // 设置画布大小
    canvas.width = 800;
    canvas.height = 500;
    
    // 添加事件监听器
    document.getElementById('iterInput').addEventListener('input', handleIterChange);
    document.getElementById('colorScheme').addEventListener('change', render);
    document.getElementById('calculationMode').addEventListener('change', handleModeChange);
    document.getElementById('precisionControl').addEventListener('change', handlePrecisionChange);
    document.getElementById('resetView').addEventListener('click', resetView);
    
    // 设置鼠标事件
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    
    // 设置触摸事件
    canvas.addEventListener('touchstart', handleTouchStart, {passive: false});
    canvas.addEventListener('touchmove', handleTouchMove, {passive: false});
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // 设置导航控制按钮
    setupControlButtons();
    
    // 初始渲染
    render();
}

// 设置导航控制按钮
function setupControlButtons() {
    document.getElementById('moveUp').addEventListener('click', () => {
        currentY -= 0.1 / zoomLevel;
        render();
    });
    
    document.getElementById('moveDown').addEventListener('click', () => {
        currentY += 0.1 / zoomLevel;
        render();
    });
    
    document.getElementById('moveLeft').addEventListener('click', () => {
        currentX -= 0.1 / zoomLevel;
        render();
    });
    
    document.getElementById('moveRight').addEventListener('click', () => {
        currentX += 0.1 / zoomLevel;
        render();
    });
    
    document.getElementById('zoomIn').addEventListener('click', () => {
        zoomLevel *= 1.5;
        render();
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
        zoomLevel /= 1.5;
        render();
    });
}

// 处理迭代值改变
function handleIterChange() {
    const iterInput = document.getElementById('iterInput');
    document.getElementById('iterValue').textContent = iterInput.value;
    render();
}

// 处理精度模式改变
function handleModeChange() {
    const mode = document.getElementById('calculationMode').value;
    const precisionControl = document.getElementById('precisionControl');
    
    if (mode === 'precision') {
        precisionControl.disabled = false;
    } else {
        precisionControl.disabled = true;
    }
    
    render();
    updateStatus();
}

// 处理精度值改变
function handlePrecisionChange() {
    const precisionInput = document.getElementById('precisionControl');
    document.getElementById('precisionValue').textContent = precisionInput.value;
    render();
}

// 重置视图
function resetView() {
    currentX = 0;
    currentY = 0;
    zoomLevel = 1;
    document.getElementById('iterInput').value = 100;
    document.getElementById('iterValue').textContent = 100;
    document.getElementById('colorScheme').value = 'classic';
    document.getElementById('calculationMode').value = 'standard';
    document.getElementById('precisionControl').value = 0;
    document.getElementById('precisionValue').textContent = 0;
    handleModeChange();
    render();
}

// 渲染曼德博集合
function render() {
    const maxIter = parseInt(document.getElementById('iterInput').value);
    const isPrecisionMode = document.getElementById('calculationMode').value === 'precision';
    
    // 如果是高精度模式，使用Web Worker
    if (isPrecisionMode) {
        // 如果Worker正在运行，则终止
        if (worker && workerBusy) {
            worker.terminate();
            worker = null;
        }
        
        renderWithWorker(maxIter);
    } else {
        // 标准模式使用主线程渲染
        renderStandard(maxIter);
    }
    
    updateStatus();
}

// 使用Worker进行高精度渲染
function renderWithWorker(maxIter) {
    showLoadingIndicator();
    
    // 创建新的Worker
    if (!worker) {
        worker = new Worker('mandelbrot-worker.js');
        
        worker.onmessage = function(e) {
            const imageData = new ImageData(
                new Uint8ClampedArray(e.data.buffer), 
                canvas.width, 
                canvas.height
            );
            
            ctx.putImageData(imageData, 0, 0);
            hideLoadingIndicator();
            workerBusy = false;
        };
    }
    
    // 发送数据给Worker
    const precisionValue = parseInt(document.getElementById('precisionControl').value);
    const colorScheme = document.getElementById('colorScheme').value;
    
    workerBusy = true;
    worker.postMessage({
        width: canvas.width,
        height: canvas.height,
        currentX: currentX,
        currentY: currentY,
        zoomLevel: zoomLevel,
        maxIter: maxIter,
        precision: precisionValue,
        colorScheme: colorScheme
    });
}

// 标准模式渲染（主线程）
function renderStandard(maxIter) {
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const colorScheme = document.getElementById('colorScheme').value;
    
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // 将canvas坐标转换到复平面坐标
            const zx = (x - width / 2) / (0.25 * width * zoomLevel) + currentX;
            const zy = (y - height / 2) / (0.25 * height * zoomLevel) + currentY;
            
            // 计算该点的迭代次数
            const iteration = calculatePoint(zx, zy, maxIter, false);
            
            // 根据迭代次数上色
            const color = getColor(iteration, maxIter, colorScheme);
            
            // 设置像素颜色
            const pixelIndex = (y * width + x) * 4;
            data[pixelIndex] = color.r;     // 红
            data[pixelIndex + 1] = color.g; // 绿
            data[pixelIndex + 2] = color.b; // 蓝
            data[pixelIndex + 3] = 255;     // 透明度
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}

// 计算一个点的迭代次数（标准精度）
function calculatePoint(x0, y0, maxIter, isPrecision) {
    // 标准精度模式使用普通JavaScript数学运算
    let x = 0;
    let y = 0;
    let iteration = 0;
    let x2 = 0;
    let y2 = 0;
    
    while (x2 + y2 < 4 && iteration < maxIter) {
        y = 2 * x * y + y0;
        x = x2 - y2 + x0;
        x2 = x * x;
        y2 = y * y;
        iteration++;
    }
    
    return iteration;
}

// 获取颜色
function getColor(iteration, maxIter, scheme) {
    // 如果达到最大迭代次数，返回黑色
    if (iteration === maxIter) {
        return { r: 0, g: 0, b: 0 };
    }
    
    // 根据不同配色方案计算颜色
    let r, g, b;
    const normalized = iteration / maxIter;
    const hue = 360 * normalized;
    
    switch (scheme) {
        case 'classic':
            r = Math.round(255 * Math.sqrt(normalized));
            g = Math.round(255 * Math.pow(normalized, 3));
            b = Math.round(255 * Math.sin(normalized * Math.PI));
            break;
        case 'fire':
            r = Math.min(255, Math.round(255 * normalized * 2));
            g = Math.round(255 * Math.pow(normalized, 2));
            b = Math.round(50 * normalized);
            break;
        case 'ocean':
            r = Math.round(50 * normalized);
            g = Math.round(150 * normalized);
            b = Math.min(255, Math.round(255 * normalized * 1.5));
            break;
        case 'rainbow':
            // HSV到RGB的转换（简化版）
            const i = Math.floor(hue / 60) % 6;
            const f = hue / 60 - i;
            const value = 255;
            const saturation = 1;
            const v = value;
            const p = value * (1 - saturation);
            const q = value * (1 - f * saturation);
            const t = value * (1 - (1 - f) * saturation);
            
            switch (i) {
                case 0: r = v; g = t; b = p; break;
                case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = t; break;
                case 3: r = p; g = q; b = v; break;
                case 4: r = t; g = p; b = v; break;
                case 5: r = v; g = p; b = q; break;
            }
            
            r = Math.round(r);
            g = Math.round(g);
            b = Math.round(b);
            break;
        default:
            r = g = b = Math.round(255 * normalized);
    }
    
    return { r, g, b };
}

// 鼠标事件处理
function handleMouseDown(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
}

function handleMouseMove(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // 移动视图中心
    currentX -= dx / (0.25 * canvas.width * zoomLevel);
    currentY -= dy / (0.25 * canvas.height * zoomLevel);
    
    startX = e.clientX;
    startY = e.clientY;
    
    render();
}

function handleMouseUp() {
    isDragging = false;
}

// 鼠标滚轮事件处理（缩放）
function handleWheel(e) {
    e.preventDefault();
    
    // 获取鼠标在canvas中的位置
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 将鼠标坐标转换为复平面坐标
    const complexX = (mouseX - canvas.width / 2) / (0.25 * canvas.width * zoomLevel) + currentX;
    const complexY = (mouseY - canvas.height / 2) / (0.25 * canvas.height * zoomLevel) + currentY;
    
    // 根据滚轮方向调整缩放级别
    if (e.deltaY < 0) {
        zoomLevel *= 1.1; // 放大
    } else {
        zoomLevel /= 1.1; // 缩小
    }
    
    // 调整当前中心，使鼠标位置保持不变
    currentX = complexX - (mouseX - canvas.width / 2) / (0.25 * canvas.width * zoomLevel);
    currentY = complexY - (mouseY - canvas.height / 2) / (0.25 * canvas.height * zoomLevel);
    
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
    
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    
    currentX -= dx / (0.25 * canvas.width * zoomLevel);
    currentY -= dy / (0.25 * canvas.height * zoomLevel);
    
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    
    render();
}

function handleTouchEnd() {
    isDragging = false;
}

// 更新状态显示
function updateStatus() {
    document.getElementById('zoomLevel').textContent = zoomLevel.toFixed(2) + 'x';
    document.getElementById('centerCoord').textContent = `(${currentX.toFixed(6)}, ${currentY.toFixed(6)})`;
    document.getElementById('precision').textContent = document.getElementById('calculationMode').value === 'precision' ? '高精度' : '标准';
    document.getElementById('currentMode').textContent = document.getElementById('calculationMode').value === 'precision' ? '高精度模式' : '标准模式';
}

// 显示和隐藏加载指示器
function showLoadingIndicator() {
    const status = document.getElementById('renderStatus');
    status.style.display = 'block';
    status.textContent = '计算中...';
}

function hideLoadingIndicator() {
    const status = document.getElementById('renderStatus');
    status.textContent = '渲染完成';
    
    // 2秒后隐藏
    setTimeout(() => {
        status.style.display = 'none';
    }, 2000);
}
