/**
 * AuraCalc — High Precision Interactive Calculator
 * Includes: Arithmetic, Memory, Scientific fx, History Drawer,
 * Web Audio haptic feedback, Adaptive Text, and Keyboard Handling.
 */

class AuraCalculator {
  constructor() {
    // Calculator Core State
    this.currentInput = '0';
    this.expression = '';
    this.previousResult = null;
    this.isResultShown = false;
    this.memoryValue = 0;
    this.angleMode = 'DEG'; // 'DEG' or 'RAD'
    this.soundEnabled = true;

    // History state
    this.history = [];

    // DOM Elements
    this.mainDisplay = document.getElementById('main-display');
    this.expressionDisplay = document.getElementById('expression-display');
    this.memoryIndicator = document.getElementById('memory-indicator');
    this.radDegIndicator = document.getElementById('rad-deg-indicator');
    this.btnAngleUnit = document.getElementById('btn-angle-unit');
    this.toastNotification = document.getElementById('toast-notification');
    this.historyList = document.getElementById('history-list');
    this.historyDrawer = document.getElementById('history-drawer');
    this.drawerBackdrop = document.getElementById('drawer-backdrop');
    this.scientificPanel = document.getElementById('scientific-panel');
    this.btnToggleScientific = document.getElementById('btn-toggle-scientific');
    this.appContainer = document.getElementById('app-container');
    this.modeBadge = document.getElementById('mode-badge');

    // Themes available
    this.themes = ['obsidian', 'cyber', 'aurora', 'titanium'];
    this.currentThemeIndex = 0;

    // Web Audio Synthesizer for tactile click sound
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.loadPreferences();
    this.bindEvents();
    this.updateDisplay();
    this.renderHistory();
    this.updateMemoryUI();
  }

