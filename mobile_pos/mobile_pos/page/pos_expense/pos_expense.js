frappe.pages['pos-expense'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.pos_expense', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.pos_expense');
});

const TEXT = {
    PAGE_TITLE: "سند مصروفات",
    EXPENSE_TYPE: "نوع المصروف",
    SELECT_EXPENSE: "اختر نوع المصروف",
    SEARCH_EXPENSE: "ابحث...",
    MODE_OF_PAYMENT: "طريقة الدفع",
    SELECT_MODE: "اختر طريقة الدفع",
    AMOUNT: "المبلغ",
    REMARKS: "ملاحظات",
    SUBMIT: "حفظ واعتماد",
    SUBMITTING: "جارٍ الحفظ...",
    SUCCESS: (name, je) => `تم إنشاء السند ${name} بنجاح!` + (je ? ` (قيد: ${je})` : ''),
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_EXPENSE: "يرجى اختيار نوع المصروف.",
    REQUIRED_MODE: "يرجى اختيار طريقة الدفع.",
    REQUIRED_AMOUNT: "يرجى إدخال المبلغ.",
    BACK: "الرئيسية"
};

let context = null;
let selectedExpense = "";
let selectedExpenseLabel = "";
let selectedMode = "";

$(wrapper).html(`
<div class="ee-page" dir="rtl">
    <div class="ee-header">
        <div class="ee-header-inner">
            <a href="/main" class="ee-back-btn"><i class="fa fa-home"></i></a>
            <h1 class="ee-title"><i class="fa fa-file-text-o"></i> ${TEXT.PAGE_TITLE}</h1>
        </div>
    </div>
    <div class="ee-body">
        <div class="ee-card">
            <!-- Expense Type -->
            <div class="ee-field">
                <label class="ee-label">${TEXT.EXPENSE_TYPE}</label>
                <button type="button" id="ee-expense-btn" class="ee-select-btn">
                    <i class="fa fa-file-text-o"></i>
                    <span id="ee-expense-label">${TEXT.SELECT_EXPENSE}</span>
                    <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                </button>
            </div>

            <!-- Mode of Payment -->
            <div class="ee-field">
                <label class="ee-label">${TEXT.MODE_OF_PAYMENT}</label>
                <button type="button" id="ee-mode-btn" class="ee-select-btn">
                    <i class="fa fa-credit-card"></i>
                    <span id="ee-mode-label">${TEXT.SELECT_MODE}</span>
                    <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                </button>
            </div>

            <!-- Amount -->
            <div class="ee-field">
                <label class="ee-label">${TEXT.AMOUNT}</label>
                <input id="ee-amount" type="text" inputmode="decimal" class="ee-input ee-input-amount" placeholder="0.00" autocomplete="off">
            </div>

            <!-- Remarks -->
            <div class="ee-field">
                <label class="ee-label">${TEXT.REMARKS}</label>
                <textarea id="ee-remarks" class="ee-input ee-textarea" rows="2"></textarea>
            </div>

            <!-- Submit -->
            <button type="button" id="ee-submit" class="ee-submit-btn">
                <i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}
            </button>
            <div id="ee-result"></div>
        </div>
    </div>
</div>
<style>
.ee-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}
.ee-header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 50%,#1d4ed8 100%);padding:20px 16px 24px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(37,99,235,0.3);}
.ee-header-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;gap:14px;}
.ee-back-btn{color:#fff;font-size:1.3em;text-decoration:none;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,0.15);transition:background 0.2s;}
.ee-back-btn:hover{background:rgba(255,255,255,0.25);color:#fff;text-decoration:none;}
.ee-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
.ee-body{max-width:600px;margin:0 auto;padding:20px 16px;}
.ee-card{background:#fff;border-radius:20px;padding:24px 20px;margin-bottom:20px;box-shadow:0 8px 30px rgba(0,0,0,0.06);}
.ee-field{margin-bottom:20px;}
.ee-label{display:block;font-weight:700;color:#334155;margin-bottom:8px;font-size:0.95em;}
.ee-input{width:100%;padding:14px 16px;border:2px solid #e2e8f0;border-radius:14px;font-size:1.05em;font-family:inherit;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s;outline:none;text-align:right;}
.ee-input:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,0.12);background:#fff;}
.ee-input-amount{font-size:1.4em;font-weight:700;text-align:center;letter-spacing:1px;}
.ee-textarea{resize:none;min-height:60px;}
.ee-select-btn{width:100%;padding:14px 16px;border:2px solid #e2e8f0;border-radius:14px;background:#f8fafc;font-family:inherit;font-size:1.05em;font-weight:600;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;text-align:right;}
.ee-select-btn:hover{border-color:#3b82f6;color:#1d4ed8;}
.ee-select-btn.ee-selected{border-color:#3b82f6;color:#1e40af;background:#eff6ff;}
.ee-submit-btn{width:100%;padding:16px;border:none;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-family:inherit;font-size:1.15em;font-weight:800;cursor:pointer;transition:all 0.2s;box-shadow:0 8px 25px rgba(37,99,235,0.3);display:flex;align-items:center;justify-content:center;gap:10px;}
.ee-submit-btn:hover{transform:translateY(-2px);box-shadow:0 12px 35px rgba(37,99,235,0.4);}
.ee-submit-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.hidden{display:none!important;}
.ee-error{background:#fef2f2;border:2px solid #fca5a5;border-radius:14px;padding:16px;margin-top:16px;text-align:center;color:#991b1b;font-weight:600;}
.ee-popup-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;}
.ee-popup{background:#fff;border-radius:20px;padding:24px 20px;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.2);max-height:80vh;display:flex;flex-direction:column;}
.ee-popup-title{font-size:1.1em;font-weight:800;color:#1e293b;margin-bottom:14px;text-align:center;}
.ee-popup-search{width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;background:#f8fafc;outline:none;text-align:right;margin-bottom:12px;transition:border-color 0.2s;}
.ee-popup-search:focus{border-color:#3b82f6;background:#fff;}
.ee-popup-list{overflow-y:auto;flex:1;max-height:55vh;}
.ee-popup-card{display:flex;align-items:center;gap:12px;padding:14px;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;background:#f8fafc;}
.ee-popup-card:hover{border-color:#3b82f6;background:#eff6ff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.12);}
.ee-popup-card-icon{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
.ee-popup-card-info{flex:1;min-width:0;}
.ee-popup-card-name{font-weight:700;color:#1e293b;font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ee-popup-card-sub{font-size:0.85em;color:#64748b;margin-top:2px;}
.ee-popup-empty{text-align:center;padding:30px;color:#94a3b8;font-size:0.95em;}
@media(max-width:480px){.ee-title{font-size:1.1em;}}
</style>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}

frappe.call({
    method: "mobile_pos.mobile_pos.page.pos_expense.api.get_context",
    callback: function(r) { context = r.message; }
});

// Expense type popup with search
$(wrapper).on('click', '#ee-expense-btn', function() {
    if (!context || !context.expenses || !context.expenses.length) return;
    let list = context.expenses;

    function renderCards(items) {
        if (!items.length) return `<div class="ee-popup-empty">لا توجد نتائج</div>`;
        return items.map(e =>
            `<div class="ee-popup-card" data-value="${e.name}" data-label="${(e.expense_name || e.name).replace(/"/g, '&quot;')}">
                <div class="ee-popup-card-icon"><i class="fa fa-file-text-o"></i></div>
                <div class="ee-popup-card-info">
                    <div class="ee-popup-card-name">${e.expense_name}</div>
                    <div class="ee-popup-card-sub">${e.name}</div>
                </div>
            </div>`
        ).join('');
    }

    let popup = $(`<div class="ee-popup-overlay">
        <div class="ee-popup">
            <div class="ee-popup-title"><i class="fa fa-file-text-o"></i> ${TEXT.SELECT_EXPENSE}</div>
            <input type="text" class="ee-popup-search" placeholder="${TEXT.SEARCH_EXPENSE}" autocomplete="off">
            <div class="ee-popup-list">${renderCards(list.slice(0, 50))}</div>
        </div>
    </div>`);
    $('body').append(popup);
    popup.find('.ee-popup-search').focus();

    popup.on('input', '.ee-popup-search', function() {
        let val = $(this).val().trim().toLowerCase();
        let filtered = val
            ? list.filter(e => e.expense_name.toLowerCase().includes(val) || e.name.toLowerCase().includes(val)).slice(0, 50)
            : list.slice(0, 50);
        popup.find('.ee-popup-list').html(renderCards(filtered));
    });

    popup.on('click', '.ee-popup-card', function() {
        selectedExpense = $(this).data('value');
        selectedExpenseLabel = $(this).data('label');
        $('#ee-expense-label').text(selectedExpenseLabel);
        $('#ee-expense-btn').addClass('ee-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('ee-popup-overlay')) popup.remove();
    });
});

// Mode of Payment popup
$(wrapper).on('click', '#ee-mode-btn', function() {
    if (!context || !context.modes.length) return;
    let cards = context.modes.map(m =>
        `<div class="ee-popup-card" data-mode="${m}">
            <div class="ee-popup-card-icon"><i class="fa fa-credit-card"></i></div>
            <div class="ee-popup-card-info">
                <div class="ee-popup-card-name">${m}</div>
            </div>
        </div>`
    ).join('');
    let popup = $(`<div class="ee-popup-overlay">
        <div class="ee-popup">
            <div class="ee-popup-title"><i class="fa fa-credit-card"></i> ${TEXT.SELECT_MODE}</div>
            <div class="ee-popup-list">${cards}</div>
        </div>
    </div>`);
    $('body').append(popup);

    popup.on('click', '.ee-popup-card', function() {
        selectedMode = $(this).data('mode');
        $('#ee-mode-label').text(selectedMode);
        $('#ee-mode-btn').addClass('ee-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('ee-popup-overlay')) popup.remove();
    });
});

// Amount
$(wrapper).on('input', '#ee-amount', function() {
    let val = convertArabicToEnglishNumbers($(this).val());
    if (val !== $(this).val()) $(this).val(val);
});
$(wrapper).on('blur', '#ee-amount', function() {
    let val = parseFloat(convertArabicToEnglishNumbers($(this).val())) || 0;
    $(this).val(val > 0 ? val.toFixed(2) : '');
});

// Submit
$(wrapper).on('click', '#ee-submit', async function() {
    if (!selectedExpense) return frappe.show_alert({ message: TEXT.REQUIRED_EXPENSE, indicator: 'red' }, 3);
    if (!selectedMode) return frappe.show_alert({ message: TEXT.REQUIRED_MODE, indicator: 'red' }, 3);
    let amount = parseFloat(convertArabicToEnglishNumbers($('#ee-amount').val())) || 0;
    if (amount <= 0) return frappe.show_alert({ message: TEXT.REQUIRED_AMOUNT, indicator: 'red' }, 3);

    let $btn = $(this);
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SUBMITTING}`);
    try {
        let r = await frappe.call({
            method: "mobile_pos.mobile_pos.page.pos_expense.api.create_expense_entry",
            type: "POST",
            args: { data: JSON.stringify({
                expense: selectedExpense, mode_of_payment: selectedMode,
                amount: amount, remarks: $('#ee-remarks').val().trim()
            })}
        });
        let doc = r.message;
        frappe.show_alert({ message: TEXT.SUCCESS(doc.name, doc.journal_entry), indicator: 'green' }, 3);
        // Auto-clear
        selectedExpense = ""; selectedExpenseLabel = "";
        $('#ee-expense-label').text(TEXT.SELECT_EXPENSE);
        $('#ee-expense-btn').removeClass('ee-selected');
        selectedMode = "";
        $('#ee-mode-label').text(TEXT.SELECT_MODE);
        $('#ee-mode-btn').removeClass('ee-selected');
        $('#ee-amount').val('');
        $('#ee-remarks').val('');
        $('#ee-result').empty();
    } catch (err) {
        let msg = err.message || (err._server_messages && JSON.parse(err._server_messages)[0]) || TEXT.ERROR;
        $('#ee-result').html(`<div class="ee-error">${msg}</div>`);
    }
    $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
});

};
