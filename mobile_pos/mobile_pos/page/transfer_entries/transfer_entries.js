frappe.pages["transfer-entries"].on_page_load = async function(wrapper) {
  // Hide navbar
  (function hideNavbar() {
    const hide = () => {
      const $nb = $('.navbar, .navbar-default, .page-head, header.navbar');
      $nb.attr('data-te-hidden', '1').css('display', 'none');
      $('.page-head, .page-head-content, .page-head .container').css('display', 'none');
    };
    const show = () => {
      const $nb = $('.navbar, .navbar-default, .page-head, header.navbar');
      $nb.filter('[data-te-hidden="1"]').css('display', '');
      $('.page-head, .page-head-content, .page-head .container').css('display', '');
      $nb.removeAttr('data-te-hidden');
    };
    try { if (frappe.get_route()[0] === 'transfer-entries') hide(); } catch(e) {}
    const page = frappe.pages['transfer-entries'];
    if (page) {
      const orig = page.show;
      page.show = function() { hide(); if (typeof orig === 'function') return orig.apply(this, arguments); };
    }
    $(window).on('hashchange.te_navbar', function() {
      try { const r = frappe.get_route(); if (r[0] === 'transfer-entries') hide(); else show(); } catch(e) {}
    });
    window.addEventListener('beforeunload', show);
    $(document).on('page-change.te_navbar', function() {
      try { const r = frappe.get_route(); if (r[0] === 'transfer-entries') hide(); else show(); } catch(e) {}
    });
  })();

  const TEXT = {
    TITLE: "حركات المخزون",
    HOME: "الرئيسية",
    REFRESH: "تحديث",
    ALL: "الكل",
    DRAFT: "مسودة",
    SUBMITTED: "معتمد",
    CANCELLED: "ملغى",
    TRANSFER_TYPE: "نوع التحويل",
    LOADING: "تحميل",
    ADD: "تحميل",
    RETURN: "إرجاع",
    TAHMEL: "تحميل",
    TAFREEGH: "تفريغ",
    FROM_DATE: "من تاريخ",
    TO_DATE: "إلى تاريخ",
    PROFILE: "الملف",
    SEARCH: "بحث بالرقم...",
    NO_ENTRIES: "لا توجد حركات مخزون",
    NO_ENTRIES_HINT: "لم يتم العثور على أي حركات تطابق الفلاتر المحددة.",
    ITEMS: "الأصناف",
    ITEM: "الصنف",
    QTY: "الكمية",
    UOM: "الوحدة",
    FROM_WH: "من مخزن",
    TO_WH: "إلى مخزن",
    STOCK_AVAIL: "المتوفر",
    DETAILS: "تفاصيل الحركة",
    SUBMIT: "اعتماد",
    CANCEL_ENTRY: "إلغاء",
    DELETE: "حذف",
    CLOSE: "إغلاق",
    CONFIRM_SUBMIT: "هل أنت متأكد من اعتماد هذه الحركة؟",
    CONFIRM_CANCEL: "هل أنت متأكد من إلغاء هذه الحركة؟",
    CONFIRM_DELETE: "هل أنت متأكد من حذف هذه الحركة؟ لا يمكن التراجع عن هذا الإجراء.",
    SUBMIT_SUCCESS: "تم اعتماد الحركة بنجاح",
    CANCEL_SUCCESS: "تم إلغاء الحركة بنجاح",
    DELETE_SUCCESS: "تم حذف الحركة بنجاح",
    PREV: "السابق",
    NEXT: "التالي",
    PAGE_OF: (p, t) => `صفحة ${p} من ${t}`,
    ENTRY_NUM: "رقم الحركة",
    DATE: "التاريخ",
    TIME: "الوقت",
    STATUS: "الحالة",
    OWNER: "بواسطة",
    TOTAL_QTY: "إجمالي الكمية",
    SUBMIT_ALL: "اعتماد الكل",
    CONFIRM_SUBMIT_ALL: "هل أنت متأكد من اعتماد جميع المسودات؟",
    SUBMIT_ALL_SUCCESS: (n) => `تم اعتماد ${n} حركة بنجاح`,
    SUBMIT_ALL_PROGRESS: (done, total) => `جاري الاعتماد... ${done}/${total}`
  };

  const API = "mobile_pos.mobile_pos.page.transfer_entries.api";
  let currentPage = 1;
  let currentFilters = { docstatus: null, transfer_type: null, mini_pos_profile: null, search: null };
  let totalEntries = 0;
  let isAdmin = false;
  let profilesList = [];
  let summary = { draft_count: 0, submitted_count: 0, cancelled_count: 0 };
  let filtersRendered = false;

  const format_number = val => Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // ── CSS ──
  const css = `<style>
    * { touch-action: manipulation; }

    .te-page {
      max-width: 780px;
      margin: 0 auto;
      padding: 0;
      direction: rtl;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%);
    }

    /* Header */
    .te-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      padding: 16px 16px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
    }
    .te-header-title {
      color: #fff;
      font-size: 1.2em;
      font-weight: 800;
      text-shadow: 0 1px 3px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .te-header-actions {
      display: flex;
      gap: 8px;
    }
    .te-hdr-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 42px;
      padding: 0 16px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.92em;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .te-home-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      box-shadow: 0 3px 12px rgba(16, 185, 129, 0.4);
    }
    .te-home-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5); }
    .te-refresh-btn {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      box-shadow: 0 3px 12px rgba(59, 130, 246, 0.4);
      width: 42px;
      padding: 0;
    }
    .te-refresh-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5); }
    .te-refresh-btn:hover i { animation: teSpin 0.6s ease; }
    @keyframes teSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Summary Cards */
    .te-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 14px 14px 0;
    }
    .te-summary-card {
      background: #fff;
      border-radius: 16px;
      padding: 14px 12px;
      text-align: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }
    .te-summary-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .te-summary-card.active { border-color: #667eea; background: #f0f4ff; }
    .te-summary-count {
      font-size: 1.8em;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 4px;
    }
    .te-summary-label {
      font-size: 0.82em;
      font-weight: 600;
      color: #64748b;
    }
    .te-draft-color { color: #f59e0b; }
    .te-submitted-color { color: #10b981; }
    .te-cancelled-color { color: #ef4444; }

    /* Filters */
    .te-filters {
      padding: 10px 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .te-filter-group {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;
    }
    .te-filter-input {
      height: 40px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      padding: 0 12px;
      font-size: 0.9em;
      font-weight: 600;
      background: #fff;
      color: #0f172a;
      min-width: 0;
      transition: border-color 0.15s;
    }
    .te-filter-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
    }
    .te-filter-btn {
      height: 40px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      padding: 0 12px;
      font-size: 0.9em;
      font-weight: 600;
      background: #fff;
      color: #0f172a;
      min-width: 100px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      transition: border-color 0.15s;
      white-space: nowrap;
    }
    .te-filter-btn:active { border-color: #667eea; }
    .te-filter-btn i.fa-chevron-down { font-size: 0.7em; color: #94a3b8; }
    .te-filter-btn.has-value { border-color: #667eea; color: #667eea; background: #f0f4ff; }

    /* Filter Dropdown */
    .te-filter-wrapper { position: relative; }
    .te-filter-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08);
      min-width: 180px;
      max-height: 260px;
      overflow-y: auto;
      z-index: 1000;
      padding: 6px 0;
      direction: rtl;
      display: none;
      animation: teDropIn 0.15s ease;
    }
    .te-filter-dropdown.open { display: block; }
    @keyframes teDropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .te-filter-dd-item {
      padding: 12px 16px;
      font-size: 0.92em;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.1s;
    }
    .te-filter-dd-item:active { background: #f0f4ff; }
    .te-filter-dd-item.selected { color: #667eea; font-weight: 700; }
    .te-filter-dd-item.selected::after {
      content: '\\f00c';
      font-family: FontAwesome;
      color: #667eea;
      font-size: 0.85em;
    }

    .te-search-input {
      flex: 1;
      min-width: 120px;
    }

    /* Submit All Bar */
    .te-submit-all-bar {
      padding: 0 14px 8px;
      display: none;
    }
    .te-submit-all-bar.visible { display: block; }
    .te-submit-all-btn {
      width: 100%;
      height: 46px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
      font-weight: 800;
      font-size: 1em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 3px 12px rgba(245, 158, 11, 0.35);
    }
    .te-submit-all-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45); }
    .te-submit-all-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    /* Entry List */
    .te-list {
      padding: 0 14px 14px;
    }
    .te-entry-card {
      background: #fff;
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      cursor: pointer;
      transition: all 0.2s ease;
      border-right: 4px solid transparent;
    }
    .te-entry-card:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
    .te-entry-card.draft { border-right-color: #f59e0b; }
    .te-entry-card.submitted { border-right-color: #10b981; }
    .te-entry-card.cancelled { border-right-color: #ef4444; opacity: 0.7; }
    .te-entry-row1 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .te-entry-name {
      font-weight: 800;
      font-size: 0.95em;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .te-entry-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75em;
      font-weight: 700;
    }
    .te-badge-draft { background: #fef3c7; color: #92400e; }
    .te-badge-submitted { background: #d1fae5; color: #065f46; }
    .te-badge-cancelled { background: #fee2e2; color: #991b1b; }
    .te-badge-type {
      background: #e0e7ff;
      color: #3730a3;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75em;
      font-weight: 700;
    }
    .te-entry-row2 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
    }
    .te-entry-meta {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      font-size: 0.82em;
      color: #64748b;
    }
    .te-entry-meta i { margin-left: 4px; color: #94a3b8; }
    .te-entry-qty {
      font-weight: 700;
      font-size: 0.88em;
      color: #334155;
      background: #f8fafc;
      padding: 4px 10px;
      border-radius: 10px;
    }

    /* Loading */
    .te-loading {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;
      font-size: 1em;
    }
    .te-loading i { font-size: 2em; margin-bottom: 12px; display: block; }

    /* Empty State */
    .te-empty {
      text-align: center;
      padding: 60px 20px;
    }
    .te-empty i { font-size: 3em; color: #cbd5e1; margin-bottom: 12px; display: block; }
    .te-empty-title { font-weight: 700; color: #64748b; font-size: 1.1em; margin-bottom: 6px; }
    .te-empty-hint { color: #94a3b8; font-size: 0.88em; }

    /* Pagination */
    .te-pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 12px 14px 24px;
    }
    .te-page-btn {
      height: 40px;
      padding: 0 18px;
      border-radius: 12px;
      border: 1.5px solid #e2e8f0;
      background: #fff;
      color: #334155;
      font-weight: 700;
      font-size: 0.88em;
      cursor: pointer;
      transition: all 0.15s;
    }
    .te-page-btn:hover:not(:disabled) { background: #f0f4ff; border-color: #667eea; color: #667eea; }
    .te-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .te-page-info { font-size: 0.85em; color: #64748b; font-weight: 600; }

    /* ── Detail Popup (Overlay) ── */
    .te-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .te-overlay.open { opacity: 1; pointer-events: auto; }
    .te-popup {
      background: #fff;
      border-radius: 28px 28px 0 0;
      width: 100%;
      max-width: 720px;
      max-height: 92vh;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 -12px 50px rgba(0,0,0,0.25), 0 -4px 20px rgba(0,0,0,0.1);
      direction: rtl;
    }
    .te-overlay.open .te-popup { transform: translateY(0); }

    .te-popup-handle {
      width: 48px;
      height: 5px;
      background: #cbd5e1;
      border-radius: 999px;
      margin: 12px auto 0;
    }

    /* Status Banner */
    .te-popup-banner {
      margin: 12px 16px 0;
      border-radius: 18px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      position: relative;
      overflow: hidden;
    }
    .te-popup-banner::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, transparent, rgba(255,255,255,0.15));
      pointer-events: none;
    }
    .te-popup-banner.draft-banner {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
    }
    .te-popup-banner.submitted-banner {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
    }
    .te-popup-banner.cancelled-banner {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
    }
    .te-banner-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }
    .te-banner-icon {
      width: 46px;
      height: 46px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }
    .te-banner-info { min-width: 0; }
    .te-banner-name {
      font-weight: 800;
      font-size: 1.05em;
      letter-spacing: -0.3px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.15);
    }
    .te-banner-status {
      font-size: 0.82em;
      opacity: 0.9;
      font-weight: 600;
      margin-top: 2px;
    }
    .te-banner-close {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.35);
      background: rgba(255,255,255,0.15);
      color: #fff;
      font-size: 1.1em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
      flex-shrink: 0;
    }
    .te-banner-close:hover { background: rgba(255,255,255,0.3); border-color: rgba(255,255,255,0.6); transform: scale(1.08); }

    /* Info Grid - 2 columns */
    .te-popup-info {
      padding: 16px 16px 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .te-info-item {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 14px;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      transition: all 0.15s;
    }
    .te-info-item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .te-info-label {
      font-size: 0.72em;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .te-info-label i { font-size: 0.9em; }
    .te-info-value {
      font-weight: 800;
      font-size: 0.95em;
      color: #1e293b;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .te-info-item.full-width {
      grid-column: 1 / -1;
    }

    /* Warehouse Flow */
    .te-wh-flow {
      margin: 0 16px;
      padding: 14px 18px;
      background: linear-gradient(135deg, #eef2ff, #e0e7ff);
      border-radius: 16px;
      border: 1.5px solid #c7d2fe;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }
    .te-wh-box {
      text-align: center;
      flex: 1;
      min-width: 0;
    }
    .te-wh-label {
      font-size: 0.7em;
      font-weight: 700;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .te-wh-name {
      font-weight: 800;
      font-size: 0.88em;
      color: #312e81;
      word-break: break-word;
    }
    .te-wh-arrow {
      font-size: 1.4em;
      color: #6366f1;
      flex-shrink: 0;
      animation: teArrowPulse 2s ease-in-out infinite;
    }
    @keyframes teArrowPulse {
      0%, 100% { opacity: 0.6; transform: translateX(0); }
      50% { opacity: 1; transform: translateX(-4px); }
    }

    /* Items Section */
    .te-popup-items {
      padding: 14px 16px;
    }
    .te-popup-items-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .te-popup-items-title {
      font-weight: 800;
      font-size: 0.95em;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .te-items-count-badge {
      background: #e0e7ff;
      color: #4338ca;
      font-size: 0.78em;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .te-items-total-badge {
      background: #f0fdf4;
      color: #166534;
      font-size: 0.78em;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Item Cards - compact */
    .te-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 10px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s;
    }
    .te-item-card:hover {
      border-color: #c7d2fe;
      background: #fff;
    }
    .te-item-num {
      width: 24px;
      height: 24px;
      background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.72em;
      color: #4338ca;
      flex-shrink: 0;
    }
    .te-item-details {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;
    }
    .te-item-code {
      font-weight: 700;
      font-size: 0.82em;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .te-item-name-tag {
      font-size: 0.72em;
      color: #64748b;
      font-weight: 500;
      display: none;
    }
    .te-item-field {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .te-item-field-label {
      font-size: 0.68em;
      color: #94a3b8;
      font-weight: 600;
    }
    .te-item-field-value {
      font-size: 0.8em;
      color: #334155;
      font-weight: 700;
    }
    .te-item-stock-ok { color: #059669; }
    .te-item-stock-low { color: #dc2626; }

    /* Popup actions */
    .te-popup-actions {
      padding: 12px 16px 28px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .te-action-btn {
      height: 50px;
      border-radius: 14px;
      border: none;
      font-weight: 800;
      font-size: 0.92em;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .te-action-btn::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(135deg, transparent, rgba(255,255,255,0.1));
      pointer-events: none;
    }
    .te-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .te-action-btn:active:not(:disabled) { transform: scale(0.97); }
    .te-btn-submit {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);
    }
    .te-btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(16, 185, 129, 0.45); }
    .te-btn-cancel {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: #fff;
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.35);
    }
    .te-btn-cancel:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(239, 68, 68, 0.45); }
    .te-btn-delete {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: #fff;
      box-shadow: 0 4px 15px rgba(249, 115, 22, 0.35);
    }
    .te-btn-delete:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(249, 115, 22, 0.45); }
    .te-btn-close-popup {
      background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
      color: #475569;
      grid-column: 1 / -1;
    }
    .te-btn-close-popup:hover { background: linear-gradient(135deg, #cbd5e1, #94a3b8); color: #1e293b; }

    /* Responsive */
    @media (max-width: 500px) {
      .te-header { padding: 12px 10px; }
      .te-summary { gap: 6px; padding: 10px 10px 0; }
      .te-summary-count { font-size: 1.4em; }
      .te-filters { padding: 8px 10px; }
      .te-list { padding: 0 10px 10px; }
      .te-entry-card { padding: 12px 12px; }
      .te-popup-info { grid-template-columns: 1fr 1fr; }
      .te-popup-banner { margin: 10px 12px 0; padding: 14px 16px; }
      .te-popup-items { padding: 12px 12px; }
      .te-popup-actions { padding: 10px 12px 24px; }
      .te-wh-flow { margin: 0 12px; }
      .te-item-details { grid-template-columns: 1fr 1fr; }
    }
  </style>`;

  // ── HTML Structure ──
  const html = `
    <div class="te-page">
      <div class="te-header">
        <div class="te-header-title">
          <i class="fa fa-exchange"></i>
          ${TEXT.TITLE}
        </div>
        <div class="te-header-actions">
          <button class="te-hdr-btn te-refresh-btn" id="te-refresh-btn" title="${TEXT.REFRESH}">
            <i class="fa fa-refresh"></i>
          </button>
          <button class="te-hdr-btn te-home-btn" id="te-home-btn">
            <i class="fa fa-home"></i>
            ${TEXT.HOME}
          </button>
        </div>
      </div>

      <div class="te-summary" id="te-summary"></div>

      <div class="te-filters" id="te-filters"></div>

      <div class="te-submit-all-bar" id="te-submit-all-bar">
        <button class="te-submit-all-btn" id="te-submit-all-btn">
          <i class="fa fa-check-double"></i>
          ${TEXT.SUBMIT_ALL}
        </button>
      </div>

      <div class="te-list" id="te-list"></div>

      <div class="te-pagination" id="te-pagination"></div>
    </div>

    <!-- Detail Popup Overlay -->
    <div class="te-overlay" id="te-overlay">
      <div class="te-popup" id="te-popup">
        <div class="te-popup-handle"></div>
        <div id="te-popup-banner"></div>
        <div class="te-popup-info" id="te-popup-info"></div>
        <div id="te-popup-wh-flow"></div>
        <div class="te-popup-items" id="te-popup-items"></div>
        <div class="te-popup-actions" id="te-popup-actions"></div>
      </div>
    </div>

  `;

  $(wrapper).html(css + html);

  // ── Event Handlers ──
  $('#te-home-btn').on('click', () => window.location.href = '/main');
  $('#te-refresh-btn').on('click', () => loadEntries());
  $('#te-overlay').on('click', function(e) {
    if (e.target === this) closePopup();
  });
  $(document).on('click', '#te-popup-banner-close', closePopup);

  // ── Render Summary Cards ──
  function renderSummary() {
    const activeDocstatus = currentFilters.docstatus;
    $('#te-summary').html(`
      <div class="te-summary-card ${activeDocstatus === null ? 'active' : ''}" data-docstatus="all">
        <div class="te-summary-count" style="color: #667eea;">${summary.draft_count + summary.submitted_count + summary.cancelled_count}</div>
        <div class="te-summary-label">${TEXT.ALL}</div>
      </div>
      <div class="te-summary-card ${activeDocstatus === 0 ? 'active' : ''}" data-docstatus="0">
        <div class="te-summary-count te-draft-color">${summary.draft_count}</div>
        <div class="te-summary-label">${TEXT.DRAFT}</div>
      </div>
      <div class="te-summary-card ${activeDocstatus === 1 ? 'active' : ''}" data-docstatus="1">
        <div class="te-summary-count te-submitted-color">${summary.submitted_count}</div>
        <div class="te-summary-label">${TEXT.SUBMITTED}</div>
      </div>
    `);

    $('.te-summary-card').on('click', function() {
      const ds = $(this).data('docstatus');
      currentFilters.docstatus = ds === 'all' ? null : parseInt(ds);
      currentPage = 1;
      loadEntries();
    });
  }

  // ── Filter Dropdown Logic ──
  let searchTimer;
  function closeAllDropdowns() {
    $('.te-filter-dropdown').removeClass('open');
  }

  function toggleDropdown($wrapper, options, currentValue, onSelect) {
    const $dd = $wrapper.find('.te-filter-dropdown');
    const wasOpen = $dd.hasClass('open');
    closeAllDropdowns();
    if (wasOpen) return;

    let html = '';
    options.forEach(opt => {
      const selected = String(opt.value) === String(currentValue) ? 'selected' : '';
      html += `<div class="te-filter-dd-item ${selected}" data-value="${opt.value}">${opt.label}</div>`;
    });
    $dd.html(html).addClass('open');

    $dd.find('.te-filter-dd-item').on('click', function(e) {
      e.stopPropagation();
      const val = $(this).data('value');
      closeAllDropdowns();
      onSelect(val === '' ? null : val);
    });
  }

  // Close dropdowns on outside click
  $(document).on('click', function(e) {
    if (!$(e.target).closest('.te-filter-wrapper').length) {
      closeAllDropdowns();
    }
  });

  // ── Render Filters ──
  function renderFilters() {
    if (filtersRendered) return;
    filtersRendered = true;

    let profileFilterBtn = '';
    if (isAdmin && profilesList.length) {
      profileFilterBtn = `<div class="te-filter-wrapper" id="te-filter-profile-wrap">
        <button class="te-filter-btn" id="te-filter-profile-btn">
          <span>${TEXT.PROFILE}</span>
          <i class="fa fa-chevron-down"></i>
        </button>
        <div class="te-filter-dropdown" id="te-filter-profile-dd"></div>
      </div>`;
    }

    $('#te-filters').html(`
      <div class="te-filter-group">
        <div class="te-filter-wrapper" id="te-filter-type-wrap">
          <button class="te-filter-btn" id="te-filter-type-btn">
            <span>${TEXT.TRANSFER_TYPE}</span>
            <i class="fa fa-chevron-down"></i>
          </button>
          <div class="te-filter-dropdown" id="te-filter-type-dd"></div>
        </div>
        ${profileFilterBtn}
        <input type="text" class="te-filter-input te-search-input" id="te-filter-search" placeholder="${TEXT.SEARCH}" value="">
      </div>
    `);

    // Transfer type button
    $('#te-filter-type-btn').on('click', function(e) {
      e.stopPropagation();
      toggleDropdown($('#te-filter-type-wrap'), [
        { value: '', label: TEXT.ALL },
        { value: 'تحميل', label: TEXT.TAHMEL },
        { value: 'تفريغ', label: TEXT.TAFREEGH }
      ], currentFilters.transfer_type || '', function(val) {
        currentFilters.transfer_type = val;
        updateFilterBtnLabel('#te-filter-type-btn', TEXT.TRANSFER_TYPE, val);
        currentPage = 1;
        loadEntries();
      });
    });

    // Profile button
    if (isAdmin && profilesList.length) {
      $('#te-filter-profile-btn').on('click', function(e) {
        e.stopPropagation();
        const opts = [{ value: '', label: TEXT.ALL }];
        profilesList.forEach(p => {
          opts.push({ value: p.name, label: p.user || p.name });
        });
        toggleDropdown($('#te-filter-profile-wrap'), opts, currentFilters.mini_pos_profile || '', function(val) {
          currentFilters.mini_pos_profile = val;
          const label = val ? (profilesList.find(p => p.name === val) || {}).user || val : null;
          updateFilterBtnLabel('#te-filter-profile-btn', TEXT.PROFILE, label);
          currentPage = 1;
          loadEntries();
        });
      });
    }

    // Search
    $('#te-filter-search').on('input', function() {
      clearTimeout(searchTimer);
      const val = $(this).val();
      searchTimer = setTimeout(() => {
        currentFilters.search = val || null;
        currentPage = 1;
        loadEntries();
      }, 400);
    });
  }

  function updateFilterBtnLabel(selector, defaultLabel, value) {
    const $btn = $(selector);
    if (value) {
      $btn.addClass('has-value').find('span').text(value);
    } else {
      $btn.removeClass('has-value').find('span').text(defaultLabel);
    }
  }

  // ── Render Entry List ──
  function renderEntries(entries) {
    if (!entries || !entries.length) {
      $('#te-list').html(`
        <div class="te-empty">
          <i class="fa fa-inbox"></i>
          <div class="te-empty-title">${TEXT.NO_ENTRIES}</div>
          <div class="te-empty-hint">${TEXT.NO_ENTRIES_HINT}</div>
        </div>
      `);
      return;
    }

    let html = '';
    entries.forEach(e => {
      const statusClass = e.docstatus === 0 ? 'draft' : e.docstatus === 1 ? 'submitted' : 'cancelled';
      const statusLabel = e.docstatus === 0 ? TEXT.DRAFT : e.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED;
      const badgeClass = e.docstatus === 0 ? 'te-badge-draft' : e.docstatus === 1 ? 'te-badge-submitted' : 'te-badge-cancelled';
      const transferType = e.transfer_type || '';
      const date = e.posting_date || '';
      const time = e.posting_time ? String(e.posting_time).substring(0, 5) : '';
      const warehouses = [];
      if (e.source_warehouse) warehouses.push(e.source_warehouse.split(' - ')[0]);
      if (e.target_warehouse) warehouses.push(e.target_warehouse.split(' - ')[0]);
      const whText = warehouses.length === 2 ? `${warehouses[0]} → ${warehouses[1]}` : '';
      const profileBadge = isAdmin && e.mini_pos_profile ? `<span style="font-size:0.72em;color:#6366f1;font-weight:600;"><i class="fa fa-user-circle"></i> ${e.mini_pos_profile}</span>` : '';

      html += `
        <div class="te-entry-card ${statusClass}" data-name="${e.name}">
          <div class="te-entry-row1">
            <div class="te-entry-name">
              ${e.name}
              <span class="te-entry-badge ${badgeClass}">${statusLabel}</span>
              ${transferType ? `<span class="te-badge-type">${transferType}</span>` : ''}
            </div>
          </div>
          <div class="te-entry-row2">
            <div class="te-entry-meta">
              <span><i class="fa fa-calendar"></i>${date}</span>
              ${time ? `<span><i class="fa fa-clock-o"></i>${time}</span>` : ''}
              ${whText ? `<span><i class="fa fa-warehouse"></i>${whText}</span>` : ''}
              ${profileBadge}
            </div>
            <div class="te-entry-qty">
              ${e.items_count || 0} ${TEXT.ITEMS} · ${format_number(e.total_qty)} ${TEXT.QTY}
            </div>
          </div>
        </div>
      `;
    });

    $('#te-list').html(html);

    // Click to open detail popup
    $('.te-entry-card').on('click', function() {
      const name = $(this).data('name');
      openDetailPopup(name);
    });
  }

  // ── Render Pagination ──
  function renderPagination() {
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

    if (totalPages <= 1) {
      $('#te-pagination').html('');
      return;
    }

    $('#te-pagination').html(`
      <button class="te-page-btn" id="te-prev-btn" ${currentPage <= 1 ? 'disabled' : ''}>${TEXT.PREV}</button>
      <span class="te-page-info">${TEXT.PAGE_OF(currentPage, totalPages)}</span>
      <button class="te-page-btn" id="te-next-btn" ${currentPage >= totalPages ? 'disabled' : ''}>${TEXT.NEXT}</button>
    `);

    $('#te-prev-btn').on('click', () => { if (currentPage > 1) { currentPage--; loadEntries(); } });
    $('#te-next-btn').on('click', () => { if (currentPage < totalPages) { currentPage++; loadEntries(); } });
  }

  // ── Submit All Drafts ──
  function renderSubmitAllBar() {
    const showBar = currentFilters.docstatus === 0 && summary.draft_count > 0;
    if (showBar) {
      $('#te-submit-all-bar').addClass('visible');
      $('#te-submit-all-btn').html(`<i class="fa fa-check-double"></i> ${TEXT.SUBMIT_ALL} (${summary.draft_count})`);
    } else {
      $('#te-submit-all-bar').removeClass('visible');
    }
  }

  async function submitAllDrafts() {
    const confirmed = await new Promise(resolve => {
      frappe.confirm(TEXT.CONFIRM_SUBMIT_ALL, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;

    const btn = $('#te-submit-all-btn');
    btn.prop('disabled', true);

    try {
      // Fetch all draft entry names for current filters
      const res = await frappe.call({
        method: `${API}.get_transfer_entries`,
        args: {
          page: 1,
          page_size: 500,
          docstatus: 0,
          transfer_type: currentFilters.transfer_type,
          mini_pos_profile: currentFilters.mini_pos_profile,
          search: currentFilters.search
        }
      });

      const drafts = (res.message && res.message.entries) || [];
      if (!drafts.length) {
        frappe.show_alert({ message: TEXT.NO_ENTRIES, indicator: 'orange' }, 3);
        btn.prop('disabled', false);
        return;
      }

      let done = 0;
      let errors = 0;
      for (const entry of drafts) {
        try {
          btn.html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SUBMIT_ALL_PROGRESS(done + 1, drafts.length)}`);
          await frappe.call({ method: `${API}.submit_entry`, args: { entry_name: entry.name } });
          done++;
        } catch (e) {
          console.error('Submit error:', entry.name, e);
          errors++;
        }
      }

      frappe.show_alert({ message: TEXT.SUBMIT_ALL_SUCCESS(done), indicator: 'green' }, 4);
      loadEntries();
    } catch (e) {
      frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
    } finally {
      btn.prop('disabled', false);
      btn.html(`<i class="fa fa-check-double"></i> ${TEXT.SUBMIT_ALL}`);
    }
  }

  $('#te-submit-all-btn').on('click', submitAllDrafts);

  // ── Load Entries from API ──
  async function loadEntries() {
    $('#te-list').html(`
      <div class="te-loading">
        <i class="fa fa-spinner fa-spin"></i>
        ${TEXT.LOADING}...
      </div>
    `);

    try {
      const res = await frappe.call({
        method: `${API}.get_transfer_entries`,
        args: {
          page: currentPage,
          page_size: 20,
          docstatus: currentFilters.docstatus,
          transfer_type: currentFilters.transfer_type,
          mini_pos_profile: currentFilters.mini_pos_profile,
          search: currentFilters.search
        }
      });

      const data = res.message || {};
      totalEntries = data.total || 0;
      isAdmin = data.is_admin || false;
      profilesList = data.profiles_list || [];
      summary = data.summary || { draft_count: 0, submitted_count: 0, cancelled_count: 0 };

      renderSummary();
      renderFilters();
      renderSubmitAllBar();
      renderEntries(data.entries || []);
      renderPagination();
    } catch (e) {
      $('#te-list').html(`
        <div class="te-empty">
          <i class="fa fa-exclamation-triangle" style="color: #ef4444;"></i>
          <div class="te-empty-title" style="color: #ef4444;">${e.message || 'Error'}</div>
        </div>
      `);
    }
  }

  // ── Detail Popup ──
  let currentDetailEntry = null;

  async function openDetailPopup(entryName) {
    // Show loading state in banner
    $('#te-popup-banner').html(`
      <div class="te-popup-banner draft-banner">
        <div class="te-banner-right">
          <div class="te-banner-icon"><i class="fa fa-spinner fa-spin"></i></div>
          <div class="te-banner-info">
            <div class="te-banner-name">${TEXT.LOADING}...</div>
          </div>
        </div>
      </div>
    `);
    $('#te-popup-info').html('');
    $('#te-popup-wh-flow').html('');
    $('#te-popup-items').html('');
    $('#te-popup-actions').html('');
    $('#te-overlay').addClass('open');

    try {
      const res = await frappe.call({
        method: `${API}.get_entry_details`,
        args: { entry_name: entryName }
      });
      const d = res.message;
      if (!d) throw new Error('No data');
      currentDetailEntry = d;

      const statusLabel = d.docstatus === 0 ? TEXT.DRAFT : d.docstatus === 1 ? TEXT.SUBMITTED : TEXT.CANCELLED;
      const bannerClass = d.docstatus === 0 ? 'draft-banner' : d.docstatus === 1 ? 'submitted-banner' : 'cancelled-banner';
      const bannerIcon = d.docstatus === 0 ? 'fa-pencil' : d.docstatus === 1 ? 'fa-check-circle' : 'fa-times-circle';

      // Status Banner
      $('#te-popup-banner').html(`
        <div class="te-popup-banner ${bannerClass}">
          <div class="te-banner-right">
            <div class="te-banner-icon"><i class="fa ${bannerIcon}"></i></div>
            <div class="te-banner-info">
              <div class="te-banner-name">${d.name}</div>
              <div class="te-banner-status">${statusLabel}</div>
            </div>
          </div>
          <button class="te-banner-close" id="te-popup-banner-close"><i class="fa fa-times"></i></button>
        </div>
      `);

      // Info Grid - 2 fields per row
      const transferTypeInfo = d.transfer_type ? `
        <div class="te-info-item">
          <div class="te-info-label"><i class="fa fa-tag"></i> ${TEXT.TRANSFER_TYPE}</div>
          <div class="te-info-value">${d.transfer_type}</div>
        </div>` : '';

      const profileInfo = d.mini_pos_profile ? `
        <div class="te-info-item">
          <div class="te-info-label"><i class="fa fa-user-circle"></i> ${TEXT.PROFILE}</div>
          <div class="te-info-value">${d.mini_pos_profile}</div>
        </div>` : '';

      $('#te-popup-info').html(`
        <div class="te-info-item">
          <div class="te-info-label"><i class="fa fa-calendar"></i> ${TEXT.DATE}</div>
          <div class="te-info-value">${d.posting_date}</div>
        </div>
        <div class="te-info-item">
          <div class="te-info-label"><i class="fa fa-clock-o"></i> ${TEXT.TIME}</div>
          <div class="te-info-value">${d.posting_time || '-'}</div>
        </div>
        ${transferTypeInfo}
        <div class="te-info-item">
          <div class="te-info-label"><i class="fa fa-cubes"></i> ${TEXT.TOTAL_QTY}</div>
          <div class="te-info-value">${format_number(d.total_qty)}</div>
        </div>
        ${profileInfo}
        <div class="te-info-item">
          <div class="te-info-label"><i class="fa fa-user"></i> ${TEXT.OWNER}</div>
          <div class="te-info-value">${d.owner || '-'}</div>
        </div>
      `);

      // Warehouse Flow
      if (d.source_warehouse || d.target_warehouse) {
        $('#te-popup-wh-flow').html(`
          <div class="te-wh-flow">
            <div class="te-wh-box">
              <div class="te-wh-label">${TEXT.FROM_WH}</div>
              <div class="te-wh-name">${d.source_warehouse || '-'}</div>
            </div>
            <div class="te-wh-arrow"><i class="fa fa-long-arrow-left"></i></div>
            <div class="te-wh-box">
              <div class="te-wh-label">${TEXT.TO_WH}</div>
              <div class="te-wh-name">${d.target_warehouse || '-'}</div>
            </div>
          </div>
        `);
      }

      // Items as cards with 2 fields per row
      const totalItemsQty = d.items.reduce((sum, it) => sum + (it.qty || 0), 0);
      let itemsHtml = `
        <div class="te-popup-items-header">
          <div class="te-popup-items-title">
            <i class="fa fa-list"></i> ${TEXT.ITEMS}
            <span class="te-items-count-badge">${d.items.length}</span>
          </div>
          <div class="te-items-total-badge">
            <i class="fa fa-cubes"></i> ${format_number(totalItemsQty)}
          </div>
        </div>
      `;
      d.items.forEach((item, idx) => {
        const stockClass = item.actual_qty >= item.qty ? 'te-item-stock-ok' : 'te-item-stock-low';
        itemsHtml += `
          <div class="te-item-card">
            <div class="te-item-num">${idx + 1}</div>
            <div class="te-item-details">
              <div class="te-item-code">${item.item_code}</div>
              <div class="te-item-field">
                <span class="te-item-field-label">${TEXT.QTY}:</span>
                <span class="te-item-field-value">${format_number(item.qty)}</span>
              </div>
              <div class="te-item-field">
                <span class="te-item-field-label">${TEXT.UOM}:</span>
                <span class="te-item-field-value">${item.uom || item.stock_uom || '-'}</span>
              </div>
              <div class="te-item-field">
                <span class="te-item-field-label">${TEXT.STOCK_AVAIL}:</span>
                <span class="te-item-field-value ${stockClass}">${format_number(item.actual_qty)}</span>
              </div>
            </div>
          </div>
        `;
      });
      $('#te-popup-items').html(itemsHtml);

      // Actions - 2 per row
      let actionsHtml = '';
      if (d.docstatus === 0) {
        actionsHtml += `
          <button class="te-action-btn te-btn-submit" id="te-btn-submit">
            <i class="fa fa-check"></i> ${TEXT.SUBMIT}
          </button>
          <button class="te-action-btn te-btn-delete" id="te-btn-delete">
            <i class="fa fa-trash"></i> ${TEXT.DELETE}
          </button>
        `;
      } else if (d.docstatus === 1) {
        actionsHtml += `
          <button class="te-action-btn te-btn-cancel" id="te-btn-cancel-entry">
            <i class="fa fa-ban"></i> ${TEXT.CANCEL_ENTRY}
          </button>
        `;
      }
      actionsHtml += `
        <button class="te-action-btn te-btn-close-popup" id="te-btn-close">
          <i class="fa fa-times"></i> ${TEXT.CLOSE}
        </button>
      `;
      $('#te-popup-actions').html(actionsHtml);

      // Bind action buttons
      $('#te-btn-submit').on('click', () => submitEntry(d.name));
      $('#te-btn-delete').on('click', () => deleteEntry(d.name));
      $('#te-btn-cancel-entry').on('click', () => cancelEntry(d.name));
      $('#te-btn-close').on('click', closePopup);

    } catch (e) {
      $('#te-popup-banner').html(`
        <div class="te-popup-banner cancelled-banner">
          <div class="te-banner-right">
            <div class="te-banner-icon"><i class="fa fa-exclamation-triangle"></i></div>
            <div class="te-banner-info">
              <div class="te-banner-name">خطأ</div>
              <div class="te-banner-status">${e.message || 'Error loading details'}</div>
            </div>
          </div>
          <button class="te-banner-close" id="te-popup-banner-close"><i class="fa fa-times"></i></button>
        </div>
      `);
    }
  }

  function closePopup() {
    $('#te-overlay').removeClass('open');
    currentDetailEntry = null;
  }

  // ── Actions ──
  async function submitEntry(name) {
    const confirmed = await new Promise(resolve => {
      frappe.confirm(TEXT.CONFIRM_SUBMIT, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;

    $('#te-btn-submit').prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i>`);
    try {
      await frappe.call({ method: `${API}.submit_entry`, args: { entry_name: name } });
      frappe.show_alert({ message: TEXT.SUBMIT_SUCCESS, indicator: 'green' }, 3);
      closePopup();
      loadEntries();
    } catch (e) {
      frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
      $('#te-btn-submit').prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SUBMIT}`);
    }
  }

  async function cancelEntry(name) {
    const confirmed = await new Promise(resolve => {
      frappe.confirm(TEXT.CONFIRM_CANCEL, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;

    $('#te-btn-cancel-entry').prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i>`);
    try {
      await frappe.call({ method: `${API}.cancel_entry`, args: { entry_name: name } });
      frappe.show_alert({ message: TEXT.CANCEL_SUCCESS, indicator: 'green' }, 3);
      closePopup();
      loadEntries();
    } catch (e) {
      frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
      $('#te-btn-cancel-entry').prop('disabled', false).html(`<i class="fa fa-ban"></i> ${TEXT.CANCEL_ENTRY}`);
    }
  }

  async function deleteEntry(name) {
    const confirmed = await new Promise(resolve => {
      frappe.confirm(TEXT.CONFIRM_DELETE, () => resolve(true), () => resolve(false));
    });
    if (!confirmed) return;

    $('#te-btn-delete').prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i>`);
    try {
      await frappe.call({ method: `${API}.delete_entry`, args: { entry_name: name } });
      frappe.show_alert({ message: TEXT.DELETE_SUCCESS, indicator: 'green' }, 3);
      closePopup();
      loadEntries();
    } catch (e) {
      frappe.show_alert({ message: e.message || 'Error', indicator: 'red' }, 4);
      $('#te-btn-delete').prop('disabled', false).html(`<i class="fa fa-trash"></i> ${TEXT.DELETE}`);
    }
  }

  // ── Initial Load ──
  loadEntries();
};
