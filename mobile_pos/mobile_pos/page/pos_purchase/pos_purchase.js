frappe.pages['pos-purchase'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.pos_purchase', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.pos_purchase');
});

const TEXT = {
    PAGE_TITLE: "فاتورة مشتريات",
    SUPPLIER: "المورد",
    SELECT_SUPPLIER: "اختر المورد",
    SEARCH: "ابحث...",
    WAREHOUSE: "المستودع",
    SELECT_WAREHOUSE: "اختر المستودع",
    ITEMS: "الأصناف",
    BROWSE_ITEMS: "تصفح الأصناف",
    ADD_ITEM: "إضافة",
    QTY: "الكمية",
    RATE: "السعر",
    LAST_RATE: "آخر سعر شراء",
    AMOUNT: "المبلغ",
    TOTAL: "الإجمالي",
    REMARKS: "ملاحظات",
    SUBMIT: "حفظ واعتماد",
    SUBMITTING: "جارٍ الحفظ...",
    SUCCESS: name => `تم إنشاء الفاتورة ${name} بنجاح!`,
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_SUPPLIER: "يرجى اختيار المورد.",
    REQUIRED_ITEMS: "يرجى إضافة صنف واحد على الأقل.",
    REQUIRED_QTY_RATE: "يرجى إدخال الكمية والسعر لجميع الأصناف.",
    NO_RESULTS: "لا توجد نتائج",
    BACK: "الرئيسية",
    RECENT_ENTRIES: "الفواتير السابقة",
    DRAFT: "مسودة",
    SUBMITTED: "معتمد",
    CANCELLED: "ملغي",
    SUBMIT_ENTRY: "اعتماد",
    CANCEL_ENTRY: "إلغاء",
    CLOSE: "إغلاق",
    CONFIRM_SUBMIT: "هل تريد اعتماد هذه الفاتورة؟",
    CONFIRM_CANCEL: "هل تريد إلغاء هذه الفاتورة؟",
    YES: "نعم",
    NO: "لا",
    LOADING: "جارٍ التحميل...",
    NO_ENTRIES: "لا توجد فواتير سابقة",
    ENTRY_DETAILS: "تفاصيل الفاتورة"
};

let context = null;
let selectedSupplier = "";
let selectedSupplierLabel = "";
let selectedWarehouse = "";
let itemsList = []; // [{item_code, item_name, qty, rate, uom}]
// item_code -> {last_purchase_rate, item_price, valuation_rate}
let itemPriceMap = {};

