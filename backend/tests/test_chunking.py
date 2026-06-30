from app.services.chunking import chunk_text


def test_empty_text():
    assert chunk_text("") == []
    assert chunk_text("   ") == []


def test_short_text():
    out = chunk_text("hello world", chunk_size=500, overlap=80)
    assert out == ["hello world"]


def test_chunk_overlap():
    words = " ".join(str(i) for i in range(1200))
    out = chunk_text(words, chunk_size=500, overlap=80)
    assert len(out) >= 3
    # No empty chunks
    assert all(c.strip() for c in out)


def test_overlap_clamped():
    out = chunk_text("a b c d e f", chunk_size=2, overlap=10)
    assert len(out) >= 2
