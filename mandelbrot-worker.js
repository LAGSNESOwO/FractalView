// mandelbrot-worker.js
// 导入Decimal.js库（在主HTML中已加载）
importScripts('https://cdnjs.cloudflare.com/ajax/libs/decimal.js/10.4.3/decimal.min.js');

// 接收消息并处理
onmessage = function(e) {
    const { width, height, currentX, currentY, zoomLevel, maxIter, precision, colorScheme } = e.data;
    
    // 创建图像数据
    const data = new Uint8ClampedArray(width * height * 4);
    
    // 分块处理以避免阻塞过长时间
    const CHUNK_SIZE = 10; // 每块行数
    
    // 定义Decimal值的精度
    Decimal.precision = precision > 0 ? precision : 20;
    
    // 创建Decimal对象缓存
    const decX = new Decimal(currentX);
    const decY = new Decimal(currentY);
    const decZoom = new Decimal(zoomLevel);
    const decWidth = new Decimal(width);
    const decHeight = new Decimal(height);
    
    // 计算比例因子
    const scaleX = new Decimal(0.25).div(decZoom).div(decWidth);
    const scaleY = new Decimal(0.25).div(decZoom).div(decHeight);
    
    // 分块处理所有行
    processNextChunk(0);
    
    // 处理一块数据的函数
    function processNextChunk(startY) {
        // 如果已经处理完所有行，发送结果
        if (startY >= height) {
            postMessage(data.buffer, [data.buffer]);
            return;
        }
        
        // 处理当前块的所有行
        const endY = Math.min(startY + CHUNK_SIZE, height);
        
        for (let y = startY; y < endY; y++) {
            for (let x = 0; x < width; x++) {
                // 使用Decimal.js计算复平面坐标
                const zx = new Decimal(x).minus(decWidth.div(2)).mul(scaleX).plus(decX);
                const zy = new D
