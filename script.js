document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const sheetsInput = document.getElementById('sheets-per-box');
    const sheetsSelect = document.getElementById('sheets-select');
    const customSheetsGroup = document.getElementById('custom-sheets-group');
    const boxesInput = document.getElementById('box-count');
    const boxSelect = document.getElementById('box-select');
    const customBoxesGroup = document.getElementById('custom-boxes-group');
    const priceInput = document.getElementById('total-price');
    const taxToggle = document.getElementById('tax-included');
    
    const unitPriceDisplay = document.getElementById('unit-price');
    const verdictBadge = document.getElementById('verdict');
    const resultArea = document.getElementById('result-display');
    const saveBtn = document.getElementById('save-btn');
    
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const bestPriceDisplay = document.getElementById('best-price');
    const avgPriceDisplay = document.getElementById('avg-price');

    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const cancelClearBtn = document.getElementById('cancel-clear');
    const confirmClearBtn = document.getElementById('confirm-clear');

    let history = JSON.parse(localStorage.getItem('tissueHistory')) || [];
    let priceChart = null;

    // Constants for verdict logic (Price per sheet in JPY)
    const THRESHOLDS = {
        CHEAP: 0.40,  // Up to 0.40 is very cheap
        NORMAL: 0.55   // Up to 0.55 is standard
    };

    // Initialize
    updateUI();
    initChart();

    // Event Listeners
    [sheetsInput, boxesInput, priceInput].forEach(input => {
        input.addEventListener('input', calculate);
    });
    
    if (sheetsSelect) {
        sheetsSelect.addEventListener('change', () => {
            if (sheetsSelect.value === 'custom') {
                customSheetsGroup.classList.remove('hide');
                sheetsInput.focus();
            } else {
                customSheetsGroup.classList.add('hide');
            }
            calculate();
        });
    }

    if (boxSelect) {
        boxSelect.addEventListener('change', () => {
            if (boxSelect.value === 'custom') {
                customBoxesGroup.classList.remove('hide');
                boxesInput.focus();
            } else {
                customBoxesGroup.classList.add('hide');
            }
            calculate();
        });
    }

    taxToggle.addEventListener('change', calculate);
    
    saveBtn.addEventListener('click', saveRecord);
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', showClearModal);
    }

    if (cancelClearBtn) {
        cancelClearBtn.addEventListener('click', hideClearModal);
    }

    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', executeClearHistory);
    }
    
    // オーバーレイクリックで閉じる
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideClearModal();
    });

    function calculate() {
        let sheets = 0;
        if (sheetsSelect.value === 'custom') {
            sheets = parseFloat(sheetsInput.value) || 0;
        } else {
            sheets = parseFloat(sheetsSelect.value) || 0;
        }
        
        let boxes = 0;
        if (boxSelect.value === 'custom') {
            boxes = parseFloat(boxesInput.value) || 0;
        } else {
            boxes = parseFloat(boxSelect.value) || 0;
        }
        
        let price = parseFloat(priceInput.value) || 0;

        if (sheets <= 0 || boxes <= 0 || price <= 0) {
            resetResult();
            return;
        }

        // Tax adjustment if "tax-excluded"
        if (!taxToggle.checked) {
            price = price * 1.1; // Standard 10% tax in Japan
        }

        const totalSheets = sheets * boxes;
        const unitPrice = price / totalSheets;

        displayResult(unitPrice);
    }

    function resetResult() {
        unitPriceDisplay.textContent = '---';
        verdictBadge.textContent = '入力待ち';
        verdictBadge.className = 'verdict-badge';
        resultArea.classList.remove('active');
        saveBtn.disabled = true;
    }

    function displayResult(unitPrice) {
        unitPriceDisplay.textContent = `¥${unitPrice.toFixed(2)}`;
        resultArea.classList.add('active');
        saveBtn.disabled = false;

        let verdictText = '';
        let verdictClass = '';

        if (unitPrice <= THRESHOLDS.CHEAP) {
            verdictText = '✨ 超お買い得！';
            verdictClass = 'verdict-cheap';
        } else if (unitPrice <= THRESHOLDS.NORMAL) {
            verdictText = '👍 標準的';
            verdictClass = 'verdict-normal';
        } else {
            verdictText = '⚠️ 高めかも...';
            verdictClass = 'verdict-expensive';
        }

        verdictBadge.textContent = verdictText;
        verdictBadge.className = `verdict-badge ${verdictClass}`;
    }

    function saveRecord() {
        let sheets = 0;
        if (sheetsSelect.value === 'custom') {
            sheets = parseFloat(sheetsInput.value);
        } else {
            sheets = parseFloat(sheetsSelect.value);
        }
        
        let boxes = 0;
        if (boxSelect.value === 'custom') {
            boxes = parseFloat(boxesInput.value);
        } else {
            boxes = parseFloat(boxSelect.value);
        }
        
        const price = parseFloat(priceInput.value);
        const taxIncluded = taxToggle.checked;
        
        let finalPrice = taxIncluded ? price : price * 1.1;
        const unitPrice = finalPrice / (sheets * boxes);

        const record = {
            id: Date.now(),
            date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            unitPrice: unitPrice,
            spec: `${sheets}W×${boxes}箱`,
            rawPrice: price,
            isTaxIncluded: taxIncluded
        };

        history.unshift(record);
        if (history.length > 20) history.pop(); // Keep last 20

        localStorage.setItem('tissueHistory', JSON.stringify(history));
        
        // Visual feedback
        saveBtn.textContent = '保存しました！';
        setTimeout(() => {
            saveBtn.textContent = '現在の価格を保存する';
        }, 1500);

        updateUI();
        updateChart();
    }

    function updateUI() {
        // Update History List
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">まだ履歴がありません。</p>';
            bestPriceDisplay.textContent = '---';
            avgPriceDisplay.textContent = '---';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="item-main">
                    <span class="item-price">¥${item.unitPrice.toFixed(2)} /組</span>
                    <span class="item-spec">${item.spec} (¥${item.rawPrice}${item.isTaxIncluded ? '' : '+税'})</span>
                </div>
                <div class="item-date">${item.date}</div>
            </div>
        `).join('');

        // Update Stats
        const unitPrices = history.map(h => h.unitPrice);
        const minPrice = Math.min(...unitPrices);
        const avgPrice = unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length;

        bestPriceDisplay.textContent = `¥${minPrice.toFixed(2)}`;
        avgPriceDisplay.textContent = `¥${avgPrice.toFixed(2)}`;
    }

    function showClearModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('hide');
            document.body.style.overflow = 'hidden'; // 背景スクロール停止
        }
    }

    function hideClearModal() {
        if (modalOverlay) {
            modalOverlay.classList.add('hide');
            document.body.style.overflow = ''; // スクロール再開
        }
    }

    function executeClearHistory() {
        try {
            history = [];
            localStorage.removeItem('tissueHistory');
            updateUI();
            updateChart();
            hideClearModal();
            console.log('History data cleared via custom modal.');
        } catch (err) {
            console.error('Failed to clear history:', err);
            alert('削除中にエラーが発生しました。');
        }
    }

    function initChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(43, 88, 118, 0.4)');
        gradient.addColorStop(1, 'rgba(43, 88, 118, 0)');

        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.slice().reverse().map(h => h.date),
                datasets: [{
                    label: '単価推移 (円/組)',
                    data: history.slice().reverse().map(h => h.unitPrice),
                    borderColor: '#2b5876',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#2b5876',
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1a2a3a',
                        bodyColor: '#1a2a3a',
                        borderColor: '#ccc',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { display: history.length > 1, maxRotation: 45, minRotation: 45 }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
    }

    function updateChart() {
        if (!priceChart) return;
        
        try {
            const chartData = (history && history.length > 0) ? history.slice().reverse() : [];
            priceChart.data.labels = chartData.map(h => h.date);
            priceChart.data.datasets[0].data = chartData.map(h => h.unitPrice);
            
            // 履歴が空の場合は軸ラベルを非表示にし、データが複数の場合のみラベルを表示
            if (priceChart.options.scales.x) {
                priceChart.options.scales.x.ticks.display = chartData.length > 1;
            }
            
            priceChart.update();
        } catch (err) {
            console.error('Chart update error:', err);
        }
    }
});
