//! NAMESPACE=ol.renderer.replay.webgl.geom.LineStringsRenderShader
//! CLASS=ol.renderer.replay.webgl.geom.LineStringsRenderShader

//! COMMON

varying vec4 Color;
varying vec3 Surface;


//! VERTEX

//! INCLUDE common_lib.glsl
//! INCLUDE gpudata_lib.glsl

attribute vec4 PositionP;
attribute vec4 Position0;
attribute vec4 PositionN;
attribute float Control;

attribute vec4 Style;
// extent
// color (rgb)
// opacity (0..1)
// reciprocal miter limit

uniform vec4 Pretranslation;
uniform mat4 Transform;
uniform vec2 PixelScale;

uniform mediump vec3 RenderParams;
float antiAliasing = RenderParams.x;
float rcpGammaIn = RenderParams.y;
//-float rcpGammaOut = RenderParams.z;


//! JSREQUIRE ol.renderer.replay.webgl.geom.LineStringsBatcher
//! JSCONST CTRL_LINE_CENTER   ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.CENTER.toFixed(1)
//! JSCONST CTRL_TERMINAL      ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.TERMINAL.toFixed(1)
//! JSCONST CTRL_RIGHT_EDGE    ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.RIGHT.toFixed(1)
//! JSCONST CTRL_OUTGOING_EDGE ol.renderer.replay.webgl.geom.LineStringsBatcher.SurfaceFlags.OUTGOING.toFixed(1)

vec2 lineExtrusion(out vec2 texCoord,
                   vec2 coordPrev, vec2 coordHere, vec2 coordNext,
                   float ctrl, float extent, float lengthOfEnds,
                   float reciprocalRelativeMiterLimit) {

    vec2 result = vec2(0.);
    texCoord = vec2(-1., 0.);

    vec2 dirIncoming = safeNormalized(coordHere - coordPrev);
    vec2 dirOutgoing = safeNormalized(coordNext - coordHere);
    vec2 outward = safeNormalized(dirIncoming - dirOutgoing, rotatedCcw(dirIncoming));

    float sgnCosWinding = dot(
        rotatedCcw(dirIncoming),  // normal to the left of incoming leg
        outward);                 // vertex normal on the convex side
    float sgnWinding = sign(sgnCosWinding);

    float cosWinding = sgnCosWinding * sgnWinding;
    float absSinWinding = sqrt(1. - sgnCosWinding * sgnCosWinding);
    float relativeMiterLimit = 1.0 / reciprocalRelativeMiterLimit;
    float normBevelWidth = cosWinding + relativeMiterLimit;
    float cutWidth = length(vec2(normBevelWidth, absSinWinding));

    if (ctrl == CTRL_LINE_CENTER) {
        // Move the vertex inward and calculate texture coordinate
        result = outward * -extent * relativeMiterLimit;
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
        // bevel but it will do the right thing) 
        cosWinding = 0.0; 
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
    if (cosWinding < reciprocalRelativeMiterLimit) {
        // Bevel (miter too long)?
        legDir = ctrl == CTRL_OUTGOING_EDGE ? dirOutgoing : dirIncoming;
        result += extent * rotatedCcw(legDir);

        if (texCoord.x == sgnWinding && cosWinding > epsRadians) {
            // Unless at a line ending (this includes the vertices next
            // to the ones flagged as terminal), pull back the inner two
            // edges in order to expose the bevel triangle
            extraMove = (1.0 - cutWidth) * abs(extent); 
        }
    } else 
    // ATTENTION: Don't remove the redunant "if", here! It's a workaround
    // for a vicious bug in ANGLE m)
    if (cosWinding >= reciprocalRelativeMiterLimit) {
        // Miter
        legDir = rotatedCw(outward);
        result += (extent / sgnCosWinding) * outward;

        if (cosWinding > epsRadians) {
            // Cull triangles for bevel unless at line endings (there are
            // none in this case) to prevent flickering while avoiding to 
            // globally enforce invariance
            const float epsPixels = 0.000244140625;
            extraMove = sgnWinding * epsPixels;
        }
    }
    result += extraMove * (ctrl == CTRL_OUTGOING_EDGE ? -1. : 1.) * legDir;

    return result;
}

void main(void) {

    // Basic vertex shader operation
    gl_Position = Transform * rteDecode(Position0, Pretranslation);

    // Decode style
    Color = vec4(decodeRGB(Style.y), Style.z);
    float extent = Style.x + antiAliasing * 0.5; // half the smoothing counts
    Surface.z = -1.0 / extent; // negative scale for Surface.x
    float rcpMiterLimit = Style.w;

    // Apply to 2D position in NDC
    gl_Position.xy += lineExtrusion(Surface.xy,
            projected(Transform * rteDecode(PositionP, Pretranslation)).xy,
            projected(gl_Position).xy,
            projected(Transform * rteDecode(PositionN, Pretranslation)).xy,
            Control, extent, antiAliasing, rcpMiterLimit) * 
            gl_Position.w * PixelScale;
}


//! FRAGMENT


uniform vec3 RenderParams;
float antiAliasing = RenderParams.x;
float rcpGammaOut = RenderParams.z;


float blendCoeff(vec2 edge0, vec2 edge1, vec2 x) {
    vec2 weight = smoothstep(edge0, edge1, x);
    return max(weight.x, weight.y);
}

void main(void) {

    // Distance from center of surface coordinate
    // ATTENTION: Do not change strange absolute computation - it is a
    // workaround for 'abs' being effectless on a varying with ANGLE.
    vec2 dist = min(Surface.xy * sign(Surface.xy), 1.0);

    vec2 negScale = vec2(Surface.z, -1.0 / antiAliasing);
    vec2 outerEdgeMin = vec2(1.0) + negScale * antiAliasing;
    float alpha = Color.a  * (1.0 - blendCoeff(outerEdgeMin, vec2(1.0), dist));
    gl_FragColor = vec4(Color.rgb, alpha);
}
