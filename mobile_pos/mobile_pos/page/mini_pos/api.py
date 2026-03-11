import frappe
import json
from frappe.utils import flt, now_datetime, cint
from frappe import _
from datetime import timedelta


def _is_pos_admin():
    """Check if the current user is a POS Admin (pos_user_type == 'Admin')."""
    user = frappe.session.user
    if not user or user == "Guest":
        return False
    return frappe.db.get_value("User", user, "pos_user_type") == "Admin"


def _get_customer_profile(customer):
    """Get the mini_pos_profile assigned to a customer."""
    if not customer:
        return None
    return frappe.db.get_value("Customer", customer, "custom_mini_pos_profile")


def is_negative_stock_allowed_for_company(company):
    """
    Check if negative stock is allowed for mobile POS.
    Checks both Mobile POS Settings and Company allow_negative_stock field.
    Company setting overrides Mobile POS Settings.
    """
    # First check Company doctype allow_negative_stock (this overrides Mobile POS Settings)
    if company and cint(frappe.db.get_value("Company", company, "allow_negative_stock", cache=True)):
        return True

    # Then check Mobile POS Settings
    from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
    settings = get_mobile_pos_settings(company)
    return settings.allow_negative_stock if hasattr(settings, 'allow_negative_stock') else False


def get_company_price_list(company):
    """
    Get selling price list for the company.
    Priority: Mobile POS Settings > Selling Settings > any enabled selling price list.
    """
    from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_settings_value
    price_list = get_settings_value("selling_price_list", company)
    if not price_list:
        price_list = frappe.db.get_single_value("Selling Settings", "selling_price_list")
    if not price_list:
        price_list = frappe.db.get_value("Price List", {"selling": 1, "enabled": 1}, "name")
    return price_list


@frappe.whitelist()
def mini_pos_stock_transfer(txn_type, main_warehouse, pos_warehouse, items):
    """
    txn_type: 'Add Stock' or 'Return Stock'
    items: list of dicts {item_code, qty}
    """
    profile = get_profile_or_throw()
    company = profile.company

    # Create a Stock Entry
    doc = frappe.new_doc("Stock Entry")
    doc.stock_entry_type = "Material Transfer"
    doc.company = company
    for row in json.loads(items):
        doc.append("items", {
            "item_code": row["item_code"],
            "qty": row["qty"],
            "s_warehouse": main_warehouse if txn_type == "Add Stock" else pos_warehouse,
            "t_warehouse": pos_warehouse if txn_type == "Add Stock" else main_warehouse
        })
    doc.insert()
    return doc.name


def resolve_user(identifier):
    identifier = (identifier or "").strip()
    if not identifier:
        return None
    lower_identifier = identifier.lower()
    for field in ("name", "email", "username", "full_name", "first_name"):
        val = frappe.db.sql(
            f"select name from `tabUser` where lower({field})=%s limit 1",
            lower_identifier
        )
        if val:
            return val[0][0]
    return frappe.db.get_value("User", {"name": ("like", f"%{identifier}%")}, "name")


def get_profile_or_throw(user=None):
    if user:
        resolved = resolve_user(user)
        if resolved:
            user = resolved
    user = user or frappe.session.user
    if not user or user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)

    profiles = frappe.get_all(
        "Mini POS Profile",
        filters={"disabled": 0},
        fields=["name", "user", "owner"],
        order_by="creation asc",
        ignore_permissions=True
    )
    user_lower = user.lower()
    profile_name = None

    for row in profiles:
        assigned_user = (row.get("user") or "").strip()
        if assigned_user and assigned_user.lower() == user_lower:
            profile_name = row.name
            break

    if not profile_name:
        for row in profiles:
            owner = (row.get("owner") or "").strip()
            if owner and owner.lower() == user_lower:
                profile_name = row.name
                break

    if not profile_name and profiles:
        profile_name = profiles[0].name

    if not profile_name:
        frappe.throw(_("No POS Profile configured for this user ({0})").format(user), frappe.PermissionError)

    previous_flag = frappe.local.flags.get("ignore_permissions")
    frappe.local.flags.ignore_permissions = True
    try:
        profile = frappe.get_doc("Mini POS Profile", profile_name)
    finally:
        frappe.local.flags.ignore_permissions = previous_flag
    if getattr(profile, "disabled", 0):
        frappe.throw(_("POS Profile is disabled for this user."), frappe.PermissionError)

    return profile

@frappe.whitelist()
def mini_pos_balance():
    user = frappe.session.user

    try:
        profile = get_profile_or_throw()
        company = profile.company or frappe.defaults.get_user_default('Company')
        mop_rows = profile.mini_pos_mode_of_payment
    except Exception:
        company = frappe.defaults.get_user_default('Company')
        mop_rows = []

    if not company:
        frappe.throw(_("No company could be determined for this user."))

    if not mop_rows:
        # fallback: get all mode of payments
        mop_list = frappe.get_all("Mode of Payment", fields=["name"])
        mop_rows = [frappe._dict(mode_of_payment=mop.name) for mop in mop_list]

    balances = []
    for row in mop_rows:
        mop_name = row.mode_of_payment
        mop_doc = frappe.get_doc("Mode of Payment", mop_name)
        account = None
        for acc in (mop_doc.accounts or []):
            if acc.company == company:
                account = acc.default_account
                break
        if not account:
            balances.append({
                "mode_of_payment": mop_name,
                "account": "",
                "amount": 0.0,
                "account_missing": 1,
            })
            continue
        gl = frappe.db.sql("""
            SELECT SUM(debit) as debit, SUM(credit) as credit
            FROM `tabGL Entry`
            WHERE account=%s AND company=%s AND docstatus=1
        """, (account, company), as_dict=True)[0]
        balance = flt(gl.debit) - flt(gl.credit)
        balances.append({
            "mode_of_payment": mop_name,
            "account": account,
            "amount": balance,
            "account_missing": 0,
        })

    return {"balances": balances, "company": company}

@frappe.whitelist()
def mini_pos_get_profile():
    profile = get_profile_or_throw()
    profile_dict = profile.as_dict()

    # Add allow_negative_stock setting - checks both Company and Mobile POS Settings
    profile_dict["allow_negative_stock"] = is_negative_stock_allowed_for_company(profile.company)

    # Add custom_name_for_print and custom_phone_number from Company for terminal printing
    if profile.company:
        company_print_name = frappe.db.get_value("Company", profile.company, "custom_name_for_print")
        profile_dict["company_print_name"] = company_print_name or "Elnoor-النور"
        company_phone = frappe.db.get_value("Company", profile.company, "custom_phone_number")
        profile_dict["company_phone"] = company_phone or ""

    return profile_dict

@frappe.whitelist()
def mini_pos_get_stock_availability(items=None):
    profile = get_profile_or_throw()
    warehouse = profile.warehouse
    if not warehouse:
        return {}

    # Check if negative stock is allowed - checks both Company and Mobile POS Settings
    allow_negative = is_negative_stock_allowed_for_company(profile.company)

    if items:
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except Exception:
                items = [x.strip() for x in items.split(",") if x.strip()]
        if isinstance(items, tuple):
            items = list(items)

    # If negative stock allowed, return all items as available with qty 0
    if allow_negative:
        if not items:
            # Get all items filtered by company
            item_filters = {"disabled": 0, "is_sales_item": 1}
            if profile.company:
                item_filters["custom_company"] = ["in", [profile.company, "", None]]
            all_items = frappe.get_all("Item", filters=item_filters, pluck="name")
            return {item: 0.0 for item in all_items}
        else:
            return {str(item): 0.0 for item in items if item}

    if not items:
        rows = frappe.db.sql("""
            SELECT item_code, actual_qty
            FROM `tabBin`
            WHERE warehouse = %s
        """, warehouse, as_dict=True)
        return {row.item_code: float(row.actual_qty or 0) for row in rows}

    result = {}
    items = [str(item) for item in items if item]
    if not items:
        return {}
    for index in range(0, len(items), 200):
        chunk = items[index:index + 200]
        if not chunk:
            continue
        placeholders = ", ".join(["%s"] * len(chunk))
        query = f"""
            SELECT item_code, actual_qty
            FROM `tabBin`
            WHERE warehouse = %s AND item_code IN ({placeholders})
        """
        rows = frappe.db.sql(query, [warehouse, *chunk], as_dict=True)
        for row in rows:
            result[row.item_code] = float(row.actual_qty or 0)
    for code in items:
        result.setdefault(code, 0.0)
    return result

