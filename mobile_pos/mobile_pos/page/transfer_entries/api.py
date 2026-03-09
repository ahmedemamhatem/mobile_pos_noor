import frappe
from frappe import _
from frappe.utils import flt, cint, nowdate, now_datetime


def _is_pos_admin():
    user = frappe.session.user
    if not user or user == "Guest":
        return False
    return frappe.db.get_value("User", user, "pos_user_type") == "Admin"


def get_profile_or_throw():
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    profile_name = frappe.db.get_value("Mini POS Profile", {"user": user}, "name")
    if not profile_name:
        frappe.throw(_("No POS Profile configured for this user"), frappe.PermissionError)
    return frappe.get_doc("Mini POS Profile", profile_name)


@frappe.whitelist()
def get_transfer_entries(
    page=1,
    page_size=20,
    transfer_type=None,
    docstatus=None,
    from_date=None,
    to_date=None,
    mini_pos_profile=None,
    search=None
):
    """Get paginated list of Stock Entry (Material Transfer) with filters.

    Admin users see all entries; non-admin see only their own profile entries.
    """
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    page = cint(page) or 1
    page_size = min(cint(page_size) or 20, 100)
    offset = (page - 1) * page_size

    conditions = ["se.company = %(company)s", "se.stock_entry_type = 'Material Transfer'"]
    params = {"company": company, "limit": page_size, "offset": offset}

    # Profile filter
    has_profile_field = frappe.get_meta("Stock Entry").has_field("mini_pos_profile")
    if is_admin and mini_pos_profile:
        if has_profile_field:
            conditions.append("se.mini_pos_profile = %(profile_filter)s")
        else:
            conditions.append("se.custom_mini_pos_profile = %(profile_filter)s")
        params["profile_filter"] = mini_pos_profile
    elif not is_admin:
        if has_profile_field:
            conditions.append("se.mini_pos_profile = %(own_profile)s")
        else:
            conditions.append("se.custom_mini_pos_profile = %(own_profile)s")
        params["own_profile"] = profile.name

    # Transfer type filter
    has_transfer_type = frappe.get_meta("Stock Entry").has_field("transfer_type")
    if transfer_type and has_transfer_type:
        conditions.append("se.transfer_type = %(transfer_type)s")
        params["transfer_type"] = transfer_type

    # Docstatus filter
    if docstatus is not None and docstatus != "":
        conditions.append("se.docstatus = %(docstatus)s")
        params["docstatus"] = cint(docstatus)

    # Date range
    if from_date:
        conditions.append("se.posting_date >= %(from_date)s")
        params["from_date"] = from_date
    if to_date:
        conditions.append("se.posting_date <= %(to_date)s")
        params["to_date"] = to_date

    # Search by name
    if search:
        conditions.append("se.name LIKE %(search)s")
        params["search"] = f"%{search}%"

    where_clause = " AND ".join(conditions)

    # Build select fields
    profile_field = "se.mini_pos_profile" if has_profile_field else "COALESCE(se.custom_mini_pos_profile, '') as mini_pos_profile"
    transfer_type_field = "se.transfer_type" if has_transfer_type else "'' as transfer_type"

    entries = frappe.db.sql("""
        SELECT
            se.name,
            se.posting_date,
            se.posting_time,
            se.docstatus,
            (SELECT COALESCE(SUM(sed_q.qty), 0) FROM `tabStock Entry Detail` sed_q WHERE sed_q.parent = se.name) as total_qty,
            COALESCE(se.total_amount, 0) as total_amount,
            {profile_field},
            {transfer_type_field},
            se.owner,
            se.creation,
            se.modified,
            (SELECT COUNT(*) FROM `tabStock Entry Detail` sed WHERE sed.parent = se.name) as items_count,
            (SELECT sed2.s_warehouse FROM `tabStock Entry Detail` sed2 WHERE sed2.parent = se.name LIMIT 1) as source_warehouse,
            (SELECT sed3.t_warehouse FROM `tabStock Entry Detail` sed3 WHERE sed3.parent = se.name LIMIT 1) as target_warehouse
        FROM `tabStock Entry` se
        WHERE {where_clause}
        ORDER BY se.creation DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """.format(
        profile_field=profile_field,
        transfer_type_field=transfer_type_field,
        where_clause=where_clause
    ), params, as_dict=True)

    # Total count
    total = frappe.db.sql("""
        SELECT COUNT(*) as cnt
        FROM `tabStock Entry` se
        WHERE {where_clause}
    """.format(where_clause=where_clause), params, as_dict=True)[0].cnt

    # Summary counts
    summary_conditions = list(conditions)
    # Remove docstatus filter for summary
    summary_conditions = [c for c in summary_conditions if "docstatus" not in c]
    summary_where = " AND ".join(summary_conditions)
    summary_params = {k: v for k, v in params.items() if k != "docstatus"}

    summary = frappe.db.sql("""
        SELECT
            COALESCE(SUM(CASE WHEN se.docstatus = 0 THEN 1 ELSE 0 END), 0) as draft_count,
            COALESCE(SUM(CASE WHEN se.docstatus = 1 THEN 1 ELSE 0 END), 0) as submitted_count,
            COALESCE(SUM(CASE WHEN se.docstatus = 2 THEN 1 ELSE 0 END), 0) as cancelled_count
        FROM `tabStock Entry` se
        WHERE {where_clause}
    """.format(where_clause=summary_where), summary_params, as_dict=True)[0]

    # Profiles list for admin filter
    profiles_list = []
    if is_admin:
        profiles_list = frappe.get_all(
            "Mini POS Profile",
            filters={"disabled": 0},
            fields=["name", "user"],
            order_by="name asc"
        )

    return {
        "entries": entries,
        "total": total,
        "page": page,
        "page_size": page_size,
        "is_admin": is_admin,
        "profiles_list": profiles_list,
        "summary": summary
    }


