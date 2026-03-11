frappe.pages['customers'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.customers_page', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.customers_page');
});

const TEXT = {
    PAGE_TITLE: "إدارة العملاء",
    SEARCH: "ابحث بالاسم أو الهاتف أو البريد...",
    ADD_CUSTOMER: "إضافة عميل",
    EDIT_CUSTOMER: "تعديل العميل",
    CUSTOMER_DETAILS: "تفاصيل العميل",
    CUSTOMER_NAME: "اسم العميل",
    CUSTOMER_GROUP: "مجموعة العميل",
    PHONE: "رقم الهاتف",
    EMAIL: "البريد الإلكتروني",
    COMPANY: "الشركة",
    POS_PROFILE: "ملف نقطة البيع",
    CONTACTS: "جهات الاتصال",
    ADDRESSES: "العناوين",
    ADD_CONTACT: "إضافة جهة اتصال",
    ADD_ADDRESS: "إضافة عنوان",
    FIRST_NAME: "الاسم الأول",
    LAST_NAME: "الاسم الأخير",
    MOBILE: "الهاتف",
    LANDLINE: "هاتف أرضي",
    ADDRESS_TITLE: "عنوان المكان",
    ADDRESS_TYPE: "نوع العنوان",
    ADDRESS_LINE1: "العنوان - سطر 1",
    ADDRESS_LINE2: "العنوان - سطر 2",
    CITY: "المدينة",
    STATE: "المنطقة",
    COUNTRY: "الدولة",
    PINCODE: "الرمز البريدي",
    SAVE: "حفظ",
    SAVING: "جارٍ الحفظ...",
    CANCEL: "إلغاء",
    CLOSE: "إغلاق",
    DELETE: "حذف",
    NO_CUSTOMERS: "لا يوجد عملاء",
    NO_CONTACTS: "لا توجد جهات اتصال",
    NO_ADDRESSES: "لا توجد عناوين",
    LOADING: "جاري التحميل...",
    SUCCESS_CREATED: name => `تم إنشاء العميل ${name} بنجاح!`,
    SUCCESS_UPDATED: "تم التحديث بنجاح!",
    SUCCESS_CONTACT: "تم حفظ جهة الاتصال بنجاح!",
    SUCCESS_ADDRESS: "تم حفظ العنوان بنجاح!",
    SUCCESS_DELETED: "تم الحذف بنجاح!",
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_NAME: "يرجى إدخال اسم العميل.",
    BACK: "الرئيسية",
    BILLING: "فوترة",
    SHIPPING: "شحن",
    OTHER: "أخرى",
    CONFIRM_DELETE: "هل أنت متأكد من الحذف؟",
    LOAD_MORE: "تحميل المزيد",
};

const API_BASE = "mobile_pos.mobile_pos.page.customers.api";
let allCustomers = [];
let totalCount = 0;
let currentOffset = 0;
const PAGE_SIZE = 50;
let isAdmin = false;
let customerGroups = [];
let searchTimeout = null;

