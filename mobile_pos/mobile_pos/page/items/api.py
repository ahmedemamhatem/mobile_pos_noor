import frappe
from frappe import _
from frappe.utils import flt
import json


@frappe.whitelist()
def get_items_context(search="", limit=100, offset=0):
    """Get items list with basic info, item groups, UOMs, and price lists."""
    filters = {"is_stock_item": 1}
    if search:
        filters["item_name"] = ["like", f"%{search}%"]

    items = frappe.get_all(
        "Item",
        filters=filters,
        or_filters={"item_code": ["like", f"%{search}%"]} if search else None,
        fields=[
            "name", "item_code", "item_name", "item_group",
            "stock_uom", "image", "disabled", "description",
            "standard_rate", "is_sales_item", "is_purchase_item"
        ],
        order_by="item_name asc",
        limit_page_length=limit,
        start=offset,
        ignore_permissions=True
    )

    # Fetch selling and buying prices for all items
    item_codes = [i.name for i in items]
    prices = {}
    if item_codes:
        all_prices = frappe.get_all(
            "Item Price",
            filters={
                "item_code": ["in", item_codes],
            },
            fields=[
                "item_code", "price_list", "price_list_rate",
                "selling", "buying", "currency"
            ],
            ignore_permissions=True
        )
        for p in all_prices:
            if p.item_code not in prices:
                prices[p.item_code] = {"selling": None, "buying": None}
            if p.selling and prices[p.item_code]["selling"] is None:
                prices[p.item_code]["selling"] = p.price_list_rate
            if p.buying and prices[p.item_code]["buying"] is None:
                prices[p.item_code]["buying"] = p.price_list_rate

    for item in items:
        p = prices.get(item.name, {})
        item["selling_price"] = p.get("selling")
        item["buying_price"] = p.get("buying")

    item_groups = frappe.get_all(
        "Item Group",
        filters={"is_group": 0},
        fields=["name"],
        order_by="name asc",
        limit=500,
        ignore_permissions=True
    )

    uoms = frappe.get_all(
        "UOM",
        filters={"enabled": 1},
        fields=["name"],
        order_by="name asc",
        limit=200,
        ignore_permissions=True
    )

    selling_price_lists = frappe.get_all(
        "Price List",
        filters={"enabled": 1, "selling": 1},
        fields=["name", "currency"],
        ignore_permissions=True
    )

    buying_price_lists = frappe.get_all(
        "Price List",
        filters={"enabled": 1, "buying": 1},
        fields=["name", "currency"],
        ignore_permissions=True
    )

    count_filters = {"is_stock_item": 1}
    if search:
        count_filters["item_name"] = ["like", f"%{search}%"]
    total_count = frappe.db.count("Item", filters=count_filters)

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
        "items": items,
        "item_groups": [g.name for g in item_groups],
        "uoms": [u.name for u in uoms],
        "selling_price_lists": selling_price_lists,
        "buying_price_lists": buying_price_lists,
        "customers": customers,
        "suppliers": suppliers,
        "total_count": total_count
    }


@frappe.whitelist()
def get_item_prices(item_code):
    """Get all selling and buying prices for an item."""
    if not item_code:
        frappe.throw(_("Item Code is required."))

    prices = frappe.get_all(
        "Item Price",
        filters={"item_code": item_code},
        fields=[
            "name", "price_list", "price_list_rate",
            "selling", "buying", "currency", "uom",
            "valid_from", "valid_upto", "customer", "supplier"
        ],
        order_by="selling desc, buying desc, price_list asc",
        ignore_permissions=True
    )

    selling = [p for p in prices if p.selling]
    buying = [p for p in prices if p.buying]

    return {"selling": selling, "buying": buying}


