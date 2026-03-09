frappe.pages['items'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.items_page', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.items_page');
});

const TEXT = {
    PAGE_TITLE: "إدارة الأصناف",
    SEARCH: "ابحث بالاسم أو الكود...",
    ADD_ITEM: "إضافة صنف",
    EDIT_ITEM: "تعديل الصنف",
    ITEM_DETAILS: "تفاصيل الصنف",
    PRICES: "الأسعار",
    EDIT_PRICES: "إدارة الأسعار",
    ITEM_CODE: "كود الصنف",
    ITEM_NAME: "اسم الصنف",
    ITEM_GROUP: "مجموعة الصنف",
    STOCK_UOM: "وحدة القياس",
    DESCRIPTION: "الوصف",
    STANDARD_RATE: "سعر البيع الافتراضي",
    SELLING_PRICE: "بيع",
    BUYING_PRICE: "شراء",
    PRICE_LIST: "قائمة الأسعار",
    PRICE: "السعر",
    ADD_PRICE: "إضافة سعر",
    SELLING_PRICES: "أسعار البيع",
    BUYING_PRICES: "أسعار الشراء",
    SAVE: "حفظ",
    SAVING: "جارٍ الحفظ...",
    CANCEL: "إلغاء",
    CLOSE: "إغلاق",
    ENABLED: "مفعّل",
    DISABLED_LABEL: "معطّل",
    STATUS: "الحالة",
    NO_ITEMS: "لا توجد أصناف",
    NO_PRICES: "لا توجد أسعار",
    LOADING: "جاري التحميل...",
    SUCCESS_CREATED: name => `تم إنشاء الصنف ${name} بنجاح!`,
    SUCCESS_UPDATED: "تم التحديث بنجاح!",
    SUCCESS_PRICE: "تم حفظ السعر بنجاح!",
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_NAME: "يرجى إدخال اسم الصنف.",
    REQUIRED_GROUP: "يرجى اختيار مجموعة الصنف.",
    REQUIRED_UOM: "يرجى اختيار وحدة القياس.",
    REQUIRED_PRICE_LIST: "يرجى اختيار قائمة الأسعار.",
    SELECT_GROUP: "اختر المجموعة",
    SELECT_UOM: "اختر الوحدة",
    SELECT_PRICE_LIST: "اختر القائمة",
    BACK: "الرئيسية",
    LOAD_MORE: "تحميل المزيد",
    CURRENCY: "ر.س",
    TAB_INFO: "المعلومات",
    TAB_PRICES: "الأسعار",
    TAB_SETTINGS: "الإعدادات",
    ITEMS_COUNT: count => `${count} صنف`,
    NO_DESCRIPTION: "لا يوجد وصف",
    DELETE_PRICE: "حذف",
    CONFIRM_DELETE_PRICE: "هل أنت متأكد من حذف هذا السعر؟"
};

let context = null;
let allItems = [];
let searchTimeout = null;

