"""Tests for compress.py pure helpers and the no-Claude branches of compress_file.

Compression itself is a live model call (``call_claude`` -> Anthropic SDK or the
``claude --print`` CLI), so it is never invoked for real here. The pure helpers
are deterministic, and the ``compress_file`` branches exercised below all return
*before* a real call: sensitive-path refusal, oversize, empty body, and
backup-already-exists never reach ``call_claude`` at all; the identical-output
abort uses a monkeypatched ``call_claude`` that echoes the body back.
"""

from pathlib import Path

import pytest

from scripts import compress
from scripts.compress import (
    backup_dir_for,
    compress_file,
    is_sensitive_path,
    split_frontmatter,
    strip_llm_wrapper,
)


# ---------- split_frontmatter ----------


def test_split_frontmatter_extracts_block():
    text = "---\ntitle: Doc\ntags: [a]\n---\nbody line one\nbody line two\n"
    frontmatter, body = split_frontmatter(text)
    assert frontmatter == "---\ntitle: Doc\ntags: [a]\n---\n"
    assert body == "body line one\nbody line two\n"


def test_split_frontmatter_no_block_passthrough():
    text = "no frontmatter here\njust body\n"
    frontmatter, body = split_frontmatter(text)
    assert frontmatter == ""
    assert body == text


def test_split_frontmatter_crlf():
    text = "---\r\ntitle: Doc\r\n---\r\nbody\r\n"
    frontmatter, body = split_frontmatter(text)
    assert frontmatter == "---\r\ntitle: Doc\r\n---\r\n"
    assert body == "body\r\n"


# ---------- strip_llm_wrapper ----------


def test_strip_llm_wrapper_removes_outer_fence():
    wrapped = "```markdown\n# Title\n\nbody\n```"
    assert strip_llm_wrapper(wrapped) == "# Title\n\nbody"


def test_strip_llm_wrapper_preserves_inner_only_content():
    # No outer fence wrapping the whole thing -> returned unchanged.
    text = "# Title\n\n```python\nprint('hi')\n```\n\nmore"
    assert strip_llm_wrapper(text) == text


def test_strip_llm_wrapper_tilde_fence():
    wrapped = "~~~\nplain body\n~~~"
    assert strip_llm_wrapper(wrapped) == "plain body"


# ---------- is_sensitive_path ----------


@pytest.mark.parametrize(
    "name",
    [
        "credentials.md",
        "secrets.txt",
        ".env",
        ".env.local",
        "password.md",
        "id_rsa",
        "server.pem",
        "api_key.md",
        "access-key.txt",
        "my-secret-notes.md",
    ],
)
def test_is_sensitive_path_true(name):
    assert is_sensitive_path(Path(name)) is True


@pytest.mark.parametrize(
    "name",
    ["notes.md", "README.md", "TODO.txt", "design-doc.md", "agenda.md"],
)
def test_is_sensitive_path_false(name):
    assert is_sensitive_path(Path(name)) is False


def test_is_sensitive_path_by_directory_component():
    assert is_sensitive_path(Path("/home/u/.ssh/config")) is True
    assert is_sensitive_path(Path("/home/u/.aws/notes.md")) is True
    assert is_sensitive_path(Path("/home/u/projects/notes.md")) is False


# ---------- backup_dir_for ----------


def test_backup_dir_for_uses_xdg_data_home(tmp_path, monkeypatch):
    data_home = tmp_path / "xdg"
    monkeypatch.setenv("XDG_DATA_HOME", str(data_home))
    monkeypatch.delenv("LOCALAPPDATA", raising=False)
    monkeypatch.setattr(compress.os, "name", "posix")
    monkeypatch.setattr(compress.sys, "platform", "linux")

    result = backup_dir_for(Path("/repo/docs/notes.md"))

    # Mirrors the source's parent-dir name ("docs") under the XDG base.
    assert result == data_home / "caveman-compress" / "backups" / "docs"


def test_backup_dir_for_defaults_to_home_local_share(tmp_path, monkeypatch):
    monkeypatch.delenv("XDG_DATA_HOME", raising=False)
    monkeypatch.delenv("LOCALAPPDATA", raising=False)
    monkeypatch.setattr(compress.os, "name", "posix")
    monkeypatch.setattr(compress.sys, "platform", "linux")
    monkeypatch.setattr(compress.Path, "home", staticmethod(lambda: tmp_path / "home"))

    result = backup_dir_for(Path("/repo/docs/notes.md"))

    assert result == (
        tmp_path / "home" / ".local" / "share" / "caveman-compress" / "backups" / "docs"
    )


# ---------- compress_file: no-Claude branches ----------


@pytest.fixture
def no_claude(monkeypatch):
    """Fail loudly if any test reaches a real model call unexpectedly."""

    def _boom(prompt):  # pragma: no cover - only fires on a wiring bug
        raise AssertionError("call_claude was invoked; test is not hermetic")

    monkeypatch.setattr(compress, "call_claude", _boom)
    return monkeypatch


def test_compress_file_refuses_sensitive_path(tmp_path, no_claude):
    p = tmp_path / "credentials.md"
    p.write_text("api token: abc123\n")

    with pytest.raises(ValueError, match="looks sensitive"):
        compress_file(p)


