"""CampusBite public deployment smoke test.

Usage:
    python3 deploy/smoke_test.py SERVICE_URL

Optional authenticated checks require both:
    SMOKE_EMAIL
    SMOKE_PASSWORD

Credentials and session cookies are never printed.
"""

import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def request(base, path, data=None, opener=None):
    headers = {'Content-Type': 'application/json'} if data is not None else {}

    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode('utf-8') if data is not None else None,
    )

    client = opener or urllib.request.build_opener()

    with client.open(req, timeout=30) as response:
        return response.read()


def check(base):
    base = base.rstrip('/')

    # Public application, API, and database checks.
    public_checks = (
        ('/api/v1/health',
         lambda b: json.loads(b).get('status') == 'ok'),

        ('/api/ready',
         lambda b: json.loads(b).get('db') == 'connected'),

        ('/',
         lambda b: b'<html' in b.lower()),

        ('/api/v1/menu-items',
         lambda b: (
             isinstance(json.loads(b).get('data'), list)
             and len(json.loads(b)['data']) > 0
         )),
    )

    # Retry for Cloud Run cold starts.
    for path, predicate in public_checks:
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError, TypeError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)

        print('PASS ' + path)

    # Optional cookie-based login verification.
    email = os.getenv('SMOKE_EMAIL')
    password = os.getenv('SMOKE_PASSWORD')

    if bool(email) != bool(password):
        raise RuntimeError(
            'Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.'
        )

    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    # CampusBite uses an HTTP-only session cookie, not a bearer token.
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )

    login_completed = False

    try:
        login_response = request(
            base,
            '/api/v1/auth/login',
            {'email': email, 'password': password},
            opener=opener,
        )

        login_completed = True
        user = json.loads(login_response)['data']

        me_response = request(
            base,
            '/api/v1/auth/me',
            opener=opener,
        )
        me = json.loads(me_response)['data']

        if not user.get('id') or me.get('id') != user['id']:
            raise ValueError('Session identity mismatch')

        print('PASS login and authenticated /api/v1/auth/me')

    except (urllib.error.URLError, TimeoutError, ValueError, TypeError, KeyError):
        raise RuntimeError('Login smoke check failed') from None

    finally:
        if login_completed:
            try:
                request(
                    base,
                    '/api/v1/auth/logout',
                    data={},
                    opener=opener,
                )
                print('PASS logout')
            except (urllib.error.URLError, TimeoutError, ValueError):
                raise RuntimeError('Logout smoke check failed') from None


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')

    check(sys.argv[1])
