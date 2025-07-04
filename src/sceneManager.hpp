#pragma once
#include <unordered_map>
#include <vector>
#include "light.hpp"
#include "primitive.hpp"
#include "scene/model.hpp"

namespace SceneManager
{
	void addPrimitive(Primitive* primitive);
	void removePrimitive(Primitive* primitive);
	std::vector<Primitive*> getPrimitives();
	void selectPrimitive(int32_t vao, bool addToSelection);
	Primitive* getSelectedPrimitive();
	std::vector<uint32_t> getSelectedPrimitives();

	std::unordered_map<uint32_t, std::shared_ptr<Mat>>& getMaterials();
	std::shared_ptr<Mat>& getMaterial(uint32_t uid);
	void addMaterial(std::shared_ptr<Mat>& material, uint32_t uid);

	std::unordered_map<std::string, std::shared_ptr<Tex>>& getTextureCache();
	std::shared_ptr<Tex>& getTexture(std::string name);
	void addTexture(const std::string& name, std::shared_ptr<Tex> texture);

	void addModel(SceneGraph::Model* model);
	std::vector<SceneGraph::Model*> getModels();

	void addLight(Light* light);
	void removeLight(Light* light);

	void addShader(Shader* shader);
	void reloadShaders();
}; // namespace SceneManager