import frappe
from frappe import _
from frappe.utils import flt
import json

PROFILE_DOCTYPE = "Mini POS Profile"


def _get_user_context():
    """Get current user's POS context: pos_user_type and profile_name."""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Please login to access this page."))

    pos_user_type = frappe.db.get_value("User", user, "pos_user_type") or "System User"
    is_admin = pos_user_type == "Admin"

    profile_name = None
    if not is_admin:
        profile_name = frappe.db.get_value(PROFILE_DOCTYPE, {"user": user}, "name")

    return {
        "user": user,
        "pos_user_type": pos_user_type,
        "is_admin": is_admin,
        "profile_name": profile_name,
    }


@frappe.whitelist()
def get_customers_context(search="", limit=100, offset=0):
    """Get customers list. Admin sees all, website user sees only their profile's customers."""
    ctx = _get_user_context()

    filters = {"disabled": 0}

    # Website users only see customers linked to their POS profile
    if not ctx["is_admin"] and ctx["profile_name"]:
        filters["custom_mini_pos_profile"] = ctx["profile_name"]
    elif not ctx["is_admin"] and not ctx["profile_name"]:
        # No profile = no customers
        return {
            "customers": [],
            "total_count": 0,
            "is_admin": False,
            "customer_groups": [],
        }

    or_filters = None
    if search:
        search_like = f"%{search}%"
        or_filters = {
            "customer_name": ["like", search_like],
            "name": ["like", search_like],
            "custom_phone": ["like", search_like],
            "custom_email": ["like", search_like],
        }

    customers = frappe.get_all(
        "Customer",
        filters=filters,
        or_filters=or_filters,
        fields=[
            "name", "customer_name", "customer_group",
            "custom_phone", "custom_email", "custom_company",
            "custom_mini_pos_profile", "image", "disabled"
        ],
        order_by="customer_name asc",
        limit_page_length=limit,
        start=offset,
        ignore_permissions=True,
    )

    # Get contacts and addresses for each customer
    customer_names = [c.name for c in customers]
    contacts_map = {}
    addresses_map = {}

    if customer_names:
        # Get linked contacts via Dynamic Link
        contacts = frappe.db.sql("""
            SELECT
                c.name, c.first_name, c.last_name, c.email_id, c.mobile_no, c.phone,
                dl.link_name as customer
            FROM `tabContact` c
            INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name
                AND dl.parenttype = 'Contact'
                AND dl.link_doctype = 'Customer'
                AND dl.link_name IN %(customers)s
            ORDER BY c.first_name ASC
        """, {"customers": customer_names}, as_dict=True)

        for contact in contacts:
            cust = contact.pop("customer")
            contacts_map.setdefault(cust, []).append(contact)

        # Get linked addresses via Dynamic Link
        addresses = frappe.db.sql("""
            SELECT
                a.name, a.address_title, a.address_line1, a.address_line2,
                a.city, a.state, a.country, a.pincode, a.phone,
                a.address_type,
                dl.link_name as customer
            FROM `tabAddress` a
            INNER JOIN `tabDynamic Link` dl ON dl.parent = a.name
                AND dl.parenttype = 'Address'
                AND dl.link_doctype = 'Customer'
                AND dl.link_name IN %(customers)s
            ORDER BY a.address_title ASC
        """, {"customers": customer_names}, as_dict=True)

        for addr in addresses:
            cust = addr.pop("customer")
            addresses_map.setdefault(cust, []).append(addr)

    for c in customers:
        c["contacts"] = contacts_map.get(c.name, [])
        c["addresses"] = addresses_map.get(c.name, [])

    # Total count
    count_filters = dict(filters)
    total_count = frappe.db.count("Customer", filters=count_filters)

    # Customer groups
    customer_groups = frappe.get_all(
        "Customer Group",
        filters={"is_group": 0},
        fields=["name"],
        order_by="name asc",
        limit=500,
        ignore_permissions=True,
    )

    return {
        "customers": customers,
        "total_count": total_count,
        "is_admin": ctx["is_admin"],
        "customer_groups": [g.name for g in customer_groups],
    }


