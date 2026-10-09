from html.parser import HTMLParser
from pathlib import Path


class LocalReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        for name in ("href", "src"):
            value = attributes.get(name)
            if value and not value.startswith(("http://", "https://", "#", "data:")):
                self.references.append(value.split("?", 1)[0])


root = Path(__file__).resolve().parents[1]
parser = LocalReferenceParser()
parser.feed((root / "index.html").read_text())

for reference in parser.references:
    if reference == "config.js":
        continue
    target = (root / reference).resolve()
    if root not in target.parents and target != root:
        raise SystemExit(f"reference escapes project root: {reference}")
    if not target.is_file():
        raise SystemExit(f"missing local asset: {reference}")

for required in ("index.html", "styles.css", "app.js", "config.example.js", "Dockerfile", "nginx.conf"):
    if not (root / required).is_file():
        raise SystemExit(f"missing required file: {required}")

print(f"checked {len(parser.references)} local references")