@frappe.whitelist()
def mini_pos_get_item_details(item_code, customer=None):
    if not item_code:
        frappe.throw(_("Item code is required"))
    profile = get_profile_or_throw()
    item = frappe.get_doc("Item", item_code)

    # Check if negative stock is allowed - checks both Company and Mobile POS Settings
    allow_negative = is_negative_stock_allowed_for_company(profile.company)

    # Get selling price list - company-specific first, then global fallback
    price_list = get_company_price_list(profile.company)

    # Get base rate (stock_uom price or standard_rate)
    # Priority: customer-specific price > general price > standard_rate
    company = profile.company
    base_rate = 0
    try:
        base_price_filters = {
            "item_code": item_code,
            "selling": 1,
            "custom_company": company
        }
        if price_list:
            base_price_filters["price_list"] = price_list

        # First try customer-specific price
        if customer:
            customer_filters = {**base_price_filters, "customer": customer}
            customer_prices = frappe.get_all(
                "Item Price",
                filters=customer_filters,
                fields=["price_list_rate", "uom"],
                order_by="creation desc"
            )
            for bp in customer_prices:
                if not bp.uom or bp.uom == item.stock_uom:
                    base_rate = float(bp.price_list_rate or 0)
                    break
            if not base_rate and customer_prices:
                base_rate = float(customer_prices[0].price_list_rate or 0)

        # Fallback to general price (no customer)
        if not base_rate:
            general_filters = {**base_price_filters, "customer": ("is", "not set")}
            base_prices = frappe.get_all(
                "Item Price",
                filters=general_filters,
                fields=["price_list_rate", "uom"],
                order_by="creation desc"
            )
            for bp in base_prices:
                if not bp.uom or bp.uom == item.stock_uom:
                    base_rate = float(bp.price_list_rate or 0)
                    break
            if not base_rate and base_prices:
                base_rate = float(base_prices[0].price_list_rate or 0)
    except Exception:
        base_rate = 0

    if not base_rate:
        base_rate = float(item.get("standard_rate") or 0)

    # Build UOMs list with prices
    # For each UOM: check if there's a specific Item Price for that UOM
    # If yes, use it directly (no conversion)
    # If no, convert from base rate using conversion factor
    # Priority: customer-specific > general > calculated from base
    uoms = []
    for row in (item.uoms or []):
        uom_rate = None
        has_specific_price = False

        if price_list:
            # First try customer-specific UOM price
            if customer:
                uom_price = frappe.db.get_value(
                    "Item Price",
                    {
                        "item_code": item_code,
                        "selling": 1,
                        "price_list": price_list,
                        "uom": row.uom,
                        "customer": customer,
                        "custom_company": company
                    },
                    "price_list_rate"
                )
                if uom_price:
                    uom_rate = float(uom_price)
                    has_specific_price = True

            # Fallback to general UOM price
            if uom_rate is None:
                uom_price = frappe.db.get_value(
                    "Item Price",
                    {
                        "item_code": item_code,
                        "selling": 1,
                        "price_list": price_list,
                        "uom": row.uom,
                        "customer": ("is", "not set"),
                        "custom_company": company
                    },
                    "price_list_rate"
                )
                if uom_price:
                    uom_rate = float(uom_price)
                    has_specific_price = True

        # If no specific price, calculate from base rate using conversion factor
        if uom_rate is None:
            conversion_factor = float(row.conversion_factor or 1)
            uom_rate = base_rate * conversion_factor

        uoms.append({
            "uom": row.uom,
            "conversion_factor": float(row.conversion_factor or 1),
            "rate": uom_rate,
            "has_specific_price": has_specific_price
        })

    if not uoms:
        uoms.append({
            "uom": item.stock_uom,
            "conversion_factor": 1,
            "rate": base_rate,
            "has_specific_price": False
        })

    # Determine default rate (for default UOM)
    default_uom = item.sales_uom or item.stock_uom
    rate = base_rate
    for uom_data in uoms:
        if uom_data["uom"] == default_uom:
            rate = uom_data["rate"]
            break

    # If negative stock allowed, return 0 as available qty
    if allow_negative:
        actual_qty = 0
    else:
        actual_qty = frappe.db.get_value(
            "Bin",
            {"item_code": item_code, "warehouse": profile.warehouse},
            "actual_qty"
        )

    return {
        "item_code": item.name,
        "item_name": item.item_name,
        "description": item.description,
        "stock_uom": item.stock_uom,
        "image": item.image,
        "uoms": uoms,
        "rate": rate,
        "base_rate": base_rate,
        "default_uom": default_uom,
        "standard_rate": item.get("standard_rate"),
        "warehouse": profile.warehouse,
        "actual_qty": float(actual_qty or 0),
        "allow_negative_stock": allow_negative
    }

@frappe.whitelist()
def mini_pos_ledger(customer):
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    # Build profile filter for GL Entry if mini_pos_profile dimension exists
    gl_profile_filter = ""
    gl_params = [customer, company]
    if not is_admin and frappe.get_meta("GL Entry").has_field("mini_pos_profile"):
        gl_profile_filter = "AND mini_pos_profile=%s"
        gl_params.append(profile.name)

    entries = frappe.db.sql("""
        SELECT
            posting_date,
            voucher_type,
            voucher_no,
            against_voucher_type,
            against_voucher,
            debit,
            credit,
            remarks
        FROM `tabGL Entry`
        WHERE party_type='Customer'
          AND party=%s
          AND company=%s
          AND docstatus=1
          {gl_profile_filter}
        ORDER BY posting_date, creation
        LIMIT 200
    """.format(gl_profile_filter=gl_profile_filter), gl_params, as_dict=1)

    balance = 0
    for e in entries:
        balance += (e['debit'] or 0) - (e['credit'] or 0)
        e['balance'] = balance
    return entries

@frappe.whitelist()
def mini_pos_get_customer_balance(customer):
    """Get the current outstanding balance for a customer"""
    if not customer:
        return 0

    profile = get_profile_or_throw()
    company = profile.company

    # Calculate balance from GL Entry
    result = frappe.db.sql("""
        SELECT
            COALESCE(SUM(debit) - SUM(credit), 0) as balance
        FROM `tabGL Entry`
        WHERE party_type = 'Customer'
          AND party = %s
          AND company = %s
          AND docstatus = 1
    """, (customer, company), as_dict=1)

    return flt(result[0].balance) if result else 0

@frappe.whitelist()
def mini_pos_get_all_customers_credit():
    """Get all customers with their outstanding balances for the current POS profile.
    Admin users see all customers across all profiles.
    """
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    if is_admin:
        credit_profile_filter = ""
        params = (company,)
    else:
        credit_profile_filter = "AND c.custom_mini_pos_profile = %s"
        params = (company, profile.name)

    results = frappe.db.sql("""
        SELECT
            gl.party as customer,
            c.customer_name,
            COALESCE(SUM(gl.debit) - SUM(gl.credit), 0) as balance
        FROM `tabGL Entry` gl
        INNER JOIN `tabCustomer` c ON c.name = gl.party
        WHERE gl.party_type = 'Customer'
          AND gl.company = %s
          AND gl.docstatus = 1
          {credit_profile_filter}
        GROUP BY gl.party, c.customer_name
        HAVING balance != 0
        ORDER BY c.customer_name
    """.format(credit_profile_filter=credit_profile_filter), params, as_dict=1)

    return results

