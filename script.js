  // Canvas和上下文初始化
  const canvas = document.getElementById('mandelbrot');
  const ctx = canvas.getContext('2d');

  // BigNumber配置
  BigNumber.config({ 
    DECIMAL_PLACES: 40,
    ROUNDING_MODE: BigNumber.ROUND_HALF_UP,
    EXPONENTIAL_AT: [-40, 40]
  });

  // 响应式画布大小设置
  function resizeCanvas() {
    const maxWidth = Math.min(800, window.innerWidth - 20);
    const aspectRatio = 3/4;
    canvas.width = maxWidth;
    canvas.height = maxWidth * aspectRatio;
  }

  // 初始化时和窗口改变时调整画布大小
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
  });

  // 视图范围初始化
  let xMin = new BigNumber(-2);
  let xMax = new BigNumber(1);
  let yMin = new BigNumber(-1.5);
  let yMax = new BigNumber(1.5);

  // 控制参数
  let zoomLevel = 1;
  let zoomFactor = 2;
  let maxIter = 100;
  let precisionControlEnabled = true;
  let usePrecisionMode = false;

  // UI控制函数
  function updatePrecisionControl() {
    precisionControlEnabled = document.getElementById('precisionControl').checked;
    draw();
  }

  function updateCalculationMode() {
    usePrecisionMode = document.getElementById('calculationMode').value === 'precision';
    document.getElementById('currentMode').textContent = 
      usePrecisionMode ? '高精度模式' : '标准模式';
    draw();
  }

  function updateIterations() {
    const input = document.getElementById('iterInput');
    maxIter = Math.min(Math.max(parseInt(input.value) || 100, 1), 1000);
    input.value = maxIter;
    draw();
  }

  function updateInfo() {
    const centerX = xMax.plus(xMin).div(2);
    const centerY = yMax.plus(yMin).div(2);
    const range = xMax.minus(xMin);
    
    document.getElementById('zoomLevel').textContent = `${zoomLevel.toFixed(1)}x`;
    document.getElementById('centerCoord').textContent = 
      `(${centerX.toString()}, ${centerY.toString()})`;
    document.getElementById('precision').textContent = 
      `${Math.abs(Math.log10(range.toNumber())).toFixed(2)} 位`;
  }

  function updateZoomFactor() {
    zoomFactor = parseFloat(document.getElementById('zoomFactor').value);
  }

  // 标准模式曼德布罗集计算
  function mandelbrotNormal(x0, y0) {
    let x = 0;
    let y = 0;
    let iter = 0;
    
    while (x*x + y*y <= 4 && iter < maxIter) {
      const xTemp = x*x - y*y + x0;
      y = 2*x*y + y0;
      x = xTemp;
      iter++;
    }
    
    return iter;
  }

  // 高精度模式曼德布罗集计算
  function mandelbrotPrecision(x0, y0) {
    let x = new BigNumber(0);
    let y = new BigNumber(0);
    let iter = 0;
    
    const four = new BigNumber(4);
    const two = new BigNumber(2);
    
    while (x.times(x).plus(y.times(y)).lte(four) && iter < maxIter) {
      const xTemp = x.times(x).minus(y.times(y)).plus(x0);
      y = two.times(x).times(y).plus(y0);
      x = xTemp;
      iter++;
    }
    
    return iter;
  }

  // 颜色转换函数
  function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // 绘制函数
  function draw() {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    // 检查数值范围是否过小（仅在启用精度控制且使用标准模式时）
    const range = xMax.minus(xMin);
    if (!usePrecisionMode && precisionControlEnabled && range.lt(new BigNumber('1e-13'))) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('请切换到高精度模式以继续缩放', canvas.width/2, canvas.height/2);
      updateInfo();
      return;
    }
    
    for (let i = 0; i < canvas.width; i++) {
      for (let j = 0; j < canvas.height; j++) {
        let x, y;
        if (usePrecisionMode) {
          x = xMin.plus(xMax.minus(xMin).times(i).div(canvas.width));
          y = yMin.plus(yMax.minus(yMin).times(j).div(canvas.height));
        } else {
          x = xMin.toNumber() + (xMax.toNumber() - xMin.toNumber()) * i / canvas.width;
          y = yMin.toNumber() + (yMax.toNumber() - yMin.toNumber()) * j / canvas.height;
        }
        
        const iter = usePrecisionMode ? 
          mandelbrotPrecision(x, y) : 
          mandelbrotNormal(x, y);
        
        const idx = (i + j * canvas.width) * 4;
        
        if (iter === maxIter) {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
        } else {
          const hue = (iter / maxIter) * 360;
          const rgb = hslToRgb(hue/360, 1, 0.5);
          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
        }
        data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    updateInfo();
  }

  // 缩放功能
  function zoom(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX || event.touches[0].clientX) - rect.left;
    const y = (event.clientY || event.touches[0].clientY) - rect.top;
    
    const zoomX = xMin.plus(xMax.minus(xMin).times(x).div(canvas.width));
    const zoomY = yMin.plus(yMax.minus(yMin).times(y).div(canvas.height));
    
    const newWidth = xMax.minus(xMin).div(zoomFactor);
    const newHeight = yMax.minus(yMin).div(zoomFactor);
    
    xMin = zoomX.minus(newWidth.div(2));
    xMax = zoomX.plus(newWidth.div(2));
    yMin = zoomY.minus(newHeight.div(2));
    yMax = zoomY.plus(newHeight.div(2));
    
    zoomLevel *= zoomFactor;
    draw();
  }

  function zoomOut() {
    const centerX = xMax.plus(xMin).div(2);
    const centerY = yMax.plus(yMin).div(2);
    const width = xMax.minus(xMin).times(zoomFactor);
    const height = yMax.minus(yMin).times(zoomFactor);
    
    xMin = centerX.minus(width.div(2));
    xMax = centerX.plus(width.div(2));
    yMin = centerY.minus(height.div(2));
    yMax = centerY.plus(height.div(2));
    
    zoomLevel /= zoomFactor;
    draw();
  }

  // 重置函数
  function reset() {
    xMin = new BigNumber(-2);
    xMax = new BigNumber(1);
    yMin = new BigNumber(-1.5);
    yMax = new BigNumber(1.5);
    zoomLevel = 1;
    draw();
  }

  // 导航抽屉控制
  function toggleDrawer() {
    const drawer = document.getElementById('navDrawer');
    drawer.classList.toggle('open');
  }

  // 全屏控制
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // 事件监听器设置
  canvas.addEventListener('click', zoom);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    zoom(e);
  });

  // UI控件事件监听
  document.getElementById('precisionControl').addEventListener('change', updatePrecisionControl);
  document.getElementById('calculationMode').addEventListener('change', updateCalculationMode);
  document.getElementById('iterInput').addEventListener('change', updateIterations);
  document.getElementById('zoomFactor').addEventListener('change', updateZoomFactor);

  // 初始绘制
  draw();