$(wrapper).html(`
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style>
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font-family:"Cairo","Tajawal",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Kufi Arabic",sans-serif}

.cust-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}

.cust-header{background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 50%,#a855f7 100%);padding:20px 16px 16px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(14,165,233,0.35);}
.cust-header-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:14px;margin-bottom:14px;}
.cust-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
.cust-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.cust-header-action-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:0.95em;font-weight:700;border:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;white-space:nowrap;font-family:inherit;position:relative;overflow:hidden;color:#fff;}
.cust-home-action-btn{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 16px rgba(16,185,129,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:100px;}
.cust-home-action-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,185,129,0.5),inset 0 1px 1px rgba(255,255,255,0.4);}
.cust-home-action-btn:active{transform:translateY(0);}
.cust-refresh-action-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 4px 16px rgba(59,130,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.cust-refresh-action-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(59,130,246,0.5);}
.cust-refresh-action-btn:active{transform:scale(0.95);}
.cust-add-action-btn{background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 4px 16px rgba(245,158,11,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.cust-add-action-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(245,158,11,0.5);}
.cust-add-action-btn:active{transform:scale(0.95);}
.cust-search-wrap{max-width:900px;margin:0 auto;position:relative;}
.cust-search{width:100%;padding:12px 16px 12px 40px;border:2px solid rgba(255,255,255,0.3);border-radius:14px;font-size:1em;font-family:inherit;background:rgba(255,255,255,0.2);color:#fff;outline:none;text-align:right;transition:all 0.2s;}
.cust-search::placeholder{color:rgba(255,255,255,0.7);}
.cust-search:focus{background:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.5);}
.cust-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.6);font-size:1.1em;}
.cust-count{max-width:900px;margin:8px auto 0;font-size:0.85em;font-weight:600;color:rgba(255,255,255,0.8);text-align:center;}

.cust-btn{
    appearance:none;border:1px solid transparent;color:#fff;
    padding:10px 18px;border-radius:14px;cursor:pointer;font-weight:700;
    font-size:.95rem;font-family:inherit;transition:all .3s ease;
    display:flex;align-items:center;gap:8px;white-space:nowrap;
}
.cust-btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.12)}
.cust-btn:active{transform:translateY(0)}
.cust-btn:disabled{opacity:.5;cursor:not-allowed;transform:none !important}

.cust-btn-primary{background:linear-gradient(135deg,#0ea5e9,#38bdf8);box-shadow:0 4px 12px rgba(14,165,233,.25)}
.cust-btn-primary:hover{background:linear-gradient(135deg,#0284c7,#0ea5e9)}
.cust-btn-success{background:linear-gradient(135deg,#16a34a,#22c55e);box-shadow:0 4px 12px rgba(22,163,74,.25)}
.cust-btn-danger{background:linear-gradient(135deg,#ef4444,#f87171);box-shadow:0 4px 12px rgba(239,68,68,.25)}
.cust-btn-ghost{
    color:#475569;background:rgba(255,255,255,.9);border:1px solid rgba(203,213,225,.5);
}
.cust-btn-ghost:hover{background:#fff;border-color:#0ea5e9;color:#0ea5e9}
.cust-btn-sm{padding:7px 14px;font-size:.85rem;border-radius:10px}

.cust-body{max-width:900px;margin:0 auto;padding:20px 16px;}
.cust-grid{display:grid;grid-template-columns:1fr;gap:14px}

.cust-card{
    background:rgba(255,255,255,.9);backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.7);border-radius:18px;
    padding:18px 20px;cursor:pointer;
    box-shadow:0 4px 16px rgba(14,165,233,.08);
    transition:all .3s cubic-bezier(.4,0,.2,1);
    position:relative;overflow:hidden;
}
.cust-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(14,165,233,.15);border-color:rgba(56,189,248,.3)}
.cust-card::before{
    content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,#0ea5e9,#6366f1);
    opacity:0;transition:opacity .3s ease;
}
.cust-card:hover::before{opacity:1}

.cust-card-header{display:flex;align-items:center;gap:14px;margin-bottom:10px}
.cust-card-avatar{
    width:48px;height:48px;border-radius:14px;
    background:linear-gradient(135deg,#0ea5e9,#6366f1);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:800;font-size:1.2rem;flex-shrink:0;
    box-shadow:0 4px 12px rgba(14,165,233,.2);
}
.cust-card-avatar img{width:100%;height:100%;border-radius:14px;object-fit:cover}
.cust-card-info{flex:1;min-width:0;text-align:right}
.cust-card-name{font-weight:800;font-size:1.05rem;color:#0f172a;margin:0}
.cust-card-group{font-size:.8rem;color:#64748b;font-weight:600;margin:2px 0 0}
.cust-card-meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:6px}
.cust-card-meta-item{
    display:flex;align-items:center;gap:6px;
    font-size:.85rem;color:#475569;font-weight:600;
}
.cust-card-meta-item i{color:#0ea5e9;font-size:.8rem}

.cust-empty{
    text-align:center;padding:60px 20px;color:#64748b;font-weight:600;font-size:1.1rem;
}
.cust-empty i{font-size:3rem;color:#cbd5e1;display:block;margin-bottom:16px}

.cust-loading{text-align:center;padding:40px;color:#64748b;font-weight:600}
.cust-loading i{animation:spin 1s linear infinite;margin-left:8px}
@keyframes spin{to{transform:rotate(360deg)}}

.cust-load-more{
    text-align:center;margin-top:20px;
}

/* Detail View */
.cust-detail{display:none}
.cust-detail.active{display:block}
.cust-list-view.hidden{display:none}

.cust-detail-card{
    background:rgba(255,255,255,.9);backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.7);border-radius:20px;
    padding:24px;margin-bottom:16px;
    box-shadow:0 8px 24px rgba(14,165,233,.1);
}

.cust-detail-header{
    display:flex;align-items:center;gap:16px;margin-bottom:20px;
    padding-bottom:16px;border-bottom:1px solid rgba(203,213,225,.3);
}
.cust-detail-avatar{
    width:64px;height:64px;border-radius:18px;
    background:linear-gradient(135deg,#0ea5e9,#6366f1);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:800;font-size:1.6rem;flex-shrink:0;
    box-shadow:0 6px 16px rgba(14,165,233,.25);
}
.cust-detail-avatar img{width:100%;height:100%;border-radius:18px;object-fit:cover}
.cust-detail-name{font-weight:900;font-size:1.4rem;color:#0f172a;margin:0}
.cust-detail-group{font-size:.9rem;color:#64748b;font-weight:600;margin:4px 0 0}

.cust-info-grid{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:14px;margin-bottom:20px;
}
.cust-info-item{
    display:flex;flex-direction:column;gap:4px;
    padding:12px 16px;border-radius:12px;
    background:rgba(241,245,249,.8);border:1px solid rgba(203,213,225,.3);
}
.cust-info-label{font-size:.8rem;color:#64748b;font-weight:700}
.cust-info-value{font-size:.95rem;color:#0f172a;font-weight:700;word-break:break-all}

.cust-section{margin-top:20px}
.cust-section-header{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:14px;padding-bottom:10px;
    border-bottom:1px solid rgba(203,213,225,.3);
}
.cust-section-title{font-weight:800;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px}
.cust-section-title i{color:#0ea5e9}

.cust-contact-card,.cust-address-card{
    background:rgba(248,250,252,.9);border:1px solid rgba(203,213,225,.3);
    border-radius:14px;padding:14px 16px;margin-bottom:10px;
    transition:all .3s ease;
}
.cust-contact-card:hover,.cust-address-card:hover{
    border-color:rgba(56,189,248,.3);box-shadow:0 4px 12px rgba(14,165,233,.08);
}
.cust-contact-name{font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:6px}
.cust-contact-meta{display:flex;gap:14px;flex-wrap:wrap}
.cust-contact-meta span{display:flex;align-items:center;gap:5px;font-size:.85rem;color:#475569;font-weight:600}
.cust-contact-meta span i{color:#0ea5e9;font-size:.75rem}
.cust-contact-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}

.cust-address-title{font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:4px}
.cust-address-type{
    display:inline-block;padding:2px 10px;border-radius:8px;
    font-size:.75rem;font-weight:700;color:#0ea5e9;
    background:rgba(14,165,233,.1);margin-bottom:6px;
}
.cust-address-text{font-size:.85rem;color:#475569;font-weight:600;line-height:1.6}
.cust-address-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}

.cust-empty-section{
    text-align:center;padding:24px;color:#94a3b8;font-weight:600;font-size:.9rem;
    border:2px dashed rgba(203,213,225,.4);border-radius:14px;
}

/* Modal */
.cust-overlay{
    position:fixed;inset:0;z-index:1200;
    background:rgba(15,23,42,.4);backdrop-filter:blur(12px);
    display:none;align-items:center;justify-content:center;padding:20px;
    overflow-y:auto;
}
.cust-overlay.active{display:flex}
.cust-modal{
    width:100%;max-width:480px;
    background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(248,250,252,.96));
    backdrop-filter:blur(30px);border:1px solid rgba(226,232,240,.8);
    border-radius:24px;padding:28px 24px;position:relative;
    box-shadow:0 25px 60px rgba(15,23,42,.15);
    animation:modalUp .3s ease-out;
}
@keyframes modalUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}

.cust-modal h3{margin:0 0 20px;font-weight:800;font-size:1.3rem;color:#0f172a;text-align:center}

.cust-field{margin-bottom:14px}
.cust-field label{display:block;font-weight:700;font-size:.9rem;color:#475569;margin-bottom:6px;text-align:right}
.cust-field input,.cust-field select{
    width:100%;border:2px solid rgba(203,213,225,.5);border-radius:12px;
    padding:11px 14px;font-size:.95rem;font-weight:600;color:#0f172a;
    background:rgba(255,255,255,.98);font-family:inherit;
    outline:none;text-align:right;transition:all .3s ease;
}
.cust-field input:focus,.cust-field select:focus{
    border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.12);
}
.cust-field input::placeholder{color:#94a3b8;font-weight:500}

.cust-modal-actions{display:flex;gap:10px;margin-top:20px}
.cust-modal-actions .cust-btn{flex:1;justify-content:center}

.cust-msg{
    padding:12px 16px;border-radius:12px;font-weight:700;font-size:.9rem;
    margin-bottom:14px;text-align:center;animation:fadeIn .3s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.cust-msg-ok{background:rgba(220,252,231,.9);color:#14532d;border:1px solid rgba(34,197,94,.3)}
.cust-msg-err{background:rgba(254,226,226,.9);color:#7f1d1d;border:1px solid rgba(239,68,68,.3)}

.cust-detail-actions{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}

@media(max-width:640px){
    .cust-body{padding:14px 12px}
    .cust-title{font-size:1.1em}
    .cust-modal{padding:22px 18px;max-width:calc(100% - 20px)}
    .cust-detail-header{flex-direction:column;text-align:center}
    .cust-info-grid{grid-template-columns:1fr}
}
</style>

<div class="cust-page" dir="rtl">
    <div class="cust-header">
        <div class="cust-header-inner">
            <h1 class="cust-title"><i class="fa fa-users"></i> ${TEXT.PAGE_TITLE}</h1>
            <div class="cust-header-actions">
                <button type="button" id="cust-add-btn" class="cust-header-action-btn cust-add-action-btn" title="${TEXT.ADD_CUSTOMER}">
                    <i class="fa fa-plus"></i>
                </button>
                <button type="button" id="cust-refresh-btn" class="cust-header-action-btn cust-refresh-action-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="cust-back-btn" class="cust-header-action-btn cust-home-action-btn" title="${TEXT.BACK}"><i class="fa fa-home"></i> ${TEXT.BACK}</button>
            </div>
        </div>
        <div class="cust-search-wrap">
            <i class="fa fa-search cust-search-icon"></i>
            <input type="text" id="cust-search" class="cust-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
        </div>
        <div id="cust-count" class="cust-count hidden"></div>
    </div>
    <div class="cust-body">
        <div id="cust-msg-area"></div>

        <!-- List View -->
        <div class="cust-list-view" id="cust-list-view">
            <div class="cust-grid" id="cust-grid"></div>
            <div id="cust-loading" class="cust-loading hidden">
                <div class="cust-spinner"></div>
                <span>${TEXT.LOADING}</span>
            </div>
            <div class="cust-load-more" id="cust-load-more" style="display:none">
                <button class="cust-btn cust-btn-ghost" id="cust-load-more-btn">
                    <i class="fa fa-angle-down"></i>
                    ${TEXT.LOAD_MORE}
                </button>
            </div>
        </div>

        <!-- Detail View -->
        <div class="cust-detail" id="cust-detail"></div>
    </div>
</div>

<!-- Add/Edit Customer Modal -->
<div class="cust-overlay" id="cust-modal-overlay">
    <div class="cust-modal" id="cust-modal">
        <h3 id="cust-modal-title">${TEXT.ADD_CUSTOMER}</h3>
        <div id="cust-modal-msg"></div>
        <input type="hidden" id="cust-edit-name">
        <div class="cust-field">
            <label>${TEXT.CUSTOMER_NAME} *</label>
            <input type="text" id="cust-f-name" placeholder="${TEXT.CUSTOMER_NAME}">
        </div>
        <div class="cust-field">
            <label>${TEXT.CUSTOMER_GROUP}</label>
            <select id="cust-f-group"><option value="">--</option></select>
        </div>
        <div class="cust-field">
            <label>${TEXT.PHONE}</label>
            <input type="text" id="cust-f-phone" placeholder="${TEXT.PHONE}">
        </div>
        <div class="cust-field">
            <label>${TEXT.EMAIL}</label>
            <input type="text" id="cust-f-email" placeholder="${TEXT.EMAIL}">
        </div>
        <div class="cust-modal-actions">
            <button class="cust-btn cust-btn-primary" id="cust-save-btn">
                <i class="fa fa-check"></i> ${TEXT.SAVE}
            </button>
            <button class="cust-btn cust-btn-ghost" id="cust-cancel-btn">${TEXT.CANCEL}</button>
        </div>
    </div>
</div>

<!-- Add Contact Modal -->
<div class="cust-overlay" id="contact-modal-overlay">
    <div class="cust-modal" id="contact-modal">
        <h3>${TEXT.ADD_CONTACT}</h3>
        <div id="contact-modal-msg"></div>
        <input type="hidden" id="contact-customer">
        <div class="cust-field">
            <label>${TEXT.FIRST_NAME} *</label>
            <input type="text" id="contact-f-first" placeholder="${TEXT.FIRST_NAME}">
        </div>
        <div class="cust-field">
            <label>${TEXT.LAST_NAME}</label>
            <input type="text" id="contact-f-last" placeholder="${TEXT.LAST_NAME}">
        </div>
        <div class="cust-field">
            <label>${TEXT.EMAIL}</label>
            <input type="text" id="contact-f-email" placeholder="${TEXT.EMAIL}">
        </div>
        <div class="cust-field">
            <label>${TEXT.MOBILE}</label>
            <input type="text" id="contact-f-mobile" placeholder="${TEXT.MOBILE}">
        </div>
        <div class="cust-field">
            <label>${TEXT.LANDLINE}</label>
            <input type="text" id="contact-f-phone" placeholder="${TEXT.LANDLINE}">
        </div>
        <div class="cust-modal-actions">
            <button class="cust-btn cust-btn-primary" id="contact-save-btn">
                <i class="fa fa-check"></i> ${TEXT.SAVE}
            </button>
            <button class="cust-btn cust-btn-ghost" id="contact-cancel-btn">${TEXT.CANCEL}</button>
        </div>
    </div>
</div>

<!-- Add Address Modal -->
<div class="cust-overlay" id="address-modal-overlay">
    <div class="cust-modal" id="address-modal">
        <h3>${TEXT.ADD_ADDRESS}</h3>
        <div id="address-modal-msg"></div>
        <input type="hidden" id="address-customer">
        <div class="cust-field">
            <label>${TEXT.ADDRESS_TITLE} *</label>
            <input type="text" id="address-f-title" placeholder="${TEXT.ADDRESS_TITLE}">
        </div>
        <div class="cust-field">
            <label>${TEXT.ADDRESS_TYPE}</label>
            <select id="address-f-type">
                <option value="Billing">${TEXT.BILLING}</option>
                <option value="Shipping">${TEXT.SHIPPING}</option>
                <option value="Other">${TEXT.OTHER}</option>
            </select>
        </div>
        <div class="cust-field">
            <label>${TEXT.ADDRESS_LINE1}</label>
            <input type="text" id="address-f-line1" placeholder="${TEXT.ADDRESS_LINE1}">
        </div>
        <div class="cust-field">
            <label>${TEXT.ADDRESS_LINE2}</label>
            <input type="text" id="address-f-line2" placeholder="${TEXT.ADDRESS_LINE2}">
        </div>
        <div class="cust-field">
            <label>${TEXT.CITY}</label>
            <input type="text" id="address-f-city" placeholder="${TEXT.CITY}">
        </div>
        <div class="cust-field">
            <label>${TEXT.STATE}</label>
            <input type="text" id="address-f-state" placeholder="${TEXT.STATE}">
        </div>
        <div class="cust-field">
            <label>${TEXT.COUNTRY}</label>
            <input type="text" id="address-f-country" placeholder="${TEXT.COUNTRY}">
        </div>
        <div class="cust-field">
            <label>${TEXT.PINCODE}</label>
            <input type="text" id="address-f-pincode" placeholder="${TEXT.PINCODE}">
        </div>
        <div class="cust-field">
            <label>${TEXT.PHONE}</label>
            <input type="text" id="address-f-phone" placeholder="${TEXT.PHONE}">
        </div>
        <div class="cust-modal-actions">
            <button class="cust-btn cust-btn-primary" id="address-save-btn">
                <i class="fa fa-check"></i> ${TEXT.SAVE}
            </button>
            <button class="cust-btn cust-btn-ghost" id="address-cancel-btn">${TEXT.CANCEL}</button>
        </div>
    </div>
</div>
`);