@frappe.whitelist()
def mini_pos_stock_balance(warehouse=None, items=None):
    """Get stock balance for items in the POS warehouse.
    Only returns items with actual_qty > 0 (excludes zero stock items).
    """
    profile = get_profile_or_throw()
    warehouse = profile.warehouse

    # Parse items if passed as JSON string
    if items and isinstance(items, str):
        import json
        try:
            items = json.loads(items)
        except:
            items = None

    # Build query to get actual stock from Bin table
    # Only return items with stock > 0
    company = profile.company

    query = """
        SELECT
            bin.item_code,
            item.item_name,
            bin.actual_qty
        FROM `tabBin` AS bin
        INNER JOIN `tabItem` AS item ON bin.item_code = item.name
        WHERE bin.warehouse = %s
          AND bin.actual_qty > 0
          AND item.disabled = 0
          AND (item.custom_company = %s OR item.custom_company IS NULL OR item.custom_company = '')
    """
    params = [warehouse, company]

    # Filter by specific items if provided
    if items and len(items) > 0:
        placeholders = ', '.join(['%s'] * len(items))
        query += f" AND bin.item_code IN ({placeholders})"
        params.extend(items)

    query += " ORDER BY item.item_name"

    return frappe.db.sql(query, params, as_dict=1)

def check_duplicate_invoice(customer, items, company=None, profile_name=None):
    """
    Check if a similar invoice exists for the same customer with same items and quantities
    within the last 3 hours. Returns the duplicate invoice details if found, None otherwise.
    """
    three_hours_ago = now_datetime() - timedelta(hours=3)

    # Get recent invoices for this customer
    filters = {
        "customer": customer,
        "docstatus": ["in", [0, 1]],  # Draft or Submitted
        "creation": [">=", three_hours_ago],
        "is_return": 0
    }
    if company:
        filters["company"] = company

    # Filter by mini_pos_profile
    if profile_name:
        if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
            filters["mini_pos_profile"] = profile_name
        else:
            filters["custom_mini_pos_profile"] = profile_name

    recent_invoices = frappe.get_all(
        "Sales Invoice",
        filters=filters,
        fields=["name", "posting_date", "posting_time", "grand_total", "creation"],
        order_by="creation desc"
    )

    if not recent_invoices:
        return None

    # Build a signature for the new invoice items (item_code:qty)
    new_items_signature = {}
    for item in items:
        item_code = item.get("item_code")
        qty = flt(item.get("qty", 1))
        if item_code:
            new_items_signature[item_code] = new_items_signature.get(item_code, 0) + qty

    # Check each recent invoice for matching items
    for inv in recent_invoices:
        inv_items = frappe.get_all(
            "Sales Invoice Item",
            filters={"parent": inv.name},
            fields=["item_code", "qty"]
        )

        # Build signature for existing invoice
        existing_signature = {}
        for item in inv_items:
            item_code = item.item_code
            qty = flt(item.qty)
            existing_signature[item_code] = existing_signature.get(item_code, 0) + qty

        # Compare signatures
        if new_items_signature == existing_signature:
            # Return full invoice details
            return {
                "name": inv.name,
                "posting_date": str(inv.posting_date),
                "posting_time": str(inv.posting_time)[:5] if inv.posting_time else "",
                "grand_total": flt(inv.grand_total),
                "creation": str(inv.creation)
            }

    return None


def _generate_custom_hash():
    """Generate a custom hash (5 digits + date + time) for invoice/payment identification."""
    import random
    from datetime import datetime
    now = datetime.now()
    random_5digit = str(random.randint(10000, 99999))
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")
    return f"{random_5digit}-{date_str}-{time_str}"


def _create_payment_entry(profile, customer, company, mode_of_payment, total_payment, custom_hash, profile_name_override=None, posting_date=None):
    """Create and submit a Payment Entry for the given amount.

    Args:
        profile_name_override: If provided, use this profile name instead of profile.name
            (used when admin creates payment for a customer with a different profile).

    Returns the Payment Entry name, or None if no payment was created.
    """
    if total_payment <= 0 or not mode_of_payment or mode_of_payment in ("Credit", "No Payment"):
        return None

    try:
        mop = frappe.get_doc("Mode of Payment", mode_of_payment)
    except frappe.DoesNotExistError:
        frappe.throw(_("Mode of Payment {0} not found").format(mode_of_payment))

    paid_to_account = None
    for row in mop.accounts:
        if row.company == company:
            paid_to_account = row.default_account
            break
    if not paid_to_account:
        frappe.throw(f"No account found in Mode of Payment '{mode_of_payment}' for company '{company}'")

    paid_from_account = frappe.get_value("Company", company, "default_receivable_account")
    if not paid_from_account:
        frappe.throw(f"No Default Receivable Account set for company '{company}'")

    pe_posting_date = posting_date or frappe.utils.nowdate()
    pe_dict = {
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": customer,
        "company": company,
        "posting_date": pe_posting_date,
        "paid_from": paid_from_account,
        "paid_to": paid_to_account,
        "paid_amount": total_payment,
        "received_amount": total_payment,
        "reference_no": custom_hash,
        "reference_date": pe_posting_date,
        "mode_of_payment": mode_of_payment,
        "custom_hash": custom_hash,
        "custom_mini_pos_profile": profile_name_override or profile.name,
        "references": []
    }
    if frappe.get_meta("Payment Entry").has_field("mini_pos_profile"):
        pe_dict["mini_pos_profile"] = profile_name_override or profile.name
    pe = frappe.get_doc(pe_dict)
    pe.insert(ignore_permissions=True)
    pe.submit()
    return pe.name


