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
    BACK: "الرئيسية",
    RECENT_ENTRIES: "السندات السابقة",
    NO_ENTRIES: "لا توجد سندات",
    DRAFT: "مسودة",
    SUBMITTED: "معتمد",
    CANCELLED: "ملغي",
    SUBMIT_ENTRY: "اعتماد",
    CANCEL_ENTRY: "إلغاء",
    CONFIRM_SUBMIT: "هل أنت متأكد من اعتماد هذا السند؟",
    CONFIRM_CANCEL: "هل أنت متأكد من إلغاء هذا السند؟ سيتم إلغاء القيد المحاسبي المرتبط.",
    SUBMIT_SUCCESS: (name) => `تم اعتماد السند ${name} بنجاح!`,
    CANCEL_SUCCESS: (name) => `تم إلغاء السند ${name} بنجاح!`,
    NEW_EXPENSE: "سند جديد",
    TAB_NEW: "سند جديد",
    TAB_LIST: "السندات"
};

let context = null;
let selectedExpense = "";
let selectedExpenseLabel = "";
let selectedMode = "";
let recentEntries = [];

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

$(wrapper).html(`
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<div class="ee-page" dir="rtl">
    <div class="ee-header">
        <div class="ee-header-inner">
            <h1 class="ee-title"><i class="fa fa-file-text-o"></i> ${TEXT.PAGE_TITLE}</h1>
            <div class="ee-header-actions">
                <button type="button" id="ee-refresh-btn" class="ee-header-btn ee-refresh-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="ee-home-btn" class="ee-header-btn ee-home-btn" title="الرئيسية"><i class="fa fa-home"></i> ${TEXT.BACK}</button>
            </div>
        </div>
        <div class="ee-tabs">
            <button type="button" class="ee-tab active" data-tab="new"><i class="fa fa-plus-circle"></i> ${TEXT.TAB_NEW}</button>
            <button type="button" class="ee-tab" data-tab="list"><i class="fa fa-list"></i> ${TEXT.TAB_LIST}</button>
        </div>
    </div>
    <div class="ee-body">
        <!-- New Expense Tab -->
        <div id="ee-tab-new" class="ee-tab-content active">
            <div class="ee-card">
                <div class="ee-field">
                    <label class="ee-label">${TEXT.EXPENSE_TYPE}</label>
                    <button type="button" id="ee-expense-btn" class="ee-select-btn">
                        <i class="fa fa-file-text-o"></i>
                        <span id="ee-expense-label">${TEXT.SELECT_EXPENSE}</span>
                        <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                    </button>
                </div>
                <div class="ee-field">
                    <label class="ee-label">${TEXT.MODE_OF_PAYMENT}</label>
                    <button type="button" id="ee-mode-btn" class="ee-select-btn">
                        <i class="fa fa-credit-card"></i>
                        <span id="ee-mode-label">${TEXT.SELECT_MODE}</span>
                        <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                    </button>
                </div>
                <div class="ee-field">
                    <label class="ee-label">${TEXT.AMOUNT}</label>
                    <input id="ee-amount" type="text" inputmode="decimal" class="ee-input ee-input-amount" placeholder="0.00" autocomplete="off">
                </div>
                <div class="ee-field">
                    <label class="ee-label">${TEXT.REMARKS}</label>
                    <textarea id="ee-remarks" class="ee-input ee-textarea" rows="2"></textarea>
                </div>
                <button type="button" id="ee-submit" class="ee-submit-btn">
                    <i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}
                </button>
                <div id="ee-result"></div>
            </div>
        </div>
        <!-- List Tab -->
        <div id="ee-tab-list" class="ee-tab-content">
            <div id="ee-entries-loading" class="ee-entries-loading">
                <div class="ee-spinner"></div>
                <span>جاري التحميل...</span>
            </div>
            <div id="ee-entries-list"></div>
            <div id="ee-entries-empty" class="ee-entries-empty hidden">
                <i class="fa fa-inbox"></i>
                <div>${TEXT.NO_ENTRIES}</div>
            </div>
        </div>
    </div>
</div>
<style>
.ee-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}
.ee-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);padding:20px 16px 0;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(102,126,234,0.35);}
.ee-header-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;gap:14px;padding-bottom:14px;}
.ee-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.ee-header-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:0.95em;font-weight:700;border:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;white-space:nowrap;font-family:inherit;position:relative;overflow:hidden;}
.ee-home-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 16px rgba(16,185,129,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:100px;}
.ee-home-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,185,129,0.5),inset 0 1px 1px rgba(255,255,255,0.4);}
.ee-home-btn:active{transform:translateY(0);}
.ee-refresh-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 4px 16px rgba(59,130,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.ee-refresh-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(59,130,246,0.5);}
.ee-refresh-btn:active{transform:scale(0.95);}
.ee-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}

/* Tabs */
.ee-tabs{max-width:600px;margin:0 auto;display:flex;gap:0;border-bottom:none;}
.ee-tab{flex:1;padding:12px 16px;border:none;background:rgba(255,255,255,0.15);color:rgba(255,255,255,0.7);font-family:inherit;font-size:0.95em;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:14px 14px 0 0;margin:0 2px;}
.ee-tab.active{background:#fff;color:#764ba2;box-shadow:0 -2px 10px rgba(0,0,0,0.05);}
.ee-tab:not(.active):hover{background:rgba(255,255,255,0.25);color:#fff;}

.ee-body{max-width:600px;margin:0 auto;padding:20px 16px;}
.ee-tab-content{display:none;}
.ee-tab-content.active{display:block;}
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

/* Selection Popups */
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

/* Entries List */
.ee-entries-loading{text-align:center;padding:40px;color:#64748b;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:12px;}
.ee-spinner{width:36px;height:36px;border:4px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:eeSpin 0.8s linear infinite;}
@keyframes eeSpin{to{transform:rotate(360deg);}}
.ee-entries-empty{text-align:center;padding:50px 20px;color:#94a3b8;font-size:1.1em;}
.ee-entries-empty i{font-size:3em;margin-bottom:12px;display:block;}

/* Compact Entry Cards */
.ee-entry-card{background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:10px;box-shadow:0 3px 12px rgba(0,0,0,0.05);border-right:5px solid #3b82f6;transition:all 0.2s;cursor:pointer;}
.ee-entry-card:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,0.08);}
.ee-entry-card:active{transform:translateY(0);}
.ee-entry-card.draft{border-right-color:#f59e0b;}
.ee-entry-card.submitted{border-right-color:#10b981;}
.ee-entry-card.cancelled{border-right-color:#ef4444;opacity:0.65;}

.ee-entry-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.ee-entry-name{font-weight:800;color:#1e293b;font-size:0.9em;flex:1;}
.ee-entry-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:0.72em;font-weight:700;white-space:nowrap;}
.ee-entry-badge.draft{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;}
.ee-entry-badge.submitted{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;}
.ee-entry-badge.cancelled{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;}

.ee-entry-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.88em;color:#475569;}
.ee-entry-row.sub{font-size:0.8em;color:#94a3b8;margin-top:4px;}
.ee-entry-row i{margin-left:4px;}
.ee-entry-expense-name{font-weight:600;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.ee-entry-amount-sm{font-weight:800;color:#1e293b;font-size:1.1em;white-space:nowrap;flex-shrink:0;}

/* Detail Popup */
.ee-detail-popup{background:#fff;border-radius:24px;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.25);animation:eeSlideUp 0.3s ease;overflow:hidden;}
.ee-detail-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;color:#fff;display:flex;align-items:center;gap:10px;}
.ee-detail-close{background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:1.1em;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;flex-shrink:0;}
.ee-detail-close:hover{background:rgba(255,255,255,0.3);}
.ee-detail-title{font-weight:800;font-size:1.05em;flex:1;}
.ee-detail-header .ee-entry-badge{border:1px solid rgba(255,255,255,0.3);}

.ee-detail-amount-box{text-align:center;padding:20px;background:linear-gradient(135deg,#f0f9ff,#e0f2fe);}
.ee-detail-amount-label{font-size:0.85em;font-weight:600;color:#64748b;margin-bottom:4px;}
.ee-detail-amount-val{font-size:2em;font-weight:900;color:#1e293b;letter-spacing:1px;}

.ee-detail-fields{padding:20px;}
.ee-detail-field{margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #f1f5f9;}
.ee-detail-field:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
.ee-detail-label{font-size:0.82em;font-weight:600;color:#94a3b8;margin-bottom:4px;display:flex;align-items:center;gap:6px;}
.ee-detail-label i{width:14px;text-align:center;}
.ee-detail-value{font-size:1em;font-weight:700;color:#1e293b;}
.ee-detail-value.remarks{font-weight:500;color:#475569;font-size:0.92em;line-height:1.5;background:#f8fafc;padding:8px 12px;border-radius:10px;}

.ee-detail-actions{padding:0 20px 20px;display:flex;gap:10px;}
.ee-detail-action-btn{flex:1;padding:14px 20px;border:none;border-radius:14px;font-family:inherit;font-size:1em;font-weight:800;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}
.ee-detail-action-btn:hover{transform:translateY(-2px);}
.ee-detail-action-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
.ee-detail-action-btn.submit-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 6px 20px rgba(16,185,129,0.35);}
.ee-detail-action-btn.submit-btn:hover{box-shadow:0 8px 28px rgba(16,185,129,0.45);}
.ee-detail-action-btn.cancel-btn{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 6px 20px rgba(239,68,68,0.35);}
.ee-detail-action-btn.cancel-btn:hover{box-shadow:0 8px 28px rgba(239,68,68,0.45);}

/* Confirm Dialog */
.ee-confirm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:eeFadeIn 0.2s ease;}
@keyframes eeFadeIn{from{opacity:0;}to{opacity:1;}}
.ee-confirm-box{background:#fff;border-radius:24px;padding:32px 24px 24px;max-width:380px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.25);text-align:center;animation:eeSlideUp 0.3s ease;}
@keyframes eeSlideUp{from{transform:translateY(30px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.ee-confirm-icon{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:1.8em;}
.ee-confirm-icon.submit{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#059669;}
.ee-confirm-icon.danger{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#dc2626;}
.ee-confirm-icon.warn{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#d97706;}
.ee-confirm-icon.info{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#2563eb;}
.ee-confirm-msg{font-size:1.05em;font-weight:600;color:#334155;margin-bottom:24px;line-height:1.6;}
.ee-confirm-actions{display:flex;gap:10px;justify-content:center;}
.ee-confirm-btn{flex:1;padding:12px 20px;border:none;border-radius:14px;font-family:inherit;font-size:1em;font-weight:700;cursor:pointer;transition:all 0.15s;}
.ee-confirm-btn.ok{color:#fff;}
.ee-confirm-btn.ok.submit{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 12px rgba(16,185,129,0.3);}
.ee-confirm-btn.ok.danger{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 4px 12px rgba(239,68,68,0.3);}
.ee-confirm-btn.ok.warn{background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 4px 12px rgba(245,158,11,0.3);}
.ee-confirm-btn.ok.info{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 4px 12px rgba(59,130,246,0.3);}
.ee-confirm-btn.cancel{background:#f1f5f9;color:#475569;border:2px solid #e2e8f0;}
.ee-confirm-btn.cancel:hover{background:#e2e8f0;}
.ee-confirm-btn:hover{transform:translateY(-1px);}

/* Toast */
.ee-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:400;padding:14px 24px;border-radius:14px;font-family:'Cairo','Tajawal',sans-serif;font-size:0.95em;font-weight:700;color:#fff;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.2);animation:eeToastIn 0.3s ease;max-width:90vw;text-align:center;}
.ee-toast.success{background:linear-gradient(135deg,#10b981,#059669);}
.ee-toast.error{background:linear-gradient(135deg,#ef4444,#dc2626);}
.ee-toast.warn{background:linear-gradient(135deg,#f59e0b,#d97706);}
.ee-toast.info{background:linear-gradient(135deg,#3b82f6,#2563eb);}
@keyframes eeToastIn{from{transform:translateX(-50%) translateY(-20px);opacity:0;}to{transform:translateX(-50%) translateY(0);opacity:1;}}
@keyframes eeToastOut{from{transform:translateX(-50%) translateY(0);opacity:1;}to{transform:translateX(-50%) translateY(-20px);opacity:0;}}

@media(max-width:480px){
    .ee-title{font-size:1.1em;}
    .ee-entry-details{grid-template-columns:1fr;}
}
</style>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}

// Toast notification
function showToast(message, type) {
    $('.ee-toast').remove();
    type = type || 'info';
    let iconMap = {success:'fa-check-circle', error:'fa-times-circle', warn:'fa-exclamation-triangle', info:'fa-info-circle'};
    let toast = $(`<div class="ee-toast ${type}"><i class="fa ${iconMap[type] || iconMap.info}"></i> ${message}</div>`);
    $('body').append(toast);
    setTimeout(() => {
        toast.css('animation', 'eeToastOut 0.3s ease-in forwards');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Confirm dialog
function showConfirm(message, opts) {
    opts = opts || {};
    let type = opts.type || 'danger';
    let iconMap = {danger:'fa-times-circle', warn:'fa-exclamation-triangle', info:'fa-question-circle', submit:'fa-check-circle'};
    let okText = opts.okText || 'نعم';
    let cancelText = opts.cancelText || 'إلغاء';
    return new Promise(function(resolve) {
        let overlay = $(`<div class="ee-confirm-overlay" dir="rtl">
            <div class="ee-confirm-box">
                <div class="ee-confirm-icon ${type}"><i class="fa ${iconMap[type] || iconMap.danger}"></i></div>
                <div class="ee-confirm-msg">${message}</div>
                <div class="ee-confirm-actions">
                    <button type="button" class="ee-confirm-btn ok ${type}">${okText}</button>
                    <button type="button" class="ee-confirm-btn cancel">${cancelText}</button>
                </div>
            </div>
        </div>`);
        $('body').append(overlay);
        overlay.on('click', '.ee-confirm-btn.ok', function() { overlay.remove(); resolve(true); });
        overlay.on('click', '.ee-confirm-btn.cancel', function() { overlay.remove(); resolve(false); });
        overlay.on('click', function(e) { if ($(e.target).hasClass('ee-confirm-overlay')) { overlay.remove(); resolve(false); } });
    });
}

// Load context
frappe.call({
    method: "mobile_pos.mobile_pos.page.pos_expense.api.get_context",
    callback: function(r) { context = r.message; }
});

// Tab switching
$(wrapper).on('click', '.ee-tab', function() {
    let tab = $(this).data('tab');
    $('.ee-tab').removeClass('active');
    $(this).addClass('active');
    $('.ee-tab-content').removeClass('active');
    $('#ee-tab-' + tab).addClass('active');
    if (tab === 'list') {
        loadEntries();
    }
});

// Render entries list - compact cards, click to see details
function renderEntries() {
    let $list = $('#ee-entries-list');
    $list.empty();
    $('#ee-entries-loading').hide();

    if (!recentEntries || !recentEntries.length) {
        $('#ee-entries-empty').removeClass('hidden');
        return;
    }
    $('#ee-entries-empty').addClass('hidden');

    recentEntries.forEach(function(entry, idx) {
        let statusClass = entry.docstatus === 0 ? 'draft' : (entry.docstatus === 1 ? 'submitted' : 'cancelled');
        let statusLabel = entry.docstatus === 0 ? TEXT.DRAFT : (entry.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED);
        let statusIcon = entry.docstatus === 0 ? 'fa-pencil' : (entry.docstatus === 1 ? 'fa-check' : 'fa-ban');

        let card = $(`
            <div class="ee-entry-card ${statusClass}" data-idx="${idx}">
                <div class="ee-entry-top">
                    <div class="ee-entry-name">${escapeHtml(entry.name)}</div>
                    <span class="ee-entry-badge ${statusClass}"><i class="fa ${statusIcon}"></i> ${statusLabel}</span>
                </div>
                <div class="ee-entry-row">
                    <span class="ee-entry-expense-name"><i class="fa fa-file-text-o"></i> ${escapeHtml(entry.expense_name || entry.expense)}</span>
                    <span class="ee-entry-amount-sm">${parseFloat(entry.amount || 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div class="ee-entry-row sub">
                    <span><i class="fa fa-calendar"></i> ${escapeHtml(entry.posting_date)}</span>
                    <span><i class="fa fa-credit-card"></i> ${escapeHtml(entry.mode_of_payment)}</span>
                </div>
            </div>
        `);
        $list.append(card);
    });
}

// Show entry detail popup
function showEntryDetail(entry) {
    let statusClass = entry.docstatus === 0 ? 'draft' : (entry.docstatus === 1 ? 'submitted' : 'cancelled');
    let statusLabel = entry.docstatus === 0 ? TEXT.DRAFT : (entry.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED);
    let statusIcon = entry.docstatus === 0 ? 'fa-pencil' : (entry.docstatus === 1 ? 'fa-check' : 'fa-ban');

    let actionsHtml = '';
    if (entry.docstatus === 0) {
        actionsHtml = `<button type="button" class="ee-detail-action-btn submit-btn" data-name="${escapeHtml(entry.name)}"><i class="fa fa-check-circle"></i> ${TEXT.SUBMIT_ENTRY}</button>`;
    } else if (entry.docstatus === 1) {
        actionsHtml = `<button type="button" class="ee-detail-action-btn cancel-btn" data-name="${escapeHtml(entry.name)}"><i class="fa fa-ban"></i> ${TEXT.CANCEL_ENTRY}</button>`;
    }

    let remarksHtml = entry.remarks
        ? `<div class="ee-detail-field"><div class="ee-detail-label"><i class="fa fa-comment-o"></i> ${TEXT.REMARKS}</div><div class="ee-detail-value remarks">${escapeHtml(entry.remarks)}</div></div>`
        : '';
    let jeHtml = entry.journal_entry
        ? `<div class="ee-detail-field"><div class="ee-detail-label"><i class="fa fa-book"></i> القيد المحاسبي</div><div class="ee-detail-value">${escapeHtml(entry.journal_entry)}</div></div>`
        : '';

    let popup = $(`<div class="ee-popup-overlay ee-detail-overlay" dir="rtl">
        <div class="ee-detail-popup">
            <div class="ee-detail-header">
                <button type="button" class="ee-detail-close"><i class="fa fa-times"></i></button>
                <div class="ee-detail-title">${escapeHtml(entry.name)}</div>
                <span class="ee-entry-badge ${statusClass}"><i class="fa ${statusIcon}"></i> ${statusLabel}</span>
            </div>
            <div class="ee-detail-amount-box">
                <div class="ee-detail-amount-label">${TEXT.AMOUNT}</div>
                <div class="ee-detail-amount-val">${parseFloat(entry.amount || 0).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
            </div>
            <div class="ee-detail-fields">
                <div class="ee-detail-field">
                    <div class="ee-detail-label"><i class="fa fa-file-text-o"></i> ${TEXT.EXPENSE_TYPE}</div>
                    <div class="ee-detail-value">${escapeHtml(entry.expense_name || entry.expense)}</div>
                </div>
                <div class="ee-detail-field">
                    <div class="ee-detail-label"><i class="fa fa-credit-card"></i> ${TEXT.MODE_OF_PAYMENT}</div>
                    <div class="ee-detail-value">${escapeHtml(entry.mode_of_payment)}</div>
                </div>
                <div class="ee-detail-field">
                    <div class="ee-detail-label"><i class="fa fa-calendar"></i> التاريخ</div>
                    <div class="ee-detail-value">${escapeHtml(entry.posting_date)}</div>
                </div>
                ${jeHtml}
                ${remarksHtml}
            </div>
            ${actionsHtml ? `<div class="ee-detail-actions">${actionsHtml}</div>` : ''}
        </div>
    </div>`);

    $('body').append(popup);

    popup.on('click', '.ee-detail-close', function() { popup.remove(); });
    popup.on('click', function(e) { if ($(e.target).hasClass('ee-detail-overlay')) popup.remove(); });

    // Submit from detail popup
    popup.on('click', '.ee-detail-action-btn.submit-btn', async function() {
        let name = $(this).data('name');
        let $btn = $(this);
        let confirmed = await showConfirm(TEXT.CONFIRM_SUBMIT, {
            type: 'submit',
            okText: TEXT.SUBMIT_ENTRY,
            cancelText: TEXT.BACK
        });
        if (!confirmed) return;

        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.pos_expense.api.submit_expense_entry",
                type: "POST",
                args: { name: name }
            });
            showToast(TEXT.SUBMIT_SUCCESS(name), 'success');
            popup.remove();
            loadEntries();
        } catch (err) {
            let msg = TEXT.ERROR;
            try { msg = JSON.parse(err._server_messages)[0]; } catch(e2) {}
            if (err.message) msg = err.message;
            showToast(msg, 'error');
            $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT_ENTRY}`);
        }
    });

    // Cancel from detail popup
    popup.on('click', '.ee-detail-action-btn.cancel-btn', async function() {
        let name = $(this).data('name');
        let $btn = $(this);
        let confirmed = await showConfirm(TEXT.CONFIRM_CANCEL, {
            type: 'danger',
            okText: TEXT.CANCEL_ENTRY,
            cancelText: TEXT.BACK
        });
        if (!confirmed) return;

        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.pos_expense.api.cancel_expense_entry",
                type: "POST",
                args: { name: name }
            });
            showToast(TEXT.CANCEL_SUCCESS(name), 'success');
            popup.remove();
            loadEntries();
        } catch (err) {
            let msg = TEXT.ERROR;
            try { msg = JSON.parse(err._server_messages)[0]; } catch(e2) {}
            if (err.message) msg = err.message;
            showToast(msg, 'error');
            $btn.prop('disabled', false).html(`<i class="fa fa-ban"></i> ${TEXT.CANCEL_ENTRY}`);
        }
    });
}

