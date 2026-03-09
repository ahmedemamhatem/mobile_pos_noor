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
        return None

    return frappe.get_doc("Mini POS Profile", profile.name)


@frappe.whitelist()
def get_context():
    """Get profile context: company, modes of payment, expense types."""
    profile = get_profile_or_throw()
    if not profile:
        return {"company": "", "modes": [], "expenses": [], "profile_name": ""}
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
        filters={"company": company, "active": 1, "show_in_app": 1},
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
    if not profile:
        frappe.throw(_("Please set up a Mini POS Profile before creating expense entries."))
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    expense = data.get("expense")
    if not expense:
        frappe.throw(_("Expense type is required."))

    is_active = frappe.db.get_value("Expense", expense, "active")
    if not is_active:
        frappe.throw(_("Expense {0} is not active.").format(expense))

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
def get_recent_entries(limit=50):
    """Get recent expense entries."""
    profile = get_profile_or_throw()
    if not profile:
        return []

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

    # Fetch expense names
    expense_names = list(set(e.expense for e in entries if e.expense))
    expense_map = {}
    if expense_names:
        for exp in frappe.get_all("Expense", filters={"name": ["in", expense_names]}, fields=["name", "expense_name"], ignore_permissions=True):
            expense_map[exp.name] = exp.expense_name

    for e in entries:
        e["expense_name"] = expense_map.get(e.expense, e.expense)

    return entries


@frappe.whitelist()
def submit_expense_entry(name):
    """Submit a draft Expense Entry."""
    if not name:
        frappe.throw(_("Expense Entry name is required."))

    doc = frappe.get_doc("Expense Entry", name)
    if doc.docstatus != 0:
        frappe.throw(_("Only draft entries can be submitted."))

    doc.submit()
    frappe.db.commit()

    return {
        "name": doc.name,
        "docstatus": doc.docstatus,
        "journal_entry": doc.journal_entry
    }


@frappe.whitelist()
def cancel_expense_entry(name):
    """Cancel a submitted Expense Entry."""
    if not name:
        frappe.throw(_("Expense Entry name is required."))

    doc = frappe.get_doc("Expense Entry", name)
    if doc.docstatus != 1:
        frappe.throw(_("Only submitted entries can be cancelled."))

    doc.cancel()
    frappe.db.commit()

    return {
        "name": doc.name,
        "docstatus": doc.docstatus
    }