@frappe.whitelist(allow_guest=False)
def mini_pos_create_invoice(data):
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)
    items = data.get("items", [])
    customer = data.get("customer")
    mode_of_payment = data.get("mode_of_payment")
    is_return = int(data.get("is_return", 0))
    return_against = data.get("return_against")
    taxes_table = data.get("taxes", [])
    discount_amount = float(data.get("discount_amount") or 0)
    apply_discount_on = data.get("apply_discount_on") or "Grand Total"
    paid_amount = float(data.get("paid_amount") or 0)
    overpayment_amount = float(data.get("overpayment_amount") or 0)
    posting_date = data.get("posting_date")

    # Only allow custom posting_date if profile has allow_edit_posting_date enabled
    if posting_date and not profile.get("allow_edit_posting_date"):
        posting_date = None
    if not posting_date:
        posting_date = frappe.utils.nowdate()

    if not customer or not items:
        frappe.throw("Customer and items are required.")

    # For admin: resolve the invoice profile from the customer's custom_mini_pos_profile
    if is_admin:
        customer_profile_name = _get_customer_profile(customer)
        if customer_profile_name:
            invoice_profile_name = customer_profile_name
            # Load the customer's profile to get warehouse and company
            customer_profile = frappe.get_doc("Mini POS Profile", customer_profile_name)
            invoice_warehouse = customer_profile.warehouse
        else:
            # Customer has no profile assigned, use admin's own profile
            invoice_profile_name = profile.name
            invoice_warehouse = profile.warehouse
    else:
        invoice_profile_name = profile.name
        invoice_warehouse = profile.warehouse

    # Check for duplicate invoice (same customer, same items/qty within 3 hours)
    if not is_return:
        duplicate_invoice = check_duplicate_invoice(customer, items, company=profile.company, profile_name=invoice_profile_name)
        if duplicate_invoice:
            return {
                "duplicate": True,
                "duplicate_invoice": duplicate_invoice,
                "message": "تم اكتشاف فاتورة مكررة! توجد فاتورة سابقة بنفس الأصناف والكميات لهذا العميل"
            }

    invoice_items = []
    for item in items:
        qty = float(item.get("qty", 1))
        rate = float(item.get("rate", 0))
        item_code = item.get("item_code")
        if not item_code:
            frappe.throw(_("Item code is required for each row."))
        stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
        uom = item.get("uom") or stock_uom
        conversion_factor = float(item.get("conversion_factor") or 0)
        # If UOM is different from stock UOM and no conversion factor provided, get it from Item
        if uom != stock_uom and not conversion_factor:
            conversion_factor = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "parenttype": "Item", "uom": uom},
                "conversion_factor"
            ) or 1
        conversion_factor = conversion_factor or 1
        invoice_items.append({
            "item_code": item_code,
            "qty": qty,
            "rate": rate,
            "warehouse": invoice_warehouse,
            "uom": uom,
            "conversion_factor": conversion_factor
        })

    # --- Handle Taxes Table ---
    taxes = []
    for tax in taxes_table:
        if tax.get("account_head") and tax.get("rate") is not None:
            taxes.append({
                "charge_type": tax.get("charge_type"),
                "account_head": tax.get("account_head"),
                "rate": tax.get("rate"),
                "description": tax.get("description", ""),
            })

    custom_hash = _generate_custom_hash()
    company = profile.company
    save_as_draft = int(data.get("save_as_draft", 0))

    # --- STEP 1: Create Payment Entry (skip for drafts) ---
    total_payment = paid_amount + overpayment_amount
    payment_entry_name = None

    if not save_as_draft:
        payment_entry_name = _create_payment_entry(
            profile, customer, company, mode_of_payment, total_payment, custom_hash,
            profile_name_override=invoice_profile_name if is_admin else None,
            posting_date=posting_date
        )

    # --- STEP 2: Create Invoice ---
    doc_dict = {
        "doctype": "Sales Invoice",
        "customer": customer,
        "company": company,
        "posting_date": posting_date,
        "set_posting_time": 1,
        "is_pos": 0,
        "update_stock": 1,
        "disable_rounded_total": 1,
        "items": invoice_items,
        "custom_hash": custom_hash,
        "custom_mini_pos_profile": invoice_profile_name
    }
    # Set mini_pos_profile if field exists
    if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
        doc_dict["mini_pos_profile"] = invoice_profile_name
    if discount_amount:
        doc_dict["discount_amount"] = discount_amount
        doc_dict["apply_discount_on"] = apply_discount_on
        doc_dict["is_cash_or_non_trade_discount"] = 1
        # Get discount account from Mobile POS Settings for the profile's company
        from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
        settings = get_mobile_pos_settings(company)
        if settings.invoice_discount_account:
            doc_dict["additional_discount_account"] = settings.invoice_discount_account
    if taxes:
        doc_dict["taxes"] = taxes

    if is_return:
        doc_dict["is_return"] = 1
        doc_dict["return_against"] = return_against

    doc = frappe.get_doc(doc_dict)
    doc.insert(ignore_permissions=True)
    doc.save()

    if save_as_draft and profile.allow_draft_invoices:
        # Save as draft — store intended payment info for later submission
        if frappe.get_meta("Sales Invoice").has_field("custom_paid_amount"):
            doc.db_set("custom_paid_amount", paid_amount, update_modified=False)
        frappe.db.commit()
        return {
            "name": doc.name,
            "is_draft": True,
            "custom_hash": custom_hash,
            "grand_total": doc.grand_total
        }

    # Submit the invoice
    doc.submit()

    frappe.db.commit()
    return {
        "name": doc.name,
        "payment_entry": payment_entry_name,
        "overpayment_entry": None,
        "custom_hash": custom_hash,
        "overpayment_amount": overpayment_amount,
        "total_payment": total_payment
    }


@frappe.whitelist()
def mini_pos_get_draft_invoices(customer=None):
    """Get all draft invoices for the current user's POS profile.
    Admin users see all draft invoices across all profiles.
    """
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    filters = {
        "company": company,
        "docstatus": 0,
        "is_return": 0
    }

    # Admin sees all drafts; non-admin filtered by own profile
    if not is_admin:
        if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
            filters["mini_pos_profile"] = profile.name
        else:
            filters["custom_mini_pos_profile"] = profile.name

    if customer:
        filters["customer"] = customer

    invoices = frappe.get_all(
        "Sales Invoice",
        filters=filters,
        fields=[
            "name", "customer", "customer_name", "posting_date",
            "grand_total", "custom_hash", "custom_paid_amount", "creation"
        ],
        order_by="creation desc",
        limit=50
    )

    # Add item count for each invoice
    for inv in invoices:
        inv["item_count"] = frappe.db.count(
            "Sales Invoice Item", {"parent": inv.name}
        )

    return invoices


@frappe.whitelist()
def mini_pos_get_draft_invoice(invoice_name):
    """Get a single draft invoice with its items for loading into POS page."""
    profile = get_profile_or_throw()

    if not invoice_name:
        frappe.throw(_("Invoice name is required."))

    doc = frappe.get_doc("Sales Invoice", invoice_name)

    if doc.docstatus != 0:
        frappe.throw(_("Only draft invoices can be loaded."))
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this invoice."))
    doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
    if doc_profile and doc_profile != profile.name and not _is_pos_admin():
        frappe.throw(_("You don't have access to this invoice."))

    items = []
    for item in doc.items:
        items.append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "qty": item.qty,
            "rate": item.rate,
            "uom": item.uom,
            "conversion_factor": item.conversion_factor
        })

    return {
        "name": doc.name,
        "customer": doc.customer,
        "customer_name": doc.customer_name,
        "items": items,
        "discount_amount": doc.discount_amount or 0,
        "grand_total": doc.grand_total,
        "custom_paid_amount": doc.get("custom_paid_amount") or 0
    }


@frappe.whitelist()
def mini_pos_update_draft_invoice(invoice_name, data):
    """Update items, customer, discount, and taxes on a draft invoice."""
    profile = get_profile_or_throw()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data)

    if not invoice_name:
        frappe.throw(_("Invoice name is required."))

    doc = frappe.get_doc("Sales Invoice", invoice_name)

    # Validate: must be draft and belong to this profile
    if doc.docstatus != 0:
        frappe.throw(_("Only draft invoices can be edited."))
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this invoice."))
    doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
    if doc_profile and doc_profile != profile.name and not _is_pos_admin():
        frappe.throw(_("You don't have access to this invoice."))

    # Update customer if provided
    if data.get("customer"):
        doc.customer = data.get("customer")

    # Update items if provided
    items = data.get("items")
    if items:
        doc.items = []
        for item in items:
            item_code = item.get("item_code")
            if not item_code:
                frappe.throw(_("Item code is required for each row."))
            stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
            uom = item.get("uom") or stock_uom
            conversion_factor = float(item.get("conversion_factor") or 0)
            if uom != stock_uom and not conversion_factor:
                conversion_factor = frappe.db.get_value(
                    "UOM Conversion Detail",
                    {"parent": item_code, "parenttype": "Item", "uom": uom},
                    "conversion_factor"
                ) or 1
            conversion_factor = conversion_factor or 1
            doc.append("items", {
                "item_code": item_code,
                "qty": float(item.get("qty", 1)),
                "rate": float(item.get("rate", 0)),
                "warehouse": profile.warehouse,
                "uom": uom,
                "conversion_factor": conversion_factor
            })

    # Update discount if provided
    discount_amount = float(data.get("discount_amount") or 0)
    if discount_amount:
        doc.discount_amount = discount_amount
        doc.apply_discount_on = data.get("apply_discount_on") or "Grand Total"
        doc.is_cash_or_non_trade_discount = 1
        from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
        settings = get_mobile_pos_settings(profile.company)
        if settings.invoice_discount_account:
            doc.additional_discount_account = settings.invoice_discount_account
    elif "discount_amount" in data:
        doc.discount_amount = 0

    # Update taxes if provided
    taxes_table = data.get("taxes")
    if taxes_table is not None:
        doc.taxes = []
        for tax in taxes_table:
            if tax.get("account_head") and tax.get("rate") is not None:
                doc.append("taxes", {
                    "charge_type": tax.get("charge_type"),
                    "account_head": tax.get("account_head"),
                    "rate": tax.get("rate"),
                    "description": tax.get("description", ""),
                })

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": doc.name,
        "grand_total": doc.grand_total,
        "customer": doc.customer,
        "customer_name": doc.customer_name
    }