$(wrapper).html(`
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<div class="items-page" dir="rtl">
    <div class="items-header">
        <div class="items-header-inner">
            <h1 class="items-title"><i class="fa fa-cubes"></i> ${TEXT.PAGE_TITLE}</h1>
            <div class="items-header-actions">
                <button type="button" id="items-add-btn" class="items-header-action-btn items-add-action-btn" title="${TEXT.ADD_ITEM}">
                    <i class="fa fa-plus"></i>
                </button>
                <button type="button" id="items-refresh-btn" class="items-header-action-btn items-refresh-action-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="items-home-btn" class="items-header-action-btn items-home-action-btn" title="الرئيسية"><i class="fa fa-home"></i> ${TEXT.BACK}</button>
            </div>
        </div>
        <div class="items-search-wrap">
            <i class="fa fa-search items-search-icon"></i>
            <input type="text" id="items-search" class="items-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
        </div>
        <div id="items-count" class="items-count hidden"></div>
    </div>
    <div class="items-body">
        <div id="items-loading" class="items-loading">
            <div class="items-spinner"></div>
            <span>${TEXT.LOADING}</span>
        </div>
        <div id="items-grid" class="items-grid"></div>
        <div id="items-empty" class="items-empty hidden">
            <i class="fa fa-inbox"></i>
            <p>${TEXT.NO_ITEMS}</p>
        </div>
        <div id="items-load-more" class="items-load-more hidden">
            <button type="button" id="items-load-more-btn" class="items-load-more-btn">
                <i class="fa fa-arrow-down"></i> ${TEXT.LOAD_MORE}
            </button>
        </div>
    </div>
</div>
<style>
.items-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}
.items-header{background:linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%);padding:20px 16px 16px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(102,126,234,0.35);}
.items-header-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:14px;margin-bottom:14px;}
.items-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
.items-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.items-header-action-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:0.95em;font-weight:700;border:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;white-space:nowrap;font-family:inherit;position:relative;overflow:hidden;color:#fff;}
.items-home-action-btn{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 16px rgba(16,185,129,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:100px;}
.items-home-action-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,185,129,0.5),inset 0 1px 1px rgba(255,255,255,0.4);}
.items-home-action-btn:active{transform:translateY(0);}
.items-refresh-action-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 4px 16px rgba(59,130,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.items-refresh-action-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(59,130,246,0.5);}
.items-refresh-action-btn:active{transform:scale(0.95);}
.items-add-action-btn{background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 4px 16px rgba(245,158,11,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.items-add-action-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(245,158,11,0.5);}
.items-add-action-btn:active{transform:scale(0.95);}
.items-search-wrap{max-width:900px;margin:0 auto;position:relative;}
.items-search{width:100%;padding:12px 16px 12px 40px;border:2px solid rgba(255,255,255,0.3);border-radius:14px;font-size:1em;font-family:inherit;background:rgba(255,255,255,0.2);color:#fff;outline:none;text-align:right;transition:all 0.2s;}
.items-search::placeholder{color:rgba(255,255,255,0.7);}
.items-search:focus{background:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.5);}
.items-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.6);font-size:1.1em;}
.items-count{max-width:900px;margin:8px auto 0;font-size:0.85em;font-weight:600;color:rgba(255,255,255,0.8);text-align:center;}
.items-body{max-width:900px;margin:0 auto;padding:20px 16px;}
.items-grid{display:flex;flex-direction:column;gap:10px;}
.items-loading{display:flex;flex-direction:column;align-items:center;gap:12px;padding:60px 20px;color:#64748b;font-weight:600;}
.items-spinner{width:40px;height:40px;border:4px solid #e2e8f0;border-top:4px solid #f59e0b;border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.items-empty{text-align:center;padding:60px 20px;color:#94a3b8;}
.items-empty i{font-size:3em;margin-bottom:12px;display:block;}
.items-empty p{font-size:1.1em;font-weight:600;}

/* Item Row Card */
.item-row{background:#fff;border-radius:14px;padding:14px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 10px rgba(0,0,0,0.04);border:2px solid #e2e8f0;transition:all 0.2s;cursor:pointer;position:relative;}
.item-row:hover{border-color:#f59e0b;box-shadow:0 4px 16px rgba(245,158,11,0.12);transform:translateY(-1px);}
.item-row:active{transform:translateY(0);}
.item-row-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#f59e0b,#f97316);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.2em;flex-shrink:0;}
.item-row-info{flex:1;min-width:0;}
.item-row-name{font-size:1em;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;}
.item-row-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.item-row-group{font-size:0.78em;font-weight:600;color:#64748b;background:#f1f5f9;border-radius:6px;padding:2px 8px;}
.item-row-uom{font-size:0.78em;font-weight:600;color:#8b5cf6;background:#f5f3ff;border-radius:6px;padding:2px 8px;}
.item-row-prices{display:flex;gap:8px;flex-shrink:0;align-items:center;}
.item-row-price{text-align:center;min-width:65px;}
.item-row-price-label{font-size:0.7em;color:#94a3b8;font-weight:600;}
.item-row-price-val{font-size:0.95em;font-weight:800;}
.item-row-price-val.sell{color:#16a34a;}
.item-row-price-val.buy{color:#2563eb;}
.item-row-arrow{color:#cbd5e1;font-size:1em;flex-shrink:0;}
.item-disabled-row{opacity:0.5;}
.item-disabled-dot{width:8px;height:8px;background:#ef4444;border-radius:50%;flex-shrink:0;}

/* Modal Overlay */
.items-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:flex-start;justify-content:center;padding:20px 16px;overflow-y:auto;backdrop-filter:blur(4px);}
.items-modal{background:#fff;border-radius:22px;max-width:520px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.25);position:relative;overflow:hidden;animation:modalIn 0.25s ease-out;}
@keyframes modalIn{0%{opacity:0;transform:translateY(20px) scale(0.97)}100%{opacity:1;transform:translateY(0) scale(1)}}

/* Modal Header */
.items-modal-header{background:linear-gradient(135deg,#f59e0b,#f97316);padding:20px 24px;color:#fff;display:flex;align-items:center;gap:12px;}
.items-modal-header.blue{background:linear-gradient(135deg,#3b82f6,#2563eb);}
.items-modal-header.green{background:linear-gradient(135deg,#10b981,#059669);}
.items-modal-header-icon{width:42px;height:42px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2em;}
.items-modal-header-text{flex:1;}
.items-modal-header-title{font-size:1.15em;font-weight:800;margin:0;}
.items-modal-header-sub{font-size:0.82em;font-weight:600;opacity:0.85;margin-top:2px;}
.items-modal-close{background:rgba(255,255,255,0.15);border:none;color:#fff;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.1em;transition:background 0.2s;}
.items-modal-close:hover{background:rgba(255,255,255,0.3);}

/* Modal Body */
.items-modal-body{padding:24px 24px 20px;}

/* Tabs */
.items-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:12px;padding:4px;margin-bottom:20px;}
.items-tab{flex:1;padding:10px 12px;border:none;background:transparent;border-radius:10px;font-family:inherit;font-size:0.9em;font-weight:700;color:#64748b;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
.items-tab.active{background:#fff;color:#0f172a;box-shadow:0 2px 8px rgba(0,0,0,0.08);}
.items-tab:hover:not(.active){color:#0f172a;}
.items-tab-content{display:none;}
.items-tab-content.active{display:block;}

/* Form Fields */
.items-field{margin-bottom:16px;}
.items-field-label{display:block;font-weight:700;color:#334155;margin-bottom:6px;font-size:0.88em;}
.items-field-input{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;background:#f8fafc;outline:none;text-align:right;transition:border-color 0.2s,box-shadow 0.2s;}
.items-field-input:focus{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.12);background:#fff;}
.items-field-input:disabled{opacity:0.6;cursor:not-allowed;}
.items-field-select-btn{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;background:#f8fafc;font-family:inherit;font-size:1em;font-weight:600;color:#64748b;cursor:pointer;display:flex;align-items:center;gap:8px;text-align:right;transition:all 0.2s;}
.items-field-select-btn:hover{border-color:#f59e0b;}
.items-field-select-btn.selected{border-color:#f59e0b;color:#0f172a;background:#fffbeb;}
.items-field-select-btn i.fa-chevron-down{margin-right:auto;}

/* Info Display Row */
.items-info-row{display:flex;align-items:center;padding:12px 14px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:10px;}
.items-info-label{font-weight:700;color:#64748b;font-size:0.85em;min-width:100px;}
.items-info-value{flex:1;font-weight:700;color:#0f172a;font-size:0.95em;text-align:left;}

/* Toggle Switch */
.items-toggle{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#f8fafc;border-radius:12px;border:2px solid #e2e8f0;cursor:pointer;transition:all 0.2s;}
.items-toggle:hover{border-color:#f59e0b;}
.items-toggle input{display:none;}
.items-toggle-switch{width:44px;height:24px;background:#cbd5e1;border-radius:12px;position:relative;transition:background 0.2s;}
.items-toggle-switch::after{content:'';position:absolute;top:3px;right:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform 0.2s;box-shadow:0 2px 4px rgba(0,0,0,0.15);}
.items-toggle input:checked ~ .items-toggle-switch{background:#ef4444;}
.items-toggle input:checked ~ .items-toggle-switch::after{transform:translateX(-20px);}
.items-toggle-label{font-weight:700;color:#334155;font-size:0.95em;}

/* Submit Button */
.items-modal-submit{width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-family:inherit;font-size:1.05em;font-weight:800;cursor:pointer;transition:all 0.2s;box-shadow:0 6px 20px rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;gap:10px;margin-top:8px;}
.items-modal-submit:hover{box-shadow:0 8px 28px rgba(245,158,11,0.4);transform:translateY(-2px);}
.items-modal-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.items-modal-submit.blue{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 6px 20px rgba(37,99,235,0.3);}
.items-modal-submit.blue:hover{box-shadow:0 8px 28px rgba(37,99,235,0.4);}
.items-modal-submit.green{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 6px 20px rgba(16,185,129,0.3);}
.items-modal-submit.green:hover{box-shadow:0 8px 28px rgba(16,185,129,0.4);}

/* Price Section */
.price-section{margin-bottom:16px;}
.price-section-title{font-weight:800;color:#0f172a;font-size:0.95em;margin:0 0 10px;display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;}
.price-section-title .sell-dot{width:10px;height:10px;background:#16a34a;border-radius:50%;}
.price-section-title .buy-dot{width:10px;height:10px;background:#2563eb;border-radius:50%;}
.price-row{display:flex;flex-direction:column;gap:8px;margin-bottom:8px;background:#f8fafc;border-radius:10px;padding:10px 12px;border:1px solid #e2e8f0;transition:border-color 0.2s;}
.price-row:hover{border-color:#f59e0b;}
.price-row-list{font-weight:700;color:#334155;font-size:0.92em;}
.price-row-controls{display:flex;flex-direction:column;gap:8px;}
.price-row-inputs{display:flex;align-items:center;gap:6px;}
.price-row-input{flex:1;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:1.15em;font-family:inherit;text-align:center;font-weight:700;outline:none;background:#fff;transition:border-color 0.2s;min-width:0;}
.price-row-input:focus{border-color:#f59e0b;}
.price-row-actions{display:flex;align-items:center;gap:8px;}
.price-row-save{flex:1;background:#10b981;color:#fff;border:none;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer;font-size:0.88em;transition:all 0.2s;font-family:inherit;white-space:nowrap;}
.price-row-save:hover{background:#059669;}
.price-row-delete{flex:1;background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer;font-size:0.88em;transition:all 0.2s;font-family:inherit;}
.price-row-delete:hover{background:#fecaca;color:#dc2626;}
.price-empty{text-align:center;padding:20px;color:#94a3b8;font-size:0.9em;font-weight:600;background:#f8fafc;border-radius:10px;border:2px dashed #e2e8f0;}
.price-add-row{display:flex;flex-direction:column;gap:8px;margin-top:10px;padding:12px;background:#fffbeb;border-radius:12px;border:2px dashed #f59e0b;}
.price-add-controls{display:flex;align-items:center;gap:6px;}
.price-add-input{flex:1;padding:10px;border:2px solid #e2e8f0;border-radius:10px;font-size:0.95em;font-family:inherit;text-align:center;font-weight:700;outline:none;background:#fff;min-width:0;}
.price-add-input:focus{border-color:#f59e0b;}
.price-add-btn{background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;border:none;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;font-size:0.85em;transition:all 0.2s;font-family:inherit;white-space:nowrap;}
.price-add-btn:hover{box-shadow:0 4px 12px rgba(245,158,11,0.3);}

.items-load-more{text-align:center;margin-top:20px;}
.items-load-more-btn{background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:12px 28px;font-family:inherit;font-size:1em;font-weight:700;color:#64748b;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center;gap:8px;}
.items-load-more-btn:hover{border-color:#f59e0b;color:#f59e0b;}

/* Popup Selector */
.items-popup-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:400;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;backdrop-filter:blur(2px);}
.items-popup{background:#fff;border-radius:20px;padding:24px 20px;max-width:440px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.2);max-height:80vh;display:flex;flex-direction:column;animation:modalIn 0.2s ease-out;}
.items-popup-title{font-size:1.1em;font-weight:800;color:#1e293b;margin-bottom:14px;text-align:center;}
.items-popup-search{width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;background:#f8fafc;outline:none;text-align:right;margin-bottom:12px;transition:border-color 0.2s;}
.items-popup-search:focus{border-color:#f59e0b;background:#fff;}
.items-popup-list{overflow-y:auto;flex:1;max-height:55vh;}
.items-popup-item{padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;background:#f8fafc;font-weight:600;color:#1e293b;}
.items-popup-item:hover{border-color:#f59e0b;background:#fffbeb;transform:translateY(-1px);}
.items-popup-empty{text-align:center;padding:30px;color:#94a3b8;font-size:0.95em;}

/* Status Badge */
.item-status-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:0.78em;font-weight:700;}
.item-status-badge.active{background:#dcfce7;color:#16a34a;}
.item-status-badge.disabled{background:#fee2e2;color:#ef4444;}

/* Custom Confirm Popup */
.items-confirm-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);animation:modalIn 0.2s ease-out;}
.items-confirm-box{background:#fff;border-radius:20px;max-width:380px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.25);overflow:hidden;animation:modalIn 0.25s ease-out;}
.items-confirm-icon{text-align:center;padding:28px 24px 12px;}
.items-confirm-icon i{font-size:2.5em;width:64px;height:64px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;}
.items-confirm-icon.warn i{color:#f59e0b;background:#fffbeb;}
.items-confirm-icon.danger i{color:#ef4444;background:#fee2e2;}
.items-confirm-icon.success i{color:#10b981;background:#dcfce7;}
.items-confirm-icon.info i{color:#3b82f6;background:#dbeafe;}
.items-confirm-msg{text-align:center;padding:0 24px 20px;font-size:1.05em;font-weight:700;color:#1e293b;line-height:1.6;}
.items-confirm-actions{display:flex;gap:10px;padding:0 24px 24px;justify-content:center;}
.items-confirm-btn{flex:1;padding:12px 16px;border:none;border-radius:12px;font-family:inherit;font-size:0.95em;font-weight:700;cursor:pointer;transition:all 0.2s;}
.items-confirm-btn.cancel{background:#f1f5f9;color:#64748b;}
.items-confirm-btn.cancel:hover{background:#e2e8f0;color:#334155;}
.items-confirm-btn.ok{color:#fff;}
.items-confirm-btn.ok.danger{background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 4px 14px rgba(239,68,68,0.3);}
.items-confirm-btn.ok.danger:hover{box-shadow:0 6px 20px rgba(239,68,68,0.4);transform:translateY(-1px);}
.items-confirm-btn.ok.warn{background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 4px 14px rgba(245,158,11,0.3);}
.items-confirm-btn.ok.warn:hover{box-shadow:0 6px 20px rgba(245,158,11,0.4);transform:translateY(-1px);}
.items-confirm-btn.ok.primary{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 4px 14px rgba(59,130,246,0.3);}
.items-confirm-btn.ok.primary:hover{box-shadow:0 6px 20px rgba(59,130,246,0.4);transform:translateY(-1px);}

/* Custom Toast */
.items-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:600;padding:14px 24px;border-radius:14px;font-family:'Cairo','Tajawal',sans-serif;font-size:0.95em;font-weight:700;color:#fff;display:flex;align-items:center;gap:10px;box-shadow:0 8px 30px rgba(0,0,0,0.2);animation:toastIn 0.3s ease-out;max-width:90%;text-align:center;}
.items-toast.success{background:linear-gradient(135deg,#10b981,#059669);}
.items-toast.error{background:linear-gradient(135deg,#ef4444,#dc2626);}
.items-toast.warn{background:linear-gradient(135deg,#f59e0b,#f97316);}
.items-toast.info{background:linear-gradient(135deg,#3b82f6,#2563eb);}
@keyframes toastIn{0%{opacity:0;transform:translateX(-50%) translateY(-20px)}100%{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes toastOut{0%{opacity:1;transform:translateX(-50%) translateY(0)}100%{opacity:0;transform:translateX(-50%) translateY(-20px)}}

.hidden{display:none!important;}
@media(max-width:480px){
    .items-header-inner{flex-wrap:wrap;}
    .items-title{font-size:1.1em;}
    .items-add-btn{font-size:0.85em;padding:8px 14px;}
    .item-row{padding:12px 14px;gap:10px;}
    .item-row-prices{flex-direction:column;gap:2px;}
    .item-row-price{min-width:auto;display:flex;gap:4px;align-items:center;}
    .item-row-price-label{display:none;}
    .price-add-btn{font-size:0.8em;padding:8px 12px;}
    .items-tabs{font-size:0.82em;}
}
</style>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}

function formatPrice(val) {
    if (val === null || val === undefined) return "-";
    return parseFloat(val).toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(message, type) {
    $('.items-toast').remove();
    type = type || 'info';
    let iconMap = {success:'fa-check-circle',error:'fa-times-circle',warn:'fa-exclamation-triangle',info:'fa-info-circle'};
    let toast = $(`<div class="items-toast ${type}"><i class="fa ${iconMap[type] || iconMap.info}"></i> ${message}</div>`);
    $('body').append(toast);
    setTimeout(() => { toast.css('animation','toastOut 0.3s ease-in forwards'); setTimeout(() => toast.remove(), 300); }, 3000);
}

function showConfirm(message, opts) {
    opts = opts || {};
    let type = opts.type || 'danger';
    let iconMap = {danger:'fa-trash',warn:'fa-exclamation-triangle',info:'fa-question-circle'};
    let okText = opts.okText || 'نعم';
    let cancelText = opts.cancelText || 'إلغاء';
    return new Promise(function(resolve) {
        let overlay = $(`<div class="items-confirm-overlay">
            <div class="items-confirm-box">
                <div class="items-confirm-icon ${type}"><i class="fa ${iconMap[type] || iconMap.danger}"></i></div>
                <div class="items-confirm-msg">${message}</div>
                <div class="items-confirm-actions">
                    <button type="button" class="items-confirm-btn ok ${type}">${okText}</button>
                    <button type="button" class="items-confirm-btn cancel">${cancelText}</button>
                </div>
            </div>
        </div>`);
        $('body').append(overlay);
        overlay.on('click', '.items-confirm-btn.ok', function() { overlay.remove(); resolve(true); });
        overlay.on('click', '.items-confirm-btn.cancel', function() { overlay.remove(); resolve(false); });
        overlay.on('click', function(e) { if ($(e.target).hasClass('items-confirm-overlay')) { overlay.remove(); resolve(false); } });
    });
}

function renderItems(items) {
    if (!items.length) {
        $('#items-grid').html('');
        $('#items-empty').removeClass('hidden');
        return;
    }
    $('#items-empty').addClass('hidden');
    let html = items.map(item => {
        let disabledClass = item.disabled ? ' item-disabled-row' : '';
        let sellPrice = formatPrice(item.selling_price);
        let buyPrice = formatPrice(item.buying_price);
        return `
        <div class="item-row${disabledClass}" data-item="${escapeHtml(item.name)}">
            <div class="item-row-icon"><i class="fa fa-cube"></i></div>
            <div class="item-row-info">
                <div class="item-row-name">${escapeHtml(item.item_name || item.item_code)}</div>
                <div class="item-row-meta">
                    <span class="item-row-group"><i class="fa fa-folder-o"></i> ${escapeHtml(item.item_group || '-')}</span>
                    <span class="item-row-uom"><i class="fa fa-balance-scale"></i> ${escapeHtml(item.stock_uom || '-')}</span>
                    ${item.disabled ? '<span class="item-disabled-dot"></span>' : ''}
                </div>
            </div>
            <div class="item-row-prices">
                <div class="item-row-price">
                    <div class="item-row-price-label">${TEXT.SELLING_PRICE}</div>
                    <div class="item-row-price-val sell">${sellPrice}</div>
                </div>
                <div class="item-row-price">
                    <div class="item-row-price-label">${TEXT.BUYING_PRICE}</div>
                    <div class="item-row-price-val buy">${buyPrice}</div>
                </div>
            </div>
            <div class="item-row-arrow"><i class="fa fa-chevron-left"></i></div>
        </div>`;
    }).join('');
    $('#items-grid').html(html);
}

function loadItems(search) {
    $('#items-loading').removeClass('hidden');
    $('#items-grid').html('');
    $('#items-empty').addClass('hidden');
    $('#items-count').addClass('hidden');
    frappe.call({
        method: "mobile_pos.mobile_pos.page.items.api.get_items_context",
        args: { search: search || "", limit: 100, offset: 0 },
        callback: function(r) {
            context = r.message;
            allItems = context.items || [];
            renderItems(allItems);
            $('#items-loading').addClass('hidden');
            $('#items-count').text(TEXT.ITEMS_COUNT(context.total_count || 0)).removeClass('hidden');
            if (allItems.length < context.total_count) {
                $('#items-load-more').removeClass('hidden');
            } else {
                $('#items-load-more').addClass('hidden');
            }
        },
        error: function() {
            $('#items-loading').addClass('hidden');
            $('#items-empty').removeClass('hidden');
        }
    });
}

// Initial load
loadItems('');

// Search
$(wrapper).on('input', '#items-search', function() {
    let val = $(this).val().trim();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadItems(val), 350);
});

// ========== POPUP SELECTOR ==========
function showPopupSelector(title, items, callback) {
    let popup = $(`<div class="items-popup-overlay">
        <div class="items-popup">
            <div class="items-popup-title">${title}</div>
            <input type="text" class="items-popup-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
            <div class="items-popup-list"></div>
        </div>
    </div>`);

    function renderList(filtered) {
        if (!filtered.length) {
            popup.find('.items-popup-list').html(`<div class="items-popup-empty">لا توجد نتائج</div>`);
            return;
        }
        popup.find('.items-popup-list').html(
            filtered.slice(0, 50).map(v => `<div class="items-popup-item" data-value="${escapeHtml(v)}">${escapeHtml(v)}</div>`).join('')
        );
    }
    renderList(items);
    $('body').append(popup);
    popup.find('.items-popup-search').focus();

    popup.on('input', '.items-popup-search', function() {
        let q = $(this).val().trim().toLowerCase();
        renderList(q ? items.filter(v => v.toLowerCase().includes(q)) : items);
    });
    popup.on('click', '.items-popup-item', function() {
        callback($(this).data('value'));
        popup.remove();
    });
    popup.on('click', function(e) {
        if ($(e.target).hasClass('items-popup-overlay')) popup.remove();
    });
}

// ========== ADD ITEM MODAL ==========
$(wrapper).on('click', '#items-add-btn', function() {
    if (!context) return;
    let selectedGroup = "";
    let selectedUom = "";

    let modal = $(`<div class="items-modal-overlay">
        <div class="items-modal">
            <div class="items-modal-header">
                <div class="items-modal-header-icon"><i class="fa fa-plus"></i></div>
                <div class="items-modal-header-text">
                    <div class="items-modal-header-title">${TEXT.ADD_ITEM}</div>
                    <div class="items-modal-header-sub">إضافة صنف جديد للمخزون</div>
                </div>
                <button type="button" class="items-modal-close"><i class="fa fa-times"></i></button>
            </div>
            <div class="items-modal-body">
                <div class="items-field">
                    <label class="items-field-label"><i class="fa fa-tag"></i> ${TEXT.ITEM_NAME}</label>
                    <input type="text" id="add-item-name" class="items-field-input" autocomplete="off" placeholder="أدخل اسم الصنف">
                </div>
                <div class="items-field">
                    <label class="items-field-label"><i class="fa fa-folder-o"></i> ${TEXT.ITEM_GROUP}</label>
                    <button type="button" id="add-item-group-btn" class="items-field-select-btn">
                        <i class="fa fa-folder"></i>
                        <span id="add-item-group-label">${TEXT.SELECT_GROUP}</span>
                        <i class="fa fa-chevron-down"></i>
                    </button>
                </div>
                <div class="items-field">
                    <label class="items-field-label"><i class="fa fa-balance-scale"></i> ${TEXT.STOCK_UOM}</label>
                    <button type="button" id="add-item-uom-btn" class="items-field-select-btn">
                        <i class="fa fa-balance-scale"></i>
                        <span id="add-item-uom-label">${TEXT.SELECT_UOM}</span>
                        <i class="fa fa-chevron-down"></i>
                    </button>
                </div>
                <div class="items-field">
                    <label class="items-field-label"><i class="fa fa-file-text-o"></i> ${TEXT.DESCRIPTION}</label>
                    <textarea id="add-item-desc" class="items-field-input" rows="2" style="resize:none;" placeholder="وصف اختياري"></textarea>
                </div>
                <div class="items-field">
                    <label class="items-field-label"><i class="fa fa-money"></i> ${TEXT.STANDARD_RATE}</label>
                    <input type="text" id="add-item-rate" class="items-field-input" inputmode="decimal" placeholder="0.00" autocomplete="off" style="text-align:center;font-weight:700;font-size:1.2em;">
                </div>
                <div class="items-field">
                    <label class="items-field-label"><i class="fa fa-shopping-cart"></i> سعر الشراء</label>
                    <input type="text" id="add-item-buy-rate" class="items-field-input" inputmode="decimal" placeholder="0.00" autocomplete="off" style="text-align:center;font-weight:700;font-size:1.2em;">
                </div>
                <button type="button" id="add-item-submit" class="items-modal-submit">
                    <i class="fa fa-check-circle"></i> ${TEXT.SAVE}
                </button>
            </div>
        </div>
    </div>`);
    $('body').append(modal);

    modal.on('click', '.items-modal-close', function() { modal.remove(); });
    modal.on('click', function(e) { if ($(e.target).hasClass('items-modal-overlay')) modal.remove(); });

    modal.on('click', '#add-item-group-btn', function() {
        showPopupSelector(TEXT.SELECT_GROUP, context.item_groups, function(val) {
            selectedGroup = val;
            modal.find('#add-item-group-label').text(val);
            modal.find('#add-item-group-btn').addClass('selected');
        });
    });

    modal.on('click', '#add-item-uom-btn', function() {
        showPopupSelector(TEXT.SELECT_UOM, context.uoms, function(val) {
            selectedUom = val;
            modal.find('#add-item-uom-label').text(val);
            modal.find('#add-item-uom-btn').addClass('selected');
        });
    });

    modal.on('input', '#add-item-rate, #add-item-buy-rate', function() {
        let val = convertArabicToEnglishNumbers($(this).val());
        if (val !== $(this).val()) $(this).val(val);
    });

    modal.on('click', '#add-item-submit', async function() {
        let name = modal.find('#add-item-name').val().trim();
        if (!name) return showToast(TEXT.REQUIRED_NAME, 'error');
        let code = name;
        if (!selectedGroup) return showToast(TEXT.REQUIRED_GROUP, 'error');
        if (!selectedUom) return showToast(TEXT.REQUIRED_UOM, 'error');

        let rate = parseFloat(convertArabicToEnglishNumbers(modal.find('#add-item-rate').val())) || 0;
        let buyRate = parseFloat(convertArabicToEnglishNumbers(modal.find('#add-item-buy-rate').val())) || 0;
        let $btn = $(this);
        $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);

        try {
            let r = await frappe.call({
                method: "mobile_pos.mobile_pos.page.items.api.create_item",
                type: "POST",
                args: { data: JSON.stringify({
                    item_code: code, item_name: name, item_group: selectedGroup,
                    stock_uom: selectedUom, description: modal.find('#add-item-desc').val().trim(),
                    standard_rate: rate, buying_rate: buyRate
                })}
            });
            showToast(TEXT.SUCCESS_CREATED(r.message.item_name), 'success');
            modal.remove();
            loadItems($('#items-search').val().trim());
        } catch (err) {
            let msg = err.message || TEXT.ERROR;
            if (err._server_messages) {
                try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch(_) {}
            }
            showToast(msg, 'error');
            $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SAVE}`);
        }
    });
});