$(wrapper).html(`
<div class="pi-page" dir="rtl">
    <div class="pi-header">
        <div class="pi-header-inner">
            <h1 class="pi-title"><i class="fa fa-shopping-bag"></i> ${TEXT.PAGE_TITLE}</h1>
            <div class="pi-header-actions">
                <button type="button" id="pi-refresh-btn" class="pi-header-btn pi-refresh-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="pi-home-btn" class="pi-header-btn pi-home-btn" title="الرئيسية"><i class="fa fa-home"></i> ${TEXT.BACK}</button>
            </div>
        </div>
    </div>
    <!-- Tabs -->
    <div class="pi-tabs">
        <div class="pi-tabs-inner">
            <button type="button" class="pi-tab active" data-tab="new"><i class="fa fa-plus-circle"></i> فاتورة جديدة</button>
            <button type="button" class="pi-tab" data-tab="old"><i class="fa fa-list"></i> ${TEXT.RECENT_ENTRIES}</button>
        </div>
    </div>
    <div class="pi-body">
        <!-- NEW TAB -->
        <div class="pi-tab-content" id="pi-tab-new">
        <div class="pi-card">
            <!-- Supplier -->
            <div class="pi-field">
                <label class="pi-label">${TEXT.SUPPLIER}</label>
                <button type="button" id="pi-supplier-btn" class="pi-select-btn">
                    <i class="fa fa-truck"></i>
                    <span id="pi-supplier-label">${TEXT.SELECT_SUPPLIER}</span>
                    <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                </button>
            </div>

            <!-- Warehouse -->
            <div class="pi-field">
                <label class="pi-label">${TEXT.WAREHOUSE}</label>
                <button type="button" id="pi-warehouse-btn" class="pi-select-btn">
                    <i class="fa fa-building"></i>
                    <span id="pi-warehouse-label">${TEXT.SELECT_WAREHOUSE}</span>
                    <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                </button>
            </div>

            <!-- Items Section -->
            <div class="pi-field">
                <label class="pi-label">${TEXT.ITEMS}</label>
                <div class="pi-table-wrap">
                    <table class="pi-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>الصنف</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>المبلغ</th>
                                <th style="width:38px;"></th>
                            </tr>
                        </thead>
                    </table>
                    <div class="pi-table-scroll">
                        <table class="pi-table">
                            <tbody id="pi-items-body"></tbody>
                        </table>
                    </div>
                </div>
                <button type="button" id="pi-browse-items" class="pi-add-btn">
                    <i class="fa fa-th"></i> ${TEXT.BROWSE_ITEMS}
                </button>
            </div>

            <!-- Total -->
            <div class="pi-total-row">
                <span class="pi-total-label">${TEXT.TOTAL}:</span>
                <span id="pi-total" class="pi-total-value">0.00</span>
            </div>

            <!-- Remarks -->
            <div class="pi-field">
                <label class="pi-label">${TEXT.REMARKS}</label>
                <textarea id="pi-remarks" class="pi-input pi-textarea" rows="2"></textarea>
            </div>

            <!-- Submit -->
            <button type="button" id="pi-submit" class="pi-submit-btn">
                <i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}
            </button>
            <div id="pi-result"></div>
        </div>
        </div><!-- /pi-tab-new -->

        <!-- OLD TAB -->
        <div class="pi-tab-content" id="pi-tab-old" style="display:none;">
        <div class="pi-card">
            <div class="pi-entries-header">
                <h2 class="pi-entries-title"><i class="fa fa-list"></i> ${TEXT.RECENT_ENTRIES}</h2>
                <button type="button" id="pi-load-entries" class="pi-entries-refresh-btn"><i class="fa fa-refresh"></i></button>
            </div>
            <div id="pi-entries-list" class="pi-entries-list">
                <div class="pi-entries-empty">${TEXT.NO_ENTRIES}</div>
            </div>
        </div>
        </div><!-- /pi-tab-old -->
    </div>
</div>
<style>
.pi-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}
.pi-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);padding:20px 16px 24px;color:#fff;z-index:100;box-shadow:0 4px 20px rgba(102,126,234,0.35);}
.pi-header-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;gap:14px;}
.pi-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.pi-header-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:0.95em;font-weight:700;border:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;white-space:nowrap;font-family:inherit;position:relative;overflow:hidden;}
.pi-home-btn{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 4px 16px rgba(16,185,129,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:100px;}
.pi-home-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,185,129,0.5),inset 0 1px 1px rgba(255,255,255,0.4);}
.pi-home-btn:active{transform:translateY(0);}
.pi-refresh-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;box-shadow:0 4px 16px rgba(59,130,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.pi-refresh-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(59,130,246,0.5);}
.pi-refresh-btn:active{transform:scale(0.95);}
.pi-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
/* Tabs */
.pi-tabs{background:#fff;border-bottom:2px solid #e2e8f0;position:sticky;top:0;z-index:99;box-shadow:0 2px 8px rgba(0,0,0,0.04);}
.pi-tabs-inner{max-width:600px;margin:0 auto;display:flex;gap:0;}
.pi-tab{flex:1;padding:14px 16px;border:none;background:transparent;font-family:inherit;font-size:1em;font-weight:700;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;position:relative;}
.pi-tab:hover{color:#0e7490;background:#f8fafc;}
.pi-tab.active{color:#0891b2;}
.pi-tab.active::after{content:'';position:absolute;bottom:-2px;left:10%;right:10%;height:3px;background:linear-gradient(135deg,#0891b2,#0e7490);border-radius:3px 3px 0 0;}
.pi-body{max-width:600px;margin:0 auto;padding:20px 16px;}
.pi-card{background:#fff;border-radius:20px;padding:24px 20px;margin-bottom:20px;box-shadow:0 8px 30px rgba(0,0,0,0.06);}
.pi-field{margin-bottom:20px;}
.pi-label{display:block;font-weight:700;color:#334155;margin-bottom:8px;font-size:0.95em;}
.pi-input{width:100%;padding:14px 16px;border:2px solid #e2e8f0;border-radius:14px;font-size:1.05em;font-family:inherit;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s;outline:none;text-align:right;}
.pi-input:focus{border-color:#0891b2;box-shadow:0 0 0 4px rgba(8,145,178,0.12);background:#fff;}
.pi-textarea{resize:none;min-height:60px;}
.pi-select-btn{width:100%;padding:14px 16px;border:2px solid #e2e8f0;border-radius:14px;background:#f8fafc;font-family:inherit;font-size:1.05em;font-weight:600;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:10px;text-align:right;}
.pi-select-btn:hover{border-color:#0891b2;color:#0e7490;}
.pi-select-btn.pi-selected{border-color:#0891b2;color:#155e75;background:#ecfeff;}
.pi-add-btn{width:100%;padding:14px 16px;border:2px dashed #cbd5e1;border-radius:14px;background:#f8fafc;font-family:inherit;font-size:1em;font-weight:700;color:#0891b2;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;}
.pi-add-btn:hover{border-color:#0891b2;background:#ecfeff;}
/* Items Table */
.pi-table-wrap{border:2px solid #e2e8f0;border-radius:14px;overflow:hidden;margin-bottom:4px;}
.pi-table{width:100%;border-collapse:collapse;font-size:0.9em;}
.pi-table thead th{background:#f1f5f9;padding:10px 8px;font-weight:700;color:#475569;text-align:center;border-bottom:2px solid #e2e8f0;font-size:0.85em;white-space:nowrap;}
.pi-table tbody td{padding:10px 6px;text-align:center;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
.pi-table tbody tr:last-child td{border-bottom:none;}
.pi-table-scroll{max-height:300px;overflow-y:auto;}
.pi-row-name{font-weight:700;color:#1e293b;font-size:0.95em;text-align:right;}
.pi-row-code{font-size:0.75em;color:#94a3b8;}
.pi-row-qty-wrap{display:flex;align-items:center;justify-content:center;gap:4px;}
.pi-qty-btn{width:32px;height:32px;border:none;border-radius:8px;font-size:1.2em;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.pi-qty-minus{background:#fee2e2;color:#dc2626;}
.pi-qty-minus:hover{background:#fca5a5;}
.pi-qty-plus{background:#d1fae5;color:#059669;}
.pi-qty-plus:hover{background:#a7f3d0;}
.pi-qty-input{width:50px;height:32px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:center;font-size:1em;font-weight:700;font-family:inherit;outline:none;}
.pi-qty-input:focus{border-color:#0891b2;}
.pi-rate-input{width:70px;height:32px;border:1.5px solid #e2e8f0;border-radius:8px;text-align:center;font-size:1em;font-weight:700;font-family:inherit;outline:none;}
.pi-rate-input:focus{border-color:#0891b2;}
.pi-row-amount{font-weight:800;color:#0e7490;}
.pi-row-delete{width:30px;height:30px;border:none;border-radius:8px;background:#fee2e2;color:#dc2626;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.8em;transition:all 0.15s;}
.pi-row-delete:hover{background:#fca5a5;color:#991b1b;}
.pi-table-empty{text-align:center;padding:24px;color:#94a3b8;font-size:0.95em;}
/* Total */
.pi-total-row{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:linear-gradient(135deg,#ecfeff,#cffafe);border-radius:14px;margin-bottom:20px;}
.pi-total-label{font-weight:800;color:#155e75;font-size:1.1em;}
.pi-total-value{font-weight:800;color:#0e7490;font-size:1.4em;letter-spacing:1px;}
/* Submit */
.pi-submit-btn{width:100%;padding:16px;border:none;border-radius:16px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;font-family:inherit;font-size:1.15em;font-weight:800;cursor:pointer;transition:all 0.2s;box-shadow:0 8px 25px rgba(14,116,144,0.3);display:flex;align-items:center;justify-content:center;gap:10px;}
.pi-submit-btn:hover{transform:translateY(-2px);box-shadow:0 12px 35px rgba(14,116,144,0.4);}
.pi-submit-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.hidden{display:none!important;}
.pi-error{background:#fef2f2;border:2px solid #fca5a5;border-radius:14px;padding:16px;margin-top:16px;text-align:center;color:#991b1b;font-weight:600;}
/* Catalog Popup */
.pi-popup-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:30px 16px;}
.pi-popup{background:#fff;border-radius:20px;padding:20px;max-width:500px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.2);max-height:85vh;display:flex;flex-direction:column;}
.pi-popup-title{font-size:1.1em;font-weight:800;color:#1e293b;margin-bottom:14px;text-align:center;}
.pi-popup-search{width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;background:#f8fafc;outline:none;text-align:right;margin-bottom:12px;transition:border-color 0.2s;}
.pi-popup-search:focus{border-color:#0891b2;background:#fff;}
.pi-popup-list{overflow-y:auto;flex:1;max-height:55vh;}
/* Item Catalog Grid */
.pi-catalog-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;overflow-y:auto;flex:1;max-height:55vh;padding:4px;}
.pi-catalog-card{background:#f8fafc;border:2px solid #e2e8f0;border-radius:14px;padding:14px 10px;text-align:center;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;align-items:center;gap:6px;}
.pi-catalog-card:hover{border-color:#0891b2;background:#ecfeff;transform:translateY(-2px);box-shadow:0 4px 12px rgba(8,145,178,0.12);}
.pi-catalog-card:active{transform:scale(0.97);}
.pi-catalog-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.2em;}
.pi-catalog-name{font-weight:700;color:#1e293b;font-size:0.85em;line-height:1.3;max-height:2.6em;overflow:hidden;text-overflow:ellipsis;word-break:break-word;}
.pi-catalog-code{font-size:0.7em;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}
.pi-catalog-price{font-size:0.75em;font-weight:700;color:#0e7490;margin-top:2px;}
.pi-popup-card{display:flex;align-items:center;gap:12px;padding:14px;border:2px solid #e2e8f0;border-radius:14px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;background:#f8fafc;}
.pi-popup-card:hover{border-color:#0891b2;background:#ecfeff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(8,145,178,0.12);}
.pi-popup-card-icon{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
.pi-popup-card-info{flex:1;min-width:0;}
.pi-popup-card-name{font-weight:700;color:#1e293b;font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pi-popup-card-sub{font-size:0.85em;color:#64748b;margin-top:2px;}
.pi-popup-empty{text-align:center;padding:30px;color:#94a3b8;font-size:0.95em;}
/* Item Config Dialog */
.pi-config-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:210;display:flex;align-items:center;justify-content:center;padding:20px;}
.pi-config{background:#fff;border-radius:20px;padding:28px 24px;max-width:380px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.25);}
.pi-config-title{font-size:1.15em;font-weight:800;color:#1e293b;margin-bottom:20px;text-align:center;}
.pi-config-row{margin-bottom:18px;text-align:center;}
.pi-config-label{font-weight:700;color:#475569;margin-bottom:8px;font-size:0.95em;}
.pi-config-hint{font-size:0.8em;color:#0e7490;font-weight:600;margin-top:6px;}
.pi-config-qty-wrap{display:flex;align-items:center;justify-content:center;gap:14px;}
.pi-config-qty-btn{width:48px;height:48px;border-radius:12px;border:none;font-size:1.5em;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.pi-config-minus{background:#fee2e2;color:#dc2626;}
.pi-config-minus:hover{background:#fca5a5;}
.pi-config-plus{background:#d1fae5;color:#059669;}
.pi-config-plus:hover{background:#a7f3d0;}
.pi-config-qty-input{width:80px;height:48px;border:2px solid #e2e8f0;border-radius:12px;text-align:center;font-size:1.4em;font-weight:800;font-family:inherit;outline:none;}
.pi-config-qty-input:focus{border-color:#0891b2;}
.pi-config-rate-input{width:130px;height:48px;border:2px solid #e2e8f0;border-radius:12px;text-align:center;font-size:1.3em;font-weight:800;font-family:inherit;outline:none;}
.pi-config-rate-input:focus{border-color:#0891b2;}
.pi-config-actions{display:flex;gap:10px;margin-top:22px;}
.pi-config-add{flex:2;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#0891b2,#0e7490);color:#fff;font-family:inherit;font-size:1.1em;font-weight:800;cursor:pointer;transition:all 0.2s;}
.pi-config-add:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(8,145,178,0.3);}
.pi-config-cancel{flex:1;padding:14px;border:2px solid #e2e8f0;border-radius:14px;background:#fff;color:#64748b;font-family:inherit;font-size:1em;font-weight:700;cursor:pointer;transition:all 0.2s;}
.pi-config-cancel:hover{border-color:#cbd5e1;background:#f8fafc;}
/* Recent Entries */
.pi-entries-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.pi-entries-title{font-size:1.1em;font-weight:800;color:#1e293b;margin:0;display:flex;align-items:center;gap:8px;}
.pi-entries-refresh-btn{width:38px;height:38px;border:none;border-radius:10px;background:#f1f5f9;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1em;transition:all 0.2s;}
.pi-entries-refresh-btn:hover{background:#e2e8f0;color:#334155;}
.pi-entries-list{display:flex;flex-direction:column;gap:8px;}
.pi-entries-empty{text-align:center;padding:30px;color:#94a3b8;font-size:0.95em;}
.pi-entry-card{display:flex;align-items:center;gap:12px;padding:14px;border:2px solid #e2e8f0;border-radius:14px;cursor:pointer;transition:all 0.2s;background:#f8fafc;}
.pi-entry-card:hover{border-color:#0891b2;background:#ecfeff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(8,145,178,0.12);}
.pi-entry-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.1em;flex-shrink:0;}
.pi-entry-icon.draft{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;}
.pi-entry-icon.submitted{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.pi-entry-icon.cancelled{background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;}
.pi-entry-info{flex:1;min-width:0;}
.pi-entry-name{font-weight:700;color:#1e293b;font-size:0.95em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.pi-entry-sub{font-size:0.8em;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.pi-entry-amount{font-weight:800;color:#0e7490;font-size:1em;flex-shrink:0;}
.pi-entry-badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:0.7em;font-weight:700;}
.pi-entry-badge.draft{background:#fef3c7;color:#92400e;}
.pi-entry-badge.submitted{background:#d1fae5;color:#065f46;}
.pi-entry-badge.cancelled{background:#fee2e2;color:#991b1b;}
/* Detail Popup */
.pi-detail-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.45);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:30px 16px;}
.pi-detail{background:#fff;border-radius:20px;padding:24px 20px;max-width:500px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.25);max-height:85vh;display:flex;flex-direction:column;overflow-y:auto;}
.pi-detail-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}
.pi-detail-title{font-size:1.15em;font-weight:800;color:#1e293b;display:flex;align-items:center;gap:8px;}
.pi-detail-close{width:36px;height:36px;border:none;border-radius:10px;background:#f1f5f9;color:#64748b;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1em;transition:all 0.2s;}
.pi-detail-close:hover{background:#e2e8f0;color:#334155;}
.pi-detail-info{display:flex;flex-direction:column;gap:10px;margin-bottom:18px;}
.pi-detail-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;}
.pi-detail-row-label{font-weight:700;color:#475569;font-size:0.9em;}
.pi-detail-row-value{font-weight:600;color:#1e293b;font-size:0.9em;}
.pi-detail-items-title{font-weight:800;color:#334155;font-size:0.95em;margin-bottom:10px;}
.pi-detail-item{display:flex;align-items:center;gap:10px;padding:10px;background:#f8fafc;border-radius:10px;margin-bottom:6px;}
.pi-detail-item-idx{width:24px;height:24px;border-radius:8px;background:#e2e8f0;color:#475569;display:flex;align-items:center;justify-content:center;font-size:0.75em;font-weight:700;flex-shrink:0;}
.pi-detail-item-info{flex:1;min-width:0;}
.pi-detail-item-name{font-weight:700;color:#1e293b;font-size:0.85em;}
.pi-detail-item-meta{font-size:0.75em;color:#64748b;margin-top:2px;}
.pi-detail-item-amount{font-weight:800;color:#0e7490;font-size:0.85em;flex-shrink:0;}
.pi-detail-total{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:linear-gradient(135deg,#ecfeff,#cffafe);border-radius:12px;margin-top:12px;margin-bottom:16px;}
.pi-detail-total-label{font-weight:800;color:#155e75;font-size:1em;}
.pi-detail-total-value{font-weight:800;color:#0e7490;font-size:1.2em;}
.pi-detail-actions{display:flex;gap:10px;margin-top:8px;}
.pi-detail-submit-btn{flex:1;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-family:inherit;font-size:1.05em;font-weight:800;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(16,185,129,0.3);}
.pi-detail-submit-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(16,185,129,0.4);}
.pi-detail-submit-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.pi-detail-cancel-btn{flex:1;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-family:inherit;font-size:1.05em;font-weight:800;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(239,68,68,0.3);}
.pi-detail-cancel-btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(239,68,68,0.4);}
.pi-detail-cancel-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.pi-detail-close-action{flex:1;padding:14px;border:2px solid #e2e8f0;border-radius:14px;background:#fff;color:#64748b;font-family:inherit;font-size:1em;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;}
.pi-detail-close-action:hover{border-color:#cbd5e1;background:#f8fafc;}
/* Confirm Dialog */
.pi-confirm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:250;display:flex;align-items:center;justify-content:center;padding:20px;}
.pi-confirm{background:#fff;border-radius:20px;padding:28px 24px;max-width:360px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.3);text-align:center;}
.pi-confirm-icon{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:1.8em;}
.pi-confirm-icon.submit{background:#d1fae5;color:#059669;}
.pi-confirm-icon.cancel{background:#fee2e2;color:#dc2626;}
.pi-confirm-msg{font-size:1.1em;font-weight:700;color:#1e293b;margin-bottom:24px;line-height:1.5;}
.pi-confirm-actions{display:flex;gap:10px;}
.pi-confirm-yes{flex:1;padding:14px;border:none;border-radius:14px;color:#fff;font-family:inherit;font-size:1.05em;font-weight:800;cursor:pointer;transition:all 0.2s;}
.pi-confirm-yes.submit{background:linear-gradient(135deg,#10b981,#059669);}
.pi-confirm-yes.cancel{background:linear-gradient(135deg,#ef4444,#dc2626);}
.pi-confirm-yes:hover{transform:translateY(-1px);}
.pi-confirm-yes:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.pi-confirm-no{flex:1;padding:14px;border:2px solid #e2e8f0;border-radius:14px;background:#fff;color:#64748b;font-family:inherit;font-size:1em;font-weight:700;cursor:pointer;transition:all 0.2s;}
.pi-confirm-no:hover{border-color:#cbd5e1;background:#f8fafc;}
@media(max-width:480px){.pi-title{font-size:1.1em;}.pi-catalog-grid{grid-template-columns:repeat(2,1fr);}}
</style>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}
function flt(v) { return parseFloat(v) || 0; }
function escHtml(s) { return $('<span>').text(s).html(); }

// Get best purchase price for an item: item_price > last_purchase_rate > valuation_rate
function getBestRate(item_code) {
    let info = itemPriceMap[item_code];
    if (!info) return 0;
    if (info.item_price > 0) return info.item_price;
    if (info.last_purchase_rate > 0) return info.last_purchase_rate;
    if (info.valuation_rate > 0) return info.valuation_rate;
    return 0;
}

function formatRate(v) {
    v = flt(v);
    return v > 0 ? v.toFixed(2) : '';
}

// Load context
frappe.call({
    method: "mobile_pos.mobile_pos.page.pos_purchase.api.get_context",
    callback: function(r) {
        context = r.message;
        // Set default warehouse from profile
        if (context && context.warehouse) {
            selectedWarehouse = context.warehouse;
            $('#pi-warehouse-label').text(selectedWarehouse);
            $('#pi-warehouse-btn').addClass('pi-selected');
        }
        // Build price map
        if (context && context.items) {
            context.items.forEach(it => {
                itemPriceMap[it.item_code] = {
                    last_purchase_rate: flt(it.last_purchase_rate),
                    item_price: flt(it.item_price),
                    valuation_rate: flt(it.valuation_rate)
                };
            });
        }
    }
});

function calcTotal() {
    let total = 0;
    itemsList.forEach(it => { total += (flt(it.qty) * flt(it.rate)); });
    $('#pi-total').text(total.toFixed(2));
}

function renderItems() {
    if (!itemsList.length) {
        $('#pi-items-body').html(`<tr><td colspan="6" class="pi-table-empty">لا توجد أصناف</td></tr>`);
        calcTotal();
        return;
    }
    let html = itemsList.map((it, idx) => {
        let amount = (flt(it.qty) * flt(it.rate)).toFixed(2);
        return `<tr>
            <td style="color:#94a3b8;font-weight:600;">${idx + 1}</td>
            <td style="text-align:right;">
                <div class="pi-row-name">${escHtml(it.item_name || it.item_code)}</div>
                <div class="pi-row-code">${escHtml(it.item_code)}${it.uom ? ' · ' + escHtml(it.uom) : ''}</div>
            </td>
            <td>
                <div class="pi-row-qty-wrap">
                    <button type="button" class="pi-qty-btn pi-qty-minus" data-idx="${idx}">−</button>
                    <input type="text" inputmode="decimal" class="pi-qty-input" data-idx="${idx}" value="${it.qty}" autocomplete="off">
                    <button type="button" class="pi-qty-btn pi-qty-plus" data-idx="${idx}">+</button>
                </div>
            </td>
            <td>
                <input type="text" inputmode="decimal" class="pi-rate-input" data-idx="${idx}" value="${it.rate || ''}" autocomplete="off">
            </td>
            <td class="pi-row-amount" data-idx="${idx}">${amount}</td>
            <td><button type="button" class="pi-row-delete" data-idx="${idx}"><i class="fa fa-trash"></i></button></td>
        </tr>`;
    }).join('');
    $('#pi-items-body').html(html);
    calcTotal();
}

// Initialize empty table
renderItems();

// ===== Tab Switching =====
let entriesLoaded = false;
$(wrapper).on('click', '.pi-tab', function() {
    let tab = $(this).data('tab');
    $(wrapper).find('.pi-tab').removeClass('active');
    $(this).addClass('active');
    $(wrapper).find('.pi-tab-content').hide();
    $(wrapper).find('#pi-tab-' + tab).show();
    if (tab === 'old' && !entriesLoaded) {
        entriesLoaded = true;
        loadRecentEntries();
    }
});

// ===== Supplier popup =====
$(wrapper).on('click', '#pi-supplier-btn', function() {
    if (!context || !context.suppliers || !context.suppliers.length) return;
    let list = context.suppliers;

    function renderCards(items) {
        if (!items.length) return `<div class="pi-popup-empty">${TEXT.NO_RESULTS}</div>`;
        return items.map(s =>
            `<div class="pi-popup-card" data-value="${escHtml(s.name)}" data-label="${escHtml(s.supplier_name || s.name)}">
                <div class="pi-popup-card-icon"><i class="fa fa-truck"></i></div>
                <div class="pi-popup-card-info">
                    <div class="pi-popup-card-name">${escHtml(s.supplier_name || s.name)}</div>
                    <div class="pi-popup-card-sub">${escHtml(s.name)}</div>
                </div>
            </div>`
        ).join('');
    }

    let popup = $(`<div class="pi-popup-overlay">
        <div class="pi-popup">
            <div class="pi-popup-title"><i class="fa fa-truck"></i> ${TEXT.SELECT_SUPPLIER}</div>
            <input type="text" class="pi-popup-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
            <div class="pi-popup-list">${renderCards(list.slice(0, 50))}</div>
        </div>
    </div>`);
    $('body').append(popup);
    popup.find('.pi-popup-search').focus();

    popup.on('input', '.pi-popup-search', function() {
        let val = $(this).val().trim().toLowerCase();
        let filtered = val
            ? list.filter(s => (s.supplier_name || "").toLowerCase().includes(val) || s.name.toLowerCase().includes(val)).slice(0, 50)
            : list.slice(0, 50);
        popup.find('.pi-popup-list').html(renderCards(filtered));
    });

    popup.on('click', '.pi-popup-card', function() {
        selectedSupplier = $(this).data('value');
        selectedSupplierLabel = $(this).data('label');
        $('#pi-supplier-label').text(selectedSupplierLabel);
        $('#pi-supplier-btn').addClass('pi-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pi-popup-overlay')) popup.remove();
    });
});

// ===== Warehouse popup =====
$(wrapper).on('click', '#pi-warehouse-btn', function() {
    if (!context || !context.warehouses || !context.warehouses.length) return;
    let list = context.warehouses;

    function renderCards(items) {
        if (!items.length) return `<div class="pi-popup-empty">${TEXT.NO_RESULTS}</div>`;
        return items.map(w =>
            `<div class="pi-popup-card" data-value="${escHtml(w)}">
                <div class="pi-popup-card-icon"><i class="fa fa-building"></i></div>
                <div class="pi-popup-card-info">
                    <div class="pi-popup-card-name">${escHtml(w)}</div>
                </div>
            </div>`
        ).join('');
    }

    let popup = $(`<div class="pi-popup-overlay">
        <div class="pi-popup">
            <div class="pi-popup-title"><i class="fa fa-building"></i> ${TEXT.SELECT_WAREHOUSE}</div>
            <input type="text" class="pi-popup-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
            <div class="pi-popup-list">${renderCards(list.slice(0, 50))}</div>
        </div>
    </div>`);
    $('body').append(popup);
    popup.find('.pi-popup-search').focus();

    popup.on('input', '.pi-popup-search', function() {
        let val = $(this).val().trim().toLowerCase();
        let filtered = val
            ? list.filter(w => w.toLowerCase().includes(val)).slice(0, 50)
            : list.slice(0, 50);
        popup.find('.pi-popup-list').html(renderCards(filtered));
    });

    popup.on('click', '.pi-popup-card', function() {
        selectedWarehouse = $(this).data('value');
        $('#pi-warehouse-label').text(selectedWarehouse);
        $('#pi-warehouse-btn').addClass('pi-selected');
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pi-popup-overlay')) popup.remove();
    });
});

// ===== Browse Items — Catalog Grid Popup =====
$(wrapper).on('click', '#pi-browse-items', function() {
    if (!context || !context.items || !context.items.length) return;
    let list = context.items;

    function renderGrid(items) {
        if (!items.length) return `<div class="pi-popup-empty">${TEXT.NO_RESULTS}</div>`;
        return items.map(it => {
            let rate = getBestRate(it.item_code);
            let priceHtml = rate > 0 ? `<div class="pi-catalog-price"><i class="fa fa-tag"></i> ${rate.toFixed(2)}</div>` : '';
            return `<div class="pi-catalog-card" data-code="${escHtml(it.item_code)}" data-name="${escHtml(it.item_name || it.item_code)}" data-uom="${escHtml(it.stock_uom || '')}">
                <div class="pi-catalog-icon"><i class="fa fa-cube"></i></div>
                <div class="pi-catalog-name">${escHtml(it.item_name || it.item_code)}</div>
                <div class="pi-catalog-code">${escHtml(it.item_code)}</div>
                ${priceHtml}
            </div>`;
        }).join('');
    }

    let popup = $(`<div class="pi-popup-overlay">
        <div class="pi-popup">
            <div class="pi-popup-title"><i class="fa fa-th"></i> ${TEXT.BROWSE_ITEMS}</div>
            <input type="text" class="pi-popup-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
            <div class="pi-catalog-grid">${renderGrid(list.slice(0, 60))}</div>
        </div>
    </div>`);
    $('body').append(popup);
    popup.find('.pi-popup-search').focus();

    popup.on('input', '.pi-popup-search', function() {
        let val = $(this).val().trim().toLowerCase();
        let filtered = val
            ? list.filter(it => (it.item_name || "").toLowerCase().includes(val) || it.item_code.toLowerCase().includes(val)).slice(0, 60)
            : list.slice(0, 60);
        popup.find('.pi-catalog-grid').html(renderGrid(filtered));
    });

    popup.on('click', '.pi-catalog-card', function() {
        let code = $(this).data('code');
        let name = $(this).data('name');
        let uom = $(this).data('uom');
        popup.remove();
        openItemConfig(code, name, uom);
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('pi-popup-overlay')) popup.remove();
    });
});

// ===== Item Config Dialog (qty +/- and rate with last purchase rate hint) =====
function openItemConfig(item_code, item_name, uom) {
    let defaultRate = getBestRate(item_code);
    let info = itemPriceMap[item_code] || {};
    let lastRate = flt(info.last_purchase_rate);
    let itemPrice = flt(info.item_price);

    // Build hint text showing available prices
    let hints = [];
    if (lastRate > 0) hints.push(`آخر سعر شراء: ${lastRate.toFixed(2)}`);
    if (itemPrice > 0 && itemPrice !== lastRate) hints.push(`سعر القائمة: ${itemPrice.toFixed(2)}`);
    let hintHtml = hints.length ? `<div class="pi-config-hint">${hints.join(' | ')}</div>` : '';

    let overlay = $(`<div class="pi-config-overlay">
        <div class="pi-config" dir="rtl">
            <div class="pi-config-title"><i class="fa fa-plus-circle" style="color:#0891b2;"></i> ${escHtml(item_name)}</div>
            <div class="pi-config-row">
                <div class="pi-config-label">${TEXT.QTY}</div>
                <div class="pi-config-qty-wrap">
                    <button type="button" class="pi-config-qty-btn pi-config-minus">−</button>
                    <input type="text" inputmode="decimal" class="pi-config-qty-input" id="pi-cfg-qty" value="1" autocomplete="off">
                    <button type="button" class="pi-config-qty-btn pi-config-plus">+</button>
                </div>
            </div>
            <div class="pi-config-row">
                <div class="pi-config-label">${TEXT.RATE}</div>
                <input type="text" inputmode="decimal" class="pi-config-rate-input" id="pi-cfg-rate" value="${formatRate(defaultRate)}" placeholder="0.00" autocomplete="off">
                ${hintHtml}
            </div>
            <div class="pi-config-actions">
                <button type="button" class="pi-config-add" id="pi-cfg-add"><i class="fa fa-cart-plus"></i> ${TEXT.ADD_ITEM}</button>
                <button type="button" class="pi-config-cancel" id="pi-cfg-cancel">إلغاء</button>
            </div>
        </div>
    </div>`);
    $('body').append(overlay);
    // Focus rate if no default, otherwise focus qty
    if (defaultRate > 0) {
        overlay.find('#pi-cfg-qty').focus().select();
    } else {
        overlay.find('#pi-cfg-rate').focus();
    }

    // Arabic number conversion
    overlay.on('input', '#pi-cfg-qty, #pi-cfg-rate', function() {
        let val = convertArabicToEnglishNumbers($(this).val());
        if (val !== $(this).val()) $(this).val(val);
    });

    // Qty +/-
    overlay.on('click', '.pi-config-minus', function() {
        let inp = overlay.find('#pi-cfg-qty');
        let v = flt(inp.val());
        if (v > 1) inp.val(v - 1);
    });
    overlay.on('click', '.pi-config-plus', function() {
        let inp = overlay.find('#pi-cfg-qty');
        let v = flt(inp.val());
        inp.val(v + 1);
    });

    // Add
    overlay.on('click', '#pi-cfg-add', function() {
        let qty = flt(overlay.find('#pi-cfg-qty').val());
        let rate = flt(overlay.find('#pi-cfg-rate').val());
        if (qty <= 0) {
            frappe.show_alert({ message: "يرجى إدخال كمية صحيحة.", indicator: 'red' }, 3);
            return;
        }
        if (rate <= 0) {
            frappe.show_alert({ message: "يرجى إدخال السعر.", indicator: 'red' }, 3);
            return;
        }
        // Check if same item already exists with same rate, increment qty
        let existing = itemsList.find(i => i.item_code === item_code && i.rate === rate);
        if (existing) {
            existing.qty += qty;
        } else {
            itemsList.push({ item_code, item_name, qty, rate, uom });
        }
        renderItems();
        overlay.remove();
    });

    // Cancel
    overlay.on('click', '#pi-cfg-cancel', function() { overlay.remove(); });
    overlay.on('click', function(e) {
        if ($(e.target).hasClass('pi-config-overlay')) overlay.remove();
    });
}

// ===== Inline qty +/- in table =====
$(wrapper).on('click', '.pi-qty-minus', function() {
    let idx = parseInt($(this).data('idx'));
    if (itemsList[idx].qty > 1) {
        itemsList[idx].qty = flt(itemsList[idx].qty) - 1;
        renderItems();
    }
});
$(wrapper).on('click', '.pi-qty-plus', function() {
    let idx = parseInt($(this).data('idx'));
    itemsList[idx].qty = flt(itemsList[idx].qty) + 1;
    renderItems();
});

// Inline qty/rate editing
$(wrapper).on('input', '.pi-qty-input, .pi-rate-input', function() {
    let val = convertArabicToEnglishNumbers($(this).val());
    if (val !== $(this).val()) $(this).val(val);
    let idx = parseInt($(this).data('idx'));
    if ($(this).hasClass('pi-qty-input')) {
        itemsList[idx].qty = flt(val);
    } else {
        itemsList[idx].rate = flt(val);
    }
    let q = flt(itemsList[idx].qty), r = flt(itemsList[idx].rate);
    $(`td.pi-row-amount[data-idx="${idx}"]`).text((q * r).toFixed(2));
    calcTotal();
});

// Item delete
$(wrapper).on('click', '.pi-row-delete', function() {
    let idx = parseInt($(this).data('idx'));
    itemsList.splice(idx, 1);
    renderItems();
});

// ===== Submit =====
$(wrapper).on('click', '#pi-submit', async function() {
    if (!selectedSupplier) return frappe.show_alert({ message: TEXT.REQUIRED_SUPPLIER, indicator: 'red' }, 3);
    if (!itemsList.length) return frappe.show_alert({ message: TEXT.REQUIRED_ITEMS, indicator: 'red' }, 3);

    // Validate items
    for (let it of itemsList) {
        it.qty = flt(it.qty);
        it.rate = flt(it.rate);
        if (it.qty <= 0 || it.rate <= 0) {
            return frappe.show_alert({ message: TEXT.REQUIRED_QTY_RATE, indicator: 'red' }, 3);
        }
    }

    let $btn = $(this);
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SUBMITTING}`);
    try {
        let r = await frappe.call({
            method: "mobile_pos.mobile_pos.page.pos_purchase.api.create_purchase_invoice",
            type: "POST",
            args: { data: JSON.stringify({
                supplier: selectedSupplier,
                warehouse: selectedWarehouse,
                items: itemsList.map(it => ({ item_code: it.item_code, qty: it.qty, rate: it.rate })),
                remarks: $('#pi-remarks').val().trim()
            })}
        });
        let doc = r.message;
        frappe.show_alert({ message: TEXT.SUCCESS(doc.name), indicator: 'green' }, 3);
        // Auto-clear form
        selectedSupplier = ""; selectedSupplierLabel = "";
        $('#pi-supplier-label').text(TEXT.SELECT_SUPPLIER);
        $('#pi-supplier-btn').removeClass('pi-selected');
        itemsList = [];
        renderItems();
        $('#pi-remarks').val('');
        $('#pi-result').empty();
        // Switch to old tab and reload
        entriesLoaded = false;
        $(wrapper).find('.pi-tab[data-tab="old"]').click();
    } catch (err) {
        let msg = err.message || (err._server_messages && JSON.parse(err._server_messages)[0]) || TEXT.ERROR;
        $('#pi-result').html(`<div class="pi-error">${msg}</div>`);
    }
    $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
});

