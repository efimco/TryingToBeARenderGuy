#pragma once
#include <string>
#include "tiny_gltf.h"

class Tex
{
public:
	uint32_t id;
	std::string path;

	Tex(const char *path);
	Tex();
	Tex(tinygltf::Image &image);
	~Tex();

	void setPath(const std::string &newPath);

private:
	uint32_t TextureFromFile(const char *path);
	uint32_t TextureFromGlb(tinygltf::Image &image);
};