const $grid = $(wrapper).find('#cust-grid');
const $count = $(wrapper).find('#cust-count');
const $search = $(wrapper).find('#cust-search');
const $listView = $(wrapper).find('#cust-list-view');
const $detailView = $(wrapper).find('#cust-detail');
const $loadMore = $(wrapper).find('#cust-load-more');
const $msgArea = $(wrapper).find('#cust-msg-area');

// Back / Home button
$(wrapper).find('#cust-back-btn').on('click', function() {
    if ($detailView.hasClass('active')) {
        showListView();
    } else {
        window.location.href = '/main';
    }
});

// Refresh button
$(wrapper).find('#cust-refresh-btn').on('click', function() {
    loadCustomers(true);
});

// Search
$search.on('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadCustomers(true), 300);
});

// Add customer
$(wrapper).find('#cust-add-btn').on('click', function() {
    openCustomerModal();
});

// Load more
$(wrapper).find('#cust-load-more-btn').on('click', function() {
    loadCustomers(false);
});

// Customer modal
$(wrapper).find('#cust-save-btn').on('click', saveCustomer);
$(wrapper).find('#cust-cancel-btn').on('click', closeCustomerModal);
$(wrapper).find('#cust-modal-overlay').on('click', function(e) {
    if (e.target === this) closeCustomerModal();
});

