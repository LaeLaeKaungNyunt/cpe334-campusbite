"""Offline tests for CampusBite's deployment smoke test.

No real HTTP requests or Google Cloud resources are used.
"""

import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "smoke",
    Path(__file__).parents[1] / "smoke_test.py",
)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class SmokeTests(unittest.TestCase):

    def response(self, base, path, data=None, opener=None):
        responses = {
            "/api/v1/health": b'{"status":"ok"}',
            "/api/ready": b'{"status":"ready","db":"connected"}',
            "/": b"<html><body>CampusBite</body></html>",
            "/api/v1/menu-items": (
                b'{"data":[{"id":"menu-1","name":"Iced Latte"}]}'
            ),
            "/api/v1/auth/login": (
                b'{"data":{"id":"user-1",'
                b'"email":"smoke@example.test","role":"CUSTOMER"}}'
            ),
            "/api/v1/auth/me": (
                b'{"data":{"id":"user-1",'
                b'"email":"smoke@example.test","role":"CUSTOMER"}}'
            ),
            "/api/v1/auth/logout": (
                b'{"data":{"message":"Logged out successfully"}}'
            ),
        }
        return responses[path]

    @patch.dict("os.environ", {}, clear=True)
    def test_public_checks_pass_without_credentials(self):
        with patch.object(smoke, "request", side_effect=self.response) as req:
            smoke.check("https://campusbite.example.test/")

            paths = [call.args[1] for call in req.call_args_list]

            self.assertEqual(paths, [
                "/api/v1/health",
                "/api/ready",
                "/",
                "/api/v1/menu-items",
            ])

    @patch.dict("os.environ", {}, clear=True)
    def test_disconnected_database_fails(self):

        def disconnected(base, path, data=None, opener=None):
            if path == "/api/ready":
                return b'{"status":"not_ready","db":"disconnected"}'
            return self.response(base, path, data, opener)

        with patch.object(smoke, "request", side_effect=disconnected):
            with patch.object(smoke.time, "sleep"):
                with self.assertRaisesRegex(
                    RuntimeError, "/api/ready"
                ):
                    smoke.check("https://campusbite.example.test")

    @patch.dict(
        "os.environ",
        {
            "SMOKE_EMAIL": "smoke@example.test",
            "SMOKE_PASSWORD": "private-test-password",
        },
        clear=True,
    )
    def test_login_session_and_logout_pass(self):
        with patch.object(smoke, "request", side_effect=self.response) as req:
            smoke.check("https://campusbite.example.test")

            paths = [call.args[1] for call in req.call_args_list]

            self.assertEqual(paths[-3:], [
                "/api/v1/auth/login",
                "/api/v1/auth/me",
                "/api/v1/auth/logout",
            ])

            # Login, identity lookup and logout share one cookie opener.
            auth_calls = req.call_args_list[-3:]
            opener = auth_calls[0].kwargs["opener"]

            self.assertIsNotNone(opener)
            self.assertIs(auth_calls[1].kwargs["opener"], opener)
            self.assertIs(auth_calls[2].kwargs["opener"], opener)

    @patch.dict(
        "os.environ",
        {
            "SMOKE_EMAIL": "smoke@example.test",
            "SMOKE_PASSWORD": "private-test-password",
        },
        clear=True,
    )
    def test_session_is_logged_out_when_identity_check_fails(self):

        def broken_identity(base, path, data=None, opener=None):
            if path == "/api/v1/auth/me":
                raise ValueError("Invalid identity response")
            return self.response(base, path, data, opener)

        with patch.object(smoke, "request", side_effect=broken_identity) as req:
            with self.assertRaisesRegex(
                RuntimeError, "Login smoke check failed"
            ):
                smoke.check("https://campusbite.example.test")

            self.assertEqual(
                req.call_args_list[-1].args[1],
                "/api/v1/auth/logout",
            )

    @patch.dict(
        "os.environ",
        {"SMOKE_EMAIL": "smoke@example.test"},
        clear=True,
    )
    def test_incomplete_credentials_are_rejected(self):
        with patch.object(smoke, "request", side_effect=self.response):
            with self.assertRaisesRegex(
                RuntimeError,
                "Set both SMOKE_EMAIL and SMOKE_PASSWORD",
            ):
                smoke.check("https://campusbite.example.test")


if __name__ == "__main__":
    unittest.main()
