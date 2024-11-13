let extractedImageUrls = [];

// 提取图片的函数
async function extractImages() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const images = document.querySelectorAll('img');
        return Array.from(images)
          .map(img => ({
            src: img.src,
            width: img.naturalWidth,
            height: img.naturalHeight
          }))
          .filter(img => img.src && img.src.startsWith('http') && img.width > 100); // 过滤掉太小的图片
      }
    });

    extractedImageUrls = results[0].result;
    
    const status = document.getElementById('status');
    if (status) {
      status.textContent = `已提取 ${extractedImageUrls.length} 张图片`;
    }
    
    // 显示图片网格
    displayImageGrid(extractedImageUrls);
    
    const downloadBtn = document.getElementById('downloadSelected');
    if (downloadBtn) {
      downloadBtn.disabled = false;
    }

  } catch (error) {
    console.error('提取图片失败:', error);
    const status = document.getElementById('status');
    if (status) {
      status.textContent = '提取图片失败: ' + error.message;
    }
  }
}

// 显示图片网格
function displayImageGrid(images) {
  const grid = document.getElementById('imageGrid');
  grid.innerHTML = '';

  // 显示全选框并设置初始状态
  const selectAllCheckbox = document.getElementById('selectAll');
  selectAllCheckbox.checked = true;
  selectAllCheckbox.parentElement.style.display = 'flex';

  images.forEach((img, index) => {
    const container = document.createElement('div');
    container.className = 'image-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.index = index;
    checkbox.className = 'image-checkbox';

    // 添加单个复选框的change事件
    checkbox.addEventListener('change', () => {
      updateSelectAllState();
      // 更新下载按钮状态
      const anyChecked = document.querySelectorAll('.image-checkbox:checked').length > 0;
      document.getElementById('downloadSelected').disabled = !anyChecked;
    });

    const imgElement = document.createElement('img');
    imgElement.src = img.src;
    imgElement.title = `${img.width}x${img.height}`;

    const downloadButton = document.createElement('button');
    downloadButton.className = 'download-single';
    downloadButton.innerHTML = '⬇️';
    downloadButton.title = '下载此图片';
    downloadButton.onclick = () => downloadSingleImage(img.src);

    container.appendChild(checkbox);
    container.appendChild(imgElement);
    container.appendChild(downloadButton);
    grid.appendChild(container);
  });
}

// 下载单张图片
async function downloadSingleImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const blob = await response.blob();
    const urlParts = url.split('/');
    let filename = urlParts[urlParts.length - 1];
    
    if (!filename || filename.indexOf('.') === -1) {
      const ext = blob.type.split('/')[1] || 'jpg';
      filename = `image_${Date.now()}.${ext}`;
    }
    
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('下载失败:', error);
    alert('下载失败: ' + error.message);
  }
}

// 下载选中的图片
async function downloadSelectedImages() {
  const checkboxes = document.querySelectorAll('#imageGrid input[type="checkbox"]:checked');
  const selectedUrls = Array.from(checkboxes).map(cb => extractedImageUrls[cb.dataset.index].src);
  
  if (selectedUrls.length === 0) {
    alert('请选择要下载的图片！');
    return;
  }

  const status = document.getElementById('status');
  status.textContent = '准备下载...';

  try {
    for (let i = 0; i < selectedUrls.length; i++) {
      const url = selectedUrls[i];
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        const urlParts = url.split('/');
        let filename = urlParts[urlParts.length - 1];
        
        if (!filename || filename.indexOf('.') === -1) {
          const ext = blob.type.split('/')[1] || 'jpg';
          filename = `image_${i + 1}.${ext}`;
        }
        
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        
        status.textContent = `下载进度: ${i + 1}/${selectedUrls.length}`;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error downloading ${url}:`, error);
      }
    }
    
    status.textContent = '下载完成！';
    
  } catch (error) {
    console.error('下载失败:', error);
    status.textContent = '下载失败: ' + error.message;
  }
}

// 修改初始化事件监听器
document.addEventListener('DOMContentLoaded', function() {
  const extractButton = document.getElementById('extractButton');
  const downloadSelected = document.getElementById('downloadSelected');
  const selectAllCheckbox = document.getElementById('selectAll');
  
  // 移除之前的事件监听器，避免重复
  selectAllCheckbox.removeEventListener('change', handleSelectAll);
  // 添加新的事件监听器
  selectAllCheckbox.addEventListener('change', function(e) {
    const isChecked = e.target.checked;
    const checkboxes = document.querySelectorAll('.image-checkbox');
    
    // 强制更新所有复选框状态
    checkboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
    });

    // 更新下载按钮状态
    downloadSelected.disabled = !isChecked;
  });
  
  extractButton.addEventListener('click', extractImages);
  downloadSelected.addEventListener('click', downloadSelectedImages);
  
  // 初始时隐藏全选框
  selectAllCheckbox.parentElement.style.display = 'none';
});

// 在 popup.html 中添加必要的元素：

// 添加全选/取消全选功能
function handleSelectAll(e) {
  const isChecked = e.target.checked;
  const checkboxes = document.querySelectorAll('.image-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;  // 根据全选框的状态设置每个复选框
  });

  // 更新下载按钮状态
  const downloadSelected = document.getElementById('downloadSelected');
  downloadSelected.disabled = !isChecked;
}

// 更新全选框状态
function updateSelectAllState() {
  const checkboxes = document.querySelectorAll('.image-checkbox');
  const selectAllCheckbox = document.getElementById('selectAll');
  const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
  const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);
  
  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = anyChecked && !allChecked;
}