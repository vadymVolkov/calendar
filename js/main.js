/**
 * Telegram Habit Tracker & Diary - October
 * Monday-Aligned Calendar Grid, State Management, LocalStorage & Telegram Generator
 */

(function () {
    'use strict';

    // October has 31 days
    const DAYS_IN_OCTOBER = 31;
    const STORAGE_KEY = 'telegram_october_habits_v3';

    // Weekdays starting from Monday (Пн = 0, Вт = 1, Ср = 2, Чт = 3, Пт = 4, Сб = 5, Вс = 6)
    const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // October 1, 2026 is Thursday (Index 3 in Mon-Sun week)
    // Offset = 3 (Mon Sep 28, Tue Sep 29, Wed Sep 30 are padded slots)
    const START_OFFSET = 3;
    const TOTAL_SLOTS = 35; // 5 weeks x 7 days

    const STATUS_SYMBOLS = {
        0: '⚪',
        1: '✅',
        2: '❌',
        pad: '⚫'
    };

    // Standard initial categories from user request
    const DEFAULT_HABITS = [
        { id: '1', emoji: '🧑🤝🧑', title: 'Новые знакомства' },
        { id: '2', emoji: '🤝', title: 'Друзья' },
        { id: '3', emoji: '🚶', title: '10 000 шагов' },
        { id: '4', emoji: '🏃', title: 'Спорт' },
        { id: '5', emoji: '🥗', title: 'Питание' },
        { id: '6', emoji: '🎯', title: 'Увлечения' },
        { id: '7', emoji: '💼', title: 'Работа' },
        { id: '8', emoji: '🎓', title: 'Обучение' },
        { id: '9', emoji: '❤️', title: 'Романтика' }
    ];

    // State
    let habits = [];

    // DOM Elements
    const habitsContainer = document.getElementById('habits-container');
    const statTotalCompleted = document.getElementById('stat-total-completed');
    const statPercent = document.getElementById('stat-percent');
    const statActiveHabits = document.getElementById('stat-active-habits');
    const statOverallBar = document.getElementById('stat-overall-bar');

    const btnCopyTelegram = document.getElementById('btn-copy-telegram');
    const btnAddHabit = document.getElementById('btn-add-habit');
    const btnResetMonth = document.getElementById('btn-reset-month');
    const btnRestoreDefaults = document.getElementById('btn-restore-defaults');

    // Modals
    const modalHabit = document.getElementById('modal-habit');
    const modalHabitTitle = document.getElementById('modal-habit-title');
    const modalHabitClose = document.getElementById('modal-habit-close');
    const modalHabitCancel = document.getElementById('modal-habit-cancel');
    const formHabit = document.getElementById('form-habit');
    const inputHabitId = document.getElementById('habit-id');
    const inputHabitTitle = document.getElementById('habit-title');
    const inputHabitEmoji = document.getElementById('habit-emoji');

    const modalTelegram = document.getElementById('modal-telegram');
    const modalTelegramClose = document.getElementById('modal-telegram-close');
    const telegramTextPreview = document.getElementById('telegram-text-preview');
    const btnModalCopy = document.getElementById('btn-modal-copy');

    const toastContainer = document.getElementById('toast-container');

    // --------------------------------------------------------------------------
    // Initialization & State Management
    // --------------------------------------------------------------------------

    function init() {
        loadState();
        renderApp();
        setupEventListeners();
    }

    function createEmptyMonthArray() {
        // All 31 days default to 0 (white circle ⚪)
        return new Array(DAYS_IN_OCTOBER).fill(0);
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                habits = JSON.parse(saved);
            } else {
                habits = DEFAULT_HABITS.map(h => ({
                    ...h,
                    days: createEmptyMonthArray()
                }));
                saveState();
            }
        } catch (e) {
            console.error('Failed to load state:', e);
            habits = DEFAULT_HABITS.map(h => ({ ...h, days: createEmptyMonthArray() }));
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    // --------------------------------------------------------------------------
    // Render Functions
    // --------------------------------------------------------------------------

    function renderApp() {
        renderHabits();
        renderStats();
    }

    function renderStats() {
        let totalCompleted = 0;
        const maxPossible = habits.length * DAYS_IN_OCTOBER;

        habits.forEach(habit => {
            totalCompleted += habit.days.filter(val => val === 1).length;
        });

        const percent = maxPossible > 0 ? Math.round((totalCompleted / maxPossible) * 100) : 0;

        statTotalCompleted.textContent = `${totalCompleted} / ${maxPossible}`;
        statPercent.textContent = `${percent}%`;
        statActiveHabits.textContent = habits.length;
        statOverallBar.style.width = `${percent}%`;
    }

    function renderHabits() {
        habitsContainer.innerHTML = '';

        if (habits.length === 0) {
            habitsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <div style="font-size: 40px; margin-bottom: 10px;">📋</div>
                    <p>Список привычек пуст. Нажмите «Добавить привычку» или «Сбросить настройки».</p>
                </div>
            `;
            return;
        }

        habits.forEach((habit) => {
            const card = document.createElement('div');
            card.className = 'habit-card';

            const totalCompleted = habit.days.filter(val => val === 1).length;

            // Card Header
            const header = document.createElement('div');
            header.className = 'habit-card-header';
            header.innerHTML = `
                <div class="habit-title-group">
                    <span class="habit-emoji">${habit.emoji}</span>
                    <span class="habit-name">${escapeHtml(habit.title)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="habit-score-badge">${totalCompleted}/${DAYS_IN_OCTOBER}</span>
                    <div class="habit-card-actions">
                        <button class="btn-icon-only edit-habit" data-id="${habit.id}" title="Редактировать">✏️</button>
                        <button class="btn-icon-only danger delete-habit" data-id="${habit.id}" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;

            // Weeks container
            const weeksContainer = document.createElement('div');
            weeksContainer.className = 'weeks-container';

            // Add Weekday Header (Пн, Вт, Ср, Чт, Пт, Сб, Вс)
            const weekdayHeader = document.createElement('div');
            weekdayHeader.className = 'weekdays-header';
            weekdayHeader.innerHTML = `
                <span style="width: 28px;"></span>
                <div class="weekdays-header-days">
                    ${WEEKDAYS_RU.map(day => `<span class="weekdays-header-day">${day}</span>`).join('')}
                </div>
                <span style="width: 20px;"></span>
            `;
            weeksContainer.appendChild(weekdayHeader);

            // 5 Weeks rows (7 columns aligned to Mon-Sun)
            const weeks = [
                { label: 'н1', start: 0, end: 7 },
                { label: 'н2', start: 7, end: 14 },
                { label: 'н3', start: 14, end: 21 },
                { label: 'н4', start: 21, end: 28 },
                { label: 'н5', start: 28, end: 35 }
            ];

            weeks.forEach(w => {
                const weekRow = document.createElement('div');
                weekRow.className = 'week-row';

                const label = document.createElement('span');
                label.className = 'week-label';
                label.textContent = w.label;

                const daysRow = document.createElement('div');
                daysRow.className = 'days-row';

                let weekScore = 0;

                for (let slotIndex = w.start; slotIndex < w.end; slotIndex++) {
                    const slot = document.createElement('div');
                    const dayIndex = slotIndex - START_OFFSET; // 0 to 30 for October

                    if (dayIndex >= 0 && dayIndex < DAYS_IN_OCTOBER) {
                        // Active day in October
                        const status = habit.days[dayIndex];
                        if (status === 1) weekScore++;

                        const dayNum = dayIndex + 1;
                        const weekdayStr = WEEKDAYS_RU[slotIndex % 7];
                        const tooltipText = `${dayNum} октября (${weekdayStr})`;

                        let statusClass = 'status-white';
                        if (status === 1) statusClass = 'status-green';
                        if (status === 2) statusClass = 'status-red';

                        slot.className = `day-slot ${statusClass}`;
                        slot.setAttribute('data-tooltip', tooltipText);

                        // Left-click to toggle: 0 (⚪) -> 1 (✅) -> 2 (❌) -> 0 (⚪)
                        slot.addEventListener('click', () => {
                            habit.days[dayIndex] = (habit.days[dayIndex] + 1) % 3;
                            saveState();
                            renderApp();
                        });

                        // Right-click to toggle Red ❌ / White ⚪
                        slot.addEventListener('contextmenu', (e) => {
                            e.preventDefault();
                            if (habit.days[dayIndex] === 2) {
                                habit.days[dayIndex] = 0;
                            } else {
                                habit.days[dayIndex] = 2;
                            }
                            saveState();
                            renderApp();
                        });
                    } else {
                        // Padded slot (before Oct 1 or after Oct 31)
                        slot.className = 'day-slot status-pad';
                        const padLabel = dayIndex < 0 ? 'До 1 октября' : 'После 31 октября';
                        slot.setAttribute('data-tooltip', padLabel);
                    }

                    daysRow.appendChild(slot);
                }

                const scoreSpan = document.createElement('span');
                scoreSpan.className = 'week-score';
                scoreSpan.textContent = weekScore;

                weekRow.appendChild(label);
                weekRow.appendChild(daysRow);
                weekRow.appendChild(scoreSpan);

                weeksContainer.appendChild(weekRow);
            });

            card.appendChild(header);
            card.appendChild(weeksContainer);

            // Edit / Delete handlers
            header.querySelector('.edit-habit').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(habit);
            });

            header.querySelector('.delete-habit').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHabit(habit.id);
            });

            habitsContainer.appendChild(card);
        });
    }

    // --------------------------------------------------------------------------
    // Telegram Post Text Formatting
    // --------------------------------------------------------------------------

    function generateTelegramText() {
        let lines = [];

        habits.forEach(habit => {
            const completedCount = habit.days.filter(val => val === 1).length;
            // Title line: 🧑🤝🧑 Новые знакомства — 6/31
            lines.push(`${habit.emoji} ${habit.title} — ${completedCount}/${DAYS_IN_OCTOBER}`);

            const weeks = [
                { label: 'н1', start: 0, end: 7 },
                { label: 'н2', start: 7, end: 14 },
                { label: 'н3', start: 14, end: 21 },
                { label: 'н4', start: 21, end: 28 },
                { label: 'н5', start: 28, end: 35 }
            ];

            weeks.forEach(w => {
                let symbols = '';
                let weekScore = 0;

                for (let slotIndex = w.start; slotIndex < w.end; slotIndex++) {
                    const dayIndex = slotIndex - START_OFFSET;

                    if (dayIndex >= 0 && dayIndex < DAYS_IN_OCTOBER) {
                        const status = habit.days[dayIndex];
                        symbols += STATUS_SYMBOLS[status];
                        if (status === 1) weekScore++;
                    } else {
                        symbols += STATUS_SYMBOLS.pad; // ⚫ for padded slots
                    }
                }

                lines.push(`${w.label} ${symbols} ${weekScore}`);
            });

            lines.push(''); // Blank line separator
        });

        return lines.join('\n').trim();
    }

    function showTelegramModal() {
        const text = generateTelegramText();
        telegramTextPreview.textContent = text;
        modalTelegram.classList.add('active');
    }

    function copyTelegramToClipboard() {
        const text = generateTelegramText();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Текст для Telegram скопирован в буфер обмена!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Текст скопирован в буфер!', 'success');
        });
    }

    // --------------------------------------------------------------------------
    // Habit Actions (Add, Edit, Delete, Reset)
    // --------------------------------------------------------------------------

    function openAddModal() {
        modalHabitTitle.textContent = 'Добавить новую привычку';
        inputHabitId.value = '';
        inputHabitTitle.value = '';
        inputHabitEmoji.value = '🎯';
        modalHabit.classList.add('active');
        inputHabitTitle.focus();
    }

    function openEditModal(habit) {
        modalHabitTitle.textContent = 'Редактировать привычку';
        inputHabitId.value = habit.id;
        inputHabitTitle.value = habit.title;
        inputHabitEmoji.value = habit.emoji;
        modalHabit.classList.add('active');
        inputHabitTitle.focus();
    }

    function closeHabitModal() {
        modalHabit.classList.remove('active');
    }

    function saveHabitFromForm(e) {
        e.preventDefault();
        const id = inputHabitId.value;
        const title = inputHabitTitle.value.trim();
        const emoji = inputHabitEmoji.value.trim() || '🎯';

        if (!title) return;

        if (id) {
            const habit = habits.find(h => h.id === id);
            if (habit) {
                habit.title = title;
                habit.emoji = emoji;
            }
            showToast('Привычка обновлена', 'success');
        } else {
            const newHabit = {
                id: Date.now().toString(),
                title: title,
                emoji: emoji,
                days: createEmptyMonthArray()
            };
            habits.push(newHabit);
            showToast('Привычка добавлена', 'success');
        }

        saveState();
        renderApp();
        closeHabitModal();
    }

    function deleteHabit(id) {
        if (confirm('Вы уверены, что хотите удалить эту привычку?')) {
            habits = habits.filter(h => h.id !== id);
            saveState();
            renderApp();
            showToast('Привычка удалена', 'success');
        }
    }

    function resetMonthToWhite() {
        if (confirm('Сбросить все отметки на ⚪ (белый цвет) за Октябрь?')) {
            habits.forEach(h => {
                h.days = createEmptyMonthArray();
            });
            saveState();
            renderApp();
            showToast('Все отметки сброшены на ⚪', 'success');
        }
    }

    function restoreDefaults() {
        if (confirm('Восстановить исходные 9 привычек по умолчанию? Все текущие отметки будут сброшены.')) {
            habits = DEFAULT_HABITS.map(h => ({
                ...h,
                days: createEmptyMonthArray()
            }));
            saveState();
            renderApp();
            showToast('Настройки восстановлены по умолчанию', 'success');
        }
    }

    // --------------------------------------------------------------------------
    // UI Helpers & Toast
    // --------------------------------------------------------------------------

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>✓</span> <span>${escapeHtml(message)}</span>`;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }

    // --------------------------------------------------------------------------
    // Event Listeners Setup
    // --------------------------------------------------------------------------

    function setupEventListeners() {
        btnCopyTelegram.addEventListener('click', () => {
            showTelegramModal();
        });

        btnAddHabit.addEventListener('click', openAddModal);
        btnResetMonth.addEventListener('click', resetMonthToWhite);
        btnRestoreDefaults.addEventListener('click', restoreDefaults);

        modalHabitClose.addEventListener('click', closeHabitModal);
        modalHabitCancel.addEventListener('click', closeHabitModal);
        formHabit.addEventListener('submit', saveHabitFromForm);

        modalTelegramClose.addEventListener('click', () => {
            modalTelegram.classList.remove('active');
        });

        btnModalCopy.addEventListener('click', () => {
            copyTelegramToClipboard();
        });

        window.addEventListener('click', (e) => {
            if (e.target === modalHabit) closeHabitModal();
            if (e.target === modalTelegram) modalTelegram.classList.remove('active');
        });
    }

    document.addEventListener('DOMContentLoaded', init);

})();
