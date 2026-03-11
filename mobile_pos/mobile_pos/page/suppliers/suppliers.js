frappe.pages['suppliers'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.suppliers_page', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.suppliers_page');
});

const TEXT = {
    PAGE_TITLE: "إدارة الموردين",
    SEARCH: "ابحث بالاسم أو الهاتف أو البريد...",
    ADD_SUPPLIER: "إضافة مورد",
    EDIT_SUPPLIER: "تعديل المورد",
    SUPPLIER_DETAILS: "تفاصيل المورد",
    SUPPLIER_NAME: "اسم المورد",
    SUPPLIER_GROUP: "مجموعة المورد",
    SUPPLIER_TYPE: "نوع المورد",
    PHONE: "رقم الهاتف",
    EMAIL: "البريد الإلكتروني",
    COMPANY: "الشركة",
    COUNTRY: "الدولة",
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
    COUNTRY_ADDR: "الدولة",
    PINCODE: "الرمز البريدي",
    SAVE: "حفظ",
    SAVING: "جارٍ الحفظ...",
    CANCEL: "إلغاء",
    CLOSE: "إغلاق",
    DELETE: "حذف",
    NO_SUPPLIERS: "لا يوجد موردين",
    NO_CONTACTS: "لا توجد جهات اتصال",
    NO_ADDRESSES: "لا توجد عناوين",
    LOADING: "جاري التحميل...",
    SUCCESS_CREATED: name => `تم إنشاء المورد ${name} بنجاح!`,
    SUCCESS_UPDATED: "تم التحديث بنجاح!",
    SUCCESS_CONTACT: "تم حفظ جهة الاتصال بنجاح!",
    SUCCESS_ADDRESS: "تم حفظ العنوان بنجاح!",
    SUCCESS_DELETED: "تم الحذف بنجاح!",
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_NAME: "يرجى إدخال اسم المورد.",
    BACK: "الرئيسية",
    BILLING: "فوترة",
    SHIPPING: "شحن",
    OTHER: "أخرى",
    INDIVIDUAL: "فرد",
    COMPANY_TYPE: "شركة",
    CONFIRM_DELETE: "هل أنت متأكد من الحذف؟",
    LOAD_MORE: "تحميل المزيد",
};

const API_BASE = "mobile_pos.mobile_pos.page.suppliers.api";
let allSuppliers = [];
let totalCount = 0;
let currentOffset = 0;
const PAGE_SIZE = 50;
let supplierGroups = [];
let searchTimeout = null;

