frappe.pages['pos-payment'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.pos_payment', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.pos_payment');
});

const TEXT = {
    PAGE_TITLE: "سند قبض / صرف / تحويل",
    RECEIVE: "قبض",
    PAY: "صرف",
    TRANSFER: "تحويل",
    CUSTOMER: "عميل",
    SUPPLIER: "مورد",
    PARTY_TYPE: "نوع الطرف",
    PARTY: "الطرف",
    SELECT_PARTY: "اختر الطرف",
    SEARCH_PARTY: "ابحث...",
    MODE_OF_PAYMENT: "طريقة الدفع",
    SELECT_MODE: "اختر طريقة الدفع",
    FROM_MODE: "من طريقة الدفع",
    TO_MODE: "إلى طريقة الدفع",
    SELECT_FROM_MODE: "اختر طريقة الدفع (من)",
    SELECT_TO_MODE: "اختر طريقة الدفع (إلى)",
    AMOUNT: "المبلغ",
    REMARKS: "ملاحظات",
    SUBMIT: "حفظ",
    SUBMITTING: "جارٍ الحفظ...",
    SUCCESS: name => `تم إنشاء السند ${name} كمسودة بنجاح!`,
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_PARTY: "يرجى اختيار الطرف.",
    REQUIRED_MODE: "يرجى اختيار طريقة الدفع.",
    REQUIRED_FROM_MODE: "يرجى اختيار طريقة الدفع (من).",
    REQUIRED_TO_MODE: "يرجى اختيار طريقة الدفع (إلى).",
    SAME_MODE_ERROR: "طريقة الدفع (من) و (إلى) يجب أن تكون مختلفة.",
    REQUIRED_AMOUNT: "يرجى إدخال المبلغ.",
    BACK: "الرئيسية",
    TAB_NEW: "جديد",
    TAB_ENTRIES: "السندات",
    RECENT_ENTRIES: "السندات الأخيرة",
    DRAFT: "مسودة",
    SUBMITTED: "معتمد",
    CANCELLED: "ملغى",
    NO_ENTRIES: "لا توجد سندات",
    LOADING: "جارٍ التحميل...",
    SUBMIT_ENTRY: "اعتماد",
    CANCEL_ENTRY: "إلغاء",
    DELETE_ENTRY: "حذف",
    CLOSE: "إغلاق",
    CONFIRM_SUBMIT: "هل أنت متأكد من اعتماد هذا السند؟",
    CONFIRM_CANCEL: "هل أنت متأكد من إلغاء هذا السند؟",
    CONFIRM_DELETE: "هل أنت متأكد من حذف هذا السند؟ لا يمكن التراجع عن هذا الإجراء.",
    SUBMIT_SUCCESS: "تم اعتماد السند بنجاح",
    CANCEL_SUCCESS: "تم إلغاء السند بنجاح",
    DELETE_SUCCESS: "تم حذف السند بنجاح",
    DATE: "التاريخ",
    PAYMENT_TYPE_LABEL: "النوع",
    PARTY_TYPE_LABEL: "نوع الطرف",
    PARTY_LABEL: "الطرف",
    AMOUNT_LABEL: "المبلغ",
    REMARKS_LABEL: "الملاحظات",
    FROM_MODE_LABEL: "من",
    TO_MODE_LABEL: "إلى",
    OWNER: "بواسطة"
};

const API_BASE = "mobile_pos.mobile_pos.page.pos_payment.api";

let context = null;
let selectedType = "Receive";
let selectedPartyType = "Customer";
let selectedParty = "";
let selectedPartyLabel = "";
let selectedMode = "";
let selectedFromMode = "";
let selectedToMode = "";