// ===== Recent Entries =====
function loadRecentEntries() {
    $('#pi-entries-list').html(`<div class="pi-entries-empty"><i class="fa fa-spinner fa-spin"></i> ${TEXT.LOADING}</div>`);
    frappe.call({
        method: "mobile_pos.mobile_pos.page.pos_purchase.api.get_recent_entries",
        args: { limit: 30 },
        callback: function(r) {
            let entries = r.message || [];
            if (!entries.length) {
                $('#pi-entries-list').html(`<div class="pi-entries-empty">${TEXT.NO_ENTRIES}</div>`);
                return;
            }
            let html = entries.map(e => {
                let statusClass = e.docstatus === 0 ? 'draft' : e.docstatus === 1 ? 'submitted' : 'cancelled';
                let statusLabel = e.docstatus === 0 ? TEXT.DRAFT : e.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED;
                let icon = e.docstatus === 0 ? 'fa-pencil' : e.docstatus === 1 ? 'fa-check' : 'fa-times';
                return `<div class="pi-entry-card" data-name="${escHtml(e.name)}">
                    <div class="pi-entry-icon ${statusClass}"><i class="fa ${icon}"></i></div>
                    <div class="pi-entry-info">
                        <div class="pi-entry-name">${escHtml(e.name)}</div>
                        <div class="pi-entry-sub">
                            <span>${escHtml(e.supplier_name || e.supplier)}</span>
                            <span>·</span>
                            <span>${escHtml(e.posting_date)}</span>
                            <span class="pi-entry-badge ${statusClass}">${statusLabel}</span>
                        </div>
                    </div>
                    <div class="pi-entry-amount">${flt(e.grand_total).toFixed(2)}</div>
                </div>`;
            }).join('');
            $('#pi-entries-list').html(html);
        }
    });
}

