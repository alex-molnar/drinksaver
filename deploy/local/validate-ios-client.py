#!/usr/bin/env python3
"""Check the native public client's local Keycloak import settings."""

import json
from pathlib import Path


realm_path = Path(__file__).with_name("keycloak-realm.json")
realm = json.loads(realm_path.read_text())
client = next(
    (client for client in realm["clients"] if client.get("clientId") == "drinksaver-ios-local"),
    None,
)
assert client is not None, "missing drinksaver-ios-local"
assert client["enabled"] is True
assert client["publicClient"] is True
assert client["standardFlowEnabled"] is True
assert client["directAccessGrantsEnabled"] is False
assert client["serviceAccountsEnabled"] is False
assert client["attributes"]["pkce.code.challenge.method"] == "S256"
redirect_uri = "im.kak.drinksaver:/oauth2redirect"
assert client["redirectUris"] == [redirect_uri]
assert client["attributes"]["post.logout.redirect.uris"] == redirect_uri
assert "offline_access" in client["optionalClientScopes"]
assert not client.get("secret"), "native public client must not have a secret"
print("PASS: drinksaver-ios-local uses public Authorization Code + S256 PKCE and offline access")
