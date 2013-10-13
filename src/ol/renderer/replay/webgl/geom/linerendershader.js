// This file is automatically generated, do not edit
goog.provide('ol.renderer.replay.webgl.geom.LineRenderShader');
goog.require('ol.webgl.shader');
goog.require('ol.renderer.replay.webgl.geom.LineBatcher');
/**
 * @constructor
 * @extends {ol.webgl.shader.Fragment}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.replay.webgl.geom.LineRenderShaderFragment = function(gl) {
  goog.base(this,
    ol.renderer.replay.webgl.geom.LineRenderShader.sourcePreamble_(gl) + ol.renderer.replay.webgl.geom.LineRenderShaderFragment.SOURCE);
};
goog.inherits(ol.renderer.replay.webgl.geom.LineRenderShaderFragment, ol.webgl.shader.Fragment);
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.LineRenderShaderFragment.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.replay.webgl.geom.LineRenderShader\n//! CLASS=ol.renderer.replay.webgl.geom.LineRenderShader\n\n//! COMMON\n\nvarying vec4 Color;\nvarying vec3 Surface;\n\n\n\n\nvec3 applyGamma(vec3 color, float reciprocalGamma) {\n    return pow(clamp(color, 0.0, 1.0), vec3(reciprocalGamma));\n}\n\nvec2 rotatedCw(vec2 p) {\n    return vec2(p.y, -p.x);\n}\n\nvec2 rotatedCcw(vec2 p) {\n    return vec2(-p.y, p.x);\n}\n\nvec2 safeNormalized(vec2 v) {\n    float frob = dot(v, v);\n    return v * (frob > 0.0 ? inversesqrt(frob) : 0.0);\n}\n\nvec3 projected(vec4 p) {\n    return p.xyz / p.w;\n}\n\n\n\nvec3 decodeRGB(float v) {\n\n    const float downshift16 = 1. / 65536.;\n    const float downshift8  = 1. /   256.;\n\n    return vec3(v * downshift16, fract(v * downshift8), fract(v));\n}\n\nvec4 rteDecode(vec4 highPrecCoord, vec4 highPrecOffset) {\n\n    vec4 v = highPrecCoord + highPrecOffset;\n    v.xy += v.zw;\n    v.zw = vec2(0.0, 1.0);\n    return v;\n}\n\n\n//! FRAGMENT\n\n\nuniform vec3 RenderParams;\nfloat antiAliasing = RenderParams.x;\nfloat rcpGammaOut = RenderParams.z;\n\n\nfloat blendCoeff(vec2 edge0, vec2 edge1, vec2 x) {\n  vec2 weight = smoothstep(edge0, edge1, x);\n  return max(weight.x, weight.y);\n}\n\nvoid main(void) {\n\n    // Distance from center of surface coordinate\n    // ATTENTION: Do not change strange absolute computation - it is a\n    // workaround for \'abs\' being effectless on a varying with ANGLE.\n    vec2 dist = min(Surface.xy * sign(Surface.xy), 1.0);\n\n    vec2 negScale = vec2(Surface.z, -1.0 / antiAliasing);\n    vec2 outerEdgeMin = vec2(1.0) + negScale * antiAliasing;\n    float alpha = Color.a  * (1.0 - blendCoeff(outerEdgeMin, vec2(1.0), dist));\n    gl_FragColor = vec4(Color.rgb, alpha);\n}\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.LineRenderShaderFragment.OPTIMIZED_SOURCE =
    'varying vec4 a;varying vec3 b;uniform vec3 f;float g=f.x;float h=f.z;float m(vec2 i,vec2 j,vec2 k){vec2 l=smoothstep(i,j,k);return max(l.x,l.y);}void main(){vec2 i,j,k;i=min(b.xy*sign(b.xy),1.);j=vec2(b.z,-1./g);k=vec2(1)+j*g;float l=a.a*(1.-m(k,vec2(1),i));gl_FragColor=vec4(a.rgb,l);}';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.LineRenderShaderFragment.SOURCE = goog.DEBUG ?
    ol.renderer.replay.webgl.geom.LineRenderShaderFragment.DEBUG_SOURCE :
    ol.renderer.replay.webgl.geom.LineRenderShaderFragment.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @extends {ol.webgl.shader.Vertex}
 * @param {WebGLRenderingContext} gl GL.
 */