// Load entries
function loadEntries() {
    $('#ee-entries-loading').show();
    $('#ee-entries-list').empty();
    $('#ee-entries-empty').addClass('hidden');

    frappe.call({
        method: "mobile_pos.mobile_pos.page.pos_expense.api.get_recent_entries",
        args: { limit: 50 },
        callback: function(r) {
            recentEntries = r.message || [];
            renderEntries();
        },
        error: function() {
            $('#ee-entries-loading').hide();
            showToast(TEXT.ERROR, 'error');
        }
    });
}

// Click entry card to open detail popup
$(wrapper).on('click', '.ee-entry-card', function() {
    let idx = $(this).data('idx');
    if (idx !== undefined && recentEntries[idx]) {
        showEntryDetail(recentEntries[idx]);
    }
});

// Expense type popup with search
$(wrapper).on('click', '#ee-expense-btn', function() {
    if (!context || !context.expenses || !context.expenses.length) return;
    let list = context.expenses;

    function renderCards(items) {
        if (!items.length) return `<div class="ee-popup-empty">لا توجد نتائج</div>`;
        return items.map(e =>
            `<div class="ee-popup-card" data-value="${escapeHtml(e.name)}" data-label="${escapeHtml(e.expense_name || e.name)}">
                <div class="ee-popup-card-icon"><i class="fa fa-file-text-o"></i></div>
                <div class="ee-popup-card-info">
                    <div class="ee-popup-card-name">${escapeHtml(e.expense_name)}</div>
                    <div class="ee-popup-card-sub">${escapeHtml(e.name)}</div>
                </div>
            </div>`
        ).join('');
    }

    let popup = $(`<div class="ee-popup-overlay" dir="rtl">
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
        `<div class="ee-popup-card" data-mode="${escapeHtml(m)}">
            <div class="ee-popup-card-icon"><i class="fa fa-credit-card"></i></div>
            <div class="ee-popup-card-info">
                <div class="ee-popup-card-name">${escapeHtml(m)}</div>
            </div>
        </div>`
    ).join('');
    let popup = $(`<div class="ee-popup-overlay" dir="rtl">
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

// Submit new expense
$(wrapper).on('click', '#ee-submit', async function() {
    if (!selectedExpense) return showToast(TEXT.REQUIRED_EXPENSE, 'error');
    if (!selectedMode) return showToast(TEXT.REQUIRED_MODE, 'error');
    let amount = parseFloat(convertArabicToEnglishNumbers($('#ee-amount').val())) || 0;
    if (amount <= 0) return showToast(TEXT.REQUIRED_AMOUNT, 'error');

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
        showToast(TEXT.SUCCESS(doc.name, doc.journal_entry), 'success');
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
        let msg = err.message || TEXT.ERROR;
        try { msg = JSON.parse(err._server_messages)[0]; } catch(e) {}
        showToast(msg, 'error');
    }
    $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
});

// Home button
$(wrapper).on('click', '#ee-home-btn', function() { window.location.href = '/main'; });

// Refresh button
$(wrapper).on('click', '#ee-refresh-btn', function() { window.location.reload(); });

};
