#version 460 core
out vec4 FragColor;
in vec3 WorldPos;

layout (location = 0) uniform sampler2D equirectangularMap;

const vec2 invAtan = vec2(0.1591, 0.3183); // 1/2pi, 1/pi
vec2 SampleSphericalMap(vec3 v)
{
	vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
	uv *= invAtan;
	uv += 0.5;
	return uv;
}

void main()
{		
	vec2 uv = SampleSphericalMap(normalize(WorldPos));
	vec3 color = texture(equirectangularMap, uv).rgb;
	FragColor = vec4(color, 1.0);
}