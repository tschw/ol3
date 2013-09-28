goog.provide('ol.renderer.webgl.RenderType');


/**
 * Type of render.
 * Enumeration of concrete render types.
 *
 * @enum {number}
 * @see {ol.renderer.webgl.batching.Batcher}
 * @see {ol.renderer.webgl.rendering.Render}
 */
ol.renderer.webgl.RenderType = {
  /**
   * Rendering configuration for line primitives.
   */
  LINES: 0,
  /**
   * Rendering configuration for polygon primitives.
   */
  POLYGONS: 1
};