  /* ========================================================================
     Preferences & Persistence
     ======================================================================== */
  loadPreferences() {
    try {
      const savedTheme = localStorage.getItem('auracalc_theme');
      if (savedTheme && this.themes.includes(savedTheme)) {
        this.currentThemeIndex = this.themes.indexOf(savedTheme);
        document.body.setAttribute('data-theme', savedTheme);
      }

      const savedSound = localStorage.getItem('auracalc_sound');
      if (savedSound !== null) {
        this.soundEnabled = savedSound === 'true';
        this.updateSoundIcon();
      }

      const savedMemory = localStorage.getItem('auracalc_memory');
      if (savedMemory !== null) {
        this.memoryValue = parseFloat(savedMemory) || 0;
      }

      const savedHistory = localStorage.getItem('auracalc_history');
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }

      const savedAngleMode = localStorage.getItem('auracalc_angle_mode');
      if (savedAngleMode === 'DEG' || savedAngleMode === 'RAD') {
        this.angleMode = savedAngleMode;
        if (this.btnAngleUnit) this.btnAngleUnit.textContent = this.angleMode;
        if (this.radDegIndicator) this.radDegIndicator.textContent = this.angleMode;
      }
    } catch (err) {
      console.warn('Storage preference error:', err);
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('auracalc_history', JSON.stringify(this.history.slice(0, 50)));
    } catch (err) {
      console.warn('Failed saving history:', err);
    }
  }

  saveMemory() {
    try {
      localStorage.setItem('auracalc_memory', this.memoryValue.toString());
    } catch (err) {
      console.warn('Failed saving memory:', err);
    }
  }

  /* ========================================================================
     Sound Synthesizer (Zero-dependency Web Audio API)
     ======================================================================== */
  initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playHapticClick(frequency = 440, duration = 0.04, type = 'sine') {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);
      // Soft pitch decay
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioCtx.currentTime + duration);

      // Volume envelope to prevent harsh pops
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy or unavailable
    }
  }

  playKeySound(actionType) {
    switch (actionType) {
      case 'number':
      case 'decimal':
        this.playHapticClick(620, 0.035, 'sine');
        break;
      case 'operator':
      case 'sci':
        this.playHapticClick(850, 0.04, 'triangle');
        break;
      case 'equals':
        this.playHapticClick(1050, 0.07, 'sine');
        break;
      case 'clear':
      case 'backspace':
        this.playHapticClick(320, 0.045, 'triangle');
        break;
      default:
        this.playHapticClick(500, 0.03, 'sine');
    }
  }

  /* ========================================================================
     Event Binding
     ======================================================================== */
  bindEvents() {
    // Keypad grid clicks
    const keypadGrid = document.getElementById('keypad-grid');
    keypadGrid.addEventListener('click', (e) => this.handleButtonInteraction(e));

    // Scientific panel clicks
    if (this.scientificPanel) {
      this.scientificPanel.addEventListener('click', (e) => this.handleButtonInteraction(e));
    }

    // Memory toolbar clicks
    const memoryBar = document.querySelector('.memory-bar');
    if (memoryBar) {
      memoryBar.addEventListener('click', (e) => {
        const memBtn = e.target.closest('.mem-btn');
        if (!memBtn) return;
        this.createRipple(e, memBtn);
        this.handleMemoryAction(memBtn.getAttribute('data-mem'));
      });
    }

    // Mode Toggle (Standard / Scientific)
    if (this.btnToggleScientific) {
      this.btnToggleScientific.addEventListener('click', () => {
        this.toggleScientificMode();
      });
    }

    // Header Controls: Sound, Theme, History
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    if (btnToggleSound) {
      btnToggleSound.addEventListener('click', () => this.toggleSound());
    }

    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => this.cycleTheme());
    }

    const btnToggleHistory = document.getElementById('btn-toggle-history');
    if (btnToggleHistory) {
      btnToggleHistory.addEventListener('click', () => this.toggleHistoryDrawer(true));
    }

    const btnCloseHistory = document.getElementById('btn-close-history');
    if (btnCloseHistory) {
      btnCloseHistory.addEventListener('click', () => this.toggleHistoryDrawer(false));
    }

    if (this.drawerBackdrop) {
      this.drawerBackdrop.addEventListener('click', () => this.toggleHistoryDrawer(false));
    }

    const btnClearHistory = document.getElementById('btn-clear-history');
    if (btnClearHistory) {
      btnClearHistory.addEventListener('click', () => this.clearHistory());
    }

    // Copy Button
    const btnCopy = document.getElementById('btn-copy');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.copyToClipboard());
    }

    // History item click (delegated)
    if (this.historyList) {
      this.historyList.addEventListener('click', (e) => {
        const card = e.target.closest('.history-card');
        if (!card) return;
        const resultVal = card.getAttribute('data-result');
        if (resultVal) {
          this.currentInput = resultVal;
          this.isResultShown = true;
          this.updateDisplay();
          this.showToast('Loaded into display');
          this.toggleHistoryDrawer(false);
        }
      });
    }

    // Physical Keyboard Support
    window.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
  }

  handleButtonInteraction(e) {
    const btn = e.target.closest('.calc-btn');
    if (!btn) return;

    this.createRipple(e, btn);

    const action = btn.getAttribute('data-action');
    this.playKeySound(action);

    switch (action) {
      case 'number':
        this.appendDigit(btn.getAttribute('data-num'));
        break;
      case 'decimal':
        this.appendDecimal();
        break;
      case 'operator':
        this.setOperator(btn.getAttribute('data-op'));
        break;
      case 'equals':
        this.calculate();
        break;
      case 'clear':
        this.clearAll();
        break;
      case 'backspace':
        this.backspace();
        break;
      case 'percent':
        this.applyPercent();
        break;
      case 'negate':
        this.toggleNegate();
        break;
      case 'sci':
        this.applyScientific(btn.getAttribute('data-fn'));
        break;
    }
  }

  createRipple(event, button) {
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    const x = (event.clientX || (rect.left + radius)) - rect.left - radius;
    const y = (event.clientY || (rect.top + radius)) - rect.top - radius;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.classList.add('ripple');

    const ripple = button.querySelector('.ripple');
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 550);
  }

  /* ========================================================================
     Keyboard Handling & Visual Key Highlighting
     ======================================================================== */
  handleKeyboardInput(e) {
    // Prevent default scrolling for Space/Enter/Slash/ArrowKeys
    if ([' ', 'Enter', '/', '*', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }

    let targetBtn = null;
    const key = e.key;

    if (/^[0-9]$/.test(key)) {
      this.appendDigit(key);
      this.playKeySound('number');
      targetBtn = document.getElementById(`key-${key}`);
    } else if (key === '.' || key === ',') {
      this.appendDecimal();
      this.playKeySound('decimal');
      targetBtn = document.getElementById('key-decimal');
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
      const idMap = { '+': 'key-add', '-': 'key-subtract', '*': 'key-multiply', '/': 'key-divide' };
      this.setOperator(opMap[key]);
      this.playKeySound('operator');
      targetBtn = document.getElementById(idMap[key]);
    } else if (key === 'Enter' || key === '=') {
      this.calculate();
      this.playKeySound('equals');
      targetBtn = document.getElementById('key-equals');
    } else if (key === 'Backspace') {
      this.backspace();
      this.playKeySound('backspace');
      targetBtn = document.getElementById('key-backspace');
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
      this.clearAll();
      this.playKeySound('clear');
      targetBtn = document.getElementById('key-ac');
    } else if (key === '%') {
      this.applyPercent();
      this.playKeySound('operator');
      targetBtn = document.getElementById('key-percent');
    } else if (key === '(' || key === ')') {
      this.applyScientific(key === '(' ? 'paren-open' : 'paren-close');
      this.playKeySound('sci');
    } else if (key === '^') {
      this.applyScientific('pow');
      this.playKeySound('sci');
    }

    if (targetBtn) {
      targetBtn.classList.add('keyboard-active');
      setTimeout(() => targetBtn.classList.remove('keyboard-active'), 120);
    }
  }

  /* ========================================================================
     Scientific & Mode Switching
     ======================================================================== */
  toggleScientificMode() {
    const isExpanded = this.scientificPanel.classList.toggle('expanded');
    this.btnToggleScientific.classList.toggle('active', isExpanded);
    this.appContainer.classList.toggle('sci-mode', isExpanded);
    if (this.modeBadge) {
      this.modeBadge.textContent = isExpanded ? 'Scientific' : 'Standard';
    }
    if (this.radDegIndicator) {
      this.radDegIndicator.classList.toggle('hidden', !isExpanded);
    }
  }

  applyScientific(fn) {
    if (fn === 'rad-deg') {
      this.angleMode = this.angleMode === 'DEG' ? 'RAD' : 'DEG';
      if (this.btnAngleUnit) this.btnAngleUnit.textContent = this.angleMode;
      if (this.radDegIndicator) this.radDegIndicator.textContent = this.angleMode;
      localStorage.setItem('auracalc_angle_mode', this.angleMode);
      this.showToast(`Angle mode: ${this.angleMode}`);
      return;
    }

    let val = parseFloat(this.currentInput);
    if (isNaN(val)) val = 0;

    const toRad = (deg) => (deg * Math.PI) / 180;

    switch (fn) {
      case 'sin': {
        const rad = this.angleMode === 'DEG' ? toRad(val) : val;
        this.setSingleValueResult(`sin(${val})`, Math.sin(rad));
        break;
      }
      case 'cos': {
        const rad = this.angleMode === 'DEG' ? toRad(val) : val;
        this.setSingleValueResult(`cos(${val})`, Math.cos(rad));
        break;
      }
      case 'tan': {
        const rad = this.angleMode === 'DEG' ? toRad(val) : val;
        if (Math.abs(Math.cos(rad)) < 1e-15) {
          this.setError('Undefined');
          return;
        }
        this.setSingleValueResult(`tan(${val})`, Math.tan(rad));
        break;
      }
      case 'pi':
        this.currentInput = Math.PI.toString();
        this.isResultShown = false;
        this.updateDisplay();
        break;
      case 'e':
        this.currentInput = Math.E.toString();
        this.isResultShown = false;
        this.updateDisplay();
        break;
      case 'sqrt':
        if (val < 0) {
          this.setError('Invalid input');
          return;
        }
        this.setSingleValueResult(`√(${val})`, Math.sqrt(val));
        break;
      case 'square':
        this.setSingleValueResult(`sqr(${val})`, Math.pow(val, 2));
        break;
      case 'inv':
        if (val === 0) {
          this.setError('Cannot divide by zero');
          return;
        }
        this.setSingleValueResult(`1/(${val})`, 1 / val);
        break;
      case 'ln':
        if (val <= 0) {
          this.setError('Invalid input');
          return;
        }
        this.setSingleValueResult(`ln(${val})`, Math.log(val));
        break;
      case 'log':
        if (val <= 0) {
          this.setError('Invalid input');
          return;
        }
        this.setSingleValueResult(`log(${val})`, Math.log10(val));
        break;
      case 'fact':
        if (val < 0 || !Number.isInteger(val) || val > 170) {
          this.setError('Invalid input');
          return;
        }
        this.setSingleValueResult(`${val}!`, this.factorial(val));
        break;
      case 'pow':
        this.expression = `${this.currentInput} ^ `;
        this.currentInput = '0';
        this.isResultShown = false;
        this.updateDisplay();
        break;
      case 'paren-open':
        if (this.currentInput === '0' || this.isResultShown) {
          this.currentInput = '(';
        } else {
          this.currentInput += '(';
        }
        this.isResultShown = false;
        this.updateDisplay();
        break;
      case 'paren-close':
        this.currentInput += ')';
        this.isResultShown = false;
        this.updateDisplay();
        break;
    }
  }

  factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  setSingleValueResult(exprStr, num) {
    const formatted = this.cleanPrecision(num);
    const histItem = {
      expr: exprStr,
      result: formatted.toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.addHistoryItem(histItem);
    this.expression = `${exprStr} =`;
    this.currentInput = formatted.toString();
    this.isResultShown = true;
    this.updateDisplay();
  }

  /* ========================================================================
     Memory Logic
     ======================================================================== */
  handleMemoryAction(action) {
    const val = parseFloat(this.currentInput) || 0;
    this.playKeySound('sci');

    switch (action) {
      case 'MC':
        this.memoryValue = 0;
        this.saveMemory();
        this.updateMemoryUI();
        this.showToast('Memory Cleared');
        break;
      case 'MR':
        this.currentInput = this.memoryValue.toString();
        this.isResultShown = true;
        this.updateDisplay();
        this.showToast(`Recalled: ${this.memoryValue}`);
        break;
      case 'M+':
        this.memoryValue += val;
        this.saveMemory();
        this.updateMemoryUI();
        this.showToast(`Added to Memory (+${val})`);
        break;
      case 'M-':
        this.memoryValue -= val;
        this.saveMemory();
        this.updateMemoryUI();
        this.showToast(`Subtracted from Memory (-${val})`);
        break;
      case 'MS':
        this.memoryValue = val;
        this.saveMemory();
        this.updateMemoryUI();
        this.showToast(`Stored in Memory: ${val}`);
        break;
    }
  }

  updateMemoryUI() {
    if (this.memoryIndicator) {
      this.memoryIndicator.classList.toggle('hidden', this.memoryValue === 0);
    }
  }

  /* ========================================================================
     Calculator Actions: Digits, Operators, Computation
     ======================================================================== */
  appendDigit(digit) {
    if (this.isResultShown) {
      this.currentInput = digit;
      this.isResultShown = false;
    } else if (this.currentInput === '0') {
      this.currentInput = digit;
    } else {
      // Limit maximum length to prevent visual overflow
      if (this.currentInput.replace(/[^0-9]/g, '').length < 16) {
        this.currentInput += digit;
      }
    }
    this.updateDisplay();
  }

  appendDecimal() {
    if (this.isResultShown) {
      this.currentInput = '0.';
      this.isResultShown = false;
    } else if (!this.currentInput.includes('.')) {
      this.currentInput += '.';
    }
    this.updateDisplay();
  }

  toggleNegate() {
    if (this.currentInput === '0' || this.currentInput === 'Error') return;
    if (this.currentInput.startsWith('-')) {
      this.currentInput = this.currentInput.substring(1);
    } else {
      this.currentInput = '-' + this.currentInput;
    }
    this.updateDisplay();
  }

  applyPercent() {
    const val = parseFloat(this.currentInput);
    if (isNaN(val)) return;

    // If an operator is waiting in the expression, e.g. "200 + " and currentInput is "10"
    // 10% of 200 = 20
    const match = this.expression.trim().match(/^([\d\.\-]+)\s*([+\-−×÷*\/])\s*$/);
    if (match) {
      const baseNum = parseFloat(match[1]);
      const op = match[2];
      if (!isNaN(baseNum) && (op === '+' || op === '−' || op === '-')) {
        const percentVal = (baseNum * val) / 100;
        this.currentInput = this.cleanPrecision(percentVal).toString();
        this.updateDisplay();
        return;
      }
    }

    // Default standalone percent: val / 100
    const result = val / 100;
    this.currentInput = this.cleanPrecision(result).toString();
    this.updateDisplay();
  }

  setOperator(op) {
    if (this.currentInput === 'Error') {
      this.clearAll();
      return;
    }

    // If previous calculation just finished and user presses operator, continue chaining
    if (this.isResultShown) {
      this.expression = `${this.currentInput} ${op} `;
      this.isResultShown = false;
      this.currentInput = '0';
      this.updateDisplay();
      this.highlightActiveOperator(op);
      return;
    }

    // If user already entered an expression, evaluate intermediate step
    if (this.expression && !this.expression.endsWith('=')) {
      // If user typed operator consecutive times, just replace operator
      if (this.currentInput === '0') {
        this.expression = this.expression.replace(/[+\-−×÷*\/^]\s*$/, `${op} `);
        this.updateDisplay();
        this.highlightActiveOperator(op);
        return;
      }

      // Compute intermediate
      const fullExpr = `${this.expression}${this.currentInput}`;
      try {
        const intermediate = this.evaluateExpression(fullExpr);
        this.expression = `${this.cleanPrecision(intermediate)} ${op} `;
        this.currentInput = '0';
        this.updateDisplay();
        this.highlightActiveOperator(op);
        return;
      } catch (err) {
        // Fallback
      }
    }

    this.expression = `${this.currentInput} ${op} `;
    this.currentInput = '0';
    this.isResultShown = false;
    this.updateDisplay();
    this.highlightActiveOperator(op);
  }

  highlightActiveOperator(op) {
    document.querySelectorAll('.op-btn').forEach(btn => {
      btn.classList.toggle('op-active', btn.getAttribute('data-op') === op);
    });
  }

  clearActiveOperator() {
    document.querySelectorAll('.op-btn').forEach(btn => btn.classList.remove('op-active'));
  }

  calculate() {
    this.clearActiveOperator();

    if (!this.expression && !this.isResultShown) {
      // Nothing to calculate
      return;
    }

    let fullExpr;
    if (this.expression.endsWith('=')) {
      // Repeated equals logic
      return;
    } else if (this.expression) {
      fullExpr = `${this.expression}${this.currentInput}`;
    } else {
      fullExpr = this.currentInput;
    }

    try {
      const result = this.evaluateExpression(fullExpr);
      if (!isFinite(result) || isNaN(result)) {
        this.setError('Result is undefined');
        return;
      }

      const formattedResult = this.cleanPrecision(result).toString();

      // Log to history
      const historyItem = {
        expr: fullExpr,
        result: formattedResult,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      this.addHistoryItem(historyItem);

      this.expression = `${fullExpr} =`;
      this.currentInput = formattedResult;
      this.isResultShown = true;
      this.updateDisplay();
    } catch (err) {
      this.setError(err.message || 'Error');
    }
  }

  /**
   * Safe, robust token-based math expression evaluator
   * Handles: +, -, *, /, ^, parenthesis, and standard order of operations.
   */
  evaluateExpression(expr) {
    // Normalize symbols
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**');

    // Basic syntax validation
    if (/[^0-9\.\+\-\*\/\(\)\s\*\*\e]/.test(sanitized)) {
      throw new Error('Invalid syntax');
    }

    // Check for division by zero before or during eval
    if (/\/0(?!\.)(?!\d)/.test(sanitized)) {
      throw new Error('Cannot divide by zero');
    }

    // Function constructor execution with strictly sanitized math string
    const calcFunc = new Function(`"use strict"; return (${sanitized});`);
    const val = calcFunc();

    if (val === Infinity || val === -Infinity) {
      throw new Error('Cannot divide by zero');
    }

    return val;
  }

  cleanPrecision(num) {
    // Eliminates floating precision anomalies like 0.1 + 0.2 = 0.30000000000000004
    return parseFloat(Number(num).toPrecision(12));
  }

  backspace() {
    if (this.isResultShown) {
      this.expression = '';
      this.updateDisplay();
      return;
    }

    if (this.currentInput.length > 1) {
      this.currentInput = this.currentInput.slice(0, -1);
      if (this.currentInput === '-' || this.currentInput === '-0') {
        this.currentInput = '0';
      }
    } else {
      this.currentInput = '0';
    }
    this.updateDisplay();
  }

  clearAll() {
    this.currentInput = '0';
    this.expression = '';
    this.isResultShown = false;
    this.clearActiveOperator();
    this.updateDisplay();
  }

  setError(msg = 'Error') {
    this.currentInput = msg;
    this.expression = '';
    this.isResultShown = true;
    this.clearActiveOperator();
    this.updateDisplay();
    this.showToast(msg);
  }

  /* ========================================================================
     Display Rendering & Auto-Scaling
     ======================================================================== */
  updateDisplay() {
    if (this.expressionDisplay) {
      this.expressionDisplay.textContent = this.expression || '\u00A0';
    }

    if (this.mainDisplay) {
      const displayStr = this.formatDisplayNumber(this.currentInput);
      this.mainDisplay.textContent = displayStr;

      // Dynamic text resizing based on length
      const len = displayStr.length;
      this.mainDisplay.classList.remove('text-md', 'text-sm', 'text-xs');
      if (len > 14) {
        this.mainDisplay.classList.add('text-xs');
      } else if (len > 10) {
        this.mainDisplay.classList.add('text-sm');
      } else if (len > 7) {
        this.mainDisplay.classList.add('text-md');
      }
    }
  }

  formatDisplayNumber(str) {
    if (str === 'Error' || str.includes('undefined') || str.includes('Invalid') || str.includes('Cannot')) {
      return str;
    }
    if (str.includes('(') || str.includes(')')) {
      return str;
    }

    // Split on decimal
    const parts = str.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    // Add thousands separators to integer portion
    if (/^-?\d+$/.test(integerPart)) {
      const isNegative = integerPart.startsWith('-');
      const absInt = isNegative ? integerPart.slice(1) : integerPart;
      const formatted = absInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return (isNegative ? '-' : '') + formatted + decimalPart;
    }

    return str;
  }

  /* ========================================================================
     History Management
     ======================================================================== */
  addHistoryItem(item) {
    this.history.unshift(item);
    if (this.history.length > 40) {
      this.history.pop();
    }
    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    if (!this.historyList) return;

    if (this.history.length === 0) {
      this.historyList.innerHTML = `
        <div class="history-empty">
          <p>No calculation history yet.</p>
          <span>Perform calculations to see them logged here.</span>
        </div>
      `;
      return;
    }

    this.historyList.innerHTML = this.history
      .map(
        (item) => `
        <div class="history-card" data-result="${this.escapeHtml(item.result)}" title="Click to use result">
          <div class="history-card-header">
            <span>Formula</span>
            <span>${item.time || ''}</span>
          </div>
          <div class="history-expr">${this.escapeHtml(item.expr)}</div>
          <div class="history-result">${this.formatDisplayNumber(item.result)}</div>
        </div>
      `
      )
      .join('');
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
    this.showToast('History cleared');
  }

  toggleHistoryDrawer(open) {
    if (this.historyDrawer) {
      this.historyDrawer.classList.toggle('open', open);
    }
    if (this.drawerBackdrop) {
      this.drawerBackdrop.classList.toggle('active', open);
    }
  }

  /* ========================================================================
     Utility & UI Extras
     ======================================================================== */
  copyToClipboard() {
    const rawVal = this.currentInput;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(rawVal).then(() => {
        this.showToast('Copied to clipboard!');
      }).catch(() => {
        this.fallbackCopy(rawVal);
      });
    } else {
      this.fallbackCopy(rawVal);
    }
  }

  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      this.showToast('Copied to clipboard!');
    } catch (err) {
      this.showToast('Failed to copy');
    }
    document.body.removeChild(textarea);
  }

  cycleTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
    const newTheme = this.themes[this.currentThemeIndex];
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('auracalc_theme', newTheme);
    
    const themeNames = {
      obsidian: 'Midnight Obsidian',
      cyber: 'Cyber Neon',
      aurora: 'Aurora Glass',
      titanium: 'Titanium Luxe'
    };
    this.showToast(`Theme: ${themeNames[newTheme]}`);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('auracalc_sound', this.soundEnabled.toString());
    this.updateSoundIcon();
    this.showToast(this.soundEnabled ? 'Sound Enabled' : 'Sound Muted');
    if (this.soundEnabled) {
      this.playHapticClick(600, 0.05);
    }
  }

  updateSoundIcon() {
    const soundOn = document.querySelector('.icon-sound-on');
    const soundOff = document.querySelector('.icon-sound-off');
    if (soundOn && soundOff) {
      soundOn.classList.toggle('hidden', !this.soundEnabled);
      soundOff.classList.toggle('hidden', this.soundEnabled);
    }
  }

  showToast(message) {
    if (!this.toastNotification) return;
    this.toastNotification.textContent = message;
    this.toastNotification.classList.add('show');
    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      this.toastNotification.classList.remove('show');
    }, 2200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.auraCalc = new AuraCalculator();
});