@frappe.whitelist()
def mini_pos_submit_draft_invoice(invoice_name, data=None):
    """Submit a draft invoice with payment information."""
    profile = get_profile_or_throw()
    data = frappe._dict(json.loads(data) if isinstance(data, str) else data) if data else frappe._dict()

    if not invoice_name:
        frappe.throw(_("Invoice name is required."))

    doc = frappe.get_doc("Sales Invoice", invoice_name)

    # Validate: must be draft and belong to this profile
    if doc.docstatus != 0:
        frappe.throw(_("Only draft invoices can be submitted."))
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this invoice."))
    doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
    if doc_profile and doc_profile != profile.name and not _is_pos_admin():
        frappe.throw(_("You don't have access to this invoice."))

    company = profile.company
    customer = doc.customer
    mode_of_payment = data.get("mode_of_payment")
    paid_amount = float(data.get("paid_amount") or 0)
    overpayment_amount = float(data.get("overpayment_amount") or 0)
    total_payment = paid_amount + overpayment_amount

    # Use existing custom_hash or generate a new one
    custom_hash = doc.get("custom_hash") or _generate_custom_hash()
    if not doc.get("custom_hash"):
        doc.db_set("custom_hash", custom_hash, update_modified=False)

    # Create Payment Entry - use the invoice's profile (may differ from admin's profile)
    invoice_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
    pe_profile_override = invoice_profile if (_is_pos_admin() and invoice_profile) else None
    payment_entry_name = _create_payment_entry(
        profile, customer, company, mode_of_payment, total_payment, custom_hash,
        profile_name_override=pe_profile_override
    )

    # Update due_date to now to avoid "due date before posting date" error
    # (draft may have been created days ago with an older due_date)
    doc.due_date = frappe.utils.nowdate()
    doc.save(ignore_permissions=True)

    # Submit the invoice
    doc.submit()
    frappe.db.commit()

    return {
        "name": doc.name,
        "payment_entry": payment_entry_name,
        "custom_hash": custom_hash,
        "overpayment_amount": overpayment_amount,
        "total_payment": total_payment
    }


@frappe.whitelist()
def mini_pos_delete_draft_invoice(invoice_name):
    """Delete a draft invoice."""
    profile = get_profile_or_throw()

    if not invoice_name:
        frappe.throw(_("Invoice name is required."))

    doc = frappe.get_doc("Sales Invoice", invoice_name)

    # Validate: must be draft and belong to this profile
    if doc.docstatus != 0:
        frappe.throw(_("Only draft invoices can be deleted."))
    if doc.company != profile.company:
        frappe.throw(_("You don't have access to this invoice."))
    doc_profile = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile")
    if doc_profile and doc_profile != profile.name and not _is_pos_admin():
        frappe.throw(_("You don't have access to this invoice."))

    frappe.delete_doc("Sales Invoice", invoice_name, ignore_permissions=True)
    frappe.db.commit()

    return {"success": True, "message": _("Draft invoice {0} deleted.").format(invoice_name)}


@frappe.whitelist()
def mini_pos_transfer_draft_stock():
    """Aggregate all items from draft invoices for this profile and create
    a Material Transfer Stock Entry from the main warehouse to the POS warehouse."""
    profile = get_profile_or_throw()
    company = profile.company
    target_warehouse = profile.warehouse

    if not target_warehouse:
        return {"success": False, "message": "لم يتم تحديد مستودع في ملف POS"}

    # Get main warehouse from Mobile POS Settings
    from mobile_pos.mobile_pos.doctype.mobile_pos_settings.mobile_pos_settings import get_mobile_pos_settings
    settings = get_mobile_pos_settings(company)
    source_warehouse = settings.main_warehouse

    if not source_warehouse:
        return {"success": False, "message": "الرجاء تحديد المستودع الرئيسي في إعدادات Mobile POS"}

    if source_warehouse == target_warehouse:
        return {"success": False, "message": "المستودع الرئيسي والمستودع المستهدف متطابقان"}

    # Build filters for draft invoices belonging to this profile
    filters = {
        "company": company,
        "docstatus": 0,
        "is_return": 0
    }
    if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
        filters["mini_pos_profile"] = profile.name
    else:
        filters["custom_mini_pos_profile"] = profile.name

    draft_invoices = frappe.get_all("Sales Invoice", filters=filters, pluck="name")

    if not draft_invoices:
        return {"success": False, "message": "لا توجد مسودات فواتير"}

    # Aggregate items across all drafts
    items_agg = {}
    for inv_name in draft_invoices:
        inv_items = frappe.get_all(
            "Sales Invoice Item",
            filters={"parent": inv_name},
            fields=["item_code", "item_name", "stock_qty", "stock_uom"]
        )
        for item in inv_items:
            key = item.item_code
            if key in items_agg:
                items_agg[key]["qty"] += float(item.stock_qty or 0)
            else:
                items_agg[key] = {
                    "item_code": item.item_code,
                    "item_name": item.item_name,
                    "qty": float(item.stock_qty or 0),
                    "uom": item.stock_uom
                }

    if not items_agg:
        return {"success": False, "message": "لا توجد أصناف في المسودات"}

    # Create Stock Entry (Material Transfer) as draft
    stock_entry = frappe.new_doc("Stock Entry")
    stock_entry.stock_entry_type = "Material Transfer"
    stock_entry.company = company
    stock_entry.posting_date = frappe.utils.nowdate()
    stock_entry.set_posting_time = 1

    # Set transfer_type and mini_pos_profile if fields exist
    if frappe.get_meta("Stock Entry").has_field("transfer_type"):
        stock_entry.transfer_type = "تحميل"
    if frappe.get_meta("Stock Entry").has_field("mini_pos_profile"):
        stock_entry.mini_pos_profile = profile.name

    for item_data in items_agg.values():
        if item_data["qty"] <= 0:
            continue
        stock_entry.append("items", {
            "item_code": item_data["item_code"],
            "qty": item_data["qty"],
            "s_warehouse": source_warehouse,
            "t_warehouse": target_warehouse,
            "uom": item_data["uom"]
        })

    if not stock_entry.items:
        return {"success": False, "message": "لا توجد أصناف بكمية صالحة للتحويل"}

    stock_entry.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "success": True,
        "message": f"تم إنشاء حركة مخزون (مسودة): {stock_entry.name}",
        "stock_entry": stock_entry.name,
        "items_count": len(stock_entry.items),
        "drafts_count": len(draft_invoices),
        "source_warehouse": source_warehouse,
        "target_warehouse": target_warehouse
    }


