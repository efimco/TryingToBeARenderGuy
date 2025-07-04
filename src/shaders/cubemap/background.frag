#version 460 core
out vec4 FragColor;
in vec3 WorldPos;

layout (binding = 0) uniform samplerCube environmentMap;
uniform float rotationY;
uniform float intensity;
uniform float blur;

const float yaw = 3.1415f / 180.0f;
mat3 rotationMat = mat3(
	cos(rotationY * yaw), 0.0, -sin(rotationY * yaw),
	0.0, 1.0, 0.0,
	sin(rotationY * yaw), 0.0, cos(rotationY * yaw)
);
void main()
{		

	vec3 envColor = textureLod(environmentMap, WorldPos * rotationMat, blur*2).rgb; 
	FragColor = vec4(envColor.rgb * (pow(2.0, intensity)-1), 1.0);
}