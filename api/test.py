"""Generate a small GLB scene for frontend/backend integration testing."""

from __future__ import annotations

from pathlib import Path
import sys


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from pyhopper.Components.Curve.Primitive.Circle import Circle
from pyhopper.Components.Curve.Primitive.LineSDL import LineSDL
from pyhopper.Components.Curve.Primitive.Polygon import Polygon
from pyhopper.Components.Curve.Primitive.Rectangle import Rectangle
from pyhopper.Components.Vector.Plane.ConstructPlane import ConstructPlane
from pyhopper.Components.Vector.Vector.UnitZ import UnitX, UnitY
from pyhopper.Core.Atoms import AtomicPoint, AtomicVector
from pyhopper.Components.Sets.Tree.Merge import Merge
from pyhopper.Core.DataTree import DataTree
from pyhopper.Utils.Exporters import export_glb


OUTPUT_NAME = "pyhopper-test.glb"


def build_demo_geometry() -> DataTree:
    """Build a small declarative scene from normal pyhopper components."""
    origin_circle = AtomicPoint(0.0, 0.0, 0.0)
    origin_rectangle = AtomicPoint(5.5, 0.0, 0.0)
    origin_polygon = AtomicPoint(0.0, 5.0, 0.0)
    line_start = AtomicPoint(-4.0, -3.0, 0.0)
    line_direction = AtomicVector(1.0, 0.75, 0.0)
    x_axis = UnitX()
    y_axis = UnitY()
    circle_plane = ConstructPlane(origin_circle, x_axis, y_axis)
    rectangle_plane = ConstructPlane(origin_rectangle, x_axis, y_axis)
    polygon_plane = ConstructPlane(origin_polygon, x_axis, y_axis)
    circle = Circle(radius=2.25, plane=circle_plane)
    rectangle = Rectangle(plane=rectangle_plane, x_size=3.5, y_size=2.2, radius=0.0)
    polygon = Polygon(plane=polygon_plane, radius=1.8, segments=6, fillet_radius=0.0)
    line = LineSDL(start=line_start, direction=line_direction, length=6.0)

    return Merge(circle, rectangle, polygon, line)


def run_test_export(output_dir: str | Path | None = None) -> dict[str, str | int]:
    """Export the declarative test scene to a GLB and return file metadata."""
    target_dir = Path(output_dir) if output_dir is not None else Path(__file__).with_name("generated")
    target_dir.mkdir(parents=True, exist_ok=True)

    output_path = target_dir / OUTPUT_NAME
    geometry = build_demo_geometry()
    export_glb(geometry, output_path)

    return {
        "filename": output_path.name,
        "path": str(output_path),
        "size": output_path.stat().st_size,
    }
