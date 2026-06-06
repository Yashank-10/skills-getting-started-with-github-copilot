import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def isolate_activities():
    # Backup and restore the in-memory activities to keep tests isolated
    backup = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(backup)


@pytest.fixture
def client():
    return TestClient(app)


def test_get_activities(client):
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister(client):
    email = "testuser@example.com"
    activity = "Chess Club"

    # Ensure clean start
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Signup
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # Unregister
    r2 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert r2.status_code == 200
    assert email not in activities[activity]["participants"]


def test_prevent_duplicate_signup(client):
    email = "dupuser@example.com"
    activity = "Programming Class"

    # Clean any existing
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    r1 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r1.status_code == 200

    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    # Backend should prevent duplicates
    assert r2.status_code == 400
    assert activities[activity]["participants"].count(email) == 1
