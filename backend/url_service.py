import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

# Regular expression to extract HTTP/HTTPS and www URLs from message text
URL_REGEX = re.compile(
    r'(?:https?://[^\s<>"]+|www\.[^\s<>"]+)',
    re.IGNORECASE
)

# Known URL shortener hostnames
KNOWN_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc", "tr.im"
}

# Suspicious keywords frequently observed in phishing / fraud domains or paths
SUSPICIOUS_KEYWORDS = [
    "kyc", "verify", "verification", "suspend", "suspended", "block",
    "blocked", "account", "login", "bank", "secure", "update", "claim",
    "reward", "bonus", "prize", "lottery", "refund", "wallet", "otp",
    "password", "urgent"
]

# High-risk / frequently abused top-level domains
HIGH_RISK_TLDS = {
    "top", "xyz", "biz", "tk", "ml", "ga", "cf", "gq", "click", "work", "club", "surf"
}

# IPv4 address matching regex for hostname
IPV4_REGEX = re.compile(
    r'^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::\d+)?$'
)


def extract_url_from_text(text: str) -> Optional[str]:
    """
    Extracts the first URL found in the provided text.
    Normalizes 'www.' prefixed URLs with 'http://'.
    """
    if not text:
        return None

    match = URL_REGEX.search(text)
    if not match:
        return None

    url = match.group(0).strip('.,;:!?)"\']')
    if url.lower().startswith("www."):
        url = "http://" + url
    return url


def analyze_url(message: str) -> Dict[str, Any]:
    """
    Performs safe, offline heuristic analysis of any URL contained within an SMS message.
    Strict safety rule: Never visits, resolves, or makes network requests to the target URL.

    Args:
        message (str): SMS message text to inspect.

    Returns:
        dict: {
            "url_found": bool,
            "url": str | None,
            "risk_level": "low" | "medium" | "high",
            "indicators": list[str],
            "message": str
        }
    """
    url = extract_url_from_text(message)
    if not url:
        return {
            "url_found": False,
            "url": None,
            "risk_level": "low",
            "indicators": [],
            "message": "No URL found in the message.",
        }

    indicators: List[str] = []

    try:
        parsed = urlparse(url)
        scheme = (parsed.scheme or "").lower()
        netloc = (parsed.netloc or "").lower()
        path = (parsed.path or "").lower()
        query = (parsed.query or "").lower()
    except Exception:
        indicators.append("Malformed URL syntax")
        return {
            "url_found": True,
            "url": url,
            "risk_level": "high",
            "indicators": indicators,
            "message": "The URL contains multiple suspicious indicators.",
        }

    # 1. Insecure Protocol Check (HTTP vs HTTPS)
    if scheme == "http":
        indicators.append("Insecure HTTP protocol used instead of HTTPS")

    # 2. IP Address Hostname Check
    host_without_port = netloc.split(":")[0] if ":" in netloc else netloc
    if IPV4_REGEX.match(host_without_port):
        indicators.append("IP address used instead of domain name")

    # 3. URL Shortener Check
    if host_without_port in KNOWN_SHORTENERS:
        indicators.append("URL shortener service used to mask destination domain")

    # 4. Excessive Subdomains Check (> 3 dots in hostname)
    # e.g., secure.banking.login.update.example.com
    dots_count = host_without_port.count(".")
    if dots_count > 3:
        indicators.append(f"Excessive number of subdomains detected ({dots_count} levels)")

    # 5. Excessive URL Length Check
    if len(url) > 75:
        indicators.append(f"Unusually long URL length ({len(url)} characters)")

    # 6. Suspicious Keywords in Domain or Path
    combined_url_text = f"{netloc}{path}{query}"
    detected_keywords = [
        kw for kw in SUSPICIOUS_KEYWORDS if kw in combined_url_text
    ]
    if detected_keywords:
        indicators.append(
            f"Suspicious keyword(s) detected: {', '.join(detected_keywords[:3])}"
        )

    # 7. Obfuscated Patterns / Special Characters
    if "@" in netloc:
        indicators.append("Deceptive credential/authority syntax ('@' in authority)")
    if "---" in netloc or "--" in host_without_port:
        indicators.append("Excessive consecutive hyphens in domain name")
    if "%20" in url or "%2f" in url.lower():
        indicators.append("Encoded whitespace/slash characters detected in URL")

    # 8. High-Risk TLD Check
    parts = host_without_port.split(".")
    if len(parts) >= 2:
        tld = parts[-1]
        if tld in HIGH_RISK_TLDS:
            indicators.append(f"High-risk top-level domain detected (.{tld})")

    # Determine risk level based on indicator count and severity
    has_critical = any(
        "IP address" in ind or "URL shortener" in ind or "@" in ind
        for ind in indicators
    )

    if len(indicators) >= 2 or (has_critical and len(indicators) >= 1 and detected_keywords):
        risk_level = "high"
        msg = "The URL contains multiple suspicious indicators."
    elif len(indicators) == 1:
        risk_level = "medium"
        msg = "The URL contains potential risk indicators."
    else:
        risk_level = "low"
        msg = "No strong suspicious URL indicators were detected."

    return {
        "url_found": True,
        "url": url,
        "risk_level": risk_level,
        "indicators": indicators,
        "message": msg,
    }
