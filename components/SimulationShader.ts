export const simulationVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const simulationFragmentShader = `
uniform sampler2D uPositions;
uniform sampler2D uWebcam;
uniform float uTime;
uniform bool uWebcamEnabled;
varying vec2 vUv;

// Simplex 3D Noise function (simplified)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  // Read current position data
  vec3 pos = texture2D(uPositions, vUv).rgb;
  
  // Calculate original "rest" position based on UV
  // vUv is 0..1, we map to -5..5 world space roughly
  vec3 restPos = vec3((vUv.x - 0.5) * 10.0, (vUv.y - 0.5) * 8.0, 0.0);

  // Noise for idle movement
  float noiseVal = snoise(vec3(pos.x * 0.5, pos.y * 0.5, uTime * 0.2));
  vec3 noiseDir = vec3(
    snoise(vec3(pos.x, pos.y, uTime * 0.1)),
    snoise(vec3(pos.x, pos.y, uTime * 0.1 + 100.0)),
    snoise(vec3(pos.x, pos.y, uTime * 0.1 + 200.0))
  );

  // Apply noise influence
  pos += noiseDir * 0.01;

  // Webcam Influence
  float luminance = 0.0;
  if (uWebcamEnabled) {
    // Map particle XY to webcam UV (assuming webcam is standard 16:9 aspect mostly)
    // We center the webcam influence
    vec2 webcamUV = vec2(
        (pos.x / 10.0) + 0.5, 
        (pos.y / 8.0) + 0.5
    );

    // Only sample if within webcam bounds
    if (webcamUV.x >= 0.0 && webcamUV.x <= 1.0 && webcamUV.y >= 0.0 && webcamUV.y <= 1.0) {
      // Flip X for mirror effect
      vec4 vid = texture2D(uWebcam, vec2(1.0 - webcamUV.x, webcamUV.y));
      // Standard luminance calculation
      luminance = dot(vid.rgb, vec3(0.299, 0.587, 0.114));
    }
  }

  // Force Calculation
  // Target Z is driven by brightness. Bright = Push forward (positive Z)
  float targetZ = luminance * 4.0; 
  
  // Spring/Lerp physics to move towards target
  // pos.z moves towards targetZ
  pos.z += (targetZ - pos.z) * 0.15;

  // Return to rest X/Y slowly (keeps them in grid formation roughly)
  pos.x += (restPos.x - pos.x) * 0.05;
  pos.y += (restPos.y - pos.y) * 0.05;

  gl_FragColor = vec4(pos, 1.0);
}
`;