$(wrapper).html(`
<div class="pe-page" dir="rtl">
    <div class="pe-header">
        <div class="pe-header-inner">
            <h1 class="pe-title"><i class="fa fa-money"></i> ${TEXT.PAGE_TITLE}</h1>
            <div class="pe-header-actions">
                <button type="button" id="pe-refresh-btn" class="pe-header-btn pe-refresh-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="pe-home-btn" class="pe-header-btn pe-home-btn" title="الرئيسية"><i class="fa fa-home"></i> ${TEXT.BACK}</button>
            </div>
        </div>
    </div>
    <!-- Tab Bar -->
    <div class="pe-tab-bar">
        <div class="pe-tab-bar-inner">
            <button type="button" class="pe-tab pe-tab-active" data-tab="new">
                <i class="fa fa-plus-circle"></i> ${TEXT.TAB_NEW}
            </button>
            <button type="button" class="pe-tab" data-tab="entries">
                <i class="fa fa-list"></i> ${TEXT.TAB_ENTRIES}
            </button>
        </div>
    </div>
    <div class="pe-body">
        <!-- Tab: New Entry -->
        <div class="pe-tab-content pe-tab-content-active" id="pe-tab-new">
            <div class="pe-card">
                <!-- Payment Type -->
                <div class="pe-field">
                    <div class="pe-toggle-group">
                        <button type="button" class="pe-toggle pe-toggle-active" data-type="Receive">
                            <i class="fa fa-arrow-down"></i> ${TEXT.RECEIVE}
                        </button>
                        <button type="button" class="pe-toggle" data-type="Pay">
                            <i class="fa fa-arrow-up"></i> ${TEXT.PAY}
                        </button>
                        <button type="button" class="pe-toggle" data-type="Transfer">
                            <i class="fa fa-exchange"></i> ${TEXT.TRANSFER}
                        </button>
                    </div>
                </div>

                <!-- Party Type -->
                <div class="pe-field pe-receive-pay-field" id="pe-party-type-field">
                    <label class="pe-label">${TEXT.PARTY_TYPE}</label>
                    <div class="pe-toggle-group">
                        <button type="button" class="pe-party-type pe-party-type-active" data-ptype="Customer">
                            <i class="fa fa-user"></i> ${TEXT.CUSTOMER}
                        </button>
                        <button type="button" class="pe-party-type" data-ptype="Supplier">
                            <i class="fa fa-truck"></i> ${TEXT.SUPPLIER}
                        </button>
                    </div>
                </div>

                <!-- Party -->
                <div class="pe-field pe-receive-pay-field" id="pe-party-field">
                    <label class="pe-label">${TEXT.PARTY}</label>
                    <button type="button" id="pe-party-btn" class="pe-select-btn">
                        <i class="fa fa-user"></i>
                        <span id="pe-party-label">${TEXT.SELECT_PARTY}</span>
                        <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                    </button>
                </div>

                <!-- Mode of Payment (for Receive/Pay) -->
                <div class="pe-field pe-receive-pay-field" id="pe-mode-field">
                    <label class="pe-label">${TEXT.MODE_OF_PAYMENT}</label>
                    <button type="button" id="pe-mode-btn" class="pe-select-btn">
                        <i class="fa fa-credit-card"></i>
                        <span id="pe-mode-label">${TEXT.SELECT_MODE}</span>
                        <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                    </button>
                </div>

                <!-- From Mode of Payment (for Transfer) -->
                <div class="pe-field pe-transfer-field" id="pe-from-mode-field" style="display:none;">
                    <label class="pe-label">${TEXT.FROM_MODE}</label>
                    <button type="button" id="pe-from-mode-btn" class="pe-select-btn">
                        <i class="fa fa-credit-card"></i>
                        <span id="pe-from-mode-label">${TEXT.SELECT_FROM_MODE}</span>
                        <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                    </button>
                </div>

                <!-- To Mode of Payment (for Transfer) -->
                <div class="pe-field pe-transfer-field" id="pe-to-mode-field" style="display:none;">
                    <label class="pe-label">${TEXT.TO_MODE}</label>
                    <button type="button" id="pe-to-mode-btn" class="pe-select-btn">
                        <i class="fa fa-credit-card"></i>
                        <span id="pe-to-mode-label">${TEXT.SELECT_TO_MODE}</span>
                        <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                    </button>
                </div>

                <!-- Amount -->
                <div class="pe-field">
                    <label class="pe-label">${TEXT.AMOUNT}</label>
                    <input id="pe-amount" type="text" inputmode="decimal" class="pe-input pe-input-amount" placeholder="0.00" autocomplete="off">
                </div>

                <!-- Remarks -->
                <div class="pe-field">
                    <label class="pe-label">${TEXT.REMARKS}</label>
                    <textarea id="pe-remarks" class="pe-input pe-textarea" rows="2"></textarea>
                </div>

                <!-- Submit -->
                <button type="button" id="pe-submit" class="pe-submit-btn">
                    <i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}
                </button>
                <div id="pe-result"></div>
            </div>
        </div>
        <!-- Tab: Entries List -->
        <div class="pe-tab-content" id="pe-tab-entries">
            <div class="pe-entries-section">
                <div id="pe-entries-list"></div>
            </div>
        </div>
    </div>
    <!-- Detail Popup Overlay -->
    <div class="pe-detail-overlay" id="pe-detail-overlay">
        <div class="pe-detail-popup">
            <div class="pe-detail-handle"></div>
            <div id="pe-detail-banner"></div>
            <div class="pe-detail-info" id="pe-detail-info"></div>
            <div id="pe-detail-mode-flow"></div>
            <div class="pe-detail-actions" id="pe-detail-actions"></div>
        </div>
    </div>
</div>
<style>
.pe-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}
.pe-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);padding:20px 16px 24px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(102,126,234,0.35);}
.pe-header-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;gap:14px;}
.pe-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.pe-header-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:0.95em;font-weight:700;border:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;white-space:nowrap;font-family:inherit;position:relative;overflow:hidden;}
.pe-home-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 16px rgba(16,185,129,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:100px;}
.pe-home-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,185,129,0.5),inset 0 1px 1px rgba(255,255,255,0.4);}
.pe-home-btn:active{transform:translateY(0);}
.pe-refresh-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 4px 16px rgba(59,130,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.pe-refresh-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(59,130,246,0.5);}
.pe-refresh-btn:active{transform:scale(0.95);}
.pe-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
/* Tab Bar */
.pe-tab-bar{background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.06);position:sticky;top:0;z-index:99;}
.pe-tab-bar-inner{max-width:600px;margin:0 auto;display:flex;padding:0 16px;}
.pe-tab{flex:1;padding:14px 12px;border:none;background:transparent;font-family:inherit;font-size:1em;font-weight:700;color:#94a3b8;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;border-bottom:3px solid transparent;position:relative;}
.pe-tab:hover{color:#64748b;}
.pe-tab-active{color:#667eea;border-bottom-color:#667eea;}
.pe-tab-active i{color:#667eea;}
/* Tab Content */
.pe-tab-content{display:none;}
.pe-tab-content-active{display:block;}
.pe-body{max-width:600px;margin:0 auto;padding:20px 16px;}
.pe-card{background:#fff;border-radius:20px;padding:24px 20px;margin-bottom:20px;box-shadow:0 8px 30px rgba(0,0,0,0.06);}
.pe-field{margin-bottom:20px;}
.pe-label{display:block;font-weight:700;color:#334155;margin-bottom:8px;font-size:0.95em;}
.pe-input{width:100%;padding:14px 16px;border:2px solid #e2e8f0;border-radius:14px;font-size:1.05em;font-family:inherit;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s;outline:none;text-align:right;}
.pe-input:focus{border-color:#3b82f6;box-shadow:0 0 0 4px rgba(59,130,246,0.12);background:#fff;}
.pe-input-amount{font-size:1.4em;font-weight:700;text-align:center;letter-spacing:1px;}
.pe-textarea{resize:none;min-height:60px;}
.pe-toggle-group{display:flex;gap:8px;}
.pe-toggle{flex:1;padding:14px 12px;border:2px solid #e2e8f0;border-radius:14px;background:#f8fafc;font-family:inherit;font-size:1em;font-weight:700;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}
.pe-toggle:hover{border-color:#3b82f6;color:#1d4ed8;}
.pe-toggle-active{background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#3b82f6;color:#1e40af;box-shadow:0 4px 12px rgba(59,130,246,0.15);}
.pe-party-type{flex:1;padding:12px 10px;border:2px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-family:inherit;font-size:0.95em;font-weight:600;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}
.pe-party-type:hover{border-color:#3b82f6;color:#1d4ed8;}
.pe-party-type-active{background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:#3b82f6;color:#1e40af;}
.pe-select-btn{width:100%;padding:14px 16px;border:2px solid #e2e8f0;border-radius:14px;background:#f8fafc;font-family:inherit;font-size:1.05em;font-weight:600;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;text-align:right;}
.pe-select-btn:hover{border-color:#3b82f6;color:#1d4ed8;}
.pe-select-btn.pe-selected{border-color:#3b82f6;color:#1e40af;background:#eff6ff;}
.pe-submit-btn{width:100%;padding:16px;border:none;border-radius:16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;font-family:inherit;font-size:1.15em;font-weight:800;cursor:pointer;transition:all 0.2s;box-shadow:0 8px 25px rgba(37,99,235,0.3);display:flex;align-items:center;justify-content:center;gap:10px;}
.pe-submit-btn:hover{transform:translateY(-2px);box-shadow:0 12px 35px rgba(37,99,235,0.4);}
.pe-submit-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.hidden{display:none!important;}
.pe-error{background:#fef2f2;border:2px solid #fca5a5;border-radius:14px;padding:16px;margin-top:16px;text-align:center;color:#991b1b;font-weight:600;}
.pe-popup-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;}
.pe-popup{background:#fff;border-radius:20px;padding:24px 20px;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.2);max-height:80vh;display:flex;flex-direction:column;}
.pe-popup-title{font-size:1.1em;font-weight:800;color:#1e293b;margin-bottom:14px;text-align:center;}
.pe-popup-search{width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;background:#f8fafc;outline:none;text-align:right;margin-bottom:12px;transition:border-color 0.2s;}
.pe-popup-search:focus{border-color:#3b82f6;background:#fff;}
.pe-popup-list{overflow-y:auto;flex:1;max-height:55vh;}
.pe-popup-card{display:flex;align-items:center;gap:12px;padding:14px;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;background:#f8fafc;}
.pe-popup-card:hover{border-color:#3b82f6;background:#eff6ff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(59,130,246,0.12);}
.pe-popup-card-icon{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
.pe-popup-card-info{flex:1;min-width:0;}
.pe-popup-card-name{font-weight:700;color:#1e293b;font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pe-popup-card-sub{font-size:0.85em;color:#64748b;margin-top:2px;}
.pe-popup-empty{text-align:center;padding:30px;color:#94a3b8;font-size:0.95em;}
@media(max-width:480px){.pe-toggle{font-size:0.9em;padding:12px 8px;}.pe-title{font-size:1.1em;}.pe-party-type{font-size:0.85em;padding:10px 8px;}}

/* Entries Section */
.pe-entries-section{margin-top:0;}
.pe-entries-loading{text-align:center;padding:30px 20px;color:#94a3b8;font-size:0.95em;}
.pe-entries-empty{text-align:center;padding:30px 20px;}
.pe-entries-empty i{font-size:2.5em;color:#cbd5e1;margin-bottom:8px;display:block;}
.pe-entries-empty-title{font-weight:700;color:#64748b;font-size:1em;}

/* Entry Card */
.pe-entry-card{background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,0.05);cursor:pointer;transition:all 0.2s ease;border-right:4px solid transparent;}
.pe-entry-card:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,0.1);}
.pe-entry-card.draft{border-right-color:#f59e0b;}
.pe-entry-card.submitted{border-right-color:#10b981;}
.pe-entry-card.cancelled{border-right-color:#ef4444;opacity:0.7;}
.pe-entry-row1{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.pe-entry-name{font-weight:800;font-size:0.95em;color:#1e293b;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.pe-entry-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:0.75em;font-weight:700;}
.pe-badge-draft{background:#fef3c7;color:#92400e;}
.pe-badge-submitted{background:#d1fae5;color:#065f46;}
.pe-badge-cancelled{background:#fee2e2;color:#991b1b;}
.pe-badge-type{background:#e0e7ff;color:#3730a3;padding:3px 10px;border-radius:999px;font-size:0.75em;font-weight:700;}
.pe-entry-row2{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;}
.pe-entry-meta{display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:0.82em;color:#64748b;}
.pe-entry-meta i{margin-left:4px;color:#94a3b8;}
.pe-entry-amount{font-weight:700;font-size:0.95em;color:#1e40af;background:#eff6ff;padding:4px 12px;border-radius:10px;}

/* Detail Popup Overlay */
.pe-detail-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.7);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity 0.3s ease;}
.pe-detail-overlay.open{opacity:1;pointer-events:auto;}
.pe-detail-popup{background:#fff;border-radius:28px 28px 0 0;width:100%;max-width:720px;max-height:92vh;overflow-y:auto;overflow-x:hidden;padding:0;transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.4,0,0.2,1);box-shadow:0 -12px 50px rgba(0,0,0,0.25),0 -4px 20px rgba(0,0,0,0.1);direction:rtl;}
.pe-detail-overlay.open .pe-detail-popup{transform:translateY(0);}
.pe-detail-handle{width:48px;height:5px;background:#cbd5e1;border-radius:999px;margin:12px auto 0;}

/* Banner */
.pe-detail-banner{margin:12px 16px 0;border-radius:18px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;overflow:hidden;}
.pe-detail-banner::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,0.15));pointer-events:none;}
.pe-detail-banner.draft-banner{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;}
.pe-detail-banner.submitted-banner{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.pe-detail-banner.cancelled-banner{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;}
.pe-banner-right{display:flex;align-items:center;gap:12px;flex:1;min-width:0;}
.pe-banner-icon{width:46px;height:46px;background:rgba(255,255,255,0.2);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
.pe-banner-info{min-width:0;}
.pe-banner-name{font-weight:800;font-size:1.05em;letter-spacing:-0.3px;text-shadow:0 1px 2px rgba(0,0,0,0.15);}
.pe-banner-status{font-size:0.82em;opacity:0.9;font-weight:600;margin-top:2px;}
.pe-banner-close{width:38px;height:38px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);background:rgba(255,255,255,0.15);color:#fff;font-size:1.1em;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0;}
.pe-banner-close:hover{background:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.6);transform:scale(1.08);}

/* Info Grid */
.pe-detail-info{padding:16px 16px 8px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pe-info-item{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:14px;padding:12px 16px;border:1px solid #e2e8f0;transition:all 0.15s;}
.pe-info-item:hover{border-color:#cbd5e1;box-shadow:0 2px 8px rgba(0,0,0,0.04);}
.pe-info-item.full-width{grid-column:1 / -1;}
.pe-info-label{font-size:0.72em;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;display:flex;align-items:center;gap:4px;}
.pe-info-label i{font-size:0.9em;}
.pe-info-value{font-weight:800;font-size:0.95em;color:#1e293b;line-height:1.3;word-break:break-word;overflow-wrap:break-word;}

/* Mode Flow (Internal Transfer) */
.pe-mode-flow{margin:0 16px;padding:14px 18px;background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:16px;border:1.5px solid #c7d2fe;display:flex;align-items:center;justify-content:center;gap:14px;}
.pe-mode-box{text-align:center;flex:1;min-width:0;}
.pe-mode-label{font-size:0.7em;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;}
.pe-mode-name{font-weight:800;font-size:0.88em;color:#312e81;word-break:break-word;}
.pe-mode-arrow{font-size:1.4em;color:#6366f1;flex-shrink:0;animation:peModeArrow 2s ease-in-out infinite;}
@keyframes peModeArrow{0%,100%{opacity:0.6;transform:translateX(0);}50%{opacity:1;transform:translateX(-4px);}}

/* Actions Grid */
.pe-detail-actions{padding:12px 16px 28px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.pe-action-btn{height:50px;border-radius:14px;border:none;font-weight:800;font-size:0.92em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s ease;position:relative;overflow:hidden;font-family:inherit;}
.pe-action-btn::before{content:'';position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,transparent,rgba(255,255,255,0.1));pointer-events:none;}
.pe-action-btn:disabled{opacity:0.5;cursor:not-allowed;}
.pe-action-btn:active:not(:disabled){transform:scale(0.97);}
.pe-btn-submit-entry{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 15px rgba(16,185,129,0.35);}
.pe-btn-submit-entry:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 25px rgba(16,185,129,0.45);}
.pe-btn-cancel-entry{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;box-shadow:0 4px 15px rgba(239,68,68,0.35);}
.pe-btn-cancel-entry:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 25px rgba(239,68,68,0.45);}
.pe-btn-delete-entry{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;box-shadow:0 4px 15px rgba(249,115,22,0.35);}
.pe-btn-delete-entry:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 25px rgba(249,115,22,0.45);}
.pe-btn-close-detail{background:linear-gradient(135deg,#e2e8f0,#cbd5e1);color:#475569;grid-column:1 / -1;}
.pe-btn-close-detail:hover{background:linear-gradient(135deg,#cbd5e1,#94a3b8);color:#1e293b;}

@media(max-width:500px){.pe-detail-info{grid-template-columns:1fr 1fr;}.pe-detail-banner{margin:10px 12px 0;padding:14px 16px;}.pe-detail-actions{padding:10px 12px 24px;}.pe-mode-flow{margin:0 12px;}}
</style>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}

frappe.call({
    method: API_BASE + ".get_context",
    callback: function(r) { context = r.message; }
});

// Load recent entries
function loadEntries() {
    $('#pe-entries-list').html(`<div class="pe-entries-loading"><i class="fa fa-spinner fa-spin"></i> ${TEXT.LOADING}</div>`);
    frappe.call({
        method: API_BASE + ".get_recent_entries",
        args: { limit: 20 },
        callback: function(r) {
            let entries = r.message || [];
            if (!entries.length) {
                $('#pe-entries-list').html(`<div class="pe-entries-empty"><i class="fa fa-inbox"></i><div class="pe-entries-empty-title">${TEXT.NO_ENTRIES}</div></div>`);
                return;
            }
            let html = '';
            entries.forEach(function(e) {
                let statusClass = e.docstatus === 0 ? 'draft' : e.docstatus === 1 ? 'submitted' : 'cancelled';
                let statusLabel = e.docstatus === 0 ? TEXT.DRAFT : e.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED;
                let badgeClass = e.docstatus === 0 ? 'pe-badge-draft' : e.docstatus === 1 ? 'pe-badge-submitted' : 'pe-badge-cancelled';
                let typeLabel = e.payment_type === 'Receive' ? TEXT.RECEIVE : e.payment_type === 'Pay' ? TEXT.PAY : TEXT.TRANSFER;
                let partyInfo = e.party_name || e.party || '';
                let modeInfo = e.mode_of_payment || '';
                let amount = parseFloat(e.paid_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2});

                html += `<div class="pe-entry-card ${statusClass}" data-name="${e.name}">
                    <div class="pe-entry-row1">
                        <div class="pe-entry-name">
                            ${e.name}
                            <span class="pe-entry-badge ${badgeClass}">${statusLabel}</span>
                            <span class="pe-badge-type">${typeLabel}</span>
                        </div>
                    </div>
                    <div class="pe-entry-row2">
                        <div class="pe-entry-meta">
                            <span><i class="fa fa-calendar"></i>${e.posting_date || ''}</span>
                            ${partyInfo ? `<span><i class="fa fa-user"></i>${partyInfo}</span>` : ''}
                            ${modeInfo ? `<span><i class="fa fa-credit-card"></i>${modeInfo}</span>` : ''}
                        </div>
                        <div class="pe-entry-amount">${amount}</div>
                    </div>
                </div>`;
            });
            $('#pe-entries-list').html(html);
        }
    });
}
loadEntries();

// Tab switching
$(wrapper).on('click', '.pe-tab', function() {
    let tab = $(this).data('tab');
    $('.pe-tab').removeClass('pe-tab-active');
    $(this).addClass('pe-tab-active');
    $('.pe-tab-content').removeClass('pe-tab-content-active');
    $('#pe-tab-' + tab).addClass('pe-tab-content-active');
    if (tab === 'entries') loadEntries();
});

function switchToTab(tab) {
    $('.pe-tab').removeClass('pe-tab-active');
    $(`.pe-tab[data-tab="${tab}"]`).addClass('pe-tab-active');
    $('.pe-tab-content').removeClass('pe-tab-content-active');
    $('#pe-tab-' + tab).addClass('pe-tab-content-active');
}

// Toggle Receive/Pay/Transfer — auto-switch party type and show/hide fields
$(wrapper).on('click', '.pe-toggle', function() {
    $('.pe-toggle').removeClass('pe-toggle-active');
    $(this).addClass('pe-toggle-active');
    selectedType = $(this).data('type');

    if (selectedType === "Transfer") {
        // Hide party fields and single mode, show transfer fields
        $('.pe-receive-pay-field').hide();
        $('.pe-transfer-field').show();
        // Reset transfer selections
        selectedFromMode = "";
        selectedToMode = "";
        $('#pe-from-mode-label').text(TEXT.SELECT_FROM_MODE);
        $('#pe-from-mode-btn').removeClass('pe-selected');
        $('#pe-to-mode-label').text(TEXT.SELECT_TO_MODE);
        $('#pe-to-mode-btn').removeClass('pe-selected');
    } else {
        // Show party fields and single mode, hide transfer fields
        $('.pe-receive-pay-field').show();
        $('.pe-transfer-field').hide();
        let autoPtype = selectedType === "Receive" ? "Customer" : "Supplier";
        $('.pe-party-type').removeClass('pe-party-type-active');
        $(`.pe-party-type[data-ptype="${autoPtype}"]`).addClass('pe-party-type-active');
        selectedPartyType = autoPtype;
        selectedParty = "";
        selectedPartyLabel = "";
        $('#pe-party-label').text(TEXT.SELECT_PARTY);
        $('#pe-party-btn').removeClass('pe-selected');
        selectedMode = "";
        $('#pe-mode-label').text(TEXT.SELECT_MODE);
        $('#pe-mode-btn').removeClass('pe-selected');
    }
});

// Toggle Customer/Supplier
$(wrapper).on('click', '.pe-party-type', function() {
    $('.pe-party-type').removeClass('pe-party-type-active');
    $(this).addClass('pe-party-type-active');
    selectedPartyType = $(this).data('ptype');
    selectedParty = "";
    selectedPartyLabel = "";
    $('#pe-party-label').text(TEXT.SELECT_PARTY);
    $('#pe-party-btn').removeClass('pe-selected');
});

// Party popup with search
$(wrapper).on('click', '#pe-party-btn', function() {
    if (!context) return;
    let list = selectedPartyType === "Customer" ? context.customers : context.suppliers;
    let nameField = selectedPartyType === "Customer" ? "customer_name" : "supplier_name";
    let icon = selectedPartyType === "Customer" ? "fa-user" : "fa-truck";

    function renderCards(items) {
        if (!items.length) return `<div class="pe-popup-empty">لا توجد نتائج</div>`;
        return items.map(p =>
            `<div class="pe-popup-card" data-value="${p.name}" data-label="${(p[nameField] || p.name).replace(/"/g, '&quot;')}">
                <div class="pe-popup-card-icon"><i class="fa ${icon}"></i></div>
                <div class="pe-popup-card-info">
                    <div class="pe-popup-card-name">${p[nameField] || p.name}</div>
                    <div class="pe-popup-card-sub">${p.name}</div>
                </div>
            </div>`
        ).join('');
    }

    let popup = $(`<div class="pe-popup-overlay">
        <div class="pe-popup">
            <div class="pe-popup-title"><i class="fa ${icon}"></i> ${TEXT.SELECT_PARTY}</div>
            <input type="text" class="pe-popup-search" placeholder="${TEXT.SEARCH_PARTY}" autocomplete="off">
            <div class="pe-popup-list">${renderCards(list.slice(0, 50))}</div>
        </div>
    </div>`);
    $('body').append(popup);
    popup.find('.pe-popup-search').focus();

    popup.on('input', '.pe-popup-search', function() {
        let val = $(this).val().trim().toLowerCase();
        let filtered = val
            ? list.filter(p => (p[nameField] || "").toLowerCase().includes(val) || p.name.toLowerCase().includes(val)).slice(0, 50)
            : list.slice(0, 50);
        popup.find('.pe-popup-list').html(renderCards(filtered));
    });

    popup.on('click', '.pe-popup-card', function() {
        selectedParty = $(this).data('value');
        selectedPartyLabel = $(this).data('label');
        $('#pe-party-label').text(selectedPartyLabel);
        $('#pe-party-btn').addClass('pe-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pe-popup-overlay')) popup.remove();
    });
});

// Mode of Payment popup
$(wrapper).on('click', '#pe-mode-btn', function() {
    if (!context || !context.modes.length) return;
    let cards = context.modes.map(m =>
        `<div class="pe-popup-card" data-mode="${m}">
            <div class="pe-popup-card-icon"><i class="fa fa-credit-card"></i></div>
            <div class="pe-popup-card-info">
                <div class="pe-popup-card-name">${m}</div>
            </div>
        </div>`
    ).join('');
    let popup = $(`<div class="pe-popup-overlay">
        <div class="pe-popup">
            <div class="pe-popup-title"><i class="fa fa-credit-card"></i> ${TEXT.SELECT_MODE}</div>
            <div class="pe-popup-list">${cards}</div>
        </div>
    </div>`);
    $('body').append(popup);

    popup.on('click', '.pe-popup-card', function() {
        selectedMode = $(this).data('mode');
        $('#pe-mode-label').text(selectedMode);
        $('#pe-mode-btn').addClass('pe-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pe-popup-overlay')) popup.remove();
    });
});

// From Mode of Payment popup (Transfer)
$(wrapper).on('click', '#pe-from-mode-btn', function() {
    if (!context || !context.modes.length) return;
    let cards = context.modes.map(m =>
        `<div class="pe-popup-card" data-mode="${m}">
            <div class="pe-popup-card-icon"><i class="fa fa-credit-card"></i></div>
            <div class="pe-popup-card-info">
                <div class="pe-popup-card-name">${m}</div>
            </div>
        </div>`
    ).join('');
    let popup = $(`<div class="pe-popup-overlay">
        <div class="pe-popup">
            <div class="pe-popup-title"><i class="fa fa-credit-card"></i> ${TEXT.SELECT_FROM_MODE}</div>
            <div class="pe-popup-list">${cards}</div>
        </div>
    </div>`);
    $('body').append(popup);

    popup.on('click', '.pe-popup-card', function() {
        selectedFromMode = $(this).data('mode');
        $('#pe-from-mode-label').text(selectedFromMode);
        $('#pe-from-mode-btn').addClass('pe-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pe-popup-overlay')) popup.remove();
    });
});

// To Mode of Payment popup (Transfer)
$(wrapper).on('click', '#pe-to-mode-btn', function() {
    if (!context || !context.modes.length) return;
    let cards = context.modes.map(m =>
        `<div class="pe-popup-card" data-mode="${m}">
            <div class="pe-popup-card-icon"><i class="fa fa-credit-card"></i></div>
            <div class="pe-popup-card-info">
                <div class="pe-popup-card-name">${m}</div>
            </div>
        </div>`
    ).join('');
    let popup = $(`<div class="pe-popup-overlay">
        <div class="pe-popup">
            <div class="pe-popup-title"><i class="fa fa-credit-card"></i> ${TEXT.SELECT_TO_MODE}</div>
            <div class="pe-popup-list">${cards}</div>
        </div>
    </div>`);
    $('body').append(popup);

    popup.on('click', '.pe-popup-card', function() {
        selectedToMode = $(this).data('mode');
        $('#pe-to-mode-label').text(selectedToMode);
        $('#pe-to-mode-btn').addClass('pe-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pe-popup-overlay')) popup.remove();
    });
});

// Amount
$(wrapper).on('input', '#pe-amount', function() {
    let val = convertArabicToEnglishNumbers($(this).val());
    if (val !== $(this).val()) $(this).val(val);
});
$(wrapper).on('blur', '#pe-amount', function() {
    let val = parseFloat(convertArabicToEnglishNumbers($(this).val())) || 0;
    $(this).val(val > 0 ? val.toFixed(2) : '');
});

// Submit
$(wrapper).on('click', '#pe-submit', async function() {
    let amount = parseFloat(convertArabicToEnglishNumbers($('#pe-amount').val())) || 0;
    if (amount <= 0) return frappe.show_alert({ message: TEXT.REQUIRED_AMOUNT, indicator: 'red' }, 3);

    let $btn = $(this);
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SUBMITTING}`);

    try {
        let r;
        if (selectedType === "Transfer") {
            // Transfer mode validation
            if (!selectedFromMode) {
                $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
                return frappe.show_alert({ message: TEXT.REQUIRED_FROM_MODE, indicator: 'red' }, 3);
            }
            if (!selectedToMode) {
                $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
                return frappe.show_alert({ message: TEXT.REQUIRED_TO_MODE, indicator: 'red' }, 3);
            }
            if (selectedFromMode === selectedToMode) {
                $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
                return frappe.show_alert({ message: TEXT.SAME_MODE_ERROR, indicator: 'red' }, 3);
            }

            r = await frappe.call({
                method: "mobile_pos.mobile_pos.page.pos_payment.api.create_transfer_entry",
                type: "POST",
                args: { data: JSON.stringify({
                    from_mode_of_payment: selectedFromMode,
                    to_mode_of_payment: selectedToMode,
                    amount: amount,
                    remarks: $('#pe-remarks').val().trim()
                })}
            });
        } else {
            // Receive/Pay mode validation
            if (!selectedParty) {
                $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
                return frappe.show_alert({ message: TEXT.REQUIRED_PARTY, indicator: 'red' }, 3);
            }
            if (!selectedMode) {
                $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
                return frappe.show_alert({ message: TEXT.REQUIRED_MODE, indicator: 'red' }, 3);
            }

            r = await frappe.call({
                method: "mobile_pos.mobile_pos.page.pos_payment.api.create_payment_entry",
                type: "POST",
                args: { data: JSON.stringify({
                    payment_type: selectedType, party_type: selectedPartyType, party: selectedParty,
                    mode_of_payment: selectedMode, amount: amount,
                    remarks: $('#pe-remarks').val().trim()
                })}
            });
        }

        let doc = r.message;
        frappe.show_alert({ message: TEXT.SUCCESS(doc.name), indicator: 'green' }, 3);
        switchToTab('entries');
        loadEntries();

        // Auto-clear common fields
        $('#pe-amount').val('');
        $('#pe-remarks').val('');
        $('#pe-result').empty();

        if (selectedType === "Transfer") {
            selectedFromMode = "";
            selectedToMode = "";
            $('#pe-from-mode-label').text(TEXT.SELECT_FROM_MODE);
            $('#pe-from-mode-btn').removeClass('pe-selected');
            $('#pe-to-mode-label').text(TEXT.SELECT_TO_MODE);
            $('#pe-to-mode-btn').removeClass('pe-selected');
        } else {
            selectedParty = ""; selectedPartyLabel = "";
            $('#pe-party-label').text(TEXT.SELECT_PARTY);
            $('#pe-party-btn').removeClass('pe-selected');
            selectedMode = "";
            $('#pe-mode-label').text(TEXT.SELECT_MODE);
            $('#pe-mode-btn').removeClass('pe-selected');
        }
    } catch (err) {
        let msg = err.message || (err._server_messages && JSON.parse(err._server_messages)[0]) || TEXT.ERROR;
        $('#pe-result').html(`<div class="pe-error">${msg}</div>`);
    }
    $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
});

