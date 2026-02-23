import frappe
from frappe import _
from frappe.utils import flt, nowdate
import json


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
    """Get profile context: company, modes of payment, expense types."""
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

    expenses = frappe.get_all(
        "Expense",
        filters={"company": company},
        fields=["name", "expense_name", "expense_account"],
        order_by="expense_name asc",
        ignore_permissions=True
    )

    return {
        "company": company,
        "modes": modes,
        "expenses": expenses,
        "profile_name": profile.name
    }


@frappe.whitelist()
def create_expense_entry(data):
    """Create an Expense Entry and auto-submit it (creates Journal Entry)."""
    profile = get_profile_or_throw()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    expense = data.get("expense")
    if not expense:
        frappe.throw(_("Expense type is required."))

    mode_of_payment = data.get("mode_of_payment")
    if not mode_of_payment:
        frappe.throw(_("Mode of Payment is required."))

    amount = flt(data.get("amount"))
    if amount <= 0:
        frappe.throw(_("Amount must be greater than zero."))

    company = profile.company

    doc = frappe.get_doc({
        "doctype": "Expense Entry",
        "posting_date": nowdate(),
        "company": company,
        "expense": expense,
        "mode_of_payment": mode_of_payment,
        "amount": amount,
        "remarks": data.get("remarks") or "",
        "mini_pos_profile": profile.name
    })

    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()

    return {
        "name": doc.name,
        "expense": doc.expense,
        "amount": doc.amount,
        "journal_entry": doc.journal_entry
    }


@frappe.whitelist()
def get_recent_entries(limit=20):
    """Get recent expense entries."""
    profile = get_profile_or_throw()

    entries = frappe.get_all(
        "Expense Entry",
        filters={
            "company": profile.company,
            "mini_pos_profile": profile.name,
            "docstatus": ["in", [0, 1]]
        },
        fields=[
            "name", "expense", "amount", "mode_of_payment",
            "posting_date", "remarks", "docstatus", "journal_entry"
        ],
        order_by="creation desc",
        limit=limit,
        ignore_permissions=True
    )

    return entries