// ========== ITEM DETAIL / EDIT MODAL (click on item row) ==========
$(wrapper).on('click', '.item-row', function() {
    if (!context) return;
    let itemCode = $(this).data('item');
    let item = allItems.find(i => i.name === itemCode);
    if (!item) return;

    let selectedGroup = item.item_group || "";
    let selectedUom = item.stock_uom || "";
    let isDisabled = item.disabled ? true : false;
    let activeTab = 'info';

    let statusClass = isDisabled ? 'disabled' : 'active';
    let statusText = isDisabled ? TEXT.DISABLED_LABEL : TEXT.ENABLED;

    let modal = $(`<div class="items-modal-overlay">
        <div class="items-modal" style="max-width:560px;">
            <div class="items-modal-header blue">
                <div class="items-modal-header-icon"><i class="fa fa-cube"></i></div>
                <div class="items-modal-header-text">
                    <div class="items-modal-header-title">${escapeHtml(item.item_name || item.item_code)}</div>
                    <div class="items-modal-header-sub"><span class="item-status-badge ${statusClass}">${statusText}</span> &nbsp; ${escapeHtml(item.item_group || '')}</div>
                </div>
                <button type="button" class="items-modal-close"><i class="fa fa-times"></i></button>
            </div>
            <div class="items-modal-body">
                <div class="items-tabs">
                    <button type="button" class="items-tab active" data-tab="info"><i class="fa fa-info-circle"></i> ${TEXT.TAB_INFO}</button>
                    <button type="button" class="items-tab" data-tab="prices"><i class="fa fa-tags"></i> ${TEXT.TAB_PRICES}</button>
                    <button type="button" class="items-tab" data-tab="settings"><i class="fa fa-cog"></i> ${TEXT.TAB_SETTINGS}</button>
                </div>

                <!-- INFO TAB -->
                <div class="items-tab-content active" data-tab="info">
                    <div class="items-field">
                        <label class="items-field-label"><i class="fa fa-tag"></i> ${TEXT.ITEM_NAME}</label>
                        <input type="text" id="edit-item-name" class="items-field-input" value="${escapeHtml(item.item_name || '')}" autocomplete="off">
                    </div>
                    <div class="items-field">
                        <label class="items-field-label"><i class="fa fa-folder-o"></i> ${TEXT.ITEM_GROUP}</label>
                        <button type="button" id="edit-item-group-btn" class="items-field-select-btn selected">
                            <i class="fa fa-folder"></i>
                            <span id="edit-item-group-label">${escapeHtml(selectedGroup || TEXT.SELECT_GROUP)}</span>
                            <i class="fa fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="items-field">
                        <label class="items-field-label"><i class="fa fa-balance-scale"></i> ${TEXT.STOCK_UOM}</label>
                        <button type="button" id="edit-item-uom-btn" class="items-field-select-btn selected">
                            <i class="fa fa-balance-scale"></i>
                            <span id="edit-item-uom-label">${escapeHtml(selectedUom || TEXT.SELECT_UOM)}</span>
                            <i class="fa fa-chevron-down"></i>
                        </button>
                    </div>
                    <div class="items-field">
                        <label class="items-field-label"><i class="fa fa-file-text-o"></i> ${TEXT.DESCRIPTION}</label>
                        <textarea id="edit-item-desc" class="items-field-input" rows="2" style="resize:none;">${escapeHtml(item.description || '')}</textarea>
                    </div>
                    <button type="button" id="edit-item-submit" class="items-modal-submit blue">
                        <i class="fa fa-check-circle"></i> ${TEXT.SAVE}
                    </button>
                </div>

                <!-- PRICES TAB -->
                <div class="items-tab-content" data-tab="prices">
                    <div id="prices-content" style="text-align:center;padding:20px;color:#64748b;">
                        <div class="items-spinner" style="margin:0 auto 12px;"></div>
                        ${TEXT.LOADING}
                    </div>
                </div>

                <!-- SETTINGS TAB -->
                <div class="items-tab-content" data-tab="settings">
                    <div class="items-info-row">
                        <div class="items-info-label">${TEXT.ITEM_CODE}</div>
                        <div class="items-info-value">${escapeHtml(item.item_code)}</div>
                    </div>
                    <div class="items-info-row">
                        <div class="items-info-label">${TEXT.STATUS}</div>
                        <div class="items-info-value"><span class="item-status-badge ${statusClass}">${statusText}</span></div>
                    </div>
                    <div class="items-field" style="margin-top:16px;">
                        <label class="items-toggle" id="edit-item-disabled-toggle">
                            <input type="checkbox" id="edit-item-disabled" ${isDisabled ? 'checked' : ''}>
                            <div class="items-toggle-switch"></div>
                            <span class="items-toggle-label">${TEXT.DISABLED_LABEL}</span>
                        </label>
                    </div>
                    <button type="button" id="settings-save-btn" class="items-modal-submit blue" style="margin-top:16px;">
                        <i class="fa fa-check-circle"></i> ${TEXT.SAVE}
                    </button>
                </div>
            </div>
        </div>
    </div>`);
    $('body').append(modal);

    // Tab switching
    modal.on('click', '.items-tab', function() {
        let tab = $(this).data('tab');
        if (tab === activeTab) return;
        activeTab = tab;
        modal.find('.items-tab').removeClass('active');
        $(this).addClass('active');
        modal.find('.items-tab-content').removeClass('active');
        modal.find(`.items-tab-content[data-tab="${tab}"]`).addClass('active');

        // Load prices on first click
        if (tab === 'prices' && modal.find('#prices-content .items-spinner').length) {
            loadPricesForModal(modal, itemCode);
        }
    });

    modal.on('click', '.items-modal-close', function() { modal.remove(); });
    modal.on('click', function(e) { if ($(e.target).hasClass('items-modal-overlay')) modal.remove(); });

    // Edit group/uom
    modal.on('click', '#edit-item-group-btn', function() {
        showPopupSelector(TEXT.SELECT_GROUP, context.item_groups, function(val) {
            selectedGroup = val;
            modal.find('#edit-item-group-label').text(val);
        });
    });
    modal.on('click', '#edit-item-uom-btn', function() {
        showPopupSelector(TEXT.SELECT_UOM, context.uoms, function(val) {
            selectedUom = val;
            modal.find('#edit-item-uom-label').text(val);
        });
    });

    // Save info tab
    modal.on('click', '#edit-item-submit', async function() {
        let $btn = $(this);
        $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.items.api.update_item",
                type: "POST",
                args: { data: JSON.stringify({
                    item_code: item.name,
                    item_name: modal.find('#edit-item-name').val().trim(),
                    item_group: selectedGroup,
                    stock_uom: selectedUom,
                    description: modal.find('#edit-item-desc').val().trim(),
                    disabled: modal.find('#edit-item-disabled').is(':checked') ? 1 : 0
                })}
            });
            showToast(TEXT.SUCCESS_UPDATED, 'success');
            loadItems($('#items-search').val().trim());
            // Update modal header
            let newName = modal.find('#edit-item-name').val().trim();
            modal.find('.items-modal-header-title').text(newName || item.item_code);
            modal.find('.items-modal-header-sub').html(`<span class="item-status-badge ${modal.find('#edit-item-disabled').is(':checked') ? 'disabled' : 'active'}">${modal.find('#edit-item-disabled').is(':checked') ? TEXT.DISABLED_LABEL : TEXT.ENABLED}</span> &nbsp; ${escapeHtml(selectedGroup)}`);
            $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SAVE}`);
        } catch (err) {
            let msg = err.message || TEXT.ERROR;
            if (err._server_messages) {
                try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch(_) {}
            }
            showToast(msg, 'error');
            $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SAVE}`);
        }
    });

    // Save settings tab
    modal.on('click', '#settings-save-btn', async function() {
        let $btn = $(this);
        $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.items.api.update_item",
                type: "POST",
                args: { data: JSON.stringify({
                    item_code: item.name,
                    item_name: modal.find('#edit-item-name').val().trim() || item.item_name,
                    item_group: selectedGroup,
                    stock_uom: selectedUom,
                    description: modal.find('#edit-item-desc').val().trim(),
                    disabled: modal.find('#edit-item-disabled').is(':checked') ? 1 : 0
                })}
            });
            showToast(TEXT.SUCCESS_UPDATED, 'success');
            loadItems($('#items-search').val().trim());
            let newDisabled = modal.find('#edit-item-disabled').is(':checked');
            let sc = newDisabled ? 'disabled' : 'active';
            let st = newDisabled ? TEXT.DISABLED_LABEL : TEXT.ENABLED;
            modal.find('.items-modal-header-sub .item-status-badge').attr('class', `item-status-badge ${sc}`).text(st);
            modal.find('.items-info-row .item-status-badge').attr('class', `item-status-badge ${sc}`).text(st);
            $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SAVE}`);
        } catch (err) {
            let msg = err.message || TEXT.ERROR;
            if (err._server_messages) {
                try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch(_) {}
            }
            showToast(msg, 'error');
            $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SAVE}`);
        }
    });

    // Price actions (delegated)
    // UOM popup for existing price rows
    modal.on('click', '.price-uom-btn', function() {
        let $uomBtn = $(this);
        showPopupSelector(TEXT.SELECT_UOM, context.uoms, function(val) {
            $uomBtn.data('value', val);
            $uomBtn.find('.price-uom-label').text(val);
            $uomBtn.addClass('selected');
        });
    });

    // UOM popup for add price rows
    modal.on('click', '.price-uom-add-btn', function() {
        let $uomBtn = $(this);
        showPopupSelector(TEXT.SELECT_UOM, context.uoms, function(val) {
            $uomBtn.data('value', val);
            $uomBtn.find('.price-uom-add-label').text(val);
            $uomBtn.addClass('selected');
        });
    });

    modal.on('click', '.price-row-save', async function() {
        let priceName = $(this).data('name');
        let input = modal.find(`.price-row-input[data-name="${priceName}"]`);
        let val = parseFloat(convertArabicToEnglishNumbers(input.val())) || 0;
        let uomBtn = modal.find(`.price-uom-btn[data-name="${priceName}"]`);
        let uom = uomBtn.data('value') || '';
        let $btn = $(this);
        $btn.prop('disabled', true).text(TEXT.SAVING);
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.items.api.update_item_price",
                type: "POST",
                args: { data: JSON.stringify({ name: priceName, price_list_rate: val, uom: uom }) }
            });
            showToast(TEXT.SUCCESS_PRICE, 'success');
            $btn.prop('disabled', false).text(TEXT.SAVE);
            loadItems($('#items-search').val().trim());
        } catch (err) {
            showToast(err.message || TEXT.ERROR, 'error');
            $btn.prop('disabled', false).text(TEXT.SAVE);
        }
    });

    // Delete price
    modal.on('click', '.price-row-delete', async function() {
        let priceName = $(this).data('name');
        let confirmed = await showConfirm(TEXT.CONFIRM_DELETE_PRICE, {type:'danger', okText:TEXT.DELETE_PRICE, cancelText:TEXT.CANCEL});
        if (!confirmed) return;
        let $btn = $(this);
        $btn.prop('disabled', true);
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.items.api.delete_item_price",
                type: "POST",
                args: { name: priceName }
            });
            showToast(TEXT.SUCCESS_UPDATED, 'success');
            loadPricesForModal(modal, itemCode);
            loadItems($('#items-search').val().trim());
        } catch (err) {
            showToast(err.message || TEXT.ERROR, 'error');
            $btn.prop('disabled', false);
        }
    });

    // Price list popup selector
    modal.on('click', '.price-list-select-btn', function() {
        let $selectBtn = $(this);
        let type = $selectBtn.closest('.price-add-row').data('type');
        let lists = type === 'selling' ? context.selling_price_lists : context.buying_price_lists;
        let names = lists.map(pl => pl.name);
        showPopupSelector(TEXT.SELECT_PRICE_LIST, names, function(val) {
            $selectBtn.data('value', val);
            $selectBtn.find('.price-list-select-label').text(val);
            $selectBtn.addClass('selected');
        });
    });

    modal.on('click', '.price-add-btn', async function() {
        let row = $(this).closest('.price-add-row');
        let priceList = row.find('.price-list-select-btn').data('value');
        let uom = row.find('.price-uom-add-btn').data('value') || '';
        let val = parseFloat(convertArabicToEnglishNumbers(row.find('.price-add-input').val())) || 0;
        if (!priceList) return showToast(TEXT.REQUIRED_PRICE_LIST, 'error');

        let $btn = $(this);
        $btn.prop('disabled', true);
        try {
            await frappe.call({
                method: "mobile_pos.mobile_pos.page.items.api.create_item_price",
                type: "POST",
                args: { data: JSON.stringify({ item_code: itemCode, price_list: priceList, price_list_rate: val, uom: uom }) }
            });
            showToast(TEXT.SUCCESS_PRICE, 'success');
            loadPricesForModal(modal, itemCode);
            loadItems($('#items-search').val().trim());
        } catch (err) {
            let msg = err.message || TEXT.ERROR;
            if (err._server_messages) {
                try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch(_) {}
            }
            showToast(msg, 'error');
            $btn.prop('disabled', false);
        }
    });
});

