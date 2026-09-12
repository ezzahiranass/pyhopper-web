from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = Path(__file__).resolve().parent
for path in (REPO_ROOT, API_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from ghx_importer import parse_ghx_to_graph


class GhxImporterTests(unittest.TestCase):
    def test_sample_imports_nodes_positions_slider_and_wire(self):
        content = (REPO_ROOT / "pyhopper-gh" / "unnamed.ghx").read_bytes()
        document = parse_ghx_to_graph("sample", content)

        self.assertEqual(len(document["nodes"]), 2)
        self.assertEqual(len(document["edges"]), 1)

        by_name = {node["component"]["name"]: node for node in document["nodes"]}
        self.assertEqual(by_name["NumberSlider"]["settings"]["value"], 12.0)
        self.assertEqual(by_name["NumberSlider"]["position"], {"x": 32.0, "y": 144.0})
        self.assertEqual(by_name["ConstructPoint"]["position"], {"x": 362.0, "y": 134.0})

        edge = document["edges"][0]
        self.assertEqual(edge["sourceNodeId"], by_name["NumberSlider"]["id"])
        self.assertEqual(edge["sourcePort"], "value")
        self.assertEqual(edge["targetNodeId"], by_name["ConstructPoint"]["id"])
        self.assertEqual(edge["targetPort"], "x_coordinate")


if __name__ == "__main__":
    unittest.main()
