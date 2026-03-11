import frappe
from frappe import _
import json

PROFILE_DOCTYPE = "Mini POS Profile"


def _require_admin():
    """Ensure current user is Admin. Throw if not."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Please login to access this page."))

    pos_user_type = frappe.db.get_value("User", user, "pos_user_type") or "System User"
    if pos_user_type != "Admin":
        frappe.throw(_("Only Admin users can access suppliers."))


@frappe.whitelist()
def get_suppliers_context(search="", limit=100, offset=0):
    """Get suppliers list. Admin only."""
    _require_admin()

    filters = {"disabled": 0}

    or_filters = None
    if search:
        search_like = f"%{search}%"
        or_filters = {
            "supplier_name": ["like", search_like],
            "name": ["like", search_like],
            "mobile_no": ["like", search_like],
            "email_id": ["like", search_like],
        }

    suppliers = frappe.get_all(
        "Supplier",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name", "supplier_name", "supplier_group",
            "mobile_no", "email_id", "custom_company",
            "image", "disabled", "supplier_type", "country"
        ],
        order_by="supplier_name asc",
        limit_page_length=limit,
        start=offset,
        ignore_permissions=True,
    )

    # Get contacts and addresses for each supplier
    supplier_names = [s.name for s in suppliers]
    contacts_map = {}
    addresses_map = {}

    if supplier_names:
        contacts = frappe.db.sql("""
            SELECT
                c.name, c.first_name, c.last_name, c.email_id, c.mobile_no, c.phone,
                dl.link_name as supplier
            FROM `tabContact` c
            INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name
                AND dl.parenttype = 'Contact'
                AND dl.link_doctype = 'Supplier'
                AND dl.link_name IN %(suppliers)s
            ORDER BY c.first_name ASC
        """, {"suppliers": supplier_names}, as_dict=True)

        for contact in contacts:
            sup = contact.pop("supplier")
            contacts_map.setdefault(sup, []).append(contact)

        addresses = frappe.db.sql("""
            SELECT
                a.name, a.address_title, a.address_line1, a.address_line2,
                a.city, a.state, a.country, a.pincode, a.phone,
                a.address_type,
                dl.link_name as supplier
            FROM `tabAddress` a
            INNER JOIN `tabDynamic Link` dl ON dl.parent = a.name
                AND dl.parenttype = 'Address'
                AND dl.link_doctype = 'Supplier'
                AND dl.link_name IN %(suppliers)s
            ORDER BY a.address_title ASC
        """, {"suppliers": supplier_names}, as_dict=True)

        for addr in addresses:
            sup = addr.pop("supplier")
            addresses_map.setdefault(sup, []).append(addr)

    for s in suppliers:
        s["contacts"] = contacts_map.get(s.name, [])
        s["addresses"] = addresses_map.get(s.name, [])

    count_filters = dict(filters)
    total_count = frappe.db.count("Supplier", filters=count_filters)

    supplier_groups = frappe.get_all(
        "Supplier Group",
        filters={"is_group": 0},
        fields=["name"],
        order_by="name asc",
        limit=500,
        ignore_permissions=True,
    )

    return {
        "suppliers": suppliers,
        "total_count": total_count,
        "supplier_groups": [g.name for g in supplier_groups],
    }


@frappe.whitelist()
def get_supplier_details(supplier_name):
    """Get full details for a single supplier including contacts and addresses."""
    _require_admin()

    if not supplier_name:
        frappe.throw(_("Supplier name is required."))

    supplier = frappe.get_doc("Supplier", supplier_name)

    contacts = frappe.db.sql("""
        SELECT
            c.name, c.first_name, c.last_name, c.email_id, c.mobile_no, c.phone
        FROM `tabContact` c
        INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name
            AND dl.parenttype = 'Contact'
            AND dl.link_doctype = 'Supplier'
            AND dl.link_name = %(supplier)s
        ORDER BY c.first_name ASC
    """, {"supplier": supplier_name}, as_dict=True)

    addresses = frappe.db.sql("""
        SELECT
            a.name, a.address_title, a.address_line1, a.address_line2,
            a.city, a.state, a.country, a.pincode, a.phone,
            a.address_type
        FROM `tabAddress` a
        INNER JOIN `tabDynamic Link` dl ON dl.parent = a.name
            AND dl.parenttype = 'Address'
            AND dl.link_doctype = 'Supplier'
            AND dl.link_name = %(supplier)s
        ORDER BY a.address_title ASC
    """, {"supplier": supplier_name}, as_dict=True)

    return {
        "supplier": {
            "name": supplier.name,
            "supplier_name": supplier.supplier_name,
            "supplier_group": supplier.supplier_group,
            "supplier_type": supplier.supplier_type,
            "mobile_no": supplier.mobile_no,
            "email_id": supplier.email_id,
            "custom_company": supplier.custom_company,
            "country": supplier.country,
            "image": supplier.image,
            "disabled": supplier.disabled,
        },
        "contacts": contacts,
        "addresses": addresses,
    }


@frappe.whitelist()
def create_supplier(data):
    """Create a new Supplier. Admin only."""
    _require_admin()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    supplier_name = (data.get("supplier_name") or "").strip()
    if not supplier_name:
        frappe.throw(_("Supplier name is required."))

    default_company = frappe.db.get_single_value("Global Defaults", "default_company")

    supplier = frappe.get_doc({
        "doctype": "Supplier",
        "supplier_name": supplier_name,
        "supplier_group": (data.get("supplier_group") or "").strip() or None,
        "supplier_type": (data.get("supplier_type") or "Individual").strip(),
        "mobile_no": (data.get("mobile_no") or "").strip() or None,
        "email_id": (data.get("email_id") or "").strip() or None,
        "country": (data.get("country") or "").strip() or None,
        "custom_company": default_company,
    })
    supplier.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": supplier.name,
        "supplier_name": supplier.supplier_name,
    }


@frappe.whitelist()
def update_supplier(data):
    """Update an existing Supplier. Admin only."""
    _require_admin()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    name = data.get("name")
    if not name:
        frappe.throw(_("Supplier ID is required."))

    if not frappe.db.exists("Supplier", name):
        frappe.throw(_("Supplier '{0}' not found.").format(name))

    supplier = frappe.get_doc("Supplier", name)

    if data.get("supplier_name"):
        supplier.supplier_name = data.get("supplier_name").strip()
    if "supplier_group" in data:
        supplier.supplier_group = (data.get("supplier_group") or "").strip() or None
    if "supplier_type" in data:
        supplier.supplier_type = (data.get("supplier_type") or "Individual").strip()
    if "mobile_no" in data:
        supplier.mobile_no = (data.get("mobile_no") or "").strip() or None
    if "email_id" in data:
        supplier.email_id = (data.get("email_id") or "").strip() or None
    if "country" in data:
        supplier.country = (data.get("country") or "").strip() or None

    supplier.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": supplier.name,
        "supplier_name": supplier.supplier_name,
    }


@frappe.whitelist()
def add_contact(data):
    """Add a new Contact linked to a Supplier. Admin only."""
    _require_admin()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    supplier_name = (data.get("supplier") or "").strip()
    if not supplier_name:
        frappe.throw(_("Supplier is required."))

    first_name = (data.get("first_name") or "").strip()
    if not first_name:
        frappe.throw(_("Contact name is required."))

    contact = frappe.get_doc({
        "doctype": "Contact",
        "first_name": first_name,
        "last_name": (data.get("last_name") or "").strip() or None,
        "email_id": (data.get("email_id") or "").strip() or None,
        "mobile_no": (data.get("mobile_no") or "").strip() or None,
        "phone": (data.get("phone") or "").strip() or None,
        "links": [{
            "link_doctype": "Supplier",
            "link_name": supplier_name,
        }],
    })

    email = (data.get("email_id") or "").strip()
    if email:
        contact.append("email_ids", {
            "email_id": email,
            "is_primary": 1,
        })

    mobile = (data.get("mobile_no") or "").strip()
    if mobile:
        contact.append("phone_nos", {
            "phone": mobile,
            "is_primary_mobile_no": 1,
        })

    phone = (data.get("phone") or "").strip()
    if phone:
        contact.append("phone_nos", {
            "phone": phone,
            "is_primary_phone": 1,
        })

    contact.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": contact.name,
        "first_name": contact.first_name,
        "last_name": contact.last_name,
    }


@frappe.whitelist()
def add_address(data):
    """Add a new Address linked to a Supplier. Admin only."""
    _require_admin()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    supplier_name = (data.get("supplier") or "").strip()
    if not supplier_name:
        frappe.throw(_("Supplier is required."))

    address_title = (data.get("address_title") or "").strip()
    if not address_title:
        frappe.throw(_("Address title is required."))

    address = frappe.get_doc({
        "doctype": "Address",
        "address_title": address_title,
        "address_type": (data.get("address_type") or "Billing").strip(),
        "address_line1": (data.get("address_line1") or "").strip() or None,
        "address_line2": (data.get("address_line2") or "").strip() or None,
        "city": (data.get("city") or "").strip() or None,
        "state": (data.get("state") or "").strip() or None,
        "country": (data.get("country") or "").strip() or None,
        "pincode": (data.get("pincode") or "").strip() or None,
        "phone": (data.get("phone") or "").strip() or None,
        "links": [{
            "link_doctype": "Supplier",
            "link_name": supplier_name,
        }],
    })
    address.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": address.name,
        "address_title": address.address_title,
    }


@frappe.whitelist()
def delete_contact(name):
    """Delete a Contact. Admin only."""
    _require_admin()
    if not name:
        frappe.throw(_("Contact name is required."))
    if not frappe.db.exists("Contact", name):
        frappe.throw(_("Contact not found."))

    frappe.delete_doc("Contact", name, ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def delete_address(name):
    """Delete an Address. Admin only."""
    _require_admin()
    if not name:
        frappe.throw(_("Address name is required."))
    if not frappe.db.exists("Address", name):
        frappe.throw(_("Address not found."))

    frappe.delete_doc("Address", name, ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}