$(wrapper).html(`
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
<style>
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font-family:"Cairo","Tajawal",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Kufi Arabic",sans-serif}

.sup-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}

.sup-header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 50%,#b45309 100%);padding:20px 16px 16px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(245,158,11,0.35);}
.sup-header-inner{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:14px;margin-bottom:14px;}
.sup-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
.sup-header-actions{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.sup-header-action-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:999px;font-size:0.95em;font-weight:700;border:none;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;white-space:nowrap;font-family:inherit;position:relative;overflow:hidden;color:#fff;}
.sup-home-action-btn{background:linear-gradient(135deg,#10b981,#059669);box-shadow:0 4px 16px rgba(16,185,129,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:100px;}
.sup-home-action-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,185,129,0.5),inset 0 1px 1px rgba(255,255,255,0.4);}
.sup-home-action-btn:active{transform:translateY(0);}
.sup-refresh-action-btn{background:linear-gradient(135deg,#3b82f6,#2563eb);box-shadow:0 4px 16px rgba(59,130,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.sup-refresh-action-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(59,130,246,0.5);}
.sup-refresh-action-btn:active{transform:scale(0.95);}
.sup-add-action-btn{background:linear-gradient(135deg,#8b5cf6,#7c3aed);box-shadow:0 4px 16px rgba(139,92,246,0.4),inset 0 1px 1px rgba(255,255,255,0.3);min-width:44px;max-width:44px;padding:0;}
.sup-add-action-btn:hover{transform:scale(1.05);box-shadow:0 8px 24px rgba(139,92,246,0.5);}
.sup-add-action-btn:active{transform:scale(0.95);}
.sup-search-wrap{max-width:900px;margin:0 auto;position:relative;}
.sup-search{width:100%;padding:12px 16px 12px 40px;border:2px solid rgba(255,255,255,0.3);border-radius:14px;font-size:1em;font-family:inherit;background:rgba(255,255,255,0.2);color:#fff;outline:none;text-align:right;transition:all 0.2s;}
.sup-search::placeholder{color:rgba(255,255,255,0.7);}
.sup-search:focus{background:rgba(255,255,255,0.3);border-color:rgba(255,255,255,0.5);}
.sup-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,0.6);font-size:1.1em;}
.sup-count{max-width:900px;margin:8px auto 0;font-size:0.85em;font-weight:600;color:rgba(255,255,255,0.8);text-align:center;}

.sup-btn{
    appearance:none;border:1px solid transparent;color:#fff;
    padding:10px 18px;border-radius:14px;cursor:pointer;font-weight:700;
    font-size:.95rem;font-family:inherit;transition:all .3s ease;
    display:flex;align-items:center;gap:8px;white-space:nowrap;
}
.sup-btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.12)}
.sup-btn:active{transform:translateY(0)}
.sup-btn:disabled{opacity:.5;cursor:not-allowed;transform:none !important}

.sup-btn-primary{background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 4px 12px rgba(245,158,11,.25)}
.sup-btn-primary:hover{background:linear-gradient(135deg,#d97706,#b45309)}
.sup-btn-success{background:linear-gradient(135deg,#16a34a,#22c55e);box-shadow:0 4px 12px rgba(22,163,74,.25)}
.sup-btn-danger{background:linear-gradient(135deg,#ef4444,#f87171);box-shadow:0 4px 12px rgba(239,68,68,.25)}
.sup-btn-ghost{
    color:#475569;background:rgba(255,255,255,.9);border:1px solid rgba(203,213,225,.5);
}
.sup-btn-ghost:hover{background:#fff;border-color:#f59e0b;color:#d97706}
.sup-btn-sm{padding:7px 14px;font-size:.85rem;border-radius:10px}

.sup-body{max-width:900px;margin:0 auto;padding:20px 16px;}
.sup-grid{display:grid;grid-template-columns:1fr;gap:14px}

.sup-card{
    background:rgba(255,255,255,.9);backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.7);border-radius:18px;
    padding:18px 20px;cursor:pointer;
    box-shadow:0 4px 16px rgba(245,158,11,.08);
    transition:all .3s cubic-bezier(.4,0,.2,1);
    position:relative;overflow:hidden;
}
.sup-card:hover{transform:translateY(-3px);box-shadow:0 12px 30px rgba(245,158,11,.15);border-color:rgba(245,158,11,.3)}
.sup-card::before{
    content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,#f59e0b,#8b5cf6);
    opacity:0;transition:opacity .3s ease;
}
.sup-card:hover::before{opacity:1}

.sup-card-header{display:flex;align-items:center;gap:14px;margin-bottom:10px}
.sup-card-avatar{
    width:48px;height:48px;border-radius:14px;
    background:linear-gradient(135deg,#f59e0b,#d97706);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:800;font-size:1.2rem;flex-shrink:0;
    box-shadow:0 4px 12px rgba(245,158,11,.2);
}
.sup-card-avatar img{width:100%;height:100%;border-radius:14px;object-fit:cover}
.sup-card-info{flex:1;min-width:0;text-align:right}
.sup-card-name{font-weight:800;font-size:1.05rem;color:#0f172a;margin:0}
.sup-card-group{font-size:.8rem;color:#64748b;font-weight:600;margin:2px 0 0}
.sup-card-meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:6px}
.sup-card-meta-item{
    display:flex;align-items:center;gap:6px;
    font-size:.85rem;color:#475569;font-weight:600;
}
.sup-card-meta-item i{color:#f59e0b;font-size:.8rem}

.sup-empty{
    text-align:center;padding:60px 20px;color:#64748b;font-weight:600;font-size:1.1rem;
}
.sup-empty i{font-size:3rem;color:#cbd5e1;display:block;margin-bottom:16px}

.sup-loading{text-align:center;padding:40px;color:#64748b;font-weight:600}
.sup-loading i{animation:spin 1s linear infinite;margin-left:8px}
@keyframes spin{to{transform:rotate(360deg)}}

.sup-load-more{
    text-align:center;margin-top:20px;
}

/* Detail View */
.sup-detail{display:none}
.sup-detail.active{display:block}
.sup-list-view.hidden{display:none}

.sup-detail-card{
    background:rgba(255,255,255,.9);backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,.7);border-radius:20px;
    padding:24px;margin-bottom:16px;
    box-shadow:0 8px 24px rgba(245,158,11,.1);
}

.sup-detail-header{
    display:flex;align-items:center;gap:16px;margin-bottom:20px;
    padding-bottom:16px;border-bottom:1px solid rgba(203,213,225,.3);
}
.sup-detail-avatar{
    width:64px;height:64px;border-radius:18px;
    background:linear-gradient(135deg,#f59e0b,#d97706);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font-weight:800;font-size:1.6rem;flex-shrink:0;
    box-shadow:0 6px 16px rgba(245,158,11,.25);
}
.sup-detail-avatar img{width:100%;height:100%;border-radius:18px;object-fit:cover}
.sup-detail-name{font-weight:900;font-size:1.4rem;color:#0f172a;margin:0}
.sup-detail-group{font-size:.9rem;color:#64748b;font-weight:600;margin:4px 0 0}

.sup-info-grid{
    display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
    gap:14px;margin-bottom:20px;
}
.sup-info-item{
    display:flex;flex-direction:column;gap:4px;
    padding:12px 16px;border-radius:12px;
    background:rgba(241,245,249,.8);border:1px solid rgba(203,213,225,.3);
}
.sup-info-label{font-size:.8rem;color:#64748b;font-weight:700}
.sup-info-value{font-size:.95rem;color:#0f172a;font-weight:700;word-break:break-all}

.sup-section{margin-top:20px}
.sup-section-header{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:14px;padding-bottom:10px;
    border-bottom:1px solid rgba(203,213,225,.3);
}
.sup-section-title{font-weight:800;font-size:1.1rem;color:#0f172a;display:flex;align-items:center;gap:8px}
.sup-section-title i{color:#f59e0b}

.sup-contact-card,.sup-address-card{
    background:rgba(248,250,252,.9);border:1px solid rgba(203,213,225,.3);
    border-radius:14px;padding:14px 16px;margin-bottom:10px;
    transition:all .3s ease;
}
.sup-contact-card:hover,.sup-address-card:hover{
    border-color:rgba(245,158,11,.3);box-shadow:0 4px 12px rgba(245,158,11,.08);
}
.sup-contact-name{font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:6px}
.sup-contact-meta{display:flex;gap:14px;flex-wrap:wrap}
.sup-contact-meta span{display:flex;align-items:center;gap:5px;font-size:.85rem;color:#475569;font-weight:600}
.sup-contact-meta span i{color:#f59e0b;font-size:.75rem}
.sup-contact-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}

.sup-address-title{font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:4px}
.sup-address-type{
    display:inline-block;padding:2px 10px;border-radius:8px;
    font-size:.75rem;font-weight:700;color:#d97706;
    background:rgba(245,158,11,.1);margin-bottom:6px;
}
.sup-address-text{font-size:.85rem;color:#475569;font-weight:600;line-height:1.6}
.sup-address-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}

.sup-empty-section{
    text-align:center;padding:24px;color:#94a3b8;font-weight:600;font-size:.9rem;
    border:2px dashed rgba(203,213,225,.4);border-radius:14px;
}

/* Modal */
.sup-overlay{
    position:fixed;inset:0;z-index:1200;
    background:rgba(15,23,42,.4);backdrop-filter:blur(12px);
    display:none;align-items:center;justify-content:center;padding:20px;
    overflow-y:auto;
}
.sup-overlay.active{display:flex}
.sup-modal{
    width:100%;max-width:480px;
    background:linear-gradient(135deg,rgba(255,255,255,.98),rgba(248,250,252,.96));
    backdrop-filter:blur(30px);border:1px solid rgba(226,232,240,.8);
    border-radius:24px;padding:28px 24px;position:relative;
    box-shadow:0 25px 60px rgba(15,23,42,.15);
    animation:modalUp .3s ease-out;
}
@keyframes modalUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}

.sup-modal h3{margin:0 0 20px;font-weight:800;font-size:1.3rem;color:#0f172a;text-align:center}

.sup-field{margin-bottom:14px}
.sup-field label{display:block;font-weight:700;font-size:.9rem;color:#475569;margin-bottom:6px;text-align:right}
.sup-field input,.sup-field select{
    width:100%;border:2px solid rgba(203,213,225,.5);border-radius:12px;
    padding:11px 14px;font-size:.95rem;font-weight:600;color:#0f172a;
    background:rgba(255,255,255,.98);font-family:inherit;
    outline:none;text-align:right;transition:all .3s ease;
}
.sup-field input:focus,.sup-field select:focus{
    border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.12);
}
.sup-field input::placeholder{color:#94a3b8;font-weight:500}

.sup-modal-actions{display:flex;gap:10px;margin-top:20px}
.sup-modal-actions .sup-btn{flex:1;justify-content:center}

.sup-msg{
    padding:12px 16px;border-radius:12px;font-weight:700;font-size:.9rem;
    margin-bottom:14px;text-align:center;animation:fadeIn .3s ease;
}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.sup-msg-ok{background:rgba(220,252,231,.9);color:#14532d;border:1px solid rgba(34,197,94,.3)}
.sup-msg-err{background:rgba(254,226,226,.9);color:#7f1d1d;border:1px solid rgba(239,68,68,.3)}

.sup-detail-actions{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}

@media(max-width:640px){
    .sup-body{padding:14px 12px}
    .sup-title{font-size:1.1em}
    .sup-modal{padding:22px 18px;max-width:calc(100% - 20px)}
    .sup-detail-header{flex-direction:column;text-align:center}
    .sup-info-grid{grid-template-columns:1fr}
}
</style>

<div class="sup-page" dir="rtl">
    <div class="sup-header">
        <div class="sup-header-inner">
            <h1 class="sup-title"><i class="fa fa-truck"></i> ${TEXT.PAGE_TITLE}</h1>
            <div class="sup-header-actions">
                <button type="button" id="sup-add-btn" class="sup-header-action-btn sup-add-action-btn" title="${TEXT.ADD_SUPPLIER}">
                    <i class="fa fa-plus"></i>
                </button>
                <button type="button" id="sup-refresh-btn" class="sup-header-action-btn sup-refresh-action-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="sup-back-btn" class="sup-header-action-btn sup-home-action-btn" title="${TEXT.BACK}"><i class="fa fa-home"></i> ${TEXT.BACK}</button>
            </div>
        </div>
        <div class="sup-search-wrap">
            <i class="fa fa-search sup-search-icon"></i>
            <input type="text" id="sup-search" class="sup-search" placeholder="${TEXT.SEARCH}" autocomplete="off">
        </div>
        <div id="sup-count" class="sup-count hidden"></div>
    </div>
    <div class="sup-body">
        <div id="sup-msg-area"></div>

        <!-- List View -->
        <div class="sup-list-view" id="sup-list-view">
            <div class="sup-grid" id="sup-grid"></div>
            <div class="sup-load-more" id="sup-load-more" style="display:none">
                <button class="sup-btn sup-btn-ghost" id="sup-load-more-btn">
                    <i class="fa fa-angle-down"></i>
                    ${TEXT.LOAD_MORE}
                </button>
            </div>
        </div>

        <!-- Detail View -->
        <div class="sup-detail" id="sup-detail"></div>
    </div>
</div>

<!-- Add/Edit Supplier Modal -->
<div class="sup-overlay" id="sup-modal-overlay">
    <div class="sup-modal" id="sup-modal">
        <h3 id="sup-modal-title">${TEXT.ADD_SUPPLIER}</h3>
        <div id="sup-modal-msg"></div>
        <input type="hidden" id="sup-edit-name">
        <div class="sup-field">
            <label>${TEXT.SUPPLIER_NAME} *</label>
            <input type="text" id="sup-f-name" placeholder="${TEXT.SUPPLIER_NAME}">
        </div>
        <div class="sup-field">
            <label>${TEXT.SUPPLIER_GROUP}</label>
            <select id="sup-f-group"><option value="">--</option></select>
        </div>
        <div class="sup-field">
            <label>${TEXT.SUPPLIER_TYPE}</label>
            <select id="sup-f-type">
                <option value="Individual">${TEXT.INDIVIDUAL}</option>
                <option value="Company">${TEXT.COMPANY_TYPE}</option>
            </select>
        </div>
        <div class="sup-field">
            <label>${TEXT.PHONE}</label>
            <input type="text" id="sup-f-phone" placeholder="${TEXT.PHONE}">
        </div>
        <div class="sup-field">
            <label>${TEXT.EMAIL}</label>
            <input type="text" id="sup-f-email" placeholder="${TEXT.EMAIL}">
        </div>
        <div class="sup-field">
            <label>${TEXT.COUNTRY}</label>
            <input type="text" id="sup-f-country" placeholder="${TEXT.COUNTRY}">
        </div>
        <div class="sup-modal-actions">
            <button class="sup-btn sup-btn-primary" id="sup-save-btn">
                <i class="fa fa-check"></i> ${TEXT.SAVE}
            </button>
            <button class="sup-btn sup-btn-ghost" id="sup-cancel-btn">${TEXT.CANCEL}</button>
        </div>
    </div>
</div>

<!-- Add Contact Modal -->
<div class="sup-overlay" id="contact-modal-overlay">
    <div class="sup-modal" id="contact-modal">
        <h3>${TEXT.ADD_CONTACT}</h3>
        <div id="contact-modal-msg"></div>
        <input type="hidden" id="contact-supplier">
        <div class="sup-field">
            <label>${TEXT.FIRST_NAME} *</label>
            <input type="text" id="contact-f-first" placeholder="${TEXT.FIRST_NAME}">
        </div>
        <div class="sup-field">
            <label>${TEXT.LAST_NAME}</label>
            <input type="text" id="contact-f-last" placeholder="${TEXT.LAST_NAME}">
        </div>
        <div class="sup-field">
            <label>${TEXT.EMAIL}</label>
            <input type="text" id="contact-f-email" placeholder="${TEXT.EMAIL}">
        </div>
        <div class="sup-field">
            <label>${TEXT.MOBILE}</label>
            <input type="text" id="contact-f-mobile" placeholder="${TEXT.MOBILE}">
        </div>
        <div class="sup-field">
            <label>${TEXT.LANDLINE}</label>
            <input type="text" id="contact-f-phone" placeholder="${TEXT.LANDLINE}">
        </div>
        <div class="sup-modal-actions">
            <button class="sup-btn sup-btn-primary" id="contact-save-btn">
                <i class="fa fa-check"></i> ${TEXT.SAVE}
            </button>
            <button class="sup-btn sup-btn-ghost" id="contact-cancel-btn">${TEXT.CANCEL}</button>
        </div>
    </div>
</div>

<!-- Add Address Modal -->
<div class="sup-overlay" id="address-modal-overlay">
    <div class="sup-modal" id="address-modal">
        <h3>${TEXT.ADD_ADDRESS}</h3>
        <div id="address-modal-msg"></div>
        <input type="hidden" id="address-supplier">
        <div class="sup-field">
            <label>${TEXT.ADDRESS_TITLE} *</label>
            <input type="text" id="address-f-title" placeholder="${TEXT.ADDRESS_TITLE}">
        </div>
        <div class="sup-field">
            <label>${TEXT.ADDRESS_TYPE}</label>
            <select id="address-f-type">
                <option value="Billing">${TEXT.BILLING}</option>
                <option value="Shipping">${TEXT.SHIPPING}</option>
                <option value="Other">${TEXT.OTHER}</option>
            </select>
        </div>
        <div class="sup-field">
            <label>${TEXT.ADDRESS_LINE1}</label>
            <input type="text" id="address-f-line1" placeholder="${TEXT.ADDRESS_LINE1}">
        </div>
        <div class="sup-field">
            <label>${TEXT.ADDRESS_LINE2}</label>
            <input type="text" id="address-f-line2" placeholder="${TEXT.ADDRESS_LINE2}">
        </div>
        <div class="sup-field">
            <label>${TEXT.CITY}</label>
            <input type="text" id="address-f-city" placeholder="${TEXT.CITY}">
        </div>
        <div class="sup-field">
            <label>${TEXT.STATE}</label>
            <input type="text" id="address-f-state" placeholder="${TEXT.STATE}">
        </div>
        <div class="sup-field">
            <label>${TEXT.COUNTRY_ADDR}</label>
            <input type="text" id="address-f-country" placeholder="${TEXT.COUNTRY_ADDR}">
        </div>
        <div class="sup-field">
            <label>${TEXT.PINCODE}</label>
            <input type="text" id="address-f-pincode" placeholder="${TEXT.PINCODE}">
        </div>
        <div class="sup-field">
            <label>${TEXT.PHONE}</label>
            <input type="text" id="address-f-phone" placeholder="${TEXT.PHONE}">
        </div>
        <div class="sup-modal-actions">
            <button class="sup-btn sup-btn-primary" id="address-save-btn">
                <i class="fa fa-check"></i> ${TEXT.SAVE}
            </button>
            <button class="sup-btn sup-btn-ghost" id="address-cancel-btn">${TEXT.CANCEL}</button>
        </div>
    </div>
</div>
`);