// ========== LOAD PRICES INTO MODAL ==========
function loadPricesForModal(modal, itemCode) {
    modal.find('#prices-content').html(`<div style="text-align:center;padding:20px;color:#64748b;"><div class="items-spinner" style="margin:0 auto 12px;"></div>${TEXT.LOADING}</div>`);
    frappe.call({
        method: "mobile_pos.mobile_pos.page.items.api.get_item_prices",
        args: { item_code: itemCode },
        callback: function(r) {
            let data = r.message;
            let html = '';

            // Selling prices
            html += `<div class="price-section">
                <div class="price-section-title"><span class="sell-dot"></span> ${TEXT.SELLING_PRICES}</div>`;
            if (data.selling && data.selling.length) {
                data.selling.forEach(p => {
                    html += `<div class="price-row">
                        <div class="price-row-list">${escapeHtml(p.price_list)}</div>
                        <div class="price-row-controls">
                            <div class="price-row-inputs">
                                <button type="button" class="items-field-select-btn price-uom-btn" data-name="${escapeHtml(p.name)}" data-value="${escapeHtml(p.uom || '')}" style="min-width:70px;max-width:110px;padding:6px 8px;font-size:0.78em;">
                                    <i class="fa fa-balance-scale"></i>
                                    <span class="price-uom-label">${escapeHtml(p.uom || TEXT.SELECT_UOM)}</span>
                                </button>
                                <input type="text" class="price-row-input" value="${formatPrice(p.price_list_rate)}" data-name="${escapeHtml(p.name)}" inputmode="decimal">
                            </div>
                            <div class="price-row-actions">
                                <button type="button" class="price-row-save" data-name="${escapeHtml(p.name)}"><i class="fa fa-check"></i> ${TEXT.SAVE}</button>
                                <button type="button" class="price-row-delete" data-name="${escapeHtml(p.name)}" title="${TEXT.DELETE_PRICE}"><i class="fa fa-trash"></i> ${TEXT.DELETE_PRICE}</button>
                            </div>
                        </div>
                    </div>`;
                });
            } else {
                html += `<div class="price-empty"><i class="fa fa-tag" style="font-size:1.5em;display:block;margin-bottom:6px;"></i>${TEXT.NO_PRICES}</div>`;
            }
            if (context && context.selling_price_lists.length) {
                html += `<div class="price-add-row" data-type="selling">
                    <button type="button" class="items-field-select-btn price-list-select-btn" data-value="" style="width:100%;padding:10px 12px;font-size:0.88em;">
                        <i class="fa fa-list"></i>
                        <span class="price-list-select-label">${TEXT.SELECT_PRICE_LIST}</span>
                        <i class="fa fa-chevron-down"></i>
                    </button>
                    <div class="price-add-controls">
                        <button type="button" class="items-field-select-btn price-uom-add-btn" data-value="" style="min-width:70px;max-width:110px;padding:10px 8px;font-size:0.82em;">
                            <i class="fa fa-balance-scale"></i>
                            <span class="price-uom-add-label">${TEXT.SELECT_UOM}</span>
                        </button>
                        <input type="text" class="price-add-input" placeholder="0.00" inputmode="decimal">
                        <button type="button" class="price-add-btn"><i class="fa fa-plus"></i> ${TEXT.ADD_PRICE}</button>
                    </div>
                </div>`;
            }
            html += `</div>`;

            // Buying prices
            html += `<div class="price-section">
                <div class="price-section-title"><span class="buy-dot"></span> ${TEXT.BUYING_PRICES}</div>`;
            if (data.buying && data.buying.length) {
                data.buying.forEach(p => {
                    html += `<div class="price-row">
                        <div class="price-row-list">${escapeHtml(p.price_list)}</div>
                        <div class="price-row-controls">
                            <div class="price-row-inputs">
                                <button type="button" class="items-field-select-btn price-uom-btn" data-name="${escapeHtml(p.name)}" data-value="${escapeHtml(p.uom || '')}" style="min-width:70px;max-width:110px;padding:6px 8px;font-size:0.78em;">
                                    <i class="fa fa-balance-scale"></i>
                                    <span class="price-uom-label">${escapeHtml(p.uom || TEXT.SELECT_UOM)}</span>
                                </button>
                                <input type="text" class="price-row-input" value="${formatPrice(p.price_list_rate)}" data-name="${escapeHtml(p.name)}" inputmode="decimal">
                            </div>
                            <div class="price-row-actions">
                                <button type="button" class="price-row-save" data-name="${escapeHtml(p.name)}"><i class="fa fa-check"></i> ${TEXT.SAVE}</button>
                                <button type="button" class="price-row-delete" data-name="${escapeHtml(p.name)}" title="${TEXT.DELETE_PRICE}"><i class="fa fa-trash"></i> ${TEXT.DELETE_PRICE}</button>
                            </div>
                        </div>
                    </div>`;
                });
            } else {
                html += `<div class="price-empty"><i class="fa fa-tag" style="font-size:1.5em;display:block;margin-bottom:6px;"></i>${TEXT.NO_PRICES}</div>`;
            }
            if (context && context.buying_price_lists.length) {
                html += `<div class="price-add-row" data-type="buying">
                    <button type="button" class="items-field-select-btn price-list-select-btn" data-value="" style="width:100%;padding:10px 12px;font-size:0.88em;">
                        <i class="fa fa-list"></i>
                        <span class="price-list-select-label">${TEXT.SELECT_PRICE_LIST}</span>
                        <i class="fa fa-chevron-down"></i>
                    </button>
                    <div class="price-add-controls">
                        <button type="button" class="items-field-select-btn price-uom-add-btn" data-value="" style="min-width:70px;max-width:110px;padding:10px 8px;font-size:0.82em;">
                            <i class="fa fa-balance-scale"></i>
                            <span class="price-uom-add-label">${TEXT.SELECT_UOM}</span>
                        </button>
                        <input type="text" class="price-add-input" placeholder="0.00" inputmode="decimal">
                        <button type="button" class="price-add-btn"><i class="fa fa-plus"></i> ${TEXT.ADD_PRICE}</button>
                    </div>
                </div>`;
            }
            html += `</div>`;

            modal.find('#prices-content').html(html);
        }
    });
}

// ========== LOAD MORE ==========
$(wrapper).on('click', '#items-load-more-btn', function() {
    let currentCount = allItems.length;
    let search = $('#items-search').val().trim();
    let $btn = $(this);
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.LOADING}`);
    frappe.call({
        method: "mobile_pos.mobile_pos.page.items.api.get_items_context",
        args: { search: search, limit: 100, offset: currentCount },
        callback: function(r) {
            let newItems = r.message.items || [];
            allItems = allItems.concat(newItems);
            renderItems(allItems);
            $btn.prop('disabled', false).html(`<i class="fa fa-arrow-down"></i> ${TEXT.LOAD_MORE}`);
            if (allItems.length >= r.message.total_count) {
                $('#items-load-more').addClass('hidden');
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-arrow-down"></i> ${TEXT.LOAD_MORE}`);
        }
    });
});

// Home button
$(wrapper).on('click', '#items-home-btn', function() { window.location.href = '/main'; });

// Refresh button
$(wrapper).on('click', '#items-refresh-btn', function() { window.location.reload(); });

};
