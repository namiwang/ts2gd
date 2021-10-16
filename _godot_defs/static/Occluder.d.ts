
/**
 * [Occluder]s that are placed within your scene will automatically cull objects that are hidden from view by the occluder. This can increase performance by decreasing the amount of objects drawn.
 *
 * [Occluder]s are totally dynamic, you can move them as you wish. This means you can for example, place occluders on a moving spaceship, and have it occlude objects as it flies past.
 *
 * You can place a large number of [Occluder]s within a scene. As it would be counterproductive to cull against hundreds of occluders, the system will automatically choose a selection of these for active use during any given frame, based a screen space metric. Larger occluders are favored, as well as those close to the camera. Note that a small occluder close to the camera may be a better occluder in terms of screen space than a large occluder far in the distance.
 *
 * The type of occlusion primitive is determined by the [OccluderShape] that you add to the [Occluder]. Some [OccluderShape]s may allow more than one primitive in a single, node, for greater efficiency.
 *
 * Although [Occluder]s work in general use, they also become even more powerful when used in conjunction with the portal system. Occluders are placed in rooms (based on their origin), and can block portals (and thus entire rooms) as well as objects from rendering.
 *
*/
declare class Occluder extends Spatial {

  
/**
 * [Occluder]s that are placed within your scene will automatically cull objects that are hidden from view by the occluder. This can increase performance by decreasing the amount of objects drawn.
 *
 * [Occluder]s are totally dynamic, you can move them as you wish. This means you can for example, place occluders on a moving spaceship, and have it occlude objects as it flies past.
 *
 * You can place a large number of [Occluder]s within a scene. As it would be counterproductive to cull against hundreds of occluders, the system will automatically choose a selection of these for active use during any given frame, based a screen space metric. Larger occluders are favored, as well as those close to the camera. Note that a small occluder close to the camera may be a better occluder in terms of screen space than a large occluder far in the distance.
 *
 * The type of occlusion primitive is determined by the [OccluderShape] that you add to the [Occluder]. Some [OccluderShape]s may allow more than one primitive in a single, node, for greater efficiency.
 *
 * Although [Occluder]s work in general use, they also become even more powerful when used in conjunction with the portal system. Occluders are placed in rooms (based on their origin), and can block portals (and thus entire rooms) as well as objects from rendering.
 *
*/
  "new"(): Occluder;
  static "new"(): Occluder;




/** No documentation provided. */
resource_changed(resource: Resource): void;

  // connect<T extends SignalsOf<Occluder>, U extends Node>(signal: T, node: U, method: keyof U): number;
  connect<T extends SignalsOf<OccluderSignals>>(signal: T, method: SignalFunction<OccluderSignals[T]>): number;




}

declare class OccluderSignals extends SpatialSignals {
  
}