@frappe.whitelist()
def get_entry_details(entry_name):
    """Get full details of a Stock Entry including items."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()

    doc = frappe.get_doc("Stock Entry", entry_name)

    # Access check
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    if not is_admin:
        doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
        if doc_profile and doc_profile != profile.name:
            frappe.throw(_("You don't have access to this entry"))

    items = []
    for item in doc.items:
        items.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty,
            "uom": item.uom,
            "stock_uom": item.stock_uom,
            "conversion_factor": item.conversion_factor,
            "s_warehouse": item.s_warehouse,
            "t_warehouse": item.t_warehouse,
            "basic_rate": item.basic_rate,
            "basic_amount": item.basic_amount,
            "actual_qty": flt(frappe.db.get_value("Bin", {"item_code": item.item_code, "warehouse": item.s_warehouse}, "actual_qty"))
        })

    transfer_type = doc.get("transfer_type") or ""
    mini_pos_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile") or ""

    return {
        "name": doc.name,
        "posting_date": str(doc.posting_date),
        "posting_time": str(doc.posting_time)[:5] if doc.posting_time else "",
        "docstatus": doc.docstatus,
        "total_qty": sum(flt(item.qty) for item in doc.items),
        "total_amount": flt(doc.get("total_amount") or 0),
        "transfer_type": transfer_type,
        "mini_pos_profile": mini_pos_profile,
        "owner": doc.owner,
        "creation": str(doc.creation),
        "items": items,
        "source_warehouse": items[0]["s_warehouse"] if items else "",
        "target_warehouse": items[0]["t_warehouse"] if items else ""
    }


@frappe.whitelist()
def submit_entry(entry_name):
    """Submit a draft Stock Entry."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()

    doc = frappe.get_doc("Stock Entry", entry_name)

    # Access check
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    if not is_admin:
        doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
        if doc_profile and doc_profile != profile.name:
            frappe.throw(_("You don't have access to this entry"))

    if doc.docstatus != 0:
        frappe.throw(_("Only draft entries can be submitted"))

    doc.submit()
    frappe.db.commit()

    return {
        "success": True,
        "name": doc.name,
        "message": _("Stock Entry {0} submitted successfully").format(doc.name)
    }


@frappe.whitelist()
def cancel_entry(entry_name):
    """Cancel a submitted Stock Entry."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()

    doc = frappe.get_doc("Stock Entry", entry_name)

    # Access check
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    if not is_admin:
        doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
        if doc_profile and doc_profile != profile.name:
            frappe.throw(_("You don't have access to this entry"))

    if doc.docstatus != 1:
        frappe.throw(_("Only submitted entries can be cancelled"))

    doc.cancel()
    frappe.db.commit()

    return {
        "success": True,
        "name": doc.name,
        "message": _("Stock Entry {0} cancelled successfully").format(doc.name)
    }


@frappe.whitelist()
def delete_entry(entry_name):
    """Delete a draft Stock Entry."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()

    doc = frappe.get_doc("Stock Entry", entry_name)

    # Access check
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    if not is_admin:
        doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
        if doc_profile and doc_profile != profile.name:
            frappe.throw(_("You don't have access to this entry"))

    if doc.docstatus != 0:
        frappe.throw(_("Only draft entries can be deleted"))

    frappe.delete_doc("Stock Entry", entry_name, ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "message": _("Stock Entry {0} deleted successfully").format(entry_name)
    }