// Contact modal
$(wrapper).find('#contact-save-btn').on('click', saveContact);
$(wrapper).find('#contact-cancel-btn').on('click', closeContactModal);
$(wrapper).find('#contact-modal-overlay').on('click', function(e) {
    if (e.target === this) closeContactModal();
});

// Address modal
$(wrapper).find('#address-save-btn').on('click', saveAddress);
$(wrapper).find('#address-cancel-btn').on('click', closeAddressModal);
$(wrapper).find('#address-modal-overlay').on('click', function(e) {
    if (e.target === this) closeAddressModal();
});

function showMsg(text, type) {
    $msgArea.html(`<div class="cust-msg cust-msg-${type}">${text}</div>`);
    if (type === 'ok') setTimeout(() => $msgArea.html(''), 4000);
}

function showModalMsg(containerId, text, type) {
    $(`#${containerId}`).html(`<div class="cust-msg cust-msg-${type}">${text}</div>`);
}

function showListView() {
    $detailView.removeClass('active').html('');
    $listView.removeClass('hidden');
}

function showDetailView(customerName) {
    $listView.addClass('hidden');
    $detailView.addClass('active');
    loadCustomerDetail(customerName);
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}

function renderCustomerCard(c) {
    const initials = getInitials(c.customer_name);
    const avatar = c.image
        ? `<img src="${c.image}" alt="">`
        : initials;
    const phone = c.custom_phone ? `<span class="cust-card-meta-item"><i class="fa fa-phone"></i>${c.custom_phone}</span>` : '';
    const email = c.custom_email ? `<span class="cust-card-meta-item"><i class="fa fa-envelope"></i>${c.custom_email}</span>` : '';
    const contactCount = (c.contacts || []).length;
    const addrCount = (c.addresses || []).length;
    const badges = `
        ${contactCount ? `<span class="cust-card-meta-item"><i class="fa fa-user"></i>${contactCount} جهة اتصال</span>` : ''}
        ${addrCount ? `<span class="cust-card-meta-item"><i class="fa fa-map-marker"></i>${addrCount} عنوان</span>` : ''}
    `;

    return `
    <div class="cust-card" data-customer="${c.name}">
        <div class="cust-card-header">
            <div class="cust-card-avatar">${avatar}</div>
            <div class="cust-card-info">
                <h4 class="cust-card-name">${c.customer_name || c.name}</h4>
                <div class="cust-card-group">${c.customer_group || ''}</div>
            </div>
        </div>
        <div class="cust-card-meta">
            ${phone}${email}${badges}
        </div>
    </div>`;
}

