from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = Path(__file__).resolve().parent
for path in (REPO_ROOT, API_ROOT):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from definition_importer import TEST_DEFINITION_SOURCE, parse_definition_to_graph
from graph_compiler import compile_graph_document


def _graph_nodes(document: dict) -> dict[str, dict]:
    return {node["id"]: node for node in document["nodes"]}


class DefinitionImporterLiteralTests(unittest.TestCase):
    def test_inline_constants_attach_to_the_port_instead_of_spawning_sliders(self):
        document, nodes, edges = parse_definition_to_graph("import-test", TEST_DEFINITION_SOURCE)
        by_id = _graph_nodes(document)
        self.assertEqual(by_id["circle"]["values"], {"radius": 2.0})
        self.assertEqual(by_id["polygon"]["values"], {"radius": 1.5, "segments": 6, "fillet_radius": 0.0})
        self.assertFalse([node for node in nodes if node["id"].startswith("literal-")], "no slider nodes for inline constants")
        # the plane still arrives by wire
        self.assertTrue(any(edge["target"] == "circle" and edge["targetHandle"] == "plane" for edge in edges))
        compile_graph_document(document)

    def test_named_bindings_still_become_sliders(self):
        source = """from pyhopper import ConstructPlane
from pyhopper.Components.Curve.Primitive.Circle import Circle

radius = 2.0
plane = ConstructPlane()
circle = Circle(radius, plane)
"""
        document, nodes, edges = parse_definition_to_graph("import-test", source)
        by_id = _graph_nodes(document)
        self.assertEqual(by_id["circle"]["values"], {})
        slider = by_id["literal-002-radius"]
        self.assertEqual(slider["settings"]["value"], 2.0)
        self.assertTrue(any(edge["source"] == slider["id"] and edge["target"] == "circle" for edge in edges))

    def test_text_and_boolean_constants_attach_too(self):
        source = """from pyhopper.Components.Sets.Text.TextJoin import TextJoin
from pyhopper.Components.Maths.Series import Series
from pyhopper.Components.Curve.Spline.Polyline import Polyline
from pyhopper.Components.Vector.Point.ConstructPoint import ConstructPoint

series = Series(0.0, 1.0, 4)
point = ConstructPoint(series, 0.0, 0.0)
polyline = Polyline(point, True)
label = TextJoin("a", ", ")
"""
        document, _, _ = parse_definition_to_graph("import-test", source)
        by_id = _graph_nodes(document)
        self.assertEqual(by_id["series"]["values"], {"start": 0.0, "step": 1.0, "count": 4})
        self.assertEqual(by_id["polyline"]["values"], {"closed": True})
        self.assertEqual(by_id["label"]["values"], {"text": "a", "join": ", "})
        compile_graph_document(document)


if __name__ == "__main__":
    unittest.main()
