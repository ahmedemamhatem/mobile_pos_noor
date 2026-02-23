import frappe
import json


def redirect_login_to_main(response=None, **kwargs):
    """Redirect /login to /main for all requests."""
    try:
        req = getattr(frappe.local, "request", None)
        if not req or not response:
            return

        # GET /login → redirect to /main (the main page has its own login modal)
        if req.method == "GET" and req.path in ("/login", "/login/"):
            response.status_code = 302
            response.headers["Location"] = "/main"
            response.set_data("")
            return

        # POST /login (login form submit) → change home_page to /main
        is_login = req.method == "POST" and (
            req.path in ("/api/method/login", "/login")
            or frappe.local.form_dict.get("cmd") == "login"
        )
        if not is_login:
            return

        content_type = response.content_type or ""
        if "json" not in content_type:
            return

        data = response.get_json(silent=True)
        if not data:
            return

        msg = data.get("message")
        if msg in ("Logged In", "No App"):
            data["home_page"] = "/main"
            response.set_data(json.dumps(data))
    except Exception:
        pass
