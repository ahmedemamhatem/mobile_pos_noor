import frappe
from frappe import _


@frappe.whitelist()
def get_mop_balances():
    """Get balances for all Mode of Payment accounts for the user's POS profile company."""
    from mobile_pos.mobile_pos.page.mini_pos.api import get_profile_or_throw

    profile = get_profile_or_throw()
    company = profile.company

    if not company:
        frappe.throw(_("No company found in your POS profile."))

    # Get all enabled, non-group modes of payment that have an account for this company
    modes = frappe.db.sql("""
        SELECT
            mop.name AS mode_of_payment,
            mopa.default_account
        FROM `tabMode of Payment` mop
        INNER JOIN `tabMode of Payment Account` mopa ON mopa.parent = mop.name
        INNER JOIN `tabAccount` acc ON acc.name = mopa.default_account
        WHERE mopa.company = %(company)s
          AND mop.enabled = 1
          AND acc.is_group = 0
        ORDER BY mop.name
    """, {"company": company}, as_dict=True)

    if not modes:
        return {"modes": [], "total": 0, "company": company}

    # Get GL Entry balance for each account
    accounts = list(set(m.default_account for m in modes if m.default_account))

    balances = {}
    if accounts:
        placeholders = ", ".join(["%s"] * len(accounts))
        rows = frappe.db.sql(f"""
            SELECT
                account,
                SUM(debit) - SUM(credit) AS balance
            FROM `tabGL Entry`
            WHERE account IN ({placeholders})
              AND company = %s
              AND is_cancelled = 0
            GROUP BY account
        """, accounts + [company], as_dict=True)

        for row in rows:
            balances[row.account] = float(row.balance or 0)

    result = []
    total = 0
    for m in modes:
        balance = balances.get(m.default_account, 0)
        total += balance
        result.append({
            "mode_of_payment": m.mode_of_payment,
            "account": m.default_account,
            "balance": balance
        })

    return {
        "modes": result,
        "total": total,
        "company": company
    }


@frappe.whitelist()
def create_mop_transfer(from_mode_of_payment, to_mode_of_payment, amount, note=None, submit=0):
    """Create a Payment Entry (Internal Transfer) between two Mode of Payment accounts."""
    from mobile_pos.mobile_pos.page.mini_pos.api import get_profile_or_throw

    profile = get_profile_or_throw()
    company = profile.company

    amount = float(amount or 0)
    if amount <= 0:
        frappe.throw(_("Amount must be greater than zero."))

    if from_mode_of_payment == to_mode_of_payment:
        frappe.throw(_("Source and target mode of payment must be different."))

    # Get accounts for both modes of payment
    from_account = frappe.db.get_value(
        "Mode of Payment Account",
        {"parent": from_mode_of_payment, "company": company},
        "default_account"
    )
    to_account = frappe.db.get_value(
        "Mode of Payment Account",
        {"parent": to_mode_of_payment, "company": company},
        "default_account"
    )

    if not from_account:
        frappe.throw(_("No account found for {0} in company {1}").format(from_mode_of_payment, company))
    if not to_account:
        frappe.throw(_("No account found for {0} in company {1}").format(to_mode_of_payment, company))

    # Create Payment Entry - Internal Transfer
    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Internal Transfer"
    pe.company = company
    pe.posting_date = frappe.utils.today()
    pe.mode_of_payment = from_mode_of_payment
    pe.paid_from = from_account
    pe.paid_to = to_account
    pe.paid_amount = amount
    pe.received_amount = amount
    pe.reference_no = note or _("MoP Transfer")
    pe.reference_date = frappe.utils.today()
    pe.remarks = note or ""

    if hasattr(pe, 'custom_mini_pos_profile'):
        pe.custom_mini_pos_profile = profile.name

    pe.insert()

    if int(submit):
        pe.submit()

    frappe.db.commit()

    return {
        "name": pe.name,
        "docstatus": pe.docstatus,
        "status": "Submitted" if pe.docstatus == 1 else "Draft"
    }