// Refresh entries button
$(wrapper).on('click', '#pi-load-entries', function() {
    entriesLoaded = true;
    loadRecentEntries();
});

// ===== Entry Detail Popup =====
$(wrapper).on('click', '.pi-entry-card', function() {
    let entryName = $(this).data('name');
    showEntryDetail(entryName);
});

function showEntryDetail(entryName) {
    let overlay = $(`<div class="pi-detail-overlay" dir="rtl">
        <div class="pi-detail">
            <div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fa fa-spinner fa-spin"></i> ${TEXT.LOADING}</div>
        </div>
    </div>`);
    $('body').append(overlay);

    frappe.call({
        method: "mobile_pos.mobile_pos.page.pos_purchase.api.get_purchase_entry_details",
        args: { entry_name: entryName },
        callback: function(r) {
            let d = r.message;
            if (!d) {
                overlay.remove();
                frappe.show_alert({ message: TEXT.ERROR, indicator: 'red' }, 3);
                return;
            }

            let statusClass = d.docstatus === 0 ? 'draft' : d.docstatus === 1 ? 'submitted' : 'cancelled';
            let statusLabel = d.docstatus === 0 ? TEXT.DRAFT : d.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED;

            let itemsHtml = d.items.map((it, idx) =>
                `<div class="pi-detail-item">
                    <div class="pi-detail-item-idx">${idx + 1}</div>
                    <div class="pi-detail-item-info">
                        <div class="pi-detail-item-name">${escHtml(it.item_name || it.item_code)}</div>
                        <div class="pi-detail-item-meta">${escHtml(it.item_code)} · ${flt(it.qty)} × ${flt(it.rate).toFixed(2)}</div>
                    </div>
                    <div class="pi-detail-item-amount">${flt(it.amount).toFixed(2)}</div>
                </div>`
            ).join('');

            // Action buttons based on docstatus
            let actionsHtml = '';
            if (d.docstatus === 0) {
                actionsHtml = `<button type="button" class="pi-detail-submit-btn" data-name="${escHtml(d.name)}"><i class="fa fa-check-circle"></i> ${TEXT.SUBMIT_ENTRY}</button>`;
            } else if (d.docstatus === 1) {
                actionsHtml = `<button type="button" class="pi-detail-cancel-btn" data-name="${escHtml(d.name)}"><i class="fa fa-times-circle"></i> ${TEXT.CANCEL_ENTRY}</button>`;
            }

            overlay.find('.pi-detail').html(`
                <div class="pi-detail-header">
                    <div class="pi-detail-title"><i class="fa fa-file-text-o"></i> ${TEXT.ENTRY_DETAILS}</div>
                    <button type="button" class="pi-detail-close"><i class="fa fa-times"></i></button>
                </div>
                <div class="pi-detail-info">
                    <div class="pi-detail-row">
                        <span class="pi-detail-row-label">رقم الفاتورة</span>
                        <span class="pi-detail-row-value">${escHtml(d.name)}</span>
                    </div>
                    <div class="pi-detail-row">
                        <span class="pi-detail-row-label">${TEXT.SUPPLIER}</span>
                        <span class="pi-detail-row-value">${escHtml(d.supplier_name || d.supplier)}</span>
                    </div>
                    <div class="pi-detail-row">
                        <span class="pi-detail-row-label">التاريخ</span>
                        <span class="pi-detail-row-value">${escHtml(d.posting_date)}</span>
                    </div>
                    <div class="pi-detail-row">
                        <span class="pi-detail-row-label">الحالة</span>
                        <span class="pi-entry-badge ${statusClass}">${statusLabel}</span>
                    </div>
                    ${d.remarks ? `<div class="pi-detail-row">
                        <span class="pi-detail-row-label">${TEXT.REMARKS}</span>
                        <span class="pi-detail-row-value">${escHtml(d.remarks)}</span>
                    </div>` : ''}
                </div>
                <div class="pi-detail-items-title"><i class="fa fa-cube"></i> ${TEXT.ITEMS} (${d.items.length})</div>
                ${itemsHtml}
                <div class="pi-detail-total">
                    <span class="pi-detail-total-label">${TEXT.TOTAL}</span>
                    <span class="pi-detail-total-value">${flt(d.grand_total).toFixed(2)}</span>
                </div>
                <div class="pi-detail-actions">
                    ${actionsHtml}
                    <button type="button" class="pi-detail-close-action"><i class="fa fa-arrow-right"></i> ${TEXT.CLOSE}</button>
                </div>
            `);
        },
        error: function() {
            overlay.remove();
            frappe.show_alert({ message: TEXT.ERROR, indicator: 'red' }, 3);
        }
    });

    // Close handlers
    overlay.on('click', '.pi-detail-close, .pi-detail-close-action', function() { overlay.remove(); });
    overlay.on('click', function(e) { if ($(e.target).hasClass('pi-detail-overlay')) overlay.remove(); });

    // Submit action
    overlay.on('click', '.pi-detail-submit-btn', function() {
        let name = $(this).data('name');
        overlay.remove();
        showConfirmDialog('submit', name);
    });

    // Cancel action
    overlay.on('click', '.pi-detail-cancel-btn', function() {
        let name = $(this).data('name');
        overlay.remove();
        showConfirmDialog('cancel', name);
    });
}

