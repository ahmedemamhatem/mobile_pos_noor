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
    """Get profile context: company, suppliers, items with last_purchase_rate, warehouses."""
    profile = get_profile_or_throw()
    if not profile:
        return {"company": "", "suppliers": [], "items": [], "warehouse": "", "warehouses": [], "profile_name": ""}
    company = profile.company
    warehouse = profile.warehouse

    suppliers = frappe.get_all(
        "Supplier",
        filters={"disabled": 0},
        fields=["name", "supplier_name"],
        order_by="supplier_name asc",
        limit=500,
        ignore_permissions=True
    )

    # Get warehouses for the company
    wh_filters = {"is_group": 0, "disabled": 0}
    if company:
        wh_filters["company"] = company
    warehouses = frappe.get_all(
        "Warehouse",
        filters=wh_filters,
        fields=["name"],
        order_by="name asc",
        limit=500,
        ignore_permissions=True
    )
    warehouses = [w.name for w in warehouses]

    # Get items filtered by company, include last_purchase_rate
    conditions = "i.disabled = 0 AND i.is_stock_item = 1"
    params = []
    if company:
        conditions += " AND (i.custom_company = %s OR i.custom_company IS NULL OR i.custom_company = '')"
        params.append(company)

    items = frappe.db.sql(
        """
        SELECT
            i.item_code,
            i.item_name,
            i.stock_uom,
            COALESCE(i.image, '') AS image,
            COALESCE(i.last_purchase_rate, 0) AS last_purchase_rate,
            COALESCE(i.valuation_rate, 0) AS valuation_rate
        FROM `tabItem` i
        WHERE {conditions}
        ORDER BY i.item_name ASC
        LIMIT 1000
        """.format(conditions=conditions),
        params,
        as_dict=True
    )

    # Also try to get buying Item Price for each item
    if company:
        price_list = frappe.db.get_value("Buying Settings", None, "buying_price_list")
        if price_list:
            price_map = {}
            prices = frappe.db.sql(
                """
                SELECT item_code, price_list_rate
                FROM `tabItem Price`
                WHERE price_list = %s AND buying = 1
                ORDER BY modified DESC
                """,
                (price_list,),
                as_dict=True
            )
            for p in prices:
                if p.item_code not in price_map:
                    price_map[p.item_code] = p.price_list_rate
            for it in items:
                if it.item_code in price_map:
                    it["item_price"] = flt(price_map[it.item_code])
                else:
                    it["item_price"] = 0
        else:
            for it in items:
                it["item_price"] = 0

    return {
        "company": company,
        "suppliers": suppliers,
        "items": items,
        "warehouse": warehouse,
        "warehouses": warehouses,
        "profile_name": profile.name
    }


@frappe.whitelist()
def create_purchase_invoice(data):
    """Create a Purchase Invoice with update_stock=1 and auto-submit."""
    profile = get_profile_or_throw()
    if not profile:
        frappe.throw(_("Please set up a Mini POS Profile before creating purchase invoices."))
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    supplier = data.get("supplier")
    if not supplier:
        frappe.throw(_("Supplier is required."))

    items = data.get("items")
    if not items or not len(items):
        frappe.throw(_("At least one item is required."))

    warehouse = data.get("warehouse") or profile.warehouse
    company = profile.company

    # Build items table
    pi_items = []
    for item in items:
        qty = flt(item.get("qty"))
        rate = flt(item.get("rate"))
        if qty <= 0:
            frappe.throw(_("Quantity must be greater than zero for item {0}.").format(item.get("item_code")))
        if rate <= 0:
            frappe.throw(_("Rate must be greater than zero for item {0}.").format(item.get("item_code")))
        pi_items.append({
            "item_code": item.get("item_code"),
            "qty": qty,
            "rate": rate,
            "warehouse": warehouse
        })

    doc = frappe.get_doc({
        "doctype": "Purchase Invoice",
        "supplier": supplier,
        "posting_date": nowdate(),
        "company": company,
        "update_stock": 1,
        "set_warehouse": warehouse,
        "items": pi_items,
        "mini_pos_profile": profile.name,
        "remarks": data.get("remarks") or ""
    })

    doc.insert(ignore_permissions=True)
    doc.submit()
    frappe.db.commit()

    return {
        "name": doc.name,
        "supplier": doc.supplier,
        "grand_total": doc.grand_total
    }


@frappe.whitelist()
def get_recent_entries(limit=20):
    """Get recent purchase invoices."""
    profile = get_profile_or_throw()
    if not profile:
        return []

    entries = frappe.get_all(
        "Purchase Invoice",
        filters={
            "company": profile.company,
            "mini_pos_profile": profile.name,
            "docstatus": ["in", [0, 1, 2]]
        },
        fields=[
            "name", "supplier", "supplier_name", "grand_total",
            "posting_date", "docstatus", "creation"
        ],
        order_by="creation desc",
        limit=limit,
        ignore_permissions=True
    )

    return entries


@frappe.whitelist()
def get_purchase_entry_details(entry_name):
    """Get full details of a Purchase Invoice including items."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    if not profile:
        frappe.throw(_("No POS Profile configured"), frappe.PermissionError)

    doc = frappe.get_doc("Purchase Invoice", entry_name)

    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    items = []
    for item in doc.items:
        items.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty,
            "rate": item.rate,
            "amount": item.amount,
            "uom": item.uom,
            "warehouse": item.warehouse
        })

    return {
        "name": doc.name,
        "supplier": doc.supplier,
        "supplier_name": doc.supplier_name,
        "posting_date": str(doc.posting_date),
        "docstatus": doc.docstatus,
        "grand_total": flt(doc.grand_total),
        "total_qty": flt(doc.total_qty),
        "remarks": doc.remarks or "",
        "owner": doc.owner,
        "creation": str(doc.creation),
        "items": items
    }


@frappe.whitelist()
def submit_purchase_entry(entry_name):
    """Submit a draft Purchase Invoice."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    if not profile:
        frappe.throw(_("No POS Profile configured"), frappe.PermissionError)

    doc = frappe.get_doc("Purchase Invoice", entry_name)

    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    if doc.docstatus != 0:
        frappe.throw(_("Only draft entries can be submitted"))

    doc.submit()
    frappe.db.commit()

    return {
        "success": True,
        "name": doc.name,
        "message": _("Purchase Invoice {0} submitted successfully").format(doc.name)
    }


@frappe.whitelist()
def cancel_purchase_entry(entry_name):
    """Cancel a submitted Purchase Invoice."""
    if not entry_name:
        frappe.throw(_("Entry name is required"))

    profile = get_profile_or_throw()
    if not profile:
        frappe.throw(_("No POS Profile configured"), frappe.PermissionError)

    doc = frappe.get_doc("Purchase Invoice", entry_name)

    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this entry"))

    if doc.docstatus != 1:
        frappe.throw(_("Only submitted entries can be cancelled"))

    doc.cancel()
    frappe.db.commit()

    return {
        "success": True,
        "name": doc.name,
        "message": _("Purchase Invoice {0} cancelled successfully").format(doc.name)
    }
