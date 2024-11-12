document.getElementById('extract').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractImages,
  }, (results) => {
    const images = results[0].result;
    displayImages(images);
  });
});

function extractImages() {
  const images = Array.from(document.getElementsByTagName('img'));
  return images
    .map(img => ({
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height
    }))
    .filter(img => 
      // 过滤掉太小的图片和没有src的图片
      img.src && 
      img.width > 100 && 
      img.height > 100 &&
      !img.src.startsWith('data:') // 过滤掉base64图片
    );
}

function displayImages(images) {
  const container = document.getElementById('images');
  container.innerHTML = images
    .map(img => `
      <div class="image-item">
        <img src="${img.src}" alt="${img.alt}" title="${img.alt}">
        <button class="download-btn" data-url="${img.src}">⬇️</button>
      </div>
    `)
    .join('');

  // 添加点击事件
  container.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
      // 在新标签页中打开图片
      window.open(e.target.src, '_blank');
    }
    if (e.target.classList.contains('download-btn')) {
      // 下载图片
      const url = e.target.dataset.url;
      chrome.downloads.download({
        url: url,
        filename: url.split('/').pop() // 使用URL最后一部分作为文件名
      });
    }
  });
} 