function renderGrid() {
    if (allCustomers.length === 0) {
        $grid.html(`<div class="cust-empty"><i class="fa fa-users"></i>${TEXT.NO_CUSTOMERS}</div>`);
        $count.text('').addClass('hidden');
        $loadMore.hide();
        return;
    }
    $grid.html(allCustomers.map(renderCustomerCard).join(''));
    $count.text(`${allCustomers.length} من ${totalCount} عميل`).removeClass('hidden');
    $loadMore.toggle(allCustomers.length < totalCount);

    // Click handler
    $grid.find('.cust-card').on('click', function() {
        const name = $(this).data('customer');
        showDetailView(name);
    });
}

function loadCustomers(reset) {
    if (reset) {
        currentOffset = 0;
        allCustomers = [];
    }
    const search = $search.val() || '';
    $grid.html(`<div class="cust-loading"><i class="fa fa-spinner"></i> ${TEXT.LOADING}</div>`);

    frappe.call({
        method: API_BASE + '.get_customers_context',
        args: { search, limit: PAGE_SIZE, offset: currentOffset },
        async: true,
        callback: function(r) {
            if (r && r.message) {
                const data = r.message;
                isAdmin = data.is_admin;
                customerGroups = data.customer_groups || [];
                if (reset) allCustomers = [];
                allCustomers = allCustomers.concat(data.customers || []);
                totalCount = data.total_count || 0;
                currentOffset = allCustomers.length;
                renderGrid();
                populateGroupSelect();
            }
        },
        error: function() {
            $grid.html(`<div class="cust-empty"><i class="fa fa-exclamation-triangle"></i>${TEXT.ERROR}</div>`);
        }
    });
}

