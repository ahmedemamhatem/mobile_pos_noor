frappe.pages['mop-balance'].on_page_load = function(wrapper) {

$('header.navbar').hide();
$(wrapper).closest('.main-section').css('margin-top', '0');
$(wrapper).closest('.container.page-body').css('margin-top', '0');
$('.page-head').hide();

$(window).on('hashchange.mop_balance', function() {
    $('header.navbar').show();
    $(wrapper).closest('.main-section').css('margin-top', '');
    $(wrapper).closest('.container.page-body').css('margin-top', '');
    $('.page-head').show();
    $(window).off('hashchange.mop_balance');
});

const API = "mobile_pos.mobile_pos.page.mop_balance.api";
let allModes = [];

$(wrapper).html(`
<style>
.mb-page{font-family:'Segoe UI','Noto Sans Arabic',Tahoma,sans-serif;direction:rtl;background:#f0f2f5;min-height:100vh;padding-bottom:80px;}
.mb-header{background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:16px 20px;color:#fff;position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(14,165,233,0.3);}
.mb-header-inner{display:flex;align-items:center;justify-content:space-between;max-width:800px;margin:0 auto;}
.mb-title{font-size:1.3em;font-weight:800;display:flex;align-items:center;gap:10px;}
.mb-header-actions{display:flex;gap:8px;}
.mb-header-btn{background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:12px;padding:10px 16px;font-weight:700;font-size:0.9em;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(4px);}
.mb-header-btn:hover{background:rgba(255,255,255,0.35);}
.mb-company{text-align:center;padding:8px 20px 0;max-width:800px;margin:0 auto;}
.mb-company-tag{display:inline-block;background:rgba(255,255,255,0.25);color:#fff;padding:4px 14px;border-radius:20px;font-size:0.85em;font-weight:600;}
.mb-content{max-width:800px;margin:0 auto;padding:16px;}
.mb-total-card{background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 50%,#0369a1 100%);border-radius:20px;padding:24px;color:#fff;text-align:center;margin-bottom:16px;box-shadow:0 8px 30px rgba(14,165,233,0.25);}
.mb-total-label{font-size:0.95em;font-weight:600;opacity:0.9;margin-bottom:6px;}
.mb-total-value{font-size:2.2em;font-weight:900;letter-spacing:-0.5px;}
.mb-total-sub{font-size:0.85em;opacity:0.75;margin-top:4px;}
.mb-list{display:flex;flex-direction:column;gap:10px;}
.mb-card{background:#fff;border-radius:16px;padding:16px 18px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 12px rgba(0,0,0,0.06);transition:all 0.2s;border-right:4px solid #0ea5e9;cursor:pointer;}
.mb-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.1);}
.mb-card.positive{border-right-color:#10b981;}
.mb-card.negative{border-right-color:#ef4444;}
.mb-card.zero{border-right-color:#9ca3af;}
.mb-card-info{flex:1;min-width:0;}
.mb-card-name{font-size:1.05em;font-weight:800;color:#1e293b;margin-bottom:2px;}
.mb-card-account{font-size:0.8em;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mb-card-balance{font-size:1.3em;font-weight:900;white-space:nowrap;padding-right:16px;}
.mb-card-balance.positive{color:#10b981;}
.mb-card-balance.negative{color:#ef4444;}
.mb-card-balance.zero{color:#9ca3af;}
.mb-empty{text-align:center;padding:60px 20px;color:#94a3b8;}
.mb-empty i{font-size:3.5em;margin-bottom:16px;display:block;}
.mb-empty p{font-size:1.1em;font-weight:600;}
.mb-loading{text-align:center;padding:60px 20px;color:#64748b;}
.mb-loading i{font-size:2em;margin-bottom:12px;display:block;}
/* Popup overlay */
.mb-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(2px);}
.mb-popup{background:#fff;border-radius:20px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);direction:rtl;}
.mb-popup-header{background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);padding:20px 24px;border-radius:20px 20px 0 0;color:#fff;display:flex;align-items:center;justify-content:space-between;}
.mb-popup-title{font-size:1.2em;font-weight:800;display:flex;align-items:center;gap:8px;}
.mb-popup-close{background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:1.2em;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;}
.mb-popup-close:hover{background:rgba(255,255,255,0.4);}
.mb-popup-body{padding:20px 24px;}
.mb-detail-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;}
.mb-detail-label{color:#64748b;font-weight:600;font-size:0.9em;}
.mb-detail-value{font-weight:800;font-size:1em;color:#1e293b;}
.mb-detail-balance{font-size:1.4em;font-weight:900;}
.mb-transfer-section{margin-top:20px;padding-top:16px;border-top:2px solid #e2e8f0;}
.mb-transfer-title{font-size:1.05em;font-weight:800;color:#0ea5e9;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
.mb-form-group{margin-bottom:14px;}
.mb-form-label{display:block;font-weight:700;font-size:0.85em;color:#475569;margin-bottom:6px;}
.mb-form-input{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;direction:rtl;transition:border-color 0.2s;background:#fff;box-sizing:border-box;}
.mb-form-input:focus{outline:none;border-color:#0ea5e9;}
/* Custom select dropdown */
.mb-select-wrap{position:relative;}
.mb-select-btn{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;direction:rtl;background:#fff;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:space-between;transition:border-color 0.2s;color:#1e293b;min-height:48px;}
.mb-select-btn:hover,.mb-select-btn.active{border-color:#0ea5e9;}
.mb-select-btn .placeholder{color:#94a3b8;}
.mb-select-btn .arrow{font-size:0.8em;color:#94a3b8;transition:transform 0.2s;}
.mb-select-btn.active .arrow{transform:rotate(180deg);}
.mb-select-dropdown{position:absolute;top:100%;left:0;right:0;background:#fff;border:2px solid #0ea5e9;border-radius:12px;margin-top:4px;max-height:220px;overflow-y:auto;z-index:10002;box-shadow:0 8px 30px rgba(0,0,0,0.15);display:none;}
.mb-select-dropdown.open{display:block;}
.mb-select-search{width:100%;padding:10px 14px;border:none;border-bottom:1px solid #e2e8f0;font-size:0.95em;font-family:inherit;direction:rtl;box-sizing:border-box;outline:none;}
.mb-select-search::placeholder{color:#94a3b8;}
.mb-select-item{padding:12px 14px;cursor:pointer;font-weight:600;color:#1e293b;transition:background 0.15s;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f8fafc;}
.mb-select-item:last-child{border-bottom:none;}
.mb-select-item:hover{background:#f0f9ff;}
.mb-select-item.selected{background:#e0f2fe;color:#0284c7;}
.mb-select-item .mb-sel-balance{font-size:0.8em;color:#64748b;margin-right:auto;}
.mb-select-empty{padding:16px;text-align:center;color:#94a3b8;font-size:0.9em;}
.mb-form-textarea{width:100%;padding:12px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:1em;font-family:inherit;direction:rtl;resize:vertical;min-height:60px;transition:border-color 0.2s;box-sizing:border-box;}
.mb-form-textarea:focus{outline:none;border-color:#0ea5e9;}
.mb-btn-row{display:flex;gap:10px;margin-top:18px;}
.mb-btn{flex:1;padding:14px;border:none;border-radius:14px;font-size:1em;font-weight:800;cursor:pointer;transition:all 0.2s;font-family:inherit;}
.mb-btn-submit{background:linear-gradient(135deg,#10b981,#059669);color:#fff;}
.mb-btn-submit:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(16,185,129,0.3);}
.mb-btn-draft{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;}
.mb-btn-draft:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(245,158,11,0.3);}
.mb-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none!important;box-shadow:none!important;}
/* Alert */
.mb-alert-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px;}
.mb-alert-box{background:#fff;border-radius:16px;padding:30px 24px;text-align:center;max-width:400px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
.mb-alert-icon{font-size:2.5em;margin-bottom:12px;}
.mb-alert-msg{font-size:1.05em;font-weight:700;color:#1e293b;margin-bottom:18px;white-space:pre-line;}
.mb-alert-btn{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:12px;padding:12px 32px;font-size:1em;font-weight:800;cursor:pointer;font-family:inherit;}
@media(max-width:500px){
    .mb-total-value{font-size:1.8em;}
    .mb-card{padding:12px 14px;cursor:pointer;}
    .mb-card-balance{font-size:1.1em;padding-right:10px;}
    .mb-popup-body{padding:16px;}
    .mb-btn-row{flex-direction:column;}
}
</style>
<div class="mb-page">
    <div class="mb-header">
        <div class="mb-header-inner">
            <div class="mb-title"><i class="fa fa-credit-card"></i> أرصدة الخزن</div>
            <div class="mb-header-actions">
                <button type="button" id="mb-refresh-btn" class="mb-header-btn" title="تحديث"><i class="fa fa-refresh"></i></button>
                <button type="button" id="mb-home-btn" class="mb-header-btn" title="الرئيسية"><i class="fa fa-home"></i> الرئيسية</button>
            </div>
        </div>
        <div class="mb-company"><span class="mb-company-tag" id="mb-company-name"></span></div>
    </div>
    <div class="mb-content">
        <div id="mb-total-section"></div>
        <div id="mb-list-section">
            <div class="mb-loading"><i class="fa fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>
        </div>
    </div>
</div>
`);

function convertArabicToEnglishNumbers(str) {
    if (!str) return str;
    return str.replace(/[\u0660-\u0669]/g, d => d.charCodeAt(0) - 0x0660)
              .replace(/[\u06F0-\u06F9]/g, d => d.charCodeAt(0) - 0x06F0);
}

function formatCurrency(val) {
    let num = parseFloat(val) || 0;
    let formatted = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num < 0 ? `-${formatted}` : formatted;
}

function getBalanceClass(val) {
    let num = parseFloat(val) || 0;
    if (num > 0) return 'positive';
    if (num < 0) return 'negative';
    return 'zero';
}

async function loadBalances() {
    $('#mb-list-section').html('<div class="mb-loading"><i class="fa fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>');
    $('#mb-total-section').empty();

    try {
        let res = await frappe.call({ method: `${API}.get_mop_balances` });
        let data = res.message || {};
        let modes = data.modes || [];
        let total = data.total || 0;
        let company = data.company || '';

        $('#mb-company-name').text(company);

        // Total card
        let totalClass = getBalanceClass(total);
        $('#mb-total-section').html(`
            <div class="mb-total-card">
                <div class="mb-total-label">إجمالي أرصدة الخزن</div>
                <div class="mb-total-value">${formatCurrency(total)}</div>
                <div class="mb-total-sub">${modes.length} خزنة</div>
            </div>
        `);

        if (!modes.length) {
            $('#mb-list-section').html(`
                <div class="mb-empty">
                    <i class="fa fa-credit-card"></i>
                    <p>لا توجد خزن مسجلة لهذه الشركة</p>
                </div>
            `);
            return;
        }

        // Sort: positive first, then negative, then zero - by absolute value desc
        modes.sort(function(a, b) {
            let absA = Math.abs(a.balance), absB = Math.abs(b.balance);
            return absB - absA;
        });

        // Store modes data for popup
        allModes = modes;

        let html = '<div class="mb-list">';
        modes.forEach(function(m, idx) {
            let cls = getBalanceClass(m.balance);
            html += `
                <div class="mb-card ${cls}" data-idx="${idx}">
                    <div class="mb-card-info">
                        <div class="mb-card-name"><i class="fa fa-${cls === 'positive' ? 'arrow-up' : cls === 'negative' ? 'arrow-down' : 'minus'}" style="font-size:0.8em;margin-left:6px;color:${cls === 'positive' ? '#10b981' : cls === 'negative' ? '#ef4444' : '#9ca3af'};"></i>${m.mode_of_payment}</div>
                        <div class="mb-card-account">${m.account}</div>
                    </div>
                    <div class="mb-card-balance ${cls}">${formatCurrency(m.balance)}</div>
                </div>`;
        });
        html += '</div>';

        $('#mb-list-section').html(html);

    } catch (err) {
        $('#mb-list-section').html(`
            <div class="mb-empty">
                <i class="fa fa-exclamation-triangle" style="color:#ef4444;"></i>
                <p style="color:#ef4444;">خطأ في تحميل البيانات</p>
                <p style="font-size:0.9em;color:#94a3b8;margin-top:8px;">${err.message || 'يرجى المحاولة مرة أخرى'}</p>
            </div>
        `);
    }
}

// Event handlers
$(wrapper).on('click', '#mb-home-btn', function() {
    window.location.href = "/main";
});

$(wrapper).on('click', '#mb-refresh-btn', function() {
    let $btn = $(this);
    $btn.find('i').addClass('fa-spin');
    loadBalances().then(function() {
        setTimeout(function() { $btn.find('i').removeClass('fa-spin'); }, 300);
    });
});

// Card click - show detail popup
$(wrapper).on('click', '.mb-card', function() {
    let idx = $(this).data('idx');
    let m = allModes[idx];
    if (!m) return;
    showDetailPopup(m);
});

function showAlert(msg, icon) {
    icon = icon || 'check-circle';
    let iconColor = icon === 'check-circle' ? '#10b981' : icon === 'exclamation-triangle' ? '#ef4444' : '#0ea5e9';
    let $overlay = $(`
        <div class="mb-alert-overlay">
            <div class="mb-alert-box">
                <div class="mb-alert-icon" style="color:${iconColor};"><i class="fa fa-${icon}"></i></div>
                <div class="mb-alert-msg">${msg}</div>
                <button class="mb-alert-btn">حسناً</button>
            </div>
        </div>
    `);
    $('body').append($overlay);
    $overlay.on('click', '.mb-alert-btn', function() { $overlay.remove(); });
    $overlay.on('click', function(e) { if ($(e.target).hasClass('mb-alert-overlay')) $overlay.remove(); });
}

function showDetailPopup(mode) {
    let cls = getBalanceClass(mode.balance);
    let balColor = cls === 'positive' ? '#10b981' : cls === 'negative' ? '#ef4444' : '#9ca3af';

    // Build target items (exclude current mode)
    let targetModes = allModes.filter(function(m) { return m.mode_of_payment !== mode.mode_of_payment; });

    let itemsHtml = '';
    targetModes.forEach(function(m) {
        let bCls = getBalanceClass(m.balance);
        let bColor = bCls === 'positive' ? '#10b981' : bCls === 'negative' ? '#ef4444' : '#9ca3af';
        itemsHtml += `<div class="mb-select-item" data-value="${m.mode_of_payment}"><span>${m.mode_of_payment}</span><span class="mb-sel-balance" style="color:${bColor};">${formatCurrency(m.balance)}</span></div>`;
    });

    let $overlay = $(`
        <div class="mb-overlay">
            <div class="mb-popup">
                <div class="mb-popup-header">
                    <div class="mb-popup-title"><i class="fa fa-credit-card"></i> ${mode.mode_of_payment}</div>
                    <button class="mb-popup-close"><i class="fa fa-times"></i></button>
                </div>
                <div class="mb-popup-body">
                    <div class="mb-detail-row">
                        <span class="mb-detail-label">طريقة الدفع</span>
                        <span class="mb-detail-value">${mode.mode_of_payment}</span>
                    </div>
                    <div class="mb-detail-row">
                        <span class="mb-detail-label">الحساب</span>
                        <span class="mb-detail-value" style="font-size:0.85em;">${mode.account}</span>
                    </div>
                    <div class="mb-detail-row">
                        <span class="mb-detail-label">الرصيد</span>
                        <span class="mb-detail-balance ${cls}" style="color:${balColor};">${formatCurrency(mode.balance)}</span>
                    </div>

                    <div class="mb-transfer-section">
                        <div class="mb-transfer-title"><i class="fa fa-exchange"></i> تحويل إلى خزنة أخرى</div>
                        <div class="mb-form-group">
                            <label class="mb-form-label">الخزنة المستلمة</label>
                            <div class="mb-select-wrap">
                                <div class="mb-select-btn" id="mb-select-trigger">
                                    <span class="mb-select-text placeholder">-- اختر الخزنة --</span>
                                    <span class="arrow"><i class="fa fa-chevron-down"></i></span>
                                </div>
                                <div class="mb-select-dropdown" id="mb-select-dropdown">
                                    <input type="text" class="mb-select-search" id="mb-select-search" placeholder="بحث..." autocomplete="off">
                                    <div class="mb-select-list" id="mb-select-list">${itemsHtml || '<div class="mb-select-empty">لا توجد خزن أخرى</div>'}</div>
                                </div>
                            </div>
                            <input type="hidden" id="mb-transfer-to" value="">
                        </div>
                        <div class="mb-form-group">
                            <label class="mb-form-label">المبلغ</label>
                            <input type="number" class="mb-form-input" id="mb-transfer-amount" placeholder="0.00" min="0" step="0.01">
                        </div>
                        <div class="mb-form-group">
                            <label class="mb-form-label">ملاحظة</label>
                            <textarea class="mb-form-textarea" id="mb-transfer-note" placeholder="ملاحظة اختيارية..."></textarea>
                        </div>
                        <div class="mb-btn-row">
                            <button class="mb-btn mb-btn-submit" id="mb-do-submit"><i class="fa fa-check"></i> حفظ واعتماد</button>
                            <button class="mb-btn mb-btn-draft" id="mb-do-draft"><i class="fa fa-save"></i> حفظ كمسودة</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    $('body').append($overlay);

    // Custom select logic
    let $trigger = $overlay.find('#mb-select-trigger');
    let $dropdown = $overlay.find('#mb-select-dropdown');
    let $searchInput = $overlay.find('#mb-select-search');
    let $list = $overlay.find('#mb-select-list');
    let $hidden = $overlay.find('#mb-transfer-to');

    $trigger.on('click', function(e) {
        e.stopPropagation();
        let isOpen = $dropdown.hasClass('open');
        if (isOpen) {
            $dropdown.removeClass('open');
            $trigger.removeClass('active');
        } else {
            $dropdown.addClass('open');
            $trigger.addClass('active');
            $searchInput.val('').trigger('input');
            setTimeout(function() { $searchInput.focus(); }, 100);
        }
    });

    // Search filter
    $searchInput.on('input', function() {
        let q = $(this).val().trim().toLowerCase();
        let found = false;
        $list.find('.mb-select-item').each(function() {
            let text = $(this).data('value').toLowerCase();
            let match = !q || text.indexOf(q) !== -1;
            $(this).toggle(match);
            if (match) found = true;
        });
        $list.find('.mb-select-empty').remove();
        if (!found) {
            $list.append('<div class="mb-select-empty">لا توجد نتائج</div>');
        }
    });

    $searchInput.on('click', function(e) { e.stopPropagation(); });

    // Select item
    $list.on('click', '.mb-select-item', function(e) {
        e.stopPropagation();
        let val = $(this).data('value');
        $hidden.val(val);
        $trigger.find('.mb-select-text').text(val).removeClass('placeholder');
        $list.find('.mb-select-item').removeClass('selected');
        $(this).addClass('selected');
        $dropdown.removeClass('open');
        $trigger.removeClass('active');
    });

    // Close dropdown when clicking elsewhere in popup
    $overlay.find('.mb-popup').on('click', function() {
        $dropdown.removeClass('open');
        $trigger.removeClass('active');
    });

    // Close popup
    $overlay.on('click', '.mb-popup-close', function() { $overlay.remove(); });
    $overlay.on('click', function(e) { if ($(e.target).hasClass('mb-overlay')) $overlay.remove(); });

    // Submit transfer
    $overlay.on('click', '#mb-do-submit', function() { doTransfer(mode, $overlay, 1); });
    $overlay.on('click', '#mb-do-draft', function() { doTransfer(mode, $overlay, 0); });
}

async function doTransfer(fromMode, $overlay, submit) {
    let toMop = $overlay.find('#mb-transfer-to').val();
    let amount = parseFloat(convertArabicToEnglishNumbers($overlay.find('#mb-transfer-amount').val())) || 0;
    let note = $overlay.find('#mb-transfer-note').val() || '';

    if (!toMop) {
        showAlert('يرجى اختيار الخزنة المستلمة', 'exclamation-triangle');
        return;
    }
    if (amount <= 0) {
        showAlert('يرجى إدخال مبلغ صحيح', 'exclamation-triangle');
        return;
    }

    // Disable buttons
    $overlay.find('.mb-btn').prop('disabled', true);
    let $btn = submit ? $overlay.find('#mb-do-submit') : $overlay.find('#mb-do-draft');
    let origText = $btn.html();
    $btn.html('<i class="fa fa-spinner fa-spin"></i> جاري الحفظ...');

    try {
        let res = await frappe.call({
            method: `${API}.create_mop_transfer`,
            args: {
                from_mode_of_payment: fromMode.mode_of_payment,
                to_mode_of_payment: toMop,
                amount: amount,
                note: note,
                submit: submit
            }
        });

        let data = res.message || {};
        $overlay.remove();

        let statusText = submit ? 'تم الاعتماد' : 'تم الحفظ كمسودة';
        showAlert(`${statusText}\nرقم السند: ${data.name}`, 'check-circle');

        // Refresh balances
        loadBalances();

    } catch (err) {
        $overlay.find('.mb-btn').prop('disabled', false);
        $btn.html(origText);
        showAlert(err.message || 'حدث خطأ أثناء التحويل', 'exclamation-triangle');
    }
}

// Initial load
loadBalances();

};