// Home button
$(wrapper).on('click', '#pe-home-btn', function() { window.location.href = '/main'; });

// Refresh button
$(wrapper).on('click', '#pe-refresh-btn', function() {
    loadEntries();
    frappe.call({ method: API_BASE + ".get_context", callback: function(r) { context = r.message; } });
});

// ── Entry Card Click → Detail Popup ──
let currentDetailEntry = null;

$(wrapper).on('click', '.pe-entry-card', function() {
    openDetailPopup($(this).data('name'));
});

async function openDetailPopup(entryName) {
    $('#pe-detail-banner').html(`
        <div class="pe-detail-banner draft-banner">
            <div class="pe-banner-right">
                <div class="pe-banner-icon"><i class="fa fa-spinner fa-spin"></i></div>
                <div class="pe-banner-info"><div class="pe-banner-name">${TEXT.LOADING}</div></div>
            </div>
        </div>
    `);
    $('#pe-detail-info').html('');
    $('#pe-detail-mode-flow').html('');
    $('#pe-detail-actions').html('');
    $('#pe-detail-overlay').addClass('open');

    try {
        let res = await frappe.call({ method: API_BASE + ".get_entry_details", args: { entry_name: entryName } });
        let d = res.message;
        if (!d) throw new Error('No data');
        currentDetailEntry = d;

        let statusLabel = d.docstatus === 0 ? TEXT.DRAFT : d.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED;
        let bannerClass = d.docstatus === 0 ? 'draft-banner' : d.docstatus === 1 ? 'submitted-banner' : 'cancelled-banner';
        let bannerIcon = d.docstatus === 0 ? 'fa-pencil' : d.docstatus === 1 ? 'fa-check-circle' : 'fa-times-circle';

        // Banner
        $('#pe-detail-banner').html(`
            <div class="pe-detail-banner ${bannerClass}">
                <div class="pe-banner-right">
                    <div class="pe-banner-icon"><i class="fa ${bannerIcon}"></i></div>
                    <div class="pe-banner-info">
                        <div class="pe-banner-name">${d.name}</div>
                        <div class="pe-banner-status">${statusLabel}</div>
                    </div>
                </div>
                <button class="pe-banner-close" id="pe-detail-close-x"><i class="fa fa-times"></i></button>
            </div>
        `);

        // Info Grid
        let typeLabel = d.payment_type === 'Receive' ? TEXT.RECEIVE : d.payment_type === 'Pay' ? TEXT.PAY : TEXT.TRANSFER;

        let infoHtml = `
            <div class="pe-info-item">
                <div class="pe-info-label"><i class="fa fa-calendar"></i> ${TEXT.DATE}</div>
                <div class="pe-info-value">${d.posting_date}</div>
            </div>
            <div class="pe-info-item">
                <div class="pe-info-label"><i class="fa fa-exchange"></i> ${TEXT.PAYMENT_TYPE_LABEL}</div>
                <div class="pe-info-value">${typeLabel}</div>
            </div>
        `;

        if (d.payment_type !== 'Internal Transfer') {
            infoHtml += `
                <div class="pe-info-item">
                    <div class="pe-info-label"><i class="fa fa-users"></i> ${TEXT.PARTY_TYPE_LABEL}</div>
                    <div class="pe-info-value">${d.party_type === 'Customer' ? TEXT.CUSTOMER : TEXT.SUPPLIER}</div>
                </div>
                <div class="pe-info-item">
                    <div class="pe-info-label"><i class="fa fa-user"></i> ${TEXT.PARTY_LABEL}</div>
                    <div class="pe-info-value">${d.party_name || d.party || '-'}</div>
                </div>
                <div class="pe-info-item">
                    <div class="pe-info-label"><i class="fa fa-credit-card"></i> ${TEXT.MODE_OF_PAYMENT}</div>
                    <div class="pe-info-value">${d.mode_of_payment || '-'}</div>
                </div>
            `;
        }

        infoHtml += `
            <div class="pe-info-item">
                <div class="pe-info-label"><i class="fa fa-money"></i> ${TEXT.AMOUNT_LABEL}</div>
                <div class="pe-info-value">${parseFloat(d.paid_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
            </div>
        `;

        if (d.owner) {
            infoHtml += `
                <div class="pe-info-item">
                    <div class="pe-info-label"><i class="fa fa-user-circle"></i> ${TEXT.OWNER}</div>
                    <div class="pe-info-value">${d.owner}</div>
                </div>
            `;
        }

        if (d.remarks) {
            infoHtml += `
                <div class="pe-info-item full-width">
                    <div class="pe-info-label"><i class="fa fa-comment"></i> ${TEXT.REMARKS_LABEL}</div>
                    <div class="pe-info-value">${d.remarks}</div>
                </div>
            `;
        }

        $('#pe-detail-info').html(infoHtml);

        // Mode Flow for Internal Transfer
        if (d.payment_type === 'Internal Transfer') {
            $('#pe-detail-mode-flow').html(`
                <div class="pe-mode-flow">
                    <div class="pe-mode-box">
                        <div class="pe-mode-label">${TEXT.FROM_MODE_LABEL}</div>
                        <div class="pe-mode-name">${d.paid_from || '-'}</div>
                    </div>
                    <div class="pe-mode-arrow"><i class="fa fa-long-arrow-left"></i></div>
                    <div class="pe-mode-box">
                        <div class="pe-mode-label">${TEXT.TO_MODE_LABEL}</div>
                        <div class="pe-mode-name">${d.paid_to || '-'}</div>
                    </div>
                </div>
            `);
        }

        // Actions
        let actionsHtml = '';
        if (d.docstatus === 0) {
            actionsHtml += `
                <button class="pe-action-btn pe-btn-submit-entry" id="pe-btn-submit-entry">
                    <i class="fa fa-check"></i> ${TEXT.SUBMIT_ENTRY}
                </button>
                <button class="pe-action-btn pe-btn-delete-entry" id="pe-btn-delete-entry">
                    <i class="fa fa-trash"></i> ${TEXT.DELETE_ENTRY}
                </button>
            `;
        } else if (d.docstatus === 1) {
            actionsHtml += `
                <button class="pe-action-btn pe-btn-cancel-entry" id="pe-btn-cancel-entry">
                    <i class="fa fa-ban"></i> ${TEXT.CANCEL_ENTRY}
                </button>
            `;
        }
        actionsHtml += `
            <button class="pe-action-btn pe-btn-close-detail" id="pe-btn-close-detail">
                <i class="fa fa-times"></i> ${TEXT.CLOSE}
            </button>
        `;
        $('#pe-detail-actions').html(actionsHtml);

    } catch (e) {
        $('#pe-detail-banner').html(`
            <div class="pe-detail-banner cancelled-banner">
                <div class="pe-banner-right">
                    <div class="pe-banner-icon"><i class="fa fa-exclamation-triangle"></i></div>
                    <div class="pe-banner-info">
                        <div class="pe-banner-name">خطأ</div>
                        <div class="pe-banner-status">${e.message || 'Error'}</div>
                    </div>
                </div>
                <button class="pe-banner-close" id="pe-detail-close-x"><i class="fa fa-times"></i></button>
            </div>
        `);
    }
}