ol.renderer.replay.webgl.geom.LineRenderShaderVertex = function(gl) {
  goog.base(this,
    ol.renderer.replay.webgl.geom.LineRenderShader.sourcePreamble_(gl) + ol.renderer.replay.webgl.geom.LineRenderShaderVertex.SOURCE);
};
goog.inherits(ol.renderer.replay.webgl.geom.LineRenderShaderVertex, ol.webgl.shader.Vertex);
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.LineRenderShaderVertex.DEBUG_SOURCE =
    '//! NAMESPACE=ol.renderer.replay.webgl.geom.LineRenderShader\n//! CLASS=ol.renderer.replay.webgl.geom.LineRenderShader\n\n//! COMMON\n\nvarying vec4 Color;\nvarying vec3 Surface;\n\n\n//! VERTEX\n\n//! INCLUDE common_lib.glsl\n\n\nvec3 applyGamma(vec3 color, float reciprocalGamma) {\n    return pow(clamp(color, 0.0, 1.0), vec3(reciprocalGamma));\n}\n\nvec2 rotatedCw(vec2 p) {\n    return vec2(p.y, -p.x);\n}\n\nvec2 rotatedCcw(vec2 p) {\n    return vec2(-p.y, p.x);\n}\n\nvec2 safeNormalized(vec2 v) {\n    float frob = dot(v, v);\n    return v * (frob > 0.0 ? inversesqrt(frob) : 0.0);\n}\n\nvec3 projected(vec4 p) {\n    return p.xyz / p.w;\n}\n\n\n\n//! INCLUDE gpudata_lib.glsl\nvec3 decodeRGB(float v) {\n\n    const float downshift16 = 1. / 65536.;\n    const float downshift8  = 1. /   256.;\n\n    return vec3(v * downshift16, fract(v * downshift8), fract(v));\n}\n\nvec4 rteDecode(vec4 highPrecCoord, vec4 highPrecOffset) {\n\n    vec4 v = highPrecCoord + highPrecOffset;\n    v.xy += v.zw;\n    v.zw = vec2(0.0, 1.0);\n    return v;\n}\n\n\n\nattribute vec4 PositionP;\nattribute vec4 Position0;\nattribute vec4 PositionN;\nattribute float Control;\n\nattribute vec3 Style;\n// extent\n// color (rgb)\n// opacity (0..1)\n\nuniform vec4 Pretranslation;\nuniform mat4 Transform;\nuniform vec2 PixelScale;\n\nuniform mediump vec3 RenderParams;\nfloat antiAliasing = RenderParams.x;\nfloat rcpGammaIn = RenderParams.y;\n//-float rcpGammaOut = RenderParams.z;\n\n\n//! JSREQUIRE ol.renderer.replay.webgl.geom.LineBatcher\n//! JSCONST CTRL_LINE_CENTER   ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.CENTER.toFixed(1)\n//! JSCONST CTRL_TERMINAL      ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.TERMINAL.toFixed(1)\n//! JSCONST CTRL_RIGHT_EDGE    ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.RIGHT.toFixed(1)\n//! JSCONST CTRL_OUTGOING_EDGE ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.OUTGOING.toFixed(1)\n\nvec2 lineExtrusion(out vec2 texCoord,\n                   vec2 coordPrev, vec2 coordHere, vec2 coordNext,\n                   float ctrl, float extent, float lengthOfEnds,\n                   float reciprocalRelativeMiterLimit) {\n\n    vec2 result = vec2(0.);\n    texCoord = vec2(-1., 0.);\n\n    vec2 dirIncoming = safeNormalized(coordHere - coordPrev);\n    vec2 dirOutgoing = safeNormalized(coordNext - coordHere);\n    vec2 outward = safeNormalized(dirIncoming - dirOutgoing);\n\n    float sinWinding = dot(\n        rotatedCcw(dirIncoming),   // normal to the left of incoming leg\n        outward);                 // vertex normal on the convex side\n    float sgnWinding = sign(sinWinding);\n\n    float absSinWinding = sinWinding * sgnWinding;\n    float cosWinding = sqrt(1. - sinWinding * sinWinding);\n    float relativeMiterLimit = 1.0 / reciprocalRelativeMiterLimit;\n    float normBevelWidth = absSinWinding + relativeMiterLimit;\n    float cutWidth = length(vec2(normBevelWidth, cosWinding));\n\n    if (ctrl == CTRL_LINE_CENTER) {\n        // Move the vertex inward and calculate texture coordinate\n        result = outward * -extent * relativeMiterLimit;\n        texCoord.x = -sgnWinding + sgnWinding * 2. * normBevelWidth / cutWidth;\n        return result;\n    }\n\n    if (ctrl >= CTRL_TERMINAL) {\n        ctrl -= CTRL_TERMINAL;\n        // Extrude in outward direction (the \'outward\' vector degenerates\n        // to point outward in vertical direction in this case)\n        result = outward * lengthOfEnds;\n        // Let surface coordinate indicate the edge - we can use the same\n        // value for both ends as interpolating towards zero in all cases\n        texCoord.y = 1.0;\n        // The nonzero edge we see in this case is in opposite direction\n        extent = -extent;\n        // We\'re on a straight segment, force beveling logic (there is no\n        // bevel but \n        absSinWinding = 0.0; \n    }\n\n    if (ctrl >= CTRL_RIGHT_EDGE) {\n        ctrl -= CTRL_RIGHT_EDGE;\n        // Set surface coordinate, negate horizontal amount\n        texCoord.x = 1.0;\n        extent = -extent;\n    }\n\n    vec2 legDir;\n    float extraMove = 0.0;\n    const float epsRadians = 0.000244140625;\n    if (absSinWinding < reciprocalRelativeMiterLimit) {\n        // Bevel (miter too long)?\n        legDir = ctrl == CTRL_OUTGOING_EDGE ? dirOutgoing : dirIncoming;\n        result += extent * rotatedCcw(legDir);\n\n        if (texCoord.x == sgnWinding && absSinWinding > epsRadians) {\n            // Unless at a line ending (this includes the vertices next\n            // to the ones flagged as terminal), pull back the inner two\n            // edges in order to expose the bevel triangle\n            extraMove = (1.0 - cutWidth) * abs(extent); \n        }\n    } else \n    // ATTENTION: Don\'t remove the redunant "if", here! It\'s a workaround\n    // for a vicious bug in ANGLE m)\n    if (absSinWinding >= reciprocalRelativeMiterLimit) {\n        // Miter\n        legDir = rotatedCw(outward);\n        result += (extent / sinWinding) * outward;\n\n        if (absSinWinding > epsRadians) {\n            // Cull triangles for bevel unless at line endings (there are\n            // none in this case) to prevent flickering while avoiding to \n            // globally enforce invariance\n            const float epsPixels = 0.000244140625;\n            extraMove = sgnWinding * epsPixels;\n        }\n    }\n    result += extraMove * (ctrl == CTRL_OUTGOING_EDGE ? -1. : 1.) * legDir;\n\n    return result;\n}\n\nvoid main(void) {\n\n    // Basic vertex shader operation\n    gl_Position = Transform * rteDecode(Position0, Pretranslation);\n\n    // Decode style\n    Color = vec4(decodeRGB(Style.y), Style.z);\n    float extent = Style.x + antiAliasing * 0.5; // half the smoothing counts\n    Surface.z = -1.0 / extent; // negative scale for Surface.x\n\n    // Apply to 2D position in NDC\n    gl_Position.xy += lineExtrusion(Surface.xy,\n            projected(Transform * rteDecode(PositionP, Pretranslation)).xy,\n            projected(gl_Position).xy,\n            projected(Transform * rteDecode(PositionN, Pretranslation)).xy,\n            Control, extent, antiAliasing, 0.5) * gl_Position.w * PixelScale;\n}\n\n\n';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.LineRenderShaderVertex.OPTIMIZED_SOURCE =
    'varying vec4 a;varying vec3 b;vec2 K(vec2 n){return vec2(n.y,-n.x);}vec2 L(vec2 n){return vec2(-n.y,n.x);}vec2 M(vec2 n){float o=dot(n,n);return n*(o>0.?inversesqrt(o):0.);}vec3 N(vec4 n){return n.xyz/n.w;}vec3 O(float n){const float o=1./65536.;const float p=1./256.;return vec3(n*o,fract(n*p),fract(n));}vec4 P(vec4 n,vec4 o){vec4 p=n+o;p.xy+=p.zw;p.zw=vec2(0,1);return p;}attribute vec4 g,h,i;attribute float j;attribute vec3 k;uniform vec4 c;uniform mat4 d;uniform vec2 e;uniform mediump vec3 f;float l=f.x;float m=f.y;vec2 Q(out vec2 n,vec2 o,vec2 p,vec2 q,float r,float s,float t,float u){vec2 v,w,x,y,G;v=vec2(0);n=vec2(-1.,0);w=M(p-o);x=M(q-p);y=M(w-x);float z,A,B,C,D,E,F,H;z=dot(L(w),y);A=sign(z);B=z*A;C=sqrt(1.-z*z);D=1./u;E=B+D;F=length(vec2(E,C));if(r==CTRL_LINE_CENTER){v=y*-s*D;n.x=-A+A*2.*E/F;return v;}if(r>=CTRL_TERMINAL){r-=CTRL_TERMINAL;v=y*t;n.y=1.;s=-s;B=0.;}if(r>=CTRL_RIGHT_EDGE){r-=CTRL_RIGHT_EDGE;n.x=1.;s=-s;}H=0.;const float I=.000244140625;if(B<u){G=r==CTRL_OUTGOING_EDGE?x:w;v+=s*L(G);if(n.x==A&&B>I)H=(1.-F)*abs(s);}else if(B>=u){G=K(y);v+=s/z*y;if(B>I){const float J=.000244140625;H=A*J;}}v+=H*(r==CTRL_OUTGOING_EDGE?-1.:1.)*G;return v;}void main(){gl_Position=d*P(h,c);a=vec4(O(k.y),k.z);float n=k.x+l*.5;b.z=-1./n;gl_Position.xy+=Q(b.xy,N(d*P(g,c)).xy,N(gl_Position).xy,N(d*P(i,c)).xy,j,n,l,.5)*gl_Position.w*e;}';