// ===== Confirmation Dialog =====
function showConfirmDialog(action, entryName) {
    let isSubmit = action === 'submit';
    let iconClass = isSubmit ? 'submit' : 'cancel';
    let icon = isSubmit ? 'fa-check-circle' : 'fa-times-circle';
    let msg = isSubmit ? TEXT.CONFIRM_SUBMIT : TEXT.CONFIRM_CANCEL;

    let confirmOverlay = $(`<div class="pi-confirm-overlay" dir="rtl">
        <div class="pi-confirm">
            <div class="pi-confirm-icon ${iconClass}"><i class="fa ${icon}"></i></div>
            <div class="pi-confirm-msg">${msg}<br><strong>${escHtml(entryName)}</strong></div>
            <div class="pi-confirm-actions">
                <button type="button" class="pi-confirm-yes ${iconClass}" id="pi-confirm-yes"><i class="fa ${icon}"></i> ${TEXT.YES}</button>
                <button type="button" class="pi-confirm-no" id="pi-confirm-no">${TEXT.NO}</button>
            </div>
        </div>
    </div>`);
    $('body').append(confirmOverlay);

    confirmOverlay.on('click', '#pi-confirm-no', function() { confirmOverlay.remove(); });
    confirmOverlay.on('click', function(e) { if ($(e.target).hasClass('pi-confirm-overlay')) confirmOverlay.remove(); });

    confirmOverlay.on('click', '#pi-confirm-yes', function() {
        let $btn = $(this);
        $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i>`);

        let method = isSubmit
            ? "mobile_pos.mobile_pos.page.pos_purchase.api.submit_purchase_entry"
            : "mobile_pos.mobile_pos.page.pos_purchase.api.cancel_purchase_entry";

        frappe.call({
            method: method,
            args: { entry_name: entryName },
            callback: function(r) {
                confirmOverlay.remove();
                let result = r.message;
                if (result && result.success) {
                    frappe.show_alert({ message: result.message, indicator: 'green' }, 3);
                    loadRecentEntries();
                }
            },
            error: function(err) {
                confirmOverlay.remove();
                let msg = TEXT.ERROR;
                if (err && err._server_messages) {
                    try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch(e) {}
                }
                frappe.show_alert({ message: msg, indicator: 'red' }, 5);
            }
        });
    });
}

// Home button
$(wrapper).on('click', '#pi-home-btn', function() { window.location.href = '/main'; });

// Refresh button
$(wrapper).on('click', '#pi-refresh-btn', function() { window.location.reload(); });

};
