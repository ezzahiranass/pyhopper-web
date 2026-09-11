from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pyhopper import AtomicPlane, AtomicPoint, AtomicPolyline, RegionDifference, RegionIntersection, RegionUnion
from pyhopper.Core.DataTree import DataTree
from pyhopper.Core.Path import Path as TreePath


def rectangle(x0: float, y0: float, x1: float, y1: float, z: float = 0.0) -> AtomicPolyline:
    return AtomicPolyline(points=(
        AtomicPoint(x0, y0, z),
        AtomicPoint(x1, y0, z),
        AtomicPoint(x1, y1, z),
        AtomicPoint(x0, y1, z),
        AtomicPoint(x0, y0, z),
    ))


def polyline_area(curve: AtomicPolyline) -> float:
    points = curve.points
    total = 0.0
    for start, end in zip(points, points[1:]):
        total += start.x * end.y - end.x * start.y
    return abs(total) / 2.0


class RegionComponentTests(unittest.TestCase):
    def test_region_union_combines_overlapping_closed_curves(self):
        result = RegionUnion([
            rectangle(0, 0, 2, 1),
            rectangle(1, 0, 3, 1),
        ])

        self.assertEqual(len(result.all_items()), 1)
        self.assertAlmostEqual(polyline_area(result.all_items()[0]), 3.0)

    def test_region_intersection_returns_overlap_outline(self):
        result = RegionIntersection(
            [rectangle(0, 0, 2, 1)],
            [rectangle(1, 0, 3, 1)],
        )

        self.assertEqual(len(result.all_items()), 1)
        self.assertAlmostEqual(polyline_area(result.all_items()[0]), 1.0)

    def test_region_difference_subtracts_second_region_set(self):
        result = RegionDifference(
            [rectangle(0, 0, 4, 2)],
            [rectangle(2, 0, 5, 2)],
        )

        self.assertEqual(len(result.all_items()), 1)
        self.assertAlmostEqual(polyline_area(result.all_items()[0]), 4.0)

    def test_region_union_projects_to_supplied_plane(self):
        result = RegionUnion([rectangle(0, 0, 1, 1, z=5.0)], AtomicPlane.world_xy())

        self.assertEqual(len(result.all_items()), 1)
        self.assertTrue(all(point.z == 0.0 for point in result.all_items()[0].points))
        self.assertAlmostEqual(polyline_area(result.all_items()[0]), 1.0)

    def test_region_union_preserves_input_branch_paths(self):
        source = DataTree.from_branches({
            TreePath(0): [rectangle(0, 0, 1, 1)],
            TreePath(2): [rectangle(0, 0, 2, 1), rectangle(1, 0, 3, 1)],
        })

        result = RegionUnion(source)

        self.assertEqual(result.paths, source.paths)
        self.assertAlmostEqual(polyline_area(result.branch(TreePath(0))[0]), 1.0)
        self.assertAlmostEqual(polyline_area(result.branch(TreePath(2))[0]), 3.0)


if __name__ == "__main__":
    unittest.main()