@frappe.whitelist()
def mini_pos_make_payment(customer, amount, mode_of_payment, invoice=None, payment_type="Receive", remarks=None):
    profile = get_profile_or_throw()
    company = profile.company
    amount = float(amount)
    if not mode_of_payment:
        frappe.throw(_("Mode of Payment is required."))

    # Validate payment_type
    if payment_type not in ("Receive", "Pay"):
        payment_type = "Receive"

    # Get Mode of Payment Doc
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
        frappe.throw(f"No account found in Mode of Payment '{mode_of_payment}' for company '{company}'")

    receivable_account = frappe.get_value("Company", company, "default_receivable_account")
    if not receivable_account:
        frappe.throw(f"No Default Receivable Account set for company '{company}'")

    # For Receive: paid_from = receivable (customer owes us), paid_to = mode of payment account
    # For Pay: paid_from = mode of payment account, paid_to = receivable (we owe customer)
    if payment_type == "Receive":
        paid_from_account = receivable_account
        paid_to_account = mop_account
    else:  # Pay
        paid_from_account = mop_account
        paid_to_account = receivable_account

    # Admin uses customer's profile; non-admin uses own profile
    is_admin = _is_pos_admin()
    if is_admin:
        pe_profile = _get_customer_profile(customer) or profile.name
    else:
        pe_profile = profile.name

    pe_dict = {
        "doctype": "Payment Entry",
        "payment_type": payment_type,
        "party_type": "Customer",
        "party": customer,
        "company": company,
        "paid_from": paid_from_account,
        "paid_to": paid_to_account,
        "paid_amount": amount,
        "received_amount": amount,
        "reference_no": frappe.generate_hash(length=8),
        "reference_date": frappe.utils.nowdate(),
        "mode_of_payment": mode_of_payment,
        "custom_mini_pos_profile": pe_profile,
        "references": []
    }

    # Add remarks if provided
    if remarks:
        pe_dict["remarks"] = remarks

    # Set mini_pos_profile if field exists
    if frappe.get_meta("Payment Entry").has_field("mini_pos_profile"):
        pe_dict["mini_pos_profile"] = pe_profile
    if invoice:
        pe_dict["references"] = [{
            "reference_doctype": "Sales Invoice",
            "reference_name": invoice,
            "allocated_amount": amount
        }]
    pe = frappe.get_doc(pe_dict)
    pe.insert(ignore_permissions=True)
    pe.submit()
    frappe.db.commit()
    return {"name": pe.name}

@frappe.whitelist()
def mini_pos_get_returns(return_against, items):
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    if isinstance(items, str):
        items = json.loads(items)

    doc = frappe.get_doc("Sales Invoice", return_against)

    # Validate that the return_against invoice belongs to the same company
    if doc.company != profile.company:
        frappe.throw(_("Return invoice does not belong to your company."), frappe.PermissionError)

    # For admin: use the original invoice's profile and warehouse
    if is_admin:
        orig_profile_name = doc.get("mini_pos_profile") or doc.get("custom_mini_pos_profile") or profile.name
        try:
            orig_profile_doc = frappe.get_doc("Mini POS Profile", orig_profile_name)
            return_warehouse = orig_profile_doc.warehouse
        except Exception:
            return_warehouse = profile.warehouse
        return_profile_name = orig_profile_name
    else:
        return_warehouse = profile.warehouse
        return_profile_name = profile.name

    # Get discount from original invoice (negate it for return since items are negative)
    original_discount = doc.discount_amount or 0
    # For returns, discount should be negative to reduce the credit note amount
    return_discount = -1 * original_discount

    return_items = []
    for item in items:
        item_code = item["item_code"]
        stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
        uom = item.get("uom") or stock_uom
        conversion_factor = float(item.get("conversion_factor") or 0)
        # If UOM is different from stock UOM and no conversion factor provided, get it from Item
        if uom != stock_uom and not conversion_factor:
            conversion_factor = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "parenttype": "Item", "uom": uom},
                "conversion_factor"
            ) or 1
        conversion_factor = conversion_factor or 1
        return_items.append({
            "item_code": item_code,
            "qty": item["qty"],
            "rate": item.get("rate"),
            "warehouse": return_warehouse,
            "uom": uom,
            "conversion_factor": conversion_factor
        })

    # Generate custom hash for return
    import random
    from datetime import datetime
    now = datetime.now()
    random_5digit = str(random.randint(10000, 99999))
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")
    custom_hash = f"{random_5digit}-{date_str}-{time_str}"

    return_doc_dict = {
        "doctype": "Sales Invoice",
        "is_return": 1,
        "return_against": return_against,
        "customer": doc.customer,
        "company": doc.company,
        "items": return_items,
        "payments": [],
        "update_stock": 1,
        "disable_rounded_total": 1,
        "custom_hash": custom_hash,
        "custom_mini_pos_profile": return_profile_name,
        "discount_amount": return_discount,
        # Copy taxes (structure, as list of dicts)
        "taxes": [row.as_dict() for row in doc.taxes] if doc.taxes else []
    }
    # Copy discount settings from original invoice
    if original_discount:
        return_doc_dict["is_cash_or_non_trade_discount"] = doc.is_cash_or_non_trade_discount
        if doc.additional_discount_account:
            return_doc_dict["additional_discount_account"] = doc.additional_discount_account
    # Set mini_pos_profile if field exists
    if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
        return_doc_dict["mini_pos_profile"] = return_profile_name
    return_doc = frappe.get_doc(return_doc_dict)
    return_doc.insert()
    return_doc.submit()

    # Update original invoice status
    doc.status = "Credit Note Issued"
    doc.db_update()
    frappe.db.commit()
    # Return the original positive discount for display in receipt
    return {"name": return_doc.name, "custom_hash": custom_hash, "discount_amount": abs(original_discount)}


@frappe.whitelist()
def mini_pos_create_direct_return(customer, items):
    """
    Create a direct return invoice without requiring an original invoice.
    Items should have negative quantities.
    Admin users: the invoice profile is resolved from the customer's custom_mini_pos_profile.

    Args:
        customer: Customer name
        items: JSON string or list of items with item_code, qty (negative), rate, uom

    Returns:
        dict with return invoice name and custom_hash
    """
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    if isinstance(items, str):
        items = json.loads(items)

    if not customer:
        frappe.throw(_("Customer is required"))

    if not items:
        frappe.throw(_("At least one item is required"))

    # For admin: resolve the invoice profile from the customer
    if is_admin:
        customer_profile_name = _get_customer_profile(customer)
        if customer_profile_name:
            invoice_profile_name = customer_profile_name
            invoice_warehouse = frappe.db.get_value("Mini POS Profile", customer_profile_name, "warehouse")
        else:
            invoice_profile_name = profile.name
            invoice_warehouse = profile.warehouse
    else:
        invoice_profile_name = profile.name
        invoice_warehouse = profile.warehouse

    return_items = []
    for item in items:
        qty = flt(item.get("qty", 0))
        if qty >= 0:
            frappe.throw(_("Return quantities must be negative"))

        item_code = item["item_code"]
        stock_uom = frappe.db.get_value("Item", item_code, "stock_uom")
        uom = item.get("uom") or stock_uom
        conversion_factor = float(item.get("conversion_factor") or 0)
        # If UOM is different from stock UOM and no conversion factor provided, get it from Item
        if uom != stock_uom and not conversion_factor:
            conversion_factor = frappe.db.get_value(
                "UOM Conversion Detail",
                {"parent": item_code, "parenttype": "Item", "uom": uom},
                "conversion_factor"
            ) or 1
        conversion_factor = conversion_factor or 1
        return_items.append({
            "item_code": item_code,
            "qty": qty,
            "rate": flt(item.get("rate", 0)),
            "warehouse": invoice_warehouse,
            "uom": uom,
            "conversion_factor": conversion_factor
        })

    # Generate custom hash for return
    import random
    from datetime import datetime
    now = datetime.now()
    random_5digit = str(random.randint(10000, 99999))
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M%S")
    custom_hash = f"{random_5digit}-{date_str}-{time_str}"

    return_doc_dict = {
        "doctype": "Sales Invoice",
        "is_return": 1,
        "customer": customer,
        "company": profile.company,
        "items": return_items,
        "payments": [],
        "update_stock": 1,
        "disable_rounded_total": 1,
        "custom_hash": custom_hash,
        "custom_mini_pos_profile": invoice_profile_name,
    }

    # Set mini_pos_profile if field exists
    if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
        return_doc_dict["mini_pos_profile"] = invoice_profile_name

    return_doc = frappe.get_doc(return_doc_dict)
    return_doc.insert()
    return_doc.submit()
    frappe.db.commit()

    return {
        "name": return_doc.name,
        "custom_hash": custom_hash,
        "grand_total": abs(return_doc.grand_total)
    }


