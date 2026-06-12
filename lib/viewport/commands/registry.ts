import { arcCommand } from "./arc";
import { circleCommand } from "./circle";
import { controlCurveCommand } from "./controlCurve";
import { curveCommand } from "./curve";
import { ellipseCommand } from "./ellipse";
import { pointCommand } from "./point";
import { polylineCommand } from "./polyline";
import { rectangleCommand } from "./rectangle";
import { selectCommand } from "./select";
import type { ViewportCommand, ViewportCommandId } from "./types";

export const ALL_VIEWPORT_COMMANDS: ViewportCommand[] = [
  selectCommand,
  pointCommand,
  polylineCommand,
  curveCommand,
  controlCurveCommand,
  circleCommand,
  arcCommand,
  ellipseCommand,
  rectangleCommand,
];

const VIEWPORT_COMMANDS = new Map(ALL_VIEWPORT_COMMANDS.map((command) => [command.id, command]));

export function getViewportCommand(id: ViewportCommandId): ViewportCommand {
  const command = VIEWPORT_COMMANDS.get(id);
  if (!command) throw new Error(`Unknown viewport command: ${id}`);
  return command;
}
