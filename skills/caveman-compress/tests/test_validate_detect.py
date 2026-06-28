"""Deterministic tests for validate.py and detect.py.

Covers the verbatim-preservation guarantees: a doctored "compression" that
drops a code line, a URL, or an inline code must be flagged. Also covers the
file-type classifier and the should_compress gate.
"""

from pathlib import Path

import pytest

from scripts import detect, validate
from scripts.validate import (
    ValidationResult,
    count_bullets,
    extract_code_blocks,
    extract_inline_codes,
    extract_paths,
    extract_urls,
)


# ---------- ValidationResult ----------


def test_validation_result_starts_valid():
    result = ValidationResult()
    assert result.is_valid is True
    assert result.errors == []
    assert result.warnings == []


def test_add_error_marks_invalid():
    result = ValidationResult()
    result.add_error("boom")
    assert result.is_valid is False
    assert result.errors == ["boom"]


def test_add_warning_keeps_valid():
    result = ValidationResult()
    result.add_warning("heads up")
    assert result.is_valid is True
    assert result.warnings == ["heads up"]


# ---------- Extractors ----------


def test_extract_code_blocks_roundtrip():
    text = "intro\n\n```python\nprint('hi')\nx = 1\n```\n\noutro"
    blocks = extract_code_blocks(text)
    assert blocks == ["```python\nprint('hi')\nx = 1\n```"]


def test_extract_urls_finds_all():
    text = "see https://example.com/a and http://foo.test/b)"
    assert extract_urls(text) == {"https://example.com/a", "http://foo.test/b"}


def test_extract_inline_codes_ignores_fenced():
    text = "use `foo` here\n\n```\n`not-inline`\n```\n\nand `bar`"
    codes = extract_inline_codes(text)
    assert "foo" in codes
    assert "bar" in codes
    assert "not-inline" not in codes


def test_extract_paths_finds_slashed_paths():
    text = "edit ./src/index.ts and /etc/hosts and docs/notes.md\n"
    paths = extract_paths(text)
    assert "./src/index.ts" in paths
    assert "/etc/hosts" in paths
    assert "docs/notes.md" in paths


def test_count_bullets_counts_each_marker():
    text = "intro\n- one\n- two\n* three\n+ four\nnot a bullet\n"
    assert count_bullets(text) == 4


# ---------- Validators flag doctored compressions ----------


def _make_files(tmp_path: Path, original: str, compressed: str):
    orig = tmp_path / "orig.md"
    comp = tmp_path / "comp.md"
    orig.write_text(original)
    comp.write_text(compressed)
    return orig, comp


def test_validate_flags_dropped_code_line(tmp_path):
    original = "# Doc\n\n```python\nprint('hi')\nx = 1\n```\n"
    # Compression silently dropped `x = 1` from inside the code block.
    doctored = "# Doc\n\n```python\nprint('hi')\n```\n"
    orig, comp = _make_files(tmp_path, original, doctored)

    result = validate.validate(orig, comp)

    assert result.is_valid is False
    assert any("Code blocks not preserved" in e for e in result.errors)


def test_validate_flags_dropped_url(tmp_path):
    original = "# Doc\n\nVisit https://example.com/keep for details.\n"
    doctored = "# Doc\n\nVisit for details.\n"
    orig, comp = _make_files(tmp_path, original, doctored)

    result = validate.validate(orig, comp)

    assert result.is_valid is False
    assert any("URL mismatch" in e for e in result.errors)
    assert any("https://example.com/keep" in e for e in result.errors)


def test_validate_flags_dropped_inline_code(tmp_path):
    original = "# Doc\n\nRun the `deploy.sh` script then `cleanup`.\n"
    # Dropped the `cleanup` inline code.
    doctored = "# Doc\n\nRun the `deploy.sh` script.\n"
    orig, comp = _make_files(tmp_path, original, doctored)

    result = validate.validate(orig, comp)

    assert result.is_valid is False
    assert any("Inline code lost" in e for e in result.errors)


def test_validate_passes_identical_content(tmp_path):
    text = "# Doc\n\nUse `x` see https://a.test/p\n\n```\ncode\n```\n"
    orig, comp = _make_files(tmp_path, text, text)

    result = validate.validate(orig, comp)

    assert result.is_valid is True
    assert result.errors == []


def test_validate_heading_count_mismatch_is_error(tmp_path):
    original = "# One\n\ntext\n\n## Two\n\nmore\n"
    doctored = "# One\n\ntext more\n"
    orig, comp = _make_files(tmp_path, original, doctored)

    result = validate.validate(orig, comp)

    assert result.is_valid is False
    assert any("Heading count mismatch" in e for e in result.errors)