@frappe.whitelist()
def mini_pos_get_items_price(items):
    """
    Get prices for multiple items from the default price list.

    Args:
        items: JSON string or list of item codes

    Returns:
        dict with item_code as key and price as value
    """
    profile = get_profile_or_throw()

    if isinstance(items, str):
        items = json.loads(items)

    if not items:
        return {}

    # Get selling price list - company-specific first, then global fallback
    price_list = get_company_price_list(profile.company)

    if not price_list:
        # Return empty prices if no price list configured
        return {item: 0 for item in items}

    # Get prices from Item Price filtered by company
    company = profile.company
    prices = {}
    for item_code in items:
        price = frappe.db.get_value(
            "Item Price",
            {
                "item_code": item_code,
                "price_list": price_list,
                "selling": 1,
                "custom_company": company
            },
            "price_list_rate"
        )
        prices[item_code] = flt(price) if price else 0

    return prices


@frappe.whitelist()
def mini_pos_create_customer(customer_name, customer_type="Individual", territory=None, customer_group=None):
    """Create a new customer and automatically assign current user's POS profile"""
    profile = get_profile_or_throw()

    if not customer_name:
        frappe.throw(_("Customer name is required"))

    # Set defaults if not provided
    if not territory:
        territory = frappe.db.get_single_value('Selling Settings', 'territory') or "All Territories"
    if not customer_group:
        customer_group = frappe.db.get_single_value('Selling Settings', 'customer_group') or "Individual"

    # Create customer document
    customer = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": customer_name,
        "customer_type": customer_type,
        "territory": territory,
        "customer_group": customer_group,
        "custom_mini_pos_profile": profile.name,
        "custom_company": profile.company
    })

    customer.insert(ignore_permissions=True)
    frappe.db.commit()

    return {
        "name": customer.name,
        "customer_name": customer.customer_name,
        "custom_mini_pos_profile": customer.custom_mini_pos_profile
    }

@frappe.whitelist()
def mini_pos_get_customers():
    """Get list of customers for the POS filtered by current user's POS profile.
    Admin users see all customers across all profiles.
    """
    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()

    filters = {}
    if is_admin:
        # Admin sees all customers that have any mini_pos_profile assigned
        filters['custom_mini_pos_profile'] = ['is', 'set']
    else:
        filters['custom_mini_pos_profile'] = profile.name

    customers = frappe.get_list('Customer',
        fields=['name', 'customer_name', 'custom_mini_pos_profile'],
        filters=filters,
        limit_page_length=1000,
        order_by='name'
    )
    return customers

@frappe.whitelist()
def mini_pos_get_items():
    """Get list of items for the POS filtered by profile company"""
    profile = get_profile_or_throw()
    company = profile.company
    filters = {'disabled': 0, 'is_sales_item': 1}
    if company:
        filters['custom_company'] = company
    items = frappe.get_list('Item',
        fields=['name', 'item_name', 'stock_uom', 'image', 'description', 'standard_rate', 'item_group'],
        filters=filters,
        limit_page_length=1000,
        order_by='name'
    )
    return items

@frappe.whitelist()
def mini_pos_get_warehouses():
    """Get list of warehouses (non-group) filtered by company"""
    profile = get_profile_or_throw()
    warehouses = frappe.get_list('Warehouse',
        fields=['name'],
        filters={'is_group': 0, 'company': profile.company},
        limit_page_length=100,
        order_by='name'
    )
    return warehouses

@frappe.whitelist()
def mini_pos_cancel_invoice(invoice_name):
    """Cancel a sales invoice and its associated payment entry if found"""
    if not invoice_name:
        frappe.throw(_("Invoice name is required."))

    profile = get_profile_or_throw()

    try:
        # Get the invoice
        invoice = frappe.get_doc("Sales Invoice", invoice_name)

        # Verify the invoice belongs to the user's company and profile
        if invoice.company != profile.company:
            frappe.throw(_("You don't have access to this invoice"))

        is_admin = _is_pos_admin()
        if not is_admin:
            invoice_profile = invoice.get("mini_pos_profile") or invoice.get("custom_mini_pos_profile")
            if invoice_profile and invoice_profile != profile.name:
                frappe.throw(_("You don't have access to this invoice"))

        # Check if already cancelled
        if invoice.docstatus == 2:
            return {"message": "Invoice is already cancelled", "status": "already_cancelled"}

        # Get the custom_hash from the invoice
        custom_hash = invoice.get("custom_hash")

        # Cancel the invoice
        invoice.cancel()

        # If there's a custom_hash, find and cancel the payment entry
        payment_entry_cancelled = False
        if custom_hash:
            payment_entries = frappe.get_all(
                "Payment Entry",
                filters={
                    "custom_hash": custom_hash,
                    "docstatus": 1
                },
                fields=["name"]
            )

            for pe in payment_entries:
                try:
                    payment_entry = frappe.get_doc("Payment Entry", pe.name)
                    payment_entry.cancel()
                    payment_entry_cancelled = True
                except Exception as e:
                    frappe.log_error(f"Error cancelling payment entry {pe.name}: {str(e)}")

        frappe.db.commit()
        return {
            "message": "Invoice cancelled successfully",
            "status": "success",
            "payment_entry_cancelled": payment_entry_cancelled
        }

    except frappe.DoesNotExistError:
        frappe.throw(_("Invoice {0} not found").format(invoice_name))
    except Exception as e:
        frappe.throw(_("Error cancelling invoice: {0}").format(str(e)))

@frappe.whitelist()
def mini_pos_get_customer_invoices(customer):
    """Get list of submitted invoices for a customer (excluding return invoices).
    Admin users see all invoices regardless of profile.
    """
    if not customer:
        frappe.throw(_("Customer is required."))

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    filters = {
        "customer": customer,
        "company": company,
        "docstatus": 1,
        "is_return": 0  # Exclude return invoices
    }

    # Admin sees all; non-admin filtered by profile
    if not is_admin:
        if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
            filters["mini_pos_profile"] = profile.name
        else:
            filters["custom_mini_pos_profile"] = profile.name

    invoices = frappe.get_all(
        "Sales Invoice",
        filters=filters,
        fields=["name", "posting_date", "grand_total", "outstanding_amount", "custom_hash"],
        order_by="posting_date desc",
        limit=50
    )

    return invoices


