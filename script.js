document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Common
    const priceInput = document.getElementById('total-price');
    const taxToggle = document.getElementById('tax-included');
    const unitPriceDisplay = document.getElementById('unit-price');
    const verdictBadge = document.getElementById('verdict');
    const compareBadge = document.getElementById('price-compare');
    const resultLabel = document.getElementById('result-label');
    const resultArea = document.getElementById('result-display');
    const saveBtn = document.getElementById('save-btn');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history');
    const bestPriceDisplay = document.getElementById('best-price');
    const avgPriceDisplay = document.getElementById('avg-price');
    const modalOverlay = document.getElementById('modal-overlay');
    const cancelClearBtn = document.getElementById('cancel-clear');
    const confirmClearBtn = document.getElementById('confirm-clear');

    // DOM Elements - Tissue
    const sheetsInput = document.getElementById('sheets-per-box');
    const sheetsSelect = document.getElementById('sheets-select');
    const customSheetsGroup = document.getElementById('custom-sheets-group');
    const boxesInput = document.getElementById('box-count');
    const boxSelect = document.getElementById('box-select');
    const customBoxesGroup = document.getElementById('custom-boxes-group');

    // DOM Elements - Toilet Paper
    const tpRollsSelect = document.getElementById('tp-rolls-select');
    const tpRollsInput = document.getElementById('tp-rolls-input');
    const customTpRollsGroup = document.getElementById('custom-tp-rolls-group');
    const tpMetersSelect = document.getElementById('tp-meters-select');
    const tpMetersInput = document.getElementById('tp-meters-input');
    const customTpMetersGroup = document.getElementById('custom-tp-meters-group');
    const tpMultiplier = document.getElementById('tp-multiplier');
    const tpType = document.getElementById('tp-type');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // State
    let activeTab = 'tissue';
    let histories = {
        'tissue': JSON.parse(localStorage.getItem('tissueHistory')) || [],
        'toilet-paper': JSON.parse(localStorage.getItem('tpHistory')) || []
    };
    let priceChart = null;

    // Thresholds
    const THRESHOLDS = {
        'tissue': { CHEAP: 0.40, NORMAL: 0.55 }, // Yen per sheet (W)
        'toilet-paper': { CHEAP: 0.60, NORMAL: 0.85 } // Yen per meter
    };

    // Initialize
    updateUI();
    initChart();

    // Event Listeners - Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab === activeTab) return;

            activeTab = tab;
            tabBtns.forEach(b => b.classList.toggle('active', b === btn));
            tabPanes.forEach(p => p.classList.toggle('active', p.id === `${tab === 'tissue' ? 'tissue' : 'tp'}-inputs`));
            
            // Adjust result label
            resultLabel.textContent = activeTab === 'tissue' ? '1組あたりの価格' : '1mあたりの価格';
            
            calculate();
            updateUI();
            updateChart();
        });
    });

    // Event Listeners - Tissue
    [sheetsInput, boxesInput].forEach(el => el.addEventListener('input', calculate));
    sheetsSelect.addEventListener('change', () => {
        toggleCustom(sheetsSelect, customSheetsGroup, sheetsInput);
        calculate();
    });
    boxSelect.addEventListener('change', () => {
        toggleCustom(boxSelect, customBoxesGroup, boxesInput);
        calculate();
    });

    // Event Listeners - Toilet Paper
    [tpRollsInput, tpMetersInput, tpMultiplier, tpType].forEach(el => el.addEventListener('input', calculate));
    tpRollsSelect.addEventListener('change', () => {
        toggleCustom(tpRollsSelect, customTpRollsGroup, tpRollsInput);
        calculate();
    });
    tpMetersSelect.addEventListener('change', () => {
        toggleCustom(tpMetersSelect, customTpMetersGroup, tpMetersInput);
        calculate();
    });
    tpMultiplier.addEventListener('change', calculate);

    // Event Listeners - Common
    priceInput.addEventListener('input', calculate);
    taxToggle.addEventListener('change', calculate);
    saveBtn.addEventListener('click', saveRecord);
    clearHistoryBtn.addEventListener('click', () => modalOverlay.classList.remove('hide'));
    cancelClearBtn.addEventListener('click', () => modalOverlay.classList.add('hide'));
    confirmClearBtn.addEventListener('click', executeClearHistory);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.add('hide'); });

    function toggleCustom(select, group, input) {
        if (select.value === 'custom') {
            group.classList.remove('hide');
            input.focus();
        } else {
            group.classList.add('hide');
        }
    }

    function calculate() {
        let unitPrice = 0;
        let price = parseFloat(priceInput.value) || 0;

        if (price <= 0) {
            resetResult();
            return;
        }

        // Tax adjustment
        if (!taxToggle.checked) {
            price = price * 1.1; 
        }

        if (activeTab === 'tissue') {
            const sheets = sheetsSelect.value === 'custom' ? parseFloat(sheetsInput.value) : parseFloat(sheetsSelect.value);
            const boxes = boxSelect.value === 'custom' ? parseFloat(boxesInput.value) : parseFloat(boxSelect.value);
            
            if (sheets > 0 && boxes > 0) {
                unitPrice = price / (sheets * boxes);
            }
        } else {
            const rolls = tpRollsSelect.value === 'custom' ? parseFloat(tpRollsInput.value) : parseFloat(tpRollsSelect.value);
            const meters = tpMetersSelect.value === 'custom' ? parseFloat(tpMetersInput.value) : parseFloat(tpMetersSelect.value);
            const mult = parseFloat(tpMultiplier.value) || 1;
            
            if (rolls > 0 && meters > 0) {
                unitPrice = price / (rolls * meters * mult);
            }
        }

        if (unitPrice > 0) {
            displayResult(unitPrice);
        } else {
            resetResult();
        }
    }

    function resetResult() {
        unitPriceDisplay.textContent = '---';
        verdictBadge.textContent = '入力待ち';
        verdictBadge.className = 'verdict-badge';
        compareBadge.classList.add('hide');
        resultArea.classList.remove('active');
        saveBtn.disabled = true;
    }

    function displayResult(unitPrice) {
        const unit = activeTab === 'tissue' ? '/組' : '/m';
        unitPriceDisplay.textContent = `¥${unitPrice.toFixed(2)}`;
        resultArea.classList.add('active');
        saveBtn.disabled = false;

        const catThresholds = THRESHOLDS[activeTab];
        let verdictText = '';
        let verdictClass = '';

        if (unitPrice <= catThresholds.CHEAP) {
            verdictText = '✨ 超お買い得！';
            verdictClass = 'verdict-cheap';
        } else if (unitPrice <= catThresholds.NORMAL) {
            verdictText = '👍 標準的';
            verdictClass = 'verdict-normal';
        } else {
            verdictText = '⚠️ 高めかも...';
            verdictClass = 'verdict-expensive';
        }

        verdictBadge.textContent = verdictText;
        verdictBadge.className = `verdict-badge ${verdictClass}`;

        // Comparison with best
        const history = histories[activeTab];
        if (history.length > 0) {
            const best = Math.min(...history.map(h => h.unitPrice));
            const diff = ((unitPrice - best) / best) * 100;
            
            compareBadge.classList.remove('hide');
            if (diff <= 0) {
                compareBadge.innerHTML = '<span>🏆 過去最安値を更新！</span>';
            } else {
                compareBadge.innerHTML = `<span>過去最安値より ${diff.toFixed(1)}% 高い</span>`;
            }
        } else {
            compareBadge.classList.add('hide');
        }
    }

    function saveRecord() {
        let spec = '';
        let finalUnitPrice = 0;
        const price = parseFloat(priceInput.value);
        const taxIncluded = taxToggle.checked;
        const finalPrice = taxIncluded ? price : price * 1.1;

        if (activeTab === 'tissue') {
            const sheets = sheetsSelect.value === 'custom' ? parseFloat(sheetsInput.value) : parseFloat(sheetsSelect.value);
            const boxes = boxSelect.value === 'custom' ? parseFloat(boxesInput.value) : parseFloat(boxSelect.value);
            finalUnitPrice = finalPrice / (sheets * boxes);
            spec = `${sheets}W×${boxes}箱`;
        } else {
            const rolls = tpRollsSelect.value === 'custom' ? parseFloat(tpRollsInput.value) : parseFloat(tpRollsSelect.value);
            const meters = tpMetersSelect.value === 'custom' ? parseFloat(tpMetersInput.value) : parseFloat(tpMetersSelect.value);
            const mult = parseFloat(tpMultiplier.value);
            const type = tpType.value === 'double' ? 'W' : 'S';
            finalUnitPrice = finalPrice / (rolls * meters * mult);
            spec = `${rolls}ロール(${meters}m ${type})${mult > 1 ? ` ${mult}倍巻` : ''}`;
        }

        const record = {
            id: Date.now(),
            date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            unitPrice: finalUnitPrice,
            spec: spec,
            rawPrice: price,
            isTaxIncluded: taxIncluded
        };

        histories[activeTab].unshift(record);
        if (histories[activeTab].length > 20) histories[activeTab].pop();

        localStorage.setItem(activeTab === 'tissue' ? 'tissueHistory' : 'tpHistory', JSON.stringify(histories[activeTab]));
        
        saveBtn.textContent = '保存しました！';
        setTimeout(() => { saveBtn.textContent = 'この価格を保存する'; }, 1500);

        updateUI();
        updateChart();
    }

    function updateUI() {
        const history = histories[activeTab];
        const unit = activeTab === 'tissue' ? '/組' : '/m';

        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty-msg">まだ履歴がありません。</p>';
            bestPriceDisplay.textContent = '---';
            avgPriceDisplay.textContent = '---';
            return;
        }

        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="item-main">
                    <span class="item-price">¥${item.unitPrice.toFixed(2)} ${unit}</span>
                    <span class="item-spec">${item.spec} (¥${item.rawPrice}${item.isTaxIncluded ? '' : '+税'})</span>
                </div>
                <div class="item-date">${item.date}</div>
            </div>
        `).join('');

        const unitPrices = history.map(h => h.unitPrice);
        const minPrice = Math.min(...unitPrices);
        const avgPrice = unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length;

        bestPriceDisplay.textContent = `¥${minPrice.toFixed(2)}`;
        avgPriceDisplay.textContent = `¥${avgPrice.toFixed(2)}`;
    }

    function executeClearHistory() {
        histories[activeTab] = [];
        localStorage.removeItem(activeTab === 'tissue' ? 'tissueHistory' : 'tpHistory');
        updateUI();
        updateChart();
        modalOverlay.classList.add('hide');
    }

    function initChart() {
        const ctx = document.getElementById('priceChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(43, 88, 118, 0.4)');
        gradient.addColorStop(1, 'rgba(43, 88, 118, 0)');

        priceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: histories[activeTab].slice().reverse().map(h => h.date),
                datasets: [{
                    label: `単価推移 (円${activeTab === 'tissue' ? '/組' : '/m'})`,
                    data: histories[activeTab].slice().reverse().map(h => h.unitPrice),
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
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 45, minRotation: 45 } },
                    y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });
    }

    function updateChart() {
        if (!priceChart) return;
        const historyData = histories[activeTab].slice().reverse();
        priceChart.data.labels = historyData.map(h => h.date);
        priceChart.data.datasets[0].data = historyData.map(h => h.unitPrice);
        priceChart.data.datasets[0].label = `単価推移 (円${activeTab === 'tissue' ? '/組' : '/m'})`;
        priceChart.options.scales.x.ticks.display = historyData.length > 1;
        priceChart.update();
    }
});
