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
    PAGE_TITLE: "سند قبض / صرف",
    RECEIVE: "قبض",
    PAY: "صرف",
    CUSTOMER: "عميل",
    SUPPLIER: "مورد",
    PARTY_TYPE: "نوع الطرف",
    PARTY: "الطرف",
    SELECT_PARTY: "اختر الطرف",
    SEARCH_PARTY: "ابحث...",
    MODE_OF_PAYMENT: "طريقة الدفع",
    SELECT_MODE: "اختر طريقة الدفع",
    AMOUNT: "المبلغ",
    REMARKS: "ملاحظات",
    SUBMIT: "حفظ واعتماد",
    SUBMITTING: "جارٍ الحفظ...",
    SUCCESS: name => `تم إنشاء السند ${name} بنجاح!`,
    ERROR: "حدث خطأ غير متوقع.",
    REQUIRED_PARTY: "يرجى اختيار الطرف.",
    REQUIRED_MODE: "يرجى اختيار طريقة الدفع.",
    REQUIRED_AMOUNT: "يرجى إدخال المبلغ.",
    BACK: "الرئيسية"
};

let context = null;
let selectedType = "Receive";
let selectedPartyType = "Customer";
let selectedParty = "";
let selectedPartyLabel = "";
let selectedMode = "";

$(wrapper).html(`
<div class="pe-page" dir="rtl">
    <div class="pe-header">
        <div class="pe-header-inner">
            <a href="/main" class="pe-back-btn"><i class="fa fa-home"></i></a>
            <h1 class="pe-title"><i class="fa fa-money"></i> ${TEXT.PAGE_TITLE}</h1>
        </div>
    </div>
    <div class="pe-body">
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
                </div>
            </div>

            <!-- Party Type -->
            <div class="pe-field">
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
            <div class="pe-field">
                <label class="pe-label">${TEXT.PARTY}</label>
                <button type="button" id="pe-party-btn" class="pe-select-btn">
                    <i class="fa fa-user"></i>
                    <span id="pe-party-label">${TEXT.SELECT_PARTY}</span>
                    <i class="fa fa-chevron-down" style="margin-right:auto;"></i>
                </button>
            </div>

            <!-- Mode of Payment -->
            <div class="pe-field">
                <label class="pe-label">${TEXT.MODE_OF_PAYMENT}</label>
                <button type="button" id="pe-mode-btn" class="pe-select-btn">
                    <i class="fa fa-credit-card"></i>
                    <span id="pe-mode-label">${TEXT.SELECT_MODE}</span>
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
</div>
<style>
.pe-page{font-family:'Cairo','Tajawal',sans-serif;background:#f0f4f8;min-height:100vh;padding-bottom:40px;}
.pe-header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 50%,#1d4ed8 100%);padding:20px 16px 24px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(37,99,235,0.3);}
.pe-header-inner{max-width:600px;margin:0 auto;display:flex;align-items:center;gap:14px;}
.pe-back-btn{color:#fff;font-size:1.3em;text-decoration:none;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,0.15);transition:background 0.2s;}
.pe-back-btn:hover{background:rgba(255,255,255,0.25);color:#fff;text-decoration:none;}
.pe-title{font-size:1.3em;font-weight:800;margin:0;flex:1;}
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
</style>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}

frappe.call({
    method: "mobile_pos.mobile_pos.page.pos_payment.api.get_context",
    callback: function(r) { context = r.message; }
});

// Toggle Receive/Pay — auto-switch party type
$(wrapper).on('click', '.pe-toggle', function() {
    $('.pe-toggle').removeClass('pe-toggle-active');
    $(this).addClass('pe-toggle-active');
    selectedType = $(this).data('type');
    let autoPtype = selectedType === "Receive" ? "Customer" : "Supplier";
    $('.pe-party-type').removeClass('pe-party-type-active');
    $(`.pe-party-type[data-ptype="${autoPtype}"]`).addClass('pe-party-type-active');
    selectedPartyType = autoPtype;
    selectedParty = "";
    selectedPartyLabel = "";
    $('#pe-party-label').text(TEXT.SELECT_PARTY);
    $('#pe-party-btn').removeClass('pe-selected');
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
    if (!selectedParty) return frappe.show_alert({ message: TEXT.REQUIRED_PARTY, indicator: 'red' }, 3);
    if (!selectedMode) return frappe.show_alert({ message: TEXT.REQUIRED_MODE, indicator: 'red' }, 3);
    let amount = parseFloat(convertArabicToEnglishNumbers($('#pe-amount').val())) || 0;
    if (amount <= 0) return frappe.show_alert({ message: TEXT.REQUIRED_AMOUNT, indicator: 'red' }, 3);

    let $btn = $(this);
    $btn.prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SUBMITTING}`);
    try {
        let r = await frappe.call({
            method: "mobile_pos.mobile_pos.page.pos_payment.api.create_payment_entry",
            type: "POST",
            args: { data: JSON.stringify({
                payment_type: selectedType, party_type: selectedPartyType, party: selectedParty,
                mode_of_payment: selectedMode, amount: amount,
                remarks: $('#pe-remarks').val().trim()
            })}
        });
        let doc = r.message;
        frappe.show_alert({ message: TEXT.SUCCESS(doc.name), indicator: 'green' }, 3);
        // Auto-clear
        selectedParty = ""; selectedPartyLabel = "";
        $('#pe-party-label').text(TEXT.SELECT_PARTY);
        $('#pe-party-btn').removeClass('pe-selected');
        selectedMode = "";
        $('#pe-mode-label').text(TEXT.SELECT_MODE);
        $('#pe-mode-btn').removeClass('pe-selected');
        $('#pe-amount').val('');
        $('#pe-remarks').val('');
        $('#pe-result').empty();
    } catch (err) {
        let msg = err.message || (err._server_messages && JSON.parse(err._server_messages)[0]) || TEXT.ERROR;
        $('#pe-result').html(`<div class="pe-error">${msg}</div>`);
    }
    $btn.prop('disabled', false).html(`<i class="fa fa-check-circle"></i> ${TEXT.SUBMIT}`);
});

};
