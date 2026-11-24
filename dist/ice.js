// Ray-march three rounded volumes so the rotation reveals each cube's back and sides.
const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }
`;

const fragment = `
precision highp float;
uniform vec2 resolution;
uniform vec2 stageSize;
uniform float angle;
uniform float flavor;

mat2 rotation(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }

float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.19,.17,.11));
  p *= 17.;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}

float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p);
  f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}

float ice(vec3 p) {
  vec3 q=abs(p)-vec3(.65);
  return min(max(q.x,max(q.y,q.z)),0.) + length(max(q,0.))-.15;
}

vec3 normal(vec3 p) {
  vec2 e=vec2(.004,0.);
  return normalize(vec3(ice(p+e.xyy)-ice(p-e.xyy),ice(p+e.yxy)-ice(p-e.yxy),ice(p+e.yyx)-ice(p-e.yyx)));
}

vec3 tint(float n) {
  if(n < .5) return vec3(.58,.89,.26);
  if(n < 1.5) return vec3(.23,.47,1.);
  if(n < 2.5) return vec3(1.,.26,.48);
  return vec3(1.,.64,.15);
}

vec4 crystal(vec2 uv,float spin,float tilt,float kind) {
  if(max(abs(uv.x),abs(uv.y)) > 1.45) return vec4(0.);
  vec3 p=vec3(uv,3.1), ray=normalize(vec3(uv * .10,-1.));
  p.xy=rotation(tilt)*p.xy; ray.xy=rotation(tilt)*ray.xy;
  p.yz=rotation(-.40)*p.yz; ray.yz=rotation(-.40)*ray.yz;
  p.xz=rotation(spin)*p.xz; ray.xz=rotation(spin)*ray.xz;
  float distance=0.;
  for(int i=0;i<34;i++){
    float d=ice(p+distance*ray);
    if(d<.003 || distance>5.) break;
    distance+=d;
  }
  p+=ray*distance;
  if(ice(p)>.008) return vec4(0.);
  vec3 n=normal(p), refracted=refract(ray,n,.75), base=tint(kind);
  float f=pow(1.-max(0.,dot(n,-ray)),2.);
  float soft=noise(p*6.+refracted*4.);
  float cracks=pow(1.-abs(2.*noise(p*17.+refracted*6.)-1.),16.);
  float detail=noise(p*42.+refracted*8.);
  float bubbles=pow(detail,11.);
  vec3 l=normalize(vec3(-.65, .8, 1.));
  float spec=pow(max(0.,dot(reflect(ray,n),l)),12.);
  float edge=smoothstep(.62,.80,abs(p.x))+smoothstep(.62,.80,abs(p.y))+smoothstep(.62,.80,abs(p.z));
  vec3 color=base*(.25+.62*soft)+vec3(.28,.45,.65)*soft;
  color+=vec3(.7,.86,1.)*(f*.6 + cracks*.27 + bubbles*.7 + spec*.7 + max(edge-1.,0.)*.37);
  vec3 q=p+.70*refracted;
  float fruit=1.-smoothstep(.32,.39,length(q.xy-vec2(.03,.08)));
  float ring=smoothstep(.26,.31,length(q.xy-vec2(.03,.08)));
  color=mix(color,base*(.32+.68*ring)+detail*.22,fruit*(1.-f)*.57);
  return vec4(clamp(color,0.,1.),.98);
}

void main() {
  vec2 point=gl_FragCoord.xy/resolution;
  point.y=1.-point.y;
  float ratio=stageSize.x/stageSize.y;
  vec2 uv=vec2(point.x*ratio,-point.y);
  vec4 top=crystal((uv-vec2(.87*ratio,-.245))/.080,angle-.73,-.30,mod(flavor+1.,4.));
  vec4 lower=crystal((uv-vec2(.145*ratio,-.675))/.064,angle+.96,.39,mod(flavor+2.,4.));
  float size=min(.248*ratio,.275);
  vec4 mainCube=crystal((uv-vec2(.508*ratio,-.465))/size,angle+.55,.25,flavor);
  gl_FragColor=mainCube.a>0. ? mainCube : (top.a>0. ? top : lower);
}
`;

export function createIceRenderer(canvas) {
  if (new URLSearchParams(location.search).has('sabor')) return null;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true });
  if (!gl) return null;

  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
  }

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(
    ['resolution', 'stageSize', 'angle', 'flavor'].map(name => [name, gl.getUniformLocation(program, name)])
  );

  return {
    canvas,
    draw(angle, index) {
      if (gl.isContextLost()) return false;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return false;
      const scale = Math.min(devicePixelRatio, 1, 570 / width);
      const bufferWidth = Math.max(1, Math.round(width * scale));
      const bufferHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
      }
      gl.viewport(0, 0, bufferWidth, bufferHeight);
      gl.uniform2f(uniforms.resolution, bufferWidth, bufferHeight);
      gl.uniform2f(uniforms.stageSize, width, height);
      gl.uniform1f(uniforms.angle, angle);
      gl.uniform1f(uniforms.flavor, index);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    }
  };
}
