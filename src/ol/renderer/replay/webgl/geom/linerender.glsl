//! NAMESPACE=ol.renderer.replay.webgl.geom.LineRenderShader
//! CLASS=ol.renderer.replay.webgl.geom.LineRenderShader

//! COMMON



//! VERTEX

//! INCLUDE common_lib.glsl
//! INCLUDE gpudata_lib.glsl

attribute vec4 PositionP;
attribute vec4 Position0;
attribute vec4 PositionN;
attribute float Control;

attribute vec3 Style;
// extent
// color (rgb)
// opacity (0..1)

uniform vec4 Pretranslation;
uniform mat4 Transform;
uniform vec2 PixelScale;

uniform mediump vec3 RenderParams;
float antiAliasing = RenderParams.x;
float rcpGammaIn = RenderParams.y;
//-float rcpGammaOut = RenderParams.z;


//! JSREQUIRE ol.renderer.replay.webgl.geom.LineBatcher
//! JSCONST CTRL_LINE_CENTER   ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.CENTER.toFixed(1)
//! JSCONST CTRL_TERMINAL      ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.TERMINAL.toFixed(1)
//! JSCONST CTRL_RIGHT_EDGE    ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.RIGHT.toFixed(1)
//! JSCONST CTRL_OUTGOING_EDGE ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.OUTGOING.toFixed(1)

vec2 lineExtrusion(out vec2 texCoord,
                   vec2 coordPrev, vec2 coordHere, vec2 coordNext,
                   float ctrl, float extent, float lengthOfEnds,
                   vec2 scale, float reciprocalRelativeMiterLimit) {

    vec2 result = vec2(0.);
    texCoord = vec2(-1., 0.);

    vec2 dirIncoming = safeNormalized(coordHere - coordPrev);
    vec2 dirOutgoing = safeNormalized(coordNext - coordHere);
    vec2 outward = safeNormalized(dirIncoming - dirOutgoing);

    float sinWinding = dot(
        rotatedCcw(dirIncoming),   // normal to the left of incoming leg
        outward);                 // vertex normal on the convex side
    float sgnWinding = sign(sinWinding);

    float absSinWinding = sinWinding * sgnWinding;
    float cosWinding = sqrt(1. - sinWinding * sinWinding);
    float relativeMiterLimit = 1.0 / reciprocalRelativeMiterLimit;
    float normBevelWidth = absSinWinding + relativeMiterLimit;
    float cutWidth = length(vec2(normBevelWidth, cosWinding));

    if (ctrl == CTRL_LINE_CENTER) {
        // Move the vertex inward and calculate texture coordinate
        result = outward * -extent * relativeMiterLimit * scale;
        texCoord.x = -sgnWinding + sgnWinding * 2. * normBevelWidth / cutWidth;
        return result;
    }

    if (ctrl >= CTRL_TERMINAL) {
        ctrl -= CTRL_TERMINAL;
        // Extrude in outward direction (the 'outward' vector degenerates
        // to point outward in vertical direction in this case)
        result = outward * lengthOfEnds;
        // Let surface coordinate indicate the edge - we can use the same
        // value for both ends as interpolating towards zero in all cases
        texCoord.y = 1.0;
        // The nonzero edge we see in this case is in opposite direction
        extent = -extent;
        // We're on a straight segment, force beveling logic (there is no
        // bevel but 
        absSinWinding = 0.0; 
    }

    if (ctrl >= CTRL_RIGHT_EDGE) {
        ctrl -= CTRL_RIGHT_EDGE;
        // Set surface coordinate, negate horizontal amount
        texCoord.x = 1.0;
        extent = -extent;
    }

    vec2 legDir;
    float extraMove = 0.0;
    const float epsRadians = 0.000244140625;
    if (absSinWinding < reciprocalRelativeMiterLimit) {
        // Bevel (miter too long)?
        legDir = ctrl == CTRL_OUTGOING_EDGE ? dirOutgoing : dirIncoming;
        result += extent * rotatedCcw(legDir);

        if (texCoord.x == sgnWinding && absSinWinding > epsRadians) {
            // Unless at a line ending (this includes the vertices next
            // to the ones flagged as terminal), pull back the inner two
            // edges in order to expose the bevel triangle
            extraMove = (1.0 - cutWidth) * abs(extent); 
        }
    } else 
    // ATTENTION: Don't remove the redunant "if", here! It's a workaround
    // for a vicious bug in ANGLE m)
    if (absSinWinding >= reciprocalRelativeMiterLimit) {
        // Miter
        legDir = rotatedCw(outward);
        result += (extent / sinWinding) * outward;

        if (absSinWinding > epsRadians) {
            // Cull triangles for bevel unless at line endings (there are
            // none in this case) to prevent flickering while avoiding to 
            // globally enforce invariance
            const float epsPixels = 0.000244140625;
            extraMove = sgnWinding * epsPixels;
        }
    }
    result += extraMove * (ctrl == CTRL_OUTGOING_EDGE ? -1. : 1.) * legDir;

    return result * scale;
}

void main(void) {

    // Basic vertex shader operation
    gl_Position = Transform * rteDecode(Position0, Pretranslation);

    // Decode colors and opacity from style
    Color_NegHorizSurfScale.rgb = applyGamma(decodeRGB(Style.y), rcpGammaIn);
    float lineMode = max(sign(Style.z), 0.0);
    float alphaAndWidth = Style.z * sign(Style.z);
    Surface_Opacity = vec3(-lineMode, 0.0, floor(alphaAndWidth) / 255.0);

    // Decode line widths from style and prepare for rendering
    float extent = Style.x * (0.5 + lineMode * 0.5);
    float actExtent = extent + antiAliasing * 0.5;
    Color_NegHorizSurfScale.w = -1.0 / actExtent;

    // Apply to 2D position in NDC
    gl_Position.xy += lineExtrusion(Surface_Opacity.xy,
            projected(Transform * rteDecode(PositionP, Pretranslation)).xy,
            projected(gl_Position).xy,
            projected(Transform * rteDecode(PositionN, Pretranslation)).xy,
            Control, actExtent, antiAliasing,
            PixelScale, 0.5);
}


//! FRAGMENT
//! JSCONST PREMULTIPLY_BY_ALPHA Number(gl.getContextAttributes().premultipliedAlpha)


uniform vec3 RenderParams;
float antiAliasing = RenderParams.x;
float rcpGammaOut = RenderParams.z;

varying vec3 Surface_Opacity;
varying vec4 Color_NegHorizSurfScale;


float blendCoeff(vec2 edge0, vec2 edge1, vec2 x) {
  vec2 weight = smoothstep(edge0, edge1, x);
  return max(weight.x, weight.y);
}

void main(void) {

    // Distance from center of surface coordinate (keep it this way;
    // strangely the 'abs' function does not work correctly on all
    // platforms here)
    vec2 dist = min(Surface_Opacity.xy * sign(Surface_Opacity.xy), 1.0);

    vec2 negScale = vec2(Color_NegHorizSurfScale.w, -1.0 / antiAliasing);
    vec2 outerEdgeMin = vec2(1.0) + negScale * antiAliasing;

    float alpha = Surface_Opacity.z  * 
        (1.0 - blendCoeff(outerEdgeMin, vec2(1.0), dist));

    vec3 color = applyGamma(Color_NegHorizSurfScale.rgb, rcpGammaOut);

#if PREMULTIPLY_BY_ALPHA
    color.rgb *= alpha;
#endif
    gl_FragColor = vec4(color, alpha);
}
