#pragma once
#include <vector>
#include <unordered_map>
#include "primitive.hpp"
#include "light.hpp"

namespace SceneManager
{	
	void addPrimitives(std::vector<Primitive>&& Primitives);
	std::vector<Primitive>& getPrimitives();
	void addPrimitive(Primitive&& primitive);

	Primitive* getSelectedPrimitive();
	void setSelectedPrimitive(Primitive* primitive);
	void addShader(Shader* shader);

	std::unordered_map<uint32_t, std::shared_ptr<Mat>>& getMaterials();
	std::shared_ptr<Mat>& getMaterial(uint32_t uid);
	void addMaterial(std::shared_ptr<Mat> &material, uint32_t uid);

	std::unordered_map<std::string, std::shared_ptr<Tex>>& getTextureCache();
	std::shared_ptr<Tex>& getTexture(std::string name);
	void addTexture(const std::string& name, std::shared_ptr<Tex> texture);

	void addLight(Light& light);
	void updateLights();
	std::vector<Light>& getLights();
	void createLightsSSBO();
	uint32_t& getLightsSSBO();
	void checkLightBuffer();

	void reloadShaders();
	void setShader(Shader* shader);
	};