/**
 * @const
 * @type {string}
 */
ol.renderer.replay.webgl.geom.LineRenderShaderVertex.SOURCE = goog.DEBUG ?
    ol.renderer.replay.webgl.geom.LineRenderShaderVertex.DEBUG_SOURCE :
    ol.renderer.replay.webgl.geom.LineRenderShaderVertex.OPTIMIZED_SOURCE;
/**
 * @constructor
 * @param {WebGLRenderingContext} gl GL.
 * @param {WebGLProgram} program Program.
 */
ol.renderer.replay.webgl.geom.LineRenderShader.Locations = function(gl, program) {
  /**
   * @type {WebGLUniformLocation}
   */
  this.Pretranslation = gl.getUniformLocation(
      program, goog.DEBUG ? 'Pretranslation' : 'c');
  /**
   * @type {WebGLUniformLocation}
   */
  this.Transform = gl.getUniformLocation(
      program, goog.DEBUG ? 'Transform' : 'd');
  /**
   * @type {WebGLUniformLocation}
   */
  this.PixelScale = gl.getUniformLocation(
      program, goog.DEBUG ? 'PixelScale' : 'e');
  /**
   * @type {WebGLUniformLocation}
   */
  this.RenderParams = gl.getUniformLocation(
      program, goog.DEBUG ? 'RenderParams' : 'f');
  /**
   * @type {number}
   */
  this.PositionP = gl.getAttribLocation(
      program, goog.DEBUG ? 'PositionP' : 'g');
  /**
   * @type {number}
   */
  this.Position0 = gl.getAttribLocation(
      program, goog.DEBUG ? 'Position0' : 'h');
  /**
   * @type {number}
   */
  this.PositionN = gl.getAttribLocation(
      program, goog.DEBUG ? 'PositionN' : 'i');
  /**
   * @type {number}
   */
  this.Control = gl.getAttribLocation(
      program, goog.DEBUG ? 'Control' : 'j');
  /**
   * @type {number}
   */
  this.Style = gl.getAttribLocation(
      program, goog.DEBUG ? 'Style' : 'k');
};
/**
 * Generates a source preamble from the expressions in JSCONST
 * directives.
 * We have the rendering context passed in to allow querying
 * extensions and context attributes.
 *
 * @private
 * @param {WebGLRenderingContext} gl GL.
 * @return {string} Shader source preamble.
 */
ol.renderer.replay.webgl.geom.LineRenderShader.sourcePreamble_ = function(gl) {
  return ('' +
      'const float ' +
        (goog.DEBUG ? 'CTRL_LINE_CENTER' : 'CTRL_LINE_CENTER') +
        ' = float(' + (ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.CENTER.toFixed(1)) + ');' +
      'const float ' +
        (goog.DEBUG ? 'CTRL_TERMINAL' : 'CTRL_TERMINAL') +
        ' = float(' + (ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.TERMINAL.toFixed(1)) + ');' +
      'const float ' +
        (goog.DEBUG ? 'CTRL_RIGHT_EDGE' : 'CTRL_RIGHT_EDGE') +
        ' = float(' + (ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.RIGHT.toFixed(1)) + ');' +
      'const float ' +
        (goog.DEBUG ? 'CTRL_OUTGOING_EDGE' : 'CTRL_OUTGOING_EDGE') +
        ' = float(' + (ol.renderer.replay.webgl.geom.LineBatcher.SurfaceFlags.OUTGOING.toFixed(1)) + ');' +
'\n');
};