function populateGroupSelect() {
    const $sel = $(wrapper).find('#cust-f-group');
    $sel.html('<option value="">--</option>');
    customerGroups.forEach(g => {
        $sel.append(`<option value="${g}">${g}</option>`);
    });
}

// === Customer Modal ===
function openCustomerModal(editData) {
    const $overlay = $(wrapper).find('#cust-modal-overlay');
    const $title = $(wrapper).find('#cust-modal-title');
    $(wrapper).find('#cust-modal-msg').html('');
    $(wrapper).find('#cust-edit-name').val('');
    $(wrapper).find('#cust-f-name').val('');
    $(wrapper).find('#cust-f-group').val('');
    $(wrapper).find('#cust-f-phone').val('');
    $(wrapper).find('#cust-f-email').val('');

    if (editData) {
        $title.text(TEXT.EDIT_CUSTOMER);
        $(wrapper).find('#cust-edit-name').val(editData.name);
        $(wrapper).find('#cust-f-name').val(editData.customer_name || '');
        $(wrapper).find('#cust-f-group').val(editData.customer_group || '');
        $(wrapper).find('#cust-f-phone').val(editData.custom_phone || '');
        $(wrapper).find('#cust-f-email').val(editData.custom_email || '');
    } else {
        $title.text(TEXT.ADD_CUSTOMER);
    }
    $overlay.addClass('active');
    setTimeout(() => $(wrapper).find('#cust-f-name').focus(), 100);
}

function closeCustomerModal() {
    $(wrapper).find('#cust-modal-overlay').removeClass('active');
}

function saveCustomer() {
    const name = $(wrapper).find('#cust-edit-name').val();
    const customerName = $(wrapper).find('#cust-f-name').val().trim();
    if (!customerName) {
        showModalMsg('cust-modal-msg', TEXT.REQUIRED_NAME, 'err');
        return;
    }

    const data = {
        customer_name: customerName,
        customer_group: $(wrapper).find('#cust-f-group').val(),
        custom_phone: $(wrapper).find('#cust-f-phone').val().trim(),
        custom_email: $(wrapper).find('#cust-f-email').val().trim(),
    };

    const $btn = $(wrapper).find('#cust-save-btn');
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);

    const method = name
        ? API_BASE + '.update_customer'
        : API_BASE + '.create_customer';

    if (name) data.name = name;

    frappe.call({
        method,
        args: { data: JSON.stringify(data) },
        async: true,
        callback: function(r) {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            if (r && r.message) {
                closeCustomerModal();
                if (name) {
                    showMsg(TEXT.SUCCESS_UPDATED, 'ok');
                    showDetailView(name);
                } else {
                    showMsg(TEXT.SUCCESS_CREATED(r.message.customer_name), 'ok');
                    loadCustomers(true);
                }
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            showModalMsg('cust-modal-msg', TEXT.ERROR, 'err');
        }
    });
}

// === Detail View ===
function loadCustomerDetail(customerName) {
    $detailView.html(`<div class="cust-loading"><i class="fa fa-spinner"></i> ${TEXT.LOADING}</div>`);

    frappe.call({
        method: API_BASE + '.get_customer_details',
        args: { customer_name: customerName },
        async: true,
        callback: function(r) {
            if (r && r.message) {
                renderDetail(r.message);
            }
        },
        error: function() {
            $detailView.html(`<div class="cust-empty"><i class="fa fa-exclamation-triangle"></i>${TEXT.ERROR}</div>`);
        }
    });
}