function closeDetailPopup() {
    $('#pe-detail-overlay').removeClass('open');
    currentDetailEntry = null;
}

$(wrapper).on('click', '#pe-detail-overlay', function(e) {
    if (e.target === this) closeDetailPopup();
});
$(document).on('click', '#pe-detail-close-x', closeDetailPopup);
$(document).on('click', '#pe-btn-close-detail', closeDetailPopup);

// Submit entry
$(document).on('click', '#pe-btn-submit-entry', async function() {
    if (!currentDetailEntry) return;
    const confirmed = await new Promise(resolve => {
        frappe.confirm(TEXT.CONFIRM_SUBMIT, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;
    let $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');
    try {
        await frappe.call({ method: API_BASE + ".submit_entry", args: { entry_name: currentDetailEntry.name } });
        frappe.show_alert({ message: TEXT.SUBMIT_SUCCESS, indicator: 'green' }, 3);
        closeDetailPopup();
        loadEntries();
    } catch (e) {
        frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
        $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SUBMIT_ENTRY}`);
    }
});

// Cancel entry
$(document).on('click', '#pe-btn-cancel-entry', async function() {
    if (!currentDetailEntry) return;
    const confirmed = await new Promise(resolve => {
        frappe.confirm(TEXT.CONFIRM_CANCEL, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;
    let $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');
    try {
        await frappe.call({ method: API_BASE + ".cancel_entry", args: { entry_name: currentDetailEntry.name } });
        frappe.show_alert({ message: TEXT.CANCEL_SUCCESS, indicator: 'green' }, 3);
        closeDetailPopup();
        loadEntries();
    } catch (e) {
        frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
        $btn.prop('disabled', false).html(`<i class="fa fa-ban"></i> ${TEXT.CANCEL_ENTRY}`);
    }
});

// Delete entry
$(document).on('click', '#pe-btn-delete-entry', async function() {
    if (!currentDetailEntry) return;
    const confirmed = await new Promise(resolve => {
        frappe.confirm(TEXT.CONFIRM_DELETE, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;
    let $btn = $(this);
    $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i>');
    try {
        await frappe.call({ method: API_BASE + ".delete_entry", args: { entry_name: currentDetailEntry.name } });
        frappe.show_alert({ message: TEXT.DELETE_SUCCESS, indicator: 'green' }, 3);
        closeDetailPopup();
        loadEntries();
    } catch (e) {
        frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
        $btn.prop('disabled', false).html(`<i class="fa fa-trash"></i> ${TEXT.DELETE_ENTRY}`);
    }
});

};