const $grid = $(wrapper).find('#sup-grid');
const $count = $(wrapper).find('#sup-count');
const $search = $(wrapper).find('#sup-search');
const $listView = $(wrapper).find('#sup-list-view');
const $detailView = $(wrapper).find('#sup-detail');
const $loadMore = $(wrapper).find('#sup-load-more');
const $msgArea = $(wrapper).find('#sup-msg-area');

// Back / Home button
$(wrapper).find('#sup-back-btn').on('click', function() {
    if ($detailView.hasClass('active')) {
        showListView();
    } else {
        window.location.href = '/main';
    }
});

// Refresh button
$(wrapper).find('#sup-refresh-btn').on('click', function() {
    loadSuppliers(true);
});

// Search
$search.on('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadSuppliers(true), 300);
});

// Add supplier
$(wrapper).find('#sup-add-btn').on('click', function() {
    openSupplierModal();
});

// Load more
$(wrapper).find('#sup-load-more-btn').on('click', function() {
    loadSuppliers(false);
});

// Supplier modal
$(wrapper).find('#sup-save-btn').on('click', saveSupplier);
$(wrapper).find('#sup-cancel-btn').on('click', closeSupplierModal);
$(wrapper).find('#sup-modal-overlay').on('click', function(e) {
    if (e.target === this) closeSupplierModal();
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
    $msgArea.html(`<div class="sup-msg sup-msg-${type}">${text}</div>`);
    if (type === 'ok') setTimeout(() => $msgArea.html(''), 4000);
}

function showModalMsg(containerId, text, type) {
    $(`#${containerId}`).html(`<div class="sup-msg sup-msg-${type}">${text}</div>`);
}

function showListView() {
    $detailView.removeClass('active').html('');
    $listView.removeClass('hidden');
}

function showDetailView(supplierName) {
    $listView.addClass('hidden');
    $detailView.addClass('active');
    loadSupplierDetail(supplierName);
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
}

function renderSupplierCard(s) {
    const initials = getInitials(s.supplier_name);
    const avatar = s.image
        ? `<img src="${s.image}" alt="">`
        : initials;
    const phone = s.mobile_no ? `<span class="sup-card-meta-item"><i class="fa fa-phone"></i>${s.mobile_no}</span>` : '';
    const email = s.email_id ? `<span class="sup-card-meta-item"><i class="fa fa-envelope"></i>${s.email_id}</span>` : '';
    const contactCount = (s.contacts || []).length;
    const addrCount = (s.addresses || []).length;
    const badges = `
        ${contactCount ? `<span class="sup-card-meta-item"><i class="fa fa-user"></i>${contactCount} جهة اتصال</span>` : ''}
        ${addrCount ? `<span class="sup-card-meta-item"><i class="fa fa-map-marker"></i>${addrCount} عنوان</span>` : ''}
    `;

    return `
    <div class="sup-card" data-supplier="${s.name}">
        <div class="sup-card-header">
            <div class="sup-card-avatar">${avatar}</div>
            <div class="sup-card-info">
                <h4 class="sup-card-name">${s.supplier_name || s.name}</h4>
                <div class="sup-card-group">${s.supplier_group || ''}</div>
            </div>
        </div>
        <div class="sup-card-meta">
            ${phone}${email}${badges}
        </div>
    </div>`;
}

function renderGrid() {
    if (allSuppliers.length === 0) {
        $grid.html(`<div class="sup-empty"><i class="fa fa-truck"></i>${TEXT.NO_SUPPLIERS}</div>`);
        $count.text('').addClass('hidden');
        $loadMore.hide();
        return;
    }
    $grid.html(allSuppliers.map(renderSupplierCard).join(''));
    $count.text(`${allSuppliers.length} من ${totalCount} مورد`).removeClass('hidden');
    $loadMore.toggle(allSuppliers.length < totalCount);

    // Click handler
    $grid.find('.sup-card').on('click', function() {
        const name = $(this).data('supplier');
        showDetailView(name);
    });
}

function loadSuppliers(reset) {
    if (reset) {
        currentOffset = 0;
        allSuppliers = [];
    }
    const search = $search.val() || '';
    $grid.html(`<div class="sup-loading"><i class="fa fa-spinner"></i> ${TEXT.LOADING}</div>`);

    frappe.call({
        method: API_BASE + '.get_suppliers_context',
        args: { search, limit: PAGE_SIZE, offset: currentOffset },
        async: true,
        callback: function(r) {
            if (r && r.message) {
                const data = r.message;
                supplierGroups = data.supplier_groups || [];
                if (reset) allSuppliers = [];
                allSuppliers = allSuppliers.concat(data.suppliers || []);
                totalCount = data.total_count || 0;
                currentOffset = allSuppliers.length;
                renderGrid();
                populateGroupSelect();
            }
        },
        error: function() {
            $grid.html(`<div class="sup-empty"><i class="fa fa-exclamation-triangle"></i>${TEXT.ERROR}</div>`);
        }
    });
}

function populateGroupSelect() {
    const $sel = $(wrapper).find('#sup-f-group');
    $sel.html('<option value="">--</option>');
    supplierGroups.forEach(g => {
        $sel.append(`<option value="${g}">${g}</option>`);
    });
}

// === Supplier Modal ===
function openSupplierModal(editData) {
    const $overlay = $(wrapper).find('#sup-modal-overlay');
    const $title = $(wrapper).find('#sup-modal-title');
    $(wrapper).find('#sup-modal-msg').html('');
    $(wrapper).find('#sup-edit-name').val('');
    $(wrapper).find('#sup-f-name').val('');
    $(wrapper).find('#sup-f-group').val('');
    $(wrapper).find('#sup-f-type').val('Individual');
    $(wrapper).find('#sup-f-phone').val('');
    $(wrapper).find('#sup-f-email').val('');
    $(wrapper).find('#sup-f-country').val('');

    if (editData) {
        $title.text(TEXT.EDIT_SUPPLIER);
        $(wrapper).find('#sup-edit-name').val(editData.name);
        $(wrapper).find('#sup-f-name').val(editData.supplier_name || '');
        $(wrapper).find('#sup-f-group').val(editData.supplier_group || '');
        $(wrapper).find('#sup-f-type').val(editData.supplier_type || 'Individual');
        $(wrapper).find('#sup-f-phone').val(editData.mobile_no || '');
        $(wrapper).find('#sup-f-email').val(editData.email_id || '');
        $(wrapper).find('#sup-f-country').val(editData.country || '');
    } else {
        $title.text(TEXT.ADD_SUPPLIER);
    }
    $overlay.addClass('active');
    setTimeout(() => $(wrapper).find('#sup-f-name').focus(), 100);
}

function closeSupplierModal() {
    $(wrapper).find('#sup-modal-overlay').removeClass('active');
}

function saveSupplier() {
    const name = $(wrapper).find('#sup-edit-name').val();
    const supplierName = $(wrapper).find('#sup-f-name').val().trim();
    if (!supplierName) {
        showModalMsg('sup-modal-msg', TEXT.REQUIRED_NAME, 'err');
        return;
    }

    const data = {
        supplier_name: supplierName,
        supplier_group: $(wrapper).find('#sup-f-group').val(),
        supplier_type: $(wrapper).find('#sup-f-type').val(),
        mobile_no: $(wrapper).find('#sup-f-phone').val().trim(),
        email_id: $(wrapper).find('#sup-f-email').val().trim(),
        country: $(wrapper).find('#sup-f-country').val().trim(),
    };

    const $btn = $(wrapper).find('#sup-save-btn');
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SAVING}`);

    const method = name
        ? API_BASE + '.update_supplier'
        : API_BASE + '.create_supplier';

    if (name) data.name = name;

    frappe.call({
        method,
        args: { data: JSON.stringify(data) },
        async: true,
        callback: function(r) {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            if (r && r.message) {
                closeSupplierModal();
                if (name) {
                    showMsg(TEXT.SUCCESS_UPDATED, 'ok');
                    showDetailView(name);
                } else {
                    showMsg(TEXT.SUCCESS_CREATED(r.message.supplier_name), 'ok');
                    loadSuppliers(true);
                }
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            showModalMsg('sup-modal-msg', TEXT.ERROR, 'err');
        }
    });
}

// === Detail View ===
function loadSupplierDetail(supplierName) {
    $detailView.html(`<div class="sup-loading"><i class="fa fa-spinner"></i> ${TEXT.LOADING}</div>`);

    frappe.call({
        method: API_BASE + '.get_supplier_details',
        args: { supplier_name: supplierName },
        async: true,
        callback: function(r) {
            if (r && r.message) {
                renderDetail(r.message);
            }
        },
        error: function() {
            $detailView.html(`<div class="sup-empty"><i class="fa fa-exclamation-triangle"></i>${TEXT.ERROR}</div>`);
        }
    });
}

function renderDetail(data) {
    const s = data.supplier;
    const contacts = data.contacts || [];
    const addresses = data.addresses || [];
    const initials = getInitials(s.supplier_name);
    const avatar = s.image ? `<img src="${s.image}" alt="">` : initials;

    let html = `
    <div class="sup-detail-actions">
        <button class="sup-btn sup-btn-primary sup-btn-sm" id="detail-edit-btn">
            <i class="fa fa-pencil"></i> ${TEXT.EDIT_SUPPLIER}
        </button>
    </div>

    <div class="sup-detail-card">
        <div class="sup-detail-header">
            <div class="sup-detail-avatar">${avatar}</div>
            <div>
                <h2 class="sup-detail-name">${s.supplier_name || s.name}</h2>
                <div class="sup-detail-group">${s.supplier_group || ''}</div>
            </div>
        </div>

        <div class="sup-info-grid">
            <div class="sup-info-item">
                <span class="sup-info-label"><i class="fa fa-phone"></i> ${TEXT.PHONE}</span>
                <span class="sup-info-value">${s.mobile_no || '-'}</span>
            </div>
            <div class="sup-info-item">
                <span class="sup-info-label"><i class="fa fa-envelope"></i> ${TEXT.EMAIL}</span>
                <span class="sup-info-value">${s.email_id || '-'}</span>
            </div>
            <div class="sup-info-item">
                <span class="sup-info-label"><i class="fa fa-building"></i> ${TEXT.COMPANY}</span>
                <span class="sup-info-value">${s.custom_company || '-'}</span>
            </div>
            <div class="sup-info-item">
                <span class="sup-info-label"><i class="fa fa-globe"></i> ${TEXT.COUNTRY}</span>
                <span class="sup-info-value">${s.country || '-'}</span>
            </div>
            <div class="sup-info-item">
                <span class="sup-info-label"><i class="fa fa-tag"></i> ${TEXT.SUPPLIER_TYPE}</span>
                <span class="sup-info-value">${s.supplier_type || '-'}</span>
            </div>
        </div>
    </div>

    <!-- Contacts Section -->
    <div class="sup-detail-card">
        <div class="sup-section-header">
            <span class="sup-section-title"><i class="fa fa-address-book"></i> ${TEXT.CONTACTS}</span>
            <button class="sup-btn sup-btn-success sup-btn-sm" id="detail-add-contact">
                <i class="fa fa-plus"></i> ${TEXT.ADD_CONTACT}
            </button>
        </div>
        <div id="detail-contacts-list">
            ${contacts.length === 0 ? `<div class="sup-empty-section">${TEXT.NO_CONTACTS}</div>` :
            contacts.map(ct => `
                <div class="sup-contact-card">
                    <div class="sup-contact-name">${ct.first_name || ''} ${ct.last_name || ''}</div>
                    <div class="sup-contact-meta">
                        ${ct.email_id ? `<span><i class="fa fa-envelope"></i>${ct.email_id}</span>` : ''}
                        ${ct.mobile_no ? `<span><i class="fa fa-mobile"></i>${ct.mobile_no}</span>` : ''}
                        ${ct.phone ? `<span><i class="fa fa-phone"></i>${ct.phone}</span>` : ''}
                    </div>
                    <div class="sup-contact-actions">
                        <button class="sup-btn sup-btn-danger sup-btn-sm delete-contact-btn" data-name="${ct.name}">
                            <i class="fa fa-trash"></i> ${TEXT.DELETE}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <!-- Addresses Section -->
    <div class="sup-detail-card">
        <div class="sup-section-header">
            <span class="sup-section-title"><i class="fa fa-map-marker"></i> ${TEXT.ADDRESSES}</span>
            <button class="sup-btn sup-btn-success sup-btn-sm" id="detail-add-address">
                <i class="fa fa-plus"></i> ${TEXT.ADD_ADDRESS}
            </button>
        </div>
        <div id="detail-addresses-list">
            ${addresses.length === 0 ? `<div class="sup-empty-section">${TEXT.NO_ADDRESSES}</div>` :
            addresses.map(addr => `
                <div class="sup-address-card">
                    <div class="sup-address-title">${addr.address_title || addr.name}</div>
                    <span class="sup-address-type">${addr.address_type || ''}</span>
                    <div class="sup-address-text">
                        ${[addr.address_line1, addr.address_line2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join('، ')}
                        ${addr.phone ? `<br><i class="fa fa-phone" style="color:#f59e0b;font-size:.75rem"></i> ${addr.phone}` : ''}
                    </div>
                    <div class="sup-address-actions">
                        <button class="sup-btn sup-btn-danger sup-btn-sm delete-address-btn" data-name="${addr.name}">
                            <i class="fa fa-trash"></i> ${TEXT.DELETE}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
    `;

    $detailView.html(html);

    // Edit supplier
    $detailView.find('#detail-edit-btn').on('click', function() {
        openSupplierModal(s);
    });

    // Add contact
    $detailView.find('#detail-add-contact').on('click', function() {
        openContactModal(s.name);
    });

    // Add address
    $detailView.find('#detail-add-address').on('click', function() {
        openAddressModal(s.name);
    });

    // Delete contact
    $detailView.find('.delete-contact-btn').on('click', function() {
        const contactName = $(this).data('name');
        if (confirm(TEXT.CONFIRM_DELETE)) {
            deleteContact(contactName, s.name);
        }
    });

    // Delete address
    $detailView.find('.delete-address-btn').on('click', function() {
        const addrName = $(this).data('name');
        if (confirm(TEXT.CONFIRM_DELETE)) {
            deleteAddress(addrName, s.name);
        }
    });
}

// === Contact Modal ===
function openContactModal(supplierName) {
    $(wrapper).find('#contact-modal-msg').html('');
    $(wrapper).find('#contact-supplier').val(supplierName);
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
    const supplier = $(wrapper).find('#contact-supplier').val();
    const firstName = $(wrapper).find('#contact-f-first').val().trim();
    if (!firstName) {
        showModalMsg('contact-modal-msg', TEXT.REQUIRED_NAME, 'err');
        return;
    }

    const data = {
        supplier,
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
                loadSupplierDetail(supplier);
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            showModalMsg('contact-modal-msg', TEXT.ERROR, 'err');
        }
    });
}

// === Address Modal ===
function openAddressModal(supplierName) {
    $(wrapper).find('#address-modal-msg').html('');
    $(wrapper).find('#address-supplier').val(supplierName);
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
    const supplier = $(wrapper).find('#address-supplier').val();
    const title = $(wrapper).find('#address-f-title').val().trim();
    if (!title) {
        showModalMsg('address-modal-msg', TEXT.REQUIRED_NAME, 'err');
        return;
    }

    const data = {
        supplier,
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
                loadSupplierDetail(supplier);
            }
        },
        error: function() {
            $btn.prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SAVE}`);
            showModalMsg('address-modal-msg', TEXT.ERROR, 'err');
        }
    });
}

// === Delete ===
function deleteContact(contactName, supplierName) {
    frappe.call({
        method: API_BASE + '.delete_contact',
        args: { name: contactName },
        async: true,
        callback: function(r) {
            if (r && r.message && r.message.success) {
                showMsg(TEXT.SUCCESS_DELETED, 'ok');
                loadSupplierDetail(supplierName);
            }
        },
        error: function() { showMsg(TEXT.ERROR, 'err'); }
    });
}

function deleteAddress(addrName, supplierName) {
    frappe.call({
        method: API_BASE + '.delete_address',
        args: { name: addrName },
        async: true,
        callback: function(r) {
            if (r && r.message && r.message.success) {
                showMsg(TEXT.SUCCESS_DELETED, 'ok');
                loadSupplierDetail(supplierName);
            }
        },
        error: function() { showMsg(TEXT.ERROR, 'err'); }
    });
}

// Initial load
loadSuppliers(true);

};