function renderDetail(data) {
    const c = data.customer;
    const contacts = data.contacts || [];
    const addresses = data.addresses || [];
    const initials = getInitials(c.customer_name);
    const avatar = c.image ? `<img src="${c.image}" alt="">` : initials;

    let html = `
    <div class="cust-detail-actions">
        <button class="cust-btn cust-btn-primary cust-btn-sm" id="detail-edit-btn">
            <i class="fa fa-pencil"></i> ${TEXT.EDIT_CUSTOMER}
        </button>
    </div>

    <div class="cust-detail-card">
        <div class="cust-detail-header">
            <div class="cust-detail-avatar">${avatar}</div>
            <div>
                <h2 class="cust-detail-name">${c.customer_name || c.name}</h2>
                <div class="cust-detail-group">${c.customer_group || ''}</div>
            </div>
        </div>

        <div class="cust-info-grid">
            <div class="cust-info-item">
                <span class="cust-info-label"><i class="fa fa-phone"></i> ${TEXT.PHONE}</span>
                <span class="cust-info-value">${c.custom_phone || '-'}</span>
            </div>
            <div class="cust-info-item">
                <span class="cust-info-label"><i class="fa fa-envelope"></i> ${TEXT.EMAIL}</span>
                <span class="cust-info-value">${c.custom_email || '-'}</span>
            </div>
            <div class="cust-info-item">
                <span class="cust-info-label"><i class="fa fa-building"></i> ${TEXT.COMPANY}</span>
                <span class="cust-info-value">${c.custom_company || '-'}</span>
            </div>
            ${isAdmin ? `<div class="cust-info-item">
                <span class="cust-info-label"><i class="fa fa-id-badge"></i> ${TEXT.POS_PROFILE}</span>
                <span class="cust-info-value">${c.custom_mini_pos_profile || '-'}</span>
            </div>` : ''}
        </div>
    </div>

    <!-- Contacts Section -->
    <div class="cust-detail-card">
        <div class="cust-section-header">
            <span class="cust-section-title"><i class="fa fa-address-book"></i> ${TEXT.CONTACTS}</span>
            <button class="cust-btn cust-btn-success cust-btn-sm" id="detail-add-contact">
                <i class="fa fa-plus"></i> ${TEXT.ADD_CONTACT}
            </button>
        </div>
        <div id="detail-contacts-list">
            ${contacts.length === 0 ? `<div class="cust-empty-section">${TEXT.NO_CONTACTS}</div>` :
            contacts.map(ct => `
                <div class="cust-contact-card">
                    <div class="cust-contact-name">${ct.first_name || ''} ${ct.last_name || ''}</div>
                    <div class="cust-contact-meta">
                        ${ct.email_id ? `<span><i class="fa fa-envelope"></i>${ct.email_id}</span>` : ''}
                        ${ct.mobile_no ? `<span><i class="fa fa-mobile"></i>${ct.mobile_no}</span>` : ''}
                        ${ct.phone ? `<span><i class="fa fa-phone"></i>${ct.phone}</span>` : ''}
                    </div>
                    <div class="cust-contact-actions">
                        <button class="cust-btn cust-btn-danger cust-btn-sm delete-contact-btn" data-name="${ct.name}">
                            <i class="fa fa-trash"></i> ${TEXT.DELETE}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <!-- Addresses Section -->
    <div class="cust-detail-card">
        <div class="cust-section-header">
            <span class="cust-section-title"><i class="fa fa-map-marker"></i> ${TEXT.ADDRESSES}</span>
            <button class="cust-btn cust-btn-success cust-btn-sm" id="detail-add-address">
                <i class="fa fa-plus"></i> ${TEXT.ADD_ADDRESS}
            </button>
        </div>
        <div id="detail-addresses-list">
            ${addresses.length === 0 ? `<div class="cust-empty-section">${TEXT.NO_ADDRESSES}</div>` :
            addresses.map(addr => `
                <div class="cust-address-card">
                    <div class="cust-address-title">${addr.address_title || addr.name}</div>
                    <span class="cust-address-type">${addr.address_type || ''}</span>
                    <div class="cust-address-text">
                        ${[addr.address_line1, addr.address_line2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join('، ')}
                        ${addr.phone ? `<br><i class="fa fa-phone" style="color:#0ea5e9;font-size:.75rem"></i> ${addr.phone}` : ''}
                    </div>
                    <div class="cust-address-actions">
                        <button class="cust-btn cust-btn-danger cust-btn-sm delete-address-btn" data-name="${addr.name}">
                            <i class="fa fa-trash"></i> ${TEXT.DELETE}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;

    $detailView.html(html);

    // Edit customer
    $detailView.find('#detail-edit-btn').on('click', function() {
        openCustomerModal(c);
    });

    // Add contact
    $detailView.find('#detail-add-contact').on('click', function() {
        openContactModal(c.name);
    });

    // Add address
    $detailView.find('#detail-add-address').on('click', function() {
        openAddressModal(c.name);
    });

    // Delete contact
    $detailView.find('.delete-contact-btn').on('click', function() {
        const contactName = $(this).data('name');
        if (confirm(TEXT.CONFIRM_DELETE)) {
            deleteContact(contactName, c.name);
        }
    });

    // Delete address
    $detailView.find('.delete-address-btn').on('click', function() {
        const addrName = $(this).data('name');
        if (confirm(TEXT.CONFIRM_DELETE)) {
            deleteAddress(addrName, c.name);
        }
    });
}

// === Contact Modal ===
function openContactModal(customerName) {
    $(wrapper).find('#contact-modal-msg').html('');
    $(wrapper).find('#contact-customer').val(customerName);
    $(wrapper).find('#contact-f-first').val('');
    $(wrapper).find('#contact-f-last').val('');
    $(wrapper).find('#contact-f-email').val('');
    $(wrapper).find('#contact-f-mobile').val('');
    $(wrapper).find('#contact-f-phone').val('');
    $(wrapper).find('#contact-modal-overlay').addClass('active');
    setTimeout(() => $(wrapper).find('#contact-f-first').focus(), 100);
}

function closeContactModal() {
    $(wrapper).find('#contact-modal-overlay').removeClass('active');
}

function saveContact() {
    const customer = $(wrapper).find('#contact-customer').val();
    const firstName = $(wrapper).find('#contact-f-first').val().trim();
    if (!firstName) {
        showModalMsg('contact-modal-msg', TEXT.REQUIRED_NAME, 'err');
        return;
    }

    const data = {
        customer,
        first_name: firstName,
        last_name: $(wrapper).find('#contact-f-last').val().trim(),
        email_id: $(wrapper).find('#contact-f-email').val().trim(),
        mobile_no: $(wrapper).find('#contact-f-mobile').val().trim(),
        phone: $(wrapper).find('#contact-f-phone').val().trim(),
    };

    const $btn = $(wrapper).find('#contact-save-btn');
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);

    frappe.call({
        method: API_BASE + '.add_contact',
        args: { data: JSON.stringify(data) },
        async: true,
        callback: function(r) {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            if (r && r.message) {
                closeContactModal();
                showMsg(TEXT.SUCCESS_CONTACT, 'ok');
                loadCustomerDetail(customer);
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            showModalMsg('contact-modal-msg', TEXT.ERROR, 'err');
        }
    });
}

// === Address Modal ===
function openAddressModal(customerName) {
    $(wrapper).find('#address-modal-msg').html('');
    $(wrapper).find('#address-customer').val(customerName);
    $(wrapper).find('#address-f-title').val('');
    $(wrapper).find('#address-f-type').val('Billing');
    $(wrapper).find('#address-f-line1').val('');
    $(wrapper).find('#address-f-line2').val('');
    $(wrapper).find('#address-f-city').val('');
    $(wrapper).find('#address-f-state').val('');
    $(wrapper).find('#address-f-country').val('');
    $(wrapper).find('#address-f-pincode').val('');
    $(wrapper).find('#address-f-phone').val('');
    $(wrapper).find('#address-modal-overlay').addClass('active');
    setTimeout(() => $(wrapper).find('#address-f-title').focus(), 100);
}

function closeAddressModal() {
    $(wrapper).find('#address-modal-overlay').removeClass('active');
}

function saveAddress() {
    const customer = $(wrapper).find('#address-customer').val();
    const title = $(wrapper).find('#address-f-title').val().trim();
    if (!title) {
        showModalMsg('address-modal-msg', TEXT.REQUIRED_NAME, 'err');
        return;
    }

    const data = {
        customer,
        address_title: title,
        address_type: $(wrapper).find('#address-f-type').val(),
        address_line1: $(wrapper).find('#address-f-line1').val().trim(),
        address_line2: $(wrapper).find('#address-f-line2').val().trim(),
        city: $(wrapper).find('#address-f-city').val().trim(),
        state: $(wrapper).find('#address-f-state').val().trim(),
        country: $(wrapper).find('#address-f-country').val().trim(),
        pincode: $(wrapper).find('#address-f-pincode').val().trim(),
        phone: $(wrapper).find('#address-f-phone').val().trim(),
    };

    const $btn = $(wrapper).find('#address-save-btn');
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);

    frappe.call({
        method: API_BASE + '.add_address',
        args: { data: JSON.stringify(data) },
        async: true,
        callback: function(r) {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            if (r && r.message) {
                closeAddressModal();
                showMsg(TEXT.SUCCESS_ADDRESS, 'ok');
                loadCustomerDetail(customer);
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            showModalMsg('address-modal-msg', TEXT.ERROR, 'err');
        }
    });
}

// === Delete ===
function deleteContact(contactName, customerName) {
    frappe.call({
        method: API_BASE + '.delete_contact',
        args: { name: contactName },
        async: true,
        callback: function(r) {
            if (r && r.message && r.message.success) {
                showMsg(TEXT.SUCCESS_DELETED, 'ok');
                loadCustomerDetail(customerName);
            }
        },
        error: function() { showMsg(TEXT.ERROR, 'err'); }
    });
}

function deleteAddress(addrName, customerName) {
    frappe.call({
        method: API_BASE + '.delete_address',
        args: { name: addrName },
        async: true,
        callback: function(r) {
            if (r && r.message && r.message.success) {
                showMsg(TEXT.SUCCESS_DELETED, 'ok');
                loadCustomerDetail(customerName);
            }
        },
        error: function() { showMsg(TEXT.ERROR, 'err'); }
    });
}

// Initial load
loadCustomers(true);

};