def test_compress_file_refuses_oversize(tmp_path, no_claude):
    p = tmp_path / "huge.md"
    p.write_text("x" * (500_000 + 1))

    with pytest.raises(ValueError, match="too large"):
        compress_file(p)


def test_compress_file_missing_file_raises(tmp_path, no_claude):
    with pytest.raises(FileNotFoundError):
        compress_file(tmp_path / "nope.md")


def test_compress_file_empty_body_aborts(tmp_path, no_claude, isolated_backup_dir):
    p = tmp_path / "blank.md"
    p.write_text("   \n\t\n")

    assert compress_file(p) is False


def test_compress_file_empty_after_frontmatter_aborts(
    tmp_path, no_claude, isolated_backup_dir
):
    # Body is whitespace-only once the frontmatter is split off.
    p = tmp_path / "fmonly.md"
    p.write_text("---\ntitle: x\n---\n   \n")

    assert compress_file(p) is False


def test_compress_file_aborts_if_backup_exists(
    tmp_path, no_claude, isolated_backup_dir
):
    p = tmp_path / "notes.md"
    p.write_text("# Notes\n\nThis is real prose that could be compressed.\n")

    # Pre-create the backup so compress_file refuses to overwrite it.
    backup_dir = backup_dir_for(p.resolve())
    backup_dir.mkdir(parents=True, exist_ok=True)
    (backup_dir / (p.stem + ".original.md")).write_text("older backup\n")

    assert compress_file(p) is False


def test_compress_file_identical_output_aborts(
    tmp_path, monkeypatch, isolated_backup_dir
):
    body = "# Notes\n\nThis is real prose that could be compressed.\n"
    p = tmp_path / "notes.md"
    p.write_text(body)
    original_on_disk = p.read_text()

    # Monkeypatched "model" echoes the body back unchanged -> identical abort.
    monkeypatch.setattr(compress, "call_claude", lambda prompt: body)

    assert compress_file(p) is False
    # The source file must be untouched and no backup created.
    assert p.read_text() == original_on_disk
    backup_dir = backup_dir_for(p.resolve())
    assert not (backup_dir / (p.stem + ".original.md")).exists()


# ---------- compress_file: post-call_claude branches ----------


@pytest.mark.parametrize("response", ["", "   \n\t", None])
def test_compress_file_empty_model_response_aborts(
    tmp_path, monkeypatch, isolated_backup_dir, response
):
    body = "# Notes\n\nReal prose that could be compressed.\n"
    p = tmp_path / "notes.md"
    p.write_text(body)
    original_on_disk = p.read_text()

    # Model returns empty / whitespace / None -> abort before any backup.
    monkeypatch.setattr(compress, "call_claude", lambda prompt: response)

    assert compress_file(p) is False
    # Source untouched, no backup created.
    assert p.read_text() == original_on_disk
    backup_dir = backup_dir_for(p.resolve())
    assert not (backup_dir / (p.stem + ".original.md")).exists()


def test_compress_file_backup_readback_mismatch_aborts(
    tmp_path, monkeypatch, isolated_backup_dir
):
    body = "# Notes\n\nReal prose that could be compressed.\n"
    p = tmp_path / "notes.md"
    p.write_text(body)
    original_on_disk = p.read_text()

    # Model returns a genuinely different (valid-shaped) compression.
    monkeypatch.setattr(compress, "call_claude", lambda prompt: "# Notes\n\nProse.\n")

    backup_path = backup_dir_for(p.resolve()) / (p.stem + ".original.md")

    # Simulate the filesystem dropping bytes on the backup readback: any read of
    # the backup file returns corrupted content, so the readback != original
    # guard fires. Reads of other files pass through unchanged.
    real_read_text = Path.read_text

    def corrupt_backup_read(self, *args, **kwargs):
        if self == backup_path:
            return "CORRUPTED"
        return real_read_text(self, *args, **kwargs)

    monkeypatch.setattr(compress.Path, "read_text", corrupt_backup_read)

    assert compress_file(p) is False
    # Source must be untouched and the bad backup unlinked.
    assert real_read_text(p) == original_on_disk
    assert not backup_path.exists()


def test_compress_file_validation_failure_restores_original(
    tmp_path, monkeypatch, isolated_backup_dir
):
    # Original carries a URL the "model" keeps dropping, so validation fails on
    # every attempt and the original must be restored + backup removed.
    body = "# Notes\n\nVisit https://example.com/keep for details.\n"
    p = tmp_path / "notes.md"
    p.write_text(body)
    original_on_disk = p.read_text()

    calls = []

    def lossy_model(prompt):
        calls.append(prompt)
        # Different from input (so not the identical-abort) but drops the URL,
        # which validate_urls flags as an error -> retry -> still failing.
        return "# Notes\n\nVisit for details (compressed).\n"

    monkeypatch.setattr(compress, "call_claude", lossy_model)

    assert compress_file(p) is False
    # Original restored verbatim; backup removed after the failed retries.
    assert p.read_text() == original_on_disk
    backup_path = backup_dir_for(p.resolve()) / (p.stem + ".original.md")
    assert not backup_path.exists()
    # The retry loop ran: one initial compress + at least one fix attempt.
    assert len(calls) >= 2