@frappe.whitelist()
def get_customer_details(customer_name):
    """Get full details for a single customer including contacts and addresses."""
    if not customer_name:
        frappe.throw(_("Customer name is required."))

    ctx = _get_user_context()

    customer = frappe.get_doc("Customer", customer_name)

    # Check access: non-admin can only see their profile's customers
    if not ctx["is_admin"] and ctx["profile_name"]:
        if customer.custom_mini_pos_profile != ctx["profile_name"]:
            frappe.throw(_("You do not have access to this customer."))

    # Get contacts
    contacts = frappe.db.sql("""
        SELECT
            c.name, c.first_name, c.last_name, c.email_id, c.mobile_no, c.phone
        FROM `tabContact` c
        INNER JOIN `tabDynamic Link` dl ON dl.parent = c.name
            AND dl.parenttype = 'Contact'
            AND dl.link_doctype = 'Customer'
            AND dl.link_name = %(customer)s
        ORDER BY c.first_name ASC
    """, {"customer": customer_name}, as_dict=True)

    # Get addresses
    addresses = frappe.db.sql("""
        SELECT
            a.name, a.address_title, a.address_line1, a.address_line2,
            a.city, a.state, a.country, a.pincode, a.phone,
            a.address_type
        FROM `tabAddress` a
        INNER JOIN `tabDynamic Link` dl ON dl.parent = a.name
            AND dl.parenttype = 'Address'
            AND dl.link_doctype = 'Customer'
            AND dl.link_name = %(customer)s
        ORDER BY a.address_title ASC
    """, {"customer": customer_name}, as_dict=True)

    return {
        "customer": {
            "name": customer.name,
            "customer_name": customer.customer_name,
            "customer_group": customer.customer_group,
            "custom_phone": customer.custom_phone,
            "custom_email": customer.custom_email,
            "custom_company": customer.custom_company,
            "custom_mini_pos_profile": customer.custom_mini_pos_profile,
            "image": customer.image,
            "disabled": customer.disabled,
        },
        "contacts": contacts,
        "addresses": addresses,
    }


@frappe.whitelist()
def create_customer(data):
    """Create a new Customer."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)
    ctx = _get_user_context()

    customer_name = (data.get("customer_name") or "").strip()
    if not customer_name:
        frappe.throw(_("Customer name is required."))

    default_company = frappe.db.get_single_value("Global Defaults", "default_company")

    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": customer_name,
        "customer_group": (data.get("customer_group") or "").strip() or None,
        "custom_phone": (data.get("custom_phone") or "").strip() or None,
        "custom_email": (data.get("custom_email") or "").strip() or None,
        "custom_company": default_company,
        "custom_mini_pos_profile": ctx["profile_name"] if not ctx["is_admin"] else (data.get("custom_mini_pos_profile") or "").strip() or None,
    })
    customer.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": customer.name,
        "customer_name": customer.customer_name,
    }


@frappe.whitelist()
def update_customer(data):
    """Update an existing Customer."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)
    ctx = _get_user_context()

    name = data.get("name")
    if not name:
        frappe.throw(_("Customer ID is required."))

    if not frappe.db.exists("Customer", name):
        frappe.throw(_("Customer '{0}' not found.").format(name))

    customer = frappe.get_doc("Customer", name)

    # Access check
    if not ctx["is_admin"] and ctx["profile_name"]:
        if customer.custom_mini_pos_profile != ctx["profile_name"]:
            frappe.throw(_("You do not have access to this customer."))

    if data.get("customer_name"):
        customer.customer_name = data.get("customer_name").strip()
    if "customer_group" in data:
        customer.customer_group = (data.get("customer_group") or "").strip() or None
    if "custom_phone" in data:
        customer.custom_phone = (data.get("custom_phone") or "").strip() or None
    if "custom_email" in data:
        customer.custom_email = (data.get("custom_email") or "").strip() or None

    customer.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": customer.name,
        "customer_name": customer.customer_name,
    }


@frappe.whitelist()
def add_contact(data):
    """Add a new Contact linked to a Customer."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)
    ctx = _get_user_context()

    customer_name = (data.get("customer") or "").strip()
    if not customer_name:
        frappe.throw(_("Customer is required."))

    # Access check
    if not ctx["is_admin"] and ctx["profile_name"]:
        profile = frappe.db.get_value("Customer", customer_name, "custom_mini_pos_profile")
        if profile != ctx["profile_name"]:
            frappe.throw(_("You do not have access to this customer."))

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
            "link_doctype": "Customer",
            "link_name": customer_name,
        }],
    })

    # Add email if provided
    email = (data.get("email_id") or "").strip()
    if email:
        contact.append("email_ids", {
            "email_id": email,
            "is_primary": 1,
        })

    # Add phone if provided
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
    """Add a new Address linked to a Customer."""
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)
    ctx = _get_user_context()

    customer_name = (data.get("customer") or "").strip()
    if not customer_name:
        frappe.throw(_("Customer is required."))

    # Access check
    if not ctx["is_admin"] and ctx["profile_name"]:
        profile = frappe.db.get_value("Customer", customer_name, "custom_mini_pos_profile")
        if profile != ctx["profile_name"]:
            frappe.throw(_("You do not have access to this customer."))

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
            "link_doctype": "Customer",
            "link_name": customer_name,
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
    """Delete a Contact."""
    if not name:
        frappe.throw(_("Contact name is required."))
    if not frappe.db.exists("Contact", name):
        frappe.throw(_("Contact not found."))

    frappe.delete_doc("Contact", name, ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}


@frappe.whitelist()
def delete_address(name):
    """Delete an Address."""
    if not name:
        frappe.throw(_("Address name is required."))
    if not frappe.db.exists("Address", name):
        frappe.throw(_("Address not found."))

    frappe.delete_doc("Address", name, ignore_permissions=True)
    frappe.db.commit()
    return {"success": True}
