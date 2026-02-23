import frappe
from frappe import _
from frappe.utils import flt, nowdate
import json
import random
import string


def get_profile_or_throw():
    """Get the current user's Mini POS Profile."""
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)

    profiles = frappe.get_all(
        "Mini POS Profile",
        filters={"disabled": 0},
        fields=["name", "user", "owner", "company", "warehouse"],
        order_by="creation asc",
        ignore_permissions=True
    )
    user_lower = user.lower()
    profile = None

    for row in profiles:
        assigned_user = (row.get("user") or "").strip()
        if assigned_user and assigned_user.lower() == user_lower:
            profile = row
            break

    if not profile:
        for row in profiles:
            owner = (row.get("owner") or "").strip()
            if owner and owner.lower() == user_lower:
                profile = row
                break

    if not profile:
        frappe.throw(_("No active Mini POS Profile found for your user."))

    return frappe.get_doc("Mini POS Profile", profile.name)


@frappe.whitelist()
def get_context():
    """Get profile context: company, modes of payment, customers, suppliers."""
    profile = get_profile_or_throw()
    company = profile.company

    all_modes = frappe.get_all(
        "Mode of Payment",
        filters={"enabled": 1},
        fields=["name"],
        ignore_permissions=True
    )
    modes = []
    for m in all_modes:
        accounts = frappe.get_all(
            "Mode of Payment Account",
            filters={"parent": m.name, "company": company},
            fields=["default_account"],
            ignore_permissions=True
        )
        if accounts and accounts[0].default_account:
            modes.append(m.name)

    customers = frappe.get_all(
        "Customer",
        filters={"disabled": 0},
        fields=["name", "customer_name"],
        order_by="customer_name asc",
        limit=500,
        ignore_permissions=True
    )

    suppliers = frappe.get_all(
        "Supplier",
        filters={"disabled": 0},
        fields=["name", "supplier_name"],
        order_by="supplier_name asc",
        limit=500,
        ignore_permissions=True
    )

    return {
        "company": company,
        "modes": modes,
        "customers": customers,
        "suppliers": suppliers,
        "profile_name": profile.name
    }


@frappe.whitelist()
def create_payment_entry(data):
    """Create a Payment Entry (Receive or Pay)."""
    profile = get_profile_or_throw()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    payment_type = data.get("payment_type")
    if payment_type not in ("Receive", "Pay"):
        frappe.throw(_("Invalid payment type. Must be 'Receive' or 'Pay'."))

    party_type = data.get("party_type")
    if party_type not in ("Customer", "Supplier"):
        frappe.throw(_("Invalid party type. Must be 'Customer' or 'Supplier'."))

    party = data.get("party")
    if not party:
        frappe.throw(_("Party is required."))

    mode_of_payment = data.get("mode_of_payment")
    if not mode_of_payment:
        frappe.throw(_("Mode of Payment is required."))

    amount = flt(data.get("amount"))
    if amount <= 0:
        frappe.throw(_("Amount must be greater than zero."))

    company = profile.company

    try:
        mop = frappe.get_doc("Mode of Payment", mode_of_payment)
    except frappe.DoesNotExistError:
        frappe.throw(_("Mode of Payment {0} not found").format(mode_of_payment))

    mop_account = None
    for row in mop.accounts:
        if row.company == company:
            mop_account = row.default_account
            break

    if not mop_account:
        frappe.throw(_("No account found in Mode of Payment '{0}' for company '{1}'").format(
            mode_of_payment, company
        ))

    if payment_type == "Receive":
        if party_type == "Customer":
            paid_from = frappe.get_value("Company", company, "default_receivable_account")
        else:
            paid_from = frappe.get_value("Company", company, "default_payable_account")
        paid_to = mop_account
    else:
        paid_from = mop_account
        if party_type == "Supplier":
            paid_to = frappe.get_value("Company", company, "default_payable_account")
        else:
            paid_to = frappe.get_value("Company", company, "default_receivable_account")

    if not paid_from:
        frappe.throw(_("Default account not found for company '{0}'").format(company))
    if not paid_to:
        frappe.throw(_("Default account not found for company '{0}'").format(company))

    pe = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": payment_type,
        "party_type": party_type,
        "party": party,
        "company": company,
        "posting_date": nowdate(),
        "paid_from": paid_from,
        "paid_to": paid_to,
        "paid_amount": amount,
        "received_amount": amount,
        "mode_of_payment": mode_of_payment,
        "reference_no": "POS-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8)),
        "reference_date": nowdate(),
        "custom_mini_pos_profile": profile.name,
        "references": []
    })

    remarks = data.get("remarks")
    if remarks:
        pe.remarks = remarks

    pe.insert(ignore_permissions=True)
    pe.submit()
    frappe.db.commit()

    return {
        "name": pe.name,
        "payment_type": pe.payment_type,
        "party": pe.party,
        "amount": pe.paid_amount
    }


@frappe.whitelist()
def get_recent_entries(limit=20):
    """Get recent payment entries created from this page."""
    profile = get_profile_or_throw()

    entries = frappe.get_all(
        "Payment Entry",
        filters={
            "company": profile.company,
            "custom_mini_pos_profile": profile.name,
            "docstatus": ["in", [0, 1]]
        },
        fields=[
            "name", "payment_type", "party_type", "party", "party_name",
            "paid_amount", "mode_of_payment", "posting_date", "docstatus"
        ],
        order_by="creation desc",
        limit=limit,
        ignore_permissions=True
    )

    return entries