def test_validate_paths_warns_on_dropped_path():
    # validate_paths is a soft check: a lost path is a WARNING, not an error.
    result = ValidationResult()
    validate.validate_paths("see ./src/index.ts for details", "see for details", result)
    assert result.is_valid is True  # still valid (warning only)
    assert any("Path mismatch" in w for w in result.warnings)


def test_validate_paths_clean_when_paths_match():
    result = ValidationResult()
    validate.validate_paths("./a/b.md and /c/d", "/c/d and ./a/b.md", result)
    assert result.warnings == []


def test_validate_bullets_warns_when_too_many_dropped():
    # 5 bullets -> 1 bullet is a >15% change -> warning.
    orig = "- a\n- b\n- c\n- d\n- e\n"
    comp = "- a\n"
    result = ValidationResult()
    validate.validate_bullets(orig, comp, result)
    assert result.is_valid is True  # warning, not error
    assert any("Bullet count changed too much" in w for w in result.warnings)


def test_validate_bullets_quiet_within_tolerance():
    # 10 -> 9 bullets is within the 15% tolerance -> no warning.
    orig = "".join(f"- item {i}\n" for i in range(10))
    comp = "".join(f"- item {i}\n" for i in range(9))
    result = ValidationResult()
    validate.validate_bullets(orig, comp, result)
    assert result.warnings == []


def test_validate_bullets_noop_when_original_has_none():
    result = ValidationResult()
    validate.validate_bullets("no bullets here", "- one\n", result)
    assert result.warnings == []


# ---------- detect.detect_file_type ----------


@pytest.mark.parametrize(
    "name,expected",
    [
        ("notes.md", "natural_language"),
        ("README.markdown", "natural_language"),
        ("doc.txt", "natural_language"),
        ("main.py", "code"),
        ("app.ts", "code"),
        ("config.json", "config"),
        ("settings.yaml", "config"),
        (".env", "config"),
        ("data.bin", "unknown"),
    ],
)
def test_detect_file_type_by_extension(tmp_path, name, expected):
    p = tmp_path / name
    p.write_text("placeholder\n")
    assert detect.detect_file_type(p) == expected


def test_detect_extensionless_natural_language(tmp_path):
    p = tmp_path / "TODO"
    p.write_text("Remember to water the plants and call the bank tomorrow.\n")
    assert detect.detect_file_type(p) == "natural_language"


def test_detect_extensionless_code(tmp_path):
    p = tmp_path / "snippet"
    p.write_text(
        "import os\n"
        "from sys import argv\n"
        "def main():\n"
        "    return argv\n"
        "class Foo:\n"
        "    pass\n"
    )
    assert detect.detect_file_type(p) == "code"


def test_detect_extensionless_json_config(tmp_path):
    p = tmp_path / "manifest"
    p.write_text('{"a": 1, "b": [2, 3]}')
    assert detect.detect_file_type(p) == "config"


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Dockerfile", "code"),
        ("Makefile", "code"),
        ("GNUmakefile", "code"),
        (".gitignore", "config"),
        (".dockerignore", "config"),
        (".editorconfig", "config"),
        (".env", "config"),
    ],
)
def test_detect_extensionless_real_world_skip_filenames(tmp_path, name, expected):
    # These have an empty Path.suffix and would otherwise be content-sniffed as
    # natural language and offered to a third-party API for compression. They
    # must be classified by filename instead — never as natural_language.
    p = tmp_path / name
    # Prose-looking content to prove filename classification wins over sniffing.
    p.write_text("This is a normal English sentence that reads like prose.\n")
    assert detect.detect_file_type(p) == expected


@pytest.mark.parametrize("name", ["Dockerfile", "Makefile", ".gitignore", ".env"])
def test_should_not_compress_real_world_config_filenames(tmp_path, name):
    p = tmp_path / name
    p.write_text("This looks like prose but is a build/config file.\n")
    assert detect.should_compress(p) is False


# ---------- detect.should_compress ----------


def test_should_compress_true_for_markdown(tmp_path):
    p = tmp_path / "notes.md"
    p.write_text("Just some prose here.\n")
    assert detect.should_compress(p) is True


def test_should_compress_false_for_code(tmp_path):
    p = tmp_path / "main.py"
    p.write_text("print('hi')\n")
    assert detect.should_compress(p) is False


def test_should_compress_false_for_backup(tmp_path):
    p = tmp_path / "notes.original.md"
    p.write_text("prose\n")
    assert detect.should_compress(p) is False


def test_should_compress_false_for_missing_file(tmp_path):
    p = tmp_path / "does-not-exist.md"
    assert detect.should_compress(p) is False