@frappe.whitelist()
def create_item(data):
    """Create a new Item."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    item_code = (data.get("item_code") or "").strip()
    item_name = (data.get("item_name") or "").strip()
    item_group = (data.get("item_group") or "").strip()
    stock_uom = (data.get("stock_uom") or "").strip()

    if not item_code:
        frappe.throw(_("Item Code is required."))
    if not item_name:
        frappe.throw(_("Item Name is required."))
    if not item_group:
        frappe.throw(_("Item Group is required."))
    if not stock_uom:
        frappe.throw(_("Stock UOM is required."))

    if frappe.db.exists("Item", item_code):
        frappe.throw(_("Item with code '{0}' already exists.").format(item_code))

    default_company = frappe.db.get_single_value("Global Defaults", "default_company")

    item = frappe.get_doc({
        "doctype": "Item",
        "item_code": item_code,
        "item_name": item_name,
        "item_group": item_group,
        "stock_uom": stock_uom,
        "is_stock_item": 1,
        "description": data.get("description", ""),
        "standard_rate": flt(data.get("standard_rate", 0)),
        "custom_company": default_company,
    })

    item.insert(ignore_permissions=True)

    # Create buying price if provided
    buying_rate = flt(data.get("buying_rate", 0))
    if buying_rate > 0:
        buying_price_list = frappe.db.get_value(
            "Price List", {"enabled": 1, "buying": 1}, "name"
        )
        if buying_price_list:
            frappe.get_doc({
                "doctype": "Item Price",
                "item_code": item_code,
                "price_list": buying_price_list,
                "price_list_rate": buying_rate,
                "uom": stock_uom,
            }).insert(ignore_permissions=True)

    frappe.db.commit()

    return {
        "name": item.name,
        "item_code": item.item_code,
        "item_name": item.item_name
    }


@frappe.whitelist()
def update_item(data):
    """Update an existing Item."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    item_code = data.get("item_code")
    if not item_code:
        frappe.throw(_("Item Code is required."))

    if not frappe.db.exists("Item", item_code):
        frappe.throw(_("Item '{0}' not found.").format(item_code))

    item = frappe.get_doc("Item", item_code)

    if data.get("item_name"):
        item.item_name = data.get("item_name").strip()
    if data.get("item_group"):
        item.item_group = data.get("item_group").strip()
    if data.get("stock_uom"):
        item.stock_uom = data.get("stock_uom").strip()
    if "description" in data:
        item.description = data.get("description", "")
    if "disabled" in data:
        item.disabled = 1 if data.get("disabled") else 0

    item.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": item.name,
        "item_code": item.item_code,
        "item_name": item.item_name
    }


@frappe.whitelist()
def update_item_price(data):
    """Update an existing Item Price."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    price_name = data.get("name")
    if not price_name:
        frappe.throw(_("Item Price name is required."))

    price_list_rate = flt(data.get("price_list_rate"))
    if price_list_rate < 0:
        frappe.throw(_("Price must be zero or greater."))

    doc = frappe.get_doc("Item Price", price_name)
    doc.price_list_rate = price_list_rate
    uom = (data.get("uom") or "").strip()
    if uom:
        doc.uom = uom
    if "customer" in data:
        doc.customer = (data.get("customer") or "").strip() or None
    if "supplier" in data:
        doc.supplier = (data.get("supplier") or "").strip() or None
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"name": doc.name, "price_list_rate": doc.price_list_rate, "uom": doc.uom, "customer": doc.customer, "supplier": doc.supplier}


@frappe.whitelist()
def create_item_price(data):
    """Create a new Item Price."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    item_code = data.get("item_code")
    price_list = data.get("price_list")
    price_list_rate = flt(data.get("price_list_rate"))

    if not item_code:
        frappe.throw(_("Item Code is required."))
    if not price_list:
        frappe.throw(_("Price List is required."))
    if price_list_rate < 0:
        frappe.throw(_("Price must be zero or greater."))

    if not frappe.db.exists("Item", item_code):
        frappe.throw(_("Item '{0}' not found.").format(item_code))

    item = frappe.get_doc("Item", item_code)

    uom = (data.get("uom") or "").strip() or item.stock_uom

    customer = (data.get("customer") or "").strip() or None
    supplier = (data.get("supplier") or "").strip() or None

    doc = frappe.get_doc({
        "doctype": "Item Price",
        "item_code": item_code,
        "price_list": price_list,
        "price_list_rate": price_list_rate,
        "uom": uom,
        "customer": customer,
        "supplier": supplier,
    })

    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": doc.name,
        "price_list": doc.price_list,
        "price_list_rate": doc.price_list_rate,
        "customer": doc.customer,
        "supplier": doc.supplier
    }


@frappe.whitelist()
def delete_item_price(name):
    """Delete an Item Price."""
    if not name:
        frappe.throw(_("Item Price name is required."))

    if not frappe.db.exists("Item Price", name):
        frappe.throw(_("Item Price not found."))

    frappe.delete_doc("Item Price", name, ignore_permissions=True)
    frappe.db.commit()

    return {"success": True}
