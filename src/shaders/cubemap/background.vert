#version 460 core
layout (location = 0) in vec3 aPos;

uniform mat4 projection;
uniform mat4 view;

out vec3 WorldPos;

void main()
{
	WorldPos = aPos;
	mat4 model = mat4(1.0);
	mat4 rotView = mat4(mat3(view));
	vec4 clipPos = projection * rotView  * vec4(WorldPos, 1.0);
	
	vec4 pos = projection * view * model * vec4(WorldPos, 1.0);
	gl_Position = clipPos.xyww;
}