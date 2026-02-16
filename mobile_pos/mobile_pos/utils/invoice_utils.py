import frappe
from frappe.utils import flt


def get_customer_balance(customer, company):
    """
    Get customer balance from GL Entry for a specific company.
    Uses frappe's get_party_account_balance which respects company filter.

    Returns positive value if customer owes money (debit balance).
    """
    if not customer or not company:
        return 0

    # Get the receivable account for this customer/company
    from erpnext.accounts.party import get_party_account
    receivable_account = get_party_account("Customer", customer, company)

    if not receivable_account:
        return 0

    # Get balance from GL Entry - sum(debit) - sum(credit) for this customer
    balance = frappe.db.sql("""
        SELECT SUM(debit) - SUM(credit) as balance
        FROM `tabGL Entry`
        WHERE party_type = 'Customer'
        AND party = %s
        AND company = %s
        AND is_cancelled = 0
    """, (customer, company), as_dict=True)

    if balance and balance[0].balance:
        return flt(balance[0].balance, 2)

    return 0


def fix_incoming_rate_on_submit(doc, method=None):
    """
    Hook on Sales Invoice submit.
    Corrects incoming_rate on items where it's wrong or missing.
    incoming_rate should be per Stock UOM (from SLE valuation_rate).
    """
    if not doc.custom_mini_pos_profile:
        return

    for item in doc.items:
        cf = flt(item.conversion_factor)
        inc = flt(item.incoming_rate)

        if cf <= 1 and inc > 0:
            continue

        # Get valuation_rate from Stock Ledger Entry
        sle_val = frappe.db.get_value(
            "Stock Ledger Entry",
            {
                "item_code": item.item_code,
                "voucher_no": doc.name,
                "voucher_type": "Sales Invoice",
                "is_cancelled": 0
            },
            "valuation_rate"
        )
        sle_val = flt(sle_val)

        if sle_val == 0:
            continue

        if inc == 0:
            # Missing incoming_rate - set from SLE
            frappe.db.set_value("Sales Invoice Item", item.name,
                "incoming_rate", sle_val, update_modified=False)
        elif cf > 1 and abs(inc - sle_val * cf) < 5 and abs(inc - sle_val) >= 1:
            # incoming_rate stored per Sales UOM (box) instead of per Stock UOM (piece)
            frappe.db.set_value("Sales Invoice Item", item.name,
                "incoming_rate", sle_val, update_modified=False)
        elif cf > 1 and inc > sle_val * 1.5:
            # incoming_rate is much higher than SLE val_rate - likely per box
            frappe.db.set_value("Sales Invoice Item", item.name,
                "incoming_rate", sle_val, update_modified=False)


def set_customer_balance_before_save(doc, method=None):
    """
    Hook on Sales Invoice before_save.
    Calculates projected customer balance after this invoice (for draft state).
    Formula: current GL balance + outstanding_amount (grand_total - paid)
    This gives an estimate before GL entries exist.
    """
    try:
        if not doc.customer or not doc.company:
            return

        current_balance = get_customer_balance(doc.customer, doc.company)
        grand_total = flt(doc.grand_total, 2)
        paid = flt(doc.paid_amount, 2) if hasattr(doc, 'paid_amount') else 0
        # For draft: projected balance = current balance + what this invoice will add
        # Invoice adds: grand_total (debit) - paid_amount (credit from payment)
        projected_addition = flt(grand_total - paid, 2)
        if doc.get("is_return"):
            # Returns reduce balance (credit note)
            projected_balance = flt(current_balance - grand_total, 2)
        else:
            projected_balance = flt(current_balance + projected_addition, 2)

        doc.custom_customer_balance_after = projected_balance
        doc.custom_paid_amount = paid

    except Exception as e:
        frappe.log_error(
            message=f"Error calculating projected balance for {doc.name}: {str(e)}",
            title="Mobile POS - Customer Balance Draft Error"
        )


def set_customer_balance_on_submit(doc, method=None):
    """
    Hook on Sales Invoice on_submit.
    Sets actual customer balance from GL Entry (GL entries exist at this point).
    Also stores the paid_amount for reference.
    """
    try:
        if not doc.customer or not doc.company:
            return

        paid_amount = flt(doc.paid_amount, 2) if hasattr(doc, 'paid_amount') else 0

        # GL entries are already created on_submit, get actual balance
        customer_balance = get_customer_balance(doc.customer, doc.company)

        doc.db_set('custom_paid_amount', paid_amount, update_modified=False)
        doc.db_set('custom_customer_balance_after', customer_balance, update_modified=False)

    except Exception as e:
        frappe.log_error(
            message=f"Error setting customer balance on invoice {doc.name}: {str(e)}",
            title="Mobile POS - Customer Balance Error"
        )


def set_represents_company(doc, method=None):
    """Set represents_company = company on transaction doctypes before save."""
    if doc.get("company") and not doc.get("represents_company"):
        doc.represents_company = doc.company


def set_item_price_company(doc, method=None):
    """Auto-set custom_company on Item Price if not provided."""
    if not doc.get("custom_company"):
        doc.custom_company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.db.get_value("Company", {}, "name")