@frappe.whitelist()
def create_expense_entry(expense, amount, remark, mode_of_payment, pos_profile=None, company=None):
    """
    Create an Expense Entry from Mini POS
    """
    try:
        # Always use company from profile for security
        profile = get_profile_or_throw()
        company = profile.company

        expense_entry = frappe.new_doc("Expense Entry")
        expense_entry.posting_date = frappe.utils.today()
        expense_entry.company = company
        expense_entry.expense = expense
        expense_entry.mode_of_payment = mode_of_payment
        expense_entry.amount = flt(amount)
        expense_entry.mini_pos_profile = pos_profile

        # Get cost center from company default if not in profile
        cost_center = frappe.db.get_value("Company", company, "cost_center")
        if cost_center:
            expense_entry.cost_center = cost_center

        if remark:
            expense_entry.remarks = remark

        expense_entry.insert()
        expense_entry.submit()

        return {
            "success": True,
            "name": expense_entry.name,
            "journal_entry": expense_entry.journal_entry
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Expense Entry Creation Error")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def mini_pos_customer_invoices(customer):
    """Get list of invoices for a customer with basic info.
    Admin users see all invoices regardless of profile.
    """
    if not customer:
        frappe.throw("Customer is required.")

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    # Build profile filter - admin sees all
    if is_admin:
        profile_filter = ""
        params = (customer, company)
    else:
        if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
            profile_filter = "AND si.mini_pos_profile = %s"
        else:
            profile_filter = "AND si.custom_mini_pos_profile = %s"
        params = (customer, company, profile.name)

    invoices = frappe.db.sql("""
        SELECT
            si.name,
            si.posting_date,
            si.posting_time,
            si.grand_total,
            si.outstanding_amount,
            si.status,
            si.is_return,
            si.return_against,
            si.custom_hash
        FROM `tabSales Invoice` si
        WHERE si.customer = %s
          AND si.company = %s
          AND si.docstatus = 1
          {profile_filter}
        ORDER BY si.posting_date DESC, si.posting_time DESC
        LIMIT 50
    """.format(profile_filter=profile_filter), params, as_dict=1)

    return invoices

@frappe.whitelist()
def mini_pos_invoice_details(invoice_name):
    """Get full invoice details including items for reprinting.
    Admin users can access any invoice regardless of profile.
    """
    if not invoice_name:
        frappe.throw("Invoice name is required.")

    profile = get_profile_or_throw()
    is_admin = _is_pos_admin()
    company = profile.company

    # Build profile filter - admin sees all
    if is_admin:
        inv_profile_filter = ""
        params = (invoice_name, company)
    else:
        if frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
            inv_profile_filter = "AND si.mini_pos_profile = %s"
        else:
            inv_profile_filter = "AND si.custom_mini_pos_profile = %s"
        params = (invoice_name, company, profile.name)

    # Get invoice header
    invoice = frappe.db.sql("""
        SELECT
            si.name,
            si.customer,
            si.customer_name,
            si.posting_date,
            si.posting_time,
            si.total,
            si.discount_amount,
            si.grand_total,
            si.paid_amount,
            si.outstanding_amount,
            si.status,
            si.is_return,
            si.return_against,
            si.custom_hash,
            si.custom_customer_balance_after,
            si.custom_paid_amount
        FROM `tabSales Invoice` si
        WHERE si.name = %s
          AND si.company = %s
          AND si.docstatus = 1
          {inv_profile_filter}
    """.format(inv_profile_filter=inv_profile_filter), params, as_dict=1)

    if not invoice:
        frappe.throw("Invoice not found.")

    invoice = invoice[0]

    # Get invoice items
    items = frappe.db.sql("""
        SELECT
            sii.item_code,
            sii.item_name,
            sii.qty,
            sii.rate,
            sii.amount,
            sii.uom
        FROM `tabSales Invoice Item` sii
        WHERE sii.parent = %s
        ORDER BY sii.idx
    """, invoice_name, as_dict=1)

    invoice['items'] = items

    # Get payments if any
    payments = frappe.db.sql("""
        SELECT
            sip.mode_of_payment,
            sip.amount
        FROM `tabSales Invoice Payment` sip
        WHERE sip.parent = %s
    """, invoice_name, as_dict=1)

    invoice['payments'] = payments

    # Get customer balance
    try:
        from mobile_pos.mobile_pos.utils.invoice_utils import get_customer_balance
        customer_balance = get_customer_balance(invoice.customer, company)
    except:
        customer_balance = 0

    invoice['customer_balance'] = customer_balance

    return invoice


@frappe.whitelist()
def mini_pos_get_discount_types():
    """Get list of discount types for the POS"""
    profile = get_profile_or_throw()
    company = profile.company

    discount_types = frappe.get_all(
        "Discount Type",
        filters={"company": company},
        fields=["name", "discount_type_name", "discount_account"]
    )
    return discount_types


@frappe.whitelist()
def mini_pos_create_customer_discount(customer, discount_type, amount, remarks=None):
    """
    Create a Journal Entry to apply discount to customer account.
    This debits the discount account and credits the customer's receivable account.

    Args:
        customer: Customer name
        discount_type: Discount Type doctype name
        amount: Discount amount (positive number)
        remarks: Optional remarks for the journal entry

    Returns:
        dict with journal entry name and status
    """
    profile = get_profile_or_throw()
    company = profile.company
    amount = flt(amount)

    if amount <= 0:
        frappe.throw(_("Discount amount must be greater than zero."))

    if not customer:
        frappe.throw(_("Customer is required."))

    if not discount_type:
        frappe.throw(_("Discount Type is required."))

    # Get discount type details
    try:
        discount_doc = frappe.get_doc("Discount Type", discount_type)
    except frappe.DoesNotExistError:
        frappe.throw(_("Discount Type {0} not found").format(discount_type))

    discount_account = discount_doc.discount_account
    if not discount_account:
        frappe.throw(_("No discount account configured for {0}").format(discount_type))

    # Get customer receivable account
    receivable_account = frappe.get_value("Company", company, "default_receivable_account")
    if not receivable_account:
        frappe.throw(_("No Default Receivable Account set for company {0}").format(company))

    # Get cost center
    cost_center = frappe.db.get_value("Company", company, "cost_center")

    # Create Journal Entry
    # Debit: Discount Account (expense)
    # Credit: Customer Receivable Account (reduces customer balance)
    # Admin uses customer's profile
    if _is_pos_admin():
        je_profile = _get_customer_profile(customer) or profile.name
    else:
        je_profile = profile.name

    je = frappe.new_doc("Journal Entry")
    je.voucher_type = "Journal Entry"
    je.company = company
    je.posting_date = frappe.utils.nowdate()
    je.user_remark = remarks or _("Customer Discount - {0}").format(discount_doc.discount_type_name)
    je.custom_mini_pos_profile = je_profile
    je.custom_discount_type = discount_type

    # Debit row - Discount expense account
    je.append("accounts", {
        "account": discount_account,
        "debit_in_account_currency": amount,
        "credit_in_account_currency": 0,
        "cost_center": cost_center,
        "mini_pos_profile": je_profile
    })

    # Credit row - Customer receivable account
    je.append("accounts", {
        "account": receivable_account,
        "party_type": "Customer",
        "party": customer,
        "debit_in_account_currency": 0,
        "credit_in_account_currency": amount,
        "cost_center": cost_center,
        "mini_pos_profile": je_profile
    })

    je.insert(ignore_permissions=True)
    je.submit()
    frappe.db.commit()

    return {
        "success": True,
        "name": je.name,
        "message": _("Discount of {0} applied to customer {1}").format(amount, customer)
    }


@frappe.whitelist()
def mini_pos_get_customer_sold_items(customer, search_term=None):
    """Get items previously sold to a customer from Sales Invoices"""
    profile = get_profile_or_throw()
    company = profile.company

    if not customer:
        return []

    # Build search condition
    search_condition = ""
    if search_term:
        search_condition = "AND (sii.item_name LIKE %(search)s OR sii.item_code LIKE %(search)s)"

    # Build profile filter - admin sees all, non-admin filtered by own profile
    is_admin = _is_pos_admin()
    if is_admin:
        sold_profile_filter = ""
        sold_profile_filter2 = ""
    elif frappe.get_meta("Sales Invoice").has_field("mini_pos_profile"):
        sold_profile_filter = "AND si.mini_pos_profile = %(profile)s"
        sold_profile_filter2 = "AND si2.mini_pos_profile = %(profile)s"
    else:
        sold_profile_filter = "AND si.custom_mini_pos_profile = %(profile)s"
        sold_profile_filter2 = "AND si2.custom_mini_pos_profile = %(profile)s"

    # Get unique items sold to this customer with their last sold rate
    items = frappe.db.sql("""
        SELECT DISTINCT
            sii.item_code,
            sii.item_name,
            sii.uom,
            (
                SELECT sii2.rate
                FROM `tabSales Invoice Item` sii2
                INNER JOIN `tabSales Invoice` si2 ON si2.name = sii2.parent
                WHERE sii2.item_code = sii.item_code
                  AND si2.customer = %(customer)s
                  AND si2.company = %(company)s
                  AND si2.docstatus = 1
                  {sold_profile_filter2}
                ORDER BY si2.posting_date DESC, si2.creation DESC
                LIMIT 1
            ) as rate
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.customer = %(customer)s
          AND si.company = %(company)s
          AND si.docstatus = 1
          {sold_profile_filter}
          {search_condition}
        ORDER BY sii.item_name ASC
        LIMIT 100
    """.format(search_condition=search_condition, sold_profile_filter=sold_profile_filter, sold_profile_filter2=sold_profile_filter2), {
        "customer": customer,
        "company": company,
        "profile": profile.name,
        "search": f"%{search_term}%" if search_term else None
    }, as_dict=True)

    return items
