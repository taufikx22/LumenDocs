import pytest
import tempfile
import os
from pathlib import Path
from src.memory.sqlite_store import SQLiteStore


@pytest.fixture
def store(tmp_path):
    return SQLiteStore(db_path=str(tmp_path / "test.db"))


class TestModelRegistry:
    def test_register_and_list(self, store):
        store.register_model("m1", "TestModel", "/fake/path.gguf", 1_000_000)
        models = store.list_models()
        assert len(models) == 1
        assert models[0]["name"] == "TestModel"
        assert models[0]["gguf_path"] == "/fake/path.gguf"
        assert models[0]["file_size_bytes"] == 1_000_000

    def test_get_model(self, store):
        store.register_model("m1", "Model1", "/path.gguf", 500)
        m = store.get_model("m1")
        assert m is not None
        assert m["name"] == "Model1"

    def test_get_missing_model(self, store):
        assert store.get_model("nonexistent") is None

    def test_unregister_model(self, store):
        store.register_model("m1", "Model1", "/path.gguf", 500)
        store.unregister_model("m1")
        assert store.get_model("m1") is None

    def test_set_default_model(self, store):
        store.register_model("m1", "Model1", "/a.gguf", 100)
        store.register_model("m2", "Model2", "/b.gguf", 200)
        store.set_default_model("m2")
        default = store.get_default_model()
        assert default is not None
        assert default["id"] == "m2"

    def test_default_model_switches(self, store):
        store.register_model("m1", "M1", "/a.gguf", 100)
        store.register_model("m2", "M2", "/b.gguf", 200)
        store.set_default_model("m1")
        store.set_default_model("m2")
        default = store.get_default_model()
        assert default["id"] == "m2"
        # Ensure m1 is no longer default
        models = store.list_models()
        m1 = [m for m in models if m["id"] == "m1"][0]
        assert not m1["is_default"]


class TestSessions:
    def test_create_session(self, store):
        sid = store.create_session("s1", title="Test Chat")
        assert sid == "s1"
        sessions = store.list_sessions()
        assert len(sessions) == 1
        assert sessions[0]["title"] == "Test Chat"

    def test_auto_session_id(self, store):
        sid = store.create_session()
        assert sid is not None
        assert len(sid) > 0

    def test_session_with_model(self, store):
        store.register_model("m1", "Model1", "/a.gguf", 100)
        store.create_session("s1", title="Chat", model_id="m1")
        sessions = store.list_sessions()
        assert sessions[0]["active_model_id"] == "m1"
        assert sessions[0]["model_name"] == "Model1"


class TestMessages:
    def test_add_and_retrieve(self, store):
        store.create_session("s1")
        store.register_model("m1", "TestModel", "/path.gguf", 100)
        store.add_message("s1", "user", "Hello")
        store.add_message("s1", "assistant", "Hi there", model_id="m1", model_name="TestModel")
        history = store.get_session_history("s1")
        assert len(history) == 2
        assert history[0]["role"] == "user"
        assert history[1]["model_name"] == "TestModel"

    def test_auto_creates_session(self, store):
        store.add_message("new_session", "user", "Hello")
        history = store.get_session_history("new_session")
        assert len(history) == 1
